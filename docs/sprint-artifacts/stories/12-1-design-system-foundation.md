# Story 12.1: Design System Foundation

**Epic:** 12 - App-Wide Design Overhaul
**Type:** Design
**Status:** in-review
**Sprint:** 10
**Depends On:** None (foundation for all other stories)
**Figma File:** https://www.figma.com/design/4PSsX8SyTUU0GCUdBAAEED/Test
**Reference Apps:** Klarna wallet, SuperCards

---

## Story

**As a** designer and developer,
**I want** a complete design system defined in Figma with reusable tokens and components,
**So that** all subsequent screen designs are consistent, and developers have clear specs to implement against.

---

## Context & Problems to Solve

The current app has no cohesive design language:

- CTA buttons are washed-out sage green ghost outlines — invisible against white backgrounds
- No visual weight system — primary, secondary, and destructive actions look identical
- Color palette too muted — greens disappear, no contrast
- No dark mode support despite existing toggle infrastructure
- Typography lacks hierarchy — headings and body text feel same-weight
- Brand cards use pastel tiles with letter avatars instead of actual brand colors/logos from the catalogue

**Reference:** Klarna uses a dark premium palette, bold typography, and high-contrast CTAs. SuperCards uses clean minimalism with clear action hierarchy.

---

## Acceptance Criteria

### AC1: Color Palette

```
Given the design system page in Figma
Then it defines a complete color palette for BOTH light and dark modes:
  - Primary brand color (app identity)
  - Surface colors (backgrounds, cards, elevated surfaces)
  - Text colors (primary, secondary, tertiary)
  - Semantic colors (success, warning, error, info)
  - Interactive colors (links, active states)
And all color pairs meet WCAG 2.1 AA contrast ratio (4.5:1 for text, 3:1 for large text/UI)
And dark mode is not just "inverted light" but a purposefully designed dark palette
```

### AC2: Typography Scale

```
Given the design system page in Figma
Then it defines a typography scale with clear hierarchy:
  - Large Title (screen headers)
  - Title (section headers)
  - Headline (card titles, emphasis)
  - Body (default text)
  - Callout (secondary information)
  - Caption (metadata, timestamps)
And font weights are specified (Regular, Medium, Semibold, Bold)
And line heights and letter spacing are defined
And the scale works for both iOS (SF Pro) and watchOS (SF Compact)
```

### AC3: Button System

```
Given the design system page in Figma
Then it defines a button component library:
  - Primary button: filled, high contrast, bold — for main actions (e.g., "Add Card", "Save")
  - Secondary button: outlined or tonal — for alternative actions (e.g., "Scan Barcode", "Cancel")
  - Tertiary button: text-only — for minor actions (e.g., "Help & FAQ")
  - Destructive button: red treatment — for dangerous actions (e.g., "Delete Card")
And each button has states: default, pressed, disabled, loading
And buttons are sized consistently (minimum 44pt touch target per Apple HIG)
And the primary CTA is NEVER invisible or washed out
```

### AC4: Card Component System

```
Given the design system page in Figma
Then it defines card tile components for the home grid:
  - Catalogue card: brand's actual color (from catalogue hex) as background + centered brand SVG logo
  - Custom card: user-selected color + first-letter avatar fallback
  - Both: consistent corner radius, aspect ratio, optional subtle shadow/elevation
And cards are shown at multiple sizes (grid thumbnail, detail hero)
And the component works in both light and dark mode
```

### AC5: Icon Set & Navigation Elements

```
Given the design system page in Figma
Then it defines:
  - App navigation icons: add (+), settings (gear), back arrow, close (X)
  - Action row pattern: icon + label + chevron (Klarna's "Manage" pattern)
  - Status icons: sync indicator, offline badge, error badge
And icons are sized for visibility (minimum 24pt, header icons 28pt+)
And icons have sufficient contrast against their backgrounds
```

### AC6: Form Input Components

```
Given the design system page in Figma
Then it defines form input components:
  - Text field: default, focused, filled, error, disabled states
  - Picker/selector (for barcode format, language, etc.)
  - Toggle switch (for theme, settings booleans)
  - Color picker (for custom card color selection)
And inputs have clear labels, placeholder text styling, and error message placement
```

### AC7: Spacing & Layout Tokens

```
Given the design system page in Figma
Then it defines a spacing scale (e.g., 4/8/12/16/24/32/48pt)
And defines standard screen margins and content padding
And defines grid layout specs (columns, gutter, card aspect ratio)
And defines safe area handling for notch/Dynamic Island
```

---

## Figma Deliverable

**Page name:** `Design System`

**Contents:**

- Color palette swatches (light + dark, side by side)
- Typography scale specimens
- Button component variants (all types x all states x both modes)
- Card tile components (catalogue + custom, light + dark)
- Icon library
- Form input components (all states)
- Spacing/layout reference

---

## Task Checklist

- [x] AC1: Color Palette — Light mode (13 tokens), Dark mode (13 tokens), Brand catalogue (20 colors)
- [x] AC2: Typography Scale — 11 levels from Large Title (34pt) to Caption 2 (11pt), all with line-height + letter-spacing
- [x] AC3: Button System — 4 types (Primary/Secondary/Tertiary/Destructive) × 3 states (Default/Pressed/Disabled)
- [x] AC4: Card Component System — 10 catalogue cards, 5 custom cards, dark surface demo, detail hero
- [x] AC5: Icon Set & Navigation — 8 nav icons with SF Symbol names, Klarna-style action rows, 5 status icons
- [x] AC6: Form Input Components — 5 text field states, toggle ON/OFF, color picker (5-color palette)
- [x] AC7: Spacing & Layout Tokens — 7-step scale (4–48pt), 11 layout specifications
- [ ] **Owner review** — ifero to review Figma file and approve or request changes

---

## Figma Links

- **Design System page:** https://www.figma.com/design/4PSsX8SyTUU0GCUdBAAEED/Test (page: "Design System")
- **Sections in page:**
  - AC1 — Color Palette (Light Mode / Dark Mode / Brand Catalogue Colors)
  - AC2 — Typography Scale
  - AC3 — Button System
  - AC4 — Card Component System
  - AC5 — Icon Set & Navigation Elements
  - AC6 — Form Input Components
  - AC7 — Spacing & Layout Tokens

---

## Creative Team Notes

### Sally (UX Designer — Lead)

**Design philosophy:** The design system serves two emotional modes:

1. **Browsing mode** (home grid) — relaxed, clean neutral surfaces, brand colors as heroes
2. **Action mode** (checkout, barcode) — high urgency, bold primary CTAs, maximum contrast

**Key decisions:**

- Primary color `#1A73E8` chosen for strong contrast on both light and dark surfaces (not the old sage green)
- Dark mode uses true black `#000000` for OLED efficiency + Klarna-like premium feel
- Dark mode primary brightened to `#4DA3FF` to maintain 5.2:1 contrast on dark backgrounds
- Card component keeps brand hex as background — the brand IS the card identity
- Action rows follow Klarna's "Manage" pattern: icon + label + chevron → replaces invisible text links
- Button hierarchy is absolute: Primary (filled blue) > Secondary (outlined) > Tertiary (text) > Destructive (red, positioned last)

### Caravaggio (Visual Design)

**Color theory notes:**

- The 20 brand colors from `italy.json` have natural visual groupings: warm reds (Conad, Coop, Pam, H&M), deep blues (Carrefour, Lidl, IKEA), and neutrals (Sephora, Coin, OVS, Zara are all `#000000`)
- Black-branded cards need a subtle 1pt border on dark surfaces to avoid disappearing
- Esselunga's yellow `#FFCC00` requires dark text (contrast issue with white)
- Douglas's teal `#7BB4AE` is the lightest brand — also needs dark text

**Typography:**

- SF Pro's weight distribution maps well to the 11-level scale
- Large Title at 34pt Bold creates immediate hierarchy — the "you know where you are" moment
- Headline (17pt Semi Bold) vs Body (17pt Regular) — same size, weight creates distinction

### Maya (Design Thinking)

**User empathy lens:**

- Stressed parent at checkout: every token must answer "can I find this in 0.5 seconds?"
- Color-blind users: semantic colors (success/warning/error) should work with icons, not color alone
- The 44pt minimum touch target isn't just HIG compliance — it's "gloved fingers in winter" accessibility
- Toggle states must be distinguishable by shape/position, not just green vs grey

### Carson (Creative Direction)

**Brand identity:**

- The app identity color `#1A73E8` sits between Klarna's confidence and Apple's clarity
- Card grid should feel like a "wallet you're proud of" — brand colors as jewelry on a neutral canvas
- Dark mode should feel premium, not just inverted — true black + elevated surfaces create depth layers

---

## Design Notes

### Brand Color Usage

The catalogue (`catalogue/italy.json`) already contains hex colors for all 20 brands:

- Esselunga: `#FFCC00`, Conad: `#DA291C`, Coop: `#E2231A`, Carrefour: `#00338D`
- Lidl: `#0050AA`, Eurospin: `#7B8D97`, IKEA: `#0058AB`, etc.

SVG logos exist in `assets/images/brands/`. The design system should specify how brand colors and logos compose within the card component.

### Current App Issues to Fix

- Ghost green CTA buttons → Replace with filled high-contrast primary buttons
- Invisible "Edit Card" text link → Replace with icon + label + chevron action row
- "Delete Card" as the loudest element → Proper destructive button treatment, positioned intentionally
- Tiny + and gear icons → Larger, higher-contrast navigation elements
