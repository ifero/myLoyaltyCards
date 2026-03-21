# Story 7.6: Resolve Sync Conflicts

**Epic:** 7 - Cloud Synchronization
**Type:** User-Facing
**Status:** ready-for-dev
**Sprint:** 9
**FRs Covered:** FR52

---

## Story

**As a** user,
**I want** sync conflicts resolved automatically,
**So that** I don't have to manually fix data issues.

---

## Acceptance Criteria

### AC1: Last-Write-Wins by updatedAt

```gherkin
Given I edit a card on Device A at T1
And I edit the same card on Device B at T2 (where T2 > T1)
When both devices sync
Then the card data from Device B (T2) wins
And Device A receives the updated card from the cloud
And no user prompt or manual resolution is required
```

### AC2: Tie-Breaking — Cloud Wins

```gherkin
Given I edit a card locally at timestamp T
And the cloud version also has updatedAt = T (exact same instant)
When sync merges the data
Then the cloud version wins (deterministic tie-break)
And the local version is overwritten with cloud data
```

### AC3: Convergence Across Devices

```gherkin
Given conflicts are resolved via last-write-wins
When I view the card on all synced devices
Then all devices show identical card data
And updatedAt is consistent across all copies
```

### AC4: Partial Field Edits

```gherkin
Given I change the card name on Device A
And I change the card color on Device B (same card)
When both devices sync
Then the entire card from the latest edit wins (no field-level merge)
And no data corruption or partial updates occur
```

### AC5: Conflict During Offline Period

```gherkin
Given I edit a card while offline
And another device edits the same card and syncs to cloud
When my device comes back online and syncs
Then the standard last-write-wins applies using updatedAt timestamps
And the losing edit is silently overwritten
```

### AC6: Deletion vs Edit Conflict

```gherkin
Given I delete a card on Device A
And I edit the same card on Device B before Device A syncs
When both devices sync
Then the deletion wins (delete always takes precedence)
And the card is removed from both devices and cloud
```

### AC7: Logging Conflicts

```gherkin
Given a sync conflict is resolved
When the resolution occurs
Then the conflict is logged (dev-only) with:
  - cardId, local updatedAt, cloud updatedAt, winner
And no log is shown to the user
```

---

## Tasks / Subtasks

- [ ] **Task 1: Formalize merge algorithm in download module** (AC: #1, #2, #4)
  - [ ] 1.1 Review existing merge logic in `core/sync/download.ts` (from 7.2)
  - [ ] 1.2 Ensure `mergeCards()` implements strict last-write-wins using ISO string comparison
  - [ ] 1.3 Implement tie-break rule: when `local.updatedAt === cloud.updatedAt` → cloud wins
  - [ ] 1.4 Document the merge precedence in code comments
  - [ ] 1.5 Unit tests: local newer → local wins; cloud newer → cloud wins; tie → cloud wins

- [ ] **Task 2: Handle deletion vs edit conflicts** (AC: #6)
  - [ ] 2.1 Review deletion tracking from `core/sync/deletion-tracker.ts` (from 7.3)
  - [ ] 2.2 During merge: if card is in local deletion queue AND exists in cloud → send delete to cloud
  - [ ] 2.3 During merge: if card deleted in cloud (missing from cloud response) but edited locally → card is deleted locally
  - [ ] 2.4 Clarify: deletions always win over edits in both directions
  - [ ] 2.5 Unit tests for all deletion conflict scenarios:
    - Local delete + cloud edit → delete wins
    - Cloud delete + local edit → delete wins
    - Both delete → no-op (already gone)

- [ ] **Task 3: Implement conflict logging** (AC: #7)
  - [ ] 3.1 Create `logConflictResolution()` helper in `core/sync/conflict-logger.ts`
  - [ ] 3.2 Log: `{ cardId, localUpdatedAt, cloudUpdatedAt, winner: 'local' | 'cloud', reason }`
  - [ ] 3.3 Use `logger.log()` (dev-only) — no production telemetry for MVP
  - [ ] 3.4 Call from merge algorithm when local and cloud versions differ
  - [ ] 3.5 Unit tests: verify log output format

- [ ] **Task 4: Offline conflict scenarios** (AC: #5)
  - [ ] 4.1 Verify delta sync (7.4) + reconnect flow (7.5) handles timestamps correctly
  - [ ] 4.2 Offline changes have correct `updatedAt` from time of local edit (not sync time)
  - [ ] 4.3 Integration test: offline edit at T1 → cloud edit at T2 > T1 → reconnect → cloud wins
  - [ ] 4.4 Integration test: offline edit at T2 → cloud edit at T1 < T2 → reconnect → local wins

- [ ] **Task 5: Convergence verification** (AC: #3)
  - [ ] 5.1 After merge + upload cycle completes, both local and cloud have identical data
  - [ ] 5.2 Integration test: two-device simulation (local A + local B both sync to same cloud)
  - [ ] 5.3 Verify `updatedAt` is consistent after conflict resolution
  - [ ] 5.4 Verify card count matches on both sides after full sync cycle

- [ ] **Task 6: Edge case hardening**
  - [ ] 6.1 Handle malformed `updatedAt` values (null, empty, invalid date) → treat as epoch (oldest)
  - [ ] 6.2 Handle card with `updatedAt` in the future (clock skew) → still use comparison, log warning
  - [ ] 6.3 Handle concurrent sync attempts (guard with mutex / in-progress flag)
  - [ ] 6.4 Unit tests for all edge cases

---

## Dev Notes

### Why Last-Write-Wins (LWW)

For a loyalty card app, LWW is the right choice:

1. **Low conflict probability** — single-user app, not collaborative editing
2. **Low stakes** — a card name or color change is easy to redo
3. **Simplicity** — no conflict UI, no merge dialogs, zero user friction
4. **Predictable** — users intuitively expect "my latest change sticks"

Field-level merge (CRDTs, OT) would add massive complexity for near-zero benefit. Architecture explicitly defers this to v2 if user feedback demands it.

### Merge Decision Matrix

| Local State        | Cloud State        | Resolution                       | Notes             |
| ------------------ | ------------------ | -------------------------------- | ----------------- |
| Newer `updatedAt`  | Older `updatedAt`  | **Local wins** → upload to cloud |                   |
| Older `updatedAt`  | Newer `updatedAt`  | **Cloud wins** → upsert locally  |                   |
| Same `updatedAt`   | Same `updatedAt`   | **Cloud wins** (tie-break)       | Deterministic     |
| Exists             | Deleted (missing)  | **Delete locally**               | Cloud delete wins |
| Deleted (in queue) | Exists             | **Delete from cloud**            | Local delete wins |
| Deleted (in queue) | Deleted (missing)  | **No-op**                        | Already gone      |
| New (no cloud ID)  | N/A                | **Upload**                       | New local card    |
| N/A                | New (not in local) | **Insert locally**               | New cloud card    |

### Timestamp Comparison

```typescript
// ISO 8601 strings are lexicographically sortable
const localWins = local.updatedAt > cloud.updated_at;
const cloudWins = cloud.updated_at > local.updatedAt;
const isTie = local.updatedAt === cloud.updated_at;

// Tie-break: cloud wins
if (isTie || cloudWins) {
  // Upsert cloud version locally
} else {
  // Upload local version to cloud
}
```

**Important:** All timestamps must be in UTC ISO 8601 format. Local edits must set `updatedAt` to `new Date().toISOString()`. Never use local timezone strings.

### Architecture Compliance

| Rule               | Implementation                                                           |
| ------------------ | ------------------------------------------------------------------------ |
| **No new UI**      | This story is pure logic — no screens, no components                     |
| **Core layer**     | All conflict resolution lives in `core/sync/` (no React)                 |
| **Pure functions** | Merge logic is a pure function: `(localCards, cloudCards) → MergeResult` |
| **Logging**        | Dev-only via `logger.log()`, no production telemetry                     |
| **Testing**        | This is the highest-risk story — extensive unit + integration tests      |

### File Placement

```
core/
  sync/
    download.ts            ← EXTEND: formalize merge with tie-break + deletion conflicts
    download.test.ts       ← EXTEND: comprehensive conflict scenario tests
    conflict-logger.ts     ← NEW: logConflictResolution() helper
    conflict-logger.test.ts ← NEW
    deletion-tracker.ts    ← REVIEW: ensure deletion queue interacts correctly with merge
```

### Testing Strategy — HIGHEST RISK STORY

This story carries the **highest integration risk** in Epic 7. Testing must be exceptionally thorough.

1. **Unit: Merge algorithm** (≥15 test cases):
   - Local newer → local wins
   - Cloud newer → cloud wins
   - Tie → cloud wins
   - Local delete + cloud edit → delete wins
   - Cloud delete + local edit → delete wins
   - Both delete → no-op
   - New local card (no cloud match) → upload
   - New cloud card (no local match) → insert
   - Malformed updatedAt → treated as oldest
   - Future updatedAt (clock skew) → still compared, logged
   - Multiple cards with mixed conflicts → each resolved independently
   - Empty local set → full download
   - Empty cloud set → full upload
   - Both empty → no-op
   - Large batch (50+ cards) → all resolved correctly

2. **Unit: Conflict logger**:
   - Logs correct format
   - Only in dev mode
   - Handles edge cases (undefined fields)

3. **Integration: Full sync cycle with conflicts**:
   - Simulate Device A and Device B both editing same card
   - Run sync for both → verify convergence
   - Simulate offline conflict → verify correct resolution on reconnect

4. **Integration: Deletion conflicts**:
   - Delete on A, edit on B → both sync → card removed everywhere
   - Verify deletion queue is cleared after successful sync

### Relationship to Other Stories

| Story                   | Relationship                                                                              |
| ----------------------- | ----------------------------------------------------------------------------------------- |
| **7.2 (Download)**      | Merge algorithm is implemented in download.ts — this story formalizes and hardens it      |
| **7.3 (Sync Changes)**  | Deletion tracker must integrate with conflict resolution                                  |
| **7.4 (Delta Sync)**    | Delta sync provides the "changed since" cards that feed into merge                        |
| **7.5 (Offline Queue)** | Offline periods increase conflict likelihood — this story handles them                    |
| **7.7 (Sync Status)**   | Conflicts are resolved silently — sync status shows success/failure, not conflict details |

### References

- [Source: docs/architecture.md#Data Architecture] — "Conflict Resolution: Last-write-wins"
- [Source: docs/architecture.md#Sync Patterns] — Watch sync retry pattern (3 attempts)
- [Source: docs/architecture.md#Watch App Editing Policy] — "Add field-level merge in v2 if user feedback requires it"
- [Source: docs/epics.md#Story 7.6] — Original AC

---

## Dev Agent Record

### Agent Model Used

_To be filled by dev agent_

### Debug Log References

### Completion Notes List

### Change Log

### File List
