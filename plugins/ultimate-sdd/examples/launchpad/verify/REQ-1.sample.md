---
id: VERIFY-REQ-1
req: REQ-1
iteration: 1
created: 2026-08-16
updated: 2026-08-16
---

# Verification — REQ-1 (sample shape)

Against the written AC, not memory.

## Criteria

- [x] **AC-1** Authorization header + typed results
  - Verdict: pass
  - Proof: `lib/ll2.test.ts` `sends token header` (not run in this plugin repo — example only)
- [x] **AC-2** Missing key throws, no fetch
  - Verdict: pass
  - Proof: `lib/ll2.test.ts` `refuses without key`
- [ ] **AC-5** 10-minute cache
  - Verdict: fail
  - Proof: second call in the same process hit the mock twice — `revalidate` not passed
- [x] **AC-7** `.env.example` documents keys
  - Verdict: pass
  - Proof: `.env.example` lines 1–8

## Result

- Passed: 3
- Failed: 1
- Blocked: 0

## Sent back

| Task | Failed AC | Context to attach |
|---|---|---|
| TASK-2 | AC-5 | `fetch` called without `{ next: { revalidate: 600 } }` in `lib/ll2.ts` |

## Spec patches

None — the AC is correct; the implementation is not.

## Next

Reload REQ-1/TASK-2 with the send-back note.
