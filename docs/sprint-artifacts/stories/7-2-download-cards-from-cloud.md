# Story 7.2: Download Cards from Cloud

**Epic:** 7 - Cloud Synchronization
**Type:** User-Facing
**Status:** ready-for-dev
**Sprint:** 9
**FRs Covered:** FR38, FR39

---

## Story

**As a** signed-in user,
**I want** my cloud cards downloaded to a new device,
**So that** I can access them everywhere.

---

## Acceptance Criteria

### AC1: Download Cards on Sign-In

```gherkin
Given I sign in on a new device (or after a fresh install)
When authentication succeeds
Then all my cards from the Supabase loyalty_cards table are downloaded
And the cards appear in my local card list
And brand logos display correctly (using bundled catalogue matching by brandId)
And I can use the cards immediately after download
```

### AC2: Merge Cloud Cards with Local Cards

```gherkin
Given I already have local cards on the device (guest mode)
When I sign in and cloud cards are downloaded
Then cloud cards are merged with local cards
And duplicate cards (same id) are resolved via last-write-wins (latest updatedAt keeps)
And no cards are lost in the merge process
```

### AC3: Cloud-to-Local Field Mapping

```gherkin
Given cards are downloaded from Supabase in snake_case format
When the cards are stored locally
Then all fields are correctly mapped to camelCase (local schema)
And the user_id field is stripped (not stored locally)
And Zod validation passes for every downloaded card (using parseWithLogging)
```

### AC4: Batch Download for Large Collections

```gherkin
Given I have many cards stored in the cloud (e.g., 100+)
When download occurs
Then cards are fetched efficiently (Supabase handles pagination if needed)
And the process completes without timeout
And a sync indicator is visible during download
```

### AC5: Sync Indicator During Download

```gherkin
Given a download is in progress
When the UI renders
Then I see a subtle sync indicator (reusing SyncIndicator from 7.1)
And the indicator does not block my interaction
And the indicator disappears when download completes
```

### AC6: Error Handling

```gherkin
Given the download fails (network error, server error)
When the error is caught
Then the error is logged via logger
And the user sees a non-blocking error message: "Couldn't load your cloud cards. They'll sync when connectivity is restored."
And local cards remain unaffected and fully usable
And the user can trigger a manual retry
```

### AC7: No Cloud Cards Scenario

```gherkin
Given I sign in on a new device but have no cards in the cloud
When download completes
Then the app shows an empty card list (or only local cards if any)
And no error is displayed
And the sync indicator completes normally
```

---

## Tasks / Subtasks

- [ ] **Task 1: Add download function to `core/sync/cloud-sync.ts`** (AC: #1, #4)
  - [ ] 1.1 Implement `downloadCloudCards(userId, cloudFetchFn)` — core download service
  - [ ] 1.2 Accept injected `CloudFetchFn` (dependency injection — same pattern as upload)
  - [ ] 1.3 Return `{ success, downloadedCount, cards }` or error result
  - [ ] 1.4 Respect sync throttle (reuse throttle from 7.1)
  - [ ] 1.5 Unit tests for download logic

- [ ] **Task 2: Implement cloud-to-local mapper** (AC: #3)
  - [ ] 2.1 Add `cloudRowToLocalCard(row: CloudCardRow): LoyaltyCard` to `core/sync/mappers.ts`
  - [ ] 2.2 Strip `user_id` field during mapping
  - [ ] 2.3 Map snake_case → camelCase for all 12 fields
  - [ ] 2.4 Validate each mapped card against `loyaltyCardSchema` using `parseWithLogging`
  - [ ] 2.5 Skip invalid cards (log + continue, don't crash on a single bad row)
  - [ ] 2.6 Unit tests for reverse mapping

- [ ] **Task 3: Implement merge logic** (AC: #2)
  - [ ] 3.1 Create `mergeCards(localCards, cloudCards): MergeResult` in `core/sync/cloud-sync.ts`
  - [ ] 3.2 Match cards by `id` (UUID)
  - [ ] 3.3 For duplicates: keep the card with the latest `updatedAt` (last-write-wins — per architecture)
  - [ ] 3.4 For cloud-only cards: insert into local DB
  - [ ] 3.5 For local-only cards: keep as-is (upload handles pushing them to cloud)
  - [ ] 3.6 Return `{ merged: LoyaltyCard[], added: number, updated: number, unchanged: number }`
  - [ ] 3.7 Unit tests for merge: no overlap, partial overlap, full overlap, cloud-newer wins, local-newer wins

- [ ] **Task 4: Add Supabase fetch function** (AC: #1, #4)
  - [ ] 4.1 Add `fetchCards(userId): CloudCardRow[]` to `shared/supabase/cards.ts` (same module from 7.1)
  - [ ] 4.2 Use `supabase.from('loyalty_cards').select('*').eq('user_id', userId)`
  - [ ] 4.3 Handle empty result gracefully (return empty array, not error)
  - [ ] 4.4 Unit test with mocked Supabase client

- [ ] **Task 5: Persist merged cards to local DB** (AC: #1, #2)
  - [ ] 5.1 Use `upsertCard()` from `core/database/card-repository.ts` for each merged card
  - [ ] 5.2 Wrap in transaction for atomicity
  - [ ] 5.3 Handle large sets efficiently (batch upserts)
  - [ ] 5.4 Trigger card list refresh after write (invalidate TanStack Query cache or Zustand update)

- [ ] **Task 6: Create `useSyncDownload` hook (or extend `useSyncUpload` → `useCloudSync`)** (AC: #5, #6, #7)
  - [ ] 6.1 Expose `{ isSyncing, syncError, downloadedCount }` state
  - [ ] 6.2 Wire to auth state — auto-trigger download on sign-in
  - [ ] 6.3 Coordinate with upload: download first, then upload local-only cards
  - [ ] 6.4 Reuse `SyncIndicator` from Story 7.1
  - [ ] 6.5 Unit tests for hook

---

## Dev Notes

### Design Decision: Unified Sync Hook

Stories 7.1 and 7.2 should likely share a single `useCloudSync` hook (rather than separate upload/download hooks) since the typical flow is:

1. **Sign in** → auth state changes to `authenticated`
2. **Download** cloud cards → merge with local
3. **Upload** local-only cards → push to cloud

Consider designing the hook in 7.1 with download capability in mind, or refactor when implementing 7.2.

### Merge Algorithm (Last-Write-Wins)

```
For each card in (localCards ∪ cloudCards):
  if card.id exists in BOTH local and cloud:
    keep the one with latest updatedAt
  if card.id exists ONLY in cloud:
    insert into local DB
  if card.id exists ONLY locally:
    no action (7.1 upload handles pushing to cloud)
```

**Important:** Compare `updatedAt` as ISO 8601 strings — lexicographic comparison works correctly for ISO timestamps (per architecture doc).

### Architecture Compliance

| Rule                           | Implementation                                                                                   |
| ------------------------------ | ------------------------------------------------------------------------------------------------ |
| **Layer boundaries**           | Fetch logic in `shared/supabase/cards.ts`. Merge logic in `core/sync/`. Hook in `shared/hooks/`. |
| **Dependency injection**       | `core/sync/` receives fetch function as parameter (never imports Supabase)                       |
| **snake_case → camelCase**     | Cloud rows mapped at boundary in `core/sync/mappers.ts`                                          |
| **Zod validation**             | Every downloaded card validated against `loyaltyCardSchema` via `parseWithLogging`               |
| **DB writes use transactions** | Batch upsert wrapped in `withTransactionAsync`                                                   |
| **Error shape**                | `{ code, message, details? }` AppError pattern                                                   |
| **Logging**                    | Use `logger` wrapper                                                                             |
| **JSON nulls**                 | All fields present when writing to local DB                                                      |

### Existing Code to Reuse / Reference

| File                                  | What to use                                                   |
| ------------------------------------- | ------------------------------------------------------------- |
| `core/sync/cloud-sync.ts`             | Throttle logic and upload service (from Story 7.1)            |
| `core/sync/mappers.ts`                | `localCardToCloudRow()` — add reverse `cloudRowToLocalCard()` |
| `core/database/card-repository.ts`    | `getAllCards()`, `upsertCard()` — local DB operations         |
| `shared/supabase/client.ts`           | `getSupabaseClient()` — Supabase singleton                    |
| `shared/supabase/schemas.ts`          | `cloudLoyaltyCardSchema` — validation for cloud rows          |
| `shared/supabase/cards.ts`            | Module created in 7.1 — add `fetchCards()` here               |
| `shared/supabase/useAuthState.ts`     | `useAuthState()` — trigger download on sign-in                |
| `core/schemas/card.ts`                | `loyaltyCardSchema`, `LoyaltyCard` type                       |
| `shared/components/SyncIndicator.tsx` | Reuse sync indicator from 7.1                                 |

### File Placement

```
core/
  sync/
    cloud-sync.ts     ← EXTEND: add downloadCloudCards(), mergeCards()
    cloud-sync.test.ts ← EXTEND: add download and merge tests
    mappers.ts        ← EXTEND: add cloudRowToLocalCard()
    mappers.test.ts   ← EXTEND: add reverse mapper tests
shared/
  supabase/
    cards.ts          ← EXTEND: add fetchCards()
    cards.test.ts     ← EXTEND: add fetch tests
  hooks/
    useCloudSync.ts   ← EXTEND or RENAME from useSyncUpload (add download flow)
    useCloudSync.test.ts
```

### Testing Strategy

1. **Merge logic tests** (highest priority — this is the core complexity):
   - Empty local + empty cloud → empty result
   - Local only (5 cards) + empty cloud → 5 unchanged
   - Empty local + cloud only (5 cards) → 5 added
   - Partial overlap — cloud newer wins
   - Partial overlap — local newer wins
   - Full overlap — identical cards → unchanged
   - Edge: identical `updatedAt` → cloud wins (deterministic tiebreak)

2. **Reverse mapper tests**:
   - All 12 field mappings (snake_case → camelCase)
   - `user_id` stripped from output
   - `null` fields preserved correctly
   - `is_favorite` (boolean in cloud) → `isFavorite` (boolean in local)

3. **Download function tests**:
   - Happy path: fetch + map + merge + persist
   - Empty cloud response → no error
   - Fetch failure → error result, local cards untouched
   - Throttle respected (reuses 7.1 throttle)

4. **Integration with upload**:
   - Sign-in triggers download → merge → upload local-only cards

### Relationship to Other Stories

| Story                         | Relationship                                                     |
| ----------------------------- | ---------------------------------------------------------------- |
| **7.1 (Upload)**              | Shares `core/sync/`, `shared/supabase/cards.ts`, `SyncIndicator` |
| **7.3 (Sync Changes)**        | Builds on bidirectional sync — adds CRUD-level triggers          |
| **7.4 (Delta Sync)**          | Optimizes download — fetch only cards changed since last sync    |
| **7.5 (Offline Queue)**       | Adds resilience for failed downloads                             |
| **7.6 (Conflict Resolution)** | Formalizes the last-write-wins merge from this story             |
| **7.7 (Sync Status)**         | Displays download progress from `isSyncing` state                |

### References

- [Source: docs/architecture.md#Sync Patterns] — Last-write-wins, 5-min throttle
- [Source: docs/architecture.md#Data Architecture] — Delta sync strategy
- [Source: docs/architecture.md#API & Communication Patterns] — Supabase REST API
- [Source: docs/project_context.md#Sync Patterns] — Cloud sync cooldown
- [Source: docs/epics.md#Story 7.2] — Original AC and scope
- [Source: core/auth/guest-migration.ts] — Upload pattern to mirror for download
- [Source: core/database/card-repository.ts] — `upsertCard()` for local persistence

---

## Dev Agent Record

### Agent Model Used

_To be filled by dev agent_

### Debug Log References

### Completion Notes List

### Change Log

### File List
