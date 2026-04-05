# Story 13.4: Restyle Add Card Flow

Status: review

## Story

As a user adding a new loyalty card,
I want the add-card flow to feel polished, fast, and consistent with the redesigned app,
so that picking a brand, scanning a barcode, or entering details manually is intuitive and matches the visual quality of the rest of the app.

## Context

This story implements the approved Figma designs from Story 12-4 (Add Card Flow). It is the most complex restyle in Epic 13 -- the design required 3 review rounds before approval. The flow spans 5 distinct screens (Card Type Selection, Search Active, Camera Scanner, Card Setup Catalogue, Card Setup Custom) plus the Home toast confirmation.

The existing add-card code lives in `app/add-card.tsx` (monolithic screen with inline catalogue grid + form toggle) and `app/scan.tsx` (thin re-export to `BarcodeScanner`). This restyle replaces that architecture with a multi-screen push navigation flow under `features/add-card/`.

Story 13-1 provides the design system foundation: `Button`, `CardShell`, `TextField`, `ColorPicker`, `ActionRow` shared components, plus all color/typography/spacing tokens.

**Figma file:** https://www.figma.com/design/4PSsX8SyTUU0GCUdBAAEED/Test
**Figma page:** Add Card Flow
**Design story reference:** docs/sprint-artifacts/stories/12-4-add-card-flow.md

## Acceptance Criteria

### AC1: Card Type Selection Screen

- [ ] Full-screen push navigation (NOT modal) from home "+" button
- [ ] Back arrow (MI: chevron-left) in navigation header
- [ ] Search bar at top: placeholder "Search by name", MI: search icon, MI: close to clear
- [ ] "Popular cards" section: 5 most common brands with 40pt circle logos + brand names
- [ ] "All cards" section: alphabetical list of all catalogue brands with 40pt circle logos + names
- [ ] "Other card" / "Custom card" option at end of popular section or as distinct row
- [ ] Brand circles use real SVG logos from catalogue; first-letter avatar fallback for missing logos
- [ ] Light mode: white background, #F5F5F5 search field
- [ ] Dark mode: #000000 background, #2C2C2E search field
- [ ] Matches Figma frame: "Card Type Selection (Light)" / "Card Type Selection (Dark)"

### AC2: Search Active State

- [ ] Tapping search bar activates search with keyboard
- [ ] Results filter in real-time as user types (brand name matching)
- [ ] Filtered list replaces "Popular cards" / "All cards" sections
- [ ] "Other card" option remains visible when search yields no exact match
- [ ] MI: close button clears search and restores default sections
- [ ] Empty state if no brands match query (text: "No cards found")
- [ ] Matches Figma frame: "Search Active (Light)" / "Search Active (Dark)"

### AC3: Catalogue Brand to Scanner Navigation

- [ ] Tapping a catalogue brand navigates to the barcode input step
- [ ] Primary action: camera scanner auto-opens or shows prominent CTA (Button variant: primary, "Scan barcode")
- [ ] Secondary action: "Enter card number manually" as ActionRow (icon + label + MI: chevron-right)
- [ ] Brand name/logo shown in header for context
- [ ] Barcode format is auto-detected from catalogue metadata -- never shown to user
- [ ] "Other card" selection follows the same scanner-first flow

### AC4: Camera Scanner Screen

- [ ] Full-bleed camera view fills the screen
- [ ] White viewfinder corner brackets with blue (#1A73E8 light / #4DA3FF dark) scan line animation
- [ ] Floating back button: dark circle (#000000 80% opacity) + MI: chevron-left white arrow, top-left safe area
- [ ] Brand pill: rounded pill showing brand name + logo over camera, brand-colored background
- [ ] "Enter card number manually" below camera area as ActionRow component
- [ ] Auto-detects barcode on scan -- card is created immediately on detection
- [ ] Navigates to Card Setup screen with pre-filled number after successful scan
- [ ] Matches Figma frame: "Camera Scanner (Light)" / "Camera Scanner (Dark)"

### AC5: Card Setup Screen -- Catalogue Brand

- [ ] Header shows brand context (name + logo)
- [ ] Card number field: pre-filled from scan, editable (TextField component)
- [ ] NO barcode format field (auto-detected silently)
- [ ] "Done" primary button at bottom (Button variant: primary, 52pt height, 14pt corner radius)
- [ ] Tapping "Done" saves card and navigates to home
- [ ] Back arrow allows returning to scanner
- [ ] Light mode: white background, #F5F5F5 input fields
- [ ] Dark mode: #000000 background, #2C2C2E input fields
- [ ] Matches Figma frame: "Card Setup Catalogue (Light)" / "Card Setup Catalogue (Dark)"

### AC6: Card Setup Screen -- Custom Card

- [ ] Store name field (required, TextField with error state if empty on submit)
- [ ] Card number field with inline scan icon CTA (barcode viewfinder icon button)
- [ ] Tapping scan icon CTA opens camera scanner, returns with scanned number
- [ ] Color picker: 8 preset colors with selection ring indicator (ColorPicker component)
- [ ] "Done" primary button at bottom (Button variant: primary, 52pt height, 14pt corner radius)
- [ ] NO barcode format field
- [ ] Back arrow navigation
- [ ] Light/dark mode styling consistent with AC5
- [ ] Matches Figma frame: "Card Setup Custom (Light)" / "Card Setup Custom (Dark)"

### AC7: Confirmation -- Home Toast & Highlight

- [ ] On "Done", user returns to home screen (pop entire add-card stack)
- [ ] Toast notification at bottom: "Card added" (no emoji in production; checkmark icon if available)
- [ ] Toast auto-dismisses after ~3 seconds with fade animation
- [ ] Newly added card has green border highlight that fades after ~2 seconds
- [ ] NO dedicated success screen -- home IS the success confirmation
- [ ] Matches Figma frame: "Home with Toast (Light)" / "Home with Toast (Dark)"

### AC8: Interaction Flow Timing

- [ ] Fast path (scan): Plus -> Brand -> Auto-scan -> Done = 3 interactions
- [ ] Manual path: Plus -> Brand -> Enter manually -> Type -> Done = 4 interactions
- [ ] Custom path: Plus -> Other card -> Fill form -> Done = 4 interactions
- [ ] Navigation between steps uses push transitions (no modals)
- [ ] Back navigation works correctly through entire stack

### AC9: Dark Mode Parity

- [ ] Every screen has dark mode variant matching Figma dark frames
- [ ] Primary buttons: #1A73E8 light / #4DA3FF dark
- [ ] Input fields: #F5F5F5 light / #2C2C2E dark
- [ ] Backgrounds: white light / #000000 dark
- [ ] Elevated surfaces: white light / #1C1C1E dark
- [ ] Scanner floating back button works on both light and dark backgrounds (always dark circle)

### AC10: Accessibility

- [ ] All interactive elements have 44pt minimum touch targets
- [ ] All elements have appropriate accessibilityRole and accessibilityLabel
- [ ] Screen reader announces screen transitions
- [ ] Search bar is keyboard-accessible
- [ ] Scanner alternative (manual entry) is always reachable without camera

### AC11: Test Coverage

- [ ] Unit tests for each new screen component (>= 80% coverage)
- [ ] Unit tests for search filtering logic
- [ ] Unit tests for navigation flow (mock router)
- [ ] Unit tests for toast/highlight timing logic
- [ ] Tests co-located with source files

## Tasks / Subtasks

### T1: Create `features/add-card/` Feature Module (AC1, AC8)

- [ ] Create `features/add-card/` directory structure:
  - `features/add-card/screens/CardTypeSelectionScreen.tsx`
  - `features/add-card/screens/BrandScannerScreen.tsx`
  - `features/add-card/screens/CardSetupScreen.tsx`
  - `features/add-card/components/BrandList.tsx`
  - `features/add-card/components/BrandSearchBar.tsx`
  - `features/add-card/components/BrandRow.tsx`
  - `features/add-card/components/ScannerOverlay.tsx`
  - `features/add-card/components/BrandPill.tsx`
  - `features/add-card/components/FloatingBackButton.tsx`
  - `features/add-card/components/CardSetupForm.tsx`
  - `features/add-card/components/InlineScanButton.tsx`
  - `features/add-card/hooks/useCardTypeSelection.ts`
  - `features/add-card/hooks/useBrandSearch.ts`
  - `features/add-card/index.ts`
- [ ] Create barrel export `features/add-card/index.ts`

### T2: Card Type Selection Screen (AC1, AC2)

- [ ] Implement `CardTypeSelectionScreen` with sections: Popular cards, All cards, Other card
- [ ] Implement `BrandSearchBar` using `TextField` from `@/shared/components/ui/TextField`
  - Search icon (MI: search) as left adornment
  - Clear button (MI: close) as right adornment when text present
  - Placeholder: "Search by name"
  - 52pt height, 12pt corner radius, #F5F5F5 light / #2C2C2E dark background
- [ ] Implement `BrandRow`: 40pt brand circle (logo or first-letter fallback) + brand name + chevron
- [ ] Implement `BrandList` with SectionList: "Popular cards" header, "All cards" header
- [ ] Implement `useBrandSearch` hook: filters catalogue brands by name, case-insensitive
- [ ] "Other card" row navigates to scanner flow with custom card flag
- [ ] Wire navigation: brand tap -> BrandScannerScreen with brand context params

### T3: Brand Scanner / Barcode Input Step (AC3, AC4)

- [ ] Implement `BrandScannerScreen` with two modes:
  - Auto-open camera (if permission granted) or show "Scan barcode" primary Button CTA
  - ActionRow: "Enter card number manually" with icon + label + chevron
- [ ] Implement `ScannerOverlay`:
  - Full-bleed camera from existing `BarcodeScanner` component (reuse `features/cards/components/BarcodeScanner.tsx`)
  - White viewfinder corner brackets (4 corners, white stroke)
  - Blue scan line animation (#1A73E8 light / #4DA3FF dark)
- [ ] Implement `FloatingBackButton`: dark circle (40pt, #000000 80% opacity) + MI: chevron-left white
  - Positioned top-left with safe area inset
- [ ] Implement `BrandPill`: rounded pill over camera, brand logo + name, brand-colored background
- [ ] Auto-add card on barcode detection -> navigate to CardSetupScreen with pre-filled data
- [ ] "Enter card number manually" ActionRow navigates to CardSetupScreen without scan data

### T4: Card Setup Screen -- Catalogue Path (AC5)

- [ ] Implement `CardSetupScreen` with `mode` prop: 'catalogue' | 'custom'
- [ ] Catalogue mode: brand header (name + logo), card number TextField (pre-filled, editable), "Done" Button
- [ ] Card number field uses `TextField` from 13-1: 52pt height, 12pt corner radius
- [ ] "Done" button uses `Button` variant: primary from 13-1: 52pt height, 14pt corner radius, #1A73E8 / #4DA3FF
- [ ] On "Done": save card via existing `useAddCard` hook, pop entire add-card stack, navigate home

### T5: Card Setup Screen -- Custom Path (AC6)

- [ ] Custom mode: store name TextField (required), card number TextField with inline scan CTA, ColorPicker, "Done" Button
- [ ] Implement `InlineScanButton`: compact barcode viewfinder icon button inline with card number field
  - Tapping opens scanner, returns with scanned number to pre-fill the field
- [ ] Store name validation: show error state on submit if empty
- [ ] `ColorPicker` from 13-1 with 8 preset colors and selection ring
- [ ] "Done" saves custom card with user-entered store name, optional barcode, selected color

### T6: Confirmation -- Toast & Highlight (AC7)

- [ ] Implement toast notification component or extend existing toast system
  - Text: "Card added"
  - Position: bottom of home screen, above tab bar
  - Auto-dismiss after ~3 seconds with opacity fade animation
- [ ] Implement green border highlight on newly added card in home list
  - Green border (#4CAF50 or semantic success color) fades after ~2 seconds
  - Pass new card ID via navigation params or context to identify which card to highlight
- [ ] Toast and highlight trigger on navigation back to home from add-card flow

### T7: Route Files & Navigation Wiring (AC8)

- [ ] Update `app/add-card.tsx` to be a thin re-export of `CardTypeSelectionScreen` (or redirect)
- [ ] Create route files for new screens if needed:
  - `app/add-card/index.tsx` -> `CardTypeSelectionScreen`
  - `app/add-card/scan.tsx` -> `BrandScannerScreen`
  - `app/add-card/setup.tsx` -> `CardSetupScreen`
- [ ] Evaluate if nested route group `app/(add-card)/` is needed for stack navigation
- [ ] Ensure `app/scan.tsx` is updated or redirected to new scanner screen
- [ ] Verify back navigation pops correctly through entire stack
- [ ] Verify hardware back button (Android) works at each step

### T8: Dark Mode Implementation (AC9)

- [ ] Apply theme tokens from 13-1 to all new screens and components
- [ ] Verify all backgrounds: white / #000000
- [ ] Verify all input fields: #F5F5F5 / #2C2C2E
- [ ] Verify all elevated surfaces: white / #1C1C1E
- [ ] Verify primary button colors: #1A73E8 / #4DA3FF
- [ ] Verify scanner overlay elements render correctly on both themes
- [ ] Visual QA pass on all 12 Figma frames (6 screens x 2 themes)

### T9: Accessibility Pass (AC10)

- [ ] Add `accessibilityRole="button"` to all tappable elements
- [ ] Add `accessibilityLabel` to all interactive elements (brand rows, search bar, scanner, buttons)
- [ ] Ensure 44pt minimum touch targets on brand rows, action rows, buttons, floating back button
- [ ] Add `accessibilityRole="search"` to search bar
- [ ] Announce screen transitions for screen readers
- [ ] Verify manual entry path is fully usable without camera

### T10: Unit Tests (AC11)

- [ ] `features/add-card/screens/CardTypeSelectionScreen.test.tsx`
  - Renders popular cards section
  - Renders all cards section
  - Renders "Other card" option
  - Search filters brands correctly
  - Clear search restores sections
  - Empty search state shows "No cards found"
  - Brand tap navigates with correct params
- [ ] `features/add-card/components/BrandSearchBar.test.tsx`
  - Renders placeholder text
  - Shows clear button when text present
  - Clears on clear button press
- [ ] `features/add-card/components/BrandRow.test.tsx`
  - Renders brand name and logo
  - Renders first-letter fallback when no logo
  - Fires onPress with brand data
- [ ] `features/add-card/screens/BrandScannerScreen.test.tsx`
  - Renders scanner or scan CTA
  - Renders manual entry ActionRow
  - Renders brand pill with context
  - Renders floating back button
- [ ] `features/add-card/screens/CardSetupScreen.test.tsx`
  - Catalogue mode: renders pre-filled card number, Done button, no store name field
  - Custom mode: renders store name field, card number with scan CTA, color picker, Done button
  - Validates store name required in custom mode
  - Done button calls save and navigates home
- [ ] `features/add-card/components/ScannerOverlay.test.tsx`
  - Renders viewfinder corners
  - Renders scan line
- [ ] `features/add-card/components/FloatingBackButton.test.tsx`
  - Renders with correct styling
  - Fires onPress
- [ ] `features/add-card/hooks/useBrandSearch.test.ts`
  - Filters by partial name match
  - Case-insensitive matching
  - Returns empty array for no matches
  - Returns all brands for empty query

### T11: Cleanup Legacy Code

- [ ] Remove or refactor `CatalogueGrid.tsx` if fully replaced by `BrandList`
- [ ] Remove catalogue/form toggle logic from old `app/add-card.tsx`
- [ ] Remove emoji usage from buttons (the old "+" and "camera" emoji patterns)
- [ ] Verify no dead imports or unused components remain
- [ ] Update any cross-references in other features that link to old add-card routes

## Dev Notes

### Files to Modify

- `app/add-card.tsx` -- replace with thin re-export or redirect to new screen
- `app/scan.tsx` -- update to work with new scanner screen or redirect
- `features/cards/components/BarcodeScanner.tsx` -- reuse, possibly extract scanner logic for the new `ScannerOverlay`
- `features/cards/hooks/useAddCard.ts` -- reuse as-is for card save logic
- Home screen component (wherever card list renders) -- add toast and highlight support

### New Files

- `features/add-card/` -- entire new feature module (screens, components, hooks, tests, index)
- Route files under `app/` for the new multi-screen flow (exact structure depends on Expo Router nested layout evaluation)

### Architecture Compliance

- Route files in `app/` are thin re-exports only -- all logic lives in `features/add-card/`
- Import convention: relative within `features/add-card/`, absolute `@/shared/...` for shared components, absolute `@/features/cards/...` for reused card feature code
- Shared components from 13-1 (`Button`, `TextField`, `ActionRow`, `ColorPicker`, `CardShell`) imported from `@/shared/components/ui/`
- Theme tokens from `@/shared/theme/` -- no hardcoded color values in component files
- Tests co-located: every `.tsx` component file has a `.test.tsx` sibling
- 80% coverage threshold enforced

### Icon System

- MI: chevron-left -- back navigation (floating on scanner, standard header elsewhere)
- MI: search -- search bar left adornment
- MI: close -- clear search right adornment
- MI: chevron-right -- ActionRow chevron (via ActionRow component from 13-1)
- Barcode viewfinder icon -- inline scan CTA on custom card setup (determine exact MI/MCI icon name during implementation)
- Brand logos -- SVG from catalogue data, 40pt circles

### Key Design Decisions (from 12-4 Reviews)

- Full-screen push navigation throughout -- NOT modal sheets
- Scanner is primary for ALL paths including custom cards
- Card auto-added on barcode detection -- setup screen shows pre-filled number for verification
- Barcode format NEVER shown to user -- auto-detected silently
- No dedicated success screen -- home + toast is the only confirmation
- Immersive scanner: floating back button + brand pill over full-bleed camera, no full nav header
- Scan icon CTA on custom card setup is compact/inline, not a large primary button

### Figma Frame Reference

| Frame                | Light         | Dark         | Screen                                   |
| -------------------- | ------------- | ------------ | ---------------------------------------- |
| Card Type Selection  | Frame 1 Light | Frame 1 Dark | `CardTypeSelectionScreen`                |
| Search Active        | Frame 2 Light | Frame 2 Dark | `CardTypeSelectionScreen` (search state) |
| Camera Scanner       | Frame 3 Light | Frame 3 Dark | `BrandScannerScreen`                     |
| Card Setup Catalogue | Frame 4 Light | Frame 4 Dark | `CardSetupScreen` (mode: catalogue)      |
| Card Setup Custom    | Frame 5 Light | Frame 5 Dark | `CardSetupScreen` (mode: custom)         |
| Home with Toast      | Frame 6 Light | Frame 6 Dark | Home screen (post-add confirmation)      |

## Blocks

- **Blocked by 13-1** (Implement Design System Tokens & Components) -- requires `Button`, `TextField`, `ActionRow`, `ColorPicker`, `CardShell` components and all color/typography/spacing tokens to be in place before development begins.

## Dev Agent Record

### Attempt Log

| #   | Date       | Agent                                         | Result    | Reason                                                     |
| --- | ---------- | --------------------------------------------- | --------- | ---------------------------------------------------------- |
| 1   | 2026-04-05 | Dev (bmad-agent-bmm-dev)                      | completed | Implemented add-card flow restyle, route migration, tests  |
| 2   | 2026-04-05 | QA subagent (`bmad-agent-tea-tea` via `[RV]`) | approved  | Final QA gate approved after scanner-flow and typing fixes |
| 3   | 2026-04-05 | Dev subagent (`bmad-agent-bmm-dev`)           | approved  | Independent review approved, no remaining must-fix         |

### Decisions Made During Dev

- `Other card` uses scanner-first navigation (`/add-card/scan`) to align with AC3 scanner-primary flow.
- Legacy `/scan` is preserved as a compatibility bridge that redirects into `/add-card/scan`.
- Home highlight consumes `newCardId` once and clears route params to avoid repeated highlight.

### Open Questions

- None.
