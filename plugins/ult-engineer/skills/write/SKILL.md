---
name: write
description: Implement new TypeScript, React, Node.js, and JavaScript features that match the existing repo. Use when asked to add a feature, scaffold a module, write an API, build a component, or implement a change — not when the primary ask is a bug, refactor, or review.
license: MIT
metadata:
  author: ult-engineer
  version: "1.0.0"
  category: software-engineering
---

# Write

Implement the requested change in the style of this repository. Load this after the `ult-engineer` router names it.

## Workflow

1. **Detect stack.** Read `package.json`, `tsconfig.json`, and 2–3 neighboring files. Record runtime, framework, test runner, import style, and error-handling idiom.
2. **Load domain specialists** for the detected stack:
   - TypeScript types / tsconfig → `../typescript/SKILL.md`
   - React UI / hooks / RSC → `../react/SKILL.md`
   - Node servers / jobs / auth → `../nodejs/SKILL.md`
   - Plain JS / ES6+ → `../javascript/SKILL.md`
3. **Design the smallest contract.** Types and public signatures first. Represent only valid states (tagged unions, not optional-flag soup).
4. **Implement in the local idiom.** Match naming, file layout, and libraries already in the tree. Do not add a dependency the project does not already use unless the user asked for it.
5. **Cover with tests** in the project's runner. Load `../test/SKILL.md` when writing non-trivial tests.
6. **Verify.** Run the project's typecheck and the tests that cover the change.

## Hard rules

- Do not refactor unrelated code while implementing.
- Do not introduce `any`. Prefer `unknown` at boundaries and narrow.
- Do not swallow errors. Surface failures the way neighboring modules do.
- Do not claim the feature works if typecheck or tests were not run.

## Output

Route table from `ult-engineer`, plus the files changed, the contract added, and the verification commands.
