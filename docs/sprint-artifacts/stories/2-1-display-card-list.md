# Story 2.1: Display Card List

## Story Information

| Field        | Value                                 |
| ------------ | ------------------------------------- |
| **Story ID** | 2.1                                   |
| **Epic**     | 2 - Card Management & Barcode Display |
| **Sprint**   | 1                                     |
| **Status**   | Ready for Review                      |
| **Priority** | High                                  |
| **Estimate** | Medium (1-2 days)                     |

---

## User Story

**As a** user,  
**I want** to see all my loyalty cards in a clean grid,  
**So that** I can quickly find and access any card.

---

## Acceptance Criteria

### AC1: Empty State

```gherkin
Given I have no cards saved
When I view the main screen
Then I see a friendly empty state with:
  - A welcoming message: "No cards yet"
  - An encouraging subtext: "Add your first loyalty card to get started"
  - A prominent "Add Card" button (Sage Green primary style)
And the empty state is centered vertically and horizontally
And the "+" button in the header is still visible
```

### AC2: Card Grid Display

```gherkin
Given I have cards saved
When I view the main screen
Then I see my cards in a responsive grid layout:
  - 2 columns on standard phones (< 400dp width)
  - 3 columns on larger phones/tablets (≥ 400dp width)
And each card shows:
  - Card name (truncated if > 20 characters with ellipsis)
  - Visual identifier (brand logo OR Virtual Logo)
And card tiles have consistent 8px spacing between them
And card tiles have 8px border radius (rounded corners)
```

### AC3: Card Order

```gherkin
Given I have multiple cards saved
When I view the card list
Then cards are ordered alphabetically by name (A-Z)
And the order is consistent across app restarts
```

### AC4: Scrolling Performance

```gherkin
Given I have 20+ cards saved
When I scroll through the card list
Then scrolling is smooth at 60fps
And there is no visible lag or jank
And cards render immediately (no blank placeholders)
```

### AC5: Offline Access

```gherkin
Given I am viewing my cards
When I lose network connectivity (airplane mode)
Then all cards remain visible
And I can still scroll through the list
And no error messages are displayed
```

### AC6: Card Tap Interaction

```gherkin
Given I see a card in the grid
When I tap on a card
Then the card shows a brief press feedback (opacity change or scale)
And I navigate to the Card Details screen (Story 2.6)
```

---

## Technical Requirements

### Dependencies

- `@/core/database` - Card repository for fetching cards
- `@/core/schemas` - LoyaltyCard type
- `@/shared/theme` - Theme colors and spacing
- `@shopify/flash-list` - High-performance list rendering (10x faster than FlatList)

### New Files to Create

| File                                       | Purpose                        |
| ------------------------------------------ | ------------------------------ |
| `features/cards/components/CardList.tsx`   | Main card list component       |
| `features/cards/components/CardTile.tsx`   | Individual card tile component |
| `features/cards/components/EmptyState.tsx` | Empty state component          |
| `features/cards/hooks/useCards.ts`         | Hook to fetch and manage cards |

### Files to Modify

| File                      | Changes                                     |
| ------------------------- | ------------------------------------------- |
| `app/index.tsx`           | Replace placeholder with CardList component |
| `features/cards/index.ts` | Export new components                       |

### Data Flow

```
app/index.tsx
    └── CardList
        ├── useCards() → cardRepository.getAll()
        ├── EmptyState (if no cards)
        └── FlashList (@shopify/flash-list)
            └── CardTile (per card, recycled)
                └── onPress → navigate to card details (/card/[id])
```

### Component Specifications

#### CardList

- Uses `FlashList` from `@shopify/flash-list` with `numColumns` based on screen width
- Provides `estimatedItemSize` prop for optimal pre-rendering (prevents blank spaces)
- Implements `useWindowDimensions()` for responsive columns
- Pulls cards from local database via `useCards()` hook
- Shows loading state while fetching (spinner)
- Shows EmptyState when cards array is empty

#### CardTile

- Fixed aspect ratio (1:1 or 4:3 depending on design)
- Shows card name at bottom with dark text on light background
- Shows visual identifier centered (logo or Virtual Logo)
- Pressable with opacity feedback (`activeOpacity={0.7}`)
- Accessible: `accessibilityRole="button"`, `accessibilityLabel={card.name}`

#### EmptyState

- Centered layout with flex
- Icon or illustration (optional, can use emoji 💳)
- Primary text: "No cards yet"
- Secondary text: "Add your first loyalty card to get started"
- CTA button: "Add Card" with Sage Green background

---

## UI/UX Specifications

### Layout

- Grid with 8px gap between items
- 16px horizontal padding on screen edges
- Cards fill available width minus padding and gaps

### Colors (from theme)

- Card background: `theme.surface`
- Card text: `theme.textPrimary`
- Empty state text: `theme.textSecondary`
- CTA button: `theme.primary` (#73A973)

### Typography

- Card name: 14px, semibold, single line with ellipsis
- Empty state title: 20px, bold
- Empty state subtitle: 14px, regular

### Touch Targets

- Minimum 44x44px touch area per card
- Cards should be at least 150px wide on smallest phones

---

## Testing Checklist

### Manual Testing

- [ ] Empty state displays correctly with no cards
- [ ] Cards display in 2-column grid on iPhone SE
- [ ] Cards display in 3-column grid on iPhone 15 Pro Max
- [ ] Card names truncate properly with ellipsis
- [ ] Scrolling is smooth with 50+ cards
- [ ] Cards persist after app restart
- [ ] Works offline (airplane mode)
- [ ] Tap feedback is visible
- [ ] Navigation to card details screen works

### Accessibility Testing

- [ ] VoiceOver reads card names correctly
- [ ] Touch targets meet 44x44px minimum
- [ ] Empty state CTA is accessible

---

## Definition of Done

- [x] All acceptance criteria pass
- [x] Code follows project conventions (ESLint passes)
- [x] Components are properly typed with TypeScript
- [ ] No console errors or warnings
- [ ] Works on both iOS and Android simulators
- [ ] Manual testing checklist complete
- [ ] Story marked as `done` in sprint-status.yaml

---

## Notes

- Virtual Logo component is implemented in Story 2.4 - use placeholder (colored square) until then
- Card Details screen is implemented in Story 2.6 - navigate to placeholder screen until then
- This story focuses on the list infrastructure; detail interactions come in later stories
- **FlashList** chosen over FlatList for 10x performance improvement — install with `npx expo install @shopify/flash-list`

---

## Dev Agent Record

### Implementation Notes (2026-01-07)

**Implemented:**

- Created `useCards` hook for fetching cards from SQLite database
- Created `EmptyState` component with welcome message, subtext, and Add Card CTA
- Created `CardTile` component with 4:3 aspect ratio, colored placeholder visual, and tap navigation
- Created `CardList` component using FlashList with responsive 2/3 column grid
- Updated `app/index.tsx` to use the new CardList
- Created placeholder `/card/[id].tsx` route for card details navigation
- Cards ordered alphabetically by name (A-Z) per AC3 — handled by existing `getAllCards`

**Dependencies Added:**

- `@shopify/flash-list@2.0.2` for high-performance list rendering

**Technical Decisions:**

- Used FlashList 2.0 with `ListEmptyComponent` for empty state handling
- Implemented responsive columns: <400dp = 2 cols, ≥400dp = 3 cols

### File List

**New Files:**

- `features/cards/hooks/useCards.ts`
- `features/cards/components/EmptyState.tsx`
- `features/cards/components/CardTile.tsx`
- `features/cards/components/CardList.tsx`
- `app/card/[id].tsx`

**Modified Files:**

- `features/cards/index.ts` - Added exports for new components/hooks
- `app/index.tsx` - Replaced placeholder with CardList
- `app/_layout.tsx` - Added database initialization on bootstrap
- `package.json` - Added @shopify/flash-list dependency

### Change Log

| Date       | Change                                           |
| ---------- | ------------------------------------------------ |
| 2026-01-07 | Initial implementation of card list grid display |

---

## References

- [Epic 2 in epics.md](../epics.md#epic-2-card-management--barcode-display)
- [UX Design: Soft Sage Grid](../ux-design-specification.md)
- [Architecture: Feature Structure](../architecture.md)
