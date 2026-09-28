import { createHash, randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import * as parse5 from 'parse5';
import yauzl from 'yauzl';

export const MAX_ZIP_ENTRIES = 500;
export const MAX_SINGLE_FILE_BYTES = 52_428_800; // 50MB
export const MAX_TOTAL_UNCOMPRESSED_BYTES = 52_428_800; // 50MB
export const MAX_COMPRESSION_RATIO = 50;

export const RESERVED_WINDOWS_NAMES = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i;

export const SENSITIVE_PATH_PATTERN = /(^|[\\/])(\.env(?:\..*)?|\.git|\.svn|\.hg|\.ssh|\.aws|\.npmrc|\.yarnrc|\.netrc|\.gnupg|id_rsa|id_ed25519|id_dsa|authorized_keys|known_hosts|credentials?(?:\..*)?|secrets?(?:\..*)?|private[-_.]?key(?:\..*)?|[^/\\]*\.(?:pem|p12|pfx|key|kdbx)|windows[\\/]system32|etc[\\/](?:passwd|shadow))([\\/]|$)/i;

const pluginRoot = path.resolve(import.meta.dirname, '..');

export function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

export function lexicalSort(a, b) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

export function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

export function assertNoADS(p, isAbsolute = false) {
  if (typeof p !== 'string') fail('INVALID_ARGUMENT', 'Path must be a string');
  if (isAbsolute) {
    const withoutDrive = p.replace(/^[a-zA-Z]:/, '');
    if (withoutDrive.includes(':')) {
      fail('UNSAFE_PATH', `Windows Alternate Data Streams (ADS) are prohibited: ${p}`);
    }
  } else {
    if (p.includes(':')) {
      fail('UNSAFE_PATH', `Windows Alternate Data Streams (ADS) are prohibited: ${p}`);
    }
  }
}

export function validateRelativePath(name) {
  if (typeof name !== 'string' || !name) {
    fail('UNSAFE_PATH', 'Path must be a non-empty string');
  }
  if (name.includes('\0') || /[\u0000-\u001f\u007f]/.test(name)) {
    fail('UNSAFE_PATH', `Control characters in path: ${name}`);
  }
  if (name.startsWith('/') || name.startsWith('\\') || name.startsWith('//') || name.startsWith('\\\\')) {
    fail('UNSAFE_PATH', `Absolute or UNC path prohibited: ${name}`);
  }
  if (/^[a-zA-Z]:/.test(name)) {
    fail('UNSAFE_PATH', `Drive-qualified path prohibited: ${name}`);
  }
  if (name.includes('\\')) {
    fail('UNSAFE_PATH', `Backslashes in relative path prohibited: ${name}`);
  }
  assertNoADS(name, false);

  if (/[<>"|?*]/.test(name)) {
    fail('UNSAFE_PATH', `Invalid character in path: ${name}`);
  }

  if (SENSITIVE_PATH_PATTERN.test('/' + name + '/')) {
    fail('UNSAFE_PATH', `Sensitive or credential path prohibited: ${name}`);
  }

  const segments = name.split('/');
  for (const segment of segments) {
    if (!segment) {
      fail('UNSAFE_PATH', `Empty or double-slash segment in path: ${name}`);
    }
    if (segment === '.' || segment === '..') {
      fail('UNSAFE_PATH', `Path traversal segment in path: ${name}`);
    }
    if (/[. ]$/.test(segment)) {
      fail('UNSAFE_PATH', `Trailing dot or space alias in segment: ${segment}`);
    }
    if (RESERVED_WINDOWS_NAMES.test(segment)) {
      fail('UNSAFE_PATH', `Windows reserved device name: ${segment}`);
    }
  }

  return segments.join('/');
}

export const safeRelative = validateRelativePath;

export class CasefoldTracker {
  constructor() {
    this.seenDirs = new Map();
    this.seenFiles = new Set();
  }

  check(relPath) {
    const segments = relPath.split('/');
    for (let i = 1; i < segments.length; i++) {
      const dirPrefix = segments.slice(0, i).join('/');
      const lowerPrefix = dirPrefix.toLowerCase();
      if (this.seenDirs.has(lowerPrefix)) {
        const existing = this.seenDirs.get(lowerPrefix);
        if (existing !== dirPrefix) {
          fail('CASE_COLLISION', `Duplicate Windows case alias for directory segment: "${dirPrefix}" vs "${existing}" in ${relPath}`);
        }
      } else {
        this.seenDirs.set(lowerPrefix, dirPrefix);
      }
    }

    const lowerFile = relPath.toLowerCase();
    if (this.seenFiles.has(lowerFile)) {
      fail('CASE_COLLISION', `Duplicate Windows case alias: ${relPath}`);
    }
    this.seenFiles.add(lowerFile);
  }
}

export function getFileKind(relPath) {
  const lower = relPath.toLowerCase();
  if (lower.endsWith('.dc.html') || lower.endsWith('.html')) return 'html';
  if (lower.endsWith('.css')) return 'css';
  if (lower.endsWith('.json')) return 'json';
  if (lower.endsWith('.svg')) return 'svg';
  if (lower.endsWith('.png') || lower.endsWith('.jpeg') || lower.endsWith('.jpg') || lower.endsWith('.webp')) return 'image';
  if (lower.endsWith('.tsx') || lower.endsWith('.jsx')) return 'component';
  return null;
}

export function isAllowedExtension(relPath) {
  return getFileKind(relPath) !== null;
}

export function decodeText(buffer) {
  if (!Buffer.isBuffer(buffer)) buffer = Buffer.from(buffer);

  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    try {
      const decoder = new TextDecoder('utf-8', { fatal: true });
      return { text: decoder.decode(buffer.subarray(3)), encoding: 'utf-8-bom', valid: true };
    } catch (e) {
      return { text: '', encoding: 'utf-8-bom', valid: false, error: e.message };
    }
  }

  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    try {
      const decoder = new TextDecoder('utf-16le', { fatal: true });
      return { text: decoder.decode(buffer.subarray(2)), encoding: 'utf-16le', valid: true };
    } catch (e) {
      return { text: '', encoding: 'utf-16le', valid: false, error: e.message };
    }
  }

  if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
    try {
      const decoder = new TextDecoder('utf-16be', { fatal: true });
      return { text: decoder.decode(buffer.subarray(2)), encoding: 'utf-16be', valid: true };
    } catch (e) {
      return { text: '', encoding: 'utf-16be', valid: false, error: e.message };
    }
  }

  try {
    const decoder = new TextDecoder('utf-8', { fatal: true });
    return { text: decoder.decode(buffer), encoding: 'utf-8', valid: true };
  } catch (e) {
    return { text: '', encoding: 'invalid', valid: false, error: e.message };
  }
}

export async function assertNoSymlinkAncestors(targetPath, label = 'Path') {
  let current = path.resolve(targetPath);
  const parsed = path.parse(current);

  while (current && current !== parsed.root) {
    try {
      const stat = await fs.lstat(current);
      if (stat.isSymbolicLink()) {
        fail('UNSAFE_PATH', `${label} or an ancestor directory is a symbolic link: ${current}`);
      }
      const real = await fs.realpath(current);
      if (real.toLowerCase() !== current.toLowerCase()) {
        fail('UNSAFE_PATH', `${label} or an ancestor directory is a reparse point or junction: ${current}`);
      }
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
}

export function checkWorkspaceLocation(normWorkspace) {
  const root = pluginRoot.toLowerCase();
  const workspace = path.resolve(normWorkspace).toLowerCase();
  if (workspace === root || workspace.startsWith(root + path.sep)) {
    fail('UNSAFE_PATH', 'Ingest workspace inside plugin installation directory is prohibited');
  }
}

export function requireAbsolute(value, label) {
  if (typeof value !== 'string' || !value.trim()) {
    fail('INVALID_ARGUMENT', `${label} must be a non-empty string`);
  }
  if (value.startsWith('\\\\') || value.startsWith('//') || /^[\\/]{2}/.test(value)) {
    fail('UNSAFE_PATH', `UNC paths are prohibited for ${label}: ${value}`);
  }
  if (!path.isAbsolute(value)) {
    fail('INVALID_ARGUMENT', `${label} must be an absolute path: ${value}`);
  }
  assertNoADS(value, true);

  const resolved = path.resolve(value);
  const parsed = path.parse(resolved);
  if (resolved === parsed.root) {
    fail('UNSAFE_PATH', `${label} cannot be the filesystem root: ${value}`);
  }

  const relFromRoot = path.relative(parsed.root, resolved);
  const segments = relFromRoot.split(path.sep).filter(Boolean);
  for (const segment of segments) {
    if (/[. ]$/.test(segment)) {
      fail('UNSAFE_PATH', `Trailing dot or space alias in ${label} segment: ${segment}`);
    }
    if (RESERVED_WINDOWS_NAMES.test(segment)) {
      fail('UNSAFE_PATH', `Windows reserved device name in ${label}: ${segment}`);
    }
    if (SENSITIVE_PATH_PATTERN.test('/' + segment + '/')) {
      fail('UNSAFE_PATH', `Sensitive path component in ${label}: ${segment}`);
    }
  }

  return resolved;
}

export function checkOverlap(sourcePath, workspacePath) {
  const normSource = path.resolve(sourcePath).toLowerCase();
  const normWorkspace = path.resolve(workspacePath).toLowerCase();

  if (normSource === normWorkspace) {
    fail('OVERLAP_ERROR', `Source path and workspace cannot be identical: ${sourcePath}`);
  }

  const sep = path.sep.toLowerCase();
  if (normSource.startsWith(normWorkspace + sep)) {
    fail('OVERLAP_ERROR', `Source path cannot reside inside workspace: ${sourcePath} in ${workspacePath}`);
  }

  if (normWorkspace.startsWith(normSource + sep)) {
    fail('OVERLAP_ERROR', `Workspace cannot reside inside source path: ${workspacePath} in ${sourcePath}`);
  }
}

export function extractHtmlEvidence(buffer) {
  const decoded = decodeText(buffer);
  if (!decoded.valid) {
    return {
      encoding: decoded.encoding,
      decodingError: decoded.error,
      hasActiveContent: false,
      quarantined: true,
      note: 'Failed to decode HTML as valid text; quarantined without execution'
    };
  }

  const text = decoded.text;
  let title = '';
  const textPieces = [];
  const controls = [];
  const cssVars = new Set();
  const scripts = [];
  const remotes = new Set();

  let doc;
  try {
    doc = parse5.parse(text);
  } catch (err) {
    return {
      encoding: decoded.encoding,
      parseError: err.message,
      hasActiveContent: false,
      quarantined: true,
      note: 'Static parse error; quarantined without execution'
    };
  }

  function walk(node) {
    if (!node) return;
    const nodeName = node.nodeName ? node.nodeName.toLowerCase() : '';

    if (nodeName === 'title' && node.childNodes) {
      for (const child of node.childNodes) {
        if (child.nodeName === '#text' && child.value) {
          title += child.value;
        }
      }
      title = title.trim();
    }

    if (nodeName === '#text' && node.value) {
      const parentName = node.parentNode?.nodeName ? node.parentNode.nodeName.toLowerCase() : '';
      if (parentName !== 'script' && parentName !== 'style' && parentName !== 'title') {
        const trimmed = node.value.trim();
        if (trimmed) textPieces.push(trimmed);
      }
    }

    if (nodeName === 'style' && node.childNodes) {
      for (const child of node.childNodes) {
        if (child.nodeName === '#text' && child.value) {
          const css = child.value;
          const varMatches = css.match(/--[a-zA-Z0-9_-]+/g);
          if (varMatches) varMatches.forEach(v => cssVars.add(v));
          const remoteMatches = css.match(/https?:\/\/[^\s"'()]+|\/\/[^\s"'()]+/g);
          if (remoteMatches) remoteMatches.forEach(r => remotes.add(r));
        }
      }
    }

    if (node.attrs) {
      for (const attr of node.attrs) {
        const attrName = attr.name ? attr.name.toLowerCase() : '';
        const attrValue = attr.value || '';

        if (attrName.startsWith('on')) {
          scripts.push({
            type: 'event_handler',
            element: nodeName,
            attribute: attrName,
            length: attrValue.length
          });
        }

        if (attrName === 'style') {
          const varMatches = attrValue.match(/--[a-zA-Z0-9_-]+/g);
          if (varMatches) varMatches.forEach(v => cssVars.add(v));
        }

        if (attrName === 'src' || attrName === 'href' || attrName === 'action' || attrName === 'data') {
          const valTrimmed = attrValue.trim();
          if (/^javascript:/i.test(valTrimmed)) {
            scripts.push({
              type: 'javascript_uri',
              element: nodeName,
              attribute: attrName
            });
          } else if (/^(https?:|\/\/)/i.test(valTrimmed)) {
            remotes.add(valTrimmed);
          }
        }
      }
    }

    if (['button', 'input', 'select', 'textarea', 'form'].includes(nodeName)) {
      const attrs = Object.fromEntries((node.attrs || []).map(a => [a.name.toLowerCase(), a.value]));
      controls.push({
        tag: nodeName,
        type: attrs.type || null,
        name: attrs.name || null,
        id: attrs.id || null,
        role: attrs.role || null
      });
    } else if (nodeName === 'a') {
      const href = node.attrs?.find(a => a.name.toLowerCase() === 'href')?.value;
      controls.push({ tag: 'a', href: href || null });
    } else if (node.attrs?.some(a => a.name.toLowerCase() === 'role')) {
      const role = node.attrs.find(a => a.name.toLowerCase() === 'role')?.value;
      if (['button', 'dialog', 'tab', 'menuitem', 'checkbox', 'switch', 'slider', 'combobox'].includes(role)) {
        controls.push({ tag: nodeName, role });
      }
    }

    if (['iframe', 'object', 'embed', 'foreignobject'].includes(nodeName)) {
      scripts.push({ type: 'active_embedded_content', element: nodeName });
    }

    if (nodeName === 'script') {
      const src = node.attrs?.find(a => a.name.toLowerCase() === 'src')?.value || null;
      let inlineLength = 0;
      if (node.childNodes) {
        for (const child of node.childNodes) {
          if (child.nodeName === '#text' && child.value) {
            inlineLength += child.value.length;
          }
        }
      }
      scripts.push({ type: 'script_tag', src, inlineLength });
    }

    if (node.childNodes) {
      for (const child of node.childNodes) {
        walk(child);
      }
    }
  }

  walk(doc);

  const sampleText = textPieces.join(' ').slice(0, 500);
  const hasActiveContent = scripts.length > 0;
  const hasRemotes = remotes.size > 0;

  return {
    encoding: decoded.encoding,
    title,
    text: sampleText,
    controls,
    cssVars: Array.from(cssVars).sort(lexicalSort),
    scripts,
    remotes: Array.from(remotes).sort(lexicalSort),
    hasActiveContent,
    quarantined: hasActiveContent || hasRemotes,
    note: 'Static analysis only; no claim that static inspection allows unrestricted or safe rendering'
  };
}

export function extractSvgEvidence(buffer) {
  const decoded = decodeText(buffer);
  if (!decoded.valid) {
    return {
      encoding: decoded.encoding,
      decodingError: decoded.error,
      hasActiveContent: false,
      quarantined: true,
      note: 'All SVG originals quarantined; invalid encoding'
    };
  }

  const content = decoded.text;
  const scripts = [];
  const remotes = new Set();

  if (/<script[\s>]/i.test(content)) {
    scripts.push({ type: 'svg_script_tag' });
  }

  if (/<foreignObject[\s>]/i.test(content)) {
    scripts.push({ type: 'foreign_object' });
  }

  const eventMatches = content.match(/\son[a-z]+\s*=\s*["'][^"']*["']/gi);
  if (eventMatches) {
    for (const match of eventMatches) {
      scripts.push({ type: 'inline_event_handler', match: match.trim() });
    }
  }

  if (/javascript:/i.test(content)) {
    scripts.push({ type: 'javascript_uri' });
  }

  const remoteMatches = content.match(/https?:\/\/[^\s"'()<>]+|\/\/[^\s"'()<>]+/g);
  if (remoteMatches) {
    for (const r of remoteMatches) remotes.add(r);
  }

  const viewBoxMatch = content.match(/viewBox\s*=\s*["']([^"']+)["']/i);
  const widthMatch = content.match(/width\s*=\s*["']([^"']+)["']/i);
  const heightMatch = content.match(/height\s*=\s*["']([^"']+)["']/i);

  const hasActiveContent = scripts.length > 0;
  return {
    encoding: decoded.encoding,
    viewBox: viewBoxMatch ? viewBoxMatch[1] : null,
    width: widthMatch ? widthMatch[1] : null,
    height: heightMatch ? heightMatch[1] : null,
    scripts,
    remotes: Array.from(remotes).sort(lexicalSort),
    hasActiveContent,
    quarantined: true, // All SVG originals quarantined even if no active marker
    note: 'Original SVG quarantined as static evidence; rendering is not certified safe'
  };
}

export function extractScriptEvidence(buffer, kind) {
  const decoded = decodeText(buffer);
  if (!decoded.valid) {
    return {
      encoding: decoded.encoding,
      decodingError: decoded.error,
      hasActiveContent: true,
      quarantined: true,
      note: 'Script/component quarantined with decoding error'
    };
  }

  const content = decoded.text;
  const imports = [];
  const exports = [];

  const importMatches = content.matchAll(/\bimport\s+(?:.*?from\s+)?['"]([^'"]+)['"]/g);
  for (const m of importMatches) {
    imports.push(m[1]);
  }

  const exportDeclMatches = content.matchAll(/\bexport\s+(?:default\s+)?(?:async\s+)?(?:function\*?|class|const|let|var|type|interface)\s+([a-zA-Z0-9_$]+)/g);
  for (const m of exportDeclMatches) {
    if (m[1]) exports.push(m[1]);
  }

  const exportNamedMatches = content.matchAll(/\bexport\s*\{([^}]+)\}/g);
  for (const m of exportNamedMatches) {
    const list = m[1].split(',');
    for (const item of list) {
      const parts = item.trim().split(/\s+as\s+/);
      const name = (parts[1] || parts[0]).trim();
      if (name && /^[a-zA-Z0-9_$]+$/.test(name)) exports.push(name);
    }
  }

  return {
    encoding: decoded.encoding,
    imports: Array.from(new Set(imports)).sort(lexicalSort),
    exports: Array.from(new Set(exports)).sort(lexicalSort),
    hasActiveContent: true,
    quarantined: true,
    note: 'Component/script code quarantined as static evidence; execution forbidden'
  };
}

export function extractCssEvidence(buffer) {
  const decoded = decodeText(buffer);
  if (!decoded.valid) {
    return {
      encoding: decoded.encoding,
      decodingError: decoded.error,
      hasActiveContent: false,
      quarantined: true,
      note: 'CSS quarantined due to invalid encoding'
    };
  }

  const content = decoded.text;
  const cssVars = new Set();
  const remotes = new Set();

  const varMatches = content.match(/--[a-zA-Z0-9_-]+/g);
  if (varMatches) varMatches.forEach(v => cssVars.add(v));

  const remoteMatches = content.match(/https?:\/\/[^\s"'()]+|\/\/[^\s"'()]+/g);
  if (remoteMatches) remoteMatches.forEach(r => remotes.add(r));

  const hasRemotes = remotes.size > 0;
  return {
    encoding: decoded.encoding,
    cssVars: Array.from(cssVars).sort(lexicalSort),
    remotes: Array.from(remotes).sort(lexicalSort),
    hasActiveContent: false,
    hasRemotes,
    quarantined: hasRemotes,
    reviewNeeded: hasRemotes,
    note: hasRemotes ? 'Remote stylesheet imports/URLs flagged for review/quarantine' : 'Local CSS tokens only; no execution claim'
  };
}

export function extractJsonEvidence(buffer) {
  const decoded = decodeText(buffer);
  if (!decoded.valid) {
    return {
      encoding: decoded.encoding,
      decodingError: decoded.error,
      hasActiveContent: false,
      quarantined: true,
      note: 'JSON quarantined due to invalid encoding'
    };
  }

  let validJson = false;
  let keys = [];
  try {
    const parsed = JSON.parse(decoded.text);
    validJson = true;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      keys = Object.keys(parsed).slice(0, 50).sort(lexicalSort);
    }
  } catch {
    validJson = false;
  }
  return {
    encoding: decoded.encoding,
    validJson,
    keys,
    hasActiveContent: false,
    quarantined: false
  };
}

export function extractImageEvidence(buffer, relPath) {
  const ext = path.extname(relPath).slice(1).toLowerCase();
  return {
    format: ext,
    bytes: buffer.length,
    hasActiveContent: false,
    quarantined: false
  };
}

export function extractEvidence(buffer, kind, relPath) {
  switch (kind) {
    case 'html': return extractHtmlEvidence(buffer);
    case 'svg': return extractSvgEvidence(buffer);
    case 'component':
    case 'script': return extractScriptEvidence(buffer, kind);
    case 'css': return extractCssEvidence(buffer);
    case 'json': return extractJsonEvidence(buffer);
    case 'image': return extractImageEvidence(buffer, relPath);
    default: return { hasActiveContent: false, quarantined: false };
  }
}

async function collectFilesFromDir(dirPath, baseDir, state) {
  const entries = await fs.readdir(dirPath);
  for (const entryName of entries) {
    const fullPath = path.join(dirPath, entryName);

    const stat = await fs.lstat(fullPath);
    if (stat.isSymbolicLink()) {
      fail('UNSAFE_PATH', `Symbolic links are forbidden: ${fullPath}`);
    }

    const real = await fs.realpath(fullPath);
    if (real.toLowerCase() !== path.resolve(fullPath).toLowerCase()) {
      fail('UNSAFE_PATH', `Reparse points or junctions are forbidden: ${fullPath}`);
    }

    const rel = path.relative(baseDir, fullPath).replace(/\\/g, '/');
    const safeRel = validateRelativePath(rel);

    // Enforce casefold collisions for directory segments and file names
    state.tracker.check(safeRel);

    if (stat.isDirectory()) {
      await collectFilesFromDir(fullPath, baseDir, state);
    } else if (stat.isFile()) {
      state.count++;
      if (state.count > MAX_ZIP_ENTRIES) {
        fail('ARCHIVE_LIMIT_EXCEEDED', `File count exceeds limit of ${MAX_ZIP_ENTRIES}`);
      }
      if (stat.size > MAX_SINGLE_FILE_BYTES) {
        fail('ARCHIVE_LIMIT_EXCEEDED', `Single file stat size (${stat.size}) exceeds 50MB: ${safeRel}`);
      }

      const kind = getFileKind(safeRel);
      if (!kind) {
        fail('UNSUPPORTED_INPUT', `Unsupported file type: ${safeRel}`);
      }

      const buffer = await fs.readFile(fullPath);
      // Bound ACTUAL read bytes against file growth after stat
      if (buffer.length > MAX_SINGLE_FILE_BYTES) {
        fail('ARCHIVE_LIMIT_EXCEEDED', `Single file actual read size (${buffer.length}) exceeds 50MB: ${safeRel}`);
      }
      state.totalActualBytes += buffer.length;
      if (state.totalActualBytes > MAX_TOTAL_UNCOMPRESSED_BYTES) {
        fail('ARCHIVE_LIMIT_EXCEEDED', `Total actual read size (${state.totalActualBytes}) exceeds 50MB`);
      }

      state.collected.push({
        path: safeRel,
        buffer,
        kind
      });
    } else {
      fail('UNSAFE_PATH', `Not a regular file: ${fullPath}`);
    }
  }
}

function processZip(zipPath) {
  return new Promise((resolve, reject) => {
    let zipfileRef = null;
    let closed = false;

    function safeClose() {
      if (zipfileRef && !closed) {
        closed = true;
        try { zipfileRef.close(); } catch {}
      }
    }

    yauzl.open(zipPath, { lazyEntries: true, autoClose: false }, (err, zipfile) => {
      if (err) {
        return reject(Object.assign(new Error(`Failed to open zip archive: ${err.message}`), { code: 'INVALID_ARCHIVE' }));
      }
      zipfileRef = zipfile;

      if (zipfile.entryCount > MAX_ZIP_ENTRIES) {
        safeClose();
        return reject(Object.assign(new Error(`Zip entry count (${zipfile.entryCount}) exceeds ${MAX_ZIP_ENTRIES}`), { code: 'ARCHIVE_LIMIT_EXCEEDED' }));
      }

      const files = [];
      let entryCount = 0;
      let totalStreamedBytes = 0;
      let totalMetadataUncompressed = 0;
      const tracker = new CasefoldTracker();

      zipfile.on('error', (zipErr) => {
        safeClose();
        const isPathViolation = /invalid relative path|absolute path|path traversal|traversal/i.test(zipErr.message);
        const code = isPathViolation ? 'UNSAFE_PATH' : 'INVALID_ARCHIVE';
        reject(Object.assign(new Error(`Zip archive error: ${zipErr.message}`), { code }));
      });

      zipfile.on('end', () => {
        safeClose();
        resolve(files);
      });

      zipfile.on('entry', (entry) => {
        entryCount++;
        if (entryCount > MAX_ZIP_ENTRIES) {
          safeClose();
          return reject(Object.assign(new Error(`Zip entry count exceeds ${MAX_ZIP_ENTRIES}`), { code: 'ARCHIVE_LIMIT_EXCEEDED' }));
        }

        const mode = (entry.externalFileAttributes >>> 16);
        if ((mode & 0o170000) === 0o120000) {
          safeClose();
          return reject(Object.assign(new Error(`Zip symlinks are forbidden: ${entry.fileName}`), { code: 'UNSAFE_PATH' }));
        }

        if (/\/$/.test(entry.fileName)) {
          try {
            const dirName = entry.fileName.slice(0, -1);
            if (dirName) {
              const safeDir = validateRelativePath(dirName);
              // Also check directory segment casefold for explicit directory entries
              tracker.check(safeDir + '/.entry-placeholder');
            }
          } catch (e) {
            safeClose();
            return reject(e);
          }
          return zipfile.readEntry();
        }

        let safeRel;
        try {
          safeRel = validateRelativePath(entry.fileName);
          // Check directory segments and file name casefold collision
          tracker.check(safeRel);
        } catch (e) {
          safeClose();
          return reject(e);
        }

        const kind = getFileKind(safeRel);
        if (!kind) {
          safeClose();
          return reject(Object.assign(new Error(`Unsupported file type in zip: ${safeRel}`), { code: 'UNSUPPORTED_INPUT' }));
        }

        if (entry.uncompressedSize > MAX_SINGLE_FILE_BYTES) {
          safeClose();
          return reject(Object.assign(new Error(`Entry uncompressed size (${entry.uncompressedSize}) exceeds 50MB: ${safeRel}`), { code: 'ARCHIVE_LIMIT_EXCEEDED' }));
        }

        totalMetadataUncompressed += entry.uncompressedSize;
        if (totalMetadataUncompressed > MAX_TOTAL_UNCOMPRESSED_BYTES) {
          safeClose();
          return reject(Object.assign(new Error(`Total uncompressed metadata size (${totalMetadataUncompressed}) exceeds 50MB`), { code: 'ARCHIVE_LIMIT_EXCEEDED' }));
        }

        if (entry.compressedSize > 0) {
          const ratio = entry.uncompressedSize / entry.compressedSize;
          if (ratio > MAX_COMPRESSION_RATIO) {
            safeClose();
            return reject(Object.assign(new Error(`Compression ratio (${ratio.toFixed(1)}:1) exceeds 50:1 for ${safeRel}`), { code: 'ARCHIVE_LIMIT_EXCEEDED' }));
          }
        } else if (entry.uncompressedSize > 1024) {
          safeClose();
          return reject(Object.assign(new Error(`Suspicious zero compressed size with non-empty uncompressed size: ${safeRel}`), { code: 'ARCHIVE_LIMIT_EXCEEDED' }));
        }

        zipfile.openReadStream(entry, (openErr, readStream) => {
          if (openErr) {
            safeClose();
            return reject(Object.assign(new Error(`Failed to read zip entry ${safeRel}: ${openErr.message}`), { code: 'INVALID_ARCHIVE' }));
          }

          const chunks = [];
          let entryStreamedBytes = 0;

          readStream.on('data', (chunk) => {
            entryStreamedBytes += chunk.length;
            totalStreamedBytes += chunk.length;

            if (entryStreamedBytes > MAX_SINGLE_FILE_BYTES) {
              readStream.destroy();
              safeClose();
              return reject(Object.assign(new Error(`Streamed entry bytes exceeded 50MB for ${safeRel}`), { code: 'ARCHIVE_LIMIT_EXCEEDED' }));
            }

            if (totalStreamedBytes > MAX_TOTAL_UNCOMPRESSED_BYTES) {
              readStream.destroy();
              safeClose();
              return reject(Object.assign(new Error('Total streamed uncompressed bytes exceeded 50MB'), { code: 'ARCHIVE_LIMIT_EXCEEDED' }));
            }

            if ((entry.compressedSize === 0 && entryStreamedBytes > 0) || (entry.compressedSize > 0 && (entryStreamedBytes / entry.compressedSize) > MAX_COMPRESSION_RATIO)) {
              readStream.destroy();
              safeClose();
              return reject(Object.assign(new Error(`Streamed compression ratio exceeded 50:1 for ${safeRel}`), { code: 'ARCHIVE_LIMIT_EXCEEDED' }));
            }

            chunks.push(chunk);
          });

          readStream.on('error', (streamErr) => {
            safeClose();
            reject(Object.assign(new Error(`Stream error on ${safeRel}: ${streamErr.message}`), { code: 'INVALID_ARCHIVE' }));
          });

          readStream.on('end', () => {
            const buffer = Buffer.concat(chunks);
            files.push({
              path: safeRel,
              buffer,
              kind
            });
            zipfile.readEntry();
          });
        });
      });

      zipfile.readEntry();
    });
  });
}

export async function ingest(input, workspace) {
  const normWorkspace = requireAbsolute(workspace, 'workspace');
  const normInput = requireAbsolute(input, 'input');

  checkWorkspaceLocation(normWorkspace);
  checkOverlap(normInput, normWorkspace);

  await assertNoSymlinkAncestors(normWorkspace, 'Workspace');
  await assertNoSymlinkAncestors(normInput, 'Input');

  let inputStat;
  try {
    inputStat = await fs.lstat(normInput);
  } catch {
    fail('INVALID_ARGUMENT', `Input path does not exist: ${input}`);
  }

  if (inputStat.isSymbolicLink()) {
    fail('UNSAFE_PATH', `Source path is a symbolic link: ${input}`);
  }

  const realSource = await fs.realpath(normInput);
  if (realSource.toLowerCase() !== normInput.toLowerCase()) {
    fail('UNSAFE_PATH', `Source path is a reparse point or junction: ${input}`);
  }

  checkOverlap(realSource, normWorkspace);

  const runId = randomUUID();
  const runDir = path.resolve(normWorkspace, runId);
  const originalsDir = path.join(runDir, 'originals');
  const receiptPath = path.join(runDir, 'receipt.json');

  let runDirCreated = false;

  try {
    await fs.mkdir(normWorkspace, { recursive: true });
    await assertNoSymlinkAncestors(normWorkspace, 'Workspace');
    await fs.mkdir(runDir);
    runDirCreated = true;
    await fs.mkdir(originalsDir);

    let itemsToIngest = [];
    let sourceArchive = null;

    if (inputStat.isDirectory()) {
      const state = {
        collected: [],
        tracker: new CasefoldTracker(),
        count: 0,
        totalActualBytes: 0
      };
      await collectFilesFromDir(normInput, normInput, state);
      itemsToIngest = state.collected;
    } else if (normInput.toLowerCase().endsWith('.zip')) {
      if (inputStat.size > MAX_TOTAL_UNCOMPRESSED_BYTES) {
        fail('ARCHIVE_LIMIT_EXCEEDED', `Zip file size (${inputStat.size}) exceeds 50MB`);
      }

      // Preserve source ZIP input itself byte-for-byte and hashed
      const zipBuffer = await fs.readFile(normInput);
      if (zipBuffer.length > MAX_TOTAL_UNCOMPRESSED_BYTES) {
        fail('ARCHIVE_LIMIT_EXCEEDED', `Zip file actual read size (${zipBuffer.length}) exceeds 50MB`);
      }
      const zipArchiveDest = path.join(runDir, 'source-archive.zip');
      await fs.writeFile(zipArchiveDest, zipBuffer, { flag: 'wx' });
      sourceArchive = {
        path: 'source-archive.zip',
        sha256: sha256(zipBuffer),
        bytes: zipBuffer.length
      };

      itemsToIngest = await processZip(normInput);
    } else {
      if (inputStat.size > MAX_SINGLE_FILE_BYTES) {
        fail('ARCHIVE_LIMIT_EXCEEDED', `Single file stat size (${inputStat.size}) exceeds 50MB`);
      }
      const fileName = path.basename(normInput);
      const safeRel = validateRelativePath(fileName);
      const kind = getFileKind(safeRel);
      if (!kind) {
        fail('UNSUPPORTED_INPUT', `Unsupported file type: ${safeRel}`);
      }
      const buffer = await fs.readFile(normInput);
      if (buffer.length > MAX_SINGLE_FILE_BYTES) {
        fail('ARCHIVE_LIMIT_EXCEEDED', `Single file actual read size (${buffer.length}) exceeds 50MB`);
      }
      itemsToIngest = [{
        path: safeRel,
        buffer,
        kind
      }];
    }

    if (itemsToIngest.length === 0) {
      fail('INVALID_ARGUMENT', 'No valid files found to ingest');
    }

    itemsToIngest.sort((a, b) => lexicalSort(a.path, b.path));

    const files = [];

    for (const item of itemsToIngest) {
      const destPath = path.join(originalsDir, item.path);
      await fs.mkdir(path.dirname(destPath), { recursive: true });
      await fs.writeFile(destPath, item.buffer, { flag: 'wx' });

      const fileSha = sha256(item.buffer);
      const evidence = extractEvidence(item.buffer, item.kind, item.path);

      files.push({
        path: item.path,
        sha256: fileSha,
        bytes: item.buffer.length,
        kind: item.kind,
        evidence
      });
    }

    const receiptData = {
      runId,
      createdAt: new Date().toISOString(),
      workspace: runDir,
      receipt: receiptPath,
      files,
      state: 'INGESTED',
      ...(sourceArchive ? { sourceArchive } : {})
    };

    await fs.writeFile(receiptPath, JSON.stringify(receiptData, null, 2) + '\n', { encoding: 'utf8', flag: 'wx' });

    return receiptData;
  } catch (error) {
    if (runDirCreated) {
      try {
        await fs.rm(runDir, { recursive: true, force: true });
      } catch {}
    }
    throw error;
  }
}

export default ingest;
