---
baseline_commit: 2de61e7016dfab9c1e91a4b5964714224f38daf2
retroactive: true
completed_in: 'several, across `docs/cardi-redesign-carry-over`'
---

# Story 20.1: The Cardì design system — one written source for colour, type and refusals

Status: done

Epic: 20 — Cardì Identity & Design System

> **📌 WRITTEN RETROACTIVELY (2026-09-01).** This work was completed across August 2026 and is
> committed; the epic was only written up afterwards. The story is a **record**, not a brief —
> its acceptance criteria describe what was delivered and are checkable against the repo today.

## What was delivered

`docs/design/cardi/cardi-design-system.md` — the system every later story is measured against,
plus `README.md` (the handover: thesis, order of work, open questions) and
`palette-bench.html` (the comparison board the palette was actually judged on).

## The thesis, which outranks the palette

**The content is the colour.** The home grid already carries ~45 third-party brand colours that
arrive with the data (`CardTile.tsx`: `backgroundColor = brand ? brand.color : CARD_COLORS[...]`).
Our chrome stays quiet so the brands can be loud. The consequence people get wrong: **playfulness
is a layout decision** — tile size, logo scale, grid rhythm — and never a palette one.

An earlier draft design system contradicted this and banned the two-column grid. That grid is the
shipped, correct layout. A confident, well-written spec that contradicts the product is the
failure mode this section exists to prevent.

## Acceptance criteria

- [x] **Ink & Beam is defined**: ink `#181824` (structure, light-mode actions), beam `#FCCC0C`
      (signature, dark-mode actions — a deliberate inversion), cream `#F0F0E8` (light ground),
      white cards. Dark mode is true black with ink cards and cream text.
- [x] **Typography is fixed**: Space Grotesk headlines, Inter body, JetBrains Mono card numbers.
- [x] **The five logo-bar accents are data only** — virtual-logo tiles for cards with no official
      brand — and never chrome.
- [x] **A Forbidden section exists** and carries the reason for each entry: bottom tab bars ·
      floating action buttons · coral, salmon, terracotta or orange · drop shadows · gradients ·
      glassmorphism · card accent colours used as chrome · anything overlaying a barcode ·
      a saturated surround on the barcode screen · tinting or recolouring a branded tile ·
      replacing the home grid with single-column rows · a large yellow chrome surface near the
      grid · an accent that rises to the right.
- [x] **The beam rule is written in both directions**: the ì carries the beam as the brand's
      promise; the real beam comes from the scanner at the till and is the shop's, not ours. So
      nothing is drawn over a barcode, and the barcode surround stays neutral — at maximum
      brightness a saturated field is glare beside the scan target.
- [x] **Coral `#FF6B6B` is banned by name.** It was in an interim system as "the action driver";
      it is the terracotta that was rejected, and it is Monzo's Hot Coral family on a _card_ app.
- [x] **The 8px grid adjudication is recorded**: screen margin moved 20 → 24 (3 × 8) and the
      touch-target minimum is 48 (6 × 8), not 44, which is 5.5 × 8 and under-spec on Android.

## Traps recorded here so they are not re-hit

- **Material's tonal engine turns `#FCCC0C` into brown** (`#735c00` / `#cfa700`) unless
  explicitly forbidden, and a generated theme's `primary` resolves to `#000000` regardless of
  what is asked for. This is why every Stitch prompt carries literal hexes and an explicit
  anti-token rule.
- **Esselunga is `#FFCC00`** — three points from beam `#FCCC0C`. Any large yellow chrome surface
  near the grid makes the most-used card disappear into the furniture.
