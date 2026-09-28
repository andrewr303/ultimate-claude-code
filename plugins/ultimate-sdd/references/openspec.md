# OpenSpec fold-in

Absorbs OpenSpec's **truth vs change** model without a second ID scheme.
Canonical build IDs stay `EPIC` / `REQ` / `TASK`. `SPEC-n` remains the display alias.

Historical source pointers: `OpenSpec-main/docs/concepts.md`, `overview.md`, `writing-specs.md`, `workflows.md`. These are **unshipped historical sources**, not executable dependencies or installed-plugin paths.
This plugin does **not** require the OpenSpec CLI. Do not write `openspec/` in the target repo. Shipped planning, execution, and recovery contracts are in `references/spec-quality.md`, `references/execution.md`, and `references/recovery.md`.

## Two folders

```
docs/plan/truth/<domain>/spec.md     how the system behaves *now*
docs/plan/changes/<slug>/            one proposed modification
docs/plan/changes/archive/           finished changes (date-prefixed)
```

**Truth** is the source of truth for *current* behavior. Organize by domain (`auth/`, `launches/`, `ui/`).

**A change** is one unit of work: proposal + optional design + delta specs + the REQs that implement it.

Archiving merges deltas into truth and moves the folder. Specs then describe the new reality.

## When to use which loop

| Situation | Loop |
|---|---|
| New product / no destination yet | Frame → Project → Specify → Scope → authorized Load/build → Verify |
| Existing system, behavior is changing | Explore → Propose → (Specify/Design/Scope as needed) → authorized Apply → Verify/review → authorized Archive |
| Pure refactor / docs, no behavior change | Propose with `skip_specs: true` → authorized Apply → Verify/review → authorized Archive (no merge) |

Do not force a CHANGE onto a greenfield Frame. Seed truth the first time a change archives ADDED requirements, or write truth from `prd-from-code` when authorized.

Explore (`/ultimate-sdd:explore`) writes no artifacts or scaffolding. Propose writes the change, not permission to build it. Planning-only requests stop at their requested artifact. Apply implements authorized linked TASKs and reports Archive as the next explicit action; Archive merges and files history only when requested or included in an authorized delivery pipeline.

## One change, one intent

Say the change in one sentence. If the proposal needs a lot of "and also", split.

Update the existing change when the intent is the same (narrower MVP, design correction). Start a new CHANGE when the intent flipped or the leftover work can ship alone. A correction requires actual authorization; never rewrite intended behavior to excuse a deficient implementation.

## Artifact flow (enablers, not gates)

```
proposal ──► deltas ──► optional design ──► REQs / TASKs ──► implement
   why         what           how              our IDs         apply
```

Dependencies show what becomes *possible*, not what is authorized. Skip `design.md` on trivial changes; use `plan-design` proportionately before implementation for genuine architecture uncertainty. A CHANGE uses its existing folder's `design.md`; a REQ may use `reqs/REQ-n-design.md`. Neither sidecar has frontmatter `id` or changes the graph/status vocabulary. Revisit artifacts when evidence warrants an authorized correction; substantive REQ/TASK edits invalidate implementation reviews and require fresh gates/review.

**Not relaxed:** Load needs the runtime gate, readiness 4–5, eligible REQ/TASK statuses, and both levels' blockers resolved. Implementation uses approved checks and TDD policy, independent spec review first, quality second, and complete gates before done. REQ/CHANGE closure also requires actual all-AC/scenario evidence, cumulative tests and independent cumulative reviews (`references/execution.md`). A checklist or `done` field alone is not proof.

## Delta specs

A delta describes the *diff*, not the destination. Live under `changes/<slug>/deltas/<domain>.md`.

```markdown
## Purpose
<!-- new capabilities only; seeds truth/<domain>/spec.md on archive -->

## ADDED Requirements

### Requirement: Launch Countdown
The system SHALL show a live countdown to the scheduled launch time on each list row.

#### Scenario: Future launch
- GIVEN a launch scheduled 90 minutes ahead
- WHEN the list renders
- THEN the row shows `T-01:30:00` updating each second
```

This excerpt illustrates one positive scenario. Cover positive, negative, and edge behavior (or a specific justified N/A) for each functional requirement under `references/spec-quality.md`.

| Section | Meaning | On archive |
|---|---|---|
| `## Purpose` | What a *new* domain is for | Becomes truth Purpose; ignored if truth already exists |
| `## ADDED Requirements` | New behavior | Appended |
| `## MODIFIED Requirements` | Existing behavior, full replacement text | Replaces the requirement of the same name |
| `## REMOVED Requirements` | Behavior going away | Deleted; last requirement + `retire_capabilities: true` deletes the truth file |

Pick the section by opening the current truth spec. ADDED on a name that already exists is an error (use MODIFIED). MODIFIED on a missing name is an error (use ADDED), and must contain the full replacement rather than a patch fragment.

Requirements are **behavior**, not code. One `SHALL`/`MUST` per requirement. Use concrete GIVEN/WHEN/THEN scenarios. RFC 2119: MUST/SHALL = hard, SHOULD = recommended, MAY = optional. Default to SHALL.

Keep library names, file paths, and step lists in `design.md` or the REQ — not in truth/delta requirements. Map source/decision → delta → REQ AC → owning TASK/check without inventing approval or verification evidence.

## CHANGE ↔ REQ

The change folder is packaging. Implementation still uses REQ/TASK.

- Propose may create REQ stubs from ADDED/MODIFIED requirements (`plan-project` from a CHANGE).
- Each implementing REQ lists `change: CHANGE-n`, and the CHANGE's `reqs:` lists it.
- Apply loads those TASKs; it does not invent a parallel task list.
- Optional `tasks.md` inside the change is a **checklist view** of the same TASKs (`REQ-n/TASK-k`), not a second ID space. TASK dependency keys stay local to the same REQ.
- Completion requires current evidence, not merely all linked REQs marked `done`. Keep the CHANGE `verifying` until cumulative checks/reviews and current per-TASK complete gates pass.

## Guarded sync and archive

Use only `plan.py archive` from the **target repo cwd**, substituting the resolved root and existing CHANGE selector. For archive, preview the same merge-and-move operation that will run:

```text
python <plugin>/scripts/plan.py archive --root <root> --change <slug> --move --dry-run --json
```

Inspect the actual result and ADDED/MODIFIED/REMOVED/created/retired effects. A failed dry-run blocks execution. Only when archive is authorized and checks pass, run without `--dry-run`:

```text
python <plugin>/scripts/plan.py archive --root <root> --change <slug> --move --json
```

For **sync-only**, omit `--move` in both commands; the folder stays active. Do not recommend direct `merge_deltas.py` invocation to bypass the guarded entry point, or a manual move/status edit without syncing. `skip_specs` skips the truth merge, not verification.

When `<root>/config.json` exists, the entry point calls the runtime change check during dry-run **and** execution: linked REQs/TASKs must exist, be done, and have fresh passing complete gates. Invalid config, unavailable runtime, missing/stale evidence, unfinished work, or failed gates block; do not warn-and-confirm past them. Confirmation, `--approve`, `--no-gate`, inline mode, and `skip_specs` cannot waive configured verification. The check does not run tests or certify cumulative reviews; the coordinator must supply actual cumulative proof before archive.

A config-free legacy plan retains base archive compatibility without the configured gate. Do not silently create config during grounding or remove it to bypass checks; explicit `/ultimate-sdd:setup` opts in. Config defaults returned for a missing file are not opt-in, and legacy success is **not equivalent certification**. Report verification gaps honestly.

After execution, inspect the resulting truth: ADDED names present, MODIFIED text matches its full delta, unrelated requirements unchanged, REMOVED names absent, and retired truth deleted only when explicitly allowed. For archive, verify the moved folder and `archived` status; never parallelize merge and move. Regenerate INDEX after authorized writes, validate, and derive Next. Failures need diagnosis, not a second unguarded route.

## Skip and retire

- `skip_specs: true` — no behavior change (refactor, chore, docs). Validator allows empty `deltas:`. Archive with `--move` moves the folder without touching truth, but configured completion and independent review still apply.
- `retire_capabilities: true` — required before archive will delete a truth file whose last requirement was REMOVED. Without it, merge aborts.

## Lite vs full

Most changes stay lite: short SHALL lines, concrete scenarios, clear non-goals.

Write the full form when a miss would be expensive. Cross-REQ behavioral impact belongs in proposal/deltas; migrations, security architecture, and API contracts belong in design/REQ. Design stays proportionate and optional, never an excuse to bypass unresolved build-blockers.

## Attribution

Concepts adapted from OpenSpec (MIT), Fission-AI / OpenSpec. We re-implemented them on `docs/plan/` so this plugin stays local-first and single-vocabulary.
