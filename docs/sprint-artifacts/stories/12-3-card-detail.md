# Story 12.3: Card Detail Screen

**Epic:** 12 - App-Wide Design Overhaul
**Type:** Design
**Status:** ready-for-design
**Sprint:** 10
**Depends On:** 12-1 (Design System Foundation)
**Figma File:** https://www.figma.com/design/4PSsX8SyTUU0GCUdBAAEED/Test
**Reference Apps:** Klarna wallet (Conad card detail)

---

## Story

**As a** user at checkout,
**I want** to see my card's barcode large and clear with brand identity,
**So that** the cashier can scan it quickly and I can manage the card easily.

---

## Context & Problems to Solve

**Current state:**

- Centered square avatar with letter abbreviation — no brand presence
- Barcode is adequate but not maximized
- "Edit Card" is nearly invisible green text — no button affordance
- "Delete Card" in red is the loudest element — destructive action dominates
- Info table (Number, Format, Color, Added) is clean but could be more compact
- No clear visual hierarchy between "view barcode" (primary task) and "manage card" (secondary)

**Klarna reference:**

- Brand-colored header strip with brand logo at top — the card IS the brand
- Large barcode area on white background with number below
- "Related Offers" section (not applicable for us but shows content richness)
- "Manage" section with icon + label + chevron rows: Edit card, Photos, Notes, Delete
- Clear separation between barcode area (hero) and management actions (below)

---

## Acceptance Criteria

### AC1: Brand Hero Section

```
Given I open a catalogue card's detail
Then the top of the screen shows a brand-colored header with the brand logo
And the brand name is displayed prominently below the header
And for custom cards, the user-selected color is used with first-letter avatar
```

### AC2: Barcode Display

```
Given I am viewing a card detail
Then the barcode is rendered large and clear on a white/light background
And the barcode number is displayed below in a readable, spaced format
And there is a "Tap to enlarge" hint or the barcode area is tappable for fullscreen
And the barcode area has sufficient padding and contrast for scanner readability
```

### AC3: Card Info Section

```
Given I am viewing a card detail
Then card metadata is displayed in clean rows:
  - Barcode number (with copy-to-clipboard action)
  - Barcode format
  - Color
  - Date added
And the info section is visually secondary to the barcode
```

### AC4: Manage Actions

```
Given I am viewing a card detail
Then management actions are grouped in a "Manage" section below:
  - Edit card: icon + label + chevron → navigates to edit
  - Delete card: destructive styling, positioned LAST, visually de-emphasized compared to edit
And actions use the icon + label + chevron row pattern from the design system
And "Edit" is clearly the primary management action (not "Delete")
And there is intentional visual separation between non-destructive and destructive actions
```

### AC5: Navigation

```
Given I am viewing a card detail
Then the header shows a back arrow (left) and card name (center)
And optionally an info (i) icon on the right
And navigation is consistent with the app-wide pattern
```

---

## Figma Deliverable

**Page name:** `Card Detail`

**Frames (light + dark for each):**

1. Catalogue card detail (e.g., Conad — red branded)
2. Custom card detail (user-picked color, letter avatar)
3. Barcode enlarged/fullscreen state
4. Scrolled state showing Manage section

---

## Design Notes

- The barcode is the HERO of this screen — it's the whole reason the app exists
- At checkout, users need: open app → tap card → show barcode. Speed matters.
- Klarna's brand header approach makes the card feel premium and instantly recognizable
- Delete should require confirmation (implementation detail, but design the confirmation dialog too)
