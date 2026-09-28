# Setup and recovery

Project setup and session recovery use the existing `docs/plan/` graph and qualified `REQ-n/TASK-k` IDs. They do not create a second task system. Runtime entry point: `scripts/sdd.py`; artifact rules remain in `references/model.md`.

## Command boundary

Resolve `<plugin>` using `references/model.md`. Resolve `<target>` to the project being planned, never the installed plugin. Examples use `docs/plan` relative to that target; substitute an existing resolved root where appropriate. Replace placeholders and quote paths as needed. Put common flags **after the subcommand**.

```
python <plugin>/scripts/sdd.py setup --repo <target> --root docs/plan --title "Project title" --json
python <plugin>/scripts/sdd.py config --repo <target> --root docs/plan --json
python <plugin>/scripts/sdd.py doctor --repo <target> --root docs/plan --json
python <plugin>/scripts/sdd.py resume --repo <target> --root docs/plan --json
python <plugin>/scripts/sdd.py checkpoint --repo <target> --root docs/plan --task REQ-n/TASK-k --json
python <plugin>/scripts/sdd.py checkpoint --repo <target> --root docs/plan --task REQ-n/TASK-k --commit <sha> --files <repo-relative-path> ... --json
python <plugin>/scripts/sdd.py revert-plan --repo <target> --root docs/plan --task REQ-n/TASK-k --json
python <plugin>/scripts/sdd.py revert-plan --repo <target> --root docs/plan --target REQ-n --json
python <plugin>/scripts/sdd.py revert-plan --repo <target> --root docs/plan --target CHANGE-n --json
```

`...` represents additional file arguments, not a literal argument. `--commit` and `--files` are optional checkpoint arguments; `--files` without `--commit` is invalid. Revert-plan accepts exactly one of `--task` or `--target`, not both.

The recovery commands (`checkpoint`, `resume`, and `revert-plan`) emit JSON both with and without `--json`; their default human invocation is not a separate text format. Other subcommands may render text without `--json`. This does not change the base `plan.py handoff` draft format.

Setup creates missing project scaffolding. Checkpoint appends recovery state. Resume and revert-plan are read-only; neither command repairs artifacts, updates task status, executes tests, or mutates git. Config/doctor inspection does not authorize configuration rewrites or command execution.

For explicit commit scope or rollback, `--repo` must name the **git top-level directory**. Non-git and nested-directory checkpoint/resume calls remain supported but report unavailable git context; do not silently treat a parent repository as the declared target.

## Resumable, project-owned setup

1. Read the target's applicable instructions, README, existing context, configuration, and workflow. Those are project-owned inputs, not disposable generated files.
2. Bound reconnaissance to relevant root manifests and entry points. Follow only the paths needed to establish product scope, stack, existing modules, and documented commands. Skip secrets, generated output, dependency trees, and unrelated surfaces; record what was examined and skipped.
3. For brownfield work, cite `[verified]` observations with `path:line`. Label interpretations `[inferred]`; name unsupported or contradictory facts as unresolved gaps. Reading a test script proves the command is declared, not that tests pass.
4. For greenfield work, record the product intent and only evidenced or user-selected stack choices. No manifest is not permission to guess a framework, install tools, or invent build/test commands. Leave undecided choices open.
5. Run setup to fill missing scaffolding, including the project configuration and workflow. Preserve existing context/workflow and valid configuration values; defaults fill only a missing configuration file or missing keys. Reruns do not reset project choices. Report malformed or conflicting state instead of deleting it to make setup succeed.
6. Inspect config and doctor results. Report the artifacts created or preserved, effective project policy, unresolved gaps, and an appropriate next planning action. Missing context can be filled through `plan-context`; refreshes of existing context are targeted edits that preserve authored additions, not setup overwrites.

The workflow belongs to this project. Do not install global rules, replace repository instructions, force a style/language inventory, prescribe coverage targets without evidence, modify application code, initialize git, or create commits as setup side effects.

### Configuration contract

Configuration uses **schema version 1**. These values are project policy, not a claim that an agent host supports every execution capability:

| Setting | Accepted values | Default |
|---|---|---|
| `execution_mode` | `subagent` or `inline` | `subagent` |
| `parallelism` | `disjoint` or `serial` | `disjoint` |
| `tdd` | `required` or `off` | `required` |
| `max_review_rounds` | Integer from 1 through 5 | `3` |
| `test_commands` | Array of argv arrays, not shell strings | `[]` |
| `hooks.enabled` | Boolean | `true` |

Merge defaults only for a missing configuration file or missing keys. Preserve every existing valid value; reject unknown keys and invalid settings instead of replacing them with defaults or silently migrating them.

Record only evidenced test commands as argv arrays. For example, a verified `python -m unittest` invocation would be represented as `["python", "-m", "unittest"]` inside `test_commands`; the example is not a command recommendation. Setup, config, doctor, checkpoint, resume, and revert-plan never automatically execute recorded test commands. A stored command or enabled hooks setting is not permission for tests, installs, or git mutations.

## Checkpoints: observations and explicit associations

Checkpoint requires an existing qualified `REQ-n/TASK-k`. It writes a new append-only JSON record under `<plan-root>/runs/checkpoints/`, recording the timestamp, task, graph-derived Next, and git HEAD/dirty observations. Do not edit old records to make later checks pass.

A checkpoint is useful even when the task is unfinished or the working tree is dirty. It is not a completion transition, ownership proof, or a promise that undo is safe. It does not overwrite `HANDOFF.md`. Writing the checkpoint record can itself make git dirty; do not automatically commit, ignore, stash, or delete recovery records to make rollback eligible.

### Optional commit association

- `--commit` is an explicit input of **at least 7 hexadecimal characters**, never an automatic copy of observed HEAD. Resolve it through read-only git to a non-merge commit reachable from **current HEAD** and store its full 40- or 64-character git commit hash. Reject missing, ambiguous, unreachable, or merge commits rather than choosing another one.
- Without `--commit`, HEAD remains an observation only. Do not infer task ownership from HEAD, messages, timestamps, proximity to a task completion, or a clean working tree.
- An explicit association may be checkpointed without ownership proof. Keep that distinction visible: recording a commit does not certify it, and a later rollback preview must fail if proof remains unavailable.
- `--files` declares the **exact set of all commit changed paths**, not a subset or a directory scope. Use strict repository-relative paths with forward slashes; no directories, absolute paths, or traversal. It is valid only with `--commit` and cannot split a mixed-purpose commit into a safe task commit.
- Mixed path scope and multiple task ownership are unsafe. Ambiguous cross-task commit associations always refuse rollback, even when all associated tasks are included in the same multi-task target.

### Captured ownership proof

Capture proof only after all of these checks succeed for the checkpointed task:

1. The `complete` gate passes.
2. The current quality history record's `source_hashes` covers every commit changed path.
3. For every declared path, the working-tree source SHA256 matches both the review's source hash and the SHA256 of the raw commit blob bytes. The declared paths equal the complete commit changed-path set.

The checkpoint's `scope` stores this evidence:

| Field | Meaning |
|---|---|
| `files` | Mapping from each declared path to its source SHA256. |
| `review_scope` | List of source paths covered by the captured quality record. |
| `review.path` | Review document path. |
| `review.sha256` | Whole review document SHA256 at capture time; historical, not a requirement that the document never grow. |
| `review.record_hash` | Hash identifying the captured hash-linked quality history record. |

Thus `scope.review` contains `{path, sha256, record_hash}`. Later appends to the review document should not invalidate an earlier hash-linked history record merely because the whole document hash changed. At preview, the historical record must still exist in validated review history and agree with the checkpoint scope; the captured whole-document hash is not a substitute for that check.

Exact-byte matching is deliberate. Working-tree EOL or filter normalization differences from git blob bytes, deleted/renamed paths, or merges may require manual rollback analysis. Never run filters automatically to force ownership proof.

The review system verifies consistency and declared reviewer identity, not actual human or process honesty. Manually editing local state can forge claims; these records are **not signed provenance**. Do not present this consistency proof as tamper-proof authorship or independent confirmation of who performed the review.

Checkpoint and resume work without git, and nested-directory targets report unavailable git context. Explicit commit association and rollback require `--repo` at the git top-level; do not initialize a repository or silently widen the target to work around that boundary.

If no task exists, use resume to report current state rather than inventing a task. PreCompact hook machine snapshots are a separate mechanism; they do not justify fabricated task IDs or replace an authored handoff.

## Resume: live state over saved state

Read the project's existing `HANDOFF.md`, then run resume. The report includes setup gaps, current graph-derived Next, freshly evaluated complete-gate results, latest checkpoints, and the HANDOFF path. Fresh gate evaluation inspects current evidence/state; it does not execute recorded test commands.

Saved Next is historical. A checkpoint or narrative may describe a task that has since been blocked, completed, or changed. Derive today's Next from the live graph, and expose conflicts with authored notes rather than rewriting the notes or statuses.

Setup/resume report missing expected files and unset `test_commands` as gaps. Gaps do not by themselves make a valid resume fail: `ok` can be `true` while setup is incomplete. Report those gaps separately from malformed state, which produces errors and a nonzero failure. Preserve failing files and show diagnostics rather than treating malformed state as an empty successful plan. Resume never repairs setup, advances status, or overwrites a handoff.

For hook integrators, the top-level resume result contains `ok`, `errors`, `next`, `setup`, `reviews`, `checkpoints`, `git`, `handoff`, and `run`. `setup` contains `complete`, `missing`, and `gaps`; `checkpoints` contains `count`, `latest`, and `latest_by_task`. Inspect setup gaps and review results even when `ok` is true; a valid resume report is not proof of task completion or rollback safety.

## Authored handoff and machine state

`HANDOFF.md` is the human-readable distillate. Checkpoints are machine observations. Keep both; neither replaces the other.

1. Read the entire existing handoff before editing. Preserve authored decisions, constraints, open questions, and next-session warnings. If the file is absent, create a concise distillate rather than recreating a chat log.
2. From the **target repository**, obtain a read-only draft when useful:

   ```
   python <plugin>/scripts/plan.py handoff --root docs/plan
   ```

   This base command resolves its root from the working directory. Use the resolved target plan root; do not run it against the plugin's files.
3. Do not run base `handoff --write` unconditionally: it replaces `HANDOFF.md` and can clobber authored content. After reading, append or make targeted edits to record decisions, touched paths, open questions, and what the next agent must not redo. Keep historical Next observations labeled with their session context.
4. For a known task, use the companion `sdd.py checkpoint --task REQ-n/TASK-k` with the common flags shown above. Without a task, use resume and record the actual gap; do not fabricate an artifact.
5. At the next session, read HANDOFF and call resume again. Neither chat memory nor the saved Next is authoritative over today's graph.

Keep secrets out of both forms; environment key names only. Handoff does not change application code or task completion status.

## Revert-plan: conservative preview, never execution

Select an existing qualified task, REQ, or CHANGE. A REQ/CHANGE target is resolved through the existing graph; it is not a wildcard for commits whose messages mention that ID. **Every task** in a selected REQ/CHANGE needs an explicit commit association, including unfinished tasks. A missing association blocks the whole preview; do not silently omit those tasks.

For every selected task, run `check_task` at the `complete` gate again: fresh current verification must pass. Find the captured historical quality record in validated review history and check that it agrees with the checkpoint `scope`. Re-check commit reachability, the raw commit blobs, and the exact changed-path set against that scope. Current verification and the historical record are both required; neither substitutes for the other.

The preview suggests only exact explicit task-to-commit associations that pass these checks, ordered **newest-first by ancestry, not timestamps**. Incomparable branches refuse rather than receiving an arbitrary order. Cross-task ambiguity always refuses, including when the target contains every implicated task; selecting a larger target does not make shared ownership safe. Never guess ownership from HEAD, commit messages, timing, or completion status, and never execute git mutations.

Refuse the preview and emit **no rollback commands** when any selected scope is unsafe:

- Git is unavailable, `--repo` is not the git top-level, or the working tree is dirty, including dirtiness caused by checkpoint records.
- Any task lacks an explicit association, or a commit is ambiguous, missing from the repository, unreachable from current HEAD, or a merge.
- Commits cannot be ordered by ancestry because they lie on incomparable branches.
- The commit has mixed path scope, has multiple task owners, or its declared paths do not match the exact commit changed-path set.
- Fresh `check_task` complete verification fails, the captured quality record is absent from validated review history or disagrees with the checkpoint scope, or commit blob/source hashes do not match.
- The target, graph, or checkpoint state cannot be interpreted safely.

Do not emit partial safe subsets after a refusal, derive a broad reset from the checkpoint HEAD, or automatically commit/ignore/stash records to bypass dirty-state checks. Present the actual reason and the evidence needed; no fabricated commands on failure.

On success, show the exact runtime proposal as a preview for separate review. Do not execute git commands, rewrite history, create commits, edit application files, reset TASK/REQ statuses, rewrite context/truth specs, or update HANDOFF to simulate the rollback. Any reconciliation after a separately authorized rollback requires its own review; this skill remains preview-only.

**Completion is separate from rollback safety.** Passing the completion gate does not prove an exclusive task-to-commit association. An explicit checkpoint association does not prove completion. Neither condition alone authorizes an undo.

## Conceptual attribution

Conductor's setup/resume/workflow/revert concepts informed resumable missing-artifact setup, project-owned workflow guidance, explicit task-to-commit associations, and non-destructive rollback planning. These contracts are independently reimplemented on Ultimate SDD's existing graph and runtime; no Conductor CLI, destructive rollback behavior, forced style inventory, or fixed coverage policy is adopted.
