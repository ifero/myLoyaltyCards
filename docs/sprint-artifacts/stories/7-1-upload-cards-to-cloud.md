# Story 7.1: Upload Cards to Cloud

**Epic:** 7 - Cloud Synchronization
**Type:** User-Facing
**Status:** done
**Sprint:** 9
**FRs Covered:** FR35, FR36, FR37

---

## Story

**As a** signed-in user,
**I want** my local cards uploaded to the cloud when I sign in,
**So that** they're backed up and available on other devices.

---

## Acceptance Criteria

### AC1: Initial Upload After Sign-In

```gherkin
Given I sign in to my account for the first time
When authentication succeeds
Then all my local cards are uploaded to the Supabase loyalty_cards table
And each card has my user_id attached
And the upload respects the configured 5-minute sync throttle window
And cards remain accessible in the UI during the upload process
```

### AC2: Batch Upload for Large Collections

```gherkin
Given I have many cards (e.g., 50+)
When upload occurs
Then cards are uploaded in batches of 50 for efficiency
And the process completes without timeout
And partial batch failures do not prevent remaining batches from uploading
```

### AC3: Sync Indicator

```gherkin
Given an upload is in progress
When the UI renders
Then I see a subtle sync indicator (e.g., spinning icon)
And the indicator does not block my interaction with the card list
And the indicator disappears when upload completes
```

### AC4: Idempotent Upload (Upsert)

```gherkin
Given I have already uploaded cards previously
When a subsequent upload runs
Then cards are upserted (INSERT OR UPDATE on conflict by id)
And no duplicate rows are created in the cloud
And updated_at timestamps are preserved correctly
```

### AC5: Error Handling

```gherkin
Given the upload fails (network error, server error)
When the error is caught
Then the error is logged via logger
And the user sees a non-blocking error message
And local cards remain unaffected
And the user can trigger a manual retry
```

### AC6: Throttle Persistence

```gherkin
Given a sync completed within the last 5 minutes
When another sync is requested (non-forced)
Then the sync is skipped
And the cooldown timestamp persists across app restarts (AsyncStorage)
And a forced sync bypasses the throttle
```

---

## Tasks / Subtasks

- [x] **Task 1: Create `core/sync/` module** (AC: #1, #4, #6)
  - [x] 1.1 Create `core/sync/cloud-sync.ts` — core sync service
  - [x] 1.2 Create `core/sync/cloud-sync.test.ts` — unit tests
  - [x] 1.3 Create `core/sync/index.ts` — barrel exports
  - [x] 1.4 Implement `uploadLocalCards(userId, cloudUpsertFn)` function
  - [x] 1.5 Implement throttle logic with AsyncStorage persistence
  - [x] 1.6 Implement `forceSync` variant that bypasses throttle

- [x] **Task 2: Implement card-to-cloud row mapper** (AC: #1, #4)
  - [x] 2.1 Create `core/sync/mappers.ts` — camelCase → snake_case transformation
  - [x] 2.2 Create `core/sync/mappers.test.ts` — unit tests
  - [x] 2.3 Reuse `CloudCardRow` type from existing `guest-migration.ts` or extract shared type

- [x] **Task 3: Implement batch upload logic** (AC: #2, #5)
  - [x] 3.1 Implement batch splitting (BATCH_SIZE = 50, matching guest-migration pattern)
  - [x] 3.2 Handle partial batch failures — continue uploading remaining batches
  - [x] 3.3 Return structured result: `{ success, uploadedCount, failedCount, errors }`

- [x] **Task 4: Create Supabase upload function** (AC: #1, #4)
  - [x] 4.1 Add `upsertCards(cards: CloudCardRow[])` to `shared/supabase/` layer
  - [x] 4.2 Use Supabase `.upsert()` with `onConflict: 'id'`
  - [x] 4.3 Unit test the Supabase call layer

- [x] **Task 5: Create `useSyncUpload` hook** (AC: #3, #5)
  - [x] 5.1 Create hook in `features/cards/hooks/` or `shared/hooks/`
  - [x] 5.2 Expose `{ isSyncing, syncError, triggerSync, forceSync }` state
  - [x] 5.3 Wire to auth state — auto-trigger on sign-in
  - [x] 5.4 Unit tests for the hook

- [x] **Task 6: Add sync indicator UI** (AC: #3)
  - [x] 6.1 Create `SyncIndicator` component (subtle spinner/pulse)
  - [x] 6.2 Integrate into card list screen header or status bar area
  - [x] 6.3 Non-blocking — user can scroll/interact while syncing

---

## Dev Notes

### Critical Reference: Guest Migration Pattern (Story 6.14)

The guest migration code in `core/auth/guest-migration.ts` already implements a very similar upload flow. **Study this before writing new code:**

- `CloudCardRow` type — snake_case cloud shape with `user_id`
- `localCardToCloudRow()` — camelCase → snake_case mapper
- Batch upload with `BATCH_SIZE = 50`
- Injected `CloudUpsertFn` pattern (dependency injection to maintain core/ → shared/ boundary)
- Idempotent via Supabase upsert

**Key Decision:** Extract shared upload/mapper utilities from `guest-migration.ts` into `core/sync/` to avoid duplication. The guest migration service should become a thin wrapper that calls into the sync module.

### Architecture Compliance

| Rule                       | Implementation                                                                                                              |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Layer boundaries**       | Sync logic in `core/sync/` (no React imports). Hook in `shared/hooks/` or `features/`. Supabase call in `shared/supabase/`. |
| **Dependency injection**   | `core/sync/` receives cloud upsert function as parameter (same pattern as guest-migration)                                  |
| **DB reads**               | Use `getAllCards()` from `core/database/card-repository.ts`                                                                 |
| **Transactions**           | Supabase upsert handles cloud writes; local reads don't need transactions                                                   |
| **camelCase → snake_case** | Transform at boundary in mapper function                                                                                    |
| **Zod validation**         | Validate cloud rows against `cloudLoyaltyCardSchema` before upload (use `parseWithLogging`)                                 |
| **Error shape**            | Return `{ code, message, details? }` per AppError pattern                                                                   |
| **Logging**                | Use `logger` wrapper, never raw `console.log`                                                                               |
| **Dates**                  | All timestamps UTC ISO 8601 with milliseconds                                                                               |
| **UUIDs**                  | Client-generated, never rely on Supabase to generate                                                                        |
| **JSON nulls**             | All fields present, use `null` not omitted                                                                                  |

### Sync Throttle Pattern (From Architecture)

```typescript
const CLOUD_SYNC_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

// Store last sync timestamp in AsyncStorage (persistent across sessions)
// Key: 'lastCloudSync'
// Force sync bypasses the cooldown check
```

### Existing Code to Reuse / Reference

| File                               | What to use                                                        |
| ---------------------------------- | ------------------------------------------------------------------ |
| `core/auth/guest-migration.ts`     | `CloudCardRow` type, `localCardToCloudRow()` mapper, batch pattern |
| `core/database/card-repository.ts` | `getAllCards()` — reads all local cards                            |
| `shared/supabase/client.ts`        | `getSupabaseClient()` — Supabase client singleton                  |
| `shared/supabase/schemas.ts`       | `cloudLoyaltyCardSchema` — Zod schema for cloud validation         |
| `shared/supabase/useAuthState.ts`  | `useAuthState()` — reactive auth state hook                        |
| `core/schemas/card.ts`             | `LoyaltyCard` type — local card shape                              |

### Supabase Table: `loyalty_cards`

Cloud schema (from `shared/supabase/schemas.ts`):

```
id            UUID (PK, client-generated)
user_id       UUID (FK → auth.users)
name          VARCHAR(50)
barcode       TEXT
barcode_format TEXT (enum)
brand_id      TEXT | NULL
color         TEXT (enum)
is_favorite   BOOLEAN
last_used_at  TIMESTAMPTZ | NULL
usage_count   INTEGER
created_at    TIMESTAMPTZ
updated_at    TIMESTAMPTZ
```

RLS policy: Users can only read/write their own rows (`user_id = auth.uid()`).

### File Placement

```
core/
  sync/
    cloud-sync.ts          ← NEW: Core upload/throttle service
    cloud-sync.test.ts     ← NEW: Unit tests
    mappers.ts             ← NEW: camelCase↔snake_case mappers (extracted from guest-migration)
    mappers.test.ts        ← NEW: Mapper tests
    index.ts               ← NEW: Barrel exports
shared/
  supabase/
    cards.ts               ← NEW: Supabase card CRUD operations (upsertCards, etc.)
    cards.test.ts          ← NEW: Tests
  hooks/
    useSyncUpload.ts       ← NEW: React hook for upload trigger/state
    useSyncUpload.test.ts  ← NEW: Hook tests
  components/
    SyncIndicator.tsx      ← NEW: Subtle sync spinner component
    SyncIndicator.test.tsx ← NEW: Component tests
```

### Previous Story Intelligence (6.14: Guest Migration)

- Dependency injection pattern (`CloudUpsertFn`) worked well — **reuse it**
- `BATCH_SIZE = 50` was appropriate for card upload
- SecureStore lazy-loader pattern handles web/Jest gracefully
- The field mapping `localCardToCloudRow()` is already battle-tested
- Review feedback: keep `core/` free of Supabase imports — inject functions from `shared/`

### Testing Strategy

1. **Unit tests** for `core/sync/cloud-sync.ts`:
   - Mock `getAllCards()` and `cloudUpsertFn`
   - Test batch splitting (0, 1, 49, 50, 51, 100, 150 cards)
   - Test throttle logic (within cooldown, expired cooldown, force sync)
   - Test error handling (partial batch failure, total failure)
   - Test idempotency (same cards uploaded twice)

2. **Unit tests** for `core/sync/mappers.ts`:
   - Verify all 12 field mappings (camelCase → snake_case)
   - Test null field handling (`brandId: null` → `brand_id: null`)
   - Test boolean mapping (`isFavorite: true` → `is_favorite: true`)

3. **Unit tests** for `shared/supabase/cards.ts`:
   - Mock Supabase client
   - Verify upsert call parameters
   - Test error response handling

4. **Hook tests** for `useSyncUpload`:
   - Test auto-trigger on auth state change
   - Test `isSyncing` / `syncError` state transitions
   - Test manual `forceSync` trigger

### Relationship to Other Stories

| Story                      | Relationship                                                              |
| -------------------------- | ------------------------------------------------------------------------- |
| **7.2 (Download)**         | Parallel — uses same `shared/supabase/cards.ts` module                    |
| **7.3 (Sync Changes)**     | Builds on upload — adds CRUD-level sync triggers                          |
| **7.4 (Delta Sync)**       | Optimizes upload — adds `updatedAt` comparison to only send changed cards |
| **7.5 (Offline Queue)**    | Adds resilience — queues failed uploads for retry                         |
| **7.7 (Sync Status)**      | Uses `isSyncing` state from this story's hook                             |
| **6.14 (Guest Migration)** | Refactor to use shared `core/sync/` utilities                             |

### References

- [Source: docs/architecture.md#Sync Patterns] — Cloud sync throttle, batch pattern
- [Source: docs/architecture.md#API & Communication Patterns] — Supabase REST API
- [Source: docs/architecture.md#Data Architecture] — Delta sync, last-write-wins
- [Source: docs/project_context.md#Sync Patterns] — 5-minute cooldown, force sync
- [Source: docs/epics.md#Epic 7] — Full epic scope and story interconnections
- [Source: core/auth/guest-migration.ts] — Existing upload pattern to extract and reuse

---

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Debug Log References

- Implemented new sync core module with throttle and batch upload in `core/sync/`.
- Added Supabase upload adapter with validation in `shared/supabase/cards.ts`.
- Added upload hook + indicator UI and integrated on home screen.
- Full test suite run completed: 819 passed, 0 failed.

### Completion Notes List

- ✅ Implemented `uploadLocalCards`/`forceSyncLocalCards` with 5-minute AsyncStorage throttle persistence.
- ✅ Added shared card mapper (`localCardToCloudRow`) and extracted `CloudCardRow` usage across sync and guest migration.
- ✅ Implemented batch processing (`BATCH_SIZE = 50`) with partial-failure continuation and structured result payload.
- ✅ Added `upsertCards` Supabase layer (`onConflict: 'id'`) with pre-upload schema validation and tests.
- ✅ Added `useSyncUpload` hook exposing `isSyncing`, `syncError`, `triggerSync`, `forceSync`, `clearSyncError`.
- ✅ Added non-blocking `SyncIndicator` component and integrated sync UI into home screen while preserving card list interaction.
- ✅ Added AsyncStorage Jest mock and resilience fallback in `useAuthState` for missing Supabase env during tests.
- ⚠️ `SyncErrorBanner` component implemented here to satisfy AC5 (error visibility + retry). Story 7.7 Task 4 plans the same component — 7.7 should extend/reuse rather than recreate.
- ✅ Code Review: Added error logging to sync paths (AC5), fixed `useSyncUpload` re-render pattern (`isRunningRef`), documented `CloudUpsertFn` validation contract.

### Change Log

- 2026-03-21: Implemented Story 7.1 upload-to-cloud flow (core sync service, Supabase upsert adapter, sync hook, indicator UI, tests, and integration updates).
- 2026-03-21: Code Review remediation — error logging (H2/AC5), isRunningRef pattern (M1), CloudUpsertFn validation contract (M3), File List update (M2).

### File List

- app/index.tsx
- core/auth/guest-migration.ts
- core/auth/guest-migration.test.ts
- core/sync/cloud-sync.ts
- core/sync/cloud-sync.test.ts
- core/sync/index.ts
- core/sync/mappers.ts
- core/sync/mappers.test.ts
- shared/components/SyncIndicator.tsx
- shared/components/SyncIndicator.test.tsx
- shared/components/SyncErrorBanner.tsx
- shared/components/SyncErrorBanner.test.tsx
- shared/hooks/useSyncUpload.ts
- shared/hooks/useSyncUpload.test.ts
- shared/supabase/cards.ts
- shared/supabase/cards.test.ts
- shared/supabase/useAuthState.ts
- features/auth/useGuestMigration.ts
- jest.setup.js
- package.json
- yarn.lock
- docs/sprint-artifacts/sprint-status.yaml
- docs/sprint-artifacts/stories/7-1-upload-cards-to-cloud.md
