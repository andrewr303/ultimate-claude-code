---
name: react
description: React implementation, hooks, composition, UI states, React Doctor diagnostics, and render-performance traces. Use when building or fixing React/Next components, handling loading/error/empty states, scanning with react-doctor, or debugging re-renders.
license: MIT
metadata:
  author: ult-engineer
  version: "1.0.0"
  category: react
---

# React

Load this after the `ult-engineer` router names it. Then load only the named depth files.

## Depth

| Ask | Load |
|-----|------|
| Component design, hooks, state placement, React 19 | `../react-patterns/SKILL.md` |
| Loading / error / empty / optimistic UI | `../react-ui-patterns/SKILL.md` |
| Scan, `/doctor`, regression check, rule explain | `../react-doctor/SKILL.md` |
| Read-only audit + implementation plans | `../improve-react/SKILL.md` |
| Measured interaction / re-render trace | `../react-runtime/SKILL.md` |
| Three.js / R3F inside React | `../improve-threejs/SKILL.md` |

## Defaults when writing React

- Server vs client: data fetching stays on the server when the stack supports it; `"use client"` only for interactivity.
- One responsibility per component. Props down, events up. Composition over inheritance.
- Hooks at the top level, same order every render, clean up effects.
- State: `useState` / `useReducer` locally; Context for a subtree; TanStack Query / SWR for server state if the project already uses them; Zustand / Redux only if already in the tree.
- UI states: error → retry; loading only when there is no data; empty state when the list is empty. Never flash a spinner over cached data.
- Never swallow render/query errors.
- After React edits, prefer `npx react-doctor@latest --verbose --scope changed` when the project can run it, and fix regressions before calling the work done.

## Do not

- Add a new state library to a repo that already has one.
- Memoize by default. Measure (`react-runtime` / React Doctor) first.
- Invent React Doctor scores. Run the scanner or omit the number.
