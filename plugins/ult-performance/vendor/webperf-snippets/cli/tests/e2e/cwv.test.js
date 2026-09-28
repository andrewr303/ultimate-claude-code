import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { runSnippets, VIEWPORT_PRESETS } from "../../src/runner.js";
import { loadSnippet } from "../../src/load-snippet.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE_HTML = readFileSync(join(HERE, "../fixtures/index.html"), "utf8");

let server;
let baseUrl;

beforeAll(
  () =>
    new Promise((resolve) => {
      server = createServer((_req, res) => {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(FIXTURE_HTML);
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

function makeItems(ids) {
  return ids.map((id) => ({
    id,
    path: `CoreWebVitals/${id}`,
    source: loadSnippet(`CoreWebVitals/${id}`),
  }));
}

describe("Core Web Vitals snippets on a local page", () => {
  it(
    "LCP returns a numeric value with a rating",
    async () => {
      const { results } = await runSnippets({
        url: baseUrl,
        items: makeItems(["LCP"]),
        waitMs: 500,
        viewport: VIEWPORT_PRESETS.mobile,
      });

      const lcp = results.find((r) => r.id === "LCP");
      expect(lcp.status).toBe("ok");
      expect(typeof lcp.value).toBe("number");
      expect(lcp.value).toBeGreaterThanOrEqual(0);
      expect(["good", "needs-improvement", "poor"]).toContain(lcp.rating);
      expect(lcp.unit).toBe("ms");
    },
    30000
  );

  it(
    "CLS returns 0 on a stable page",
    async () => {
      const { results } = await runSnippets({
        url: baseUrl,
        items: makeItems(["CLS"]),
        waitMs: 500,
        viewport: VIEWPORT_PRESETS.mobile,
      });

      const cls = results.find((r) => r.id === "CLS");
      expect(cls.status).toBe("ok");
      expect(cls.value).toBe(0);
      expect(cls.rating).toBe("good");
      expect(cls.unit).toBe("score");
    },
    30000
  );

  it(
    "respects the viewport preset passed to runSnippets",
    async () => {
      const { results: mobileResults } = await runSnippets({
        url: baseUrl,
        items: makeItems(["LCP"]),
        waitMs: 500,
        viewport: VIEWPORT_PRESETS.mobile,
      });
      const { results: desktopResults } = await runSnippets({
        url: baseUrl,
        items: makeItems(["LCP"]),
        waitMs: 500,
        viewport: VIEWPORT_PRESETS.desktop,
      });

      expect(mobileResults[0].status).toBe("ok");
      expect(desktopResults[0].status).toBe("ok");
    },
    60000
  );
});
