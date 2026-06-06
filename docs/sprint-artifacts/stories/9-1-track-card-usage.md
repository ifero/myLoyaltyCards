# Story 9.1: Track Card Usage

Status: ready-for-dev

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

- [ ] Add `incrementUsageCount(id, db?)` to `core/database/card-repository.ts` (AC: 1, 2, 4, 5)
  - [ ] SQL: `UPDATE loyalty_cards SET usage_count = usage_count + 1, last_used_at = ?, updated_at = ? WHERE id = ?`
  - [ ] Use `new Date().toISOString()` for both `last_used_at` and `updated_at`
  - [ ] Call `pushSnapshotToWatch(db)` after the update (AC: 3) — matches pattern of all other write functions
  - [ ] No transaction needed (single atomic UPDATE)
- [ ] Create `features/cards/hooks/useTrackCardUsage.ts` (AC: 1, 2)
  - [ ] Accepts `cardId: string`
  - [ ] Calls `incrementUsageCount` once per focus (inside `useFocusEffect`)
  - [ ] Fire-and-forget: errors are caught and logged, never thrown to the UI
- [ ] Wire `useTrackCardUsage` into `app/card/[id].tsx` (AC: 1, 2)
  - [ ] Call after `id` is confirmed (guard against null)
  - [ ] Hook call goes inside `CardDetailsScreen`, before early returns (Rules of Hooks)
- [ ] Export `useTrackCardUsage` from `features/cards/index.ts`
- [ ] Tests:
  - [ ] Unit test `incrementUsageCount` in `core/database/card-repository.test.ts`
    - increments `usageCount` by 1 and sets `lastUsedAt`
    - calling twice increments to 2
    - silently no-ops for unknown id
  - [ ] Unit test `useTrackCardUsage` in `features/cards/hooks/useTrackCardUsage.test.ts`
    - calls `incrementUsageCount` on mount
    - calls again on re-focus
    - does not crash when db throws

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

_to be filled by dev agent_

### Debug Log References

### Completion Notes List

### File List
