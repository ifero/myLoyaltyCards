# Story 7.4: Implement Delta Sync

**Epic:** 7 - Cloud Synchronization
**Type:** User-Facing
**Status:** ready-for-dev
**Sprint:** 9
**FRs Covered:** FR35, FR36

---

## Story

**As a** signed-in user,
**I want** only changed cards to sync,
**So that** sync is fast and data-efficient.

---

## Acceptance Criteria

### AC1: Upload Only Changed Cards

```gherkin
Given I have 100 cards and edit 1
When sync occurs
Then only the 1 changed card is uploaded (not all 100)
And the sync uses updatedAt timestamps to detect changes
And the sync completes significantly faster than a full sync
```

### AC2: Download Only Changed Cards

```gherkin
Given my device syncs after being offline for a while
When sync resumes
Then only cards changed in the cloud since my last sync are downloaded
And the download uses a "last sync timestamp" to filter
And the sync completes quickly even with a large cloud collection
```

### AC3: Last Sync Timestamp Persistence

```gherkin
Given a sync completes successfully
When the sync finishes
Then the current timestamp is stored as "lastSyncAt" in AsyncStorage
And this timestamp persists across app restarts
And future syncs use this timestamp to determine what's changed
```

### AC4: First Sync Fallback

```gherkin
Given I have never synced before (no lastSyncAt stored)
When sync occurs
Then a full sync is performed (same as 7.1/7.2 behavior)
And after completion, lastSyncAt is recorded
And subsequent syncs use delta logic
```

### AC5: Delta Upload — Detect Local Changes

```gherkin
Given cards have been modified locally since lastSyncAt
When delta upload runs
Then only cards with updatedAt > lastSyncAt are uploaded to cloud
And unchanged cards are skipped entirely
And the upload count reflects only the changed cards
```

### AC6: Delta Download — Fetch Remote Changes

```gherkin
Given cards have been modified in the cloud since lastSyncAt
When delta download runs
Then the Supabase query filters: updated_at > lastSyncAt
And only the changed cloud cards are downloaded
And they are merged with local cards using last-write-wins (from 7.2)
```

### AC7: Deletion Sync Unaffected

```gherkin
Given deletions are tracked in the pending deletion queue (from 7.3)
When delta sync runs
Then pending deletions are still processed (delete by ID, no timestamp filter)
And the deletion tracker is cleared after successful delete
```

---

## Tasks / Subtasks

- [ ] **Task 1: Implement lastSyncAt persistence** (AC: #3, #4)
  - [ ] 1.1 Create `core/sync/sync-timestamp.ts` — read/write last sync timestamp
  - [ ] 1.2 `getLastSyncAt(): Promise<string | null>` — reads from AsyncStorage
  - [ ] 1.3 `setLastSyncAt(timestamp: string): Promise<void>` — writes to AsyncStorage
  - [ ] 1.4 `clearLastSyncAt(): Promise<void>` — for logout/reset scenarios
  - [ ] 1.5 Key: `'cloudSyncLastSyncAt'` in AsyncStorage
  - [ ] 1.6 Unit tests (read/write/clear/null on first use)

- [ ] **Task 2: Implement delta upload** (AC: #1, #5)
  - [ ] 2.1 Refactor `syncChangedCards()` in `core/sync/cloud-sync.ts` to accept `lastSyncAt`
  - [ ] 2.2 Filter local cards: `card.updatedAt > lastSyncAt` (ISO string comparison)
  - [ ] 2.3 If `lastSyncAt` is null → full upload (fallback to 7.1 behavior)
  - [ ] 2.4 Map filtered cards to `CloudCardRow[]` and upsert to cloud
  - [ ] 2.5 Return `{ uploadedCount, skippedCount }` for observability
  - [ ] 2.6 Unit tests: 0 changed, 1 changed, all changed, null lastSyncAt → full sync

- [ ] **Task 3: Implement delta download** (AC: #2, #6)
  - [ ] 3.1 Add `fetchCardsSince(userId, since: string)` to `shared/supabase/cards.ts`
  - [ ] 3.2 Supabase query: `.select('*').eq('user_id', userId).gt('updated_at', since)`
  - [ ] 3.3 If `since` is null → fetch all (fallback to full download)
  - [ ] 3.4 Merge downloaded cards with local using existing merge logic from 7.2
  - [ ] 3.5 Unit tests: empty result, partial result, null since → full fetch

- [ ] **Task 4: Integrate delta logic into sync pipeline** (AC: #1, #2, #4, #7)
  - [ ] 4.1 Refactor `processPendingSync()` from 7.3 to use delta logic:
    1. Read `lastSyncAt`
    2. Delta download (fetch cloud changes since lastSyncAt)
    3. Merge with local
    4. Delta upload (push local changes since lastSyncAt)
    5. Process pending deletions (unchanged — by ID)
    6. Update `lastSyncAt` to current timestamp
  - [ ] 4.2 On first sync (null lastSyncAt): full sync → set lastSyncAt
  - [ ] 4.3 Ensure atomicity: only update lastSyncAt after ALL operations succeed
  - [ ] 4.4 Unit tests for complete delta sync pipeline

- [ ] **Task 5: Handle edge cases** (AC: #4, #7)
  - [ ] 5.1 Clock skew: use server timestamp from Supabase response for lastSyncAt (not local clock)
  - [ ] 5.2 Or use `new Date().toISOString()` with acknowledgement that minor skew is acceptable for MVP
  - [ ] 5.3 Clear lastSyncAt on logout (so next sign-in triggers full sync)
  - [ ] 5.4 Unit tests for logout → clear → re-login → full sync

---

## Dev Notes

### Delta Sync Algorithm

```
const lastSyncAt = await getLastSyncAt(); // null on first run

// PHASE 1: Delta Download
if (lastSyncAt) {
  const cloudChanges = await cloudFetchSinceFn(userId, lastSyncAt);
  const localCards = await getAllCards();
  const merged = mergeCards(localCards, cloudChanges); // last-write-wins
  await persistMergedCards(merged);
} else {
  // First sync — full download
  await fullDownload(userId);
}

// PHASE 2: Delta Upload
const localCards = await getAllCards();
const changedCards = lastSyncAt
  ? localCards.filter(c => c.updatedAt > lastSyncAt)
  : localCards; // First sync — upload all
await cloudUpsertFn(changedCards.map(localCardToCloudRow));

// PHASE 3: Process Deletions (always by ID, no timestamp filter)
const pendingDeletions = await getPendingDeletions();
for (const cardId of pendingDeletions) {
  await cloudDeleteFn(cardId, userId);
}
await clearPendingDeletions();

// PHASE 4: Update timestamp
await setLastSyncAt(new Date().toISOString());
```

### ISO 8601 String Comparison

Per architecture doc, all dates are ISO 8601 UTC strings. Lexicographic comparison works correctly:

```typescript
'2026-03-20T10:00:00.000Z' > '2026-03-19T23:59:59.999Z'; // true ✅
```

This means we can filter with simple string `>` operators — no date parsing needed.

### Supabase Query for Delta Download

```typescript
// Fetch only cards modified after lastSyncAt
const { data, error } = await supabase
  .from('loyalty_cards')
  .select('*')
  .eq('user_id', userId)
  .gt('updated_at', lastSyncAt);
```

This leverages the `updated_at` column index on the Supabase table. If the table grows large, an index on `(user_id, updated_at)` would be beneficial — but for MVP card volumes (< 1000 per user) this is fine.

### Refactoring Impact on 7.1/7.2/7.3

This story **refactors** the sync pipeline built in previous stories:

| Story              | What changes                                                                                              |
| ------------------ | --------------------------------------------------------------------------------------------------------- |
| 7.1 (Upload)       | `uploadLocalCards()` becomes the "full upload" fallback; delta version filters by `updatedAt`             |
| 7.2 (Download)     | `downloadCloudCards()` becomes the "full download" fallback; delta version adds `gt('updated_at', since)` |
| 7.3 (Sync Changes) | `processPendingSync()` gets refactored to use delta pipeline                                              |

The refactoring should be incremental — keep full sync functions, add delta variants alongside.

### Architecture Compliance

| Rule                     | Implementation                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------- |
| **Layer boundaries**     | Timestamp persistence in `core/sync/`. Supabase filtered query in `shared/supabase/`. |
| **Dependency injection** | Delta fetch function injected as `CloudFetchSinceFn` parameter                        |
| **AsyncStorage**         | Used for `lastSyncAt` persistence (not SecureStore — not sensitive data)              |
| **ISO 8601 strings**     | Timestamp comparisons as strings, no Date objects                                     |
| **Logging**              | Log delta sync stats: `"Delta sync: uploaded 3, downloaded 5, deleted 1"`             |
| **No React in core/**    | Timestamp service and delta logic are pure TS                                         |

### File Placement

```
core/
  sync/
    sync-timestamp.ts       ← NEW: lastSyncAt read/write/clear
    sync-timestamp.test.ts  ← NEW
    cloud-sync.ts           ← REFACTOR: add delta upload/download variants
    cloud-sync.test.ts      ← EXTEND: delta tests
    sync-trigger.ts         ← REFACTOR: processPendingSync uses delta pipeline
    sync-trigger.test.ts    ← EXTEND
    index.ts                ← EXTEND: export sync-timestamp
shared/
  supabase/
    cards.ts                ← EXTEND: add fetchCardsSince()
    cards.test.ts           ← EXTEND
```

### Testing Strategy

1. **Sync timestamp tests**:
   - Read returns null when never set
   - Write then read returns correct value
   - Clear then read returns null
   - Value persists across mock "restarts"

2. **Delta upload tests**:
   - 100 cards, 0 changed since lastSyncAt → 0 uploaded
   - 100 cards, 3 changed → 3 uploaded
   - lastSyncAt null → all 100 uploaded (full sync fallback)
   - Edge: card.updatedAt === lastSyncAt → NOT uploaded (strict `>`)

3. **Delta download tests**:
   - Supabase returns 0 changes → no merge needed
   - Supabase returns 5 changes → merge with local
   - lastSyncAt null → full fetch (no filter)

4. **Pipeline integration tests**:
   - Full cycle: delta download → merge → delta upload → delete → update timestamp
   - First sync (null lastSyncAt): full sync → timestamp set
   - Subsequent sync: delta only
   - Failure mid-pipeline: lastSyncAt NOT updated (atomicity)

### Relationship to Other Stories

| Story                         | Relationship                                                   |
| ----------------------------- | -------------------------------------------------------------- |
| **7.1 (Upload)**              | This story refactors upload to be delta-aware                  |
| **7.2 (Download)**            | This story refactors download to be delta-aware                |
| **7.3 (Sync Changes)**        | This story optimizes the sync pipeline from 7.3                |
| **7.5 (Offline Queue)**       | Offline queue feeds into delta sync when connectivity returns  |
| **7.6 (Conflict Resolution)** | Last-write-wins during merge handles conflicts from delta sync |
| **7.7 (Sync Status)**         | Reports delta sync stats (uploaded/downloaded counts)          |

### References

- [Source: docs/architecture.md#Sync Patterns] — Delta sync, timestamp-based
- [Source: docs/architecture.md#Data Architecture] — "Sync Strategy: Delta sync, Timestamp-based, changed cards only"
- [Source: docs/project_context.md#Sync Patterns] — 5-min cooldown, force sync
- [Source: docs/epics.md#Story 7.4] — Original AC and scope
- [Source: core/sync/cloud-sync.ts] — Upload/download infrastructure to refactor
- [Source: core/sync/sync-trigger.ts] — processPendingSync() to integrate delta logic

---

## Dev Agent Record

### Agent Model Used

_To be filled by dev agent_

### Debug Log References

### Completion Notes List

### Change Log

### File List
