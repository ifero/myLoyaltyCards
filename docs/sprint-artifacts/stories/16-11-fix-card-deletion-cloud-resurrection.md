# Story 16.11: Fix card-deletion cloud resurrection (deletion-aware cloud sync)

Status: review

Epic: 16 — Platform & Tech Debt

## Story

As a signed-in user who deletes a loyalty card,
I want the deletion to persist through cloud sync,
so that deleted cards never reappear on the next cold open or pull-to-refresh.

## Context

Reported by ifero (Sprint 17 defect): a signed-in user deletes a card, and it **resurrects** on the next `useCloudSync` — cold-open auto-sync or pull-to-refresh. Confirmed in code (2026-07-11; file:line verified against current `main`).

**Two uncoordinated sync engines:**

- **Engine A — `useCloudSync` (deletion-BLIND).** `performSync` (`shared/hooks/useCloudSync.ts:133-191`) calls `downloadCloudCards` → `mergeCards` (`core/sync/cloud-sync.ts:318-443`), which re-adds any cloud-only card as "new" (`:337-340`) → `batchUpsertCards` (`INSERT OR REPLACE`, `core/database/card-repository.ts:210-242`) resurrects it locally. It **never** drains `syncPendingDeletions` nor calls `deleteCardFromCloud`. It owns the exact reported triggers: cold-open auto-sync (`:297-302`), pull-to-refresh `forceSync` (`features/cards/components/CardList.tsx:67-75`), settings sync, retry.
- **Engine B — `useAutoSync` (deletion-AWARE).** `processPendingSync` (`core/sync/sync-trigger.ts:71-156`) drains deletions (`:127-143`) — but it is **dirty-gated and does NOT fire on cold open** (interval / foreground / reconnect only), so it never runs in the reported scenario, or runs too late.

**The delete itself** (`features/cards/hooks/useDeleteCard.ts:56-110`): for signed-in users, `addPendingDeletion(cardId)` enqueues into AsyncStorage (`core/sync/deletion-tracker.ts`), then a **HARD delete** removes the row (`core/database/card-repository.ts:155-160`) — there is **no tombstone / `deletedAt` column**. Deletion state lives ONLY in the queue.

**The dead fix already in the repo:** `mergeWithDeletions` (`core/sync/cloud-sync.ts:470-523`) was purpose-built (Story 7.6) to filter pending-deletion cards out of both sides and compute `cloudDeletions` — but it has **zero production callers** (grep-confirmed: only its definition, the `core/sync/index.ts` barrel export, and its unit tests in `conflict-resolution.test.ts:273-369`). ifero's directive: **revive it.**

**Throttle nuance (dictates where the fix must live):** `downloadCloudCards` sets `lastCloudSync` at its end (`:595`), so on a non-force cold open the subsequent upload is throttled out — cold open is effectively **download-only**. Therefore the deletion drain must live in the **download path**, or it gets throttled away.

Cousin of **Story 16-8**, which moved `useCloudSync` onto a module-level singleton store (`useSyncExternalStore`) with latch-on-success + in-flight guards. This fix must coordinate with that store, not fight it.

## Architecture Decision — AD-16-11-01: make the download path deletion-aware by reviving `mergeWithDeletions`

**Decision.** Make `downloadCloudCards` deletion-aware: swap `mergeCards` → `mergeWithDeletions`, drain the resulting `cloudDeletions` via an injected `deleteCardFromCloud`, and clear only the drained ids on full success. Wire the real dependencies through `useCloudSync.performSync`. This directly satisfies the "revive `mergeWithDeletions`" directive, fixes **both** reported triggers (cold-open + pull-to-refresh both flow through `downloadCloudCards`), and leaves 16-8's singleton store, latch, cooldown, `downloadedCount`, and force semantics intact.

**Rejected — Option B (route cold-open through `processPendingSync`).** Engine B is delta-based, uses a different timestamp key (`cloudSyncLastSyncAt` vs `lastCloudSync`), has no cooldown, and reports no `downloadedCount` — swapping it into the singleton store would re-plumb 16-8's just-shipped latch/throttle/count/force semantics (large blast radius) and wouldn't revive `mergeWithDeletions`.

**Backward-compatible by construction:** `mergeWithDeletions(local, cloud, [])` with an empty deletion list is behaviorally identical to `mergeCards`, so all existing `downloadCloudCards` call sites/tests are unaffected.

## Acceptance Criteria

1. **(Root cause)** Given a signed-in user who deleted a card (id in `syncPendingDeletions`, hard-deleted locally, still present in cloud), When the next `useCloudSync` runs (cold-open auto-sync OR pull-to-refresh `forceSync`), Then the card is **NOT** re-added locally and does **NOT** reappear in the UI.
2. Given the same state, When that sync completes, Then the card is deleted from the cloud (`deleteCardFromCloud`) and does not return on a later full fetch.
3. Given all cloud deletions in a run succeed, Then those ids are removed from `syncPendingDeletions`; Given a cloud deletion fails, Then those ids are **retained** for retry AND the local merge still excludes them (no local resurrection).
4. Given `mergeWithDeletions` was dead code, Then it is wired into the production download path; and `downloadCloudCards` with no pending deletions behaves **exactly** as before (LWW merge unchanged).
5. Given guest mode (no queue, unauthenticated), Then behavior is unchanged — no drain, no cloud calls.
6. Given 16-8's singleton store, Then latch-on-success, cross-instance single-fire dedup, in-flight guards, `forceSync` (no retry), `downloadedCount`, and the cooldown throttle are all preserved.
7. Given happy-path sync (adds/edits, no deletions) and conflict resolution (LWW, tie→cloud, malformed/future timestamps), Then all existing behavior is unchanged.
8. Tests cover the delete→sync→no-resurrection regression (real-SQLite), the cloud-deletion drain, partial-failure queue retention, guest no-op, and no regression to 16-8. `yarn lint` / `typecheck` / `test` pass; coverage ≥80% held.

## Tasks / Subtasks

- [x] **T1** (AC 1,2,3,4) `core/sync/cloud-sync.ts`: extend `DownloadCloudCardsOptions` (`:266-269`) with an optional `deletions` bundle `{ getPendingDeletions, deleteFromCloud, removeDrained }`; in `downloadCloudCards` swap `mergeCards` → `mergeWithDeletions(local, cloud, pendingDeletions)` (`:591`); drain `cloudDeletions` via `deleteFromCloud`; remove drained ids only if ALL succeed; keep setting `lastCloudSync` (`:595`).
- [x] **T2** (AC 1,2,6) `shared/hooks/useCloudSync.ts` `performSync` (`:155-181`): import `getPendingDeletions` + `removePendingDeletions` from `@/core/sync` and `deleteCardFromCloud` from `@/shared/supabase/cards`; pass the `deletions` bundle into **both** the force and non-force `downloadCloudCards` calls. No other store change.
- [x] **T3** (AC 3) `core/sync/deletion-tracker.ts`: add `removePendingDeletions(ids: string[])` (+ barrel export) that clears only the drained ids (avoids losing a deletion enqueued mid-sync). [Open decision #1 — recommended]
- [x] **T4** (AC 1,4) `core/sync/sync-trigger.ts` `processPendingSync` (`:112`): switch its `mergeCards` → `mergeWithDeletions` too, unifying both engines on the deletion-aware merge and closing the delta edited-then-deleted variant. [Open decision #2 — recommended in-scope; may drop to a documented fast-follow] — **DONE, folded into this story per ifero (2026-07-13).** Ships BOTH coupled changes: the deletion-aware merge in `processPendingSync` AND a targeted `removePendingDeletions(pendingIds)` clear (wired at `shared/hooks/useAutoSync.ts`) that replaces the blind `clearPendingDeletions()`, closing the pre-existing Engine B blind-clear race. See Open Decision #5.
- [x] **T5** (AC 8) Tests — real-SQLite regression + unit (see Dev Notes → Test Plan).
- [x] **T6** (AC 6,8) Update `useCloudSync.test.ts` mocks/assertions for the new `downloadCloudCards` call shape + new imports; confirm 16-8's 32 tests stay green (the `toHaveBeenCalledWith` assertions at `:147,:320,:338` gain the options arg).
- [x] **T7** (process) On completion set the story `.md` Status → `review` (yaml stays `in-progress` until merge, per the `mark-story-done` invariant); populate Dev Agent Record. — Done: `.md` Status is `review`; `sprint-status.yaml` intentionally kept at `in-progress`; Dev Agent Record populated. Committing/pushing/PR paused pending ifero's review per the gate protocol.
- [ ] **T8** (AC 1) Device smoke test (signed-in: delete → relaunch → stays gone; delete → pull-to-refresh → stays gone) — stakeholder (ifero), next RC.

## Dev Notes

### Fix location & idempotency

The drain lives in `downloadCloudCards` (not near upload) because cold open is download-only under the `lastCloudSync` throttle (`:595`, upload throttle `:96-107`). Deletion is idempotent: `deleteCardFromCloud` on an already-deleted row returns `error: null` (deleting 0 rows is not an error), and clearing an already-cleared id is a no-op — so Engines A and B draining the same queue is safe.

### References (verified 2026-07-11 against `main`)

- `core/sync/cloud-sync.ts` — `mergeCards` `:318-443` (blind re-add `:337-340`), **`mergeWithDeletions` `:470-523` (revive)**, `downloadCloudCards` `:529-604` (merge `:591`, throttle set `:595`), options `:266-269`. Note `mergeWithDeletions.localDeletions` is always `[]` (`:494-522`) — cross-device delete is out of scope (see Open Decisions #4).
- `shared/hooks/useCloudSync.ts` — `performSync` `:133-191`, download/persist/upload `:155-181`; 16-8 store internals (latch `:94`/`:239-241`, in-flight guards, `SyncBusyError` quiet-bail `:216-246`, `forceSync` no-retry `:264-265`, sign-out reset `:289-293`, `__resetCloudSyncStoreForTests` `:44,:82`). Mounted at 3 sites: `HomeScreen.tsx:34`, `CardList.tsx:61`, `useSyncTrigger.ts:11`.
- `core/sync/sync-trigger.ts` — `processPendingSync` `:71-156`, deletion drain `:127-143`, blind merge `:112`.
- `core/sync/deletion-tracker.ts` — queue (`syncPendingDeletions`); add `removePendingDeletions`.
- `shared/supabase/cards.ts` — `deleteCardFromCloud` `:75-87`.
- `features/cards/hooks/useDeleteCard.ts` `:56-110`; `core/database/card-repository.ts` hard delete `:155-160`, `batchUpsertCards` `:210-242`.
- Integration-test pattern: `core/database/card-repository.integration.test.ts:40-61` (`makeRealDb()` over `better-sqlite3` + `runMigrations(db)`).
- Format precedent: `docs/sprint-artifacts/stories/16-8-fix-cloud-sync-cold-open-race.md`.

### Test Plan

- **Real-SQLite regression (AC1):** add `core/sync/cloud-sync.integration.test.ts` (`better-sqlite3` + `runMigrations`, co-located, no `__tests__`). Seed 2 cards; hard-delete cardX; `addPendingDeletion(cardX)`; cloud fetch returns cardX + survivor; run the **real** `downloadCloudCards` with the deletion bundle → assert `getAllCards()` excludes cardX. (A string-match unit test would miss the `INSERT OR REPLACE` resurrection — this is why the 9.x stories established real-DB integration tests.)
- **AC2:** assert injected `deleteFromCloud` called with `(cardX, userId)`.
- **AC3 partial failure:** `deleteFromCloud` errors → ids retained + cardX still absent locally; a second run succeeds → queue cleared (self-heal).
- **AC4 back-compat:** no pending deletions → `merged`/`added`/`updated` identical to the pre-change `mergeCards` result (existing `downloadCloudCards` tests stay green).
- **Unit:** `deletion-tracker` `removePendingDeletions(ids)` removes only the given ids; `mergeWithDeletions` excludes queued ids while keeping survivors (extend `conflict-resolution.test.ts:273-369`).
- **Hook:** `useCloudSync.test.ts` — add the `@/core/sync` + `@/shared/supabase/cards` mocks; assert `performSync` passes the deletion bundle; confirm the latch/dedup/guest/force tests still pass.
- **Env caveat:** inside `.claude/worktrees/`, plain `yarn test` finds 0 tests (Haste guard) — run from the main checkout or with the `--config` override.

### Regressions to preserve

Guest mode (no queue; `useCloudSync` short-circuits when unauthenticated); 16-8 singleton store control flow (latch, dedup, `SyncBusyError` quiet-bail, force-no-retry, sign-out reset, `downloadedCount`); `lastCloudSync` cooldown; LWW + tie→cloud + malformed/future-timestamp handling (preserved because `mergeWithDeletions` calls `mergeCards` internally on the filtered sets, `:516`); `processPendingSync`/`useAutoSync` tests (if T4 is deferred, leave them untouched).

### Project Structure Notes

Change surface: `core/sync/cloud-sync.ts` + `core/sync/deletion-tracker.ts` + `shared/hooks/useCloudSync.ts` (+ optionally `core/sync/sync-trigger.ts`). No schema, no native change. Layer boundaries respected (`core` has no React; the hook lives in `shared`). Part of Epic 16 — Platform & Tech Debt (Sprint 17, Wave 1).

### Definition of Ready

- [x] Root cause confirmed in code (file:line)
- [x] Architecture decision locked (AD-16-11-01) — no open fix fork
- [x] ACs testable and AC-mapped to tasks
- [x] Scope tight (download path + hook wiring + one tracker fn; no schema/native change)
- [x] Test strategy defined (real-SQLite regression)
- [ ] Open decisions confirmed by ifero (below) — recommended defaults baked in; non-blocking for dev start

### Open decisions (recommended defaults applied; ifero may veto)

1. **`removePendingDeletions(drainedIds)` vs `clearPendingDeletions()`** — baked in: targeted removal (T3), so a deletion enqueued mid-sync isn't silently lost. On-theme for a resurrection story.
2. **Fix `processPendingSync` now (T4) vs fast-follow** — baked in: include T4 (small, same file, closes the delta edited-then-deleted variant). Drop to a documented fast-follow only if scope must shrink. → **Resolved: DONE** — folded into this story per ifero (see #5). The full fix (deletion-aware merge + targeted clear) also closes the pre-existing Engine B blind-clear race the QA gate surfaced.
3. **Cloud-delete failure → error banner vs silent retry** — baked in: silent retain-and-retry for the auto path (local is already correct; avoids a scary banner for a self-healing condition, matching 16-8's transient tolerance).
4. **Out of scope (flag, don't fix):** cross-device delete propagation — a card deleted on another device (missing from cloud, present locally) is not handled; `localDeletions` is always `[]`. Needs per-card synced-state metadata → separate future story.
5. **T4 (Engine B unification) — DONE in-branch per ifero (QA-gate finding, 2026-07-13).** Making `processPendingSync` deletion-aware needs more than the merge swap: Engine B (`useAutoSync` → `processPendingSync`) ended each run with a **blind** `clearPendingDeletions()` (wired at `shared/hooks/useAutoSync.ts:90`). A card deleted _during_ a run — after the `pendingIds` snapshot — was wiped from the queue without being cloud-deleted, then resurrected on the next Engine A full download. The fix does **both**: swaps the merge to `mergeWithDeletions` **and** switches Engine B's terminal clear to the targeted `removePendingDeletions(pendingIds)` (this story's own T3 fn). This required expanding the change surface to `shared/hooks/useAutoSync.ts`, which was flagged and **approved by ifero** (fold-in decision, 2026-07-13) rather than deferred. Net effect: both sync engines are now deletion-aware, and the pre-existing blind-clear race (which existed on `main` independent of this story) is closed. Covered by new `sync-trigger.test.ts` tests (merge-filter + mid-run-enqueue-safe, both verified load-bearing).

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (implementation). Independent code-review + QA gates run via fresh **Sonnet** subagents per ifero's review-gate protocol (looped to zero comments before human review).

### Debug Log References

- Baseline commit (branch point off `main`): `0626db4` — recorded here rather than as story frontmatter, since no story in this repo uses `baseline_commit` frontmatter (it would be the sole such instance).
- Branch: `feature/16-11-deletion-aware-cloud-sync`.
- Env: implemented in the main checkout (not a `.claude/worktree`), so `yarn test` ran normally — no `--config` override needed. Counts below are reproduced, not assumed.
- Gates: `yarn typecheck` ✓ · `yarn lint` ✓ (0 errors, 0 warnings) · `yarn test:coverage` ✓ — 162 suites / **1696 tests** green; global branch **81.7%** (≥80% held). Changed-file coverage: `cloud-sync.ts` 92.78% branch, `deletion-tracker.ts` 100%, `sync-trigger.ts` 92.85% branch / 100% line (its one uncovered branch, the invalid-cloud-row skip, is pre-existing).

### Completion Notes List

- **Root cause fixed (AC1):** `downloadCloudCards` was deletion-blind — it merged via `mergeCards`, which re-adds a cloud-only deleted card as "new", and `batchUpsertCards` (`INSERT OR REPLACE`) resurrected it. It now merges via the previously-dead `mergeWithDeletions`, so pending-deletion cards are filtered out of the persisted set. Wired through `useCloudSync.performSync` — the engine that owns both reported triggers (cold-open auto-sync + pull-to-refresh `forceSync`).
- **Cloud drain (AC2):** the `cloudDeletions` surfaced by the merge are deleted from the cloud via the injected `deleteCardFromCloud`.
- **⚠️ AC3 partial-failure semantics — deviation from T1's literal wording (flagged for review):** T1 says "remove drained ids only if ALL succeed." Implemented instead as **per-id removal of the successfully-drained ids** (`removeDrained(succeeded)`), because strict all-or-nothing has a permanent **queue leak** with ≥2 deletions: once card A is deleted from the cloud on a run where B fails, A is no longer in any later run's `cloudDeletions` (it's gone from the cloud set), so all-or-nothing would never clear A — it orphans forever. Per-id removal satisfies AC3 exactly ("a failed deletion → _that_ id retained"), self-heals on the next run, and avoids the leak. A cloud-delete failure never fails the sync and never resurrects locally (merge already excluded it) — matches Open Decision #3 (silent retain-and-retry). Locked in by a dedicated 2-deletion partial-failure test at both unit and real-SQLite layers.
- **Targeted queue clear (AC3, Open Decision #1):** added `removePendingDeletions(ids)` (not a blind `clearPendingDeletions()`) so a deletion enqueued mid-sync isn't silently lost.
- **T4 done — both engines unified (folded in per ifero, 2026-07-13):** `processPendingSync` now merges via `mergeWithDeletions` (snapshotting pending deletions once), keeping its own explicit delete loop over the full snapshot (its delta fetch makes the merge's `cloudDeletions` incomplete). The QA gate showed merge-only T4 is unsafe — Engine B ended each run with a **blind** `clearPendingDeletions()`, so a deletion enqueued mid-run was silently wiped and could resurrect via Engine A. The fix therefore also switches Engine B's terminal clear to the targeted `removePendingDeletions(pendingIds)` (this story's T3 fn), wired at `shared/hooks/useAutoSync.ts`. This both completes T4 and closes the pre-existing blind-clear race. ifero approved expanding the change surface to `useAutoSync.ts` for this (Open Decision #5).
- **Back-compat (AC4):** `mergeWithDeletions(local, cloud, [])` is behaviourally identical to `mergeCards`; the `deletions` bundle is optional, so every existing caller/test is unaffected. Proven by a real-SQLite regression-contrast test that runs the _no-bundle_ path and asserts the card **does** resurrect (the fix is load-bearing).
- **16.8 preserved (AC6):** the singleton store's latch/dedup/in-flight guards/`forceSync` no-retry/cooldown are untouched; all 32 hook tests stay green with the new `downloadCloudCards` call shape.
- **Sprint tracking:** `sprint-status.yaml` intentionally left at `in-progress` (repo invariant: the yaml never holds `review`; `mark-story-done` flips it to `done` on merge). `review` lives only in this story `.md`.
- **Scope:** no schema, no native change; `core` stays React-free; the hook stays in `shared`. `useCloudSync.ts` sits outside `collectCoverageFrom` (the `shared/**` blind spot that Story 16-13 closes) but is fully exercised by `useCloudSync.test.ts`.
- **T8 (device smoke)** remains open — delegated to ifero on the next RC per the story's own framing.

### File List

Source:

- `core/sync/cloud-sync.ts` — add `DeletionSyncDeps` type + optional `deletions` on `DownloadCloudCardsOptions`; `downloadCloudCards` merges via `mergeWithDeletions` and drains `cloudDeletions`.
- `core/sync/deletion-tracker.ts` — add `removePendingDeletions(ids)`.
- `core/sync/sync-trigger.ts` — `processPendingSync` merges via `mergeWithDeletions` (single pending-deletions snapshot) and clears via the targeted `removePendingDeletions(pendingIds)` (T4).
- `core/sync/index.ts` — barrel-export `removePendingDeletions` + `type DeletionSyncDeps`.
- `shared/hooks/useCloudSync.ts` — wire the deletion bundle into both `downloadCloudCards` calls in `performSync`.
- `shared/hooks/useAutoSync.ts` — pass the targeted `removePendingDeletions` into `processPendingSync` instead of the blind `clearPendingDeletions` (T4).

Tests:

- `core/sync/cloud-sync.integration.test.ts` — **new**; real-SQLite regression (resurrection, drain, partial-failure, self-heal, back-compat contrast).
- `core/sync/cloud-sync.test.ts` — add deletion-drain unit tests.
- `core/sync/deletion-tracker.test.ts` — add `removePendingDeletions` unit tests.
- `core/sync/sync-trigger.test.ts` — targeted-clear rename; add merge-filter + mid-run-enqueue-safe tests (T4).
- `shared/hooks/useCloudSync.test.ts` — add deletion-dep mocks, update call-shape assertions, add a bundle-wiring test.
- `shared/hooks/useAutoSync.test.ts` — mock `removePendingDeletions` in place of `clearPendingDeletions` (T4).

Process:

- `docs/sprint-artifacts/stories/16-11-fix-card-deletion-cloud-resurrection.md` — tasks, Dev Agent Record, Status.
- `docs/sprint-artifacts/sprint-status.yaml` — `16-11` → `in-progress`; `updated` → 2026-07-13.

### Change Log

| Date       | Change                                                                                                                                                                                       | Author       |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| 2026-07-11 | Refined draft → ready-for-dev (AD-16-11-01; research-backed file:line).                                                                                                                      | Amelia (Dev) |
| 2026-07-13 | Implemented AD-16-11-01: deletion-aware download revives `mergeWithDeletions`; T1–T6 done.                                                                                                   | Amelia (Dev) |
| 2026-07-13 | QA gate: deferred T4 (Engine B) to a fast-follow (Open Decision #5) — merge-only widens a pre-existing blind-clear race; reverted `sync-trigger`. Added drain edge-case + throttle tests.    | Amelia (Dev) |
| 2026-07-13 | Per ifero, folded T4 back in: Engine B deletion-aware merge + targeted `removePendingDeletions` clear (via `useAutoSync.ts`), closing the blind-clear race. Both engines now deletion-aware. | Amelia (Dev) |
