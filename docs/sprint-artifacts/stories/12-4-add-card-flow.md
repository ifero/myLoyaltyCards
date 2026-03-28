# Story 12.4: Add Card Flow

**Epic:** 12 - App-Wide Design Overhaul
**Type:** Design
**Status:** ready-for-design
**Sprint:** 10
**Depends On:** 12-1 (Design System Foundation)
**Figma File:** https://www.figma.com/design/4PSsX8SyTUU0GCUdBAAEED/Test
**Reference Apps:** Klarna wallet (Choose card, Scan Barcode, Add manually)

---

## Story

**As a** user adding a new loyalty card,
**I want** a smooth flow to either pick from the catalogue, scan a barcode, or enter details manually,
**So that** adding a card is fast, intuitive, and covers all scenarios.

---

## Context & Problems to Solve

**Current state — Catalogue grid:**

- "Add Custom Card" is a ghost green outline button — nearly invisible
- Cards are oversized pastel tiles with letter avatars — no real brand logos
- Grid is functional but feels like a prototype

**Current state — Manual form:**

- "Scan Barcode" ghost button at top — should be the most prominent action
- 5 form fields stacked vertically with excessive spacing
- "Add Card" button is washed-out sage green — looks disabled
- Color picker works but feels disconnected

**Current state — Camera scanner:**

- Full-bleed camera works well
- "Enter Manually" ghost button at bottom — barely visible

**Klarna reference — Choose card (dark modal sheet):**

- Search bar at top
- Sectioned list: "Popular cards" → "General" (Other card, Phone number) → "All cards"
- Real brand logos as rounded squares next to brand names
- Clean X dismiss button
- Separate scanner screen with alternatives below: "Enter card number manually", "Upload image of card"

---

## Acceptance Criteria

### AC1: Entry Point & Card Type Selection

```
Given I tap "+" to add a card
Then a modal/sheet presents the catalogue as a searchable list:
  - Search bar: "Search by name"
  - Section: "Popular cards" with most common brands (real logos + names)
  - Section: "All cards" alphabetical list
  - Option: "Other card" / "Custom card" for manual entry
And the list uses real brand logos from the catalogue
And the sheet can be dismissed with X or swipe
```

### AC2: Catalogue Brand Selection

```
Given I select a brand from the catalogue
Then I'm taken to the barcode input step:
  - Primary action: camera scanner (default, auto-opens or prominent CTA)
  - Secondary action: "Enter card number manually"
And the brand name/logo is shown in the header for context
And the barcode format is pre-selected from catalogue defaults
```

### AC3: Camera Scanner

```
Given I am on the barcode scanner
Then the camera view is displayed with a clear scanning viewfinder
And the header shows the card/brand context (e.g., "Other card — Scan Barcode")
And below the camera, alternative actions are shown as icon + label + chevron rows:
  - "Enter card number manually"
  - Optionally: "Upload image of card" (future consideration)
And the scanner auto-detects the barcode format
```

### AC4: Manual Entry Form

```
Given I choose to enter a card manually
Then the form is minimal and focused:
  - Card number (required) — clear label + subtitle: "Enter the card number printed on your card"
  - Store name (for custom cards only — pre-filled if catalogue brand selected)
  - Barcode format (auto-detected or picker if needed)
  - Card color (for custom cards — color picker)
And the primary "Add" button is bold, filled, and clearly actionable
And the form does NOT show unnecessary fields (reduce from current 5-field layout)
```

### AC5: Success State

```
Given I successfully add a card
Then I see brief confirmation feedback
And I'm returned to the home screen with the new card visible in the grid
```

---

## Figma Deliverable

**Page name:** `Add Card Flow`

**Frames (light + dark for each):**

1. Catalogue picker (modal sheet with search + brand list)
2. Catalogue picker — search active with results
3. Camera scanner with brand context header
4. Camera scanner — barcode detected state
5. Manual entry form (catalogue brand — minimal fields)
6. Manual entry form (custom card — full fields with color picker)
7. Success/confirmation state

---

## Design Notes

- The catalogue picker should feel like Klarna's "Choose card" — a dark/elevated modal sheet with brand logos
- Scanner should be camera-first — most users will scan rather than type
- Manual form should be simpler than current (2-3 fields, not 5)
- Consider: should catalogue selection → scanner be a single flow or two separate steps?
- Brand pre-selection eliminates the need for name/format fields in most cases
