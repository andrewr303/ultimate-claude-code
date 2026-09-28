#!/usr/bin/env node
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { ingest } from './ingest.mjs';
import { extractContract, validateContract } from './contract.mjs';
import { generateBrief, inspectTarget, buildWorklist, verify, integrate, rollback, compare, status, readReceipt, requireAbsolute } from './workflow.mjs';

const pluginRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
function requireProjectWorkspace(value) {
  const workspace=requireAbsolute(value,'workspace');
  if (workspace.toLowerCase() === pluginRoot.toLowerCase() || workspace.toLowerCase().startsWith(pluginRoot.toLowerCase() + path.sep)) throw Object.assign(new Error('Workspace must be project-owned outside the installed plugin'),{code:'UNSAFE_WORKSPACE'});
  return workspace;
}

const help = `ui-component-expert deterministic engine (Node >=22)
Usage: node scripts/cli.mjs COMMAND [flags] [--json]
Commands and required flags:
  generate-brief --description TEXT [--workspace ABS]   Emits portable Markdown prompt for manual Claude Design paste; WAITING_FOR_DOWNLOAD
  ingest-export --input ABS --workspace ABS             Creates unique workspace/runId and immutable originals/receipt
  extract-contract --workspace ABS                       Writes draft contract-UUID.json (workspace is run directory)
  validate-contract --contract ABS [--workspace ABS]     Structural validity separate from readiness; workspace links hashes
  inspect-target --target ABS                            Reads package.json, installed packages, JSONC tsconfig; no execution
  generate-components --workspace ABS --contract ABS --target ABS
                                                         Emits build brief/worklist only; not component code; explicit human review gate
  run-verification --workspace ABS --contract ABS --target ABS --generated ABS [--run-checks] [--browser-evidence ABS]
                                                         Gates use PASS/FAIL/BLOCKED/NOT_EVALUATED; browser gate BLOCKED, untrusted browser report retained
  integrate-target --workspace ABS --contract ABS --target ABS --generated ABS [--apply --allow-unverified]
                                                         Preview default; refuses ANY existing destination, identical hash too (DESTINATION_COLLISION); whole-batch preflight
  integrate-target --rollback ABS [--apply]              Preview/rollback additive journal, refuses changed files
  diff-contract --old ABS --new ABS                      Classifies approved contracts, no target writes
  status [--workspace ABS]                               Default WAITING_FOR_DOWNLOAD
Flags are strict and command-specific. --json emits a single JSON object. Nonzero errors include code/message.
Security boundary: Never render or copy raw export markup into executable preview or target.
Copied or edited export code cannot be certified as reviewed by SHA comparison; explicit human review gate in generated worklist, integration risks and help, no false claims of code-review proof.
No export code is executed, no portal/browser/model API is used; external browser reports cannot self-certify verification.
`;
const commands = {
  'generate-brief': {required:['description'],optional:['workspace']},
  'ingest-export': {required:['input','workspace']},
  'extract-contract': {required:['workspace']},
  'validate-contract': {required:['contract'],optional:['workspace']},
  'inspect-target': {required:['target']},
  'generate-components': {required:['workspace','contract','target']},
  'run-verification': {required:['workspace','contract','target','generated'],optional:['run-checks','browser-evidence']},
  'integrate-target': {optional:['workspace','contract','target','generated','apply','allow-unverified','rollback']},
  'diff-contract': {required:['old','new']},
  status: {optional:['workspace']}
};
const switches = new Set(['json','apply','allow-unverified','run-checks']);
const paths = new Set(['workspace','input','target','contract','generated','browser-evidence','old','new','rollback']);
function parse(argv) {
  const [command,...tail] = argv;
  if (!command || command === '--help' || command === 'help') return {command:'help',flags:{}};
  const spec = commands[command];
  if (!spec) throw Object.assign(new Error(`Unknown command: ${command}`),{code:'INVALID_COMMAND'});
  const allowed = new Set([...(spec.required ?? []),...(spec.optional ?? []),'json']);
  const flags = {};
  for (let i=0;i<tail.length;i++) {
    const arg=tail[i];
    if (arg === '--help') return {command:'help',flags:{}};
    if (!arg.startsWith('--') || arg.includes('=')) throw Object.assign(new Error(`Unexpected argument: ${arg}`),{code:'INVALID_ARGUMENT'});
    const key=arg.slice(2);
    if (!allowed.has(key) || key in flags) throw Object.assign(new Error(`Unknown or duplicate flag: ${arg}`),{code:'INVALID_ARGUMENT'});
    flags[key] = switches.has(key) ? true : tail[++i];
    if (flags[key] === undefined || (typeof flags[key] === 'string' && flags[key].startsWith('--'))) throw Object.assign(new Error(`Missing value for ${arg}`),{code:'INVALID_ARGUMENT'});
  }
  for (const key of spec.required ?? []) if (!(key in flags)) throw Object.assign(new Error(`Missing --${key}`),{code:'INVALID_ARGUMENT'});
  for (const key of paths) if (key in flags) flags[key]=requireAbsolute(flags[key],key);
  if (command==='integrate-target') {
    if (flags.rollback) {
      if (['workspace','contract','target','generated','allow-unverified'].some(key=>key in flags)) throw Object.assign(new Error('Rollback accepts only --rollback and optional --apply'),{code:'INVALID_ARGUMENT'});
    } else for (const key of ['workspace','contract','target','generated']) if (!(key in flags)) throw Object.assign(new Error(`Missing --${key}`),{code:'INVALID_ARGUMENT'});
    if (flags['allow-unverified'] && !flags.apply) throw Object.assign(new Error('--allow-unverified requires --apply'),{code:'INVALID_ARGUMENT'});
  }
  return {command,flags};
}
async function dispatch(command, f) {
  switch(command) {
    case 'generate-brief': {
      const brief=generateBrief(f.description);
      if (!f.workspace) return brief;
      const folder=requireProjectWorkspace(f.workspace);
      await fs.mkdir(folder,{recursive:true});
      const file=path.join(folder,`design-brief-${randomUUID()}.md`);
      await fs.writeFile(file,brief.prompt,{flag:'wx'});
      return {...brief,file,path:file,status:'WAITING_FOR_DOWNLOAD'};
    }
    case 'ingest-export': return ingest(f.input,requireProjectWorkspace(f.workspace));
    case 'extract-contract': {
      const receipt=await readReceipt(f.workspace);
      const file=path.join(receipt.workspace,`contract-${randomUUID()}.json`);
      const draft=await extractContract(receipt,file);
      return {status:'INGESTED',contract:file,validation:validateContract(draft,{receipt}),note:'Draft requires human review/approval; generic layout cannot be deterministically converted into approved components'};
    }
    case 'validate-contract': {
      const object=JSON.parse(await fs.readFile(f.contract,'utf8'));
      const result=validateContract(object,{receipt:f.workspace ? await readReceipt(f.workspace) : undefined});
      if (!result.ready) throw Object.assign(new Error(result.structuralValid ? 'Contract is structurally valid but not approved/ready' : 'Contract is structurally invalid'),{code:'CONTRACT_NOT_READY',details:result});
      return result;
    }
    case 'inspect-target': return inspectTarget(f.target);
    case 'generate-components': return buildWorklist(f.contract,f.workspace,f.target);
    case 'run-verification': return verify({workspace:f.workspace,contract:f.contract,target:f.target,generated:f.generated,runChecks:!!f['run-checks'],browserEvidence:f['browser-evidence']});
    case 'integrate-target': return f.rollback ? rollback(f.rollback,!!f.apply) : integrate({workspace:f.workspace,contract:f.contract,target:f.target,generated:f.generated,apply:!!f.apply,allowUnverified:!!f['allow-unverified']});
    case 'diff-contract': return compare(f.old,f.new);
    case 'status': return status(f.workspace);
    default: throw new Error('Unreachable command');
  }
}
export async function main(argv=process.argv.slice(2)) {
  const json=argv.includes('--json');
  try {
    const {command,flags}=parse(argv);
    if(command==='help') {process.stdout.write(help);return 0;}
    const result=await dispatch(command,flags);
    process.stdout.write(JSON.stringify({ok:true,...result},null,json ? 0 : 2)+'\n');
    return 0;
  } catch(error) {
    process.stderr.write(JSON.stringify({ok:false,error:{code:error.code ?? 'ENGINE_ERROR',message:error.message,...(error.details ? {details:error.details}: {}),...(error.journal ? {journal:error.journal}: {})}})+'\n');
    return 1;
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) process.exitCode=await main();
