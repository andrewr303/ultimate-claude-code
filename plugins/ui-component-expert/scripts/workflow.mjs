import { createHash, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { parse as parseJsonc, printParseErrorCode } from 'jsonc-parser';
import { validateContract, diffContracts } from './contract.mjs';
import { assertNoSymlinkAncestors } from './ingest.mjs';

export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = (code, message) => { const error = new Error(message); error.code = code; throw error; };
const reserved = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i;
const sensitive = /(^|[\\/])(\.env(?:\.|$)|\.git|\.ssh|\.aws|\.npmrc$|id_rsa|id_ed25519|credentials?|secrets?|private[-_.]?key|[^/]*\.(?:pem|p12|pfx|key|kdbx))([\\/]|$)/i;
const pluginRoot = path.resolve(import.meta.dirname, '..');
export function safeRelative(name) {
  if (typeof name !== 'string' || !name || name.includes('\0') || name.includes('\\') || name.startsWith('/') || /^[a-z]:/i.test(name) || name.startsWith('//')) fail('UNSAFE_PATH', `Unsafe path: ${name}`);
  const segments = name.split('/');
  if (segments.some(segment => !segment || segment === '.' || segment === '..' || /[:<>"|?*\u0000-\u001f]/.test(segment) || /[. ]$/.test(segment) || reserved.test(segment)) || sensitive.test('/' + name)) fail('UNSAFE_PATH', `Unsafe path: ${name}`);
  return segments.join('/');
}
export function requireAbsolute(value, label) {
  if (typeof value !== 'string' || !path.isAbsolute(value) || value.startsWith('\\\\') || value.startsWith('//')) fail('INVALID_ARGUMENT', `${label} must be an absolute local path`);
  const resolved=path.resolve(value);
  const segments=value.slice(path.parse(value).root.length).split(/[\\/]/).filter(Boolean);
  if (segments.some(segment => segment === '..' || segment === '.' || /[:<>"|?*\u0000-\u001f]/.test(segment) || /[. ]$/.test(segment) || reserved.test(segment))) fail('INVALID_ARGUMENT', `${label} contains a Windows-unsafe path segment`);
  return resolved;
}
async function regularFile(file) {
  const stat = await fs.lstat(file);
  if (!stat.isFile() || stat.isSymbolicLink()) fail('UNSAFE_PATH', `Not a regular file: ${file}`);
  return stat;
}
async function safeParents(root, file) {
  const resolved = path.resolve(root, file);
  if (resolved === root || !resolved.startsWith(root + path.sep)) fail('UNSAFE_PATH', `Path escapes root: ${file}`);
  let current = root;
  for (const segment of path.relative(root, resolved).split(path.sep)) {
    try {
      const siblings = await fs.readdir(current);
      if (siblings.some(name => name !== segment && name.toLowerCase() === segment.toLowerCase())) fail('CASE_COLLISION', `Existing Windows case alias: ${file}`);
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
    current = path.join(current, segment);
    if (current === resolved) break;
    try {
      const stat = await fs.lstat(current);
      if (!stat.isDirectory() || stat.isSymbolicLink() || await fs.realpath(current) !== current) fail('UNSAFE_PATH', `Unsafe parent: ${current}`);
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  return resolved;
}
export function isWithin(parent, candidate) {
  const p = path.resolve(parent).toLowerCase();
  const c = path.resolve(candidate).toLowerCase();
  return c === p || c.startsWith(p.endsWith(path.sep) ? p : p + path.sep);
}
function assertSafeDestination(root, destination, run, generatedRoot, relPath, errorCode = 'UNSAFE_PATH') {
  const reservedNamespace = path.join(root, '.ui-component-expert');
  if (
    isWithin(run, destination) ||
    isWithin(reservedNamespace, destination) ||
    isWithin(generatedRoot, destination) ||
    isWithin(pluginRoot, destination)
  ) fail(errorCode, `Unsafe destination path: ${relPath}`);
}
async function writeNew(file, data) { await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, data, { flag: 'wx' }); }
async function loadContract(file, receipt) {
  const object = JSON.parse(await fs.readFile(requireAbsolute(file, 'contract'), 'utf8'));
  const validation = validateContract(object, { receipt });
  if (!validation.ready) fail('CONTRACT_NOT_READY', JSON.stringify(validation));
  return object;
}
export async function readReceipt(workspace) {
  const run = requireAbsolute(workspace, 'workspace');
  const receiptPath = path.join(run, 'receipt.json');
  await regularFile(receiptPath);
  const receipt = JSON.parse(await fs.readFile(receiptPath, 'utf8'));
  if (receipt.workspace !== run || !Array.isArray(receipt.files) || !receipt.files.length) fail('RECEIPT_MISMATCH', 'Receipt run or files are invalid');
  const originals = path.join(run,'originals');
  if (!(await fs.lstat(originals)).isDirectory() || await fs.realpath(originals) !== originals) fail('RECEIPT_MISMATCH','Originals root is unsafe');
  const seen = new Set();
  for (const item of receipt.files) {
    const relative = safeRelative(item.path);
    const canonical = relative.toLowerCase();
    if (seen.has(canonical)) fail('RECEIPT_MISMATCH',`Duplicate original: ${relative}`);
    seen.add(canonical);
    const original = await safeParents(originals,relative);
    await regularFile(original);
    const bytes = await fs.readFile(original);
    if (bytes.length !== item.bytes || sha256(bytes) !== item.sha256) fail('RECEIPT_MISMATCH',`Original changed: ${relative}`);
  }
  if (receipt.sourceArchive) {
    if (receipt.sourceArchive.path !== 'source-archive.zip') fail('RECEIPT_MISMATCH','Archive path is invalid');
    const archive=path.join(run,'source-archive.zip');
    await regularFile(archive);
    const bytes=await fs.readFile(archive);
    if (bytes.length !== receipt.sourceArchive.bytes || sha256(bytes) !== receipt.sourceArchive.sha256) fail('RECEIPT_MISMATCH','Preserved archive changed');
  }
  return receipt;
}
export function generateBrief(description) {
  if (!description?.trim()) fail('INVALID_ARGUMENT', 'A nonempty --description is required');
  const prompt = [
    '# Claude Design Component Brief & Prompt',
    '',
    '## Target Description',
    description.trim(),
    '',
    '## Viewports & Responsive Design',
    'Specify fluid reflow and breakpoint adaptations across target viewports:',
    '- 320px (Mobile small / narrow)',
    '- 390px (Mobile standard)',
    '- 768px (Tablet)',
    '- 1440px (Desktop)',
    '',
    '## Design Token Tiers',
    'Structure tokens strictly across the exact token tiers (primitive/semantic/component):',
    '- **primitive**: Raw base palette, typography scales, spacing units, and radius primitives',
    '- **semantic**: Intent tokens mapping primitives to purpose (e.g., surface, text-primary, border-focus)',
    '- **component**: Component-scoped token bindings referencing semantic tokens',
    '',
    '## Component Hierarchy, Anatomy & Slots',
    '- Detail component tree hierarchy, element roles, and stable element IDs',
    '- Explicitly specify all content slots, injection points, and interactive controls',
    '',
    '## Canonical States (8 Required)',
    'All eight canonical states must be specified with behavior/styling or "N/A" with an explicit reason:',
    '1. default',
    '2. hover',
    '3. focus',
    '4. active',
    '5. disabled',
    '6. loading',
    '7. error',
    '8. selected',
    '',
    '## Deliverables',
    '- **audience**: Target personas, usage context, and accessibility expectations (WCAG 2.2 AA)',
    '- **theme**: Light, dark, and high-contrast palettes, plus RTL direction support',
    '- **keyboard**: Logical tab order, visible focus rings, and accessible keyboard navigation',
    '- **responsive**: Breakpoints (320, 390, 768, 1440), reflow behavior, and touch target sizing',
    '- **export**: Clean component export bundle with all assets, provenance, and licensing documented (manual download required; no automated portal API)'
  ].join('\n') + '\n';

  return { kind: 'CLAUDE_DESIGN_BRIEF', description: description.trim(), portal: 'Manual Claude Design export/download required; no portal API is invoked', status: 'WAITING_FOR_DOWNLOAD', specification: {
    anatomy: 'Identify component hierarchy and all slots, content, controls and stable IDs',
    states: ['default','hover','focus','active','disabled','loading','error','selected'],
    statesRule: 'For each state provide behavior or N/A with reason',
    themes: 'Specify light/dark, semantic tokens, high contrast and RTL behavior',
    responsive: 'Specify breakpoints (320, 390, 768, 1440), reflow and touch behavior', keyboard: 'Specify tab order, focus visibility, keyboard interactions and accessible names',
    events: 'Name typed events and payloads; separate backend effects from presentation',
    assets: 'List asset paths, provenance, licensing and missing information'
  }, prompt, content: prompt };
}
export async function inspectTarget(target) {
  const root = requireAbsolute(target, 'target');
  if (!(await fs.lstat(root)).isDirectory() || await fs.realpath(root) !== root) fail('UNSAFE_PATH', 'Target root must be a real directory');
  const manifestFile = path.join(root, 'package.json');
  await regularFile(manifestFile);
  const manifest = JSON.parse(await fs.readFile(manifestFile, 'utf8'));
  const declared = { ...(manifest.dependencies ?? {}), ...(manifest.devDependencies ?? {}) };
  const installed = {};
  for (const name of Object.keys(declared)) {
    try {
      const location = path.join(root, 'node_modules', name, 'package.json');
      await regularFile(location);
      installed[name] = JSON.parse(await fs.readFile(location, 'utf8')).version;
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  let tsconfig = null;
  try {
    const errors = [];
    tsconfig = parseJsonc(await fs.readFile(path.join(root, 'tsconfig.json'), 'utf8'), errors, { allowTrailingComma: true });
    if (errors.length) fail('INVALID_TSCONFIG', errors.map(e => printParseErrorCode(e.error)).join(', '));
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const framework = ['next','react','vue','svelte','@angular/core'].filter(name => name in declared);
  const style = ['tailwindcss','styled-components','@emotion/react','sass'].filter(name => name in declared);
  const testing = ['vitest','jest','@playwright/test','playwright','cypress'].filter(name => name in declared);
  const headless = ['@base-ui/react','react-aria-components','@zag-js/react'].filter(name => name in installed);
  return { target: root, framework, style, testing, tsconfig: tsconfig?.compilerOptions ?? null, declared, installed, recommendation: headless.length ? `Consider existing installed ${headless.join(', ')} where appropriate; never auto-install` : 'Native controls/basic widgets by default; no headless dependency installed', scripts: Object.keys(manifest.scripts ?? {}) };
}
export async function buildWorklist(contractFile, workspace, target) {
  const receipt = await readReceipt(workspace);
  const contract = await loadContract(contractFile, receipt);
  const inspector = await inspectTarget(target);
  return { kind: 'IMPLEMENTATION_BUILD_BRIEF', status: 'CONTRACT_READY', contract: requireAbsolute(contractFile, 'contract'), sourceHashes: receipt.files.map(({path,sha256}) => ({path,sha256})), target: inspector, humanReviewGate: { required: true, status: 'PENDING_HUMAN_REVIEW', notice: 'Explicit human code review is strictly required before executing, previewing, or integrating generated components. Copied, pasted, or edited export code cannot be certified as reviewed by SHA comparison or hash checks. Never copy raw export markup into executable code.' }, tasks: contract.components.map(component => ({ stableId: component.stableId, anatomy: component.anatomy, props: component.props, events: component.events, states: component.states, instruction: 'Implement this custom component against target conventions; manually review all visual, keyboard, responsive, theme, and backend requirements.' })), warning: 'This is an implementation worklist, not generated component code. Never render or copy raw export markup into executable preview or target. Copied or edited export code cannot be certified as reviewed by SHA comparison; explicit human review gate required; no false claims of code-review proof.' };
}
export async function hashTree(root) {
  const base = requireAbsolute(root, 'generated');
  if (!(await fs.lstat(base)).isDirectory() || (await fs.realpath(base)) !== base) fail('UNSAFE_PATH', 'Generated root must be a real directory');
  const seen = new Set(), files = [];
  async function visit(dir, prefix='') {
    for (const entry of await fs.readdir(dir, {withFileTypes:true})) {
      const relative = safeRelative(prefix ? `${prefix}/${entry.name}` : entry.name);
      const canonical = relative.toLowerCase();
      if (seen.has(canonical)) fail('CASE_COLLISION', `Duplicate Windows destination: ${relative}`);
      seen.add(canonical);
      const full = path.join(dir, entry.name);
      if (entry.isSymbolicLink() || await fs.realpath(full) !== full) fail('UNSAFE_PATH', `Symlink/reparse point: ${relative}`);
      if (entry.isDirectory()) await visit(full, relative);
      else if (entry.isFile()) {
        if (!/\.(tsx?|css|jsx?)$/.test(relative)) fail('UNSAFE_FILE', `Only reviewed implementation source is allowed: ${relative}`);
        const bytes = await fs.readFile(full);
        files.push({path:relative, sha256:sha256(bytes), bytes:bytes.length, full});
      } else fail('UNSAFE_FILE', `Not a regular file: ${relative}`);
    }
  }
  await visit(base);
  if (!files.length) fail('EMPTY_GENERATED', 'No implementation files supplied');
  return files.sort((a,b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
}
async function reviewedFiles(generated, receipt) {
  const originals = path.join(receipt.workspace,'originals');
  const root = requireAbsolute(generated,'generated');
  if (isWithin(originals, root)) fail('UNTRUSTED_EXPORT', 'Generated source cannot point to preserved export originals');
  const files = await hashTree(root);
  const originalHashes = new Set(receipt.files.map(file => file.sha256));
  if (files.some(file => originalHashes.has(file.sha256))) fail('UNTRUSTED_EXPORT', 'Generated source contains byte-identical untrusted export code; edited export code cannot be certified as reviewed by SHA comparison');
  return files;
}
async function scriptResult(target, script) {
  return await new Promise(resolve => {
    const windows = process.platform === 'win32';
    const executable = windows ? 'cmd.exe' : 'npm';
    const args = windows ? ['/d','/s','/c',`npm.cmd run ${script}`] : ['run',script];
    const child = spawn(executable, args, {cwd:target, shell:false, windowsHide:true, env:{...process.env, CI:'1'}});
    let output = '', timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill(); }, 120_000);
    for (const stream of [child.stdout,child.stderr]) stream?.on('data', data => { output = (output + data.toString()).slice(-20000); });
    child.on('error', error => { clearTimeout(timer); resolve({status:'FAIL', error:error.message, output}); });
    child.on('close', code => { clearTimeout(timer); resolve(timedOut ? {status:'FAIL',reason:'Timed out after 120 seconds',output} : {status:code === 0 ? 'PASS' : 'FAIL', exitCode:code, output}); });
  });
}
export async function verify({target,generated,workspace,contract:contractFile,runChecks=false,browserEvidence}) {
  const receipt = await readReceipt(workspace);
  await loadContract(contractFile, receipt);
  const contractHash = sha256(await fs.readFile(contractFile));
  const inspector = await inspectTarget(target);
  const files = (await reviewedFiles(generated,receipt)).map(({path,sha256,bytes}) => ({path,sha256,bytes}));
  const checks = {};
  for (const script of ['typecheck','test','build']) checks[script] = !runChecks ? {status:'NOT_EVALUATED'} : !inspector.scripts.includes(script) ? {status:'BLOCKED',reason:'Script not declared in target package.json'} : await scriptResult(inspector.target,script);
  const after = (await reviewedFiles(generated,receipt)).map(({path,sha256,bytes}) => ({path,sha256,bytes}));
  if (JSON.stringify(after) !== JSON.stringify(files) || sha256(await fs.readFile(contractFile)) !== contractHash) fail('SOURCE_CHANGED','Generated artifacts or contract changed while checks ran');
  let browser = {status:'BLOCKED', reason:'No internally witnessed real-browser execution is available'};
  if (browserEvidence) {
    const record = JSON.parse(await fs.readFile(requireAbsolute(browserEvidence,'browser-evidence'),'utf8'));
    browser = {status:'BLOCKED', evidence:record, untrustedReport:record, reason:'External report cannot self-certify browser verification; browser gate is BLOCKED and external evidence is retained as untrusted report'};
  }
  const report = {kind:'VERIFICATION',status:'NOT_VERIFIED', generated:requireAbsolute(generated,'generated'), contract:requireAbsolute(contractFile,'contract'), contractHash, sourceHashes:receipt.files.map(({path,sha256})=>({path,sha256})), files, checks, browser};
  const record = path.join(receipt.workspace, `verification-${randomUUID()}.json`);
  await writeNew(record, JSON.stringify(report,null,2)+'\n');
  return {...report,record};
}
function exactKeys(object, keys) {
  return object && typeof object === 'object' && !Array.isArray(object) &&
    Object.keys(object).sort().join(',') === [...keys].sort().join(',');
}
const integrationFields = ['kind','runId','workspace','receiptHash','target','targetManifestHash','contract','contractHash','generated','created','status'];
const proofFields = [...integrationFields,'manifest','journalHash'];
const hashPattern = /^[a-f0-9]{64}$/;
const journalName = /^integration-([a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12})\.json$/;
const jsonLine = object => JSON.stringify(object,null,2)+'\n';

export async function integrate({workspace,contract:contractFile,generated,target,apply=false,allowUnverified=false}) {
  const receipt = await readReceipt(workspace);
  await loadContract(contractFile, receipt);
  const root = requireAbsolute(target,'target');
  const generatedRoot = requireAbsolute(generated,'generated');
  const originals = path.join(receipt.workspace,'originals');
  if (
    isWithin(receipt.workspace, root) ||
    isWithin(generatedRoot, root) ||
    isWithin(originals, root) ||
    isWithin(pluginRoot, root) ||
    sensitive.test(root + path.sep)
  ) fail('UNSAFE_PATH','Unsafe integration target');
  await assertNoSymlinkAncestors(root,'Target');
  await inspectTarget(root);
  const files = await reviewedFiles(generated,receipt);
  const proposed = [];
  for (const file of files) {
    const destination = await safeParents(root, file.path);
    assertSafeDestination(root, destination, receipt.workspace, generatedRoot, file.path, 'UNSAFE_PATH');
    try {
      await fs.lstat(destination);
      fail('DESTINATION_COLLISION', `Destination already exists (refusing any existing destination, identical hash too): ${file.path}`);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    const content = new TextDecoder('utf-8',{fatal:true}).decode(await fs.readFile(file.full));
    proposed.push({path:file.path,sourceHash:file.sha256,destination,action:'ADD',content,diff:`--- /dev/null\n+++ b/${file.path}\n${content.split('\n').map(line=>`+${line}`).join('\n')}`});
  }
  const preview = {
    kind:'INTEGRATION_PREVIEW',
    target:root,
    generated:requireAbsolute(generated,'generated'),
    proposed,
    risks:[
      'Only additive writes; refuses ANY existing destination, identical hash too (DESTINATION_COLLISION)',
      'Browser verification is not internally witnessed; browser gate is BLOCKED',
      'Explicit human review gate required; copied or edited export code cannot be certified as reviewed by SHA comparison; no false claims of code-review proof',
      'Never render or copy raw export markup into executable preview or target'
    ]
  };
  if (!apply) return preview;
  if (!allowUnverified) fail('VERIFICATION_REQUIRED','No witnessed browser verification gate; pass --allow-unverified explicitly to accept risks');
  // Recheck the entire batch directly before writes. Exclusive writes also defend races at the final destination.
  for (const file of files) if (sha256(await fs.readFile(file.full)) !== file.sha256) fail('SOURCE_CHANGED',file.path);
  for (const item of proposed) {
    await safeParents(root,item.path);
    assertSafeDestination(root, item.destination, receipt.workspace, generatedRoot, item.path, 'UNSAFE_PATH');
    try {
      await fs.lstat(item.destination);
      fail('DESTINATION_COLLISION', `Destination collision during final preflight: ${item.path}`);
    } catch(error) {
      if(error.code !== 'ENOENT') throw error;
    }
  }
  const id = randomUUID();
  const journalPath = path.join(receipt.workspace,`integration-${id}.json`);
  const proofPath = path.join(receipt.workspace,`integration-${id}.proof.json`);
  const binding = {runId:receipt.runId,workspace:receipt.workspace,
    receiptHash:sha256(await fs.readFile(path.join(receipt.workspace,'receipt.json'))),
    target:root,targetManifestHash:sha256(await fs.readFile(path.join(root,'package.json'))),
    contract:requireAbsolute(contractFile,'contract'),contractHash:sha256(await fs.readFile(contractFile)),
    generated:requireAbsolute(generated,'generated')};
  const journal = {kind:'ADDITIVE_JOURNAL',...binding,created:[],status:'APPLYING_UNVERIFIED'};
  const proof = {kind:'INTEGRATION_PROOF',...binding,
    manifest:proposed.map(item => ({path:item.path,sha256:item.sourceHash,destination:item.destination})),
    created:[],status:journal.status,journalHash:''};
  async function persist(first=false) {
    const bytes = jsonLine(journal);
    proof.journalHash = sha256(bytes);
    if (first) {
      await writeNew(journalPath,bytes);
      await writeNew(proofPath,jsonLine(proof));
    } else {
      await fs.writeFile(journalPath,bytes);
      await fs.writeFile(proofPath,jsonLine(proof));
    }
  }
  await persist(true);
  try {
    for (const item of proposed) {
      await safeParents(root,item.path);
      assertSafeDestination(root, item.destination, receipt.workspace, generatedRoot, item.path, 'UNSAFE_PATH');
      const contents = await fs.readFile(path.join(generated,item.path));
      if (sha256(contents) !== item.sourceHash) fail('SOURCE_CHANGED',item.path);
      await writeNew(item.destination,contents);
      const created = {path:item.path,sha256:item.sourceHash};
      journal.created.push(created);
      proof.created.push({...created});
      await persist();
    }
    journal.status = proof.status = 'APPLIED_UNVERIFIED';
    await persist();
  } catch(error) { error.journal = journalPath; throw error; }
  return {...preview,status:journal.status,journal:journalPath};
}
export async function rollback(journalFile, apply=false) {
  const file = requireAbsolute(journalFile,'journal');
  const match = journalName.exec(path.basename(file));
  if (!match) fail('INVALID_JOURNAL','Expected an integration journal in its run directory');
  const run = path.dirname(file);
  await assertNoSymlinkAncestors(run,'Run');
  const receipt = await readReceipt(run);
  const proofPath = path.join(run,`integration-${match[1]}.proof.json`);
  const marker = path.join(run,`integration-${match[1]}.rollback.lock`);
  await regularFile(file);
  try { await fs.lstat(marker); fail('ROLLBACK_ALREADY_STARTED','Rollback was already started'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  try { await regularFile(proofPath); }
  catch (error) { if (error.code === 'ENOENT') fail('INVALID_JOURNAL','Integration proof is missing'); throw error; }
  const journalBytes = await fs.readFile(file);
  const journal = JSON.parse(journalBytes);
  const proof = JSON.parse(await fs.readFile(proofPath,'utf8'));
  if (!exactKeys(journal,integrationFields) || !exactKeys(proof,proofFields) ||
      journal.kind !== 'ADDITIVE_JOURNAL' || proof.kind !== 'INTEGRATION_PROOF' ||
      proof.journalHash !== sha256(journalBytes) || !hashPattern.test(proof.journalHash) ||
      !Array.isArray(journal.created) || !Array.isArray(proof.created) ||
      !Array.isArray(proof.manifest) || !proof.manifest.length ||
      !['APPLYING_UNVERIFIED','APPLIED_UNVERIFIED'].includes(journal.status) ||
      journal.status !== proof.status ||
      (journal.status === 'APPLIED_UNVERIFIED' && journal.created.length !== proof.manifest.length) ||
      journal.created.length > proof.manifest.length) fail('INVALID_JOURNAL','Integration journal and proof disagree');
  for (const key of ['runId','workspace','receiptHash','target','targetManifestHash','contract','contractHash','generated']) {
    if (journal[key] !== proof[key]) fail('INVALID_JOURNAL',`Integration binding mismatch: ${key}`);
  }
  if (journal.runId !== receipt.runId || journal.workspace !== run ||
      journal.receiptHash !== sha256(await fs.readFile(path.join(run,'receipt.json')))) fail('INVALID_JOURNAL','Receipt binding mismatch');
  const contractFile = requireAbsolute(journal.contract,'contract');
  await regularFile(contractFile);
  if (sha256(await fs.readFile(contractFile)) !== journal.contractHash || !hashPattern.test(journal.contractHash)) fail('INVALID_JOURNAL','Approved contract changed');
  await loadContract(contractFile,receipt);
  const root = requireAbsolute(journal.target,'journal target');
  if (requireAbsolute(journal.generated,'generated') !== journal.generated) fail('INVALID_JOURNAL','Generated source path is invalid');
  const generatedRoot = path.resolve(journal.generated);
  const originals = path.join(run,'originals');
  if (
    isWithin(run, root) ||
    isWithin(generatedRoot, root) ||
    isWithin(originals, root) ||
    isWithin(pluginRoot, root) ||
    sensitive.test(root + path.sep)
  ) fail('INVALID_JOURNAL','Unsafe integration target');
  await assertNoSymlinkAncestors(root,'Target');
  await inspectTarget(root);
  if (!hashPattern.test(journal.targetManifestHash) ||
      sha256(await fs.readFile(path.join(root,'package.json'))) !== journal.targetManifestHash) fail('INVALID_JOURNAL','Target manifest changed');
  const seen = new Set(), entries = [];
  for (const [index,item] of proof.manifest.entries()) {
    if (!exactKeys(item,['path','sha256','destination']) || !hashPattern.test(item.sha256)) fail('INVALID_JOURNAL','Invalid integration manifest');
    const relative = safeRelative(item.path);
    if (seen.has(relative.toLowerCase())) fail('INVALID_JOURNAL','Duplicate destination');
    seen.add(relative.toLowerCase());
    const location = await safeParents(root,relative);
    if (item.destination !== location) fail('INVALID_JOURNAL','Manifest destination mismatch');
    assertSafeDestination(root, location, run, generatedRoot, relative, 'INVALID_JOURNAL');
    if (index >= journal.created.length) continue;
    const entry = journal.created[index], witnessed = proof.created[index];
    if (!exactKeys(entry,['path','sha256']) || !exactKeys(witnessed,['path','sha256']) ||
        entry.path !== relative || witnessed.path !== relative ||
        entry.sha256 !== item.sha256 || witnessed.sha256 !== item.sha256) fail('INVALID_JOURNAL','Created entries do not match manifest');
    await regularFile(location);
    if (sha256(await fs.readFile(location)) !== entry.sha256) fail('HUMAN_EDIT','Refusing rollback: destination changed');
    entries.push(location);
  }
  if (proof.created.length !== journal.created.length) fail('INVALID_JOURNAL','Created entry count mismatch');
  if (apply) {
    await writeNew(marker,jsonLine({kind:'ROLLBACK_STARTED',journal:file,journalHash:proof.journalHash}));
    for (const [index,location] of entries.entries()) {
      await regularFile(location);
      if (sha256(await fs.readFile(location)) !== proof.manifest[index].sha256) fail('HUMAN_EDIT','Refusing rollback: destination changed');
      assertSafeDestination(root, location, run, generatedRoot, proof.manifest[index].path, 'INVALID_JOURNAL');
      await fs.unlink(location);
    }
    await writeNew(path.join(run,`rollback-${randomUUID()}.json`),jsonLine({kind:'ROLLBACK',journal:file,removed:journal.created}));
  }
  return {kind:'ROLLBACK_PREVIEW',paths:entries,applied:apply};
}
export async function compare(oldFile,newFile) {
  const old = JSON.parse(await fs.readFile(requireAbsolute(oldFile,'old'),'utf8'));
  const next = JSON.parse(await fs.readFile(requireAbsolute(newFile,'new'),'utf8'));
  if (!validateContract(old).ready || !validateContract(next).ready) fail('CONTRACT_NOT_READY','Both contracts must be approved and ready');
  return diffContracts(old,next);
}
export async function status(workspace) {
  if (!workspace) return {status:'WAITING_FOR_DOWNLOAD',reason:'Awaiting manual portal export/download'};
  const receipt = await readReceipt(workspace);
  const files = await fs.readdir(receipt.workspace);
  let state = 'INGESTED';
  const contractFiles = files.filter(name => name.startsWith('contract-') && name.endsWith('.json'));
  for (const name of contractFiles) {
    const object = JSON.parse(await fs.readFile(path.join(receipt.workspace,name),'utf8'));
    if (validateContract(object,{receipt}).ready) state = 'CONTRACT_READY';
  }
  const journals = files.filter(name => name.startsWith('integration-') && name.endsWith('.json'));
  if (state === 'CONTRACT_READY') {
    for (const name of journals) {
      const journal = JSON.parse(await fs.readFile(path.join(receipt.workspace,name),'utf8'));
      if (journal.status !== 'APPLIED_UNVERIFIED' || !Array.isArray(journal.created)) continue;
      let intact = journal.created.length > 0;
      for (const entry of journal.created) {
        try {
          const location = await safeParents(requireAbsolute(journal.target,'journal target'),safeRelative(entry.path));
          if (sha256(await fs.readFile(location)) !== entry.sha256) intact = false;
        } catch { intact = false; }
      }
      if (intact) state = 'IMPLEMENTED_UNVERIFIED';
    }
  }
  return {status:state,workspace:receipt.workspace,runId:receipt.runId,receipt:receipt.receipt ?? path.join(receipt.workspace,'receipt.json')};
}
