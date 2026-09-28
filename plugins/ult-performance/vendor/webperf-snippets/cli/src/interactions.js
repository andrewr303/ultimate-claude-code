import { readFileSync } from "node:fs";

export async function executeStep(page, step) {
  switch (step.action) {
    case "scroll":
      await page.evaluate((y) => window.scrollBy(0, y), step.y ?? 300);
      break;
    case "click":
      await page.click(step.selector);
      break;
    case "hover":
      await page.hover(step.selector);
      break;
    case "type":
      await page.type(step.selector, step.text);
      break;
    case "wait":
      await page.waitForTimeout(step.ms);
      break;
    default:
      throw new Error(`Unknown interaction action: "${step.action}"`);
  }
}

export async function runInteractions(page, scriptPath) {
  const { interactions } = JSON.parse(readFileSync(scriptPath, "utf8"));
  for (const step of interactions) {
    await executeStep(page, step);
  }
}
