import { describe, it, expect, vi, beforeEach } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { executeStep, runInteractions } from "../../src/interactions.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(HERE, "../fixtures");

function mockPage() {
  return {
    evaluate: vi.fn().mockResolvedValue(undefined),
    click: vi.fn().mockResolvedValue(undefined),
    hover: vi.fn().mockResolvedValue(undefined),
    type: vi.fn().mockResolvedValue(undefined),
    waitForTimeout: vi.fn().mockResolvedValue(undefined),
  };
}

describe("executeStep", () => {
  let page;

  beforeEach(() => {
    page = mockPage();
  });

  it("scroll — calls page.evaluate with the given y value", async () => {
    await executeStep(page, { action: "scroll", y: 500 });
    expect(page.evaluate).toHaveBeenCalledOnce();
    expect(page.evaluate).toHaveBeenCalledWith(expect.any(Function), 500);
  });

  it("scroll — defaults y to 300 when omitted", async () => {
    await executeStep(page, { action: "scroll" });
    expect(page.evaluate).toHaveBeenCalledWith(expect.any(Function), 300);
  });

  it("click — calls page.click with the selector", async () => {
    await executeStep(page, { action: "click", selector: "#btn" });
    expect(page.click).toHaveBeenCalledWith("#btn");
  });

  it("hover — calls page.hover with the selector", async () => {
    await executeStep(page, { action: "hover", selector: ".menu" });
    expect(page.hover).toHaveBeenCalledWith(".menu");
  });

  it("type — calls page.type with selector and text", async () => {
    await executeStep(page, { action: "type", selector: "input", text: "hello" });
    expect(page.type).toHaveBeenCalledWith("input", "hello");
  });

  it("wait — calls page.waitForTimeout with the given ms", async () => {
    await executeStep(page, { action: "wait", ms: 500 });
    expect(page.waitForTimeout).toHaveBeenCalledWith(500);
  });

  it("unknown action — throws with a clear message", async () => {
    await expect(executeStep(page, { action: "fly" })).rejects.toThrow(
      'Unknown interaction action: "fly"'
    );
  });

  it("unknown action — no page methods are called before throwing", async () => {
    await expect(executeStep(page, { action: "teleport" })).rejects.toThrow();
    expect(page.click).not.toHaveBeenCalled();
    expect(page.evaluate).not.toHaveBeenCalled();
  });
});

describe("runInteractions", () => {
  it("reads the JSON file and executes all steps in order", async () => {
    const page = mockPage();
    const calls = [];
    page.evaluate.mockImplementation(() => { calls.push("scroll"); });
    page.waitForTimeout.mockImplementation(() => { calls.push("wait"); });

    await runInteractions(page, join(FIXTURES, "interactions.json"));

    expect(calls).toEqual(["scroll", "wait"]);
  });

  it("throws when the file does not exist", async () => {
    const page = mockPage();
    await expect(
      runInteractions(page, join(FIXTURES, "nonexistent.json"))
    ).rejects.toThrow();
  });
});
