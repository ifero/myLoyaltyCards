# Story 9.1: Track Card Usage

Status: review

## Story

As a user,
I want the app to remember which cards I use most,
so that they can be surfaced quickly via the smart sorting algorithm.

## Acceptance Criteria

1. **Given** I navigate to a card's detail screen (barcode is shown)
   **When** the screen mounts (first focus)
   **Then** the card's `usageCount` is incremented by 1
   **And** the card's `lastUsedAt` is updated to the current UTC ISO timestamp

2. **Given** I return to a card's detail screen I already visited this session
   **When** the screen re-focuses
   **Then** `usageCount` increments again (each view is a distinct usage event)

3. **Given** the tracking write completes
   **When** the Watch is reachable
   **Then** the updated card snapshot is pushed to the Watch automatically (via existing `pushSnapshotToWatch`)

4. **Given** the device is offline
   **When** I view a card
   **Then** tracking still writes to local SQLite without error (no network required)

5. **Given** a card does not exist in the database (edge case)
   **When** `incrementUsageCount` is called with that id
   **Then** the operation silently no-ops (no crash, no error thrown to UI)

## Tasks / Subtasks

- [x] Add `incrementUsageCount(id, db?)` to `core/database/card-repository.ts` (AC: 1, 2, 4, 5)
  - [x] SQL: `UPDATE loyalty_cards SET usage_count = usage_count + 1, last_used_at = ?, updated_at = ? WHERE id = ?`
  - [x] Use `new Date().toISOString()` for both `last_used_at` and `updated_at`
  - [x] Call `pushSnapshotToWatch(db)` after the update (AC: 3) — matches pattern of all other write functions
  - [x] No transaction needed (single atomic UPDATE)
- [x] Create `features/cards/hooks/useTrackCardUsage.ts` (AC: 1, 2)
  - [x] Accepts `cardId: string`
  - [x] Calls `incrementUsageCount` once per focus (inside `useFocusEffect`)
  - [x] Fire-and-forget: errors are caught and logged, never thrown to the UI
- [x] Wire `useTrackCardUsage` into `app/card/[id].tsx` (AC: 1, 2)
  - [x] Call after `id` is confirmed (guard against null)
  - [x] Hook call goes inside `CardDetailsScreen`, before early returns (Rules of Hooks)
- [x] Export `useTrackCardUsage` from `features/cards/index.ts`
- [x] Tests:
  - [x] Unit test `incrementUsageCount` in `core/database/card-repository.test.ts`
    - increments `usageCount` by 1 and sets `lastUsedAt`
    - calling twice increments to 2
    - silently no-ops for unknown id
  - [x] Unit test `useTrackCardUsage` in `features/cards/hooks/useTrackCardUsage.test.ts`
    - calls `incrementUsageCount` on mount
    - calls again on re-focus
    - does not crash when db throws

- [x] [AI-Review][MEDIUM] Update story Dev Agent Record / File List to include all actual changed files from this review, including new test coverage and sprint status updates.
- [x] [AI-Review][MEDIUM] Add explicit story documentation for `features/cards/hooks/useTrackCardUsage.test.ts` and `core/database/card-repository.test.ts` as part of the tracked implementation.
- [x] [AI-Review][LOW] Keep story status as `in-progress` until follow-up review actions are complete and the sprint status is synced.

### Review Follow-ups (AI) — TEA test-review 2026-06-06

- [x] [AI-Review][MEDIUM] Assert `lastUsedAt`/`updatedAt` is a real ISO-8601 string in the AC1 repo test (not just `typeof string`). (Rec #1)
- [x] [AI-Review][MEDIUM] Replace the global-mock-per-render reliance in the AC2 re-focus hook test with a local focus-cycle mock that models a genuine focus event. (Rec #2)
- [x] [AI-Review][MEDIUM] Add real-DB coverage for `incrementUsageCount` increment semantics (stakeholder-approved `better-sqlite3` dev dep; new `card-repository.integration.test.ts` runs real SQL against in-memory SQLite). (Rec #3)

## Dev Notes

### Where to fire tracking

The correct trigger is **card detail screen mount / re-focus** (`useFocusEffect` in `app/card/[id].tsx`), not inside `BarcodeFlash` or `FullscreenBarcode`. Rationale:

- The barcode is always visible when the card detail screen is in focus — no need to track the fullscreen overlay separately (would double-count)
- `useFocusEffect` already exists in `app/card/[id].tsx` for data fetching; tracking slots naturally alongside it
- Fire-and-forget pattern: do NOT await in the effect body; catch errors silently

### Repository pattern to follow

All write functions in `core/database/card-repository.ts` follow this exact pattern:

```ts
export async function myWriteFn(id: string, db: SQLiteDatabase = getDatabase()): Promise<void> {
  await db.runAsync('UPDATE ...', [...]);
  await pushSnapshotToWatch(db);
}
```

- Default `db` parameter uses `getDatabase()` — do the same
- `pushSnapshotToWatch` is best-effort (already swallows errors internally) — always call it after writes

### SQL increment pattern

Use atomic SQL increment — do NOT read-then-write:

```sql
UPDATE loyalty_cards
SET usage_count = usage_count + 1,
    last_used_at = ?,
    updated_at = ?
WHERE id = ?
```

This is safe without a transaction (single statement, SQLite guarantees atomicity for single statements).

### useFocusEffect hook location

In `app/card/[id].tsx`:

```ts
useFocusEffect(
  useCallback(() => {
    // existing: fetchCard()
  }, [id])
);
```

Add `useTrackCardUsage(id ?? '')` as a **separate** hook call alongside (not inside) the fetch effect. Guard with `if (!id) return` inside the hook.

### Watch sync

`pushSnapshotToWatch` (called from `incrementUsageCount`) will push the full card snapshot to the watch. This is the existing pattern — no additional Watch code needed for 9.1. Watch-side sort order is addressed in Story 9.4.

### Project Structure Notes

| Layer    | File                                             | Change                    |
| -------- | ------------------------------------------------ | ------------------------- |
| Database | `core/database/card-repository.ts`               | Add `incrementUsageCount` |
| Hook     | `features/cards/hooks/useTrackCardUsage.ts`      | New file                  |
| Screen   | `app/card/[id].tsx`                              | Wire hook                 |
| Barrel   | `features/cards/index.ts`                        | Export hook               |
| Tests    | `core/database/card-repository.test.ts`          | New test cases            |
| Tests    | `features/cards/hooks/useTrackCardUsage.test.ts` | New file                  |

### References

- Repository pattern: [core/database/card-repository.ts](../../../core/database/card-repository.ts)
- Schema fields: [core/schemas/card.ts](../../../core/schemas/card.ts) — `usageCount`, `lastUsedAt` already defined
- Screen entry point: [app/card/[id].tsx](../../../app/card/[id].tsx)
- Watch sync: [core/watch-connectivity.ts](../../../core/watch-connectivity.ts)
- Sort hook (will use these fields in 9.3): [features/cards/hooks/useCardSort.ts](../../../features/cards/hooks/useCardSort.ts) — `sortByFrequent` already implemented

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Dev agent "Amelia", dev-story workflow)

### Debug Log References

- `yarn jest core/database/card-repository.test.ts` — RED (6 new failing) → GREEN (16 passing)
- `yarn jest features/cards/hooks/useTrackCardUsage.test.ts` — RED (module not found) → GREEN (4 passing)
- `yarn typecheck` — clean
- `yarn eslint` (touched files) — clean
- `yarn jest` (full suite) — 148 suites, 1442 tests passing, no regressions

### Completion Notes List

- Added `incrementUsageCount(id, db = getDatabase())` to the card repository as a single atomic
  `UPDATE` (no transaction, per Dev Notes). Stamps `last_used_at` + `updated_at` with one
  `new Date().toISOString()` value and calls `pushSnapshotToWatch(db)` to mirror every other write
  function — satisfies AC1, AC3, AC4. Unknown ids affect 0 rows and silently no-op (AC5).
- Created `useTrackCardUsage(cardId)` hook firing `incrementUsageCount` inside `useFocusEffect`,
  fire-and-forget with a `.catch` that logs only. Empty/undefined ids are guarded out. Each focus
  is a distinct usage event (AC2).
- Wired the hook into `CardDetailsScreen` before any early returns (Rules of Hooks), called as
  `useTrackCardUsage(id ?? '')`.
- Exported the hook from `features/cards/index.ts` and `incrementUsageCount` from
  `core/database/index.ts` (the hook consumes the `@/core/database` barrel).
- No new dependencies. No Watch-side changes needed — existing `pushSnapshotToWatch` carries the
  updated snapshot; Watch-side sort order is deferred to Story 9.4.

**Review follow-up (2026-06-06):**

- ✅ Resolved review finding [MEDIUM]: File List now split into Implementation / Test coverage /
  Tracking artifacts, and lists `sprint-status.yaml` + the story doc alongside the 7 code/test files.
- ✅ Resolved review finding [MEDIUM]: Both test files now carry explicit per-case coverage notes
  in the File List (10 cases total across the two suites).
- ✅ Resolved review finding [LOW]: Follow-ups complete → status moved in-progress → review and
  sprint-status.yaml re-synced.
- Review surfaced no code defects; the implementation is unchanged. Full suite re-verified green
  (148 suites / 1442 tests) and typecheck clean after the documentation updates.

**TEA test-review follow-up (2026-06-07):**

- ✅ Resolved Rec #1 [MEDIUM]: AC1 repo test now asserts the timestamp matches an ISO-8601 UTC
  regex (`/^\d{4}-...\.\d{3}Z$/`) instead of merely `typeof string`.
- ✅ Resolved Rec #2 [MEDIUM]: the AC2 re-focus hook test uses a local `expo-router` focus-cycle
  mock and fires a genuine re-focus event, no longer relying on the global per-render mock.
- ✅ Resolved Rec #3 [MEDIUM]: added stakeholder-approved `better-sqlite3` dev dep and a new
  `card-repository.integration.test.ts` that runs the real `incrementUsageCount` SQL against an
  in-memory SQLite DB built from the production migration schema — verifies actual 0→1→2
  increment (AC1/AC2), single-row targeting, and unknown-id no-op (AC5). Catches column/WHERE
  typos the string-matching unit tests cannot. Final suite: 149 suites / 1445 tests green;
  typecheck + lint clean.

### File List

**Implementation:**

- `core/database/card-repository.ts` (modified — added `incrementUsageCount`)
- `core/database/index.ts` (modified — re-export `incrementUsageCount`)
- `features/cards/hooks/useTrackCardUsage.ts` (new)
- `features/cards/index.ts` (modified — export `useTrackCardUsage`)
- `app/card/[id].tsx` (modified — wired `useTrackCardUsage`)

**Test coverage:**

- `core/database/card-repository.test.ts` (modified — added 6-case `incrementUsageCount` suite; AC1 now asserts ISO-8601 timestamp per review Rec #1)
- `core/database/card-repository.integration.test.ts` (new — review Rec #3: 3 real-SQLite tests verifying actual 0→1→2 increment, no cross-row bleed, unknown-id no-op against the real migration schema)
- `features/cards/hooks/useTrackCardUsage.test.ts` (modified — 4 cases; AC2 re-focus now uses a local focus-cycle mock per review Rec #2)

**Dependencies:**

- `package.json` (modified — added `better-sqlite3` + `@types/better-sqlite3` as devDependencies for real-DB integration testing; stakeholder-approved 2026-06-07)

**Tracking artifacts:**

- `docs/sprint-artifacts/stories/9-1-track-card-usage.md` (modified — task checkboxes, Dev Agent Record, File List, Change Log, Status)
- `docs/sprint-artifacts/sprint-status.yaml` (modified — `9-1-track-card-usage`: ready-for-dev → in-progress → review)

### Change Log

| Date       | Change                                                                                                                                               |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-06-06 | Implemented Story 9.1: card usage tracking (repo fn + focus hook). Status → review.                                                                  |
| 2026-06-06 | Addressed code review findings — 3 items resolved (File List + test documentation). Status → review.                                                 |
| 2026-06-06 | Addressed TEA test-review: Rec #1 (ISO-8601 assertion) + Rec #2 (local focus-cycle mock) applied; Rec #3 (real-DB test) pending dependency approval. |
| 2026-06-07 | Rec #3 complete — added better-sqlite3 dev dep + real-SQLite integration test (3 cases). All 3 TEA recommendations resolved. Suite 1445/1445 green.  |
| 2026-06-07 | TEA re-review: 96/100 (A), all Mediums closed. Applied P3 fix — `jest.clearAllMocks()` in integration `beforeEach`.                                  |
