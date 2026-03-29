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
Then a full-screen navigation push presents the catalogue as a searchable list:
  - Search bar: "Search by name"
  - Section: "Popular cards" with most common brands (real logos + names)
  - Section: "All cards" alphabetical list
  - Option: "Other card" / "Custom card" for manual entry
And the list uses real brand logos from the catalogue
And I can navigate back with the back arrow
```

### AC2: Catalogue Brand Selection

```
Given I select a brand from the catalogue
Then I'm taken to the barcode input step:
  - Primary action: camera scanner (default, auto-opens or prominent CTA)
  - Secondary action: "Enter card number manually"
And the brand name/logo is shown in the header for context
And the barcode format is auto-detected (never shown to user)
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

### AC4: Card Setup (post-scan)

```
Given a barcode has been scanned (or number entered manually)
Then the card is auto-added and I see a setup screen:
  - Card number (pre-filled from scan, editable)
  - Store name (for custom cards only — required)
  - Card color (for custom cards — color picker with preview)
  - NO barcode format field (auto-detected, user doesn't know/care)
And a "Done" button confirms and returns to home
And for custom cards, the scanner is the primary entry method (not manual typing)
```

### AC5: Confirmation (Toast on Home)

```
Given I successfully add a card and tap "Done"
Then I'm returned to the home screen with the new card visible in the grid
And a toast notification shows "✓ [Brand] card added" at the bottom
And the newly added card is subtly highlighted (green border, fades)
And there is NO dedicated success screen — the home IS the success
```

---

## Figma Deliverable

**Page name:** `Add Card Flow`

**Frames (light + dark for each):**

1. Card Type Selection (full-screen push, search + brand list)
2. Card Type Selection — search active with filtered results
3. Camera Scanner with brand context header
4. Card Setup — catalogue brand (number pre-filled, no barcode format)
5. Card Setup — custom card (store name, scan icon CTA, card number, color picker, no barcode format)
6. Home Screen with toast notification ("Card added")

---

## Task Checklist

- [x] AC1: Entry Point & Card Type Selection — Full-screen push (not modal), back arrow, search bar, "Popular cards" (5 brands), "Other card", "All cards" alphabetical
- [x] AC2: Catalogue Brand Selection — Brand → scanner auto-opens; brand-colored header; barcode format auto-detected (never shown to user)
- [x] AC3: Camera Scanner — Full-bleed camera, white viewfinder corners, brand header ("Conad"), bottom sheet "Enter card number manually". Works for BOTH catalogue and custom cards
- [x] AC4: Card Setup — Catalogue: card number pre-filled from scan, no barcode format. Custom: store name + scan icon CTA (barcode viewfinder button) + card number field + color picker, no barcode format. Scanner accessible via icon CTA inline with card number field
- [x] AC5: Confirmation — Home screen with toast "✓ Conad card added", newly added card highlighted with green border. No dedicated success screen
- [ ] **Owner review** — awaiting ifero review of Figma page

---

## Figma Links

- **Add Card Flow page:** https://www.figma.com/design/4PSsX8SyTUU0GCUdBAAEED/Test (page: "Add Card Flow")
- **Frames in page:**
  - Frame 1 — Card Type Selection (Light + Dark)
  - Frame 2 — Search Active (Light + Dark)
  - Frame 3 — Camera Scanner (Light + Dark)
  - Frame 4 — Card Setup Catalogue (Light + Dark)
  - Frame 5 — Card Setup Custom (Light + Dark)
  - Frame 6 — Home with Toast (Light + Dark)

---

## Creative Team Notes

### Sally (UX Designer — Lead)

**Flow architecture decision:** Catalogue → Scanner (camera-first) → Auto-add → Card Setup (pre-filled) → Home + toast. Scanner is primary for ALL paths including custom cards. Manual entry is a fallback, never the default.

**Key decisions (revised after ifero review):**

- Card type selection is a full-screen push (NOT a modal sheet) — consistent navigation throughout the flow
- Scanner is the primary entry for both catalogue AND custom cards
- Card is auto-added on barcode detection — setup screen shows pre-filled number
- Barcode format is NEVER shown to the user — auto-detected silently
- No dedicated success screen — home + toast is the confirmation
- Catalogue brand setup: just card number (pre-filled, editable)
- Custom card setup: store name + scan icon CTA (inline barcode button) + card number + color picker
- No "Card added" badge on setup screen — pre-filled number proves scan worked; toast on Home is the only confirmation
- Scanner uses floating back button + brand pill over full-bleed camera — no full nav header bar

### Caravaggio (Visual Design)

**Visual consistency notes:**

- All frames use 393x852 (iPhone 14/15 Pro) consistent with 12-2 and 12-3
- White backgrounds in light mode (per 12-3 review feedback)
- True black (#000000) in dark mode with #1C1C1E elevated surfaces
- Primary buttons: filled #1A73E8 (light) / #4DA3FF (dark), 52pt height, 14pt corner radius
- Input fields: #F5F5F5 (light) / #2C2C2E (dark), 52pt height, 12pt corner radius
- Scanner: full-bleed camera, floating back button (dark circle + arrow), brand pill (brand-colored rounded pill)
- Scanner viewfinder: white corners with blue scan line — immersive, minimal chrome
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

**Flow metaphor:** Opening your wallet. The card type selection is a full screen you navigate into. The scanner is immersive — full camera with brand context. Home + toast is the confirmation — no ceremony, just done.

---

## Design Decisions (Review Feedback)

- **Full-screen navigation**, not modal sheet — the entire add-card flow uses consistent push navigation with back arrows
- **Barcode format hidden** — users don't know their barcode format; it's auto-detected from scan or catalogue defaults
- **Auto-add on scan** — card is created immediately when barcode is detected; setup screen lets user verify/edit
- **Scanner-first for custom cards too** — "Other card" → scanner, not a form. Manual entry is a fallback in the bottom sheet
- **No success screen** — home + toast ("✓ Conad card added") replaces the dedicated success screen. The home screen IS the success
- **Card number pre-filled** — both catalogue and custom setup screens show the scanned number, editable if needed
- **No "Card added" badge** on setup screen — pre-filled number is sufficient proof of scan success; toast on Home is the single confirmation moment
- **Immersive scanner** — floating back button + brand pill over full-bleed camera replaces the full brand-colored nav header bar
- **Scan icon CTA** on custom card setup — compact barcode viewfinder button inline with card number field, not a large primary button
- Font Awesome 6 Free icons used throughout (consistent with 12-3)
