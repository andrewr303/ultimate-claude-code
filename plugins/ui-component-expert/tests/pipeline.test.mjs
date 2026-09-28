import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildWorklist, integrate, rollback, status, verify, sha256, isWithin } from '../scripts/workflow.mjs';
import { validateContract } from '../scripts/contract.mjs';

const pluginRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const fixtureRoot=path.join(pluginRoot,'fixtures','sample-exports');
async function setup(fn) {
  const scratch=await fs.mkdtemp(path.join(path.dirname(pluginRoot),'.tmp-pipeline-'));
  try {
    const workspace=path.join(scratch,'run');
    const target=path.join(scratch,'target');
    const generated=path.join(scratch,'generated');
    await fs.mkdir(path.join(workspace,'originals'),{recursive:true});
    await fs.mkdir(target);
    await fs.mkdir(generated);
    const source=await fs.readFile(path.join(fixtureRoot,'synthetic-card.dc.html'));
    const contractBytes=await fs.readFile(path.join(fixtureRoot,'synthetic-contract.json'));
    const contract=JSON.parse(contractBytes);
    await fs.writeFile(path.join(workspace,'originals','synthetic-card.dc.html'),source);
    const receipt={runId:contract.metadata.runId,workspace,receipt:path.join(workspace,'receipt.json'),files:[{path:'synthetic-card.dc.html',sha256:sha256(source),bytes:source.length,kind:'html',evidence:{title:'Synthetic profile card'}}],state:'INGESTED'};
    await fs.writeFile(receipt.receipt,JSON.stringify(receipt));
    const contractFile=path.join(workspace,'contract-approved.json');
    await fs.writeFile(contractFile,contractBytes);
    await fs.writeFile(path.join(target,'package.json'),JSON.stringify({scripts:{test:'node -e "process.exit(0)"'}}));
    await fs.writeFile(path.join(generated,'Card.tsx'),'export function Card() { return null; }\n');
    assert.equal(validateContract(contract,{receipt}).ready,true);
    return await fn({scratch,workspace,target,generated,contractFile,receipt});
  } finally { await fs.rm(scratch,{recursive:true,force:true}); }
}

test('synthetic source and approved contract fixture hashes bind end-to-end',()=>setup(async ({workspace,contractFile})=>{
  assert.equal((await status(workspace)).status,'CONTRACT_READY');
  const contract=JSON.parse(await fs.readFile(contractFile,'utf8'));
  assert.match(contract.metadata.notes,/Synthetic test fixture/);
  assert.ok(contract.components[0].states.selected);
  assert.equal(contract.components[0].states.selected.applicable,false);
}));

test('build worklist enforces explicit humanReviewGate wording and prohibits raw export markup copying',()=>setup(async ({workspace,target,contractFile})=>{
  const worklist=await buildWorklist(contractFile,workspace,target);
  assert.equal(worklist.kind,'IMPLEMENTATION_BUILD_BRIEF');
  assert.equal(worklist.status,'CONTRACT_READY');
  assert.ok(worklist.humanReviewGate);
  assert.equal(worklist.humanReviewGate.required,true);
  assert.equal(worklist.humanReviewGate.status,'PENDING_HUMAN_REVIEW');
  assert.match(worklist.humanReviewGate.notice,/explicit human code review is strictly required/i);
  assert.match(worklist.humanReviewGate.notice,/cannot be certified as reviewed by SHA comparison/i);
  assert.match(worklist.humanReviewGate.notice,/Never copy raw export markup into executable code/i);
  assert.match(worklist.warning,/Never render or copy raw export markup into executable preview or target/i);
  assert.match(worklist.warning,/cannot be certified as reviewed by SHA comparison/i);
  assert.match(worklist.warning,/no false claims of code-review proof/i);
}));

test('tampering with preserved originals blocks lifecycle and integration',()=>setup(async ({workspace,target,generated,contractFile})=>{
  await fs.writeFile(path.join(workspace,'originals','synthetic-card.dc.html'),'tampered');
  await assert.rejects(status(workspace),{code:'RECEIPT_MISMATCH'});
  await assert.rejects(integrate({workspace,target,generated,contract:contractFile}),{code:'RECEIPT_MISMATCH'});
}));

test('build brief remains worklist and default verification cannot self-certify browser',()=>setup(async ({workspace,target,generated,contractFile,scratch})=>{
  const brief=await buildWorklist(contractFile,workspace,target);
  assert.equal(brief.status,'CONTRACT_READY');
  assert.equal(brief.kind,'IMPLEMENTATION_BUILD_BRIEF');
  assert.equal(brief.humanReviewGate.required,true);
  assert.equal(brief.humanReviewGate.status,'PENDING_HUMAN_REVIEW');
  assert.match(brief.warning,/human review/i);
  assert.match(brief.warning,/SHA comparison/i);
  const report=await verify({workspace,target,generated,contract:contractFile});
  assert.equal(report.status,'NOT_VERIFIED');
  assert.equal(report.checks.test.status,'NOT_EVALUATED');
  assert.equal(report.browser.status,'BLOCKED');
  assert.equal(report.files[0].sha256,sha256(await fs.readFile(path.join(generated,'Card.tsx'))));
  const browserEvidence=path.join(scratch,'browser.json');
  await fs.writeFile(browserEvidence,JSON.stringify({status:'PASS',claim:'Everything verified'}));
  const reported=await verify({workspace,target,generated,contract:contractFile,browserEvidence});
  assert.equal(reported.status,'NOT_VERIFIED');
  assert.equal(reported.browser.status,'BLOCKED');
  assert.deepEqual(reported.browser.untrustedReport,{status:'PASS',claim:'Everything verified'});
  assert.equal((await status(workspace)).status,'CONTRACT_READY');
}));

test('explicit run-checks executes only declared allowlisted npm scripts and keeps browser blocked',()=>setup(async ({workspace,target,generated,contractFile})=>{
  const report=await verify({workspace,target,generated,contract:contractFile,runChecks:true});
  assert.equal(report.checks.typecheck.status,'BLOCKED');
  assert.equal(report.checks.test.status,'PASS');
  assert.equal(report.checks.test.exitCode,0);
  assert.equal(report.checks.build.status,'BLOCKED');
  assert.equal(report.browser.status,'BLOCKED');
  assert.equal(report.status,'NOT_VERIFIED');
}));

test('integration collision preflights whole batch, preserves first new file, and refuses aliases',()=>setup(async ({workspace,target,generated,contractFile})=>{
  await fs.writeFile(path.join(generated,'First.tsx'),'export const First = 1;\n');
  await fs.writeFile(path.join(generated,'Last.tsx'),'export const Last = 1;\n');
  await fs.writeFile(path.join(target,'Last.tsx'),'human edits');
  await assert.rejects(integrate({workspace,target,generated,contract:contractFile,apply:true,allowUnverified:true}),{code:'DESTINATION_COLLISION'});
  await assert.rejects(fs.stat(path.join(target,'First.tsx')),{code:'ENOENT'});
  await fs.writeFile(path.join(target,'CARD.tsx'),'different casing');
  await assert.rejects(integrate({workspace,target,generated,contract:contractFile}),{code:'CASE_COLLISION'});
}));

test('integration previews content, requires explicit risk bypass, and rollback refuses edits',()=>setup(async ({workspace,target,generated,contractFile})=>{
  const preview=await integrate({workspace,target,generated,contract:contractFile});
  assert.equal(preview.proposed[0].action,'ADD');
  assert.match(preview.proposed[0].content,/export function Card/);
  assert.match(preview.proposed[0].diff,/--- \/dev\/null/);
  await assert.rejects(fs.stat(path.join(target,'Card.tsx')),{code:'ENOENT'});
  await assert.rejects(integrate({workspace,target,generated,contract:contractFile,apply:true}),{code:'VERIFICATION_REQUIRED'});
  const applied=await integrate({workspace,target,generated,contract:contractFile,apply:true,allowUnverified:true});
  assert.equal(applied.status,'APPLIED_UNVERIFIED');
  assert.equal((await status(workspace)).status,'IMPLEMENTED_UNVERIFIED');
  await fs.writeFile(path.join(target,'Card.tsx'),'human edit');
  await assert.rejects(rollback(applied.journal,true),{code:'HUMAN_EDIT'});
  assert.equal(await fs.readFile(path.join(target,'Card.tsx'),'utf8'),'human edit');
}));

test('rollback rejects a forged journal in a valid run with no integration proof',()=>setup(async ({workspace,target})=>{
  const unrelated=path.join(target,'Unrelated.tsx');
  await fs.writeFile(unrelated,'export const Unrelated = 1;\n');
  const journal=path.join(workspace,'integration-00000000-0000-4000-8000-000000000000.json');
  await fs.writeFile(journal,JSON.stringify({kind:'ADDITIVE_JOURNAL',target,created:[{path:'Unrelated.tsx',sha256:sha256(await fs.readFile(unrelated))}]}));
  await assert.rejects(rollback(journal,true),{code:'INVALID_JOURNAL'});
  assert.equal(await fs.readFile(unrelated,'utf8'),'export const Unrelated = 1;\n');
}));

test('genuine integration rolls back once and refuses replay',()=>setup(async ({workspace,target,generated,contractFile})=>{
  const applied=await integrate({workspace,target,generated,contract:contractFile,apply:true,allowUnverified:true});
  const destination=path.join(target,'Card.tsx');
  assert.equal((await rollback(applied.journal,false)).applied,false);
  assert.equal((await rollback(applied.journal,true)).applied,true);
  await assert.rejects(fs.stat(destination),{code:'ENOENT'});
  await assert.rejects(rollback(applied.journal,true),{code:'ROLLBACK_ALREADY_STARTED'});
}));

test('rollback refuses a tampered journal that names an unrelated hash-matching file',()=>setup(async ({workspace,target,generated,contractFile})=>{
  const applied=await integrate({workspace,target,generated,contract:contractFile,apply:true,allowUnverified:true});
  const unrelated=path.join(target,'Unrelated.tsx');
  const contents=await fs.readFile(path.join(target,'Card.tsx'));
  await fs.writeFile(unrelated,contents);
  const journal=JSON.parse(await fs.readFile(applied.journal,'utf8'));
  journal.created[0].path='Unrelated.tsx';
  await fs.writeFile(applied.journal,JSON.stringify(journal,null,2)+'\n');
  await assert.rejects(rollback(applied.journal,true),{code:'INVALID_JOURNAL'});
  assert.deepEqual(await fs.readFile(unrelated),contents);
  assert.deepEqual(await fs.readFile(path.join(target,'Card.tsx')),contents);
}));

test('rollback refuses a changed target manifest before deleting files',()=>setup(async ({workspace,target,generated,contractFile})=>{
  const applied=await integrate({workspace,target,generated,contract:contractFile,apply:true,allowUnverified:true});
  await fs.writeFile(path.join(target,'package.json'),JSON.stringify({scripts:{test:'node -e "process.exit(0)"'},version:'2'}));
  await assert.rejects(rollback(applied.journal,true),{code:'INVALID_JOURNAL'});
  await assert.doesNotReject(fs.stat(path.join(target,'Card.tsx')));
}));

test('integration refuses identical-content destination collision on preview and apply with whole-batch preflight',()=>setup(async ({workspace,target,generated,contractFile})=>{
  const cardContent=await fs.readFile(path.join(generated,'Card.tsx'),'utf8');
  await fs.writeFile(path.join(target,'Card.tsx'),cardContent);
  await fs.writeFile(path.join(generated,'Other.tsx'),'export const Other = 2;\n');

  // Preview rejects even with identical hash
  await assert.rejects(integrate({workspace,target,generated,contract:contractFile,apply:false}),{code:'DESTINATION_COLLISION'});

  // Apply rejects before writing any files
  await assert.rejects(integrate({workspace,target,generated,contract:contractFile,apply:true,allowUnverified:true}),{code:'DESTINATION_COLLISION'});
  await assert.rejects(fs.stat(path.join(target,'Other.tsx')),{code:'ENOENT'});
}));

test('verification gates strictly report only PASS/FAIL/BLOCKED/NOT_EVALUATED and untrusted browser report never self-certifies',()=>setup(async ({workspace,target,generated,contractFile,scratch})=>{
  const allowed=new Set(['PASS','FAIL','BLOCKED','NOT_EVALUATED']);

  // 1. Unchecked default
  const defaultReport=await verify({workspace,target,generated,contract:contractFile});
  for (const [name,gate] of Object.entries(defaultReport.checks)) {
    assert.ok(allowed.has(gate.status), `Check ${name} has invalid status ${gate.status}`);
    assert.equal(gate.status,'NOT_EVALUATED');
  }
  assert.ok(allowed.has(defaultReport.browser.status));
  assert.equal(defaultReport.browser.status,'BLOCKED');

  // 2. Passing run-checks
  const passReport=await verify({workspace,target,generated,contract:contractFile,runChecks:true});
  assert.equal(passReport.checks.test.status,'PASS');
  assert.equal(passReport.checks.typecheck.status,'BLOCKED');
  assert.equal(passReport.checks.build.status,'BLOCKED');
  assert.equal(passReport.browser.status,'BLOCKED');
  for (const gate of Object.values(passReport.checks)) assert.ok(allowed.has(gate.status));

  // 3. Failing run-checks
  await fs.writeFile(path.join(target,'package.json'),JSON.stringify({scripts:{test:'node -e "process.exit(1)"'}}));
  const failReport=await verify({workspace,target,generated,contract:contractFile,runChecks:true});
  assert.equal(failReport.checks.test.status,'FAIL');
  assert.ok(allowed.has(failReport.checks.test.status));

  // 4. External browser evidence: retained as untrusted report, browser gate BLOCKED, never self-certifies
  const browserEvidence=path.join(scratch,'external-browser.json');
  await fs.writeFile(browserEvidence,JSON.stringify({verdict:'ALL_GREEN',details:'Mock browser run'}));
  const browserReport=await verify({workspace,target,generated,contract:contractFile,browserEvidence});
  assert.equal(browserReport.browser.status,'BLOCKED');
  assert.ok(allowed.has(browserReport.browser.status));
  assert.deepEqual(browserReport.browser.untrustedReport,{verdict:'ALL_GREEN',details:'Mock browser run'});
  assert.match(browserReport.browser.reason,/untrusted/i);
  assert.equal(browserReport.status,'NOT_VERIFIED');
}));

async function setupContainedRun(fn) {
  const scratch = await fs.mkdtemp(path.join(path.dirname(pluginRoot), '.tmp-pipeline-'));
  try {
    const target = path.join(scratch, 'project');
    const runId = '00000000-0000-4000-8000-000000000001';
    const workspace = path.join(target, '.ui-component-expert', 'runs', runId);
    const generated = path.join(scratch, 'generated');
    await fs.mkdir(path.join(workspace, 'originals'), { recursive: true });
    await fs.mkdir(target, { recursive: true });
    await fs.mkdir(generated, { recursive: true });
    const source = await fs.readFile(path.join(fixtureRoot, 'synthetic-card.dc.html'));
    const contractBytes = await fs.readFile(path.join(fixtureRoot, 'synthetic-contract.json'));
    const contract = JSON.parse(contractBytes);
    contract.metadata.runId = runId;
    await fs.writeFile(path.join(workspace, 'originals', 'synthetic-card.dc.html'), source);
    const receipt = {
      runId,
      workspace,
      receipt: path.join(workspace, 'receipt.json'),
      files: [{ path: 'synthetic-card.dc.html', sha256: sha256(source), bytes: source.length, kind: 'html', evidence: { title: 'Synthetic profile card' } }],
      state: 'INGESTED'
    };
    await fs.writeFile(receipt.receipt, JSON.stringify(receipt));
    const contractFile = path.join(workspace, 'contract-approved.json');
    await fs.writeFile(contractFile, JSON.stringify(contract, null, 2));
    await fs.writeFile(path.join(target, 'package.json'), JSON.stringify({ scripts: { test: 'node -e "process.exit(0)"' } }));
    await fs.writeFile(path.join(generated, 'Card.tsx'), 'export function Card() { return null; }\n');
    assert.equal(validateContract(contract, { receipt }).ready, true);
    return await fn({ scratch, workspace, target, generated, contractFile, receipt, runId });
  } finally {
    await fs.rm(scratch, { recursive: true, force: true });
  }
}

test('isWithin enforces case-insensitive segment boundaries and directional containment', () => {
  assert.equal(isWithin('C:/parent', 'c:/parent'), true);
  assert.equal(isWithin('C:/parent', 'c:/parent/child'), true);
  assert.equal(isWithin('C:/parent', 'c:/parent/child/deep.tsx'), true);
  assert.equal(isWithin('C:/parent', 'c:/parent-sibling'), false);
  assert.equal(isWithin('C:/parent/child', 'c:/parent'), false);
  const target = 'C:/target';
  const run = 'C:/target/.ui-component-expert/runs/run-123';
  assert.equal(isWithin(run, target), false, 'target must not be within run');
  assert.equal(isWithin(target, run), true, 'run is within target');
});

test('target containing run under .ui-component-expert/runs/<id> exercises preview, additive apply, and rollback', () => setupContainedRun(async ({ workspace, target, generated, contractFile, receipt }) => {
  // Preview
  const preview = await integrate({ workspace, target, generated, contract: contractFile, apply: false });
  assert.equal(preview.kind, 'INTEGRATION_PREVIEW');
  assert.equal(preview.target, target);
  assert.equal(preview.proposed.length, 1);
  assert.equal(preview.proposed[0].path, 'Card.tsx');
  assert.equal(preview.proposed[0].destination, path.join(target, 'Card.tsx'));
  assert.equal(preview.proposed[0].action, 'ADD');
  await assert.rejects(fs.stat(path.join(target, 'Card.tsx')), { code: 'ENOENT' });

  // Additive Apply
  const applied = await integrate({ workspace, target, generated, contract: contractFile, apply: true, allowUnverified: true });
  assert.equal(applied.status, 'APPLIED_UNVERIFIED');
  const written = await fs.readFile(path.join(target, 'Card.tsx'), 'utf8');
  assert.match(written, /export function Card/);
  assert.equal((await status(workspace)).status, 'IMPLEMENTED_UNVERIFIED');

  // Verify target files and workspace are intact
  await assert.doesNotReject(fs.stat(path.join(target, 'package.json')));
  assert.equal(await fs.readFile(path.join(workspace, 'receipt.json'), 'utf8'), JSON.stringify(receipt));

  // Rollback Preview
  const rbPreview = await rollback(applied.journal, false);
  assert.equal(rbPreview.kind, 'ROLLBACK_PREVIEW');
  assert.equal(rbPreview.applied, false);
  assert.deepEqual(rbPreview.paths, [path.join(target, 'Card.tsx')]);
  await assert.doesNotReject(fs.stat(path.join(target, 'Card.tsx')));

  // Rollback Apply
  const rbResult = await rollback(applied.journal, true);
  assert.equal(rbResult.applied, true);
  await assert.rejects(fs.stat(path.join(target, 'Card.tsx')), { code: 'ENOENT' });
  await assert.doesNotReject(fs.stat(path.join(target, 'package.json')));
  await assert.doesNotReject(fs.stat(path.join(workspace, 'receipt.json')));

  // Rollback replay is refused
  await assert.rejects(rollback(applied.journal, true), { code: 'ROLLBACK_ALREADY_STARTED' });
}));

test('negative checks: target inside run, generated/root unsafe, and plugin installation as target are rejected', () => setupContainedRun(async ({ workspace, target, generated, contractFile }) => {
  // Target inside run
  const nestedTarget = path.join(workspace, 'nested-target');
  await fs.mkdir(nestedTarget, { recursive: true });
  await fs.writeFile(path.join(nestedTarget, 'package.json'), JSON.stringify({ scripts: {} }));
  await assert.rejects(integrate({ workspace, target: nestedTarget, generated, contract: contractFile }), { code: 'UNSAFE_PATH' });
  await assert.rejects(integrate({ workspace, target: nestedTarget, generated, contract: contractFile, apply: true, allowUnverified: true }), { code: 'UNSAFE_PATH' });

  // Target equal to run
  await assert.rejects(integrate({ workspace, target: workspace, generated, contract: contractFile }), { code: 'UNSAFE_PATH' });

  // Target equal to generated root
  await assert.rejects(integrate({ workspace, target: generated, generated, contract: contractFile }), { code: 'UNSAFE_PATH' });

  // Target inside generated root
  const insideGenerated = path.join(generated, 'sub-target');
  await fs.mkdir(insideGenerated, { recursive: true });
  await fs.writeFile(path.join(insideGenerated, 'package.json'), JSON.stringify({ scripts: {} }));
  await assert.rejects(integrate({ workspace, target: insideGenerated, generated, contract: contractFile }), { code: 'UNSAFE_PATH' });

  // Target is plugin installation root
  await assert.rejects(integrate({ workspace, target: pluginRoot, generated, contract: contractFile }), { code: 'UNSAFE_PATH' });

  // Target is inside plugin installation
  await assert.rejects(integrate({ workspace, target: path.join(pluginRoot, 'scripts'), generated, contract: contractFile }), { code: 'UNSAFE_PATH' });

  // Target is raw export originals
  await assert.rejects(integrate({ workspace, target: path.join(workspace, 'originals'), generated, contract: contractFile }), { code: 'UNSAFE_PATH' });
}));

test('negative checks: generated path destined inside run or .ui-component-expert is rejected BEFORE writes', () => setupContainedRun(async ({ scratch, workspace, target, contractFile, runId }) => {
  // 1. Generated path destined inside .ui-component-expert namespace
  const badGenNamespace = path.join(scratch, 'gen-bad-namespace');
  await fs.mkdir(path.join(badGenNamespace, '.ui-component-expert'), { recursive: true });
  await fs.writeFile(path.join(badGenNamespace, '.ui-component-expert', 'Sneaky.tsx'), 'export const Sneaky = 1;\n');
  await fs.writeFile(path.join(badGenNamespace, 'Valid.tsx'), 'export const Valid = 1;\n');

  // Preview rejects before writes
  await assert.rejects(integrate({ workspace, target, generated: badGenNamespace, contract: contractFile, apply: false }), { code: 'UNSAFE_PATH' });

  // Apply rejects before writes
  await assert.rejects(integrate({ workspace, target, generated: badGenNamespace, contract: contractFile, apply: true, allowUnverified: true }), { code: 'UNSAFE_PATH' });
  await assert.rejects(fs.stat(path.join(target, 'Valid.tsx')), { code: 'ENOENT' });
  await assert.rejects(fs.stat(path.join(target, '.ui-component-expert', 'Sneaky.tsx')), { code: 'ENOENT' });

  // 2. Generated path destined inside run directory
  const badGenRun = path.join(scratch, 'gen-bad-run');
  await fs.mkdir(path.join(badGenRun, '.ui-component-expert', 'runs', runId), { recursive: true });
  await fs.writeFile(path.join(badGenRun, '.ui-component-expert', 'runs', runId, 'InsideRun.tsx'), 'export const InsideRun = 1;\n');
  await fs.writeFile(path.join(badGenRun, 'AnotherValid.tsx'), 'export const AnotherValid = 1;\n');

  // Preview rejects before writes
  await assert.rejects(integrate({ workspace, target, generated: badGenRun, contract: contractFile, apply: false }), { code: 'UNSAFE_PATH' });

  // Apply rejects before writes
  await assert.rejects(integrate({ workspace, target, generated: badGenRun, contract: contractFile, apply: true, allowUnverified: true }), { code: 'UNSAFE_PATH' });
  await assert.rejects(fs.stat(path.join(target, 'AnotherValid.tsx')), { code: 'ENOENT' });
  await assert.rejects(fs.stat(path.join(workspace, 'InsideRun.tsx')), { code: 'ENOENT' });
}));

test('rollback cannot delete quarantine or plugin even via forged proof', () => setupContainedRun(async ({ workspace, target, generated, contractFile, runId }) => {
  // 1. Ensure quarantine file in target/.ui-component-expert cannot be deleted via forged rollback proof
  const quarantineDir = path.join(target, '.ui-component-expert', 'quarantine');
  await fs.mkdir(quarantineDir, { recursive: true });
  const quarantineFile = path.join(quarantineDir, 'quarantine-sample.tsx');
  await fs.writeFile(quarantineFile, 'export const Quarantined = 1;\n');
  const quarantineHash = sha256(await fs.readFile(quarantineFile));

  const forgeId = '11111111-1111-4111-8111-111111111111';
  const forgedJournalPath = path.join(workspace, `integration-${forgeId}.json`);
  const forgedProofPath = path.join(workspace, `integration-${forgeId}.proof.json`);

  const binding = {
    runId,
    workspace,
    receiptHash: sha256(await fs.readFile(path.join(workspace, 'receipt.json'))),
    target,
    targetManifestHash: sha256(await fs.readFile(path.join(target, 'package.json'))),
    contract: path.resolve(contractFile),
    contractHash: sha256(await fs.readFile(contractFile)),
    generated: path.resolve(generated)
  };

  const forgedJournal = {
    kind: 'ADDITIVE_JOURNAL',
    ...binding,
    created: [{ path: '.ui-component-expert/quarantine/quarantine-sample.tsx', sha256: quarantineHash }],
    status: 'APPLIED_UNVERIFIED'
  };
  const journalBytes = JSON.stringify(forgedJournal, null, 2) + '\n';
  const forgedProof = {
    kind: 'INTEGRATION_PROOF',
    ...binding,
    manifest: [{ path: '.ui-component-expert/quarantine/quarantine-sample.tsx', sha256: quarantineHash, destination: quarantineFile }],
    created: [{ path: '.ui-component-expert/quarantine/quarantine-sample.tsx', sha256: quarantineHash }],
    status: 'APPLIED_UNVERIFIED',
    journalHash: sha256(journalBytes)
  };

  await fs.writeFile(forgedJournalPath, journalBytes);
  await fs.writeFile(forgedProofPath, JSON.stringify(forgedProof, null, 2) + '\n');

  await assert.rejects(rollback(forgedJournalPath, true), { code: 'INVALID_JOURNAL' });
  // Verify quarantine file was NOT deleted
  assert.equal(await fs.readFile(quarantineFile, 'utf8'), 'export const Quarantined = 1;\n');

  // 2. Ensure plugin installation files cannot be deleted via forged rollback proof
  const forgePluginId = '22222222-2222-4222-8222-222222222222';
  const forgedPluginJournalPath = path.join(workspace, `integration-${forgePluginId}.json`);
  const forgedPluginProofPath = path.join(workspace, `integration-${forgePluginId}.proof.json`);

  const pluginBinding = { ...binding, target: pluginRoot };
  const forgedPluginJournal = {
    kind: 'ADDITIVE_JOURNAL',
    ...pluginBinding,
    created: [{ path: 'Card.tsx', sha256: quarantineHash }],
    status: 'APPLIED_UNVERIFIED'
  };
  const pluginJournalBytes = JSON.stringify(forgedPluginJournal, null, 2) + '\n';
  const forgedPluginProof = {
    kind: 'INTEGRATION_PROOF',
    ...pluginBinding,
    manifest: [{ path: 'Card.tsx', sha256: quarantineHash, destination: path.join(pluginRoot, 'Card.tsx') }],
    created: [{ path: 'Card.tsx', sha256: quarantineHash }],
    status: 'APPLIED_UNVERIFIED',
    journalHash: sha256(pluginJournalBytes)
  };

  await fs.writeFile(forgedPluginJournalPath, pluginJournalBytes);
  await fs.writeFile(forgedPluginProofPath, JSON.stringify(forgedPluginProof, null, 2) + '\n');

  await assert.rejects(rollback(forgedPluginJournalPath, true), { code: 'INVALID_JOURNAL' });
}));
