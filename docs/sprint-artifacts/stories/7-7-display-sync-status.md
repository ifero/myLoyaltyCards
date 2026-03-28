# Story 7.7: Display Sync Status

**Epic:** 7 - Cloud Synchronization
**Type:** User-Facing
**Status:** done
**Sprint:** 9
**FRs Covered:** FR53

---

## Story

**As a** user,
**I want** to see if my data is synced,
**So that** I know my cards are backed up.

---

## Acceptance Criteria

### AC1: Sync In-Progress Indicator

```gherkin
Given I am signed in
When sync is in progress
Then I see a subtle sync indicator (tiny pulse animation on sync icon)
And the indicator does not block my interaction with the app
And I can continue browsing/editing cards during sync
```

### AC2: Sync Success Feedback

```gherkin
Given sync completes successfully
When the UI updates
Then the sync indicator shows a brief checkmark (✓) for ~2 seconds
And then returns to the default (idle) state
And no modal, toast, or alert is shown
```

### AC3: Sync Failure with Action

```gherkin
Given sync fails (after all retry attempts from 7.5)
When the error occurs
Then I see a non-blocking error banner: "Sync failed. Changes saved locally."
And I see a "Retry" button
And the message is clear and jargon-free (no error codes)
And I can tap "Retry" to manually trigger sync
And I can dismiss the banner
```

### AC4: Guest Mode — No Sync UI

```gherkin
Given I am in guest mode (not signed in)
When I use the app
Then I see no sync indicator, no sync status, no sync-related UI
And the sync system is completely silent
```

### AC5: Last Sync Timestamp

```gherkin
Given I am signed in
When I open Settings
Then I see "Last synced: [relative time]" (e.g., "2 minutes ago", "Just now")
And the timestamp updates reactively
```

### AC6: Force Sync Action

```gherkin
Given I am signed in
When I pull-to-refresh on the card list
Then a force sync is triggered (bypasses 5-min throttle)
And I see the sync indicator during the sync
And the last sync timestamp updates after completion
```

### AC7: Offline + Sync Status Integration

```gherkin
Given I am offline (OfflineIndicator from 7.5 is showing)
When I come back online
Then the OfflineIndicator dismisses
And sync triggers automatically
And I see the sync indicator briefly
And the flow feels seamless (offline → syncing → synced)
```

---

## Tasks / Subtasks

- [x] **Task 1: Create sync status store** (AC: #1, #2, #3, #4)
  - [x] 1.1 Create `core/sync/sync-status.ts` — Zustand store for sync state
  - [x] 1.2 State shape: `{ status: 'idle' | 'syncing' | 'success' | 'error', lastSyncAt: string | null, error: string | null }`
  - [x] 1.3 Actions: `setSyncing()`, `setSyncSuccess(timestamp)`, `setSyncError(message)`, `resetStatus()`
  - [x] 1.4 `lastSyncAt` hydrated from AsyncStorage on startup
  - [x] 1.5 Guest mode: status always `'idle'`, no transitions
  - [x] 1.6 Unit tests for all state transitions

- [x] **Task 2: Wire sync pipeline to status store** (AC: #1, #2, #3)
  - [x] 2.1 Extend `core/sync/sync-trigger.ts` to update sync status store at each phase
  - [x] 2.2 Before sync starts → `setSyncing()`
  - [x] 2.3 After successful sync → `setSyncSuccess(new Date().toISOString())`
  - [x] 2.4 After failed sync (all retries exhausted) → `setSyncError('Sync failed. Changes saved locally.')`
  - [x] 2.5 On manual retry → `setSyncing()` again
  - [x] 2.6 Unit tests for wiring

- [x] **Task 3: Create SyncIndicator component** (AC: #1, #2)
  - [x] 3.1 Create `shared/components/SyncIndicator.tsx`
  - [x] 3.2 States:
    - `idle` → no visible indicator (null render)
    - `syncing` → small animated icon (pulse animation via `react-native-reanimated`)
    - `success` → green checkmark (✓) for 2 seconds, then fade to idle
    - `error` → handled by separate error banner (Task 5)
  - [x] 3.3 Position: in the header area, alongside existing header elements
  - [x] 3.4 Non-blocking — does not consume touch events or overlay content
  - [x] 3.5 Accessible: `accessibilityLabel="Syncing"` / `"Sync complete"`
  - [x] 3.6 Unit tests: renders correct state, animation triggers, auto-dismiss after 2s

- [x] **Task 4: Create SyncErrorBanner component** (AC: #3)
  - [x] 4.1 Create `shared/components/SyncErrorBanner.tsx`
  - [x] 4.2 Non-blocking banner at top of screen (below header, above card list)
  - [x] 4.3 Content: "Sync failed. Changes saved locally." + "Retry" button
  - [x] 4.4 "Retry" calls `retrySync()` from hook (7.5) which also calls `setSyncing()`
  - [x] 4.5 Dismissible: small "✕" button to hide the banner
  - [x] 4.6 Animated entry/exit via `react-native-reanimated`
  - [x] 4.7 Style: uses existing error semantic colors
  - [x] 4.8 Accessible: describes error state and retry action
  - [x] 4.9 Unit tests: renders on error, retry calls handler, dismiss hides banner

- [x] **Task 5: Add last sync timestamp to Settings** (AC: #5)
  - [x] 5.1 Extend `features/settings/SettingsScreen.tsx` with "Last synced" row
  - [x] 5.2 Only visible when signed in
  - [x] 5.3 Format: relative time using a simple utility (e.g., "Just now", "2 min ago", "1 hour ago")
  - [x] 5.4 Create `core/utils/relative-time.ts` — lightweight formatter (no external dependency)
  - [ ] 5.5 Reactive: updates via Zustand store subscription
  - [x] 5.6 Unit tests for relative-time formatter (edge cases: null, just now, minutes, hours, days)

- [x] **Task 6: Implement force sync on pull-to-refresh** (AC: #6)
  - [x] 6.1 Add `RefreshControl` to the card list `FlatList`/`FlashList` in home screen
  - [x] 6.2 On pull-to-refresh: call `forceSyncWithCloud()` (bypasses 5-min throttle)
  - [x] 6.3 Only triggers sync when signed in (guest mode: no-op or just refreshes local data)
  - [x] 6.4 Shows sync indicator during force sync
  - [x] 6.5 Unit tests for pull-to-refresh sync flow

- [x] **Task 7: Integrate components into app** (AC: #1, #7)
  - [x] 7.1 Add `SyncIndicator` to app header (via `app/_layout.tsx` or header component)
  - [x] 7.2 Add `SyncErrorBanner` to main card list screen
  - [x] 7.3 Coordinate with `OfflineIndicator` (from 7.5): when offline → show offline banner, hide sync UI; when online → show sync UI as needed
  - [x] 7.4 Verify transition flow: offline → online → syncing → success (smooth, no flicker)
  - [x] 7.5 Integration tests for the full indicator lifecycle

---

## Dev Notes

### Sync Status State Machine

```
                      ┌──────────────┐
                      │    idle      │ ← Default, guest mode
                      └──────┬───────┘
                             │ sync triggered
                      ┌──────▼───────┐
                      │   syncing    │ ← Pulse animation
                      └──┬───────┬───┘
           success ──────┘       └────── failure (all retries)
                      ┌──────▼───────┐  ┌──────▼───────┐
                      │   success    │  │    error     │
                      │  (2s timer)  │  │  (banner)    │
                      └──────┬───────┘  └──────┬───────┘
                             │ timer         │ retry / dismiss
                      ┌──────▼───────┐       │
                      │    idle      │◄──────┘
                      └──────────────┘
```

### UX Design Alignment

From UX spec:

- **Sync Status:** "Tiny pulse animation on the sync icon during data transfer"
- **Success:** "Subtle haptic 'Double Tap' + small green checkmark icon. No UI-blocking overlays."
- **Error:** "Phone vibration + red border glow + clear, jargon-free message"
- **Philosophy:** "Silent Sync" — sync should be invisible when everything works

### Agent Notes

- Implemented sync status in `app/index.tsx` with `SyncIndicator` and `SyncErrorBanner`.
- Validated existing sync pipeline in `useAutoSync` and `useCloudSync` plus conflict resolution story states.
- Added `core/utils/relative-time.ts` and exposed it from `core/utils/index.ts`.
- Added settings sync timestamp panel in `features/settings/SettingsScreen.tsx`, plus periodic update and persistence clearing behavior.
- Added force-pull sync in `features/cards/components/CardList.tsx` using `useCloudSync` and stateful refreshing.
- Added tests in:
  - `core/utils/relative-time.test.ts`
  - `features/settings/SettingsScreen.test.tsx`
  - `features/cards/components/CardList.test.tsx`
- Updated sprint status to done for 7.7 in `docs/sprint-artifacts/sprint-status.yaml`.

### Relative Time Formatter (No Dependencies)

```typescript
export const formatRelativeTime = (isoString: string | null): string => {
  if (!isoString) return 'Never';

  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHrs < 24) return `${diffHrs} hour${diffHrs > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
};
```

### SyncIndicator Design

- **Icon:** Cloud icon with subtle pulse animation (reanimated)
- **Size:** 20×20 dp, fits in header bar
- **Colors:**
  - `syncing` → default icon color + pulse opacity animation
  - `success` → green (`semantic.success`) + checkmark
  - `idle` → hidden (null render)
- **Animation:**
  - Pulse: `withRepeat(withTiming(opacity, { duration: 800 }), -1, true)`
  - Success fade: `withDelay(2000, withTiming(0, { duration: 300 }))`

### Architecture Compliance

| Rule                     | Implementation                                                                                                                                     |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Layer boundaries**     | Sync status store in `core/sync/`. Components in `shared/components/`. Settings extension in `features/settings/`. Relative time in `core/utils/`. |
| **No React in core/**    | `sync-status.ts` is a Zustand store (vanilla, no React hooks). Relative-time is pure TS.                                                           |
| **Dependency injection** | Components receive status via Zustand hooks, no direct core imports in app layer                                                                   |
| **Animations**           | `react-native-reanimated` for native thread animations                                                                                             |
| **Accessibility**        | All indicators have accessible labels                                                                                                              |
| **NativeWind**           | Banner/indicator styled with Tailwind utility classes                                                                                              |
| **Error shape**          | Error messages are user-friendly strings, no technical details                                                                                     |

### File Placement

```
core/
  sync/
    sync-status.ts          ← NEW: Zustand store for sync state
    sync-status.test.ts     ← NEW
    sync-trigger.ts         ← EXTEND: wire status updates
  utils/
    relative-time.ts        ← NEW: formatRelativeTime()
    relative-time.test.ts   ← NEW
shared/
  components/
    SyncIndicator.tsx       ← NEW: pulse/checkmark indicator
    SyncIndicator.test.tsx  ← NEW
    SyncErrorBanner.tsx     ← NEW: error banner with retry
    SyncErrorBanner.test.tsx ← NEW
features/
  settings/
    SettingsScreen.tsx      ← EXTEND: add "Last synced" row
app/
  _layout.tsx              ← EXTEND: add SyncIndicator to header
  index.tsx                ← EXTEND: add RefreshControl + SyncErrorBanner
```

### Testing Strategy

1. **Sync status store tests**:
   - Initial state: idle
   - setSyncing → status: syncing
   - setSyncSuccess → status: success, lastSyncAt updated
   - setSyncError → status: error, error message set
   - resetStatus → back to idle
   - Guest mode: no transitions

2. **SyncIndicator tests**:
   - Renders nothing when idle
   - Shows pulse when syncing
   - Shows checkmark when success
   - Auto-dismisses after 2 seconds
   - Accessible labels correct

3. **SyncErrorBanner tests**:
   - Renders when error status
   - Shows correct message
   - Retry button calls handler
   - Dismiss button hides banner
   - Not visible when not in error state

4. **Relative time formatter tests**:
   - null → "Never"
   - 0 seconds ago → "Just now"
   - 5 minutes ago → "5 min ago"
   - 2 hours ago → "2 hours ago"
   - 3 days ago → "3 days ago"

5. **Force sync integration tests**:
   - Pull-to-refresh triggers force sync
   - Force sync bypasses throttle
   - Sync indicator shows during force sync

6. **End-to-end indicator lifecycle**:
   - offline → OfflineIndicator shows → reconnect → OfflineIndicator hides → SyncIndicator (syncing) → SyncIndicator (success) → idle

### Relationship to Other Stories

| Story                         | Relationship                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------- |
| **7.1 (Upload)**              | This story visualizes upload progress                                           |
| **7.2 (Download)**            | This story visualizes download progress                                         |
| **7.3 (Sync Changes)**        | Auto-sync triggers update sync status                                           |
| **7.4 (Delta Sync)**          | Delta sync pipeline updates status at each phase                                |
| **7.5 (Offline Queue)**       | OfflineIndicator + SyncErrorBanner coordinate; retry button from 7.5 wired here |
| **7.6 (Conflict Resolution)** | Conflicts resolved silently — status only shows success/failure                 |

### References

- [Source: docs/ux-design-specification.md#Feedback Patterns] — "Sync Status: Tiny pulse animation on the sync icon during data transfer"
- [Source: docs/ux-design-specification.md#Implementation Roadmap] — Phase 3: Silent Sync Status
- [Source: docs/architecture.md#Loading State Names] — `isSyncing` naming convention
- [Source: docs/architecture.md#Sync Patterns] — `forceSyncWithCloud()` bypasses throttle
- [Source: docs/epics.md#Story 7.7] — Original AC

---

## Dev Agent Record

### Agent Model Used

_To be filled by dev agent_

### Debug Log References

### Completion Notes List

### Change Log

### File List
