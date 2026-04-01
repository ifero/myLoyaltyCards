# Story 13.2: Restyle Home Screen (Card List)

Status: ready-for-dev

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

- [ ] Cards display in a fixed 2-column grid (no responsive 3-column breakpoint -- design spec is 2 columns only)
- [ ] Each tile is 171x140pt (~1.2:1 ratio) with 16pt gutters between tiles
- [ ] Catalogue cards: brand hex background (from `brandColor` field) with centered brand logo (SVG from catalogue)
- [ ] Custom cards (no `brandId`): user-selected color background with first-letter avatar centered
- [ ] Card name displayed below each tile (truncated with ellipsis if too long)
- [ ] Tiles have drop shadows: offset 0, vertical 2px, blur 8px, 8% opacity
- [ ] Tile corners rounded (match Figma radius -- 16pt)
- [ ] Grid is scrollable with smooth FlashList performance
- [ ] 16pt horizontal screen margins on both sides
- [ ] Layout renders correctly in both light mode and dark mode

### AC2: Header Redesign (vector icons, centered title)

- [ ] App name centered in header (17pt Bold, SF Pro system font)
- [ ] Left header: "+" add button using `MaterialIcons` name="add" at 28pt
- [ ] Right header: settings gear using `MaterialIcons` name="settings" at 26pt
- [ ] Both header icons have 44pt minimum touch targets
- [ ] Icon color: `#1A73E8` in light mode, `#4DA3FF` in dark mode (from theme tokens)
- [ ] No emoji icons remain in the header (remove current `+` text and `gear` emoji)
- [ ] Header background matches screen background (no visible separator unless scrolled)

### AC3: Search Bar

- [ ] Search bar visible below header when card count >= 2
- [ ] Hidden when 0 or 1 cards (not useful at that count)
- [ ] Placeholder text: "Search loyalty cards"
- [ ] Search bar height: 40pt, border radius: 12pt
- [ ] Background: `#EFEFF1` in light mode, `#2C2C2E` in dark mode
- [ ] Left icon: `MaterialIcons` name="search" in secondary text color
- [ ] Active state: blue border (primary color), cursor visible, clear X button appears
- [ ] Clear button: `MaterialIcons` name="close"
- [ ] Typing filters card list in real-time (by card name, case-insensitive)
- [ ] When search yields 0 results, show appropriate "No results" feedback
- [ ] Search bar does NOT show "Cancel" text -- only the X clear button

### AC4: Empty State (0 cards)

- [ ] Displayed when user has zero cards
- [ ] Wallet illustration (vector/SVG, no emoji) with dashed outline + sparkle accents
- [ ] "No cards yet" title text (Title 2, 22pt Bold)
- [ ] Encouraging subtitle text below title
- [ ] Primary CTA button: "Add Your First Card" using shared `Button` component (variant="primary")
- [ ] CTA button has colored glow shadow matching primary fill
- [ ] Entire empty state is vertically centered
- [ ] Renders correctly in both light and dark mode
- [ ] Search bar and sort controls are NOT visible in empty state

### AC5: Single Card State (1 card)

- [ ] Single card tile is enlarged: 220x180pt with 20pt border radius
- [ ] Tile is horizontally centered (not stuck to left column)
- [ ] Encouraging tip text below card: "Tap + to add more cards" (Subheadline, 15pt, secondary text color)
- [ ] Layout feels balanced and intentional, not broken
- [ ] Search bar and sort controls are NOT visible in single-card state
- [ ] Renders correctly in both light and dark mode

### AC6: Sort/Filter Controls

- [ ] Visible when card count >= 2
- [ ] Card count label: e.g., "8 loyalty cards" (Body, 17pt)
- [ ] Sort dropdown: "Frequently used" (primary blue text color)
- [ ] Sort options: "Frequently used", "Recently added", "A-Z"
- [ ] Sort selection persists across app sessions (store in AsyncStorage or equivalent)
- [ ] Hidden in empty state and single-card state
- [ ] Renders correctly in both light and dark mode

### AC7: Dark Mode Compliance

- [ ] Background: true black `#000000`
- [ ] Elevated surfaces: `#1C1C1E`
- [ ] Search bar background: `#2C2C2E`
- [ ] Black-branded cards (Sephora, Zara, Coin, OVS -- all `#000000`) get a 1pt `#40404A` border to prevent vanishing on dark background
- [ ] All text follows dark mode text hierarchy tokens from 13-1
- [ ] Icon colors use dark mode primary `#4DA3FF`
- [ ] Drop shadows are invisible or reduced in dark mode (as per Figma)

### AC8: Tab Bar

- [ ] Bottom tab bar with 3 items: Cards (primary/active), Offers (future/disabled), More
- [ ] Active tab uses primary color indicator
- [ ] Tab bar styling matches Figma Home Screen frames
- [ ] If tab bar already exists from layout, update styling to match design spec

### AC9: Accessibility

- [ ] All card tiles have `accessibilityRole="button"` and `accessibilityLabel` with card name
- [ ] Header icons have `accessibilityLabel` ("Add new card", "Settings")
- [ ] Search bar has `accessibilityLabel` ("Search loyalty cards")
- [ ] Empty state CTA has proper accessibility hint
- [ ] Sort controls are accessible with VoiceOver
- [ ] Touch targets are minimum 44pt on all interactive elements

### AC10: Tests Pass

- [ ] All new component tests pass
- [ ] All existing tests pass (no regressions from CardList/CardTile/EmptyState changes)
- [ ] Coverage threshold maintained (80% branches/functions/lines/statements)
- [ ] Snapshot tests updated where applicable

## Tasks / Subtasks

### Task 1: Restyle CardTile component (AC: 1, 7, 9)

- [ ] Rewrite `features/cards/components/CardTile.tsx` to match Figma tile spec
- [ ] Change aspect ratio from 4:3 to ~1.2:1 (171x140pt)
- [ ] Use `CardShell` component from `@/shared/components/ui/CardShell` for tile container
- [ ] Catalogue cards: render brand logo SVG centered on `brandColor` hex background
- [ ] Custom cards: render first-letter avatar on user-selected color (using `VirtualLogo` or new approach matching Figma)
- [ ] Add drop shadow: `shadowOffset: {width: 0, height: 2}`, `shadowRadius: 8`, `shadowOpacity: 0.08`
- [ ] Card name positioned below tile (outside CardShell), not inside
- [ ] Dark mode: apply `#40404A` 1pt border on black-branded cards (`brandColor === '#000000'`)
- [ ] Update `features/cards/components/CardTile.test.tsx` with new rendering expectations

### Task 2: Restyle CardList component (AC: 1, 3, 5, 6, 10)

- [ ] Rewrite `features/cards/components/CardList.tsx` to match Figma grid spec
- [ ] Fix to 2-column layout (remove responsive 3-column breakpoint logic)
- [ ] Set 16pt horizontal screen margins, 16pt gutters between tiles
- [ ] Integrate search bar (conditionally rendered when `cards.length >= 2`)
- [ ] Integrate sort/filter row (conditionally rendered when `cards.length >= 2`)
- [ ] Handle single-card state: render enlarged 220x180pt centered tile with tip text
- [ ] Pass `EmptyState` as `ListEmptyComponent` (updated version from Task 3)
- [ ] Maintain FlashList for performance
- [ ] Maintain pull-to-refresh for cloud sync
- [ ] Update `features/cards/components/CardList.test.tsx`

### Task 3: Restyle EmptyState component (AC: 4, 7, 9)

- [ ] Rewrite `features/cards/components/EmptyState.tsx` to match Figma empty state frame
- [ ] Replace emoji `credit card` icon with vector wallet illustration (SVG or vector graphic with dashed outline + sparkle accents)
- [ ] Update title to "No cards yet" (22pt Bold, Title 2 typography token)
- [ ] Update subtitle with encouraging copy
- [ ] Replace inline button with shared `Button` component from `@/shared/components/ui/Button` (variant="primary")
- [ ] Add glow shadow on CTA button
- [ ] Ensure dark mode rendering matches Figma dark empty state frame
- [ ] Update `features/cards/components/EmptyState.test.tsx`

### Task 4: Create SearchBar component (AC: 3, 7, 9)

- [ ] Create `features/cards/components/SearchBar.tsx`
- [ ] Props: `value: string`, `onChangeText: (text: string) => void`, `onClear: () => void`
- [ ] 40pt height, 12pt border radius
- [ ] Left `MaterialIcons` name="search" icon
- [ ] Placeholder: "Search loyalty cards"
- [ ] Background: `#EFEFF1` light / `#2C2C2E` dark (use theme tokens)
- [ ] Active state: primary blue border, clear X button (`MaterialIcons` name="close")
- [ ] Proper accessibility label
- [ ] Create `features/cards/components/SearchBar.test.tsx`

### Task 5: Create SortFilterRow component (AC: 6, 7, 9)

- [ ] Create `features/cards/components/SortFilterRow.tsx`
- [ ] Props: `cardCount: number`, `sortOption: SortOption`, `onSortChange: (option: SortOption) => void`
- [ ] Display card count: "{n} loyalty cards"
- [ ] Sort dropdown with options: "Frequently used", "Recently added", "A-Z"
- [ ] Sort label in primary blue text color
- [ ] Dark mode support via theme tokens
- [ ] Create `features/cards/components/SortFilterRow.test.tsx`

### Task 6: Create useCardSort hook (AC: 6)

- [ ] Create `features/cards/hooks/useCardSort.ts`
- [ ] Manages sort state: `SortOption = 'frequent' | 'recent' | 'az'`
- [ ] Persists selected sort option to AsyncStorage
- [ ] Exports `sortOption`, `setSortOption`, and `sortCards(cards: LoyaltyCard[])` function
- [ ] "Frequently used" sorts by a usage counter or last-opened timestamp (if available), otherwise falls back to "Recently added"
- [ ] "Recently added" sorts by `createdAt` descending
- [ ] "A-Z" sorts by `name` ascending (locale-aware)
- [ ] Create `features/cards/hooks/useCardSort.test.ts`

### Task 7: Create useCardSearch hook (AC: 3)

- [ ] Create `features/cards/hooks/useCardSearch.ts`
- [ ] Manages search query state
- [ ] Exports `searchQuery`, `setSearchQuery`, `filterCards(cards: LoyaltyCard[])` function
- [ ] Filters by card `name` (case-insensitive substring match)
- [ ] Returns all cards when query is empty
- [ ] Create `features/cards/hooks/useCardSearch.test.ts`

### Task 8: Restyle header in app layout (AC: 2, 7, 9)

- [ ] Update `app/_layout.tsx` header configuration for the home screen
- [ ] Replace `HeaderLeft` emoji "+" with `MaterialIcons` name="add" at 28pt, 44pt touch target
- [ ] Replace `HeaderRight` emoji gear with `MaterialIcons` name="settings" at 26pt, 44pt touch target
- [ ] Center the app title in the header (17pt Bold)
- [ ] Icon color: theme primary (`#1A73E8` light / `#4DA3FF` dark)
- [ ] Remove all emoji usage from header components
- [ ] Verify header renders correctly in both light and dark mode

### Task 9: Implement tab bar (AC: 8)

- [ ] If tab navigation does not exist yet, create `app/(tabs)/_layout.tsx` with bottom tab bar
- [ ] 3 tabs: Cards (active, home screen), Offers (future -- disabled/placeholder), More (settings/about)
- [ ] Tab bar styling matches Figma: active tab uses primary color, inactive uses secondary text color
- [ ] Tab icons use MaterialIcons
- [ ] If migrating from Stack to Tabs layout, update `app/_layout.tsx` accordingly
- [ ] Ensure all existing routes still work after navigation structure change
- [ ] Update route tests if navigation structure changes

### Task 10: Update barrel export and route file (AC: 1)

- [ ] Update `features/cards/index.ts` to export new components (SearchBar, SortFilterRow)
- [ ] Update `features/cards/index.ts` to export new hooks (useCardSort, useCardSearch)
- [ ] Verify `app/index.tsx` still works as thin re-export / composition layer
- [ ] Keep `app/index.tsx` thin -- business logic in hooks, UI in feature components

### Task 11: Run full test suite and verify coverage (AC: 10)

- [ ] Run `npm test` -- all tests pass
- [ ] Verify coverage >= 80% on branches/functions/lines/statements
- [ ] Fix any regressions caused by CardList, CardTile, EmptyState changes
- [ ] Update snapshot tests if any exist for modified components
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
| -------------------------------------------------- | ---------------------------------------------------- |
| `features/cards/components/SearchBar.tsx`          | Home screen search bar (40pt, MI icons, theme-aware) |
| `features/cards/components/SearchBar.test.tsx`     | Tests for SearchBar                                  |
| `features/cards/components/SortFilterRow.tsx`      | Card count + sort dropdown row                       |
| `features/cards/components/SortFilterRow.test.tsx` | Tests for SortFilterRow                              |
| `features/cards/hooks/useCardSort.ts`              | Sort state management + persistence                  |
| `features/cards/hooks/useCardSort.test.ts`         | Tests for useCardSort                                |
| `features/cards/hooks/useCardSearch.ts`            | Search query state + filtering logic                 |
| `features/cards/hooks/useCardSearch.test.ts`       | Tests for useCardSearch                              |
| `app/(tabs)/_layout.tsx`                           | Tab bar layout (if migrating to tabs -- see Task 9)  |

### Architecture Compliance

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

### Debug Log References

### Completion Notes List

### File List
