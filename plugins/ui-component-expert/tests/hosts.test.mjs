import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const stages = ['run', 'brief', 'ingest', 'contract', 'build', 'interface', 'verify', 'integrate', 'update', 'status'];
const read = (relativePath) => readFile(path.join(root, relativePath), 'utf8');

// Catch packaging mistakes that would leave a host with a discoverable but unusable entrypoint.
test('Kimi and Codex manifests expose the correct in-package directories', async () => {
  const kimi = JSON.parse(await read('kimi.plugin.json'));
  const codex = JSON.parse(await read('plugin.json'));
  const claude = JSON.parse(await read('.claude-plugin/plugin.json'));
  assert.equal(kimi.name, claude.name);
  assert.equal(codex.name, claude.name);
  assert.equal(kimi.version, claude.version);
  assert.equal(codex.version, claude.version);
  assert.equal(codex.$schema, 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json');
  assert.equal(kimi.skills, './kimi/skills/');
  assert.equal(kimi.commands, './kimi/commands/');
  await stat(path.join(root, kimi.skills, 'ui-component-expert', 'SKILL.md'));
  await stat(path.join(root, 'skills', 'ui-component-expert', 'SKILL.md'));
});

test('Claude marketplace resolves the local plugin without traversing above its root', async () => {
  const marketplace = JSON.parse(await read('.claude-plugin/marketplace.json'));
  const manifest = JSON.parse(await read('.claude-plugin/plugin.json'));
  assert.ok(marketplace.name);
  assert.ok(marketplace.owner?.name);
  assert.equal(marketplace.plugins.length, 1);
  assert.equal(marketplace.plugins[0].name, manifest.name);
  assert.equal(marketplace.plugins[0].source, './');
  assert.equal(path.resolve(root, marketplace.plugins[0].source), root);
});

test('portable design companion has a separate manifest and skill', async () => {
  const companion = path.resolve(root, '../claude-design-plugin');
  const manifest = JSON.parse(await readFile(path.join(companion, '.claude-plugin/plugin.json'), 'utf8'));
  assert.equal(manifest.name, 'ui-component-design-brief');
  await stat(path.join(companion, 'skills/design-component/SKILL.md'));
});

test('each Kimi command maps its arguments to a canonical stage', async () => {
  for (const stage of stages) {
    const command = await read(`kimi/commands/${stage}.md`);
    const skill = await read(`skills/${stage}/SKILL.md`);
    assert.match(command, /^---\ndescription: .+\n---\n/);
    assert.ok(command.includes('$ARGUMENTS'), `${stage}: missing argument forwarding`);
    assert.ok(command.includes('canonical `' + stage + '` skill'), `${stage}: wrong route`);
    assert.ok(skill.startsWith('---\nname: ' + stage + '\n'), `${stage}: canonical skill missing`);
    assert.ok(skill.includes('Never execute the literal placeholder.'), `${stage}: no root-resolution guard`);
    assert.ok(!skill.includes('node "${CLAUDE_PLUGIN_ROOT}/scripts/cli.mjs"'), `${stage}: Claude-only CLI example`);
  }
});

test('Kimi and Codex adapters resolve to the same installed CLI and canonical skills', async () => {
  const kimiDir = path.join(root, 'kimi', 'skills', 'ui-component-expert');
  const codexDir = path.join(root, 'skills', 'ui-component-expert');
  const kimiSkill = await read('kimi/skills/ui-component-expert/SKILL.md');
  const codexSkill = await read('skills/ui-component-expert/SKILL.md');
  assert.equal(path.resolve(kimiDir, '../../..'), root);
  assert.equal(path.resolve(codexDir, '../..'), root);
  assert.ok(kimiSkill.includes('${KIMI_SKILL_DIR}/../../../scripts/cli.mjs'));
  await stat(path.resolve(kimiDir, '../../../scripts/cli.mjs'));
  for (const stage of stages) {
    assert.ok(kimiSkill.includes(stage === 'run' ? 'skills/run/SKILL.md' : '`' + stage + '`'), `${stage}: Kimi stage not routed`);
    assert.ok(codexSkill.includes(`../${stage}/SKILL.md`), `${stage}: Codex stage not routed`);
    await stat(path.resolve(codexDir, `../${stage}/SKILL.md`));
  }
});
