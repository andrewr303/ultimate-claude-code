import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { runSnippets, VIEWPORT_PRESETS } from "../../src/runner.js";
import { loadSnippet } from "../../src/load-snippet.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(HERE, "../fixtures");

const GREEN_HTML = readFileSync(join(FIXTURES, "audit-green.html"), "utf8");
const VIOLATIONS_HTML = readFileSync(join(FIXTURES, "audit-violations.html"), "utf8");

// Minimal 1×1 transparent GIF served for all image requests.
const PIXEL_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

let server;
let baseUrl;

beforeAll(
  () =>
    new Promise((resolve) => {
      server = createServer((req, res) => {
        if (req.url.match(/\.(gif|png|jpg|jpeg|webp|avif)$/)) {
          res.writeHead(200, { "Content-Type": "image/gif" });
          res.end(PIXEL_GIF);
          return;
        }
        if (req.url.endsWith(".css")) {
          res.writeHead(200, { "Content-Type": "text/css" });
          res.end("body { color: black; font-family: sans-serif; }");
          return;
        }
        if (req.url.endsWith(".js")) {
          res.writeHead(200, { "Content-Type": "application/javascript" });
          res.end("// placeholder");
          return;
        }
        const html = req.url === "/violations" ? VIOLATIONS_HTML : GREEN_HTML;
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(html);
      });
      server.listen(0, "127.0.0.1", () => {
        const { port } = server.address();
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    }),
  10000
);

afterAll(
  () =>
    new Promise((resolve) => {
      server.close(resolve);
    })
);

const AUDIT_STEPS = [
  { id: "render-blocking", path: "Loading/Find-render-blocking-resources" },
  { id: "resource-hints", path: "Loading/Resource-Hints-Validation" },
  { id: "preload-scripts", path: "Loading/Validate-Preload-Async-Defer-Scripts" },
  { id: "priority-hints", path: "Loading/Priority-Hints-Audit" },
  { id: "critical-css", path: "Loading/Critical-CSS-Detection" },
  { id: "ttfb", path: "Loading/TTFB-Sub-Parts" },
  { id: "script-parties", path: "Loading/First-And-Third-Party-Script-Info" },
  { id: "script-loading", path: "Loading/Script-Loading" },
  { id: "lazy-atf", path: "Loading/Find-Above-The-Fold-Lazy-Loaded-Images" },
  { id: "lazy-conflict", path: "Loading/Find-Images-With-Lazy-and-Fetchpriority" },
  { id: "eager-below-fold", path: "Loading/Find-non-Lazy-Loaded-Images-outside-of-the-viewport" },
];

function makeItems(steps) {
  return steps.map((step) => ({
    id: step.id,
    path: step.path,
    source: loadSnippet(step.path),
  }));
}

async function runAudit(url, steps = AUDIT_STEPS) {
  const { results } = await runSnippets({
    url,
    items: makeItems(steps),
    waitMs: 500,
    viewport: VIEWPORT_PRESETS.mobile,
  });
  return results;
}

function step(id) {
  return AUDIT_STEPS.filter((s) => s.id === id);
}

// ─── Green fixture — expects no violations ────────────────────────────────────

describe("Audit snippets — green fixture (no violations)", () => {
  it(
    "all snippets execute without errors",
    async () => {
      const results = await runAudit(baseUrl);
      for (const r of results) {
        expect(r.status, `${r.id} threw: ${r.error}`).not.toBe("error");
      }
    },
    60000,
  );

  it(
    "all non-TTFB snippets return an issues array",
    async () => {
      const results = await runAudit(baseUrl);
      for (const r of results.filter((r) => r.id !== "ttfb")) {
        expect(Array.isArray(r.issues), `${r.id} missing issues array`).toBe(true);
      }
    },
    60000,
  );

  it(
    "TTFB returns a metric with a rating",
    async () => {
      const [r] = await runAudit(baseUrl, step("ttfb"));
      expect(r.status).toBe("ok");
      expect(r.metric).toBe("TTFB");
      expect(typeof r.value).toBe("number");
      expect(["good", "needs-improvement", "poor"]).toContain(r.rating);
    },
    30000,
  );

  it(
    "render-blocking — 🟢 no blocking resources on a page with only inline styles",
    async () => {
      const [r] = await runAudit(baseUrl, step("render-blocking"));
      // renderBlockingStatus requires Chrome 107+; skip gracefully if unavailable
      if (r.status === "unsupported") return;
      expect(r.status).toBe("ok");
      expect(r.count).toBe(0);
      expect(r.issues).toEqual([]);
    },
    30000,
  );

  it(
    "lazy-atf — 🟢 no lazy images above fold",
    async () => {
      const [r] = await runAudit(baseUrl, step("lazy-atf"));
      expect(r.status).toBe("ok");
      expect(r.count).toBe(0);
      expect(r.issues).toEqual([]);
    },
    30000,
  );

  it(
    "lazy-conflict — 🟢 no lazy+fetchpriority conflicts",
    async () => {
      const [r] = await runAudit(baseUrl, step("lazy-conflict"));
      expect(r.status).toBe("ok");
      expect(r.count).toBe(0);
      expect(r.issues).toEqual([]);
    },
    30000,
  );

  it(
    "eager-below-fold — 🟢 all below-fold images are properly lazy",
    async () => {
      const [r] = await runAudit(baseUrl, step("eager-below-fold"));
      expect(r.status).toBe("ok");
      expect(r.issues).toEqual([]);
    },
    30000,
  );
});

// ─── Violations fixture — expects specific issues ──────────────────────────────

describe("Audit snippets — violations fixture (deliberate issues)", () => {
  it(
    "render-blocking — 🔴 detects the blocking external CSS file",
    async () => {
      const [r] = await runAudit(`${baseUrl}/violations`, step("render-blocking"));
      if (r.status === "unsupported") return;
      expect(r.status).toBe("ok");
      expect(r.count).toBeGreaterThan(0);
      expect(r.issues.some((i) => i.severity === "error")).toBe(true);
    },
    30000,
  );

  it(
    "lazy-atf — 🔴 detects lazy image above the fold",
    async () => {
      const [r] = await runAudit(`${baseUrl}/violations`, step("lazy-atf"));
      expect(r.status).toBe("ok");
      expect(r.count).toBeGreaterThan(0);
      expect(r.issues.length).toBeGreaterThan(0);
    },
    30000,
  );

  it(
    "lazy-conflict — 🔴 detects image with loading=lazy and fetchpriority=high",
    async () => {
      const [r] = await runAudit(`${baseUrl}/violations`, step("lazy-conflict"));
      expect(r.status).toBe("ok");
      expect(r.count).toBeGreaterThan(0);
      expect(r.issues.some((i) => i.severity === "error")).toBe(true);
    },
    30000,
  );

  it(
    "eager-below-fold — 🟡 detects images below viewport without lazy loading",
    async () => {
      const [r] = await runAudit(`${baseUrl}/violations`, step("eager-below-fold"));
      expect(r.status).toBe("ok");
      expect(r.count).toBeGreaterThan(0);
      expect(r.issues.some((i) => i.severity === "warning")).toBe(true);
    },
    30000,
  );
});
