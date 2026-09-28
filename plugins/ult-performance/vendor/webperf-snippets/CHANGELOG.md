# Changelog

All notable changes to this project are documented here.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

### Fixed
- Add 14 missing entries to `pages/Loading/_meta.json` — pages were inaccessible from the sidebar
- Fix duplicate `const p75` declaration in `snippets/Interaction/Interactions.js`

### Added
- `eslint.config.mjs` with ESLint v10 flat config (separate globals for Node, browser, JSX)
- `npm run lint`, `npm run lint:fix`, `npm run validate` scripts
- Security headers in `next.config.js`: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`
- `CONTRIBUTING.md` contributor guide
- `CHANGELOG.md` (this file)

### Changed
- Logo in `theme.config.jsx` uses `maxWidth` instead of fixed `width` for responsive rendering

---

## [1.2.0] — 2026-03-18

### Added
- AI Agent Skills section in the introduction page
- `npm run install-from-release` script for installing skills from GitHub Releases

### Fixed
- Update Node to 22 and sync `package-lock.json` for CI

### Changed
- Reduce context duplication in WebPerf skills (−16.6% lines)

---

## [1.1.0] — 2026-03-17

### Added
- Minified skill scripts with console output stripped at build time
- Structured return values for all snippets (enables Agent Skill consumption)
- Progressive disclosure for skills (L2/L3 content split)
- `context: fork` added to all webperf skills
- External distribution via `dist/` directory with readable scripts
- GitHub Release workflow and remote skill installer

### Fixed
- Critical CSS Detection: use `renderBlockingStatus` to avoid false positives
- Sync `.claude/skills/` cleanly without preserving stale subdirectories
- Correct bugs and inconsistencies in Core Web Vitals snippets

### Changed
- Skills reorganized for agent-first consumption

---

## [1.0.0] — 2026-03-04

### Added
- Agent Skills system with `generate-skills.js` build script
- Intelligent workflows and decision trees for autonomous performance analysis
- Local skill installation via `npm run install-skills`
- Global skill installation via `npm run install-global`
- WebMCP support to expose snippets as structured tools for AI agents
- Lazy-load `CldVideoPlayer` on click to avoid loading video player on every page
- `snippets-registry` dynamic import chunk for easier identification

### Fixed
- Set intrinsic width/height on hero image to prevent CLS

---

[Unreleased]: https://github.com/nucliweb/webperf-snippets/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/nucliweb/webperf-snippets/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/nucliweb/webperf-snippets/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/nucliweb/webperf-snippets/releases/tag/v1.0.0
