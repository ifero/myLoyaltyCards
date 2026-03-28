# Story 12.2: Home Screen (Card List)

**Epic:** 12 - App-Wide Design Overhaul
**Type:** Design
**Status:** ready-for-design
**Sprint:** 10
**Depends On:** 12-1 (Design System Foundation)
**Figma File:** https://www.figma.com/design/4PSsX8SyTUU0GCUdBAAEED/Test
**Reference Apps:** Klarna wallet (Loyalty Cards grid), SuperCards

---

## Story

**As a** user opening the app,
**I want** to see my loyalty cards in a visually appealing, scannable grid with real brand identities,
**So that** I can quickly find and tap the card I need at checkout.

---

## Context & Problems to Solve

**Current state:**

- Card tiles are small pastel squares with 2-letter abbreviations (e.g., "CO" for Conad) — no brand recognition
- The + (add) and gear (settings) icons are tiny and nearly invisible
- With one card, the screen feels empty and broken — no empty state design
- No search functionality on the home screen
- Cards don't use the brand colors/logos already available in the catalogue data

**Klarna reference:**

- Large card tiles in a 2-column grid with real brand logos on brand-colored backgrounds
- Search bar at the top: "Search loyalty cards"
- Card count + sort dropdown: "31 loyalty cards" / "Frequently used"
- Clear + icon in header for adding cards
- Tab bar at bottom for navigation

---

## Acceptance Criteria

### AC1: Card Grid Layout

```
Given I am on the home screen
Then cards are displayed in a 2-column grid
And each card tile shows the brand logo (from catalogue SVG) centered on the brand color background
And custom cards (no catalogue match) show first-letter avatar on user-selected color
And card tiles have the card name below them
And the grid is scrollable with smooth performance
And the layout works in both light and dark mode
```

### AC2: Header & Navigation

```
Given I am on the home screen
Then the header shows the app name centered
And a clearly visible "+" add button on the left (or right, per convention)
And a clearly visible settings icon on the opposite side
And both icons are minimum 28pt and high-contrast
```

### AC3: Search Bar

```
Given I have multiple cards
Then a search bar is visible below the header: "Search loyalty cards"
And the search bar follows the design system input styling
And the design shows both empty and active search states
```

### AC4: Empty State

```
Given I have no cards saved
Then the home screen shows a friendly empty state:
  - Illustration or icon
  - Message like "No cards yet"
  - Clear CTA button to add first card
And the empty state feels intentional, not broken
```

### AC5: Single Card State

```
Given I have only one card
Then the card tile is appropriately sized (not a tiny thumbnail lost in white space)
And the layout still feels balanced and intentional
```

### AC6: Sort/Filter Indicator

```
Given I have multiple cards
Then there is a card count visible (e.g., "5 loyalty cards")
And optionally a sort control (e.g., "Frequently used", "Recently added", "A-Z")
```

---

## Figma Deliverable

**Page name:** `Home Screen`

**Frames (light + dark for each):**

1. Empty state (0 cards)
2. Single card state (1 card)
3. Multiple cards state (6+ cards, scrollable)
4. Search active state
5. Header detail (icon sizing, spacing)

---

## Design Notes

- Card tiles should be generous in size — Klarna's cards are roughly 45% screen width each
- The grid should feel like a wallet, not a spreadsheet
- Brand recognition is the #1 priority — users scan by color/logo at checkout speed
- Consider: should tapping a card go directly to barcode (speed) or to detail screen?
