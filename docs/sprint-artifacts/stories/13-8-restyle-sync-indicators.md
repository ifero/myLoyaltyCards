# Story 13.8: Restyle Sync & Status Indicators

Status: ready-for-dev

## Story

As a user who syncs loyalty cards across devices,
I want polished, non-intrusive sync status indicators, a clear offline reassurance strip, and a calm conflict resolution dialog,
so that I always understand the sync state of my data without being alarmed or blocked from using the app.

## Context

This story implements the approved Figma designs from Story 12-8 (Sync & Status page, 10 frames: 5 concepts x light + dark). It is a visual restyle of existing sync UI components plus a new conflict resolution modal. The existing sync components live in `shared/components/` (Epic 7): `SyncIndicator.tsx`, `SyncErrorBanner.tsx`, and `OfflineIndicator.tsx`. The sync engine logic in `core/sync/` (Epic 7) is unchanged -- this story is purely visual restyle plus the new conflict UI.

Story 13-1 provides the design system foundation: `Button`, `CardShell`, `ActionRow` shared components, plus all color/typography/spacing tokens.

The existing components currently use hardcoded colors (e.g., `ERROR_BG = '#FEF2F2'`, `ERROR_TEXT = '#991B1B'`), basic `ActivityIndicator` for sync animation, and a plain warning strip for offline. The restyle replaces these with design-system tokens, animated sync glyphs, auto-dismiss success states, and the new conflict resolution modal.

**Figma file:** https://www.figma.com/design/4PSsX8SyTUU0GCUdBAAEED/Test
**Figma page:** Sync & Status
**Design story reference:** docs/sprint-artifacts/stories/12-8-sync-status-indicators.md

## Acceptance Criteria

### AC1: Syncing Active Indicator

- [ ] Inline status strip rendered above the card grid (not overlaying the header/title) (DEC-12.8-001)
- [ ] Strip uses subtle background tint from design-system primary token (not hardcoded hex)
- [ ] Animated sync glyph (MI: sync or MCI: cloud-sync) with continuous rotation animation replacing `ActivityIndicator`
- [ ] Label text: "Syncing cards..." using caption/body-small typography token
- [ ] Strip is non-blocking -- user can scroll and interact with the card grid underneath
- [ ] Strip appears when `isSyncing` is true; hidden otherwise
- [ ] `accessibilityLiveRegion="polite"` preserved for screen reader announcement
- [ ] Light mode: primary-tinted background, primary icon color, secondary text color
- [ ] Dark mode: dark-appropriate primary tint, matching dark tokens
- [ ] Matches Figma frame: "Syncing Active -- Light" / "Syncing Active -- Dark"

### AC2: Sync Success Indicator

- [ ] Brief checkmark confirmation strip appears after successful sync
- [ ] Strip shows MI: check-circle or MCI: check-circle-outline glyph with success color from design tokens
- [ ] Label text: "Cards synced" or equivalent concise confirmation
- [ ] Auto-dismisses after 2-3 seconds with a fade-out animation
- [ ] Non-blocking -- user can continue interacting during display
- [ ] Strip renders in the same position as the syncing-active indicator (above card grid)
- [ ] Light/dark mode using semantic success tokens from 13-1
- [ ] Matches Figma frame: "Sync Success -- Light" / "Sync Success -- Dark"

### AC3: Sync Error Banner

- [ ] Inline banner rendered above card grid (not a modal -- DEC-12.8-002)
- [ ] Uses design-system semantic error color tokens (replacing hardcoded `#FEF2F2` / `#991B1B`)
- [ ] Concise error message (prop-driven), max 2 lines, body-small typography token
- [ ] "Retry" CTA button using error-colored `Button` variant or styled Pressable
- [ ] Dismiss affordance (close icon) to hide the banner
- [ ] Banner persists until dismissed or retry succeeds (no auto-dismiss)
- [ ] Accessible: `accessibilityRole="alert"`, `accessibilityLiveRegion="polite"`
- [ ] Light mode: error-tinted background, error text, error-colored Retry button
- [ ] Dark mode: dark error tokens
- [ ] Matches Figma frame: "Sync Error -- Light" / "Sync Error -- Dark"

### AC4: Offline Indicator

- [ ] Inline strip shown ONLY when device is offline AND there are pending unsynced changes (DEC-12.8-003)
- [ ] Message: "Offline -- N changes will sync when online" (where N is the count of pending changes)
- [ ] Reassuring tone, not alarming -- subtle neutral/muted background, no warning/error colors
- [ ] MI: cloud-off or MCI: cloud-off-outline glyph
- [ ] Animated entry (FadeIn) and exit (FadeOut) preserved from current implementation
- [ ] No dismiss affordance -- strip disappears automatically when back online or when pending count reaches 0
- [ ] Accessible: `accessibilityRole="status"`, descriptive label including pending count
- [ ] Light mode: neutral/muted background tint
- [ ] Dark mode: dark muted tint
- [ ] Matches Figma frame: "Offline -- Light" / "Offline -- Dark"

### AC5: Conflict Resolution Modal

- [ ] Modal dialog presented when sync detects a conflict (DEC-12.8-004)
- [ ] Calm, non-alarming visual treatment -- no red/error colors
- [ ] Issue summary at top: card name, brief explanation of conflict (e.g., "This card was updated on both devices")
- [ ] Side-by-side comparison cards showing local vs cloud versions (DEC-12.8-005):
  - Each card displays: points/balance value, barcode tail (last 4-6 digits), last updated timestamp, list of changed fields highlighted
  - Local card labeled "This device" with MI: smartphone icon
  - Cloud card labeled "Cloud" with MI: cloud icon
- [ ] Three action choices as distinct buttons:
  - "Keep local" -- resolves with local version
  - "Keep cloud" -- resolves with cloud version
  - "Keep both" -- creates duplicate card entries
- [ ] "Decide later" secondary link/button to dismiss modal and defer resolution
- [ ] Modal uses `CardShell` from 13-1 for comparison cards
- [ ] Focus trap and `accessibilityViewIsModal={true}`
- [ ] Light/dark mode using design tokens
- [ ] Matches Figma frames from 12-8 conflict resolution concept

### AC6: Strip Positioning and Layout Integration

- [ ] All status strips (syncing, success, error, offline) render in a consistent position above the card grid on the home screen
- [ ] Only one strip/banner visible at a time; priority order: error > syncing > offline > success
- [ ] Strips do not overlap header, tab bar, or FAB
- [ ] Transition between strip states is smooth (fade or slide animation)
- [ ] No layout shift when strip appears/disappears (reserved space or animated height)

### AC7: Dark Mode Parity

- [ ] Every indicator/banner has dark mode variant matching Figma dark frames
- [ ] All colors sourced from design-system tokens -- zero hardcoded hex values in component files
- [ ] Backgrounds use appropriate dark-mode semantic tints
- [ ] Icon and text colors follow dark mode hierarchy tokens from 13-1
- [ ] Conflict resolution modal backgrounds and card shells adapt correctly

### AC8: Accessibility

- [ ] All interactive elements (Retry, dismiss, conflict action buttons, "Decide later") have 44pt minimum touch targets
- [ ] All elements have appropriate `accessibilityRole` and `accessibilityLabel`
- [ ] Sync status changes announced via `accessibilityLiveRegion="polite"`
- [ ] Error banner announced as `accessibilityRole="alert"`
- [ ] Conflict modal: focus trapped, announced as modal to screen readers
- [ ] Conflict comparison cards have descriptive labels (e.g., "Local version: 450 points, updated March 30")
- [ ] Action buttons have clear accessible labels with hint text

### AC9: Test Coverage

- [ ] Unit tests for each restyled/new component (>= 80% coverage)
- [ ] Unit tests for sync success auto-dismiss timer logic
- [ ] Unit tests for offline indicator conditional display (offline AND pending changes)
- [ ] Unit tests for conflict resolution modal actions (keep local, keep cloud, keep both, decide later)
- [ ] Unit tests for strip priority logic (error > syncing > offline > success)
- [ ] Unit tests for dark mode token application (no hardcoded colors)
- [ ] Tests co-located with source files

## Tasks / Subtasks

### T1: Restyle SyncIndicator -- Syncing Active State (AC1, AC7)

- [ ] Replace `ActivityIndicator` with animated sync glyph (MI: sync) using `react-native-reanimated` continuous rotation
- [ ] Replace hardcoded background color (`${theme.primary}1A`) with design-system token
- [ ] Replace hardcoded text color with typography/color token from 13-1
- [ ] Update label text to use caption/body-small typography class from NativeWind tokens
- [ ] Ensure strip placement is above card grid, not overlaying header (verify in home screen integration)
- [ ] Apply light/dark mode via theme tokens (remove all hardcoded hex)
- [ ] Visual QA against Figma frame: "Syncing Active -- Light" / "Syncing Active -- Dark"

### T2: Add Sync Success State (AC2, AC7)

- [ ] Extend `SyncIndicator` or create `SyncSuccessStrip` component for the success state
- [ ] Props: `showSuccess: boolean` or new `syncState: 'idle' | 'syncing' | 'success' | 'error'` enum
- [ ] Render checkmark glyph (MI: check-circle) with semantic success color token
- [ ] Label text: "Cards synced"
- [ ] Implement auto-dismiss timer (2-3s) with fade-out using `react-native-reanimated`
- [ ] Expose `onSuccessDismissed` callback so parent can clean up state
- [ ] Light/dark mode via tokens
- [ ] Visual QA against Figma frame: "Sync Success -- Light" / "Sync Success -- Dark"

### T3: Restyle SyncErrorBanner (AC3, AC7)

- [ ] Replace hardcoded `ERROR_BG = '#FEF2F2'` and `ERROR_TEXT = '#991B1B'` with design-system semantic error tokens
- [ ] Replace hardcoded `borderColor` with error border token
- [ ] Restyle "Retry" button to use design-system button styling (error variant or error-colored Pressable)
- [ ] Replace plain-text dismiss icon ("X") with MI: close vector icon
- [ ] Update typography to use body-small token from NativeWind
- [ ] Ensure banner renders inline above card grid, consistent with other strips
- [ ] Maintain `accessibilityRole="alert"` and `accessibilityLiveRegion="polite"`
- [ ] Light/dark mode via tokens
- [ ] Visual QA against Figma frame: "Sync Error -- Light" / "Sync Error -- Dark"

### T4: Restyle OfflineIndicator (AC4, AC7)

- [ ] Add `pendingChangeCount` prop (or source from sync state) to conditionally display only when offline AND pending > 0
- [ ] Update message to: "Offline -- N changes will sync when online" (dynamic count)
- [ ] Replace warning colors (`SEMANTIC_COLORS.warning`) with neutral/muted design tokens (DEC-12.8-003: reassurance, not alarm)
- [ ] Add MI: cloud-off or MCI: cloud-off-outline glyph
- [ ] Change `accessibilityRole` from `"alert"` to `"status"` (reassurance, not urgency)
- [ ] Update `accessibilityLabel` to include pending count
- [ ] Maintain `FadeIn`/`FadeOut` animations from `react-native-reanimated`
- [ ] Light/dark mode via tokens
- [ ] Visual QA against Figma frame: "Offline -- Light" / "Offline -- Dark"

### T5: Implement Conflict Resolution Modal (AC5, AC7)

- [ ] Create `shared/components/ConflictResolutionModal.tsx`:
  - Props: `visible: boolean`, `localCard: ConflictCardData`, `cloudCard: ConflictCardData`, `onKeepLocal: () => void`, `onKeepCloud: () => void`, `onKeepBoth: () => void`, `onDecideLater: () => void`
- [ ] Define `ConflictCardData` type: `{ name: string, points?: number, barcodeTail: string, updatedAt: string, changedFields: string[] }`
- [ ] Create `shared/components/ConflictComparisonCard.tsx`:
  - Props: `label: string` ("This device" / "Cloud"), `icon: string` (MI: smartphone / MI: cloud), `data: ConflictCardData`
  - Uses `CardShell` from 13-1 for container
  - Displays points/balance, barcode tail, updated timestamp, changed fields list
  - Changed fields visually highlighted (bold or accent color)
- [ ] Layout: issue summary at top, two comparison cards side by side (or stacked on narrow screens), action buttons below
- [ ] Three primary-level action buttons: "Keep local", "Keep cloud", "Keep both"
- [ ] "Decide later" as secondary text link below action buttons
- [ ] Calm visual treatment: neutral/primary modal background, no error/warning colors
- [ ] Modal overlay with semi-transparent backdrop
- [ ] Focus trap: `accessibilityViewIsModal={true}`
- [ ] Light/dark mode via tokens

### T6: Implement Strip Priority and Layout Integration (AC6)

- [ ] Create `shared/components/SyncStatusContainer.tsx` (or update home screen layout):
  - Receives sync state and determines which strip to show
  - Priority: error banner > syncing indicator > offline strip > success strip
  - Only one visible at a time
- [ ] Animated transitions between strip states (height animation or cross-fade)
- [ ] Position the container above the card grid FlatList, below the header
- [ ] Ensure no layout shift: use `Animated.View` with height interpolation or `LayoutAnimation`
- [ ] Verify strips do not overlap header, tab bar, or FAB

### T7: Dark Mode Verification (AC7)

- [ ] Audit all 5 components for zero hardcoded hex color values
- [ ] Verify all backgrounds use semantic tokens from `@/shared/theme/`
- [ ] Verify all text colors use typography hierarchy tokens
- [ ] Verify all icon colors use semantic/primary tokens
- [ ] Visual QA pass on all 10 Figma frames (5 concepts x 2 themes)

### T8: Accessibility Pass (AC8)

- [ ] Verify 44pt minimum touch targets: Retry button, dismiss icon, conflict action buttons, "Decide later"
- [ ] Verify `accessibilityRole` on all elements:
  - Sync strips: `accessibilityLiveRegion="polite"`
  - Error banner: `accessibilityRole="alert"`
  - Offline: `accessibilityRole="status"`
  - Conflict modal: `accessibilityViewIsModal={true}`
  - All buttons: `accessibilityRole="button"` with labels
- [ ] Conflict comparison cards: descriptive `accessibilityLabel` including data values
- [ ] Action buttons: `accessibilityHint` explaining outcome (e.g., "Replaces cloud version with local data")
- [ ] Sync glyph animation respects `reduceMotion` accessibility setting

### T9: Unit Tests (AC9)

- [ ] `shared/components/SyncIndicator.test.tsx` (update existing):
  - Renders animated sync glyph when syncing (not ActivityIndicator)
  - Uses design tokens (no hardcoded colors in rendered output)
  - Hidden when idle
  - `accessibilityLiveRegion` set to "polite"
- [ ] `shared/components/SyncSuccessStrip.test.tsx` (or extended SyncIndicator tests):
  - Renders checkmark and "Cards synced" text on success
  - Auto-dismisses after timer (use `jest.advanceTimersByTime`)
  - Calls `onSuccessDismissed` callback after auto-dismiss
  - Fade-out animation triggers
- [ ] `shared/components/SyncErrorBanner.test.tsx` (update existing):
  - Renders error message, Retry button, dismiss icon
  - Uses design tokens (no hardcoded ERROR_BG / ERROR_TEXT)
  - `onRetry` fires on Retry press
  - `onDismiss` fires on dismiss press
  - `accessibilityRole` is "alert"
- [ ] `shared/components/OfflineIndicator.test.tsx` (update existing):
  - Renders only when offline AND pendingChangeCount > 0
  - Does NOT render when offline but pendingChangeCount is 0
  - Displays correct pending count in message
  - Uses neutral tokens (no warning colors)
  - `accessibilityRole` is "status"
- [ ] `shared/components/ConflictResolutionModal.test.tsx` (new):
  - Renders when visible, hidden when not visible
  - Displays local and cloud comparison cards with correct data
  - "Keep local" fires `onKeepLocal` callback
  - "Keep cloud" fires `onKeepCloud` callback
  - "Keep both" fires `onKeepBoth` callback
  - "Decide later" fires `onDecideLater` callback
  - Changed fields are highlighted in comparison cards
  - `accessibilityViewIsModal` is true
- [ ] `shared/components/ConflictComparisonCard.test.tsx` (new):
  - Renders label, icon, points, barcode tail, updated timestamp
  - Changed fields displayed with highlight styling
  - Accessible label includes data values
- [ ] `shared/components/SyncStatusContainer.test.tsx` (new):
  - Shows error banner when error state is active
  - Shows syncing indicator when syncing (and no error)
  - Shows offline strip when offline with pending changes (and no error/syncing)
  - Shows success strip after sync completes (and no higher-priority state)
  - Only one strip visible at a time

## Dev Notes

### Files to Modify

| File                                          | Change                                                                                                 |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `shared/components/SyncIndicator.tsx`         | Full restyle: replace ActivityIndicator with animated sync glyph, design tokens, success state support |
| `shared/components/SyncIndicator.test.tsx`    | Update tests for new animation, tokens, success state                                                  |
| `shared/components/SyncErrorBanner.tsx`       | Replace hardcoded colors with design tokens, restyle Retry/dismiss, vector close icon                  |
| `shared/components/SyncErrorBanner.test.tsx`  | Update tests for token usage, new icon                                                                 |
| `shared/components/OfflineIndicator.tsx`      | Add pending count prop, neutral tokens (not warning), cloud-off icon, conditional display logic        |
| `shared/components/OfflineIndicator.test.tsx` | Update tests for conditional display, pending count, neutral styling                                   |

### New Files

| File                                                 | Purpose                                                             |
| ---------------------------------------------------- | ------------------------------------------------------------------- |
| `shared/components/ConflictResolutionModal.tsx`      | Full conflict dialog with comparison cards and action buttons       |
| `shared/components/ConflictResolutionModal.test.tsx` | Tests for modal visibility, actions, accessibility                  |
| `shared/components/ConflictComparisonCard.tsx`       | Side-by-side local/cloud data card for conflict modal               |
| `shared/components/ConflictComparisonCard.test.tsx`  | Tests for card rendering, changed field highlighting                |
| `shared/components/SyncStatusContainer.tsx`          | Orchestrator determining which strip to show, priority logic        |
| `shared/components/SyncStatusContainer.test.tsx`     | Tests for priority ordering, single-strip rendering                 |
| `shared/types/sync-ui.ts`                            | Shared types: `SyncState`, `ConflictCardData`, `SyncStatusPriority` |

### Architecture Compliance

- All components remain in `shared/components/` -- these are cross-feature UI, not feature-specific
- Import convention: absolute `@/shared/...` for shared components and theme tokens, absolute `@/core/...` for sync types
- Shared components from 13-1 (`Button`, `CardShell`) imported from `@/shared/components/ui/`
- Theme tokens from `@/shared/theme/` -- zero hardcoded color values in component files
- Sync engine logic in `core/sync/` is not modified -- this story is visual only
- Tests co-located: every `.tsx` gets a sibling `.test.tsx`
- 80% coverage threshold enforced

### Icon System

- MI: sync -- syncing active glyph (animated rotation)
- MI: check-circle -- sync success glyph
- MI: close -- dismiss/close icon on error banner
- MI: cloud-off -- offline indicator glyph (or MCI: cloud-off-outline)
- MI: smartphone -- "This device" label in conflict comparison card
- MI: cloud -- "Cloud" label in conflict comparison card
- All icons via `@expo/vector-icons` MaterialIcons / MaterialCommunityIcons -- no emoji, no FontAwesome

### Animation Details

- **Sync glyph rotation:** Continuous 360-degree rotation using `react-native-reanimated` `withRepeat(withTiming(...))`. Respect `useReducedMotion()` -- fall back to static icon if motion reduced.
- **Success auto-dismiss:** `setTimeout` or `useEffect` timer (2500ms default). Fade-out via `FadeOut.duration(300)` from reanimated. Clean up timer on unmount.
- **Offline enter/exit:** Keep existing `FadeIn.duration(300)` / `FadeOut.duration(200)` from reanimated.
- **Strip transitions:** Cross-fade or height animation when switching between strip states in `SyncStatusContainer`.

### Critical Design Decisions (from 12-8)

| ID           | Decision                                                   | Impact                                                                |
| ------------ | ---------------------------------------------------------- | --------------------------------------------------------------------- |
| DEC-12.8-001 | Inline status strip above card grid, not overlaying header | Strip placement in home screen layout, SyncStatusContainer position   |
| DEC-12.8-002 | Error as actionable inline banner, not modal               | SyncErrorBanner remains inline with Retry CTA                         |
| DEC-12.8-003 | Offline as reassurance, not alarm                          | OfflineIndicator uses neutral/muted tokens, not warning colors        |
| DEC-12.8-004 | Conflict resolution with calm multi-choice dialog          | ConflictResolutionModal uses neutral/primary colors, no error styling |
| DEC-12.8-005 | Side-by-side local-vs-cloud comparison before decision     | ConflictComparisonCard layout, data display                           |

### Integration with Existing Sync Logic

The sync engine in `core/sync/` (Epic 7) provides:

- `cloud-sync.ts`: `mergeCards()`, `mergeWithDeletions()` -- conflict detection lives here
- `conflict-logger.ts`: `logConflictResolution()` -- call after user resolves a conflict
- `retry.ts`: retry logic for failed syncs -- wired to SyncErrorBanner's Retry CTA
- `sync-trigger.ts`: triggers sync operations -- provides `isSyncing` state

The conflict resolution modal is a NEW UI surface. The sync engine currently auto-resolves conflicts via LWW (last-write-wins) in `mergeCards()`. The modal introduces user-interactive resolution as an alternative path. Integration approach:

1. When `mergeCards()` detects a conflict that needs user input, it should emit/surface the conflict data
2. `ConflictResolutionModal` receives the conflict data and user's choice
3. The chosen resolution is applied and logged via `logConflictResolution()`
4. The exact integration hook between `core/sync/` and the modal will be determined during implementation -- the sync engine may need a minor extension to support "pause and ask user" flow (out of scope for this story if complex; file a follow-up)

### Figma Frame Reference

| Frame               | Light                   | Dark                   | Component                                             |
| ------------------- | ----------------------- | ---------------------- | ----------------------------------------------------- |
| Syncing Active      | Syncing Active -- Light | Syncing Active -- Dark | `SyncIndicator` (syncing state)                       |
| Sync Success        | Sync Success -- Light   | Sync Success -- Dark   | `SyncIndicator` (success state) or `SyncSuccessStrip` |
| Sync Error          | Sync Error -- Light     | Sync Error -- Dark     | `SyncErrorBanner`                                     |
| Offline             | Offline -- Light        | Offline -- Dark        | `OfflineIndicator`                                    |
| Conflict Resolution | Conflict -- Light       | Conflict -- Dark       | `ConflictResolutionModal`                             |

## Blocks

- **Blocked by 13-1** (Implement Design System Tokens and Components) -- requires `Button`, `CardShell`, and all color/typography/spacing tokens to be in place before development begins.
- **Depends on Epic 7 sync engine** -- sync state (`isSyncing`, error state, conflict detection) must be accessible from `core/sync/`. The existing API should suffice for restyle; conflict modal integration may need a follow-up story if the sync engine requires changes to support interactive resolution.

## Dev Agent Record

### Attempt Log

| #   | Date | Agent | Result | Reason |
| --- | ---- | ----- | ------ | ------ |

### Decisions Made During Dev

_(none yet)_

### Open Questions

- Should `SyncIndicator` be extended with a `syncState` enum prop to handle idle/syncing/success/error, or should the success state be a separate `SyncSuccessStrip` component? Decide during implementation based on complexity.
- Exact integration point between `core/sync/` conflict detection and the `ConflictResolutionModal` -- if the sync engine needs changes to support "pause and ask user" flow, file a follow-up story rather than modifying sync logic in this visual restyle.
- Pending change count for `OfflineIndicator`: determine whether this count is already tracked in sync state or needs a new query against local storage.
