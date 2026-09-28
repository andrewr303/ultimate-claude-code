import { describe, it, expect } from "vitest";
import { nextSteps } from "../../src/decision-tree.js";

describe("nextSteps", () => {
  it("returns empty array when no rules match", () => {
    const results = [{ id: "LCP", status: "ok", value: 1200 }];
    expect(nextSteps(results)).toEqual([]);
  });

  it("appends LCP-Subparts when LCP > 2500ms", () => {
    const results = [{ id: "LCP", status: "ok", value: 3000 }];
    const steps = nextSteps(results);
    expect(steps).toHaveLength(1);
    expect(steps[0].id).toBe("LCP-Subparts");
    expect(steps[0].path).toBe("CoreWebVitals/LCP-Subparts");
    expect(steps[0].reason).toMatch(/LCP > 2\.5s/);
  });

  it("does not append LCP-Subparts when LCP === 2500ms (boundary)", () => {
    const results = [{ id: "LCP", status: "ok", value: 2500 }];
    expect(nextSteps(results)).toEqual([]);
  });

  it("does not append LCP-Subparts when LCP status is error", () => {
    const results = [{ id: "LCP", status: "error", value: 3000 }];
    expect(nextSteps(results)).toEqual([]);
  });

  it("handles empty results", () => {
    expect(nextSteps([])).toEqual([]);
  });

  // TTFB rule
  it("appends ttfb-subparts when TTFB > 600ms", () => {
    const results = [{ id: "TTFB", status: "ok", value: 601 }];
    const steps = nextSteps(results);
    expect(steps).toHaveLength(1);
    expect(steps[0].id).toBe("ttfb-subparts");
    expect(steps[0].path).toBe("Loading/TTFB-Sub-Parts");
    expect(steps[0].reason).toMatch(/TTFB > 600ms/);
  });

  it("does not append ttfb-subparts when TTFB === 600ms (boundary)", () => {
    const results = [{ id: "TTFB", status: "ok", value: 600 }];
    expect(nextSteps(results)).toEqual([]);
  });

  it("does not append ttfb-subparts when TTFB status is error", () => {
    const results = [{ id: "TTFB", status: "error", value: 800 }];
    expect(nextSteps(results)).toEqual([]);
  });

  // FCP rule
  it("appends render-blocking when FCP > 1800ms", () => {
    const results = [{ id: "FCP", status: "ok", value: 1801 }];
    const steps = nextSteps(results);
    expect(steps).toHaveLength(1);
    expect(steps[0].id).toBe("render-blocking");
    expect(steps[0].path).toBe("Loading/Find-render-blocking-resources");
    expect(steps[0].reason).toMatch(/FCP > 1\.8s/);
  });

  it("does not append render-blocking when FCP === 1800ms (boundary)", () => {
    const results = [{ id: "FCP", status: "ok", value: 1800 }];
    expect(nextSteps(results)).toEqual([]);
  });

  it("does not append render-blocking when FCP status is error", () => {
    const results = [{ id: "FCP", status: "error", value: 2000 }];
    expect(nextSteps(results)).toEqual([]);
  });

  it("fires multiple rules in a single call when several results match", () => {
    const results = [
      { id: "LCP", status: "ok", value: 3000 },
      { id: "TTFB", status: "ok", value: 700 },
    ];
    const steps = nextSteps(results);
    expect(steps.map((s) => s.id)).toEqual(["LCP-Subparts", "ttfb-subparts"]);
  });
});
