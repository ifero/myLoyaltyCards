# Story 7.3: Sync Card Changes

**Epic:** 7 - Cloud Synchronization
**Type:** User-Facing
**Status:** done
**Sprint:** 9
**FRs Covered:** FR34, FR40, FR41

---

## Story

**As a** signed-in user,
**I want** card changes to sync automatically in the background,
**So that** all my devices stay up to date.

---

## Acceptance Criteria

### AC1: Auto-Sync on Card Add

```gherkin
Given I am signed in (authenticated)
When I add a new card
Then the card is uploaded to the Supabase loyalty_cards table in the background
And the sync occurs within the configured 5-minute throttle window
And the UI is not blocked during sync
```

### AC2: Auto-Sync on Card Edit

```gherkin
Given I am signed in
When I edit a card (name, barcode, barcodeFormat, brandId, color, isFavorite)
Then the updated card is synced to the Supabase cloud backend
And the updatedAt timestamp is refreshed to the current time
And only the changed card is uploaded (not the entire collection)
```

### AC3: Auto-Sync on Card Delete

```gherkin
Given I am signed in
When I delete a card
Then the card is deleted from the Supabase loyalty_cards table
And the deletion propagates to other devices on their next sync
```

### AC4: Throttle Aggregation

```gherkin
Given I make multiple changes in rapid succession (add 3 cards, edit 1, delete 1)
When the throttle window expires
Then ALL pending changes are synced in a single batch operation
And no individual change triggers its own sync call
```

### AC5: Guest Mode — No Sync

```gherkin
Given I am in guest mode (not authenticated)
When I add, edit, or delete a card
Then no cloud sync is attempted
And no errors are shown related to sync
And cards are stored locally only
```

### AC6: Error Resilience

```gherkin
Given a sync attempt fails (network error, server error)
When the error is caught
Then the error is logged via logger
And changes remain persisted locally (local DB is source of truth)
And a subtle error indicator appears (non-blocking)
And sync will be retried on the next throttle cycle
```

### AC7: Sync After Returning Online

```gherkin
Given I made changes while the app was in the background or network was unstable
When the app returns to the foreground or connectivity is restored
Then pending changes are synced within the throttle window
```

---

## Tasks / Subtasks

- [x] **Task 1: Create sync trigger service** (AC: #1, #2, #3, #4)
  - [x] 1.1 Create `core/sync/sync-trigger.ts` — change tracking and debounced sync dispatch
  - [x] 1.2 Create `core/sync/sync-trigger.test.ts` — unit tests (14 pass)
  - [x] 1.3 Implement `markDirty()` function — signals that local data has changed
  - [x] 1.4 Implement `processPendingSync(userId, cloudUpsertFn, cloudDeleteFn)` — flushes pending changes
  - [x] 1.5 Integrate with existing throttle from `cloud-sync.ts` (Story 7.1)

- [x] **Task 2: Implement change-aware upload** (AC: #1, #2, #4)
  - [x] 2.1 Extend `core/sync/cloud-sync.ts` with `syncChangedCards(userId, cloudUpsertFn)`
  - [x] 2.2 Read all local cards and upsert to cloud (full sync within throttle window)
  - [x] 2.3 Note: Delta sync optimization (only changed cards) is Story 7.4 — this story does full upsert
  - [x] 2.4 Unit tests (6 new tests, 46 total pass)

- [x] **Task 3: Implement cloud delete** (AC: #3)
  - [x] 3.1 Add `deleteCardFromCloud(cardId, userId)` to `shared/supabase/cards.ts`
  - [x] 3.2 Use `supabase.from('loyalty_cards').delete().eq('id', cardId).eq('user_id', userId)`
  - [x] 3.3 Define `CloudDeleteFn` type for dependency injection into `core/sync/`
  - [x] 3.4 Track deleted card IDs locally for batch delete sync
  - [x] 3.5 Unit tests for delete operation (3 new tests, 10 total pass)

- [x] **Task 4: Create deletion tracking** (AC: #3, #4)
  - [x] 4.1 Create `core/sync/deletion-tracker.ts` — tracks card IDs deleted since last sync
  - [x] 4.2 Store pending deletions in AsyncStorage (survives app restart)
  - [x] 4.3 Clear tracked deletions after successful sync
  - [x] 4.4 `addPendingDeletion(cardId)` / `getPendingDeletions()` / `clearPendingDeletions()`
  - [x] 4.5 Unit tests (8 pass)

- [x] **Task 5: Wire sync triggers into card CRUD operations** (AC: #1, #2, #3, #5)
  - [x] 5.1 Identify where card add/edit/delete currently happen in the codebase
  - [x] 5.2 After each local DB write, call `markDirty()` if user is authenticated
  - [x] 5.3 For deletes, call `addPendingDeletion(cardId)` before local delete
  - [x] 5.4 Guard: skip sync trigger when `authState !== 'authenticated'` (guest mode)
  - [x] 5.5 Integration approach: wired into useAddCard, useEditCard, useDeleteCard hooks (37 tests pass)

- [x] **Task 6: Implement background sync scheduler** (AC: #4, #7)
  - [x] 6.1 Create `shared/hooks/useAutoSync.ts` — hook that watches for dirty state + throttle expiry
  - [x] 6.2 Use `AppState` listener to trigger sync when app returns to foreground
  - [x] 6.3 Use interval (or throttle callback) to process pending sync
  - [x] 6.4 Coordinate with `useCloudSync` hook from 7.1/7.2
  - [x] 6.5 Unit tests for the auto-sync scheduling logic (15 pass)

- [x] **Task 7: Update sync indicator for ongoing sync** (AC: #6)
  - [x] 7.1 Reuse `SyncIndicator` from 7.1 — already supports `isSyncing` state
  - [x] 7.2 Show error state briefly on sync failure (subtle, non-blocking)
  - [x] 7.3 Ensure indicator reflects background sync, not just initial sign-in sync (4 tests pass)

---

## Dev Notes

### Design: Throttled Batch Sync (Not Per-Change Sync)

The architecture specifies a **5-minute cloud sync cooldown**. This means:

- Individual CRUD operations do NOT trigger immediate cloud calls
- Instead, changes are flagged as "dirty" and accumulated
- When the throttle window expires, ALL pending changes are flushed in one batch
- This is more efficient than per-operation sync (fewer API calls, better battery)

**Flow:**

```
User adds card → local DB write → markDirty() → (wait for throttle) → batch sync
User edits card → local DB write → markDirty() → (accumulated with above)
User deletes card → local DB write + addPendingDeletion() → (accumulated)
... 5 min pass ...
→ processPendingSync() fires → upserts all local cards + deletes tracked IDs
```

### Delete Tracking Approach

Deletes require special handling because once a card is removed from local DB, we can't detect it's "missing" compared to cloud. Options:

**Chosen approach: Pending deletion queue**

- On local delete, record the card ID in a persistent queue (AsyncStorage)
- During sync, send delete requests for queued IDs, then clear queue
- Simpler than soft-delete, no schema changes needed

**Alternative (not chosen): Soft delete**

- Add `deletedAt` column to local DB
- Sync uploads `deletedAt` to cloud
- Requires schema migration — overkill for now

### Integration Points: Where CRUD Happens

The dev agent should trace these entry points to wire sync triggers:

| Operation       | Current code path                                   | Sync trigger                             |
| --------------- | --------------------------------------------------- | ---------------------------------------- |
| **Add card**    | `core/database/card-repository.ts` → `insertCard()` | `markDirty()`                            |
| **Edit card**   | `core/database/card-repository.ts` → `updateCard()` | `markDirty()`                            |
| **Delete card** | `core/database/card-repository.ts` → `deleteCard()` | `addPendingDeletion(id)` + `markDirty()` |
| **Upsert card** | `core/database/card-repository.ts` → `upsertCard()` | `markDirty()`                            |

**Integration approach options:**

1. **Wrapper functions** — create sync-aware wrappers like `insertCardAndSync()`
2. **Repository middleware** — intercept at the repository level
3. **Zustand store actions** — if cards go through a Zustand store, trigger sync there

Option 1 (wrapper) is simplest and doesn't change existing interfaces.

### Architecture Compliance

| Rule                     | Implementation                                                                                     |
| ------------------------ | -------------------------------------------------------------------------------------------------- |
| **Layer boundaries**     | Sync trigger logic in `core/sync/`. Supabase calls in `shared/supabase/`. Hook in `shared/hooks/`. |
| **Dependency injection** | `core/sync/` receives `cloudUpsertFn` + `cloudDeleteFn` (never imports Supabase)                   |
| **Throttle**             | Reuse 5-min persistent throttle from `core/sync/cloud-sync.ts` (Story 7.1)                         |
| **Guest mode guard**     | Check `authState` before triggering any sync                                                       |
| **Error handling**       | Log errors, never crash, local data always source of truth                                         |
| **No React in core/**    | Sync trigger service is pure TS. React hooks in `shared/hooks/` only.                              |

### File Placement

```
core/
  sync/
    cloud-sync.ts          ← EXTEND: add syncChangedCards()
    cloud-sync.test.ts     ← EXTEND
    sync-trigger.ts        ← NEW: markDirty(), processPendingSync()
    sync-trigger.test.ts   ← NEW
    deletion-tracker.ts    ← NEW: pending deletion queue
    deletion-tracker.test.ts ← NEW
    mappers.ts             ← (from 7.1/7.2, no changes)
    index.ts               ← EXTEND: export new modules
shared/
  supabase/
    cards.ts               ← EXTEND: add deleteCardFromCloud()
    cards.test.ts          ← EXTEND
  hooks/
    useAutoSync.ts         ← NEW: background sync scheduler
    useAutoSync.test.ts    ← NEW
    useCloudSync.ts        ← EXTEND: coordinate with auto-sync
```

### Testing Strategy

1. **Sync trigger tests** (core logic):
   - `markDirty()` sets dirty flag
   - `processPendingSync()` calls upsert + delete functions
   - Throttle prevents sync within cooldown
   - Force sync bypasses throttle
   - Multiple `markDirty()` calls → single sync

2. **Deletion tracker tests**:
   - Add pending deletion → stored in AsyncStorage
   - Get pending deletions → returns all queued IDs
   - Clear after sync → queue is empty
   - Persist across calls (not in-memory only)

3. **Cloud delete tests**:
   - Mock Supabase → verify delete call with correct `id` + `user_id`
   - Error handling on delete failure

4. **Auto-sync hook tests**:
   - Dirty flag + throttle expiry → triggers sync
   - AppState change to foreground → triggers sync check
   - Guest mode → no sync triggered
   - Sync error → error state exposed, retry on next cycle

5. **Integration tests** (at module boundary):
   - insertCard + markDirty → sync fires after throttle
   - deleteCard + addPendingDeletion → cloud delete sent on sync

### Relationship to Other Stories

| Story                         | Relationship                                                             |
| ----------------------------- | ------------------------------------------------------------------------ |
| **7.1 (Upload)**              | This story reuses upload infrastructure; extends it with change triggers |
| **7.2 (Download)**            | Download runs on sign-in; this story handles ongoing bidirectional sync  |
| **7.4 (Delta Sync)**          | Optimizes this story — instead of full upsert, only sends changed cards  |
| **7.5 (Offline Queue)**       | Adds retry for failed sync attempts from this story                      |
| **7.6 (Conflict Resolution)** | Handles multi-device conflicts arising from this story's sync            |
| **7.7 (Sync Status)**         | Displays ongoing sync state from this story's hooks                      |

### References

- [Source: docs/architecture.md#Sync Patterns] — 5-min cloud sync cooldown pattern
- [Source: docs/architecture.md#State & Communication Patterns] — Zustand with Immer
- [Source: docs/project_context.md#Sync Patterns] — Cloud sync throttle, force sync
- [Source: docs/epics.md#Story 7.3] — Original AC and scope
- [Source: core/database/card-repository.ts] — CRUD entry points to wire triggers into
- [Source: core/sync/cloud-sync.ts] — Throttle and upload infrastructure (from 7.1)

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (GitHub Copilot)

### Debug Log References

- Fake timer conflict with `@testing-library/react-native` `waitFor` in `useAutoSync.test.ts` — resolved by removing fake timers and testing via AppState listener triggers
- `SEMANTIC_COLORS.light.error` TypeScript error — `SEMANTIC_COLORS` is a flat object, fixed to `SEMANTIC_COLORS.error`
- Unused `AppError` import in `sync-trigger.ts` after refactoring `processPendingSync` to delegate to `syncChangedCards` — removed

### Completion Notes List

- All 7 tasks implemented with TDD approach
- 72 test suites, 923 tests pass, 0 failures
- Lint: 0 errors (4 pre-existing warnings)
- TypeScript: 0 errors
- Sync triggers wired at hook level (useAddCard, useEditCard, useDeleteCard) rather than repository level — cleaner separation and easier to guard with `isAuthenticated`
- Deletion tracking uses AsyncStorage for persistence across app restarts
- Background sync uses 5-minute interval + AppState foreground listener
- Guest mode guard prevents any sync triggers when not authenticated

### Change Log

- Created `core/sync/sync-trigger.ts` — markDirty, isDirty, clearDirty, processPendingSync
- Created `core/sync/sync-trigger.test.ts` — 14 tests
- Extended `core/sync/cloud-sync.ts` — added syncChangedCards()
- Extended `core/sync/cloud-sync.test.ts` — 6 new tests
- Created `core/sync/deletion-tracker.ts` — addPendingDeletion, getPendingDeletions, clearPendingDeletions
- Created `core/sync/deletion-tracker.test.ts` — 8 tests
- Extended `core/sync/index.ts` — new exports
- Extended `shared/supabase/cards.ts` — added deleteCardFromCloud()
- Extended `shared/supabase/cards.test.ts` — 3 new tests
- Modified `features/cards/hooks/useAddCard.ts` — markDirty on authenticated add
- Modified `features/cards/hooks/useEditCard.ts` — markDirty on authenticated edit
- Modified `features/cards/hooks/useDeleteCard.ts` — addPendingDeletion + markDirty on authenticated delete
- Updated hook tests: useAddCard.test.ts, useEditCard.test.ts, useDeleteCard.test.ts
- Created `shared/hooks/useAutoSync.ts` — background sync scheduler
- Created `shared/hooks/useAutoSync.test.ts` — 15 tests
- Modified `shared/components/SyncIndicator.tsx` — added hasError prop and error state
- Modified `shared/components/SyncIndicator.test.tsx` — 2 new tests
- Modified `app/index.tsx` — wired useAutoSync into home screen

### File List

- `core/sync/sync-trigger.ts` (NEW)
- `core/sync/sync-trigger.test.ts` (NEW)
- `core/sync/cloud-sync.ts` (MODIFIED)
- `core/sync/cloud-sync.test.ts` (MODIFIED)
- `core/sync/deletion-tracker.ts` (NEW)
- `core/sync/deletion-tracker.test.ts` (NEW)
- `core/sync/index.ts` (MODIFIED)
- `shared/supabase/cards.ts` (MODIFIED)
- `shared/supabase/cards.test.ts` (MODIFIED)
- `features/cards/hooks/useAddCard.ts` (MODIFIED)
- `features/cards/hooks/useAddCard.test.ts` (MODIFIED)
- `features/cards/hooks/useEditCard.ts` (MODIFIED)
- `features/cards/hooks/useEditCard.test.ts` (MODIFIED)
- `features/cards/hooks/useDeleteCard.ts` (MODIFIED)
- `features/cards/hooks/useDeleteCard.test.ts` (MODIFIED)
- `shared/hooks/useAutoSync.ts` (NEW)
- `shared/hooks/useAutoSync.test.ts` (NEW)
- `shared/components/SyncIndicator.tsx` (MODIFIED)
- `shared/components/SyncIndicator.test.tsx` (MODIFIED)
- `app/index.tsx` (MODIFIED)
- `docs/sprint-artifacts/sprint-status.yaml` (MODIFIED)
- `docs/sprint-artifacts/stories/7-3-sync-card-changes.md` (MODIFIED)
