import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  STATES,
  extractContract,
  validateContract,
  diffContracts
} from '../scripts/contract.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// All test scratch operations are restricted strictly under plugin/tests/
const scratchBase = path.resolve(__dirname, 'scratch');

async function sandbox(fn) {
  const dir = path.join(scratchBase, `run-${randomUUID()}`);
  await fs.mkdir(dir, { recursive: true });
  try {
    return await fn(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

after(async () => {
  try {
    await fs.rm(scratchBase, { recursive: true, force: true });
  } catch {}
});

function makeSampleReceipt(overrides = {}) {
  return {
    runId: 'c0a80101-0000-4000-8000-000000000001',
    workspace: 'C:/dev/fixtures/run-001',
    files: [
      {
        path: 'index.html',
        sha256: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
        bytes: 1420,
        kind: 'html',
        evidence: { selector: 'body' }
      },
      {
        path: 'styles.css',
        sha256: 'b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90a1',
        bytes: 840,
        kind: 'css',
        evidence: { rulesCount: 12 }
      },
      {
        path: 'assets/icon-check.svg',
        sha256: 'c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2',
        bytes: 312,
        kind: 'svg',
        evidence: { viewBox: '0 0 24 24' }
      }
    ],
    ...overrides
  };
}

function makeHumanCompletedComponent(stableId = 'user-profile-card') {
  return {
    stableId,
    anatomy: {
      root: 'card',
      slots: {
        avatar: 'card-avatar',
        info: 'card-info',
        actions: 'card-actions'
      },
      parts: ['card', 'avatar', 'info', 'actions']
    },
    props: [
      { name: 'username', type: 'string', required: true, description: 'Display username' },
      { name: 'role', type: 'string', required: false, default: 'Member', description: 'User role label' }
    ],
    events: [
      { name: 'onSelect', type: 'function', payload: 'ProfileSelectEvent', description: 'Card selection handler' }
    ],
    backend: 'native',
    states: {
      default: { applicable: true, value: { display: 'flex', opacity: 1 } },
      hover: { applicable: true, value: { opacity: 0.95 } },
      focus: { applicable: true, value: { outline: '2px solid #2563eb', outlineOffset: '2px' } },
      active: { applicable: true, value: { transform: 'scale(0.99)' } },
      disabled: { applicable: true, value: { opacity: 0.5, pointerEvents: 'none' } },
      loading: { applicable: false, reason: 'Stateless card component does not feature an async loading state' },
      error: { applicable: false, reason: 'Card does not validate inputs or display form validation errors' },
      selected: { applicable: false, reason: 'Card presentation does not specify selected behavior' }
    },
    keyboard: {
      rules: [
        { key: 'Enter', action: 'activate', description: 'Triggers onSelect callback' },
        { key: 'Space', action: 'activate', description: 'Triggers onSelect callback' }
      ],
      focusManagement: 'native'
    },
    accessibility: {
      role: 'region',
      ariaAttributes: { 'aria-label': 'User Profile' },
      labelStrategy: 'visible-text'
    }
  };
}

// ---------------------------------------------------------------------------
// 1. Module Exports & Constants
// ---------------------------------------------------------------------------

test('STATES array exports exactly 8 canonical states in immutable frozen form', () => {
  assert.equal(Array.isArray(STATES), true);
  assert.equal(STATES.length, 8);
  assert.deepEqual([...STATES], [
    'default',
    'hover',
    'focus',
    'active',
    'disabled',
    'loading',
    'error',
    'selected'
  ]);
  assert.equal(Object.isFrozen(STATES), true);
});

test('module exports extractContract, validateContract, and diffContracts functions', () => {
  assert.equal(typeof extractContract, 'function');
  assert.equal(typeof validateContract, 'function');
  assert.equal(typeof diffContracts, 'function');
});

// ---------------------------------------------------------------------------
// 2. Draft Contract Extraction (Honest, Explicit Nulls, Collision-Free Asset IDs)
// ---------------------------------------------------------------------------

test('extractContract is repeatable for the same receipt and does not invent time', async () => {
  const receipt = makeSampleReceipt();
  const first = await extractContract(receipt);
  const second = await extractContract(receipt);
  assert.deepEqual(first, second);
  assert.equal(first.metadata.createdAt, null);
  receipt.createdAt = '2026-01-01T00:00:00.000Z';
  assert.equal((await extractContract(receipt)).metadata.createdAt, receipt.createdAt);
});

test('extractContract creates DRAFT contract with explicit nulls and no invented facts', async () => {
  const receipt = makeSampleReceipt();
  const draft = await extractContract(receipt);

  assert.equal(draft.schemaVersion, 1);
  assert.equal(draft.metadata.schemaVersion, 1);
  assert.equal(draft.metadata.runId, receipt.runId);
  assert.equal(draft.metadata.reviewStatus, 'draft');
  assert.equal(draft.metadata.confidence, 'observed');
  assert.equal(draft.metadata.approvedBy, null);
  assert.equal(draft.metadata.approvedAt, null);

  // Assert NO invented viewport (explicit null)
  assert.equal(draft.metadata.sourceViewport, null);

  // Assert NO invented tokens in tiers (empty objects)
  assert.deepEqual(draft.tokens.primitive, {});
  assert.deepEqual(draft.tokens.semantic, {});
  assert.deepEqual(draft.tokens.component, {});

  // Assert NO fake placeholder components (empty array)
  assert.deepEqual(draft.components, []);

  // Assert explicit null for unmapped design domains (NOT false defaults)
  assert.equal(draft.themes, null);
  assert.equal(draft.rtl, null);
  assert.equal(draft.reducedMotion, null);
  assert.equal(draft.responsive, null);

  // Evidence links all receipt files accurately
  for (const file of receipt.files) {
    const evidenceEntry = draft.evidence[file.path];
    assert.ok(evidenceEntry, `Evidence missing for ${file.path}`);
    assert.equal(evidenceEntry.path, file.path);
    assert.equal(evidenceEntry.sha256, file.sha256);
    assert.equal(evidenceEntry.confidence, 'observed');
  }

  // Assets have null dimensions (not {width:0, height:0}) and null license
  const svgAsset = draft.assets.find(a => a.path === 'assets/icon-check.svg');
  assert.ok(svgAsset);
  assert.equal(svgAsset.license, null);
  assert.equal(svgAsset.dimensions, null);
  assert.equal(svgAsset.kind, 'svg');

  // Honest required unknowns cover component, token, state, theme, rtl, motion, responsive, and governance
  assert.ok(draft.unknowns.length >= 8);
  assert.ok(draft.unknowns.every(u => u.required === true && u.resolved === false && u.resolution === null));
  assert.ok(draft.unknowns.some(u => u.id === 'unk-components-unmapped'));
  assert.ok(draft.unknowns.some(u => u.id === 'unk-tokens-unmapped'));
  assert.ok(draft.unknowns.some(u => u.id === 'unk-state-matrix-unreviewed'));
  assert.ok(draft.unknowns.some(u => u.id === 'unk-theme-mapping'));
  assert.ok(draft.unknowns.some(u => u.id === 'unk-rtl-support'));
  assert.ok(draft.unknowns.some(u => u.id === 'unk-reduced-motion-handling'));
  assert.ok(draft.unknowns.some(u => u.id === 'unk-responsive-behavior'));
  assert.ok(draft.unknowns.some(u => u.id === 'unk-governance-approval'));
});

test('extractContract avoids asset ID basename collisions for identical basenames in different directories', async () => {
  const receipt = makeSampleReceipt({
    files: [
      { path: 'a/icon.svg', sha256: '1111111111111111111111111111111111111111111111111111111111111111', bytes: 100, kind: 'svg' },
      { path: 'b/icon.svg', sha256: '2222222222222222222222222222222222222222222222222222222222222222', bytes: 100, kind: 'svg' }
    ]
  });

  const draft = await extractContract(receipt);
  assert.equal(draft.assets.length, 2);
  assert.notEqual(draft.assets[0].id, draft.assets[1].id, 'Asset IDs must be unique and collision-free');
  assert.equal(new Set(draft.assets.map(a => a.id)).size, 2);
});

test('extractContract uses exclusive wx write and fails on existing output', () =>
  sandbox(async root => {
    const receipt = makeSampleReceipt({ workspace: root });
    const outFile = path.join(root, 'contracts', 'draft-contract.json');

    const draft = await extractContract(receipt, outFile);
    const content = JSON.parse(await fs.readFile(outFile, 'utf8'));
    assert.equal(content.metadata.runId, receipt.runId);
    assert.deepEqual(content, draft);

    // Second write to the exact same path fails with EEXIST (exclusive write, no arbitrary overwrite)
    await assert.rejects(() => extractContract(receipt, outFile), error => {
      assert.equal(error.code, 'EEXIST');
      return true;
    });
  }));

test('extractContract throws when receipt is missing or malformed', async () => {
  await assert.rejects(() => extractContract(null), { code: 'INVALID_RECEIPT' });
  await assert.rejects(() => extractContract({}), { code: 'INVALID_RECEIPT' });
  await assert.rejects(() => extractContract({ runId: 'abc' }), { code: 'INVALID_RECEIPT' });
});

// ---------------------------------------------------------------------------
// 3. Structural Validity vs Readiness
// ---------------------------------------------------------------------------

test('Draft contract passes structural validation but is NOT ready', async () => {
  const receipt = makeSampleReceipt();
  const draft = await extractContract(receipt);

  const result = validateContract(draft, { receipt });

  assert.equal(result.structuralValid, true, 'Draft contract must pass structural schema validation');
  assert.equal(result.ready, false, 'Draft contract must NOT be ready');
  assert.equal(result.errors.length, 0);
  assert.ok(result.unknowns.length > 0);
});

test('Approved readiness requires complete reviewed component, non-null rtl/motion/responsive, and non-empty resolutions', async () => {
  const receipt = makeSampleReceipt();
  const contract = await extractContract(receipt);

  // Set reviewStatus to approved without required fields
  contract.metadata.reviewStatus = 'approved';
  const res1 = validateContract(contract, { receipt });
  assert.equal(res1.ready, false);
  assert.ok(res1.errors.some(e => e.includes('approvedBy')));
  assert.ok(res1.errors.some(e => e.includes('approvedAt')));
  assert.ok(res1.errors.some(e => e.includes('at least one complete reviewed component')));
  assert.ok(res1.errors.some(e => e.includes('reviewed themes')));
  assert.ok(res1.errors.some(e => e.includes('reviewed rtl')));
  assert.ok(res1.errors.some(e => e.includes('reviewed reducedMotion')));
  assert.ok(res1.errors.some(e => e.includes('reviewed responsive')));

  // Supply reviewer metadata, reviewed component, and reviewed specifications
  contract.metadata.approvedBy = 'Jane Doe <jane@example.com>';
  contract.metadata.approvedAt = new Date().toISOString();
  contract.components.push(makeHumanCompletedComponent('user-card'));
  contract.themes = { light: { surface: '#fff' }, dark: { surface: '#111' } };
  contract.rtl = { supported: true, direction: 'ltr', logicalProperties: true };
  contract.reducedMotion = { supported: true, fallback: 'fade', behavior: 'reduce' };
  contract.responsive = { breakpoints: { sm: 640, md: 768, lg: 1024 }, containerQueries: false };

  // If unknown is marked resolved=true but resolution is empty string, readiness must fail
  contract.unknowns.forEach(u => {
    u.resolved = true;
    u.resolution = ''; // Empty resolution is a fake resolution
  });
  const res2 = validateContract(contract, { receipt });
  assert.equal(res2.ready, false);
  assert.ok(res2.errors.some(e => e.includes('lacks a non-empty resolution string')));

  // Supply non-empty resolution strings for all resolved required unknowns
  contract.unknowns.forEach(u => {
    u.resolved = true;
    u.resolution = 'Verified and approved by UI architect during review gate';
  });

  const res3 = validateContract(contract, { receipt });
  assert.equal(res3.structuralValid, true);
  assert.equal(res3.ready, true);
  assert.equal(res3.errors.length, 0);
});

// ---------------------------------------------------------------------------
// 4. Invariant: Metadata sourceHashes Security & Integrity
// ---------------------------------------------------------------------------

test('metadata.sourceHashes rejects unsafe paths, duplicates, and Windows casefold collisions', async () => {
  const receipt = makeSampleReceipt();
  const contract = await extractContract(receipt);

  // 1. Unsafe path in sourceHashes
  const invalid1 = JSON.parse(JSON.stringify(contract));
  invalid1.metadata.sourceHashes.push({
    path: '../escaped.js',
    sha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
  });
  const res1 = validateContract(invalid1);
  assert.equal(res1.structuralValid, false);
  assert.ok(res1.errors.some(e => e.includes('Source hash has unsafe path')));

  // 2. Duplicate source hash path
  const invalid2 = JSON.parse(JSON.stringify(contract));
  invalid2.metadata.sourceHashes.push({
    path: 'index.html',
    sha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
  });
  const res2 = validateContract(invalid2);
  assert.equal(res2.structuralValid, false);
  assert.ok(res2.errors.some(e => e.includes('Duplicate source hash path')));

  // 3. Windows casefold collision in sourceHashes
  const invalid3 = JSON.parse(JSON.stringify(contract));
  invalid3.metadata.sourceHashes.push({
    path: 'INDEX.HTML',
    sha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
  });
  const res3 = validateContract(invalid3);
  assert.equal(res3.structuralValid, false);
  assert.ok(res3.errors.some(e => e.includes('Casefold collision in source hash paths')));
});

test('Receipt verification enforces bidirectional parity (no missing AND no extra files)', async () => {
  const receipt = makeSampleReceipt();
  const contract = await extractContract(receipt);

  contract.metadata.reviewStatus = 'approved';
  contract.metadata.approvedBy = 'Lead Reviewer';
  contract.metadata.approvedAt = new Date().toISOString();
  contract.components.push(makeHumanCompletedComponent());
  contract.rtl = { supported: false };
  contract.reducedMotion = { supported: false };
  contract.responsive = { breakpoints: { sm: '640px' } };
  contract.unknowns.forEach(u => {
    u.resolved = true;
    u.resolution = 'Approved';
  });

  // Extra file in contract not in receipt
  const contractWithExtra = JSON.parse(JSON.stringify(contract));
  contractWithExtra.metadata.sourceHashes.push({
    path: 'extra-rogue.js',
    sha256: '1234567890123456789012345678901234567890123456789012345678901234'
  });
  const resExtra = validateContract(contractWithExtra, { receipt });
  assert.equal(resExtra.ready, false);
  assert.ok(resExtra.errors.some(e => e.includes('extra file not in receipt')));

  // Missing file in contract that exists in receipt
  const contractWithMissing = JSON.parse(JSON.stringify(contract));
  contractWithMissing.metadata.sourceHashes.pop();
  const resMissing = validateContract(contractWithMissing, { receipt });
  assert.equal(resMissing.ready, false);
  assert.ok(resMissing.errors.some(e => e.includes('missing in contract metadata sourceHashes')));

  // Malformed receipt rejects readiness
  const resMalformed = validateContract(contract, { receipt: { invalid: true } });
  assert.equal(resMalformed.ready, false);
  assert.ok(resMalformed.errors.some(e => e.includes('Malformed receipt')));
});

// ---------------------------------------------------------------------------
// 5. Invariant: Component Canonical States & N/A Reason
// ---------------------------------------------------------------------------

test('Component missing any of the 8 canonical states fails validation', async () => {
  const receipt = makeSampleReceipt();
  const contract = await extractContract(receipt);
  contract.components.push(makeHumanCompletedComponent('demo-button'));

  for (const st of STATES) {
    const invalid = structuredClone(contract);
    delete invalid.components[0].states[st];

    const result = validateContract(invalid);
    assert.equal(result.structuralValid, false);
    assert.equal(result.ready, false);
    assert.ok(
      result.errors.some(e => e.includes(st)),
      `Error should mention missing state "${st}"`
    );
  }
});

test('selected is required; success is an optional extra when explicitly specified', async () => {
  const contract = await extractContract(makeSampleReceipt());
  contract.components.push(makeHumanCompletedComponent());
  assert.equal(validateContract(contract).structuralValid, true);

  contract.components[0].states.success = { applicable: false, reason: 'No completion feedback' };
  assert.equal(validateContract(contract).structuralValid, true);

  delete contract.components[0].states.selected;
  const missingSelected = validateContract(contract);
  assert.equal(missingSelected.structuralValid, false);
  assert.ok(missingSelected.errors.some(error => error.includes('selected')));
});

test('Non-applicable state without non-empty reason fails validation', async () => {
  const receipt = makeSampleReceipt();
  const contract = await extractContract(receipt);
  contract.components.push(makeHumanCompletedComponent('demo-card'));

  const invalid1 = JSON.parse(JSON.stringify(contract));
  invalid1.components[0].states.loading = { applicable: false };
  assert.equal(validateContract(invalid1).structuralValid, false);

  const invalid2 = JSON.parse(JSON.stringify(contract));
  invalid2.components[0].states.loading = { applicable: false, reason: '   ' };
  assert.equal(validateContract(invalid2).structuralValid, false);
});

test('Applicable state without value fails validation', async () => {
  const receipt = makeSampleReceipt();
  const contract = await extractContract(receipt);
  contract.components.push(makeHumanCompletedComponent('demo-widget'));

  const invalid = JSON.parse(JSON.stringify(contract));
  invalid.components[0].states.active = { applicable: true };

  assert.equal(validateContract(invalid).structuralValid, false);
});

// ---------------------------------------------------------------------------
// 6. Invariant: Duplicate IDs
// ---------------------------------------------------------------------------

test('Duplicate component stableId fails validation', async () => {
  const receipt = makeSampleReceipt();
  const contract = await extractContract(receipt);
  contract.components.push(makeHumanCompletedComponent('reused-id'));
  contract.components.push(makeHumanCompletedComponent('reused-id'));

  const result = validateContract(contract);
  assert.equal(result.structuralValid, false);
  assert.ok(result.errors.some(e => e.includes('Duplicate component stableId')));
});

test('Duplicate asset id fails validation', async () => {
  const receipt = makeSampleReceipt();
  const contract = await extractContract(receipt);

  contract.assets = [
    { id: 'logo-asset', path: 'assets/logo-a.svg', license: null },
    { id: 'logo-asset', path: 'assets/logo-b.svg', license: null }
  ];

  const result = validateContract(contract);
  assert.equal(result.structuralValid, false);
  assert.ok(result.errors.some(e => e.includes('Duplicate asset id')));
});

test('Duplicate unknown id fails validation', async () => {
  const receipt = makeSampleReceipt();
  const contract = await extractContract(receipt);

  contract.unknowns.push({
    id: 'dup-unk',
    description: 'Unknown A',
    required: false,
    resolved: false
  });
  contract.unknowns.push({
    id: 'dup-unk',
    description: 'Unknown B',
    required: false,
    resolved: false
  });

  const result = validateContract(contract);
  assert.equal(result.structuralValid, false);
  assert.ok(result.errors.some(e => e.includes('Duplicate unknown id')));
});

// ---------------------------------------------------------------------------
// 7. Invariant: Asset Path Security (Aliases, Reserved, ADS, Trailing Dot-Space)
// ---------------------------------------------------------------------------

test('Asset paths reject traversal, Windows reserved names, ADS, trailing dot-space, and absolute paths', async () => {
  const receipt = makeSampleReceipt();
  const contract = await extractContract(receipt);

  const unsafeAssetPaths = [
    '../escape.svg',
    'icons/../../secret.svg',
    'CON.svg',
    'PRN.png',
    'AUX.ico',
    'NUL.svg',
    'COM1.svg',
    'icons/LPT2.png',
    'stream:hidden.svg',
    'bad.svg.',
    'bad.svg ',
    'nested/a./file.svg',
    'nested/a /file.svg',
    '/etc/shadow.svg',
    '\\windows\\win.ini',
    'C:/absolute/path.svg',
    '//unc/share/file.svg'
  ];

  for (const badPath of unsafeAssetPaths) {
    const invalid = JSON.parse(JSON.stringify(contract));
    invalid.assets = [{ id: 'test-asset', path: badPath, license: null }];

    const result = validateContract(invalid);
    assert.equal(result.structuralValid, false, `Expected failure for unsafe path: "${badPath}"`);
    assert.ok(result.errors.some(e => e.includes('unsafe path')));
  }
});

test('Asset paths allow safe relative paths and null license', async () => {
  const receipt = makeSampleReceipt();
  const contract = await extractContract(receipt);

  contract.assets = [
    { id: 'icon-arrow', path: 'icons/arrow.svg', license: null },
    { id: 'logo-brand', path: 'brand/logo.png', license: 'MIT' }
  ];

  const result = validateContract(contract);
  assert.equal(result.structuralValid, true);
});

// ---------------------------------------------------------------------------
// 8. Invariant: Token Alias Cycles and Unresolved References
// ---------------------------------------------------------------------------

test('Token direct alias cycle A -> B -> A is detected and rejected', async () => {
  const receipt = makeSampleReceipt();
  const contract = await extractContract(receipt);

  contract.tokens.primitive['cycle-a'] = {
    value: '{primitive.cycle-b}',
    ref: 'primitive.cycle-b'
  };
  contract.tokens.primitive['cycle-b'] = {
    value: '{primitive.cycle-a}',
    ref: 'primitive.cycle-a'
  };

  const result = validateContract(contract);
  assert.equal(result.structuralValid, false);
  assert.ok(result.errors.some(e => e.includes('Circular token reference detected')));
});

test('Token multi-tier cycle primitive -> semantic -> component -> primitive is detected', async () => {
  const receipt = makeSampleReceipt();
  const contract = await extractContract(receipt);

  contract.tokens.primitive['color-base'] = {
    value: '{component.btn-bg}',
    ref: 'component.btn-bg'
  };
  contract.tokens.semantic['color-action'] = {
    value: '{primitive.color-base}',
    ref: 'primitive.color-base'
  };
  contract.tokens.component['btn-bg'] = {
    value: '{semantic.color-action}',
    ref: 'semantic.color-action'
  };

  const result = validateContract(contract);
  assert.equal(result.structuralValid, false);
  assert.ok(result.errors.some(e => e.includes('Circular token reference detected')));
});

test('Unresolved token reference is detected and rejected', async () => {
  const receipt = makeSampleReceipt();
  const contract = await extractContract(receipt);

  contract.tokens.semantic['dangling-token'] = {
    value: '{primitive.non-existent-token}',
    ref: 'primitive.non-existent-token'
  };

  const result = validateContract(contract);
  assert.equal(result.structuralValid, false);
  assert.ok(result.errors.some(e => e.includes('Unresolved token reference')));
});

// ---------------------------------------------------------------------------
// 9. diffContracts: Breaking, Additive, and Visual Classification
// ---------------------------------------------------------------------------

test('diffContracts classifies prop, event, token, and component removals as BREAKING', async () => {
  const receipt = makeSampleReceipt();
  const oldContract = await extractContract(receipt);
  oldContract.components.push(makeHumanCompletedComponent('card-comp'));
  oldContract.tokens.primitive['brand-blue'] = { value: '#2563eb', type: 'color' };

  const newContract = JSON.parse(JSON.stringify(oldContract));

  newContract.components[0].props = [];
  newContract.components[0].events = [];
  delete newContract.tokens.primitive['brand-blue'];
  newContract.components[0].states.hover = {
    applicable: false,
    reason: 'Hover state removed in redesign'
  };

  const diff = diffContracts(oldContract, newContract);

  assert.equal(diff.compatible, false);
  assert.equal(diff.summary.isBreaking, true);
  assert.ok(diff.breaking.length >= 4);

  assert.ok(diff.breaking.some(b => b.type === 'PROP_REMOVED'));
  assert.ok(diff.breaking.some(b => b.type === 'EVENT_REMOVED'));
  assert.ok(diff.breaking.some(b => b.type === 'TOKEN_REMOVED'));
  assert.ok(diff.breaking.some(b => b.type === 'STATE_REMOVED'));
});

test('diffContracts classifies optional prop/event/token additions as ADDITIVE', async () => {
  const receipt = makeSampleReceipt();
  const oldContract = await extractContract(receipt);
  oldContract.components.push(makeHumanCompletedComponent('card-comp'));

  const newContract = JSON.parse(JSON.stringify(oldContract));

  newContract.components[0].props.push({
    name: 'ariaLabel',
    type: 'string',
    required: false
  });
  newContract.components[0].events.push({
    name: 'onDismiss',
    type: 'function'
  });
  newContract.tokens.primitive['color-brand-emerald'] = {
    value: '#10b981',
    type: 'color'
  };
  newContract.components.push(makeHumanCompletedComponent('badge-comp'));

  const diff = diffContracts(oldContract, newContract);

  assert.equal(diff.compatible, true);
  assert.equal(diff.summary.isBreaking, false);
  assert.ok(diff.additive.length >= 4);

  assert.ok(diff.additive.some(a => a.type === 'PROP_ADDED'));
  assert.ok(diff.additive.some(a => a.type === 'EVENT_ADDED'));
  assert.ok(diff.additive.some(a => a.type === 'TOKEN_ADDED'));
  assert.ok(diff.additive.some(a => a.type === 'COMPONENT_ADDED'));
});

test('diffContracts classifies token value and visual style changes as VISUAL', async () => {
  const receipt = makeSampleReceipt();
  const oldContract = await extractContract(receipt);
  oldContract.components.push(makeHumanCompletedComponent('card-comp'));
  oldContract.tokens.primitive['color-primary'] = { value: '#2563eb', type: 'color' };
  oldContract.themes = { light: { surface: '#ffffff' } };
  oldContract.responsive = { breakpoints: { sm: '640px' } };

  const newContract = JSON.parse(JSON.stringify(oldContract));

  newContract.tokens.primitive['color-primary'].value = '#1d4ed8';
  newContract.components[0].states.hover.value.opacity = 0.85;
  newContract.themes.light.surface = '#f8fafc';
  newContract.responsive.breakpoints.sm = '600px';

  const diff = diffContracts(oldContract, newContract);

  assert.equal(diff.compatible, true);
  assert.equal(diff.summary.isBreaking, false);
  assert.ok(diff.visual.length >= 4);

  assert.ok(diff.visual.some(v => v.type === 'TOKEN_VALUE_CHANGED'));
  assert.ok(diff.visual.some(v => v.type === 'STATE_STYLE_CHANGED'));
  assert.ok(diff.visual.some(v => v.type === 'THEME_MODIFIED'));
  assert.ok(diff.visual.some(v => v.type === 'RESPONSIVE_MODIFIED'));
});

test('diffContracts reports identical contracts as compatible with zero changes', async () => {
  const receipt = makeSampleReceipt();
  const contract = await extractContract(receipt);
  contract.components.push(makeHumanCompletedComponent('widget'));

  const diff = diffContracts(contract, contract);

  assert.equal(diff.compatible, true);
  assert.equal(diff.summary.isBreaking, false);
  assert.equal(diff.summary.totalChanges, 0);
  assert.equal(diff.breaking.length, 0);
  assert.equal(diff.additive.length, 0);
  assert.equal(diff.visual.length, 0);
});
