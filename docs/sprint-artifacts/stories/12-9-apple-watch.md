# Story 12.9: Apple Watch Screens

**Epic:** 12 - App-Wide Design Overhaul
**Type:** Design
**Status:** review
**Sprint:** 10
**Depends On:** 12-1 (Design System Foundation)
**Figma File:** https://www.figma.com/design/4PSsX8SyTUU0GCUdBAAEED/Test

---

## Story

**As an** Apple Watch user,
**I want** to see my loyalty cards in a clear, glanceable format optimized for the small screen,
**So that** I can show my barcode at checkout without pulling out my phone.

---

## Context & Problems to Solve

**Current state:**

- watchOS app exists (Epic 5) with card list and barcode display
- Uses "Carbon UI" design (implemented in Stories 5-3, 5-4)
- Visual quality unknown — needs to align with the new app-wide design language
- Watch screen is tiny — every pixel matters for readability

**Watch-specific constraints:**

- Screen sizes: 41mm, 45mm, 49mm (Ultra)
- Limited interaction: crown scroll, tap — no swipe gestures for navigation
- Glanceability: user is at checkout, arm raised, needs barcode FAST
- Typography: SF Compact (not SF Pro)

---

## Acceptance Criteria

### AC1: Card List

```
Given I open the watch app
Then I see my cards in a scrollable vertical list
And each row shows: brand logo (small) + card name
And for catalogue brands, the row uses the brand color as accent
And the list is sorted by frequency/recency (matching phone app sort)
And the list is readable at a glance (no squinting)
```

### AC2: Card Barcode Display

```
Given I tap a card
Then the barcode is displayed maximized on the watch screen
And the barcode number is shown below in readable text
And the brand name/logo is shown at the top for context
And the screen brightness is maximized for scanner readability
And the design uses maximum available screen width for the barcode
```

### AC3: Brand Identity on Watch

```
Given a card is from the catalogue
Then the brand color and/or logo are used to identify the card
And the visual treatment is consistent with the phone app but adapted for watch constraints
And custom cards use the same fallback (user color + letter) as the phone app
```

### AC4: Complication Preview

```
Given the user has a watch complication configured
Then the complication design is shown:
  - Small: app icon or most-used card icon
  - Medium: most-used card with name
And the complication follows watchOS design guidelines
```

---

## Figma Deliverable

**Page name:** `Apple Watch`

**Frames:**

1. Card list (41mm + 45mm sizes)
2. Card barcode display — catalogue brand (41mm + 45mm)
3. Card barcode display — custom card (41mm + 45mm)
4. Complication variants (small, medium)

---

## Design Notes

- Speed is everything on watch — open app → tap card → barcode visible, ideally under 2 seconds
- Barcode must fill maximum width — watch screens are small, scanners need size
- Consider: should the watch app open directly to the most-used card instead of the list?
- Brand colors on watch need extra contrast consideration — outdoor visibility at arm's length
- watchOS uses SF Compact font — specify this in watch-specific typography
