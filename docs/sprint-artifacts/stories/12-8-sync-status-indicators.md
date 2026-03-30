# Story 12.8: Sync & Status Indicators

**Epic:** 12 - App-Wide Design Overhaul
**Type:** Design
**Status:** done
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

### AC1: Syncing Active Indicator ✅

```
Given a sync is in progress
Then a subtle, non-blocking indicator is shown ✅
  - Small animated icon treatment (sync glyph in inline status strip) ✅
  - Positioned above the card grid (not over header title or content) ✅
And the indicator does not block user interaction ✅
And it disappears when sync completes ✅ (card list returns to original position)
```

### AC2: Sync Success State ✅

```
Given sync completed successfully
Then a brief success indicator appears (checkmark + confirmation strip) ✅
And it auto-dismisses after 2-3 seconds ✅
Or the last synced timestamp is shown in settings ✅ (kept as secondary pattern from 12-6)
```

### AC3: Sync Error State ✅

```
Given sync failed
Then a non-blocking error banner appears ✅
  - Clear human-readable error message ✅
  - Retry action button ✅
  - Dismiss action ✅
And the banner uses design-system error colors ✅
And it does not permanently obstruct the UI ✅
```

### AC4: Offline Indicator ✅

```
Given the device is offline
Then a subtle offline banner indicates connectivity status ✅
And the user understands cards are still available locally ✅
And the indicator feels informational, not alarming ✅
```

### AC5: Conflict Resolution UI ✅

```
Given a sync conflict is detected
Then the user is presented with a clear resolution prompt ✅
  - Explanation of the conflict (which card, what changed) ✅
  - Options: "Keep local", "Keep cloud", or "Keep both" ✅
And the design is calm and informational, not panic-inducing ✅
```

---

## Figma Deliverable

**Page name:** `Sync & Status`

**Frames (light + dark for each):**

1. Home screen with sync-in-progress indicator ✅
2. Sync success state (brief confirmation) ✅
3. Sync error banner with retry ✅
4. Offline mode indicator ✅
5. Conflict resolution prompt/dialog ✅

**Total:** 10 frames (5 concepts x light + dark)

---

## Design Notes

- Sync should be invisible when working — don't over-design the happy path
- Error states matter more than success states for sync UX
- Offline should feel like a capability ("Your cards are saved locally"), not a limitation
- Keep conflict resolution simple — most users won't understand technical merge concepts

## Design Decisions (Party Mode Session — 2026-03-30)

### DEC-12.8-001: Inline Status Strip Above Card Grid (Revision)

- **Decision:** Use a compact inline status strip between search and card content for "Syncing..." and "All changes synced" (not in the header title row).
- **Rationale:** Avoids title overlap, keeps hierarchy clean, and clearly communicates temporary layout displacement.
- **Status:** Applied in light + dark frames after stakeholder feedback.

### DEC-12.8-002: Error as Actionable Inline Banner

- **Decision:** Error state uses an inline top banner with a concise message, `Retry` CTA, and dismiss affordance.
- **Rationale:** Fast recovery path without forcing modal interruption.
- **Status:** Applied in light + dark frames.

### DEC-12.8-003: Offline as Reassurance, Not Alarm

- **Decision:** Offline state uses a subtle inline strip (`Offline • N changes will sync when online`) and is intended to appear only when offline _and_ pending unsynced changes exist.
- **Rationale:** Keeps UI quiet by default while still giving confidence when it matters.
- **Status:** Applied in light + dark frames after stakeholder feedback.

### DEC-12.8-004: Conflict Resolution with Calm Multi-Choice Dialog

- **Decision:** Conflict resolution is a focused modal with context plus three choices: Keep local, Keep cloud, Keep both (plus decide later).
- **Rationale:** Supports varied user intent while reducing ambiguity and panic.
- **Status:** Applied in light + dark frames.

### DEC-12.8-005: Show Explicit Local-vs-Cloud Differences Before Decision

- **Decision:** Conflict modal includes a clear issue summary plus side-by-side local/cloud comparison cards (points, barcode tail, updated time, changed fields).
- **Rationale:** Users should understand _what differs_ before choosing which version to keep.
- **Status:** Applied in light + dark frames after stakeholder feedback.
