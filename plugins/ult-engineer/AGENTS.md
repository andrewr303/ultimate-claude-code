# AGENTS.md

Ult Engineer is a router-first plugin. The default skill is `ult-engineer`.

## Route first

Load `skills/ult-engineer/SKILL.md` and follow its table. Load only the named specialists.

## Evidence

- Bugs: runtime (DAP, NDJSON logs, LoAF, failing test) before a fix.
- Refactors: characterization tests, then small slices, then the same tests.
- Reviews / health: scanner output is measured; your read of the code is judgment. Label both.

## Do not

- Invent compiler, CVE, complexity, or React Doctor numbers
- Mix a feature into a refactor
- Add a library the repo does not already use unless the user asked
- Leave `#region debug log` instrumentation in the tree
