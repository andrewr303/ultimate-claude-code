# WebPerf Snippets — Improvement Plan

Generated: 2026-03-27

Track progress phase by phase. Clear context between phases and resume from this file.

---

## Phase 1 — Fix navigation (critical) `[x]`

**Problem:** `pages/Loading/_meta.json` has 13 pages registered but 27 `.mdx` files exist. 14 pages are invisible in the sidebar.

**File to edit:** `pages/Loading/_meta.json`

**Missing entries to add (with correct titles):**

| Key | Title |
|-----|-------|
| `Content-Visibility` | `Content Visibility` |
| `Event-Processing-Time` | `Event Processing Time` |
| `Find-Above-The-Fold-Lazy-Loaded-Images` | `Find Above The Fold Lazy Loaded Images` |
| `Find-Images-With-Lazy-and-Fetchpriority` | `Find Images With Loading Lazy and Fetchpriority` |
| `Find-non-Lazy-Loaded-Images-outside-of-the-viewport` | `Find non Lazy Loaded Images outside of the viewport` |
| `Find-render-blocking-resources` | `Find render-blocking resources` |
| `First-And-Third-Party-Script-Info` | `First And Third Party Script Info` |
| `First-And-Third-Party-Script-Timings` | `First And Third Party Script Timings` |
| `Fonts-Preloaded-Loaded-and-used-above-the-fold` | `Fonts Preloaded, Loaded, and Used Above The Fold` |
| `Get-Your-Head-in-Order` | `Get your <head> in order` |
| `Inline-CSS-Info-and-Size` | `Inline CSS Info and Size` |
| `Inline-Script-Info-and-Size` | `Inline Script Info and Size` |
| `Resource-Hints` | `Resource Hints` |
| `Script-Loading` | `Scripts Loading` |

**Acceptance criteria:**
- All 27 Loading pages appear in the sidebar
- Existing page order preserved
- No broken links

---

## Phase 2 — Scripts and tooling `[x]`

**Problem:** ESLint is a devDependency but no lint script exists. `npm test` fails with an error message. No validation pipeline.

### 2a. `package.json` — add scripts

```json
"lint": "eslint . --ext .js,.jsx,.mdx",
"lint:fix": "eslint . --ext .js,.jsx,.mdx --fix",
"validate": "npm run lint && npm run build"
```

Replace the `test` placeholder:
```json
"test": "echo \"No tests configured\""
```

### 2b. `next.config.js` — add security headers

Add `headers` export with:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `Referrer-Policy: strict-origin-when-cross-origin`

### 2c. `theme.config.jsx` — responsive logo

Line 11: replace `style={{ width: "200px" }}` with a responsive CSS approach (max-width + height auto).

**Acceptance criteria:**
- `npm run lint` runs without errors
- `npm run validate` runs lint + build successfully
- Security headers verified with curl or browser devtools
- Logo renders correctly at all viewport sizes

---

## Phase 3 — Project documentation `[x]`

**Problem:** No contributor guide, no version history.

### 3a. `CONTRIBUTING.md`

Include:
- How to add a new snippet (file + `_meta.json` + snippet JS)
- How to run locally (`npx next dev`)
- PR checklist
- Code style notes (kebab-case files, `copy` prop in code fences)
- How skill generation works (`npm run generate-skills`)

### 3b. `CHANGELOG.md`

Retroactive entries for:
- `v1.2.0` — AI Agent Skills section added
- `v1.1.0` — version bump
- `v1.0.0` — initial release

Use [Keep a Changelog](https://keepachangelog.com) format.

**Acceptance criteria:**
- `CONTRIBUTING.md` covers the full "add a snippet" workflow
- `CHANGELOG.md` follows Keep a Changelog format

---

## Phase 4 — SEO enhancements `[x]`

**Problem:** Good base SEO (OG, Twitter cards, sitemap) but missing structured data for individual pages.

### 4a. Breadcrumb schema

Add `BreadcrumbList` JSON-LD to `theme.config.jsx` or via a page wrapper component.

### 4b. Article schema for MDX pages

Each snippet page should emit an `Article` schema with:
- `name` (page title)
- `description` (meta description)
- `author` (Joan Leon)
- `url` (canonical URL)

**Acceptance criteria:**
- Google Rich Results Test passes for a sample page
- No schema validation errors

---

## Notes

- Phases are independent — each can be a separate PR
- Resume from this file at the start of each phase
- Mark phase as done by replacing `[ ]` with `[x]`
