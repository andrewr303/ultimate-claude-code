import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import zlib from 'node:zlib';
import {
  ingest,
  validateRelativePath,
  safeRelative,
  getFileKind,
  extractEvidence,
  decodeText,
  lexicalSort,
  sha256,
  MAX_ZIP_ENTRIES,
  MAX_SINGLE_FILE_BYTES,
  MAX_COMPRESSION_RATIO
} from '../scripts/ingest.mjs';

const testsDir = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.resolve(testsDir, '..');

async function sandbox(fn) {
  // Scratch directory beside the plugin, cleanup own unique directory only
  const scratchDir = path.join(path.dirname(pluginRoot), `.tmp-scratch-${randomUUID()}`);
  await fs.mkdir(scratchDir, { recursive: true });
  try {
    return await fn(scratchDir);
  } finally {
    await fs.rm(scratchDir, { recursive: true, force: true });
  }
}

function crc32(buf) {
  let crc = ~0;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return ~crc >>> 0;
}

function makeZip(files) {
  const localHeaders = [];
  const centralHeaders = [];
  let offset = 0;

  for (const f of files) {
    const nameBuf = Buffer.from(f.name, 'utf8');
    const dataBuf = Buffer.isBuffer(f.data) ? f.data : Buffer.from(f.data ?? '', 'utf8');
    const isDeflated = f.method !== 0;
    const compressed = isDeflated ? zlib.deflateRawSync(dataBuf) : dataBuf;
    const method = isDeflated ? 8 : 0;
    const fileCrc = crc32(dataBuf);
    const uncompressedSize = f.fakeUncompressedSize !== undefined ? f.fakeUncompressedSize : dataBuf.length;
    const compressedSize = f.fakeCompressedSize !== undefined ? f.fakeCompressedSize : compressed.length;

    // Local file header
    const lh = Buffer.alloc(30 + nameBuf.length + compressed.length);
    lh.writeUInt32LE(0x04034b50, 0); // signature
    lh.writeUInt16LE(20, 4); // version needed
    lh.writeUInt16LE(0, 6); // flags
    lh.writeUInt16LE(method, 8); // compression method
    lh.writeUInt16LE(0, 10); // mod time
    lh.writeUInt16LE(0, 12); // mod date
    lh.writeUInt32LE(fileCrc, 14); // crc-32
    lh.writeUInt32LE(compressedSize, 18); // compressed size
    lh.writeUInt32LE(uncompressedSize, 22); // uncompressed size
    lh.writeUInt16LE(nameBuf.length, 26); // file name length
    lh.writeUInt16LE(0, 28); // extra field length
    nameBuf.copy(lh, 30);
    compressed.copy(lh, 30 + nameBuf.length);

    localHeaders.push(lh);

    // Central directory header
    const ch = Buffer.alloc(46 + nameBuf.length);
    ch.writeUInt32LE(0x02014b50, 0); // signature
    ch.writeUInt16LE(20, 4); // version made by
    ch.writeUInt16LE(20, 6); // version needed
    ch.writeUInt16LE(0, 8); // flags
    ch.writeUInt16LE(method, 10); // compression method
    ch.writeUInt16LE(0, 12); // mod time
    ch.writeUInt16LE(0, 14); // mod date
    ch.writeUInt32LE(fileCrc, 16); // crc-32
    ch.writeUInt32LE(compressedSize, 20); // compressed size
    ch.writeUInt32LE(uncompressedSize, 24); // uncompressed size
    ch.writeUInt16LE(nameBuf.length, 28); // file name length
    ch.writeUInt16LE(0, 30); // extra field length
    ch.writeUInt16LE(0, 32); // comment length
    ch.writeUInt16LE(0, 34); // disk number start
    ch.writeUInt16LE(0, 36); // internal file attributes
    ch.writeUInt32LE(f.attr || 0, 38); // external file attributes
    ch.writeUInt32LE(offset, 42); // relative offset of local header
    nameBuf.copy(ch, 46);

    centralHeaders.push(ch);
    offset += lh.length;
  }

  const centralDir = Buffer.concat(centralHeaders);
  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0); // end of central dir signature
  endRecord.writeUInt16LE(0, 4); // disk number
  endRecord.writeUInt16LE(0, 6); // disk with central dir
  endRecord.writeUInt16LE(files.length, 8); // total entries on disk
  endRecord.writeUInt16LE(files.length, 10); // total entries
  endRecord.writeUInt32LE(centralDir.length, 12); // size of central dir
  endRecord.writeUInt32LE(offset, 16); // offset of start of central dir
  endRecord.writeUInt16LE(0, 20); // comment length

  return Buffer.concat([...localHeaders, centralDir, endRecord]);
}

test('ingest module exports required API functions and constants', () => {
  assert.equal(typeof ingest, 'function');
  assert.equal(typeof validateRelativePath, 'function');
  assert.equal(typeof safeRelative, 'function');
  assert.equal(typeof getFileKind, 'function');
  assert.equal(typeof extractEvidence, 'function');
  assert.equal(typeof decodeText, 'function');
  assert.equal(typeof lexicalSort, 'function');
  assert.equal(typeof sha256, 'function');
  assert.equal(MAX_ZIP_ENTRIES, 500);
  assert.equal(MAX_SINGLE_FILE_BYTES, 52428800);
  assert.equal(MAX_COMPRESSION_RATIO, 50);
});

test('lexicalSort provides deterministic binary code-point ordering', () => {
  const items = ['b', 'a', 'A', '1', 'B', 'a/two', 'A/one'];
  const sorted = [...items].sort(lexicalSort);
  assert.deepEqual(sorted, ['1', 'A', 'A/one', 'B', 'a', 'a/two', 'b']);
});

test('ingest accepts only explicitly supported export formats', () => {
  assert.equal(getFileKind('view.dc.html'),'html');
  assert.equal(getFileKind('Card.tsx'),'component');
  assert.equal(getFileKind('Card.jsx'),'component');
  assert.equal(getFileKind('raw.js'),null);
  assert.equal(getFileKind('raw.ts'),null);
  assert.equal(getFileKind('legacy.htm'),null);
});

test('ingest single HTML file preserves byte-for-byte and creates receipt without self-hash', () => sandbox(async root => {
  const sourceDir = path.join(root, 'source');
  const workspace = path.join(root, 'workspace');
  await fs.mkdir(sourceDir, { recursive: true });
  await fs.mkdir(workspace, { recursive: true });

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <title>Component Showcase</title>
  <style>
    :root { --primary-color: #2563eb; --radius: 8px; }
    @import url('https://fonts.googleapis.com/css2?family=Inter');
  </style>
  <script src="https://cdn.example.com/runtime.js"></script>
</head>
<body>
  <h1>Interactive Profile</h1>
  <form id="profile-form">
    <input type="text" name="username" placeholder="Username" />
    <button type="submit" onclick="handleClick()">Save</button>
  </form>
  <a href="https://example.com/docs">Documentation</a>
</body>
</html>`;

  const inputPath = path.join(sourceDir, 'profile.html');
  await fs.writeFile(inputPath, htmlContent, 'utf8');

  const result = await ingest(inputPath, workspace);

  // Return value shape
  assert.equal(typeof result.runId, 'string');
  assert.equal(result.state, 'INGESTED');
  assert.equal(result.workspace, path.join(workspace, result.runId));
  assert.equal(result.receipt, path.join(result.workspace, 'receipt.json'));
  assert.equal(result.files.length, 1);
  assert.equal(result.sourceArchive, undefined);

  const fileMeta = result.files[0];
  assert.equal(fileMeta.path, 'profile.html');
  assert.equal(fileMeta.bytes, Buffer.byteLength(htmlContent));
  assert.equal(fileMeta.sha256, sha256(Buffer.from(htmlContent, 'utf8')));
  assert.equal(fileMeta.kind, 'html');

  // Evidence extraction
  assert.equal(fileMeta.evidence.title, 'Component Showcase');
  assert.match(fileMeta.evidence.text, /Interactive Profile/);
  assert.ok(fileMeta.evidence.cssVars.includes('--primary-color'));
  assert.ok(fileMeta.evidence.cssVars.includes('--radius'));
  assert.ok(fileMeta.evidence.remotes.includes('https://fonts.googleapis.com/css2?family=Inter'));
  assert.ok(fileMeta.evidence.remotes.includes('https://cdn.example.com/runtime.js'));
  assert.ok(fileMeta.evidence.controls.some(c => c.tag === 'button'));
  assert.ok(fileMeta.evidence.controls.some(c => c.tag === 'input'));
  assert.ok(fileMeta.evidence.scripts.some(s => s.type === 'script_tag'));
  assert.ok(fileMeta.evidence.scripts.some(s => s.type === 'event_handler'));
  assert.equal(fileMeta.evidence.hasActiveContent, true);
  assert.equal(fileMeta.evidence.quarantined, true);

  // Byte-for-byte check on disk
  const storedPath = path.join(result.workspace, 'originals', 'profile.html');
  const storedContent = await fs.readFile(storedPath, 'utf8');
  assert.equal(storedContent, htmlContent);

  // Receipt verification: matches return, no self-hash
  const receiptDisk = JSON.parse(await fs.readFile(result.receipt, 'utf8'));
  assert.deepEqual(receiptDisk, result);
  assert.equal(receiptDisk.files.some(f => f.path.includes('receipt.json')), false);
}));

test('ingest directory with multiple component files', () => sandbox(async root => {
  const sourceDir = path.join(root, 'source');
  const workspace = path.join(root, 'workspace');
  await fs.mkdir(path.join(sourceDir, 'components'), { recursive: true });
  await fs.mkdir(path.join(sourceDir, 'styles'), { recursive: true });
  await fs.mkdir(workspace, { recursive: true });

  await fs.writeFile(path.join(sourceDir, 'index.html'), '<html><head><title>App</title></head><body><button>Click</button></body></html>');
  await fs.writeFile(path.join(sourceDir, 'components', 'Button.tsx'), 'import React from "react"; export function Button() { return <button />; }');
  await fs.writeFile(path.join(sourceDir, 'styles', 'theme.css'), ':root { --accent: #ff0000; }');
  await fs.writeFile(path.join(sourceDir, 'manifest.json'), JSON.stringify({ name: 'test-app', version: '1.0' }));
  await fs.writeFile(path.join(sourceDir, 'icon.svg'), '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40"/></svg>');

  const result = await ingest(sourceDir, workspace);
  assert.equal(result.files.length, 5);

  const paths = result.files.map(f => f.path);
  assert.ok(paths.includes('index.html'));
  assert.ok(paths.includes('components/Button.tsx'));
  assert.ok(paths.includes('styles/theme.css'));
  assert.ok(paths.includes('manifest.json'));
  assert.ok(paths.includes('icon.svg'));

  const tsxMeta = result.files.find(f => f.path === 'components/Button.tsx');
  assert.equal(tsxMeta.kind, 'component');
  assert.equal(tsxMeta.evidence.hasActiveContent, true);
  assert.equal(tsxMeta.evidence.quarantined, true);
  assert.ok(tsxMeta.evidence.imports.includes('react'));
  assert.ok(tsxMeta.evidence.exports.includes('Button'));

  // All SVG originals are quarantined even without active content
  const svgMeta = result.files.find(f => f.path === 'icon.svg');
  assert.equal(svgMeta.kind, 'svg');
  assert.equal(svgMeta.evidence.viewBox, '0 0 100 100');
  assert.equal(svgMeta.evidence.hasActiveContent, false);
  assert.equal(svgMeta.evidence.quarantined, true);
}));

test('ingest valid ZIP archive preserves source archive byte-for-byte and extracts originals', () => sandbox(async root => {
  const sourceDir = path.join(root, 'source');
  const workspace = path.join(root, 'workspace');
  await fs.mkdir(sourceDir, { recursive: true });
  await fs.mkdir(workspace, { recursive: true });

  const zipBuffer = makeZip([
    { name: 'card.dc.html', data: '<html><body><section><h1>Card</h1></section></body></html>' },
    { name: 'tokens.json', data: JSON.stringify({ colors: { bg: '#fff' } }) },
    { name: 'vector.svg', data: '<svg width="24" height="24"><path d="M0 0h24v24H0z"/></svg>' }
  ]);

  const zipPath = path.join(sourceDir, 'export.zip');
  await fs.writeFile(zipPath, zipBuffer);

  const result = await ingest(zipPath, workspace);
  assert.equal(result.state, 'INGESTED');
  assert.equal(result.files.length, 3);

  // Source archive preservation in run directory and receipt
  assert.ok(result.sourceArchive);
  assert.equal(result.sourceArchive.path, 'source-archive.zip');
  assert.equal(result.sourceArchive.bytes, zipBuffer.length);
  assert.equal(result.sourceArchive.sha256, sha256(zipBuffer));

  const savedArchive = await fs.readFile(path.join(result.workspace, 'source-archive.zip'));
  assert.equal(Buffer.compare(zipBuffer, savedArchive), 0);

  const card = result.files.find(f => f.path === 'card.dc.html');
  assert.equal(card.kind, 'html');
  assert.equal(await fs.readFile(path.join(result.workspace, 'originals', 'card.dc.html'), 'utf8'), '<html><body><section><h1>Card</h1></section></body></html>');
}));

test('Security: rejects direct ingest workspace under plugin root', () => sandbox(async root => {
  const sourceDir = path.join(root, 'source');
  await fs.mkdir(sourceDir, { recursive: true });
  const testFile = path.join(sourceDir, 'test.html');
  await fs.writeFile(testFile, '<h1>Test</h1>');

  // Direct plugin root
  await assert.rejects(
    ingest(testFile, pluginRoot),
    { code: 'UNSAFE_PATH' }
  );

  // Protected plugin scripts directory
  await assert.rejects(
    ingest(testFile, path.join(pluginRoot, 'scripts')),
    { code: 'UNSAFE_PATH' }
  );
}));

test('Security: rejects unprotected nested plugin descendants without creating them', () => sandbox(async root => {
  const input = path.join(root, 'test.html');
  await fs.writeFile(input, '<h1>Test</h1>');
  const workspace = path.join(pluginRoot, 'tests', `.tmp-never-created-${randomUUID()}`, 'nested');
  await assert.rejects(ingest(input, workspace), { code: 'UNSAFE_PATH' });
  await assert.rejects(fs.stat(path.dirname(workspace)), { code: 'ENOENT' });
}));

test('Security: rejects malformed or truncated ZIP archives', () => sandbox(async root => {
  const sourceDir = path.join(root, 'source');
  const workspace = path.join(root, 'workspace');
  await fs.mkdir(sourceDir, { recursive: true });
  await fs.mkdir(workspace, { recursive: true });

  const corruptZip = path.join(sourceDir, 'corrupt.zip');
  await fs.writeFile(corruptZip, Buffer.from('NOT_A_VALID_ZIP_HEADER_CONTENT'));

  await assert.rejects(
    ingest(corruptZip, workspace),
    { code: 'INVALID_ARCHIVE' }
  );

  // Incomplete run directory should not exist in workspace
  const entries = await fs.readdir(workspace);
  assert.equal(entries.length, 0);
}));

test('Security: rejects path traversal in ZIP entries (Zip-Slip)', () => sandbox(async root => {
  const sourceDir = path.join(root, 'source');
  const workspace = path.join(root, 'workspace');
  await fs.mkdir(sourceDir, { recursive: true });
  await fs.mkdir(workspace, { recursive: true });

  const zipBuffer = makeZip([
    { name: '../escape.html', data: '<h1>Escaped</h1>' }
  ]);
  const zipPath = path.join(sourceDir, 'slip.zip');
  await fs.writeFile(zipPath, zipBuffer);

  await assert.rejects(
    ingest(zipPath, workspace),
    { code: 'UNSAFE_PATH' }
  );
}));

test('Security: rejects absolute paths in ZIP entries', () => sandbox(async root => {
  const sourceDir = path.join(root, 'source');
  const workspace = path.join(root, 'workspace');
  await fs.mkdir(sourceDir, { recursive: true });
  await fs.mkdir(workspace, { recursive: true });

  for (const absName of ['/root.html', 'C:/Windows/System32/evil.html']) {
    const zipBuffer = makeZip([
      { name: absName, data: '<h1>Absolute</h1>' }
    ]);
    const zipPath = path.join(sourceDir, 'abs.zip');
    await fs.writeFile(zipPath, zipBuffer);

    await assert.rejects(
      ingest(zipPath, workspace),
      { code: 'UNSAFE_PATH' }
    );
  }
}));

test('Security: rejects casefold collisions across directory segments (A/one.tsx and a/two.tsx)', () => sandbox(async root => {
  const sourceDir = path.join(root, 'source');
  const workspace = path.join(root, 'workspace');
  await fs.mkdir(sourceDir, { recursive: true });
  await fs.mkdir(workspace, { recursive: true });

  // Collision on single directory segment 'A' vs 'a'
  const zipBuffer = makeZip([
    { name: 'A/one.tsx', data: 'export const One = 1;' },
    { name: 'a/two.tsx', data: 'export const Two = 2;' }
  ]);
  const zipPath = path.join(sourceDir, 'casefold-dir.zip');
  await fs.writeFile(zipPath, zipBuffer);

  await assert.rejects(
    ingest(zipPath, workspace),
    { code: 'CASE_COLLISION' }
  );
}));

test('Security: rejects nested multi-level directory segment casefold collisions', () => sandbox(async root => {
  const sourceDir = path.join(root, 'source');
  const workspace = path.join(root, 'workspace');
  await fs.mkdir(sourceDir, { recursive: true });
  await fs.mkdir(workspace, { recursive: true });

  const zipBuffer = makeZip([
    { name: 'Components/Buttons/One.tsx', data: 'export const One = 1;' },
    { name: 'components/buttons/Two.tsx', data: 'export const Two = 2;' }
  ]);
  const zipPath = path.join(sourceDir, 'casefold-nested.zip');
  await fs.writeFile(zipPath, zipBuffer);

  await assert.rejects(
    ingest(zipPath, workspace),
    { code: 'CASE_COLLISION' }
  );
}));

test('Security: rejects ZIP symlinks', () => sandbox(async root => {
  const sourceDir = path.join(root, 'source');
  const workspace = path.join(root, 'workspace');
  await fs.mkdir(sourceDir, { recursive: true });
  await fs.mkdir(workspace, { recursive: true });

  const symlinkAttr = (((0o120000 | 0o777) << 16) >>> 0);
  const zipBuffer = makeZip([
    { name: 'link.html', data: '/etc/passwd', attr: symlinkAttr }
  ]);
  const zipPath = path.join(sourceDir, 'symlink.zip');
  await fs.writeFile(zipPath, zipBuffer);

  await assert.rejects(
    ingest(zipPath, workspace),
    { code: 'UNSAFE_PATH' }
  );
}));

test('Security: rejects filesystem symlinks and junctions', () => sandbox(async root => {
  const sourceDir = path.join(root, 'source');
  const workspace = path.join(root, 'workspace');
  await fs.mkdir(sourceDir, { recursive: true });
  await fs.mkdir(workspace, { recursive: true });

  const targetFile = path.join(sourceDir, 'target.html');
  await fs.writeFile(targetFile, '<h1>Target</h1>');

  const symlinkPath = path.join(sourceDir, 'symlink.html');
  try {
    await fs.symlink(targetFile, symlinkPath, 'file');
    await assert.rejects(
      ingest(symlinkPath, workspace),
      { code: 'UNSAFE_PATH' }
    );
  } catch (err) {
    if (err.code !== 'EPERM') throw err;
  }
}));

test('Security: rejects Windows Alternate Data Streams (ADS)', () => {
  for (const ads of ['card.html:stream', 'test.html::$DATA', 'sub/dir:name/file.tsx']) {
    assert.throws(() => validateRelativePath(ads), { code: 'UNSAFE_PATH' });
  }
});

test('Security: rejects Windows reserved device names', () => {
  for (const name of ['CON.html', 'con.txt', 'aux.json', 'nul.svg', 'com1.tsx', 'lpt2.css', 'dir/PRN.html']) {
    assert.throws(() => validateRelativePath(name), { code: 'UNSAFE_PATH' });
  }
});

test('Security: rejects trailing dot and space Windows aliases', () => {
  for (const name of ['file.html.', 'file.html ', 'sub./file.html', 'sub /file.html', 'dir. /file.html']) {
    assert.throws(() => validateRelativePath(name), { code: 'UNSAFE_PATH' });
  }
});

test('Security: rejects sensitive and credential paths', () => {
  for (const name of ['.env', 'sub/.env.local', '.git/HEAD', '.ssh/id_rsa', 'credentials.json', 'keys/private.key']) {
    assert.throws(() => validateRelativePath(name), { code: 'UNSAFE_PATH' });
  }
});

test('Security: prohibits source and workspace overlap', () => sandbox(async root => {
  const dirA = path.join(root, 'parent');
  const dirB = path.join(dirA, 'child');
  await fs.mkdir(dirB, { recursive: true });
  await fs.writeFile(path.join(dirA, 'index.html'), '<h1>Overlap</h1>');

  // Input contains workspace
  await assert.rejects(
    ingest(dirA, dirB),
    { code: 'OVERLAP_ERROR' }
  );

  // Workspace contains input
  await assert.rejects(
    ingest(dirB, dirA),
    { code: 'OVERLAP_ERROR' }
  );

  // Identical paths
  await assert.rejects(
    ingest(dirA, dirA),
    { code: 'OVERLAP_ERROR' }
  );
}));

test('Security: rejects UNC paths for input and workspace', () => sandbox(async root => {
  const localDir = path.join(root, 'local');
  await fs.mkdir(localDir, { recursive: true });

  await assert.rejects(
    ingest('\\\\server\\share\\export.html', localDir),
    { code: 'UNSAFE_PATH' }
  );

  await assert.rejects(
    ingest(localDir, '\\\\server\\share\\runs'),
    { code: 'UNSAFE_PATH' }
  );
}));

test('Security: rejects archives exceeding maximum entry count limit', () => sandbox(async root => {
  const sourceDir = path.join(root, 'source');
  const workspace = path.join(root, 'workspace');
  await fs.mkdir(sourceDir, { recursive: true });
  await fs.mkdir(workspace, { recursive: true });

  const entries = [];
  for (let i = 0; i < 501; i++) {
    entries.push({ name: `file_${i}.json`, data: '{}' });
  }
  const zipBuffer = makeZip(entries);
  const zipPath = path.join(sourceDir, 'bomb-count.zip');
  await fs.writeFile(zipPath, zipBuffer);

  await assert.rejects(
    ingest(zipPath, workspace),
    { code: 'ARCHIVE_LIMIT_EXCEEDED' }
  );
}));

test('Security: rejects archives exceeding compression ratio (zip bomb preflight)', () => sandbox(async root => {
  const sourceDir = path.join(root, 'source');
  const workspace = path.join(root, 'workspace');
  await fs.mkdir(sourceDir, { recursive: true });
  await fs.mkdir(workspace, { recursive: true });

  const zipBuffer = makeZip([
    {
      name: 'bomb.html',
      data: Buffer.alloc(100, 65),
      fakeCompressedSize: 1,
      fakeUncompressedSize: 100
    }
  ]);

  const zipPath = path.join(sourceDir, 'ratio-bomb.zip');
  await fs.writeFile(zipPath, zipBuffer);

  await assert.rejects(
    ingest(zipPath, workspace),
    { code: 'ARCHIVE_LIMIT_EXCEEDED' }
  );
}));

test('Security: streamed archive data cannot evade metadata limits', () => sandbox(async root => {
  const sourceDir=path.join(root,'source');
  const workspace=path.join(root,'workspace');
  await fs.mkdir(sourceDir);
  await fs.mkdir(workspace);
  const zip=makeZip([{name:'hidden.html',data:Buffer.alloc(200_000,65),method:8,fakeUncompressedSize:1_000}]);
  const zipPath=path.join(sourceDir,'streamed-bomb.zip');
  await fs.writeFile(zipPath,zip);
  await assert.rejects(ingest(zipPath,workspace), error => ['ARCHIVE_LIMIT_EXCEEDED','INVALID_ARCHIVE'].includes(error.code));
  assert.deepEqual(await fs.readdir(workspace),[]);
}));

test('Security: cleans incomplete run directory on failure', () => sandbox(async root => {
  const sourceDir = path.join(root, 'source');
  const workspace = path.join(root, 'workspace');
  await fs.mkdir(sourceDir, { recursive: true });
  await fs.mkdir(workspace, { recursive: true });

  const zipBuffer = makeZip([
    { name: 'good.html', data: '<h1>Good</h1>' },
    { name: '../escape.html', data: '<h1>Bad</h1>' }
  ]);
  const zipPath = path.join(sourceDir, 'partial.zip');
  await fs.writeFile(zipPath, zipBuffer);

  await assert.rejects(
    ingest(zipPath, workspace),
    { code: 'UNSAFE_PATH' }
  );

  const contents = await fs.readdir(workspace);
  assert.equal(contents.length, 0);
}));

test('Security: HTML injection is never executed and quarantined as static evidence', () => sandbox(async root => {
  const sourceDir = path.join(root, 'source');
  const workspace = path.join(root, 'workspace');
  await fs.mkdir(sourceDir, { recursive: true });
  await fs.mkdir(workspace, { recursive: true });

  const maliciousHtml = `<!DOCTYPE html>
<html>
<head>
  <script>globalThis.__PWNED_CODE_EXEC__ = true; eval("console.log('injected')");</script>
  <link rel="stylesheet" href="https://malicious.example.com/steal.css" />
</head>
<body onload="globalThis.__PWNED_LOAD__ = true">
  <img src="x" onerror="globalThis.__PWNED_ERROR__ = true" />
  <a href="javascript:alert(1)">Click me</a>
</body>
</html>`;

  const inputPath = path.join(sourceDir, 'injection.html');
  await fs.writeFile(inputPath, maliciousHtml, 'utf8');

  const result = await ingest(inputPath, workspace);

  assert.equal(globalThis.__PWNED_CODE_EXEC__, undefined);
  assert.equal(globalThis.__PWNED_LOAD__, undefined);
  assert.equal(globalThis.__PWNED_ERROR__, undefined);

  const fileMeta = result.files[0];
  assert.equal(fileMeta.evidence.hasActiveContent, true);
  assert.equal(fileMeta.evidence.quarantined, true);
  assert.ok(fileMeta.evidence.scripts.some(s => s.type === 'script_tag'));
  assert.ok(fileMeta.evidence.scripts.some(s => s.attribute === 'onload'));
  assert.ok(fileMeta.evidence.scripts.some(s => s.attribute === 'onerror'));
  assert.ok(fileMeta.evidence.scripts.some(s => s.type === 'javascript_uri'));
  assert.ok(fileMeta.evidence.remotes.includes('https://malicious.example.com/steal.css'));

  const originalOnDisk = await fs.readFile(path.join(result.workspace, 'originals', 'injection.html'), 'utf8');
  assert.equal(originalOnDisk, maliciousHtml);
}));

test('Security: embedded HTML content remains quarantined without script tags', () => {
  const evidence=extractEvidence(Buffer.from('<iframe srcdoc="<h1>Inline</h1>"></iframe>'),'html','frame.html');
  assert.equal(evidence.hasActiveContent,true);
  assert.equal(evidence.quarantined,true);
  assert.ok(evidence.scripts.some(item=>item.type==='active_embedded_content'));
});

test('Security: remote CSS flagged for review and quarantined', () => sandbox(async root => {
  const sourceDir = path.join(root, 'source');
  const workspace = path.join(root, 'workspace');
  await fs.mkdir(sourceDir, { recursive: true });
  await fs.mkdir(workspace, { recursive: true });

  const cssWithRemote = `@import url("https://cdn.example.com/font.css");
:root { --main-bg: #fff; }`;

  const inputPath = path.join(sourceDir, 'theme.css');
  await fs.writeFile(inputPath, cssWithRemote, 'utf8');

  const result = await ingest(inputPath, workspace);
  const fileMeta = result.files[0];

  assert.equal(fileMeta.evidence.hasRemotes, true);
  assert.equal(fileMeta.evidence.quarantined, true);
  assert.equal(fileMeta.evidence.reviewNeeded, true);
  assert.ok(fileMeta.evidence.remotes.includes('https://cdn.example.com/font.css'));
}));

test('UTF-16 LE and BE BOM detection and byte-for-byte preservation', () => sandbox(async root => {
  const sourceDir = path.join(root, 'source');
  const workspace = path.join(root, 'workspace');
  await fs.mkdir(sourceDir, { recursive: true });
  await fs.mkdir(workspace, { recursive: true });

  const sampleHtml = '<title>UTF-16 Title</title><h1>こんにちは</h1>';

  // UTF-16 LE with BOM (0xFF, 0xFE)
  const leBuf = Buffer.concat([
    Buffer.from([0xff, 0xfe]),
    Buffer.from(sampleHtml, 'utf16le')
  ]);
  const lePath = path.join(sourceDir, 'utf16le.html');
  await fs.writeFile(lePath, leBuf);

  const leResult = await ingest(lePath, workspace);
  assert.equal(leResult.files[0].evidence.encoding, 'utf-16le');
  assert.equal(leResult.files[0].evidence.title, 'UTF-16 Title');
  assert.match(leResult.files[0].evidence.text, /こんにちは/);

  const storedLe = await fs.readFile(path.join(leResult.workspace, 'originals', 'utf16le.html'));
  assert.equal(Buffer.compare(leBuf, storedLe), 0);
  assert.equal(leResult.files[0].sha256, sha256(leBuf));

  // UTF-16 BE with BOM (0xFE, 0xFF)
  // Construct BE by swapping bytes of LE
  const bePayload = Buffer.from(sampleHtml, 'utf16le');
  bePayload.swap16();
  const beBuf = Buffer.concat([
    Buffer.from([0xfe, 0xff]),
    bePayload
  ]);
  const bePath = path.join(sourceDir, 'utf16be.html');
  await fs.writeFile(bePath, beBuf);

  const beResult = await ingest(bePath, workspace);
  assert.equal(beResult.files[0].evidence.encoding, 'utf-16be');
  assert.equal(beResult.files[0].evidence.title, 'UTF-16 Title');

  const storedBe = await fs.readFile(path.join(beResult.workspace, 'originals', 'utf16be.html'));
  assert.equal(Buffer.compare(beBuf, storedBe), 0);
  assert.equal(beResult.files[0].sha256, sha256(beBuf));
}));

test('Invalid UTF bytes report decoding issue and quarantine without execution', () => sandbox(async root => {
  const sourceDir = path.join(root, 'source');
  const workspace = path.join(root, 'workspace');
  await fs.mkdir(sourceDir, { recursive: true });
  await fs.mkdir(workspace, { recursive: true });

  // Invalid UTF-8 sequence: lone continuation byte 0x80 or truncated multibyte
  const invalidBytes = Buffer.from([0x68, 0x74, 0x6d, 0x6c, 0xc3, 0x28, 0x80, 0xff]);
  const inputPath = path.join(sourceDir, 'invalid.html');
  await fs.writeFile(inputPath, invalidBytes);

  const result = await ingest(inputPath, workspace);
  const fileMeta = result.files[0];

  assert.equal(fileMeta.evidence.quarantined, true);
  assert.ok(fileMeta.evidence.decodingError);

  const stored = await fs.readFile(path.join(result.workspace, 'originals', 'invalid.html'));
  assert.equal(Buffer.compare(invalidBytes, stored), 0);
}));

test('Byte-for-byte preservation with Unicode, emojis, and mixed CRLF/LF line endings', () => sandbox(async root => {
  const sourceDir = path.join(root, 'source');
  const workspace = path.join(root, 'workspace');
  await fs.mkdir(sourceDir, { recursive: true });
  await fs.mkdir(workspace, { recursive: true });

  const rawBytes = Buffer.concat([
    Buffer.from([0xef, 0xbb, 0xbf]), // UTF-8 BOM
    Buffer.from('Title: コンポーネント 🌟\r\n', 'utf8'),
    Buffer.from('Line 2: 现代界面设计\n', 'utf8'),
    Buffer.from('Line 3: Mixed endings \r\nand accents: résumé café\n', 'utf8')
  ]);

  const inputPath = path.join(sourceDir, 'unicode.html');
  await fs.writeFile(inputPath, rawBytes);

  const result = await ingest(inputPath, workspace);
  const fileMeta = result.files[0];

  assert.equal(fileMeta.bytes, rawBytes.length);
  assert.equal(fileMeta.sha256, sha256(rawBytes));
  assert.equal(fileMeta.evidence.encoding, 'utf-8-bom');

  const storedBytes = await fs.readFile(path.join(result.workspace, 'originals', 'unicode.html'));
  assert.equal(Buffer.compare(rawBytes, storedBytes), 0);
}));
