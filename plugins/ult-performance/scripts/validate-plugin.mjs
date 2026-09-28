#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let failed = 0;
const errors = [];

function fail(msg) {
  failed++;
  errors.push(msg);
}

function read(p) {
  return fs.readFileSync(p, "utf8");
}

function parseFrontmatter(text, file) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) {
    fail(`${file}: missing YAML frontmatter`);
    return {};
  }
  const fm = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!kv) continue;
    fm[kv[1]] = kv[2].replace(/^["']|["']$/g, "").trim();
  }
  return fm;
}

for (const rel of [
  ".claude-plugin/plugin.json",
  ".claude-plugin/marketplace.json",
  ".codex-plugin/plugin.json",
  "codex/.codex-plugin/plugin.json",
  ".agents/plugins/marketplace.json",
  "kimi.plugin.json",
  "plugin.json",
  "gemini-extension.json",
]) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fail(`missing ${rel}`);
    continue;
  }
  try {
    JSON.parse(read(p));
  } catch (e) {
    fail(`${rel}: invalid JSON (${e.message})`);
  }
}

const kimi = JSON.parse(read(path.join(root, "kimi.plugin.json")));
if (kimi.sessionStart?.skill !== "ult-performance") {
  fail("kimi.plugin.json sessionStart.skill must be ult-performance");
}

const skillsDir = path.join(root, "skills");
const skillDirs = fs.readdirSync(skillsDir).filter((n) =>
  fs.statSync(path.join(skillsDir, n)).isDirectory()
);

const expected = [
  "ult-performance",
  "audit",
  "core-web-vitals",
  "loading",
  "interaction",
  "scroll",
  "media",
  "performance",
  "accessibility",
  "seo",
  "best-practices",
];
for (const name of expected) {
  if (!skillDirs.includes(name)) fail(`missing skill directory skills/${name}`);
}

for (const name of skillDirs) {
  const skillFile = path.join(skillsDir, name, "SKILL.md");
  if (!fs.existsSync(skillFile)) {
    fail(`skills/${name}/SKILL.md missing`);
    continue;
  }
  const text = read(skillFile);
  const fm = parseFrontmatter(text, `skills/${name}/SKILL.md`);
  if (fm.name && fm.name !== name) {
    fail(`skills/${name}/SKILL.md name "${fm.name}" != folder "${name}"`);
  }
  if (!fm.description || fm.description.length < 40) {
    fail(`skills/${name}/SKILL.md description too short or missing`);
  }
  if (!/Use when/i.test(fm.description + "\n" + text.slice(0, 400))) {
    // description is the trigger; require "Use when" there
    if (!/Use when/i.test(fm.description)) {
      fail(`skills/${name}/SKILL.md description must include "Use when"`);
    }
  }

  const scriptsDir = path.join(skillsDir, name, "scripts");
  const listed = [...text.matchAll(/scripts\/([A-Za-z0-9._-]+\.js)/g)].map((m) => m[1]);
  for (const script of new Set(listed)) {
    const sp = path.join(scriptsDir, script);
    if (!fs.existsSync(sp)) fail(`skills/${name}/scripts/${script} listed but missing`);
  }
  if (fs.existsSync(scriptsDir)) {
    for (const f of fs.readdirSync(scriptsDir).filter((x) => x.endsWith(".js"))) {
      if (!listed.includes(f)) fail(`skills/${name}/SKILL.md does not list scripts/${f}`);
    }
  }

  const mdLinks = [...text.matchAll(/\]\(([^)]+)\)/g)].map((m) => m[1]);
  for (const href of mdLinks) {
    if (/^https?:\/\//.test(href) || href.startsWith("#")) continue;
    const target = path.resolve(path.dirname(skillFile), href.split("#")[0]);
    if (!fs.existsSync(target)) fail(`skills/${name}/SKILL.md broken link ${href}`);
  }
}

const router = read(path.join(skillsDir, "ult-performance", "SKILL.md"));
for (const name of expected.filter((n) => n !== "ult-performance")) {
  if (!router.includes(`../${name}/SKILL.md`)) {
    fail(`router does not point at ${name}`);
  }
}

const loadingScripts = fs.readdirSync(path.join(skillsDir, "loading", "scripts")).filter((f) => f.endsWith(".js"));
if (loadingScripts.length < 30) fail(`loading scripts expected >= 30, got ${loadingScripts.length}`);
const cwvScripts = fs.readdirSync(path.join(skillsDir, "core-web-vitals", "scripts")).filter((f) => f.endsWith(".js"));
if (cwvScripts.length !== 7) fail(`core-web-vitals scripts expected 7, got ${cwvScripts.length}`);

if (failed) {
  console.error(`FAIL ${failed}`);
  for (const e of errors) console.error(" -", e);
  process.exit(1);
}
console.log(`OK ${expected.length} skills, manifests valid`);
