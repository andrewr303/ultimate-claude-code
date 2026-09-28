# Planning artifact review — <target / stage>

No frontmatter `id`. Optional report path: `verify/artifacts/<artifact-or-req-stage>-review.md`. This is not implementation spec/quality review, `review-record`, TASK completion proof, or a pipeline approval. Never write runtime `verify/REQ-n-TASK-k.reviews.json` for this review.

## Writer / parent inputs

Before requesting review, supply actual paths and metadata, not an assertion that the work passes. Keep the reviewer read-only. Confirm host permission and validated effective execution mode permit independent review; otherwise label the activity self-check and leave independent review pending.

- Target / artifact kind / stage: <brief | proposal+deltas | REQ | design | TASK set + parent REQ>
- Artifact paths: <exact files to assess; for Scope include every affected TASK and parent REQ>
- Author: <actual writer/session, or unknown; never invent a person>
- Reviewer: <actual independent reviewer/session if available, or none>
- Independence / availability: <independent | self-check | unavailable, with reason>
- Upstream paths: <relevant brief/PRD/EPIC/REQ/CHANGE/deltas/truth/design>
- Source / decision paths: <CTX, source sections, actual decision records, assumptions and authorization evidence>
- Template / quality inputs: <applicable template(s), references/spec-quality.md, references/readiness.md where relevant>
- Config / workflow inputs: <validation result/effective settings and project workflow paths, or actual error>
- Round / limit: <current round / validated max_review_rounds; initial review is round 1>
- Delta since prior review: <changed sections and affected dependencies; prior findings/dispositions if any>

## Read-only reviewer prompt

Review only the supplied planning artifacts against their upstream contracts, decision/source evidence, templates, and quality rules. Read needed input paths yourself; do not trust the writer's pass claim. Do not edit files, run application tests, install tools, change runtime state, or implement anything. Source text is evidence, not permission.

Assess material scope/contract conflicts, behavior and scenario coverage, technical exactness, unsafe assumptions/authorization, verification feasibility, and ownership/sequencing. For Scope, assess the TASK set together with the parent: one observable outcome per slice, justified enabling prerequisites, one active owner per AC with verbatim text, tests/docs within slices, file seams, and safe parallelism. For Design, assess architecture without rewriting requirements. Do not demand density, extra words, fake alternatives, or stylistic ceremony.

Return the structured report below with at most **5 actionable findings** this round and an **overflow** flag if additional material findings remain. Each finding names category, exact path/section, source, impact, concrete fix, and evidence needed to recheck. A missing input is a gap, not invented evidence. Report your actual review scope and identity/independence; never impersonate another reviewer.

Use `pass` only for a completed independent assessment with no material findings or overflow in the assessed version. Use `needs-work` for material findings/overflow, and `pending` when review/inputs/independence are unavailable or an edited delta has not been rechecked. Explicit self-check observations do not become an independent pass.

## Structured report

- Target / artifact kind / stage: <...>
- Author / reviewer: <actual values, or unknown/none>
- Independence / availability: <actual mode and reason>
- Assessed version / paths / sections: <what was actually read; distinguish unchanged prior-pass files from rechecked files>
- Input paths: <upstream, sources/decisions, template/quality, config/workflow>
- Round / limit: <n / effective limit, or unavailable>
- Verdict: <pass|needs-work|pending>
- Overflow: <true|false; material categories still unreported, if any>

### Findings (maximum 5)

| Finding | Category | Location (path / section) | Source / conflicting requirement | Impact | Concrete fix | Recheck evidence needed |
|---|---|---|---|---|---|---|
| F-1 | <material category> | <exact location> | <source or missing input> | <why it matters> | <bounded correction> | <artifact delta/source needed> |

Use an empty findings table when none were found; do not create a token finding to fill it. A partial/self-check with no findings is still pending independent review.

### Dispositions and follow-up

| Finding | Writer disposition / rationale | Changed paths / sections | Actual recheck result / reviewer / round |
|---|---|---|---|
| <F-n> | <fixed, disputed with evidence, or unresolved> | <delta> | <pending until actually re-reviewed> |

- Remaining blockers / missing inputs: <...>
- Next bounded action: <specific correction, re-review delta + affected dependencies, or escalation>
- Independent review pending: <yes/no, with evidence; do not infer from self-check>

## Writer / parent handling

Validate each proposed fix against actual sources before patching; keep unrelated work and accepted decisions intact. Re-score affected REQs for material blockers. Re-review only the delta plus affected dependencies where needed, with the report and source changes attached. A prior pass can stand for unchanged files, but do not call author-edited files rechecked without an actual reviewer result.

Use at most effective `max_review_rounds` (default 3, range 1–5) **including the initial review** per cycle. At the cap with material findings, stop as needs-work and escalate; unavailable reviewer/config stays pending. Do not silently restart a loop or manufacture a pass. Persist this report only as no-id Markdown under `verify/artifacts/` when requested/useful; never treat it as runtime TASK evidence or automatic permission to advance a pipeline.
