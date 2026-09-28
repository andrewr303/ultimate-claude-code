// Loading performance workflow — timing-sensitive measurements requiring a real page load.
// Complements the audit workflow (deterministic structural checks) with live metrics.
export const loadingWorkflow = {
  id: "loading",
  title: "Loading Performance",
  steps: [
    { id: "TTFB", path: "Loading/TTFB" },
    { id: "FCP", path: "Loading/FCP" },
    { id: "render-blocking", path: "Loading/Find-render-blocking-resources" },
    { id: "resource-hints", path: "Loading/Resource-Hints-Validation" },
    { id: "scripts", path: "Loading/Script-Loading" },
    { id: "fonts", path: "Loading/Fonts-Preloaded-Loaded-and-used-above-the-fold" },
  ],
};
