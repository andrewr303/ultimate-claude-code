import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { runMeasurement, VIEWPORT_PRESETS } from "../../src/runner.js";

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

// Minimal workflow — only LCP so the follow-up rule below stays unambiguous.
const lcpOnlyWorkflow = {
  id: "lcp-only",
  title: "LCP Only",
  steps: [{ id: "LCP", path: "CoreWebVitals/LCP" }],
};

// Rule that always fires when LCP succeeds, appending CLS as a follow-up.
const alwaysAddCls = [
  {
    when: (r) => r.id === "LCP" && r.status === "ok",
    append: { id: "CLS", path: "CoreWebVitals/CLS" },
    reason: "test: LCP ok → add CLS",
  },
];

describe("runMeasurement — follow-up execution", () => {
  it(
    "appends follow-up results when a rule fires",
    async () => {
      const { results } = await runMeasurement({
        url: baseUrl,
        workflow: lcpOnlyWorkflow,
        rules: alwaysAddCls,
        waitMs: 500,
        viewport: VIEWPORT_PRESETS.mobile,
      });

      expect(results).toHaveLength(2);
      expect(results[0].id).toBe("LCP");
      expect(results[1].id).toBe("CLS");
    },
    30000
  );

  it(
    "follow-up result carries the reason from the rule",
    async () => {
      const { results } = await runMeasurement({
        url: baseUrl,
        workflow: lcpOnlyWorkflow,
        rules: alwaysAddCls,
        waitMs: 500,
        viewport: VIEWPORT_PRESETS.mobile,
      });

      const cls = results.find((r) => r.id === "CLS");
      expect(cls.reason).toBe("test: LCP ok → add CLS");
      expect(cls.status).toBe("ok");
    },
    30000
  );

  it(
    "returns only initial results when no rules fire",
    async () => {
      const { results } = await runMeasurement({
        url: baseUrl,
        workflow: lcpOnlyWorkflow,
        rules: [],
        waitMs: 500,
        viewport: VIEWPORT_PRESETS.mobile,
      });

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("LCP");
    },
    30000
  );

  it(
    "returns a single navMs across initial and follow-up steps",
    async () => {
      const { navMs } = await runMeasurement({
        url: baseUrl,
        workflow: lcpOnlyWorkflow,
        rules: alwaysAddCls,
        waitMs: 500,
        viewport: VIEWPORT_PRESETS.mobile,
      });

      expect(typeof navMs).toBe("number");
      expect(navMs).toBeGreaterThan(0);
    },
    30000
  );
});
