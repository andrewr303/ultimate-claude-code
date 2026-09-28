#!/usr/bin/env node
// WCAG 2.x contrast-ratio checker. No dependencies.
// Usage: node contrast-check.mjs <fg> <bg>
// Accepts #rgb and #rrggbb. Exit 0 always (report, don't fail).

function parseHex(hex) {
  let h = hex.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(h)) {
    h = h.split('').map((c) => c + c).join('');
  }
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function luminance([r, g, b]) {
  const f = (v) => {
    v /= 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function ratio(fg, bg) {
  const l1 = luminance(fg);
  const l2 = luminance(bg);
  const [lighter, darker] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (lighter + 0.05) / (darker + 0.05);
}

const pass = (r, t) => (r >= t ? 'PASS' : 'FAIL');

const [fgArg, bgArg] = process.argv.slice(2);
if (!fgArg || !bgArg) {
  console.error('Usage: node contrast-check.mjs <fg> <bg>  (e.g. node contrast-check.mjs "#ffffff" "#005fcc")');
  process.exit(0);
}

const fg = parseHex(fgArg);
const bg = parseHex(bgArg);
if (!fg || !bg) {
  console.error(`Invalid color. Expected #rgb or #rrggbb, got "${fgArg}" and "${bgArg}".`);
  process.exit(0);
}

const r = ratio(fg, bg);
const rs = r.toFixed(2);

// Machine-readable line
console.log(`RATIO ${rs}:1 fg=${fgArg} bg=${bgArg}`);
// Human-readable lines
console.log(`Contrast ratio: ${rs}:1`);
console.log(`AA normal text (4.5:1): ${pass(r, 4.5)}`);
console.log(`AA large text (3:1):    ${pass(r, 3.0)}`);
console.log(`AA non-text (3:1):      ${pass(r, 3.0)}`);
console.log(`AAA normal text (7:1):  ${pass(r, 7.0)}`);
console.log(`AAA large text (4.5:1): ${pass(r, 4.5)}`);
process.exit(0);
