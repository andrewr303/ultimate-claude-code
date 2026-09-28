import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { generateBrief, hashTree, inspectTarget, rollback, safeRelative, sha256, status } from '../scripts/workflow.mjs';

async function sandbox(fn) {
  const root=await fs.mkdtemp(path.join(path.dirname(fileURLToPath(import.meta.url)),'.tmp-workflow-'));
  try { return await fn(root); } finally { await fs.rm(root,{recursive:true,force:true}); }
}

test('brief requires manual download and describes eight states and accessibility',()=>{
  const brief=generateBrief('Profile card');
  assert.equal(brief.status,'WAITING_FOR_DOWNLOAD');
  assert.equal(brief.specification.states.length,8);
  assert.equal(brief.specification.states.includes('selected'),true);
  assert.equal(brief.specification.states.includes('success'),false);
  assert.match(brief.portal,/Manual/);
  assert.ok(brief.specification.keyboard);
  assert.equal(typeof brief.specification.events,'string');
  assert.equal(typeof brief.prompt,'string');
  assert.equal(brief.content,brief.prompt);
});

test('generate-brief CLI with workspace emits uniquely named Markdown file with all required fields',async()=>{
  const projectParent=path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
  const root=await fs.mkdtemp(path.join(projectParent,'.tmp-workflow-ext-'));
  try {
    const workspace=path.join(root,'run');
    const cliPath=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../scripts/cli.mjs');
    const proc=spawnSync(process.execPath,[cliPath,'generate-brief','--description','Profile card','--workspace',workspace,'--json'],{encoding:'utf8'});
    assert.equal(proc.status,0);
    const result=JSON.parse(proc.stdout);
    assert.equal(result.ok,true);
    assert.equal(result.status,'WAITING_FOR_DOWNLOAD');
    assert.ok(result.path);
    assert.ok(result.path.endsWith('.md'));
    assert.equal(result.path,result.file);

    const content=await fs.readFile(result.path,'utf8');
    // Explicit viewports
    assert.match(content,/320/);
    assert.match(content,/390/);
    assert.match(content,/768/);
    assert.match(content,/1440/);
    // Exact token tiers
    assert.match(content,/primitive/);
    assert.match(content,/semantic/);
    assert.match(content,/component/);
    // Slots
    assert.match(content,/slots/i);
    // Eight canonical states with N/A reason, selected not success
    for (const state of ['default','hover','focus','active','disabled','loading','error','selected']) {
      assert.ok(content.includes(state), `Prompt missing canonical state: ${state}`);
    }
    assert.equal(content.includes('success'),false);
    assert.match(content,/N\/A/);
    assert.match(content,/reason/i);
    // Deliverables
    assert.match(content,/audience/i);
    assert.match(content,/theme/i);
    assert.match(content,/keyboard/i);
    assert.match(content,/responsive/i);
    assert.match(content,/export/i);

    // Uniquely named second brief in same workspace
    const second=spawnSync(process.execPath,[cliPath,'generate-brief','--description','Another component','--workspace',workspace,'--json'],{encoding:'utf8'});
    assert.equal(second.status,0);
    const secondResult=JSON.parse(second.stdout);
    assert.notEqual(secondResult.path,result.path);
    await assert.doesNotReject(fs.stat(secondResult.path));
  } finally {
    await fs.rm(root,{recursive:true,force:true});
  }
});

test('generate-brief CLI without workspace preserves API and returns Markdown content for paste',()=>{
  const cliPath=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../scripts/cli.mjs');
  const proc=spawnSync(process.execPath,[cliPath,'generate-brief','--description','Nav menu','--json'],{encoding:'utf8'});
  assert.equal(proc.status,0);
  const result=JSON.parse(proc.stdout);
  assert.equal(result.ok,true);
  assert.equal(result.status,'WAITING_FOR_DOWNLOAD');
  assert.equal(result.kind,'CLAUDE_DESIGN_BRIEF');
  assert.equal(result.specification.states.includes('selected'),true);
  assert.equal(result.specification.states.includes('success'),false);
  assert.equal(typeof result.prompt,'string');
  assert.equal(result.content,result.prompt);
  assert.match(result.prompt,/320/);
  assert.match(result.prompt,/selected/);
});

test('CLI help accurately states semantics and security boundaries',()=>{
  const cliPath=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../scripts/cli.mjs');
  const proc=spawnSync(process.execPath,[cliPath,'--help'],{encoding:'utf8'});
  assert.equal(proc.status,0);
  assert.match(proc.stdout,/portable Markdown prompt/);
  assert.match(proc.stdout,/WAITING_FOR_DOWNLOAD/);
  assert.match(proc.stdout,/DESTINATION_COLLISION/);
  assert.match(proc.stdout,/whole-batch preflight/);
  assert.match(proc.stdout,/PASS\/FAIL\/BLOCKED\/NOT_EVALUATED/);
  assert.match(proc.stdout,/Never render or copy raw export markup/);
  assert.match(proc.stdout,/explicit human review gate/);
});

test('status cannot claim implementation or browser verification without evidence',async()=>{
  assert.equal((await status()).status,'WAITING_FOR_DOWNLOAD');
});

test('inspect reads JSONC tsconfig but does not call missing dependencies installed',()=>sandbox(async root=>{
  await fs.writeFile(path.join(root,'package.json'),JSON.stringify({dependencies:{react:'^19.0.0','@base-ui/react':'^1.0.0'},scripts:{build:'vite build'}}));
  await fs.writeFile(path.join(root,'tsconfig.json'),'{ // comment\n "compilerOptions": {"strict": true,},\n}');
  const inspected=await inspectTarget(root);
  assert.deepEqual(inspected.framework,['react']);
  assert.deepEqual(inspected.installed,{});
  assert.deepEqual(inspected.scripts,['build']);
  assert.equal(inspected.tsconfig.strict,true);
  assert.match(inspected.recommendation,/Native controls/);
}));

test('Windows path aliases, traversal, credentials and ADS are rejected',()=>{
  for(const value of ['../escape.tsx','C:/absolute.tsx','/absolute.tsx','safe\\bad.tsx','CON.tsx','a./file.tsx','a /file.tsx','folder/.env','folder/credentials/private.ts','safe:stream.tsx']) assert.throws(()=>safeRelative(value),{code:'UNSAFE_PATH'});
  assert.equal(safeRelative('src/My Card.tsx'),'src/My Card.tsx');
});

test('generated implementation root rejects Windows casefold duplicates before integration',()=>sandbox(async root=>{
  await fs.writeFile(path.join(root,'Card.tsx'),'export const A = 1;');
  await fs.writeFile(path.join(root,'card.tsx'),'export const B = 2;');
  // Case-insensitive filesystems collapse these names; a distinct-name test is only meaningful where both exist.
  if ((await fs.readdir(root)).length > 1) await assert.rejects(hashTree(root),{code:'CASE_COLLISION'});
}));

test('generated implementation root refuses untrusted export assets',()=>sandbox(async root=>{
  await fs.writeFile(path.join(root,'design.svg'),'<svg/>');
  await assert.rejects(hashTree(root),{code:'UNSAFE_FILE'});
}));

test('rollback rejects a hand-authored arbitrary journal without removing hash-matching files',()=>sandbox(async root=>{
  const target=path.join(root,'target');
  await fs.mkdir(target);
  await fs.writeFile(path.join(target,'a.ts'),'original');
  const journal=path.join(root,'journal.json');
  await fs.writeFile(journal,JSON.stringify({kind:'ADDITIVE_JOURNAL',target,created:[{path:'a.ts',sha256:sha256('original')}]}));
  await assert.rejects(rollback(journal,true),{code:'INVALID_JOURNAL'});
  assert.equal(await fs.readFile(path.join(target,'a.ts'),'utf8'),'original');
}));

test('CLI reports strict machine-readable errors with nonzero exit',()=>{
  const proc=spawnSync(process.execPath,['scripts/cli.mjs','status','--unknown','x','--json'],{cwd:path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),encoding:'utf8'});
  assert.equal(proc.status,1);
  assert.equal(JSON.parse(proc.stderr).error.code,'INVALID_ARGUMENT');
  const relative=spawnSync(process.execPath,['scripts/cli.mjs','status','--workspace','relative','--json'],{cwd:path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),encoding:'utf8'});
  assert.equal(relative.status,1);
  assert.equal(JSON.parse(relative.stderr).error.code,'INVALID_ARGUMENT');
});
