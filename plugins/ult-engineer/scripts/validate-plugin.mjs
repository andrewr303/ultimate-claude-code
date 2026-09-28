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
if (kimi.sessionStart?.skill !== "ult-engineer") {
  fail("kimi.plugin.json sessionStart.skill must be ult-engineer");
}

const skillsDir = path.join(root, "skills");
const skillDirs = fs.readdirSync(skillsDir).filter((n) =>
  fs.statSync(path.join(skillsDir, n)).isDirectory()
);

const expected = [
  "ult-engineer",
  "write",
  "debug",
  "refactor",
  "review",
  "health",
  "typescript",
  "react",
  "nodejs",
  "javascript",
  "test",
  "debt",
  "code-polish",
  "debugging-code",
  "debug-agent",
  "debugging-methodology",
  "code-review",
  "code-refactor",
  "code-hidden-failures",
  "react-doctor",
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
    if (!/Use when/i.test(fm.description)) {
      fail(`skills/${name}/SKILL.md description must include "Use when"`);
    }
  }

  const mdLinks = [...text.matchAll(/\]\(([^)]+)\)/g)].map((m) => m[1]);
  for (const href of mdLinks) {
    if (/^https?:\/\//.test(href) || href.startsWith("#") || href.startsWith("mailto:")) continue;
    const target = path.resolve(path.dirname(skillFile), href.split("#")[0]);
    if (!fs.existsSync(target)) fail(`skills/${name}/SKILL.md broken link ${href}`);
  }
}

const router = read(path.join(skillsDir, "ult-engineer", "SKILL.md"));
for (const name of [
  "write",
  "debug",
  "refactor",
  "review",
  "health",
  "typescript",
  "react",
  "nodejs",
  "javascript",
  "test",
  "debt",
  "code-polish",
]) {
  if (!router.includes(`../${name}/SKILL.md`)) {
    fail(`router does not point at ${name}`);
  }
}

const requiredCommands = [
  "ult-engineer",
  "debug",
  "health",
  "refactor",
  "review",
  "write",
  "setup",
];
for (const c of requiredCommands) {
  if (!fs.existsSync(path.join(root, "commands", `${c}.md`))) {
    fail(`missing commands/${c}.md`);
  }
}

const requiredAgents = [
  "root-cause-debugger",
  "health-auditor",
  "refactor-engineer",
  "typescript-engineer",
  "react-engineer",
  "nodejs-engineer",
];
for (const a of requiredAgents) {
  if (!fs.existsSync(path.join(root, "agents", `${a}.md`))) {
    fail(`missing agents/${a}.md`);
  }
}

const hook = path.join(root, "hooks", "ult-engineer-preflight-cue.sh");
if (!fs.existsSync(hook)) fail("missing hooks/ult-engineer-preflight-cue.sh");
const hooksJson = JSON.parse(read(path.join(root, "hooks", "hooks.json")));
const cmd = hooksJson?.hooks?.PostToolUse?.[0]?.hooks?.[0]?.command ?? "";
if (!cmd.includes("ult-engineer-preflight-cue.sh")) {
  fail("hooks.json does not invoke ult-engineer-preflight-cue.sh");
}

if (failed) {
  console.error(`FAIL ${failed}`);
  for (const e of errors) console.error(" -", e);
  process.exit(1);
}
console.log(`OK ${skillDirs.length} skills, manifests valid`);
