# Story 7.5: Handle Offline Queue

**Epic:** 7 - Cloud Synchronization
**Type:** User-Facing
**Status:** done
**Sprint:** 9
**FRs Covered:** FR48, FR49, FR50, FR51

---

## Story

**As a** signed-in user,
**I want** my changes saved when offline,
**So that** nothing is lost when I'm in a basement or on a plane.

---

## Acceptance Criteria

### AC1: Offline Changes Queued Locally

```gherkin
Given I am signed in but offline (no network connectivity)
When I add, edit, or delete a card
Then the operation completes successfully against the local DB
And my local data reflects the change immediately
And the change is queued for cloud sync when connectivity returns
```

### AC2: Automatic Sync on Reconnect

```gherkin
Given I have queued operations from offline changes
When network connectivity is restored
Then queued operations are synced automatically via the delta sync pipeline
And I see a brief sync indicator during the sync
And no user intervention is required
```

### AC3: Queue Persistence

```gherkin
Given I make changes while offline
When I force-close the app and reopen it (still offline)
Then my local changes are preserved in SQLite
And the "dirty" flag persists (sync still pending)
And when connectivity returns, sync processes all pending changes
```

### AC4: Retry with Backoff

```gherkin
Given a sync attempt fails after connectivity is restored
When the retry logic kicks in
Then sync is retried up to 3 times with exponential backoff (1s, 2s, 4s)
And each retry attempt is logged
And the user is not bombarded with error messages during retries
```

### AC5: Max Retries Exceeded

```gherkin
Given a queued sync fails repeatedly
When max retries (3) are exceeded
Then I see a non-blocking error notification: "Sync failed. Changes saved locally."
And a manual "Retry" action is available
And local data remains intact and usable
```

### AC6: Network Connectivity Detection

```gherkin
Given the app is running
When network state changes (online ↔ offline)
Then the app detects the change via NetInfo
And transitions to/from offline mode accordingly
And sync is triggered when transitioning from offline → online
```

### AC7: Offline Indicator

```gherkin
Given I am offline
When I use the app
Then I see a subtle offline indicator (e.g., small banner or icon)
And the indicator disappears when connectivity returns
And all card features remain fully functional while offline
```

---

## Tasks / Subtasks

- [x] **Task 1: Add network connectivity detection** (AC: #6)
  - [x] 1.1 Install `@react-native-community/netinfo` (via `npx expo install`)
  - [x] 1.2 Create `shared/hooks/useNetworkStatus.ts` — reactive connectivity hook
  - [x] 1.3 Expose `{ isConnected, isInternetReachable }` state
  - [x] 1.4 Subscribe to NetInfo events for real-time updates
  - [x] 1.5 Unit tests (mock NetInfo)

- [x] **Task 2: Create offline-aware sync coordinator** (AC: #1, #2, #3)
  - [x] 2.1 Extend `core/sync/sync-trigger.ts` with offline awareness
  - [x] 2.2 When `markDirty()` is called and offline → set persistent dirty flag only (no sync attempt)
  - [x] 2.3 When connectivity restored → check dirty flag → trigger delta sync
  - [x] 2.4 Dirty flag uses AsyncStorage: key `'cloudSyncDirtyFlag'` = `'true' | null`
  - [x] 2.5 Clear dirty flag only after successful sync
  - [x] 2.6 Unit tests for offline → dirty → reconnect → sync flow

- [x] **Task 3: Implement retry with exponential backoff** (AC: #4, #5)
  - [x] 3.1 Create `core/sync/retry.ts` — generic retry utility
  - [x] 3.2 `retryWithBackoff(fn, { maxRetries: 3, baseDelay: 1000 })`
  - [x] 3.3 Delays: 1s, 2s, 4s (exponential: `baseDelay * 2^attempt`)
  - [x] 3.4 Log each retry attempt via logger
  - [x] 3.5 Return result or final error after max retries
  - [x] 3.6 Unit tests: success on 1st try, success on retry, all retries fail

- [x] **Task 4: Integrate retry into sync pipeline** (AC: #4, #5)
  - [x] 4.1 Wrap `processPendingSync()` (from 7.3/7.4) with `retryWithBackoff`
  - [x] 4.2 On final failure: expose error state for UI, keep dirty flag set
  - [x] 4.3 On success: clear dirty flag, update lastSyncAt
  - [x] 4.4 Unit tests for retry integration

- [x] **Task 5: Wire reconnect trigger** (AC: #2, #6)
  - [x] 5.1 Extend `shared/hooks/useAutoSync.ts` (from 7.3) with NetInfo listener
  - [x] 5.2 On `isConnected` transition: `false → true` AND dirty flag set → trigger sync
  - [x] 5.3 Debounce reconnect triggers (avoid rapid on/off/on spurious syncs)
  - [x] 5.4 Coordinate with existing throttle (reconnect sync respects cooldown unless force)
  - [x] 5.5 Unit tests for reconnect flow

- [x] **Task 6: Create offline indicator component** (AC: #7)
  - [x] 6.1 Create `shared/components/OfflineIndicator.tsx`
  - [x] 6.2 Small banner at top of screen: "You're offline. Changes saved locally."
  - [x] 6.3 Uses `useNetworkStatus` hook for reactivity
  - [x] 6.4 Appears with subtle animation, disappears on reconnect
  - [x] 6.5 Non-blocking — does not cover content
  - [x] 6.6 Integrate into root layout (`app/_layout.tsx`)
  - [x] 6.7 Unit tests (renders when offline, hidden when online)

- [x] **Task 7: Manual retry action** (AC: #5)
  - [x] 7.1 When max retries exceeded, expose `retrySync()` function from hook
  - [x] 7.2 Sync error state includes a "Retry" button in error UI
  - [x] 7.3 Manual retry resets retry counter and attempts sync again
  - [x] 7.4 Unit test for manual retry flow

---

## Dev Notes

### Offline-First Architecture — Local DB Is Always Source of Truth

The app already works fully offline (SQLite stores all cards locally). This story adds:

1. **Awareness** — knowing we're offline (NetInfo)
2. **Queueing** — flagging that changes need to be synced
3. **Resilience** — retrying failed syncs with backoff
4. **UX** — telling the user they're offline

The local card CRUD flow is **unchanged**. All operations still go directly to SQLite. The sync layer is purely additive.

### Why a Dirty Flag (Not an Operation Queue)

Two approaches for offline sync:

**Option A: Operation queue** — Record each insert/update/delete as a queued operation, replay them on reconnect.

- Pros: Exact replay, no redundant work
- Cons: Complex, ordering issues, partial failures, storage overhead

**Option B: Dirty flag + delta sync** (CHOSEN)

- Pros: Simple, leverages existing delta sync (7.4), no new data structures
- Cons: May re-sync unchanged cards if `lastSyncAt` is stale — acceptable for MVP volumes

**The dirty flag approach works because:**

- Delta sync (7.4) already compares `updatedAt > lastSyncAt`
- Deletions are already tracked in the deletion queue (7.3)
- On reconnect, delta sync naturally picks up all changes since last successful sync
- No need for a separate operation queue

### NetInfo Library

```typescript
import NetInfo from '@react-native-community/netinfo';

// Subscribe to connectivity changes
const unsubscribe = NetInfo.addEventListener((state) => {
  const isConnected = state.isConnected ?? false;
  const isReachable = state.isInternetReachable ?? false;
});

// One-time check
const state = await NetInfo.fetch();
```

**Important:** Use `npx expo install @react-native-community/netinfo` to get the Expo-compatible version.

### Retry Utility Pattern

```typescript
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  options: { maxRetries?: number; baseDelay?: number } = {}
): Promise<T> => {
  const { maxRetries = 3, baseDelay = 1000 } = options;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      const delay = baseDelay * Math.pow(2, attempt);
      logger.log(`Sync retry ${attempt + 1}/${maxRetries}, waiting ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error('Unreachable'); // TypeScript satisfaction
};
```

### Architecture Compliance

| Rule                  | Implementation                                                                                             |
| --------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Layer boundaries**  | Retry utility in `core/sync/`. Network hook in `shared/hooks/`. Offline indicator in `shared/components/`. |
| **No React in core/** | `retry.ts` and sync-trigger extensions are pure TS                                                         |
| **Library install**   | `npx expo install @react-native-community/netinfo` (Expo-compatible version)                               |
| **AsyncStorage**      | Dirty flag persistence (not SecureStore — not sensitive)                                                   |
| **Error shape**       | Retry failures returned as `AppError { code: 'SYNC_MAX_RETRIES', message }`                                |
| **Logging**           | Log each retry attempt and final failure                                                                   |
| **Animations**        | Offline indicator uses `react-native-reanimated` for smooth enter/exit                                     |

### File Placement

```
core/
  sync/
    retry.ts               ← NEW: retryWithBackoff() utility
    retry.test.ts          ← NEW
    sync-trigger.ts        ← EXTEND: offline awareness, dirty flag persistence
    sync-trigger.test.ts   ← EXTEND
    index.ts               ← EXTEND: export retry
shared/
  hooks/
    useNetworkStatus.ts    ← NEW: NetInfo reactive hook
    useNetworkStatus.test.ts ← NEW
    useAutoSync.ts         ← EXTEND: reconnect trigger with NetInfo
    useAutoSync.test.ts    ← EXTEND
  components/
    OfflineIndicator.tsx   ← NEW: offline banner component
    OfflineIndicator.test.tsx ← NEW
app/
  _layout.tsx              ← MODIFY: add OfflineIndicator to root layout
```

### Testing Strategy

1. **Retry utility tests**:
   - Success on first attempt → returns result, no delay
   - Success on 2nd attempt → 1 retry, correct delay
   - All attempts fail → throws after maxRetries, all delays executed
   - Custom options (maxRetries=5, baseDelay=500)

2. **Offline sync trigger tests**:
   - Online + markDirty → sync triggered (existing behavior)
   - Offline + markDirty → dirty flag set, NO sync attempted
   - Reconnect + dirty flag → sync triggered
   - Reconnect + no dirty flag → no sync
   - Dirty flag persists in AsyncStorage

3. **Network status hook tests**:
   - Mock NetInfo → isConnected: true/false transitions
   - Cleanup: unsubscribe on unmount

4. **OfflineIndicator tests**:
   - Renders banner when `isConnected: false`
   - Hidden when `isConnected: true`
   - Accessible label for screen readers

5. **Integration: reconnect → retry → sync**:
   - Offline → make changes → reconnect → retry succeeds → dirty flag cleared
   - Offline → reconnect → retry fails 3x → error state → manual retry → succeeds

### Relationship to Other Stories

| Story                         | Relationship                                                  |
| ----------------------------- | ------------------------------------------------------------- |
| **7.3 (Sync Changes)**        | Offline queue ensures 7.3 sync triggers work when reconnected |
| **7.4 (Delta Sync)**          | Delta sync is the mechanism used on reconnect (natural fit)   |
| **7.6 (Conflict Resolution)** | Multi-device conflicts more likely after offline periods      |
| **7.7 (Sync Status)**         | Sync status shows offline indicator + retry state             |
| **7.1/7.2**                   | Initial sync infrastructure is the foundation                 |

### References

- [Source: docs/architecture.md#Sync Patterns] — Watch sync retry pattern (3 attempts, exponential backoff)
- [Source: docs/architecture.md#API & Communication Patterns] — "Offline Queue: Local queue + retry"
- [Source: docs/project_context.md#Database Patterns] — Transactions for all writes
- [Source: docs/epics.md#Story 7.5] — Original AC and scope
- [Source: core/sync/sync-trigger.ts] — Sync trigger to extend with offline awareness

---

## Dev Agent Record

### Agent Model Used

GPT-4.1 (GitHub Copilot)

### Debug Log References

- All tests run: core/sync/retry.test.ts, shared/hooks/useNetworkStatus.test.ts, shared/components/OfflineIndicator.test.tsx, shared/hooks/useAutoSync.test.ts, core/sync/sync-trigger.test.ts

### Completion Notes List

- All tasks and subtasks implemented and tested
- All acceptance criteria verified in code and tests
- All files below changed in PR #74 (commits df3c921, 6019df1)

### Change Log

- Implemented offline queue, dirty flag, reconnect trigger, retry with backoff, error banner, and offline indicator
- Added/updated tests for all new logic
- Fixed reconnect throttle bug (force sync on reconnect)
- Made onRetry optional in retryWithBackoff
- Added AppError for max retries
- Used logger for retry logging
- Added missing tests for reconnect debounce and manual retry after max retries

### File List

- app/\_layout.tsx
- app/index.tsx
- core/sync/index.ts
- core/sync/retry.test.ts
- core/sync/retry.ts
- core/sync/sync-trigger.test.ts
- core/sync/sync-trigger.ts
- docs/sprint-artifacts/sprint-status.yaml
- docs/sprint-artifacts/stories/7-5-handle-offline-queue.md
- jest.setup.js
- package.json
- shared/components/OfflineIndicator.test.tsx
- shared/components/OfflineIndicator.tsx
- shared/hooks/useAutoSync.test.ts
- shared/hooks/useAutoSync.ts
- shared/hooks/useNetworkStatus.test.ts
- shared/hooks/useNetworkStatus.ts
- yarn.lock
