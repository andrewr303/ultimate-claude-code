import { describe, it, expect } from "vitest";
import { VIEWPORT_PRESETS } from "../../src/runner.js";

describe("VIEWPORT_PRESETS", () => {
  it("defines mobile, tablet, and desktop presets", () => {
    expect(VIEWPORT_PRESETS).toHaveProperty("mobile");
    expect(VIEWPORT_PRESETS).toHaveProperty("tablet");
    expect(VIEWPORT_PRESETS).toHaveProperty("desktop");
  });

  it("mobile is the narrowest preset", () => {
    expect(VIEWPORT_PRESETS.mobile.width).toBeLessThan(VIEWPORT_PRESETS.tablet.width);
    expect(VIEWPORT_PRESETS.tablet.width).toBeLessThan(VIEWPORT_PRESETS.desktop.width);
  });

  it("mobile width matches a phone form factor", () => {
    expect(VIEWPORT_PRESETS.mobile.width).toBe(375);
  });
});
