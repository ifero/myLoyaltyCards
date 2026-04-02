# Story 13.2: Restyle Home Screen (Card List)

Status: in-progress

## Story

As a user opening myLoyaltyCards,
I want to see my loyalty cards in a polished 2-column grid with real brand logos on brand-colored tiles,
so that I can quickly find and tap the card I need at checkout speed.

## Context

This story implements the approved Figma design from Story 12-2 (Home Screen page). The design system tokens, shared components (Button, CardShell, ActionRow), and updated ThemeProvider from Story 13-1 are already in place. The current home screen uses small pastel tiles with 2-letter abbreviations, emoji icons in the header, and no search or sort functionality. This restyle replaces all of that with the Klarna-style card grid, proper MI vector icons, search bar, sort controls, and dedicated empty/single-card states.

**Figma file:** https://www.figma.com/design/4PSsX8SyTUU0GCUdBAAEED/Test
**Figma page:** Home Screen (Story 12-2)
**Design story reference:** docs/sprint-artifacts/stories/12-2-home-screen-card-list.md

## Acceptance Criteria

### AC1: Card Grid Layout (2-column, brand-colored tiles)

- [x] Cards display in a fixed 2-column grid (no responsive 3-column breakpoint -- design spec is 2 columns only)
- [x] Each tile is 171x140pt (~1.2:1 ratio) with 16pt gutters between tiles
- [x] Catalogue cards: brand hex background (from `brandColor` field) with centered brand logo (SVG from catalogue)
- [x] Custom cards (no `brandId`): user-selected color background with first-letter avatar centered
- [x] Card name displayed below each tile (truncated with ellipsis if too long)
- [x] Tiles have drop shadows: offset 0, vertical 2px, blur 8px, 8% opacity
- [x] Tile corners rounded (match Figma radius -- 16pt)
- [x] Grid is scrollable with smooth FlashList performance
- [x] 16pt horizontal screen margins on both sides
- [x] Layout renders correctly in both light mode and dark mode

### AC2: Header Redesign (vector icons, centered title)

- [x] App name centered in header (17pt Bold, SF Pro system font)
- [x] Left header: "+" add button using `MaterialIcons` name="add" at 28pt
- [x] Right header: settings gear using `MaterialIcons` name="settings" at 26pt
- [x] Both header icons have 44pt minimum touch targets
- [x] Icon color: `#1A73E8` in light mode, `#4DA3FF` in dark mode (from theme tokens)
- [x] No emoji icons remain in the header (remove current `+` text and `gear` emoji)
- [x] Header background matches screen background (no visible separator unless scrolled)

### AC3: Search Bar

- [x] Search bar visible below header when card count >= 2
- [x] Hidden when 0 or 1 cards (not useful at that count)
- [x] Placeholder text: "Search loyalty cards"
- [x] Search bar height: 40pt, border radius: 12pt
- [x] Background: `#EFEFF1` in light mode, `#2C2C2E` in dark mode
- [x] Left icon: `MaterialIcons` name="search" in secondary text color
- [x] Active state: blue border (primary color), cursor visible, clear X button appears
- [x] Clear button: `MaterialIcons` name="close"
- [x] Typing filters card list in real-time (by card name, case-insensitive)
- [x] When search yields 0 results, show appropriate "No results" feedback
- [x] Search bar does NOT show "Cancel" text -- only the X clear button

### AC4: Empty State (0 cards)

- [x] Displayed when user has zero cards
- [x] Wallet illustration (vector/SVG, no emoji) with dashed outline + sparkle accents
- [x] "No cards yet" title text (Title 2, 22pt Bold)
- [x] Encouraging subtitle text below title
- [x] Primary CTA button: "Add Your First Card" using shared `Button` component (variant="primary")
- [x] CTA button has colored glow shadow matching primary fill
- [x] Entire empty state is vertically centered
- [x] Renders correctly in both light and dark mode
- [x] Search bar and sort controls are NOT visible in empty state

### AC5: Single Card State (1 card)

- [x] Single card tile is enlarged: 220x180pt with 20pt border radius
- [x] Tile is horizontally centered (not stuck to left column)
- [x] Encouraging tip text below card: "Tap + to add more cards" (Subheadline, 15pt, secondary text color)
- [x] Layout feels balanced and intentional, not broken
- [x] Search bar and sort controls are NOT visible in single-card state
- [x] Renders correctly in both light and dark mode

### AC6: Sort/Filter Controls

- [x] Visible when card count >= 2
- [x] Card count label: e.g., "8 loyalty cards" (Body, 17pt)
- [x] Sort dropdown: "Frequently used" (primary blue text color)
- [x] Sort options: "Frequently used", "Recently added", "A-Z"
- [x] Sort selection persists across app sessions (store in AsyncStorage or equivalent)
- [x] Hidden in empty state and single-card state
- [x] Renders correctly in both light and dark mode

### AC7: Dark Mode Compliance

- [x] Background: true black `#000000`
- [x] Elevated surfaces: `#1C1C1E`
- [x] Search bar background: `#2C2C2E`
- [x] Black-branded cards (Sephora, Zara, Coin, OVS -- all `#000000`) get a 1pt `#40404A` border to prevent vanishing on dark background
- [x] All text follows dark mode text hierarchy tokens from 13-1
- [x] Icon colors use dark mode primary `#4DA3FF`
- [x] Drop shadows are invisible or reduced in dark mode (as per Figma)

### ~~AC8: Tab Bar~~ (REMOVED — not in approved Figma deliverables; see stakeholder decision 2026-04-02)

### AC9: Accessibility

- [x] All card tiles have `accessibilityRole="button"` and `accessibilityLabel` with card name
- [x] Header icons have `accessibilityLabel` ("Add new card", "Settings")
- [x] Search bar has `accessibilityLabel` ("Search loyalty cards")
- [x] Empty state CTA has proper accessibility hint
- [x] Sort controls are accessible with VoiceOver
- [x] Touch targets are minimum 44pt on all interactive elements

### AC10: Tests Pass

- [x] All new component tests pass
- [x] All existing tests pass (no regressions from CardList/CardTile/EmptyState changes)
- [x] Coverage threshold maintained (80% branches/functions/lines/statements)
- [x] Snapshot tests updated where applicable

## Tasks / Subtasks

### Task 1: Restyle CardTile component (AC: 1, 7, 9)

- [x] Rewrite `features/cards/components/CardTile.tsx` to match Figma tile spec
- [x] Change aspect ratio from 4:3 to ~1.2:1 (171x140pt)
- [x] Use `CardShell` component from `@/shared/components/ui/CardShell` for tile container
- [x] Catalogue cards: render brand logo SVG centered on `brandColor` hex background
- [x] Custom cards: render first-letter avatar on user-selected color (using `VirtualLogo` or new approach matching Figma)
- [x] Add drop shadow: `shadowOffset: {width: 0, height: 2}`, `shadowRadius: 8`, `shadowOpacity: 0.08`
- [x] Card name positioned below tile (outside CardShell), not inside
- [x] Dark mode: apply `#40404A` 1pt border on black-branded cards (`brandColor === '#000000'`)
- [x] Update `features/cards/components/CardTile.test.tsx` with new rendering expectations

### Task 2: Restyle CardList component (AC: 1, 3, 5, 6, 10)

- [x] Rewrite `features/cards/components/CardList.tsx` to match Figma grid spec
- [x] Fix to 2-column layout (remove responsive 3-column breakpoint logic)
- [x] Set 16pt horizontal screen margins, 16pt gutters between tiles
- [x] Integrate search bar (conditionally rendered when `cards.length >= 2`)
- [x] Integrate sort/filter row (conditionally rendered when `cards.length >= 2`)
- [x] Handle single-card state: render enlarged 220x180pt centered tile with tip text
- [x] Pass `EmptyState` as `ListEmptyComponent` (updated version from Task 3)
- [x] Maintain FlashList for performance
- [x] Maintain pull-to-refresh for cloud sync
- [x] Update `features/cards/components/CardList.test.tsx`

### Task 3: Restyle EmptyState component (AC: 4, 7, 9)

- [x] Rewrite `features/cards/components/EmptyState.tsx` to match Figma empty state frame
- [x] Replace emoji `credit card` icon with vector wallet illustration (SVG or vector graphic with dashed outline + sparkle accents)
- [x] Update title to "No cards yet" (22pt Bold, Title 2 typography token)
- [x] Update subtitle with encouraging copy
- [x] Replace inline button with shared `Button` component from `@/shared/components/ui/Button` (variant="primary")
- [x] Add glow shadow on CTA button
- [x] Ensure dark mode rendering matches Figma dark empty state frame
- [x] Update `features/cards/components/EmptyState.test.tsx`

### Task 4: Create SearchBar component (AC: 3, 7, 9)

- [x] Create `features/cards/components/SearchBar.tsx`
- [x] Props: `value: string`, `onChangeText: (text: string) => void`, `onClear: () => void`
- [x] 40pt height, 12pt border radius
- [x] Left `MaterialIcons` name="search" icon
- [x] Placeholder: "Search loyalty cards"
- [x] Background: `#EFEFF1` light / `#2C2C2E` dark (use theme tokens)
- [x] Active state: primary blue border, clear X button (`MaterialIcons` name="close")
- [x] Proper accessibility label
- [x] Create `features/cards/components/SearchBar.test.tsx`

### Task 5: Create SortFilterRow component (AC: 6, 7, 9)

- [x] Create `features/cards/components/SortFilterRow.tsx`
- [x] Props: `cardCount: number`, `sortOption: SortOption`, `onSortChange: (option: SortOption) => void`
- [x] Display card count: "{n} loyalty cards"
- [x] Sort dropdown with options: "Frequently used", "Recently added", "A-Z"
- [x] Sort label in primary blue text color
- [x] Dark mode support via theme tokens
- [x] Create `features/cards/components/SortFilterRow.test.tsx`

### Task 6: Create useCardSort hook (AC: 6)

- [x] Create `features/cards/hooks/useCardSort.ts`
- [x] Manages sort state: `SortOption = 'frequent' | 'recent' | 'az'`
- [x] Persists selected sort option to AsyncStorage
- [x] Exports `sortOption`, `setSortOption`, and `sortCards(cards: LoyaltyCard[])` function
- [x] "Frequently used" sorts by a usage counter or last-opened timestamp (if available), otherwise falls back to "Recently added"
- [x] "Recently added" sorts by `createdAt` descending
- [x] "A-Z" sorts by `name` ascending (locale-aware)
- [x] Create `features/cards/hooks/useCardSort.test.ts`

### Task 7: Create useCardSearch hook (AC: 3)

- [x] Create `features/cards/hooks/useCardSearch.ts`
- [x] Manages search query state
- [x] Exports `searchQuery`, `setSearchQuery`, `filterCards(cards: LoyaltyCard[])` function
- [x] Filters by card `name` (case-insensitive substring match)
- [x] Returns all cards when query is empty
- [x] Create `features/cards/hooks/useCardSearch.test.ts`

### Task 8: Restyle header in app layout (AC: 2, 7, 9)

- [x] Update `app/_layout.tsx` header configuration for the home screen
- [x] Replace `HeaderLeft` emoji "+" with `MaterialIcons` name="add" at 28pt, 44pt touch target
- [x] Replace `HeaderRight` emoji gear with `MaterialIcons` name="settings" at 26pt, 44pt touch target
- [x] Center the app title in the header (17pt Bold)
- [x] Icon color: theme primary (`#1A73E8` light / `#4DA3FF` dark)
- [x] Remove all emoji usage from header components
- [x] Verify header renders correctly in both light and dark mode

### ~~Task 9: Implement tab bar (AC: 8)~~ (REMOVED — AC8 not in approved Figma deliverables; stakeholder decision 2026-04-02)

### Task 10: Update barrel export and route file (AC: 1)

- [x] Update `features/cards/index.ts` to export new components (SearchBar, SortFilterRow)
- [x] Update `features/cards/index.ts` to export new hooks (useCardSort, useCardSearch)
- [x] Verify `app/index.tsx` still works as thin re-export / composition layer
- [x] Keep `app/index.tsx` thin -- business logic in hooks, UI in feature components

### Task 11: Run full test suite and verify coverage (AC: 10)

- [x] Run `npm test` -- all tests pass
- [x] Verify coverage >= 80% on branches/functions/lines/statements
- [x] Fix any regressions caused by CardList, CardTile, EmptyState changes
- [x] Update snapshot tests if any exist for modified components
- [ ] Manually test all 5 states: empty (0), single (1), multiple (6+), search active, dark mode

## Dev Notes

### Existing Files to Modify

| File                                            | Change                                                               |
| ----------------------------------------------- | -------------------------------------------------------------------- |
| `features/cards/components/CardList.tsx`        | Full restyle: 2-col grid, search/sort integration, single-card state |
| `features/cards/components/CardList.test.tsx`   | Update tests for new layout, search, sort, states                    |
| `features/cards/components/CardTile.tsx`        | Full restyle: 171x140pt tiles, CardShell, drop shadows, dark border  |
| `features/cards/components/CardTile.test.tsx`   | Update tests for new tile rendering                                  |
| `features/cards/components/EmptyState.tsx`      | Full restyle: vector illustration, shared Button CTA, glow shadow    |
| `features/cards/components/EmptyState.test.tsx` | Update tests for new empty state                                     |
| `features/cards/index.ts`                       | Add exports for SearchBar, SortFilterRow, useCardSort, useCardSearch |
| `app/_layout.tsx`                               | Replace emoji header icons with MI vector icons, update styling      |
| `app/index.tsx`                                 | Minor updates if CardList API changes (props, etc.)                  |

### New Files to Create

| File                                               | Purpose                                              |
| -------------------------------------------------- | ---------------------------------------------------- | --- | -------------------------------------------- | ----------------------- | ------------------------------- |
| `features/cards/components/SearchBar.tsx`          | Home screen search bar (40pt, MI icons, theme-aware) |
| `features/cards/components/SearchBar.test.tsx`     | Tests for SearchBar                                  |
| `features/cards/components/SortFilterRow.tsx`      | Card count + sort dropdown row                       |
| `features/cards/components/SortFilterRow.test.tsx` | Tests for SortFilterRow                              |
| `features/cards/hooks/useCardSort.ts`              | Sort state management + persistence                  |
| `features/cards/hooks/useCardSort.test.ts`         | Tests for useCardSort                                |
| `features/cards/hooks/useCardSearch.ts`            | Search query state + filtering logic                 | \n  | `features/cards/hooks/useCardSearch.test.ts` | Tests for useCardSearch | \n\n### Architecture Compliance |

- **Feature-first structure:** All card-related components and hooks stay in `features/cards/`
- **Shared components:** Use `Button`, `CardShell` from `@/shared/components/ui/` (created in 13-1)
- **Import convention:** Relative imports within `features/cards/`, absolute `@/shared/...` cross-boundary
- **Route files thin:** `app/index.tsx` remains a composition layer, not a component file
- **Tests co-located:** Every new `.tsx` / `.ts` gets a sibling test file
- **NativeWind + theme tokens:** Use `className` for static layout, theme token values for dynamic colors
- **Icon system:** `MaterialIcons` / `MaterialCommunityIcons` from `@expo/vector-icons` only -- no emoji, no FontAwesome

### Figma Frame Reference (Story 12-2, Home Screen page)

| Frame          | Mode  | Key Elements                                                    |
| -------------- | ----- | --------------------------------------------------------------- |
| Multiple Cards | Light | 2-col grid, 8 cards, search bar, sort row, header with MI icons |
| Multiple Cards | Dark  | True black bg, elevated tiles, #40404A border on black brands   |
| Empty State    | Light | Wallet illustration, "No cards yet", primary CTA with glow      |
| Empty State    | Dark  | Same layout on #000000 background                               |
| Single Card    | Light | Enlarged 220x180pt tile, centered, "Tap + to add more" tip      |
| Single Card    | Dark  | Same layout on #000000 background                               |
| Search Active  | Light | Blue-bordered search bar, "Ess" typed, 1 filtered result        |
| Search Active  | Dark  | Same with dark search bar bg #2C2C2E                            |
| Header Detail  | Light | Icon sizing callouts (28pt add, 26pt settings, 44pt targets)    |
| Header Detail  | Dark  | Icon colors #4DA3FF on dark                                     |

### Dark Mode Token Quick Reference

| Element             | Light                  | Dark          |
| ------------------- | ---------------------- | ------------- |
| Screen background   | off-white (from theme) | `#000000`     |
| Tile surface        | white                  | `#1C1C1E`     |
| Search bar bg       | `#EFEFF1`              | `#2C2C2E`     |
| Icon color (header) | `#1A73E8`              | `#4DA3FF`     |
| Black brand border  | n/a                    | 1pt `#40404A` |
| Text primary        | near-black             | near-white    |
| Text secondary      | medium grey            | light grey    |
| Drop shadow         | 8% opacity             | 0% or reduced |

### Card Tile Dimension Reference

| State                | Width | Height | Radius | Notes                  |
| -------------------- | ----- | ------ | ------ | ---------------------- |
| Grid tile (2+ cards) | 171pt | 140pt  | 16pt   | 2 per row, 16pt gutter |
| Single card tile     | 220pt | 180pt  | 20pt   | Centered horizontally  |

### Sort Implementation Notes

- "Frequently used" requires tracking card open count or last-opened timestamp. Check if `LoyaltyCard` schema has such a field. If not, fall back to "Recently added" order until a future story adds usage tracking.
- Sort preference key for AsyncStorage: `@myLoyaltyCards/sortPreference`

### References

- [Design spec: docs/sprint-artifacts/stories/12-2-home-screen-card-list.md]
- [Foundation dependency: docs/sprint-artifacts/stories/13-1-implement-design-system-tokens.md]
- [Project rules: docs/project_context.md]
- [Architecture: docs/architecture.md]
- [Current CardList: features/cards/components/CardList.tsx]
- [Current CardTile: features/cards/components/CardTile.tsx]
- [Current EmptyState: features/cards/components/EmptyState.tsx]
- [Current header: app/_layout.tsx (HeaderLeft, HeaderRight components)]
- [Figma: https://www.figma.com/design/4PSsX8SyTUU0GCUdBAAEED/Test -- Home Screen page]

## Blocks

- **Blocked by:** Story 13-1 (design system tokens, Button, CardShell, ActionRow components must be implemented first)
- **Blocks:** None directly, but should be completed before 13-3 (Card Detail restyle) for visual consistency

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- AC8 (Tab Bar) and Task 9 removed — not present in approved Figma deliverables from story 12-2. Stakeholder (Ifero) confirmed removal 2026-04-02.
- CardShell from shared/components/ui used as tile container base
- FlashList global mock updated to support ListHeaderComponent rendering

### Completion Notes List

- Task 7: useCardSearch hook — 8 tests, filters by name case-insensitive
- Task 6: useCardSort hook — 11 tests, 3 sort modes with AsyncStorage persistence
- Task 4: SearchBar component — 10 tests, theme-aware with clear button
- Task 5: SortFilterRow component — 8 tests, modal sort picker with card count
- Task 1: CardTile restyle — 15 tests, 171x140pt tiles, dark border on black brands
- Task 3: EmptyState restyle — 9 tests, wallet icon, shared Button CTA with glow
- Task 2: CardList restyle — 16 tests, 2-column grid, search/sort integration, single-card state
- Task 8: Header MI icons — add (28pt) and settings (26pt) with 44pt touch targets
- Task 10: Barrel exports updated in features/cards/index.ts
- Task 11: Full suite 1095 passed, 0 failed, 0 regressions
- Global @expo/vector-icons mock added to jest.setup.js for MaterialIcons/MaterialCommunityIcons

### File List

**Modified:**

- `features/cards/components/CardTile.tsx` — Full restyle: 171x140pt, CardShell, dark border, drop shadow
- `features/cards/components/CardTile.test.tsx` — 15 tests for new tile behavior
- `features/cards/components/CardList.tsx` — 2-column grid, search/sort, single-card state
- `features/cards/components/CardList.test.tsx` — 16 tests for all list states
- `features/cards/components/EmptyState.tsx` — Wallet illustration, shared Button CTA, glow shadow
- `features/cards/components/EmptyState.test.tsx` — 9 tests for empty state
- `features/cards/index.ts` — Added SearchBar, SortFilterRow, useCardSearch, useCardSort exports
- `app/_layout.tsx` — MI icons replacing emoji in header (add 28pt, settings 26pt)
- `jest.setup.js` — Global @expo/vector-icons mock, FlashList ListHeaderComponent support
- `docs/sprint-artifacts/sprint-status.yaml` — Story status updated to in-progress

**Created:**

- `features/cards/components/SearchBar.tsx` — Theme-aware search input with MI icons
- `features/cards/components/SearchBar.test.tsx` — 10 tests
- `features/cards/components/SortFilterRow.tsx` — Card count + sort dropdown modal
- `features/cards/components/SortFilterRow.test.tsx` — 8 tests
- `features/cards/hooks/useCardSearch.ts` — Search query state + card filtering
- `features/cards/hooks/useCardSearch.test.ts` — 8 tests
- `features/cards/hooks/useCardSort.ts` — Sort state with AsyncStorage persistence
- `features/cards/hooks/useCardSort.test.ts` — 11 tests
