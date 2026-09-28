// Structural audit workflow — deterministic checks suitable for CI.
// These snippets return binary pass/fail results with no timing noise.
export const auditWorkflow = {
  id: "audit",
  title: "Structural Audit",
  steps: [
    // Tier 1 — Loading determinista
    { id: "render-blocking", path: "Loading/Find-render-blocking-resources" },
    { id: "resource-hints", path: "Loading/Resource-Hints-Validation" },
    { id: "preload-scripts", path: "Loading/Validate-Preload-Async-Defer-Scripts" },
    { id: "priority-hints", path: "Loading/Priority-Hints-Audit" },
    { id: "critical-css", path: "Loading/Critical-CSS-Detection" },
    { id: "ttfb", path: "Loading/TTFB-Sub-Parts" },
    { id: "script-parties", path: "Loading/First-And-Third-Party-Script-Info" },
    { id: "script-loading", path: "Loading/Script-Loading" },
    // Tier 2 — Media determinista
    { id: "lazy-atf", path: "Loading/Find-Above-The-Fold-Lazy-Loaded-Images" },
    { id: "lazy-conflict", path: "Loading/Find-Images-With-Lazy-and-Fetchpriority" },
    { id: "eager-below-fold", path: "Loading/Find-non-Lazy-Loaded-Images-outside-of-the-viewport" },
  ],
};
