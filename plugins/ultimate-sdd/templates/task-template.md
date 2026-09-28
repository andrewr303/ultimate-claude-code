---
id: TASK-1
req: REQ-1
title: <name>
status: planned
blocked_by: []
blocks: []
ac: [AC-1]
created: YYYY-MM-DD
updated: YYYY-MM-DD
---

# REQ-1 / TASK-1 — <Name>

## Goal

<One observable, independently verifiable outcome and its done-when, spanning only relevant layers. Completing a checklist or docs alone does not prove the outcome.>

## Slice

- Kind: <vertical|enabling>
- Enabling rationale: <only if enabling: why this true prerequisite cannot be bundled with its consumer, and its standalone observable AC/check; otherwise N/A>
- Consumer: <named TASK/REQ outcome enabled, only if enabling; otherwise N/A>

## Context

- Parent: REQ-n — <owned outcome, FRs and source/decision D-n pointers>
- Inputs: <relevant catalog/platform/CTX/upstream paths>
- Config: <plan-root/config.json; validated effective execution/parallelism/TDD policy, or pending/error>
- Workflow: <plan-root/workflow.md and actual verification-method sources>
- Design: <relevant REQ/CHANGE design link or settled existing pattern>
- Reuse: <actual existing files/modules>
- Do not: <out of scope; AC owned by other TASKs may be cross-referenced, not claimed>
- Env: <key names only>

## File scope and integration

| Owned file / surface | Change | Integration seam / provider / consumer |
|---|---|---|
| <path> | <why it belongs to this outcome> | <contract and dependent task, if any> |

- Sequencing: <mutual blocked_by/blocks, no cycles; preserve existing/active/done tasks and IDs>
- Parallelism: <effective serial or disjoint; proof of non-overlap and independence, otherwise serialization reason>

## Steps

1. <Plan this outcome's tests/checks using actual tooling and effective TDD policy; state what would fail before implementation. Do not execute during Scope.>
2. <Implement the owned behavior across only needed layers/files and integration seams; do not expand scope or mutate git.>
3. <Include relevant documentation updates in this slice (paths and expected change), or explain why none is needed.>
4. <During authorized implementation, verify the owned AC with the evidenced methods below; capture actual results, not assumed success.>

## Acceptance criteria owned

The frontmatter `ac` list is the ownership contract. Each parent AC has one active owner. Copy the full original Given/When/Then text verbatim; retain stable IDs. Do not invent criteria or duplicate completed ownership on re-scope.

- **AC-n** Given <original precondition>, When <original action>, Then <original observable>

## Verify

Methods come from actual config `test_commands` argv arrays, workflow or repo evidence, or an authorized reproducible observation. An empty command list is not permission to invent tooling. Missing prerequisites/methods are gaps, not guessed commands. Planning lists methods; it does not run tests/TDD or claim completion.

| Owned AC | Method / argv or observation | Source / cwd | Prerequisites | Expected result |
|---|---|---|---|---|
| AC-n | <actual command or reproducible steps> | <config/workflow/repo path and working directory> | <available fixture/tooling/authorization> | <observable result proving the AC> |

## Evidence

Planning only — not run. Leave proof empty until authorized implementation/verification records actual results; no fabricated passes or completion by checklist.

| Owned AC | Actual result | Proof |
|---|---|---|
| AC-n | | |

## Send-back

If blocked during implementation, set status `sent-back`, write the blocker below, stop. During Scope, report planning gaps without pretending implementation began. Refine the REQ before introducing missing AC.

**Blocker:** —
