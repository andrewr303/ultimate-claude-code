---
name: ui-component-expert
description: Use for a Claude Design export workflow in Codex: generate a brief, quarantine a local export, validate a DesignContract, build bespoke TypeScript components, verify, and preview safe integration.
---

# UI Component Expert for Codex

This plugin's CLI requires Node.js >=22 and local dependencies installed in the plugin directory (`npm ci --ignore-scripts`, with user approval for network access). It never generates component code by itself. Claude Design is an external canvas; the user must approve the design and manually download the export before ingestion.

The canonical workflow lives in the sibling skills. This entrypoint is at `skills/ui-component-expert/SKILL.md`; resolve the absolute plugin root by going two directories up from this file, **not** from the target project's working directory. Replace `<plugin-root>` in canonical commands with that resolved absolute directory; do not rely on `CLAUDE_PLUGIN_ROOT` being set. Do not execute literal placeholders or guess run paths.

Read `../run/SKILL.md` for the end-to-end flow. For focused requests, read only the corresponding sibling `../brief/SKILL.md`, `../ingest/SKILL.md`, `../contract/SKILL.md`, `../build/SKILL.md`, `../interface/SKILL.md`, `../verify/SKILL.md`, `../integrate/SKILL.md`, `../update/SKILL.md`, or `../status/SKILL.md`. These paths are relative to this skill file. Codex may also discover those ten canonical skills separately; they use the same root-resolution rule.

Keep quarantined exports unexecuted and out of previews. Have a human review generated code before executing or integrating it. The CLI's browser gate remains `BLOCKED`/`NOT_VERIFIED` without separately witnessed browser evidence; do not label static checks as visual or accessibility proof. Do not run an integration `--apply --allow-unverified` or rollback `--apply` without specific user authorization. Use an available, authorized browser runtime for independent UI verification; if absent, report `BLOCKED`, with no silent substitute.
