# Story 12.8: Sync & Status Indicators

**Epic:** 12 - App-Wide Design Overhaul
**Type:** Design
**Status:** ready-for-design
**Sprint:** 10
**Depends On:** 12-1 (Design System Foundation)
**Figma File:** https://www.figma.com/design/4PSsX8SyTUU0GCUdBAAEED/Test

---

## Story

**As a** signed-in user with cloud sync enabled,
**I want** to see clear, non-intrusive sync status indicators,
**So that** I know my cards are backed up and can trust the sync state.

---

## Context & Problems to Solve

**Current state:**

- Sync indicator exists (Story 7.7) but was built function-first
- SyncIndicator component shows a spinner
- SyncErrorBanner shows errors
- Visual treatment likely follows the current minimal design — needs to match the new design system

**Sync is invisible when working correctly (good) but unclear when there's an issue (bad).**

---

## Acceptance Criteria

### AC1: Syncing Active Indicator

```
Given a sync is in progress
Then a subtle, non-blocking indicator is shown:
  - Small animated icon (spinning arrows, pulsing dot, or similar)
  - Positioned in header bar or status area — NOT covering content
And the indicator does not block user interaction
And it disappears when sync completes
```

### AC2: Sync Success State

```
Given sync completed successfully
Then a brief success indicator appears (checkmark, "Up to date" text)
And it auto-dismisses after 2-3 seconds
Or the last synced timestamp is shown in settings
```

### AC3: Sync Error State

```
Given sync failed
Then a non-blocking error banner/toast appears:
  - Clear error message (human-readable)
  - Retry action button
  - Dismissible
And the banner uses the design system's error/warning colors
And it does not permanently obstruct the UI
```

### AC4: Offline Indicator

```
Given the device is offline
Then a subtle offline badge or banner indicates connectivity status
And the user understands their cards are still available locally
And the indicator feels informational, not alarming
```

### AC5: Conflict Resolution UI

```
Given a sync conflict is detected
Then the user is presented with a clear resolution prompt:
  - Explanation of the conflict (which card, what changed)
  - Options: "Keep local", "Keep cloud", or "Keep both"
And the design is calm and informational, not panic-inducing
```

---

## Figma Deliverable

**Page name:** `Sync & Status`

**Frames (light + dark for each):**

1. Home screen with sync-in-progress indicator
2. Sync success state (brief confirmation)
3. Sync error banner with retry
4. Offline mode indicator
5. Conflict resolution prompt/dialog

---

## Design Notes

- Sync should be invisible when working — don't over-design the happy path
- Error states matter more than success states for sync UX
- Offline should feel like a capability ("Your cards are saved locally"), not a limitation
- Keep conflict resolution simple — most users won't understand technical merge concepts
