import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { runMeasurement, VIEWPORT_PRESETS } from "../../src/runner.js";
import { loadingWorkflow } from "../../src/workflows/loading.js";
import { RULES } from "../../src/decision-tree.js";

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

describe("loading workflow", () => {
  it(
    "runs all steps without errors",
    async () => {
      const { results } = await runMeasurement({
        url: baseUrl,
        workflow: loadingWorkflow,
        rules: RULES,
        waitMs: 500,
        viewport: VIEWPORT_PRESETS.mobile,
      });

      const stepIds = loadingWorkflow.steps.map((s) => s.id);
      for (const id of stepIds) {
        const r = results.find((r) => r.id === id);
        expect(r, `step "${id}" missing from results`).toBeDefined();
        expect(r.status, `${id} threw: ${r?.error}`).not.toBe("error");
      }
    },
    30000
  );

  it(
    "TTFB returns a numeric value with a rating",
    async () => {
      const { results } = await runMeasurement({
        url: baseUrl,
        workflow: loadingWorkflow,
        rules: RULES,
        waitMs: 500,
        viewport: VIEWPORT_PRESETS.mobile,
      });

      const ttfb = results.find((r) => r.id === "TTFB");
      expect(ttfb.status).toBe("ok");
      expect(typeof ttfb.value).toBe("number");
      expect(ttfb.value).toBeGreaterThanOrEqual(0);
      expect(["good", "needs-improvement", "poor"]).toContain(ttfb.rating);
      expect(ttfb.unit).toBe("ms");
    },
    30000
  );

  it(
    "FCP returns a numeric value with a rating",
    async () => {
      const { results } = await runMeasurement({
        url: baseUrl,
        workflow: loadingWorkflow,
        rules: RULES,
        waitMs: 500,
        viewport: VIEWPORT_PRESETS.mobile,
      });

      const fcp = results.find((r) => r.id === "FCP");
      expect(fcp.status).toBe("ok");
      expect(typeof fcp.value).toBe("number");
      expect(fcp.value).toBeGreaterThanOrEqual(0);
      expect(["good", "needs-improvement", "poor"]).toContain(fcp.rating);
      expect(fcp.unit).toBe("ms");
    },
    30000
  );

  it(
    "returns a single navMs — only one navigation",
    async () => {
      const { navMs } = await runMeasurement({
        url: baseUrl,
        workflow: loadingWorkflow,
        rules: RULES,
        waitMs: 500,
        viewport: VIEWPORT_PRESETS.mobile,
      });

      expect(typeof navMs).toBe("number");
      expect(navMs).toBeGreaterThan(0);
    },
    30000
  );
});
