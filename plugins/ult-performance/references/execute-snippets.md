# Execute measurement snippets

Use this protocol whenever a skill names a file under `skills/<skill>/scripts/*.js`.

## Tool routing

Prefer capabilities already available. Do not block on optional MCP setup.

| Need | Preferred | Fallback |
|------|-----------|----------|
| Page-load or interaction diagnosis | Browser performance trace. Chrome DevTools MCP: `performance_start_trace` then `performance_analyze_insight` | Lighthouse CLI lab run; PageSpeed Insights for a public URL |
| Field Core Web Vitals | CrUX in the current trace summary | PageSpeed Insights / CrUX Vis; CrUX API only if a key already exists |
| Targeted metric or DOM audit | Evaluate the named snippet (below) | Ask the user to paste the snippet in DevTools console and return the JSON |
| Accessibility, SEO, Best Practices, Agentic Browsing | Live Lighthouse. Chrome DevTools MCP: `lighthouse_audit` (excludes performance) | `npx lighthouse <url> --only-categories=...` |
| Rendered semantics | Accessibility snapshot. Chrome DevTools MCP: `take_snapshot` | Manual browser check |
| Static HTML smoke test | `skills/audit/scripts/analyze.sh <path>` | Direct source inspection |

Do not route performance through `lighthouse_audit`.

## Evaluate a snippet

1. Read the script file from the skill's `scripts/` directory.
2. Navigate to the exact URL and state under test.
3. Evaluate the full script source in the page.
   - Chrome DevTools MCP: `evaluate_script` (await promises).
   - Other browsers: equivalent JS evaluation in the page context.
4. Use the **return value**, not console styling. Shape: [schema.md](schema.md).
5. If `status` is `tracking`, trigger the required user action (click, type, scroll), then evaluate `getDataFn()`.
6. If `status` is `error` and the page may not have painted yet, wait for load and retry once.
7. Follow the calling skill's decision tree. Do not skip a follow-up snippet the tree names.

## Evidence labels

| Source | Label as |
|--------|----------|
| CrUX p75 | Field |
| First-party RUM | Field |
| Trace / Lighthouse / snippet in this session | Lab |
| Source inspection with no runtime | Hypothesis |

A snippet result is one lab session. Never report it as "users experience X".

## After a fix

Re-run the same snippet or trace under the same conditions. Field verification stays pending until a new CrUX/RUM window exists.
