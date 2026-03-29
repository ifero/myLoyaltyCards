# Story 12.4: Add Card Flow

**Epic:** 12 - App-Wide Design Overhaul
**Type:** Design
**Status:** in-review
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

## Task Checklist

- [x] AC1: Entry Point & Card Type Selection — Catalogue picker modal with X dismiss, search bar, "Popular cards" (5 brands with logos), "Other card" option, "All cards" alphabetical list
- [x] AC2: Catalogue Brand Selection — Selecting a brand goes straight to camera scanner; brand header shows name + context; barcode format pre-selected
- [x] AC3: Camera Scanner — Full-bleed camera with white viewfinder corners, brand-colored header ("Conad — Scan Barcode"), bottom sheet with "Enter card number manually" action row
- [x] AC4: Manual Entry Form — Catalogue brand form: 2 fields (card number + format read-only). Custom card form: 4 fields (store name, card number, format picker, color picker with preview)
- [x] AC5: Success State — Green checkmark, "Card Added!" text, card summary (brand color + name + number), "Go to Home" primary CTA + "Add another card" secondary link
- [ ] **Owner review** — awaiting ifero review of Figma page

---

## Figma Links

- **Add Card Flow page:** https://www.figma.com/design/4PSsX8SyTUU0GCUdBAAEED/Test (page: "Add Card Flow")
- **Frames in page:**
  - Frame 1 — Catalogue Picker (Light + Dark)
  - Frame 2 — Catalogue Picker Search Active (Light + Dark)
  - Frame 3 — Camera Scanner (Light + Dark)
  - Frame 4 — Scanner Barcode Detected (Light + Dark)
  - Frame 5 — Manual Entry Catalogue Brand (Light + Dark)
  - Frame 6 — Manual Entry Custom Card (Light + Dark)
  - Frame 7 — Success State (Light + Dark)

---

## Creative Team Notes

### Sally (UX Designer — Lead)

**Flow architecture decision:** Catalogue → Scanner (camera-first) → Success. The scanner is the default action because most users will scan rather than type. Manual entry is always available as a secondary path via bottom sheet action row.

**Key decisions:**

- Catalogue picker is a modal sheet with X dismiss (matches Klarna pattern)
- Search bar at top for express-lane users who know their brand
- "Popular cards" section with top 5 Italian brands (Esselunga, Conad, Coop, Carrefour, Lidl)
- "Other card" option clearly positioned between Popular and All sections
- Brand-colored header on scanner maintains context throughout flow
- Catalogue brand form reduced from 5 fields to 2 (card number + auto-detected format)
- Custom card form has 4 fields (store name, card number, format picker, color picker)

### Caravaggio (Visual Design)

**Visual consistency notes:**

- All frames use 393x852 (iPhone 14/15 Pro) consistent with 12-2 and 12-3
- White backgrounds in light mode (per 12-3 review feedback)
- True black (#000000) in dark mode with #1C1C1E elevated surfaces
- Primary buttons: filled #1A73E8 (light) / #4DA3FF (dark), 52pt height, 14pt corner radius
- Input fields: #F5F5F5 (light) / #2C2C2E (dark), 52pt height, 12pt corner radius
- Scanner viewfinder: white corners (scanning) → green corners (detected)
- Brand circles: 40pt diameter with first-letter avatar, consistent with catalogue picker rows

### Maya (Design Thinking)

**User empathy lens:**

- Fast path (scan): 3 interactions — Plus → Brand → Auto-scan → Done
- Manual path (type): 4 interactions — Plus → Brand → Enter manually → Type → Done
- Custom path: 4 interactions — Plus → Other card → Fill form → Done
- Search bar is the express lane for users who know their brand name
- Scanner "bottom sheet" with manual alternative respects users without a physical barcode
- Color picker uses 8 preset colors (from catalogue) with selection ring indicator

### Carson (Creative Direction)

**Flow metaphor:** Opening a wallet drawer. The catalogue picker rises from below like a physical drawer revealing all your card options. The scanner is immersive — full camera with brand context. Success is celebratory but brief — the green checkmark says "done!" without blocking.

---

## Design Notes

- The catalogue picker feels like Klarna's "Choose card" — elevated modal sheet with brand logos as colored circles
- Scanner is camera-first — most users will scan rather than type
- Manual form is simpler than current: 2 fields for catalogue brands (down from 5), 4 fields for custom cards
- Catalogue selection → scanner is a single flow: pick brand, camera opens immediately
- Brand pre-selection eliminates the need for name/format fields in catalogue brand path
- Font Awesome 6 Free icons used throughout (consistent with 12-3)
