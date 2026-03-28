# Story 12.2: Home Screen (Card List)

**Epic:** 12 - App-Wide Design Overhaul
**Type:** Design
**Status:** done
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

## Task Checklist

- [x] AC1: Card Grid Layout — 2-column grid, 171x140pt Klarna-style tiles, brand color backgrounds, logo placeholders, card names below, light + dark
- [x] AC2: Header & Navigation — Centered app title (17pt Bold), + add button (left, 28pt, 44pt touch target), settings gear (right, 26pt, 44pt touch target), #1A73E8 light / #4DA3FF dark
- [x] AC3: Search Bar — "Search loyalty cards" placeholder, 40pt height, 12pt radius, #EFEFF1 light / #2C2C2E dark bg, active state with blue border + cursor + clear X button (no Cancel text)
- [x] AC4: Empty State — Playful wallet illustration (dashed outline + sparkles), "No cards yet" title, encouraging subtitle, primary CTA "Add Your First Card" with glow shadow, light + dark
- [x] AC5: Single Card State — Larger centered card (220x180pt, 20pt radius), encouraging tip "Tap + to add more cards", balanced layout, light + dark
- [x] AC6: Sort/Filter Indicator — Card count ("8 loyalty cards"), sort dropdown ("Frequently used") in primary blue, light + dark
- [x] All Figma frames delivered (5 states x 2 modes = 10 frames)
- [x] **Owner review** — approved by ifero (2026-03-28)

---

## Figma Links

- **Home Screen page:** https://www.figma.com/design/4PSsX8SyTUU0GCUdBAAEED/Test (page: "Home Screen")
- **Frames delivered:**
  - Light: Multiple Cards, Empty State, Single Card, Search Active, Header Detail
  - Dark: Multiple Cards, Empty State, Single Card, Search Active, Header Detail

---

## Creative Team Notes

### Sally (UX Designer — Lead)

**Design decisions:**

- Klarna-style rectangular tiles (171x140pt, ~1.2:1 ratio) — wider than tall for "wallet card" feel
- Single card state uses enlarged tile (220x180pt) centered to feel intentional, not lonely
- Empty state uses playful illustration + encouraging copy to make first impression warm
- Search bar hidden in empty/single card states (not useful with 0-1 cards)
- Header icons use 44pt touch targets (Apple HIG) with 28pt icon size for visibility

**Key UX calls:**

- Sort/filter only shown when 2+ cards — no cognitive overhead for new users
- "Tap + to add more cards" tip in single-card state guides without nagging
- Search filters in real-time (shown via "Ess" → 1 result in search active frame)

### Caravaggio (Visual Design)

**Visual architecture:**

- 16pt grid margins and gutters throughout — consistent with design system spacing scale
- Card tiles have subtle drop shadows (0,2 blur 8 @ 8% opacity) for "physical card" depth
- Dark mode uses true black #000000 for OLED efficiency + premium Klarna feel
- **Card border rule (established in 12.1, confirmed in 12.2):** Any card whose background color is identical or near-identical to the surface color gets a 1pt border to prevent vanishing. Dark mode: #40404A border on black-branded cards (Sephora, Zara, Coin, OVS — all #000000). Light mode: #E0E0E0 border if any future brand is white/near-white. This rule applies during implementation.
- CTA button has colored glow shadow matching its fill — draws the eye on empty state

### Maya (Design Thinking)

**Empathy-driven choices:**

- Empty state: not sad/broken — warm, inviting, "the app is happy to meet you"
- Single card: encouraging, not condescending — subtle tip, not a modal
- Multiple cards: scannable by color at checkout speed — brand colors are heroes
- Search: immediate filtering shown (not just placeholder) — proves it works

### Carson (Brainstorming)

**Creative direction:**

- "Premium wallet" metaphor carried through: neutral canvas, brand colors as jewelry
- Empty state sparkle dots add whimsy without being childish
- Dark mode elevated surfaces (#1C1C1E) create depth layers — not flat, not loud
- Tab bar with 3 items: Cards (primary), Offers (future), More (settings/about)

---

## Design Notes

- Card tiles should be generous in size — Klarna's cards are roughly 45% screen width each
- The grid should feel like a wallet, not a spreadsheet
- Brand recognition is the #1 priority — users scan by color/logo at checkout speed
- Consider: should tapping a card go directly to barcode (speed) or to detail screen?
