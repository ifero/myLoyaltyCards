# Story 13.7: Restyle Onboarding Flow

Status: ready-for-dev

## Story

As a first-time user,
I want a polished, visually engaging onboarding experience with clear outcome-based choices for how my data is stored,
so that I understand the app's value, feel confident about my privacy, and can add my first card within seconds.

## Context

This story implements the approved Figma designs from Story 12-7 (Onboarding page, 14 frames: 7 concepts x light + dark). It is a visual restyle AND a functional redesign of the mode selection step. The existing onboarding code lives in `features/onboarding/` (Epic 4) with `WelcomeScreen.tsx` (first-launch screen with basic CTAs) and `OnboardingOverlay.tsx` (modal overlay guiding first card add). The route file `app/welcome.tsx` is a thin re-export.

The mode selection redesign is the most impactful change: the current "guest mode" concept is replaced with outcome-based language ("Keep cards on this device" vs "Sync across all devices"). Internally, local mode maps to the existing guest mode behavior (Epic 6, story 6-5) -- no backend changes required.

Story 13-1 provides the design system foundation: `Button`, `CardShell`, `TextField`, `ActionRow` shared components, plus all color/typography/spacing tokens.

**Figma file:** https://www.figma.com/design/4PSsX8SyTUU0GCUdBAAEED/Test
**Figma page:** Onboarding
**Design story reference:** docs/sprint-artifacts/stories/12-7-onboarding.md

## Acceptance Criteria

### AC1: Welcome Screen

- [ ] Branded card icon centered in a soft primary circle (100px diameter)
- [ ] Value proposition headline: "Your loyalty cards, always with you"
- [ ] Fanned card illustration below headline (vector, not emoji)
- [ ] Primary CTA: "Get Started" -- `Button` variant: primary, 52px height, 14pt corner radius
- [ ] Secondary text link: "I already have an account -- Sign In" (navigates to Sign In screen from 13-5)
- [ ] No device detection logic -- the "Sign In" link is the sole returning-user path (DEC-12.7-004)
- [ ] Light mode: white background, primary colors from theme tokens
- [ ] Dark mode: #000000 background, dark mode tokens
- [ ] Matches Figma frame: "Welcome -- Light" / "Welcome -- Dark"

### AC2: Mode Selection Screen

- [ ] Two outcome-based options presented as tappable cards (NOT "guest mode" label -- DEC-12.7-001):
  - **"Keep cards on this device"** -- MI: smartphone icon, subtitle "Fast and private", "Recommended" badge (DEC-12.7-002)
  - **"Sync across all devices"** -- MI: cloud-upload icon, subtitle "Create a free account", secondary styling
- [ ] "Recommended" badge on device storage option uses primary color with subtle background tint
- [ ] Footer text: "Your data is always yours. Export or import your cards anytime from Settings."
- [ ] "What's the difference?" underlined link below footer text (DEC-12.7-006)
- [ ] Tapping "What's the difference?" opens an info tooltip modal explaining both storage options
- [ ] Tapping "Keep cards on this device" sets local mode (maps to existing guest mode internally) and advances to feature highlights
- [ ] Tapping "Sync across all devices" navigates to Sign Up / account creation flow
- [ ] Light/dark mode styling consistent with design tokens
- [ ] Matches Figma frame: "Mode Selection -- Light" / "Mode Selection -- Dark"

### AC3: Feature Highlights (3 Swipeable Screens)

- [ ] Three horizontal swipeable screens with pagination dots:
  1. "All your cards in one place" -- fanned card illustration
  2. "Scan or add manually" -- phone scanning illustration
  3. "Your data, your rules" -- data ownership emphasis (DEC-12.7-003)
- [ ] "Skip" text link at top-right on each screen (DEC-12.7-005) -- skips directly to first card guidance
- [ ] "Next" button on slides 1 and 2 (advances to next slide)
- [ ] "Let's go!" button on slide 3 (advances to first card guidance)
- [ ] CTAs and pagination dots pinned to bottom of screen (DEC-12.7-007)
- [ ] Illustrations centered in middle area with generous vertical space
- [ ] Swipe gesture navigates between slides
- [ ] Pagination dots indicate current position (active dot uses primary color)
- [ ] Light/dark mode for all three slides
- [ ] Matches Figma frames: "Feature Highlight 1/2/3 -- Light" / "Feature Highlight 1/2/3 -- Dark"

### AC4: First Card Guidance Screen

- [ ] Card-with-plus icon centered in a 120px circle
- [ ] Heading: "Add Your First Card" or similar encouraging text
- [ ] Supporting copy: "Add your first loyalty card to get started. It only takes a few seconds!"
- [ ] Primary CTA: "Add Your First Card" -- `Button` variant: primary, 52px height, 14pt corner radius
- [ ] CTA transitions to the Add Card flow (from 13-4)
- [ ] Light/dark mode styling
- [ ] Matches Figma frame: "First Card Guidance -- Light" / "First Card Guidance -- Dark"

### AC5: Info Tooltip Modal (Mode Selection)

- [ ] Modal overlay triggered by "What's the difference?" link on Mode Selection
- [ ] Explains both storage options clearly:
  - Device storage: cards saved locally, no account needed, works offline, export/import available
  - Cloud sync: cards synced across devices, requires free account, automatic backup
- [ ] Dismiss button or tap-outside-to-close
- [ ] Accessible: modal announced to screen readers, focus trapped inside modal
- [ ] Light/dark mode styling
- [ ] Matches Figma frame: "Mode Selection Info Tooltip -- Light" / "Mode Selection Info Tooltip -- Dark"

### AC6: Navigation Flow

- [ ] Welcome -> Mode Selection -> Feature Highlights (1-3) -> First Card Guidance -> Add Card flow
- [ ] "Get Started" on Welcome advances to Mode Selection
- [ ] "Sign In" on Welcome navigates to Sign In screen (13-5)
- [ ] "Keep cards on this device" on Mode Selection sets local mode and advances to highlights
- [ ] "Sync across all devices" on Mode Selection navigates to account creation
- [ ] "Skip" on any highlight jumps to First Card Guidance
- [ ] "Next" on highlights 1-2 advances to next highlight
- [ ] "Let's go!" on highlight 3 advances to First Card Guidance
- [ ] "Add Your First Card" on First Card Guidance transitions to Add Card flow (13-4)
- [ ] Back navigation works correctly at each step (hardware back button on Android)
- [ ] Onboarding completes and does not re-show on subsequent app launches

### AC7: Guest Mode Mapping (Internal)

- [ ] Selecting "Keep cards on this device" triggers the same internal flow as the current guest mode (Epic 6, story 6-5)
- [ ] No "guest" or "local mode" label visible anywhere in the UI
- [ ] Existing `completeFirstLaunch` or equivalent settings-repository call is made at the correct point
- [ ] All existing guest-mode behavior (card storage, settings, export) works unchanged after local mode selection

### AC8: Dark Mode Parity

- [ ] Every screen has dark mode variant matching Figma dark frames
- [ ] Backgrounds: white light / #000000 dark
- [ ] Primary buttons: #1A73E8 light / #4DA3FF dark
- [ ] Icon circles: soft primary tint light / dark-appropriate tint dark
- [ ] Text follows dark mode hierarchy tokens from 13-1
- [ ] Illustrations and icons render correctly on both backgrounds
- [ ] Pagination dots: primary active / muted inactive in both modes

### AC9: Accessibility

- [ ] All interactive elements have 44pt minimum touch targets
- [ ] All elements have appropriate `accessibilityRole` and `accessibilityLabel`
- [ ] Screen reader announces screen transitions between onboarding steps
- [ ] Mode selection cards have clear accessible descriptions (role, label, hint)
- [ ] Feature highlight swipe area has `accessibilityRole="adjustable"` or equivalent
- [ ] Info tooltip modal traps focus and announces as modal
- [ ] "Skip" link is reachable via screen reader navigation

### AC10: Test Coverage

- [ ] Unit tests for each new/modified screen component (>= 80% coverage)
- [ ] Unit tests for mode selection logic (local mode mapping)
- [ ] Unit tests for highlight pagination/swipe logic
- [ ] Unit tests for info tooltip modal open/close
- [ ] Unit tests for navigation flow (mock router)
- [ ] Unit tests for "Skip" behavior
- [ ] Tests co-located with source files

## Tasks / Subtasks

### T1: Restructure `features/onboarding/` Module (AC1, AC6)

- [ ] Plan new directory structure:
  - `features/onboarding/screens/WelcomeScreen.tsx` (move + restyle from current `WelcomeScreen.tsx`)
  - `features/onboarding/screens/ModeSelectionScreen.tsx`
  - `features/onboarding/screens/FeatureHighlightsScreen.tsx`
  - `features/onboarding/screens/FirstCardGuidanceScreen.tsx`
  - `features/onboarding/components/ModeOptionCard.tsx`
  - `features/onboarding/components/InfoTooltipModal.tsx`
  - `features/onboarding/components/HighlightSlide.tsx`
  - `features/onboarding/components/PaginationDots.tsx`
  - `features/onboarding/components/BrandedIcon.tsx` (reusable icon-in-circle)
  - `features/onboarding/components/FannedCardIllustration.tsx`
  - `features/onboarding/hooks/useOnboardingFlow.ts`
  - `features/onboarding/hooks/useModeSelection.ts`
  - `features/onboarding/hooks/useHighlightPagination.ts`
  - `features/onboarding/index.ts`
- [ ] Create barrel export `features/onboarding/index.ts`
- [ ] Deprecate or remove `OnboardingOverlay.tsx` if fully replaced by the new multi-screen flow

### T2: Restyle Welcome Screen (AC1, AC8)

- [ ] Move `WelcomeScreen.tsx` to `features/onboarding/screens/WelcomeScreen.tsx`
- [ ] Implement `BrandedIcon` component: circular container (100px) with soft primary background + card icon centered
- [ ] Add value proposition headline: "Your loyalty cards, always with you" using typography tokens (Title 1 or equivalent)
- [ ] Add `FannedCardIllustration` component: vector fanned-card graphic (SVG or RN vector shapes, no emoji)
- [ ] Replace existing CTAs:
  - "Get Started" using `Button` from `@/shared/components/ui/Button` (variant: primary, 52px height)
  - "I already have an account -- Sign In" as secondary text link (navigates to Sign In route)
- [ ] Remove old "Skip" CTA and tagline text
- [ ] Apply theme tokens for light/dark mode (no hardcoded colors)
- [ ] Update `app/welcome.tsx` re-export path if screen file moves

### T3: Implement Mode Selection Screen (AC2, AC5, AC7, AC8)

- [ ] Create `ModeSelectionScreen.tsx`:
  - Header/title area explaining the choice
  - Two `ModeOptionCard` components
- [ ] Implement `ModeOptionCard` component:
  - Props: `icon: string`, `title: string`, `subtitle: string`, `recommended?: boolean`, `onPress: () => void`
  - Card container with icon (MI: smartphone or MI: cloud-upload), title, subtitle
  - "Recommended" badge: primary color tinted pill on the device storage card
  - Accessible: `accessibilityRole="button"`, descriptive label and hint
  - Light/dark mode via theme tokens
- [ ] Footer text: "Your data is always yours. Export or import your cards anytime from Settings."
- [ ] "What's the difference?" underlined link below footer
- [ ] Implement `InfoTooltipModal` component:
  - Modal overlay (semi-transparent background)
  - Content card explaining both options
  - Dismiss via close button or tap outside
  - Focus trap for accessibility
  - Light/dark mode
- [ ] Implement `useModeSelection` hook:
  - `selectLocalMode()`: calls existing guest-mode setup logic from `completeFirstLaunch` / settings-repository, then navigates to highlights
  - `selectCloudMode()`: navigates to account creation / sign-up flow
  - No "guest" terminology in any public-facing code path

### T4: Implement Feature Highlights Screen (AC3, AC8)

- [ ] Create `FeatureHighlightsScreen.tsx`:
  - Horizontal `FlatList` or `ScrollView` with pagingEnabled for 3 slides
  - Each slide rendered via `HighlightSlide` component
- [ ] Implement `HighlightSlide` component:
  - Props: `title: string`, `illustration: ReactNode`, `isLast: boolean`
  - Title text centered (typography tokens)
  - Illustration area centered in middle
  - CTA at bottom: "Next" (slides 1-2) or "Let's go!" (slide 3) using `Button` primary
- [ ] Implement `PaginationDots` component:
  - Props: `total: number`, `current: number`
  - Active dot: primary color, larger
  - Inactive dots: muted color, smaller
  - Pinned to bottom above CTA
- [ ] "Skip" text link at top-right of each slide -- navigates to First Card Guidance
- [ ] Implement `useHighlightPagination` hook:
  - Tracks current slide index
  - `next()`: advance to next slide
  - `skip()`: jump to First Card Guidance
  - `isLast`: boolean for "Let's go!" vs "Next" CTA
- [ ] Slide content:
  1. Title: "All your cards in one place", illustration: fanned cards
  2. Title: "Scan or add manually", illustration: phone scanning
  3. Title: "Your data, your rules", illustration: data ownership (lock/shield concept)
- [ ] Swipe gesture and programmatic scroll synchronized with pagination dots

### T5: Implement First Card Guidance Screen (AC4, AC8)

- [ ] Create `FirstCardGuidanceScreen.tsx`:
  - `BrandedIcon` reused with card-with-plus icon in 120px circle
  - Heading text: "Add Your First Card"
  - Supporting copy: encouraging text about ease of adding cards
  - Primary CTA: "Add Your First Card" using `Button` primary (52px height)
  - CTA navigates to Add Card flow (route from 13-4)
- [ ] Mark onboarding as complete at this point (or when user taps CTA):
  - Call `completeFirstLaunch` or equivalent so onboarding does not re-show
- [ ] Light/dark mode via theme tokens

### T6: Route Files and Navigation Wiring (AC6)

- [ ] Update `app/welcome.tsx` to re-export updated `WelcomeScreen`
- [ ] Create route files for new screens:
  - `app/onboarding/mode-selection.tsx` -> `ModeSelectionScreen`
  - `app/onboarding/highlights.tsx` -> `FeatureHighlightsScreen`
  - `app/onboarding/first-card.tsx` -> `FirstCardGuidanceScreen`
- [ ] Evaluate if a nested route group `app/(onboarding)/` is more appropriate for stack navigation
- [ ] Wire navigation between screens:
  - Welcome "Get Started" -> Mode Selection
  - Welcome "Sign In" -> Sign In screen (from 13-5, route TBD)
  - Mode Selection "Keep cards on this device" -> Feature Highlights
  - Mode Selection "Sync across all devices" -> Sign Up flow
  - Highlights "Next" -> next slide (internal, not route navigation)
  - Highlights "Skip" / "Let's go!" -> First Card Guidance
  - First Card Guidance CTA -> Add Card flow (from 13-4)
- [ ] Verify back navigation works correctly at each step
- [ ] Verify hardware back button (Android) at each step
- [ ] Ensure onboarding screens are not accessible after onboarding is marked complete

### T7: Dark Mode Implementation (AC8)

- [ ] Apply theme tokens from 13-1 to all new screens and components
- [ ] Verify all backgrounds: white / #000000
- [ ] Verify all icon circles use appropriate light/dark tint
- [ ] Verify all buttons use primary tokens: #1A73E8 / #4DA3FF
- [ ] Verify pagination dots, text, and illustrations render on both backgrounds
- [ ] Verify info tooltip modal in both modes
- [ ] Visual QA pass on all 14 Figma frames (7 concepts x 2 themes)

### T8: Accessibility Pass (AC9)

- [ ] Add `accessibilityRole="button"` to all tappable elements (CTAs, mode cards, Skip link)
- [ ] Add `accessibilityLabel` to all interactive elements
- [ ] Mode selection cards: `accessibilityLabel` includes option name, subtitle, and recommended status
- [ ] Feature highlights: add `accessibilityHint` for swipe gesture, ensure "Skip" is reachable
- [ ] Info tooltip modal: `accessibilityViewIsModal={true}`, focus trap
- [ ] Ensure 44pt minimum touch targets on all tappable elements
- [ ] Announce screen transitions for screen readers
- [ ] Pagination dots announce current position (e.g., "Page 2 of 3")

### T9: Unit Tests (AC10)

- [ ] `features/onboarding/screens/WelcomeScreen.test.tsx`
  - Renders branded icon, headline, fanned card illustration
  - Renders "Get Started" button
  - Renders "Sign In" secondary link
  - "Get Started" navigates to Mode Selection
  - "Sign In" navigates to Sign In screen
- [ ] `features/onboarding/screens/ModeSelectionScreen.test.tsx`
  - Renders two mode option cards with correct titles and subtitles
  - "Recommended" badge shown on device storage option
  - Renders footer text and "What's the difference?" link
  - Tapping device storage card calls local mode setup and navigates to highlights
  - Tapping cloud sync card navigates to sign-up flow
  - "What's the difference?" opens info tooltip modal
- [ ] `features/onboarding/components/ModeOptionCard.test.tsx`
  - Renders icon, title, subtitle
  - Renders "Recommended" badge when prop is true
  - Fires onPress callback
  - Has correct accessibility role and label
- [ ] `features/onboarding/components/InfoTooltipModal.test.tsx`
  - Renders when visible
  - Does not render when not visible
  - Dismiss button closes modal
  - Tap outside closes modal
- [ ] `features/onboarding/screens/FeatureHighlightsScreen.test.tsx`
  - Renders first slide by default
  - "Next" advances to slide 2
  - "Let's go!" on last slide navigates to First Card Guidance
  - "Skip" navigates to First Card Guidance from any slide
  - Pagination dots reflect current slide
- [ ] `features/onboarding/components/HighlightSlide.test.tsx`
  - Renders title and illustration
  - Renders "Next" when not last
  - Renders "Let's go!" when last
- [ ] `features/onboarding/components/PaginationDots.test.tsx`
  - Renders correct number of dots
  - Active dot has primary color styling
- [ ] `features/onboarding/screens/FirstCardGuidanceScreen.test.tsx`
  - Renders icon, heading, supporting copy, CTA
  - CTA navigates to Add Card flow
- [ ] `features/onboarding/hooks/useModeSelection.test.ts`
  - `selectLocalMode` calls settings repository and navigates
  - `selectCloudMode` navigates to sign-up
  - No "guest" label in any exported string or function name
- [ ] `features/onboarding/hooks/useHighlightPagination.test.ts`
  - `next()` increments index
  - `skip()` signals completion
  - `isLast` returns true on slide 3

### T10: Cleanup Legacy Code

- [ ] Remove or refactor `features/onboarding/OnboardingOverlay.tsx` if fully replaced by new screens
- [ ] Remove `features/onboarding/__tests__/OnboardingOverlay.test.tsx` if overlay is removed
- [ ] Update `features/onboarding/index.ts` barrel export to reflect new module structure
- [ ] Remove old WelcomeScreen CTAs ("Skip" text, old tagline) that are no longer in the design
- [ ] Verify no dead imports or unused components remain
- [ ] Update any cross-references in other features that import from `features/onboarding/`
- [ ] Update `app/__tests__/onboarding.integration.test.tsx` for the new flow

## Dev Notes

### Files to Modify

| File                                                       | Change                                                                           |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `features/onboarding/WelcomeScreen.tsx`                    | Full restyle: move to screens/, new layout, branded icon, fanned cards, new CTAs |
| `features/onboarding/OnboardingOverlay.tsx`                | Likely remove entirely -- replaced by multi-screen flow                          |
| `features/onboarding/__tests__/OnboardingOverlay.test.tsx` | Remove if overlay is removed                                                     |
| `features/onboarding/index.ts`                             | Update barrel exports for new module structure                                   |
| `app/welcome.tsx`                                          | Update re-export path if WelcomeScreen moves                                     |
| `app/__tests__/onboarding.integration.test.tsx`            | Update for new flow                                                              |
| `core/settings/settings-repository.ts`                     | Verify `completeFirstLaunch` API is sufficient; may need minor extension         |

### New Files

| File                                                        | Purpose                                                    |
| ----------------------------------------------------------- | ---------------------------------------------------------- |
| `features/onboarding/screens/WelcomeScreen.tsx`             | Restyled welcome with branded icon, fanned cards, new CTAs |
| `features/onboarding/screens/ModeSelectionScreen.tsx`       | Outcome-based storage choice (device vs cloud)             |
| `features/onboarding/screens/FeatureHighlightsScreen.tsx`   | 3 swipeable highlight slides                               |
| `features/onboarding/screens/FirstCardGuidanceScreen.tsx`   | Empty-state prompt to add first card                       |
| `features/onboarding/components/ModeOptionCard.tsx`         | Tappable card for mode selection                           |
| `features/onboarding/components/InfoTooltipModal.tsx`       | "What's the difference?" modal                             |
| `features/onboarding/components/HighlightSlide.tsx`         | Single highlight slide content                             |
| `features/onboarding/components/PaginationDots.tsx`         | Dot indicator for highlights                               |
| `features/onboarding/components/BrandedIcon.tsx`            | Icon-in-colored-circle reusable component                  |
| `features/onboarding/components/FannedCardIllustration.tsx` | Vector fanned-card graphic                                 |
| `features/onboarding/hooks/useOnboardingFlow.ts`            | Overall flow state management                              |
| `features/onboarding/hooks/useModeSelection.ts`             | Mode selection logic + guest mode mapping                  |
| `features/onboarding/hooks/useHighlightPagination.ts`       | Slide pagination state                                     |
| `app/onboarding/mode-selection.tsx`                         | Route file (thin re-export)                                |
| `app/onboarding/highlights.tsx`                             | Route file (thin re-export)                                |
| `app/onboarding/first-card.tsx`                             | Route file (thin re-export)                                |

### Architecture Compliance

- Route files in `app/` are thin re-exports only -- all logic lives in `features/onboarding/`
- Import convention: relative within `features/onboarding/`, absolute `@/shared/...` for shared components, absolute `@/core/...` for settings repository
- Shared components from 13-1 (`Button`) imported from `@/shared/components/ui/`
- Theme tokens from `@/shared/theme/` -- no hardcoded color values in component files
- Tests co-located: every `.tsx` / `.ts` component/hook gets a sibling `.test.tsx` / `.test.ts`
- 80% coverage threshold enforced

### Icon System

- MI: smartphone -- "Keep cards on this device" mode option
- MI: cloud-upload -- "Sync across all devices" mode option
- Card icon (determine exact MI/MCI name during implementation) -- Welcome branded icon
- Card-with-plus icon (determine exact MI/MCI name during implementation) -- First Card Guidance
- All icons via `@expo/vector-icons` MaterialIcons / MaterialCommunityIcons -- no emoji, no FontAwesome

### Critical Design Decisions (from 12-7)

| ID           | Decision                                                           | Impact                                            |
| ------------ | ------------------------------------------------------------------ | ------------------------------------------------- |
| DEC-12.7-001 | NO "guest mode" label -- outcome-based choices only                | Mode Selection screen text, internal code mapping |
| DEC-12.7-002 | Local-first default, "Recommended" badge on device storage         | ModeOptionCard badge, visual hierarchy            |
| DEC-12.7-003 | Data ownership highlight slide ("Your data, your rules")           | Third highlight slide content and illustration    |
| DEC-12.7-004 | No device detection -- "I already have an account" link on Welcome | Welcome screen layout, no fingerprinting logic    |
| DEC-12.7-005 | Skip affordance on highlight screens                               | Top-right "Skip" link on each highlight           |
| DEC-12.7-006 | "What's the difference?" info tooltip on Mode Selection            | InfoTooltipModal component, link placement        |
| DEC-12.7-007 | Highlight CTAs pinned to bottom                                    | HighlightSlide layout, PaginationDots placement   |

### Guest Mode Mapping Details

The current codebase uses `completeFirstLaunch` in `core/settings/settings-repository.ts` to mark onboarding as done. The guest mode behavior from Epic 6 (story 6-5) stores cards locally without authentication. When a user selects "Keep cards on this device":

1. Call `completeFirstLaunch()` (or equivalent) to persist the choice
2. Set the storage mode to local (verify if a separate flag exists or if the absence of auth credentials implies local mode)
3. Proceed through highlights to first card guidance
4. All card CRUD operations use the existing local storage path

No new "mode" flag may be needed if the app already defaults to local when no auth token is present. Verify during implementation.

### Figma Frame Reference

| Frame               | Light                   | Dark                   | Screen                                 |
| ------------------- | ----------------------- | ---------------------- | -------------------------------------- |
| Welcome             | Welcome -- Light        | Welcome -- Dark        | `WelcomeScreen`                        |
| Mode Selection      | Mode Selection -- Light | Mode Selection -- Dark | `ModeSelectionScreen`                  |
| Feature Highlight 1 | Highlight 1 -- Light    | Highlight 1 -- Dark    | `FeatureHighlightsScreen` (slide 1)    |
| Feature Highlight 2 | Highlight 2 -- Light    | Highlight 2 -- Dark    | `FeatureHighlightsScreen` (slide 2)    |
| Feature Highlight 3 | Highlight 3 -- Light    | Highlight 3 -- Dark    | `FeatureHighlightsScreen` (slide 3)    |
| First Card Guidance | First Card -- Light     | First Card -- Dark     | `FirstCardGuidanceScreen`              |
| Info Tooltip        | Tooltip -- Light        | Tooltip -- Dark        | `InfoTooltipModal` (on Mode Selection) |

## Blocks

- **Blocked by 13-1** (Implement Design System Tokens and Components) -- requires `Button` component and all color/typography/spacing tokens to be in place before development begins.
- **Links to 13-5** (Restyle Sign In) -- Welcome screen "Sign In" link navigates to the Sign In screen. If 13-5 is not yet implemented, use a placeholder route or conditional navigation.
- **Links to 13-4** (Restyle Add Card Flow) -- First Card Guidance CTA transitions to the Add Card flow. If 13-4 is not yet implemented, use a placeholder route or the existing `app/add-card.tsx` route.

## Dev Agent Record

### Attempt Log

| #   | Date | Agent | Result | Reason |
| --- | ---- | ----- | ------ | ------ |

### Decisions Made During Dev

_(none yet)_

### Open Questions

_(none yet)_
