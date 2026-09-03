---
baseline_commit: 2de61e7016dfab9c1e91a4b5964714224f38daf2
retroactive: true
completed_in: '`2ee50a4`, `b0880e9`, `6b59f20`, `1b0d11e`'
---

# Story 20.3: The mark — 35°, grave, contained; the icon crosses high

Status: done

Epic: 20 — Cardì Identity & Design System

> **📌 WRITTEN RETROACTIVELY (2026-09-01).** This work was completed across August 2026 and is
> committed; the epic was only written up afterwards. The story is a **record**, not a brief —
> its acceptance criteria describe what was delivered and are checkable against the repo today.

## What was delivered

The Cardì mark: the Italian **ì**, drawn as a barcode stem and a beam-yellow accent, and nothing
else. Explored across `cardi-mark-candidates`, `cardi-brand-lockup`, `cardi-mark-sweep35`,
`cardi-grave-vs-acute`, `cardi-mark-locked`, `cardi-icon-decision` and `cardi-icon-explore`.

## The decisions

**Wordmark: 35°, grave, contained** (`length 24, weight 9, round caps`). Contained means the
accent stays inside the ì's own advance so it never collides with the `d`.

**Icon: the beam crosses the bars high** — variant C of six. Chosen because the Android 13 themed
layer redraws the icon in one wallpaper-derived colour: a floating tick becomes a speck, while a
crossing beam survives as a _shape_. Crossing high rather than through the middle keeps the mark
reading as _a letter with an accent_ rather than _a barcode being scanned_.

## Acceptance criteria

- [x] The mark is exactly two elements, a stem and an accent. No card, no wallet, no shield.
- [x] The accent is a **grave** — it descends left to right. Its height is measured, not
      eyeballed: **0.7007em**, matching the `d` ascender (0.700em) and Space Grotesk's own `ì`
      (0.700em).
- [x] The wordmark's accent is contained: it spans x 2.59–27.41 within a 30-unit advance.
- [x] The icon variant is chosen against the sizes it ships at — 84, 60, 48, 30, 16, the themed
      layer, and the Android safe circle — not in isolation.
- [x] The baseline anchoring is emitted **inline on the `<svg>`**, derived as
      `(100 − BASELINE) / 100 = 0.30em`.

## The three bugs, recorded

**1. Every accent was an acute.** All 50 drawn accents used a _negative_ SVG rotation. SVG's
y-axis points down, so a negative rotation lifts the right end — that is an **acute**, and every
sheet spelled `Cardí`, a different word. `cardi-design-system.md` said "grave" the entire time;
only the drawings disagreed. Prose naming the accent did not prevent it, so the rule now carries
its mechanical form: `rotate(35)` ✓ / `rotate(-35)` ✗.

**2. Flipping the sign is not enough for a sheared stroke.** Negating the shear offset moves the
inset to the opposite corners, turning an inset parallelogram into an outset one: at 24 × 9 units
and 35° the beam silently grew from 24 to **30.3**, breaking containment. The grave must be the
acute **mirrored**, not re-sheared.

**3. The ì floated 0.30em above the baseline — twice.** First from a guessed
`translateY(size * 0.28)`, then because a new sheet reused the glyph markup without copying the
`.wglyph` CSS rule. An `<svg>` missing its `vertical-align` does not look broken in review; it
looks like an `<svg>`. Hence inline, always.
