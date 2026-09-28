/**
 * UI Component Expert - Deterministic DesignContract Module
 * Node.js >= 22 ESM
 *
 * Exports:
 * - STATES: Frozen array of 8 canonical states
 * - extractContract(receipt, outputPath): Async source-linked draft extraction
 * - validateContract(contract, { receipt }): Structural and readiness validation
 * - diffContracts(oldContract, newContract): Classification into breaking, additive, and visual changes
 */

import Ajv from 'ajv';
import { readFileSync, promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const STATES = Object.freeze([
  'default',
  'hover',
  'focus',
  'active',
  'disabled',
  'loading',
  'error',
  'selected'
]);

// Single synchronous compilation of JSON schema via Ajv
const schemaPath = path.resolve(__dirname, '../contracts/schema.json');
const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
const ajv = new Ajv({
  allErrors: true,
  allowUnionTypes: true,
  strict: false
});
const ajvValidate = ajv.compile(schema);

// Windows reserved device names: CON, PRN, AUX, NUL, COM1-9, LPT1-9
const WINDOWS_RESERVED = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i;

/**
 * Normalizes relative path for cross-platform comparison
 */
function normalizeRelativePath(p) {
  if (typeof p !== 'string') return '';
  return p.replace(/\\/g, '/').replace(/^\.\//, '');
}

/**
 * Validates path against Windows aliases, reserved device names,
 * Alternate Data Streams (ADS), trailing dot/space, and directory traversal.
 */
function isUnsafeAssetPath(name) {
  if (typeof name !== 'string' || !name || name.length === 0) return true;
  // Reject null bytes, backslashes, leading slash, UNC paths, and Windows drive letters
  if (name.includes('\0') || name.includes('\\') || name.startsWith('/') || /^[a-z]:/i.test(name) || name.startsWith('//')) {
    return true;
  }
  const segments = name.split('/');
  for (const segment of segments) {
    if (!segment || segment === '.' || segment === '..') return true;
    // Reject Windows Alternate Data Streams (:) and invalid path characters (< > " | ? *)
    if (/[:<>"|?*\u0000-\u001f]/.test(segment)) return true;
    // Reject trailing dot or space on any path segment
    if (/[. ]$/.test(segment)) return true;
    // Reject Windows reserved device names
    if (WINDOWS_RESERVED.test(segment)) return true;
  }
  return false;
}

/**
 * Checks token graph for circular aliases and unresolved references
 */
function validateTokenGraph(tokens, errors) {
  if (!tokens || typeof tokens !== 'object') return;

  const tokenIndex = new Map();

  for (const tier of ['primitive', 'semantic', 'component']) {
    const tierTokens = tokens[tier];
    if (tierTokens && typeof tierTokens === 'object' && !Array.isArray(tierTokens)) {
      for (const [key, rawEntry] of Object.entries(tierTokens)) {
        let value = rawEntry;
        let ref = null;
        if (rawEntry && typeof rawEntry === 'object' && !Array.isArray(rawEntry)) {
          value = rawEntry.value;
          ref = rawEntry.ref || rawEntry.$ref || null;
        }

        if (!ref && typeof value === 'string') {
          const match = value.match(/^\{([^}]+)\}$/);
          if (match) {
            ref = match[1].trim();
          }
        }

        const tierPrefixedKey = `${tier}.${key}`;
        tokenIndex.set(tierPrefixedKey, { targetRef: ref, value, rawKey: key, tier });
        tokenIndex.set(key, { targetRef: ref, value, rawKey: key, tier });
      }
    }
  }

  function resolveRefKey(target) {
    if (!target) return null;
    const clean = target.replace(/^\{|\}$/g, '').trim();
    if (tokenIndex.has(clean)) return clean;
    for (const prefix of ['primitive.', 'semantic.', 'component.']) {
      if (tokenIndex.has(prefix + clean)) return prefix + clean;
    }
    return null;
  }

  for (const [fullKey, entry] of tokenIndex.entries()) {
    if (!fullKey.includes('.')) continue;
    if (!entry.targetRef) continue;

    const resolvedTarget = resolveRefKey(entry.targetRef);
    if (!resolvedTarget) {
      errors.push(`Unresolved token reference in "${fullKey}": target "${entry.targetRef}" was not found`);
      continue;
    }

    const stack = [fullKey];
    let current = resolvedTarget;

    while (current) {
      if (stack.includes(current)) {
        const cycle = [...stack.slice(stack.indexOf(current)), current];
        errors.push(`Circular token reference detected: ${cycle.join(' -> ')}`);
        break;
      }
      stack.push(current);
      const nextEntry = tokenIndex.get(current);
      if (!nextEntry || !nextEntry.targetRef) break;
      current = resolveRefKey(nextEntry.targetRef);
      if (!current) break;
    }
  }
}

/**
 * Validates a DesignContract object against structural invariants and readiness requirements.
 *
 * @param {any} contract - The DesignContract to validate
 * @param {object} [options]
 * @param {object} [options.receipt] - Ingestion receipt {runId, workspace, files:[{path,sha256,bytes,kind,evidence}]}
 * @returns {{ structuralValid: boolean, ready: boolean, errors: string[], unknowns: any[] }}
 */
export function validateContract(contract, { receipt } = {}) {
  const errors = [];
  const unknowns = Array.isArray(contract?.unknowns) ? contract.unknowns : [];

  if (!contract || typeof contract !== 'object' || Array.isArray(contract)) {
    return {
      structuralValid: false,
      ready: false,
      errors: ['Contract must be a non-null object'],
      unknowns: []
    };
  }

  // 1. Synchronous Ajv Schema Validation
  const valid = ajvValidate(contract);
  if (!valid && ajvValidate.errors) {
    for (const err of ajvValidate.errors) {
      const loc = err.instancePath || '#';
      errors.push(`Schema error at ${loc}: ${err.message}${err.params ? ' (' + JSON.stringify(err.params) + ')' : ''}`);
    }
  }

  // 2. Validate metadata.sourceHashes: path safety, duplicates, casefold collisions
  const sourceHashes = Array.isArray(contract.metadata?.sourceHashes)
    ? contract.metadata.sourceHashes
    : [];
  const seenSourcePaths = new Set();
  const seenSourceCasefold = new Set();

  for (const sh of sourceHashes) {
    if (!sh || typeof sh !== 'object') continue;
    if (isUnsafeAssetPath(sh.path)) {
      errors.push(`Source hash has unsafe path: "${sh.path}"`);
    }
    const norm = normalizeRelativePath(sh.path);
    const lower = norm.toLowerCase();
    if (seenSourcePaths.has(norm)) {
      errors.push(`Duplicate source hash path: "${sh.path}"`);
    }
    if (seenSourceCasefold.has(lower) && !seenSourcePaths.has(norm)) {
      errors.push(`Casefold collision in source hash paths: "${sh.path}"`);
    }
    seenSourcePaths.add(norm);
    seenSourceCasefold.add(lower);
  }

  // 3. Invariant: Duplicate Component IDs
  const seenComponentIds = new Set();
  const components = Array.isArray(contract.components) ? contract.components : [];
  for (const comp of components) {
    if (!comp || typeof comp !== 'object') continue;
    const stableId = comp.stableId;
    if (stableId) {
      if (seenComponentIds.has(stableId)) {
        errors.push(`Duplicate component stableId: "${stableId}"`);
      }
      seenComponentIds.add(stableId);
    }
    if (comp.id && comp.id !== stableId) {
      if (seenComponentIds.has(comp.id)) {
        errors.push(`Duplicate component id: "${comp.id}"`);
      }
      seenComponentIds.add(comp.id);
    }
  }

  // 4. Invariant: Component Canonical States (All 8 states required; N/A reason check)
  for (const comp of components) {
    if (!comp || typeof comp !== 'object') continue;
    const compId = comp.stableId || comp.id || 'unidentified-component';
    const states = comp.states;
    if (!states || typeof states !== 'object' || Array.isArray(states)) {
      errors.push(`Component "${compId}" is missing states object`);
      continue;
    }

    for (const stateName of STATES) {
      if (!(stateName in states)) {
        errors.push(`Component "${compId}" is missing required canonical state: "${stateName}"`);
        continue;
      }
      const stateEntry = states[stateName];
      if (!stateEntry || typeof stateEntry !== 'object' || Array.isArray(stateEntry)) {
        errors.push(`Component "${compId}" state "${stateName}" must be an object`);
        continue;
      }
      if (typeof stateEntry.applicable !== 'boolean') {
        errors.push(`Component "${compId}" state "${stateName}" must specify boolean applicable property`);
        continue;
      }
      if (stateEntry.applicable === false) {
        if (!stateEntry.reason || typeof stateEntry.reason !== 'string' || !stateEntry.reason.trim()) {
          errors.push(`Component "${compId}" non-applicable state "${stateName}" must specify a non-empty reason`);
        }
      } else {
        if (stateEntry.value === undefined) {
          errors.push(`Component "${compId}" applicable state "${stateName}" must provide a value`);
        }
      }
    }
  }

  // 5. Invariant: Asset Path Traversal, Duplicate Asset IDs, and License Null Allowed
  const seenAssetIds = new Set();
  const assets = Array.isArray(contract.assets) ? contract.assets : [];
  for (const asset of assets) {
    if (!asset || typeof asset !== 'object') continue;
    if (asset.id) {
      if (seenAssetIds.has(asset.id)) {
        errors.push(`Duplicate asset id: "${asset.id}"`);
      }
      seenAssetIds.add(asset.id);
    }
    if (isUnsafeAssetPath(asset.path)) {
      errors.push(`Asset "${asset.id || 'unknown'}" has unsafe path containing traversal, reserved name, or invalid characters: "${asset.path}"`);
    }
    if (asset.license !== null && typeof asset.license !== 'string') {
      errors.push(`Asset "${asset.id || 'unknown'}" license must be a string or null`);
    }
  }

  // 6. Invariant: Duplicate Unknown IDs & Valid Properties
  const seenUnknownIds = new Set();
  for (const unk of unknowns) {
    if (!unk || typeof unk !== 'object') continue;
    if (unk.id) {
      if (seenUnknownIds.has(unk.id)) {
        errors.push(`Duplicate unknown id: "${unk.id}"`);
      }
      seenUnknownIds.add(unk.id);
    }
    if (typeof unk.required !== 'boolean' || typeof unk.resolved !== 'boolean') {
      errors.push(`Unknown "${unk.id || 'unknown'}" must define boolean required and resolved properties`);
    }
  }

  // 7. Invariant: Token Alias Cycles and Unresolved References
  validateTokenGraph(contract.tokens, errors);

  // Structural validity is true if all schema and structural invariants pass
  const structuralValid = errors.length === 0;

  // 8. Receipt Evidence Matching (if receipt provided)
  let receiptMatched = true;
  const receiptErrors = [];
  if (receipt !== undefined) {
    if (typeof receipt !== 'object' || receipt === null || typeof receipt.runId !== 'string' || !receipt.runId.trim() || !Array.isArray(receipt.files)) {
      receiptErrors.push('Malformed receipt: receipt must be a valid object with non-empty runId and files array');
      receiptMatched = false;
    } else {
      if (receipt.runId !== contract.metadata?.runId) {
        receiptErrors.push(`Contract runId "${contract.metadata?.runId}" does not match receipt runId "${receipt.runId}"`);
        receiptMatched = false;
      }

      const contractHashMap = new Map();
      for (const item of sourceHashes) {
        if (item?.path) {
          contractHashMap.set(normalizeRelativePath(item.path), item.sha256);
        }
      }

      const receiptHashMap = new Map();
      for (const rf of receipt.files) {
        if (rf?.path) {
          receiptHashMap.set(normalizeRelativePath(rf.path), rf.sha256);
        }
      }

      // Check for missing or mismatched receipt files
      for (const rf of receipt.files) {
        if (!rf?.path) continue;
        const normReceiptPath = normalizeRelativePath(rf.path);
        const foundHash = contractHashMap.get(normReceiptPath);
        if (!foundHash) {
          receiptErrors.push(`Receipt source file "${rf.path}" is missing in contract metadata sourceHashes`);
          receiptMatched = false;
        } else if (rf.sha256 && foundHash !== rf.sha256) {
          receiptErrors.push(`Hash mismatch for receipt file "${rf.path}": expected "${rf.sha256}", got "${foundHash}"`);
          receiptMatched = false;
        }
      }

      // Check for extra files in contract not present in receipt
      for (const sh of sourceHashes) {
        if (!sh?.path) continue;
        const normContractPath = normalizeRelativePath(sh.path);
        if (!receiptHashMap.has(normContractPath)) {
          receiptErrors.push(`Contract metadata sourceHashes contains extra file not in receipt: "${sh.path}"`);
          receiptMatched = false;
        }
      }
    }
  }

  // 9. Readiness Determination
  // Readiness requires approved reviewStatus, non-empty approvedBy/approvedAt, at least one complete reviewed component,
  // explicit non-null reviewed rtl/reducedMotion/responsive, non-empty resolution string on all resolved required unknowns,
  // and full receipt evidence parity.
  const isApproved = contract.metadata?.reviewStatus === 'approved';
  const hasApprovedBy = typeof contract.metadata?.approvedBy === 'string' && contract.metadata.approvedBy.trim().length > 0;
  const hasApprovedAt = typeof contract.metadata?.approvedAt === 'string' && contract.metadata.approvedAt.trim().length > 0;
  const hasComponents = Array.isArray(contract.components) && contract.components.length > 0;
  const hasThemes = Boolean(contract.themes && typeof contract.themes === 'object' && contract.themes.light && contract.themes.dark);
  const hasRtl = Boolean(contract.rtl && typeof contract.rtl === 'object' && typeof contract.rtl.supported === 'boolean');
  const hasReducedMotion = Boolean(contract.reducedMotion && typeof contract.reducedMotion === 'object' && typeof contract.reducedMotion.supported === 'boolean');
  const hasResponsive = Boolean(contract.responsive && typeof contract.responsive === 'object' && contract.responsive.breakpoints && typeof contract.responsive.breakpoints === 'object');

  const unresolvedRequiredUnknowns = unknowns.filter(u => u && u.required === true && u.resolved !== true);
  const noUnresolvedRequired = unresolvedRequiredUnknowns.length === 0;

  // Check that all resolved required unknowns provide a non-empty resolution string (prevent fake boolean toggling)
  let allResolvedHaveResolution = true;
  for (const u of unknowns) {
    if (u && u.required === true && u.resolved === true) {
      if (!u.resolution || typeof u.resolution !== 'string' || !u.resolution.trim()) {
        receiptErrors.push(`Required unknown "${u.id}" is marked resolved=true but lacks a non-empty resolution string`);
        allResolvedHaveResolution = false;
      }
    }
  }

  if (isApproved) {
    if (!hasApprovedBy) {
      receiptErrors.push('Approved contract requires non-empty metadata.approvedBy reviewer identity');
    }
    if (!hasApprovedAt) {
      receiptErrors.push('Approved contract requires non-empty metadata.approvedAt timestamp');
    }
    if (!hasComponents) {
      receiptErrors.push('Approved contract requires at least one complete reviewed component');
    }
    if (!hasThemes) {
      receiptErrors.push('Approved contract requires explicit non-null reviewed themes specification');
    }
    if (!hasRtl) {
      receiptErrors.push('Approved contract requires explicit non-null reviewed rtl specification');
    }
    if (!hasReducedMotion) {
      receiptErrors.push('Approved contract requires explicit non-null reviewed reducedMotion specification');
    }
    if (!hasResponsive) {
      receiptErrors.push('Approved contract requires explicit non-null reviewed responsive specification with breakpoints');
    }
    if (!noUnresolvedRequired) {
      receiptErrors.push(`Approved contract has ${unresolvedRequiredUnknowns.length} unresolved required unknowns`);
    }
  }

  errors.push(...receiptErrors);

  const ready = structuralValid &&
    isApproved &&
    hasApprovedBy &&
    hasApprovedAt &&
    hasComponents &&
    hasThemes &&
    hasRtl &&
    hasReducedMotion &&
    hasResponsive &&
    noUnresolvedRequired &&
    allResolvedHaveResolution &&
    receiptMatched;

  return {
    structuralValid,
    ready,
    errors,
    unknowns
  };
}

/**
 * Extracts a source-linked draft DesignContract from an ingestion receipt.
 *
 * Creates honest, source-linked draft without arbitrary invented values:
 * - Empty token tiers where no tokens are observed
 * - Empty component list (no fake placeholder component or visual state values)
 * - Null sourceViewport, null themes, null rtl, null reducedMotion, null responsive
 * - Deterministic, collision-free path-derived asset IDs
 * - Required unknowns documenting necessary human decisions (components, tokens, states, themes, rtl, motion, responsive, governance)
 * - Output file writing via exclusive 'wx' flag (no automatic overwrite)
 *
 * @param {object} receipt - Promised ingestion receipt {runId, workspace, files:[{path,sha256,bytes,kind,evidence}]}
 * @param {string} [outputPath] - Optional path to write the extracted draft contract JSON
 * @returns {Promise<object>} The extracted DRAFT contract
 */
export async function extractContract(receipt, outputPath) {
  if (!receipt || typeof receipt !== 'object') {
    throw Object.assign(new Error('extractContract requires a valid ingestion receipt object'), {
      code: 'INVALID_RECEIPT'
    });
  }
  if (!receipt.runId || typeof receipt.runId !== 'string') {
    throw Object.assign(new Error('Receipt is missing a valid runId string'), {
      code: 'INVALID_RECEIPT'
    });
  }
  if (!Array.isArray(receipt.files)) {
    throw Object.assign(new Error('Receipt is missing a files array'), {
      code: 'INVALID_RECEIPT'
    });
  }

  // Preserve source hashes strictly from receipt
  const sourceHashes = receipt.files.map(f => ({
    path: normalizeRelativePath(f.path),
    sha256: f.sha256,
    bytes: typeof f.bytes === 'number' ? f.bytes : 0
  }));

  // Build evidence records linking directly to source receipt files
  const evidence = {};
  for (const f of receipt.files) {
    const norm = normalizeRelativePath(f.path);
    evidence[norm] = {
      path: norm,
      sha256: f.sha256,
      confidence: 'observed',
      description: `Ingested source file (${f.kind || 'file'}, ${f.bytes ?? 0} bytes)`
    };
  }

  // Map assets strictly from receipt files with collision-free, path-derived IDs
  const assets = [];
  const seenAssetIds = new Set();
  for (const f of receipt.files) {
    const norm = normalizeRelativePath(f.path);
    const ext = path.extname(norm).toLowerCase();
    if (['.svg', '.png', '.jpg', '.jpeg', '.webp', '.ico', '.woff', '.woff2', '.ttf'].includes(ext) || f.kind === 'svg' || f.kind === 'asset') {
      const safePathId = norm.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
      let id = `asset-${safePathId}`;
      let counter = 1;
      while (seenAssetIds.has(id)) {
        id = `asset-${safePathId}_${counter++}`;
      }
      seenAssetIds.add(id);

      assets.push({
        id,
        path: norm,
        kind: ext === '.svg' || f.kind === 'svg' ? 'svg' : (ext.startsWith('.woff') ? 'font' : 'image'),
        dimensions: null, // explicit null: unknown without image decode
        license: null,    // license null allowed
        sha256: f.sha256,
        evidence: `Source receipt file ${norm}`
      });
    }
  }

  // Honest unknowns: explicit documentation of unmapped decisions
  const unknowns = [
    {
      id: 'unk-components-unmapped',
      category: 'component',
      description: 'No component anatomy or slot structures observed in source evidence; manual component definition and review required',
      required: true,
      resolved: false,
      resolution: null,
      evidence: 'Automated extraction found no validated component definitions in source files'
    },
    {
      id: 'unk-tokens-unmapped',
      category: 'token',
      description: 'No design tokens observed or extracted from source files; design system token mapping required',
      required: true,
      resolved: false,
      resolution: null,
      evidence: 'Token tiers left empty to avoid arbitrary invented values'
    },
    {
      id: 'unk-state-matrix-unreviewed',
      category: 'states',
      description: 'Component canonical 8-state matrix and non-applicable reasons require manual authoring and review',
      required: true,
      resolved: false,
      resolution: null,
      evidence: 'Visual state values cannot be reliably inferred without human sign-off'
    },
    {
      id: 'unk-theme-mapping',
      category: 'theme',
      description: 'Theme specifications (light, dark, high-contrast) require explicit design review',
      required: true,
      resolved: false,
      resolution: null,
      evidence: 'Themes left null in draft to represent unknown design palette'
    },
    {
      id: 'unk-rtl-support',
      category: 'internationalization',
      description: 'Right-to-left (RTL) layout support and logical properties require explicit review',
      required: true,
      resolved: false,
      resolution: null,
      evidence: 'RTL left null in draft to represent unknown directional support'
    },
    {
      id: 'unk-reduced-motion-handling',
      category: 'accessibility',
      description: 'Reduced motion preferences and animation fallbacks require explicit specification',
      required: true,
      resolved: false,
      resolution: null,
      evidence: 'Reduced motion left null in draft to represent unknown motion policy'
    },
    {
      id: 'unk-responsive-behavior',
      category: 'responsive',
      description: 'Responsive breakpoints and reflow behavior require explicit review',
      required: true,
      resolved: false,
      resolution: null,
      evidence: 'Responsive configuration left null in draft to represent unknown breakpoint rules'
    },
    {
      id: 'unk-governance-approval',
      category: 'governance',
      description: 'Contract is in DRAFT status and requires explicit human review and approval with non-empty approvedBy and approvedAt',
      required: true,
      resolved: false,
      resolution: null,
      evidence: 'Automated extraction produces draft contract only; no invented approval'
    },
    {
      id: 'unk-accessibility-review',
      category: 'accessibility',
      description: 'Keyboard navigation, visible focus indicators, and ARIA relationships require manual verification',
      required: true,
      resolved: false,
      resolution: null,
      evidence: 'Accessibility contracts must adhere to WAI-ARIA and WCAG 2.2 AA'
    }
  ];

  // Construct draft contract with empty unmapped tiers and explicit null for unknown fields
  const contract = {
    schemaVersion: 1,
    metadata: {
      runId: receipt.runId,
      schemaVersion: 1,
      createdAt: receipt.createdAt ?? null,
      sourceHashes,
      confidence: 'observed',
      reviewStatus: 'draft',
      approvedBy: null,
      approvedAt: null,
      sourceViewport: null, // explicit null: unknown viewport
      notes: 'Initial draft extracted from ingestion receipt; human review required.'
    },
    tokens: {
      primitive: {},
      semantic: {},
      component: {},
      themes: {}
    },
    assets,
    hierarchy: {
      root: 'unmapped-root',
      regions: {},
      tree: []
    },
    components: [], // Empty: no fake placeholder component
    themes: null,   // explicit null: unknown
    rtl: null,      // explicit null: unknown
    reducedMotion: null, // explicit null: unknown
    responsive: null,    // explicit null: unknown
    unknowns,
    evidence,
    unmappedArtifacts: []
  };

  // Write with exclusive 'wx' flag to prevent arbitrary overwriting of existing output
  if (outputPath) {
    const fullOutputPath = path.resolve(outputPath);
    await fs.mkdir(path.dirname(fullOutputPath), { recursive: true });
    await fs.writeFile(fullOutputPath, JSON.stringify(contract, null, 2) + '\n', { flag: 'wx', encoding: 'utf8' });
  }

  return contract;
}

/**
 * Normalizes props into a map of name -> specification
 */
function normalizeProps(props) {
  const map = new Map();
  if (Array.isArray(props)) {
    for (const p of props) {
      if (p?.name) map.set(p.name, p);
    }
  } else if (props && typeof props === 'object') {
    for (const [name, spec] of Object.entries(props)) {
      map.set(name, { name, ...spec });
    }
  }
  return map;
}

/**
 * Normalizes events into a map of name -> specification
 */
function normalizeEvents(events) {
  const map = new Map();
  if (Array.isArray(events)) {
    for (const e of events) {
      if (e?.name) map.set(e.name, e);
    }
  } else if (events && typeof events === 'object') {
    for (const [name, spec] of Object.entries(events)) {
      map.set(name, { name, ...spec });
    }
  }
  return map;
}

/**
 * Compares two approved DesignContracts and classifies differences into
 * breaking, additive, and visual changes.
 *
 * @param {object} oldContract
 * @param {object} newContract
 * @returns {{ compatible: boolean, breaking: object[], additive: object[], visual: object[], summary: object }}
 */
export function diffContracts(oldContract, newContract) {
  const breaking = [];
  const additive = [];
  const visual = [];

  if (!oldContract || !newContract) {
    throw Object.assign(new Error('diffContracts requires two contract objects to compare'), {
      code: 'INVALID_ARGUMENT'
    });
  }

  // 1. Compare Components
  const oldComps = new Map((oldContract.components || []).map(c => [c.stableId, c]));
  const newComps = new Map((newContract.components || []).map(c => [c.stableId, c]));

  for (const [id] of oldComps) {
    if (!newComps.has(id)) {
      breaking.push({
        type: 'COMPONENT_REMOVED',
        target: id,
        message: `Component "${id}" was removed`
      });
    }
  }

  for (const [id] of newComps) {
    if (!oldComps.has(id)) {
      additive.push({
        type: 'COMPONENT_ADDED',
        target: id,
        message: `Component "${id}" was added`
      });
    }
  }

  for (const [id, oldComp] of oldComps) {
    const newComp = newComps.get(id);
    if (!newComp) continue;

    if (oldComp.backend && newComp.backend && oldComp.backend !== newComp.backend) {
      breaking.push({
        type: 'BACKEND_CHANGED',
        component: id,
        oldValue: oldComp.backend,
        newValue: newComp.backend,
        message: `Component "${id}" behavior backend changed from "${oldComp.backend}" to "${newComp.backend}"`
      });
    }

    const oldProps = normalizeProps(oldComp.props);
    const newProps = normalizeProps(newComp.props);

    for (const [propName, oldProp] of oldProps) {
      if (!newProps.has(propName)) {
        breaking.push({
          type: 'PROP_REMOVED',
          component: id,
          target: propName,
          message: `Prop "${propName}" removed from component "${id}"`
        });
      } else {
        const newProp = newProps.get(propName);
        if (!oldProp.required && newProp.required) {
          breaking.push({
            type: 'PROP_REQUIRED_ADDED',
            component: id,
            target: propName,
            message: `Optional prop "${propName}" on component "${id}" was changed to required`
          });
        }
        if (oldProp.type && newProp.type && oldProp.type !== newProp.type) {
          breaking.push({
            type: 'PROP_TYPE_CHANGED',
            component: id,
            target: propName,
            oldValue: oldProp.type,
            newValue: newProp.type,
            message: `Prop "${propName}" type changed from "${oldProp.type}" to "${newProp.type}"`
          });
        }
      }
    }

    for (const [propName, newProp] of newProps) {
      if (!oldProps.has(propName)) {
        if (newProp.required) {
          breaking.push({
            type: 'PROP_REQUIRED_ADDED',
            component: id,
            target: propName,
            message: `New required prop "${propName}" added to component "${id}"`
          });
        } else {
          additive.push({
            type: 'PROP_ADDED',
            component: id,
            target: propName,
            message: `Optional prop "${propName}" added to component "${id}"`
          });
        }
      }
    }

    const oldEvents = normalizeEvents(oldComp.events);
    const newEvents = normalizeEvents(newComp.events);

    for (const [eventName, oldEv] of oldEvents) {
      if (!newEvents.has(eventName)) {
        breaking.push({
          type: 'EVENT_REMOVED',
          component: id,
          target: eventName,
          message: `Event "${eventName}" removed from component "${id}"`
        });
      } else {
        const newEv = newEvents.get(eventName);
        if (oldEv.payload && newEv.payload && oldEv.payload !== newEv.payload) {
          breaking.push({
            type: 'EVENT_PAYLOAD_CHANGED',
            component: id,
            target: eventName,
            oldValue: oldEv.payload,
            newValue: newEv.payload,
            message: `Event "${eventName}" payload changed from "${oldEv.payload}" to "${newEv.payload}"`
          });
        }
      }
    }

    for (const [eventName] of newEvents) {
      if (!oldEvents.has(eventName)) {
        additive.push({
          type: 'EVENT_ADDED',
          component: id,
          target: eventName,
          message: `Event "${eventName}" added to component "${id}"`
        });
      }
    }

    const oldStates = oldComp.states || {};
    const newStates = newComp.states || {};

    for (const stateName of STATES) {
      const oldSt = oldStates[stateName];
      const newSt = newStates[stateName];

      if (oldSt?.applicable && !newSt?.applicable) {
        breaking.push({
          type: 'STATE_REMOVED',
          component: id,
          target: stateName,
          message: `State "${stateName}" on component "${id}" changed from applicable to non-applicable`
        });
      } else if (!oldSt?.applicable && newSt?.applicable) {
        additive.push({
          type: 'STATE_ADDED',
          component: id,
          target: stateName,
          message: `State "${stateName}" on component "${id}" changed from non-applicable to applicable`
        });
      } else if (oldSt?.applicable && newSt?.applicable) {
        if (JSON.stringify(oldSt.value) !== JSON.stringify(newSt.value)) {
          visual.push({
            type: 'STATE_STYLE_CHANGED',
            component: id,
            target: stateName,
            message: `Visual styles for state "${stateName}" on component "${id}" changed`
          });
        }
      }
    }
  }

  // 2. Compare Tokens (primitive, semantic, component)
  for (const tier of ['primitive', 'semantic', 'component']) {
    const oldTier = oldContract.tokens?.[tier] || {};
    const newTier = newContract.tokens?.[tier] || {};

    const oldKeys = Object.keys(oldTier);
    const newKeys = Object.keys(newTier);

    for (const k of oldKeys) {
      if (!(k in newTier)) {
        breaking.push({
          type: 'TOKEN_REMOVED',
          target: `${tier}.${k}`,
          message: `Token "${tier}.${k}" was removed`
        });
      } else {
        const oldVal = typeof oldTier[k] === 'object' && oldTier[k] !== null ? oldTier[k].value : oldTier[k];
        const newVal = typeof newTier[k] === 'object' && newTier[k] !== null ? newTier[k].value : newTier[k];
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
          visual.push({
            type: 'TOKEN_VALUE_CHANGED',
            target: `${tier}.${k}`,
            oldValue: oldVal,
            newValue: newVal,
            message: `Token "${tier}.${k}" value changed`
          });
        }
      }
    }

    for (const k of newKeys) {
      if (!(k in oldTier)) {
        additive.push({
          type: 'TOKEN_ADDED',
          target: `${tier}.${k}`,
          message: `Token "${tier}.${k}" was added`
        });
      }
    }
  }

  // 3. Compare Assets
  const oldAssets = new Map((oldContract.assets || []).map(a => [a.id, a]));
  const newAssets = new Map((newContract.assets || []).map(a => [a.id, a]));

  for (const [id] of oldAssets) {
    if (!newAssets.has(id)) {
      breaking.push({
        type: 'ASSET_REMOVED',
        target: id,
        message: `Asset "${id}" was removed`
      });
    }
  }

  for (const [id] of newAssets) {
    if (!oldAssets.has(id)) {
      additive.push({
        type: 'ASSET_ADDED',
        target: id,
        message: `Asset "${id}" was added`
      });
    }
  }

  // 4. Compare Themes (Visual)
  if (JSON.stringify(oldContract.themes ?? null) !== JSON.stringify(newContract.themes ?? null)) {
    visual.push({
      type: 'THEME_MODIFIED',
      message: 'Theme tokens or definitions modified'
    });
  }

  // 5. Compare Responsive Breakpoints (Visual)
  if (JSON.stringify(oldContract.responsive ?? null) !== JSON.stringify(newContract.responsive ?? null)) {
    visual.push({
      type: 'RESPONSIVE_MODIFIED',
      message: 'Responsive breakpoints or rules modified'
    });
  }

  // 6. Compare Reduced Motion (Visual)
  if (JSON.stringify(oldContract.reducedMotion ?? null) !== JSON.stringify(newContract.reducedMotion ?? null)) {
    visual.push({
      type: 'MOTION_MODIFIED',
      message: 'Reduced motion preferences or fallbacks modified'
    });
  }

  return {
    compatible: breaking.length === 0,
    breaking,
    additive,
    visual,
    summary: {
      isBreaking: breaking.length > 0,
      breakingCount: breaking.length,
      additiveCount: additive.length,
      visualCount: visual.length,
      totalChanges: breaking.length + additive.length + visual.length
    }
  };
}
