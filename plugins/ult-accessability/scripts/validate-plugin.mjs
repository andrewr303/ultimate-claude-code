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
if (kimi.sessionStart?.skill !== "ult-accessability") {
  fail("kimi.plugin.json sessionStart.skill must be ult-accessability");
}

const skillsDir = path.join(root, "skills");
const skillDirs = fs.readdirSync(skillsDir).filter((n) =>
  fs.statSync(path.join(skillsDir, n)).isDirectory()
);

const expected = [
  "ult-accessability",
  "audit",
  "wcag-aa",
  "wcag-aaa",
  "contrast-color",
  "fix",
  "testing",
];
for (const name of expected) {
  if (!skillDirs.includes(name)) fail(`missing skill directory skills/${name}`);
}

const scriptExt = /\.(m?js)$/;

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
  const listed = [...text.matchAll(/scripts\/([A-Za-z0-9._-]+\.(m?js))/g)].map((m) => m[1]);
  for (const script of new Set(listed)) {
    const sp = path.join(scriptsDir, script);
    if (!fs.existsSync(sp)) fail(`skills/${name}/scripts/${script} listed but missing`);
  }
  if (fs.existsSync(scriptsDir)) {
    for (const f of fs.readdirSync(scriptsDir).filter((x) => scriptExt.test(x))) {
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

const router = read(path.join(skillsDir, "ult-accessability", "SKILL.md"));
for (const name of expected.filter((n) => n !== "ult-accessability")) {
  if (!router.includes(`../${name}/SKILL.md`)) {
    fail(`router does not point at ${name}`);
  }
}

const contrastScript = path.join(skillsDir, "contrast-color", "scripts", "contrast-check.mjs");
if (!fs.existsSync(contrastScript)) {
  fail("skills/contrast-color/scripts/contrast-check.mjs missing");
}

if (failed) {
  console.error(`FAIL ${failed}`);
  for (const e of errors) console.error(" -", e);
  process.exit(1);
}
console.log(`OK ${expected.length} skills, manifests valid`);
