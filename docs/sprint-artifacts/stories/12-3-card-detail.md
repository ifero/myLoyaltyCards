# Story 12.3: Card Detail Screen

**Epic:** 12 - App-Wide Design Overhaul
**Type:** Design
**Status:** done
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

### AC1: Brand Hero Section ✅

```
Given I open a catalogue card's detail
Then the top of the screen shows a brand-colored header with the brand logo
And the brand name is displayed prominently below the header
And for custom cards, the user-selected color is used with first-letter avatar
```

**Design:** Frames "Catalogue Card Detail" (Conad red hero + logo) and "Custom Card Detail" (teal + letter avatar G). Light + Dark.

### AC2: Barcode Display ✅

```
Given I am viewing a card detail
Then the barcode is rendered large and clear on a white/light background
And the barcode number is displayed below in a readable, spaced format
And there is a "Tap to enlarge" hint or the barcode area is tappable for fullscreen
And the barcode area has sufficient padding and contrast for scanner readability
```

**Design:** White card with barcode at max width, spaced number below, "Tap to enlarge" hint. Fullscreen overlay with max brightness hint. Barcode stays on white even in dark mode for scanner readability.

### AC3: Card Info Section ✅

```
Given I am viewing a card detail
Then card metadata is displayed in clean rows:
  - Barcode number (with copy-to-clipboard action)
  - Barcode format
  - Color
  - Date added
And the info section is visually secondary to the barcode
```

**Design:** Separate card below barcode with label/value rows, copy icon (⧉) on barcode number row. Visually secondary with smaller type and muted labels.

### AC4: Manage Actions ✅

```
Given I am viewing a card detail
Then management actions are grouped in a "Manage" section below:
  - Edit card: icon + label + chevron → navigates to edit
  - Delete card: destructive styling, positioned LAST, visually de-emphasized compared to edit
And actions use the icon + label + chevron row pattern from the design system
And "Edit" is clearly the primary management action (not "Delete")
And there is intentional visual separation between non-destructive and destructive actions
```

**Design:** "MANAGE" section header, Edit card row (✎ icon + label + chevron), separator line, Delete card row (🗑 + red text, no chevron — quiet destructive). Edit is primary, Delete is de-emphasized.

### AC5: Navigation ✅

```
Given I am viewing a card detail
Then the header shows a back arrow (left) and card name (center)
And optionally an info (i) icon on the right
And navigation is consistent with the app-wide pattern
```

**Design:** Brand-colored nav header with back arrow (‹) left, card name centered. Consistent with Home Screen header pattern. Condensed on scroll.

---

## Figma Deliverable

**Page name:** `Card Detail`

**Frames (light + dark for each):**

1. ✅ Catalogue card detail (Conad — red branded) — Light + Dark
2. ✅ Custom card detail (Gym Pass — teal, letter avatar) — Light + Dark
3. ✅ Barcode enlarged/fullscreen state — Light + Dark
4. ✅ Scrolled state showing Manage section — Light + Dark

---

## Design Notes

- The barcode is the HERO of this screen — it's the whole reason the app exists
- At checkout, users need: open app → tap card → show barcode. Speed matters.
- Klarna's brand header approach makes the card feel premium and instantly recognizable
- Delete should require confirmation (implementation detail, but design the confirmation dialog too)

## Design Decisions (Review Feedback)

- **White background** for light mode screens (not grey)
- **Barcode centered** within its container for visual balance
- **Format row removed** — implementation detail, not user-relevant
- **Color row** shown only for custom cards (catalogue cards already show brand color in hero)
- **Font Awesome 6 Free** used for all icons (fa-arrow-left, fa-pen, fa-trash, fa-copy, fa-chevron-right, fa-xmark, fa-sun)
- **Screen brightness maximized** hint shown on detail screen (not just fullscreen) since barcode is visible
- **Padding bottom** added to info section after last row
