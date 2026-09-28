# Review queue — showcase fixture

Synthetic, standalone product-UI proof for the `ui-component-expert` plugin.
All names, requests, and dates are fictional (anchored to 2026). This fixture
is not a real product and makes no network calls; fonts are system stacks and
there are no external assets, CDNs, or component-kit dependencies.

## What's inside

- **Public API** (`src/index.ts`): typed `RequestQueue`, `RequestDialog`,
  `RequestForm` components plus the domain types (`RequestRecord`,
  `RequestFormValues`, `RequestFormSubmitResult`, sort keys, …).
- **Demo** (`src/App.tsx`): a "Review queue" operations workspace — semantic
  table with caption, sortable headers, text + status filters, pagination,
  selected/expanded detail; create-request flow through a native
  `<dialog>.showModal()`; light/dark themes from semantic CSS tokens.
- **State harness** (`src/components/harness/StateHarness.tsx`): every
  applicable control state rendered live, with mirrored hover/active/focus
  samples and N/A rows that name the reason a state does not apply.
- **Tests** (`tests/`): Vitest + Testing Library + jsdom, covering the
  public outcomes (filter, sort, page, form validation/async submit/retry,
  modal open/cancel/focus-return, end-to-end create flow).

## Requirements

Node.js 20+ (built and tested on Node 24 / npm 11).

## Run it

All commands run from this directory. Installs are fully local: `node_modules`,
`package-lock.json`, and the npm cache stay inside this fixture; nothing is
installed globally.

```bash
npm install --ignore-scripts --cache ./.npm-cache
npm run dev        # vite dev server
npm run typecheck  # tsc --noEmit
npm run build      # vite build (dist/)
npm test           # vitest run
```

## Notes and honest limits

- `RequestDialog` relies on native `<dialog>` semantics: `showModal()` gives
  background inertness, focus containment, the top layer, and the Escape
  cancel path. The component adds state sync, close reason, initial focus,
  and focus restoration; it does not reimplement the trap, and jsdom cannot
  verify native inertness.
- Motion is compositor-only (transform/opacity) and gated behind
  `prefers-reduced-motion: no-preference`. Controls are ≥44px tall.
- Responsive rules are authored for 320/390/768/1440; **no visual or
  browser verification was performed in the environment that produced this
  fixture** — checks are typecheck, build, and jsdom behavior tests only.
