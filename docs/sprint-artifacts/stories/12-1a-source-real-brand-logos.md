# Story 12.1a: Source Real Brand Logos

**Epic:** 12 - App-Wide Design Overhaul
**Type:** Design (follow-up)
**Status:** backlog
**Sprint:** 10
**Depends On:** 12-1 (Design System Foundation)
**Parent:** 12-1

---

## Story

**As a** designer,
**I want** real brand logos (official SVGs or high-quality vectors) for all 20 Italian catalogue brands,
**So that** the card tiles in the app show the actual recognizable brand identity, not approximations.

---

## Context

Story 12.1 delivered the design system with placeholder/approximated SVG logos in `assets/images/brands/`. These are vector shapes that loosely suggest the brand identity but are NOT the real logos. The real logos are essential for:

- Instant brand recognition at checkout (sub-0.5s visual scan)
- Professional app appearance
- User trust ("this looks like the real Esselunga card")

## Current State

All 20 SVGs in `assets/images/brands/` are approximations:

- Some have recognizable graphic elements (Carrefour arrows, Despar tree shape, Sephora flame)
- Most are stylized text or decorative shapes that don't match the real brand
- None are sourced from official brand guidelines

## Acceptance Criteria

```
Given each of the 20 brands in catalogue/italy.json
Then the SVG in assets/images/brands/{brand}.svg is the REAL brand logo
And the logo is:
  - Sourced from official brand guidelines, press kits, or high-quality vector sources
  - Properly vectorized (clean SVG paths, not rasterized)
  - On transparent background
  - Sized to 200×200px canvas, centered
  - In the correct color variant for display on the brand's background color:
    - White logos for dark brand backgrounds
    - Dark logos for light backgrounds (Esselunga yellow, Douglas teal)
And the Figma Design System page AC4 cards are updated with the real logos
```

## Brand List

| #   | Brand      | File           | BG Color         | Logo Color Needed |
| --- | ---------- | -------------- | ---------------- | ----------------- |
| 1   | Esselunga  | esselunga.svg  | #FFCC00 (yellow) | Dark              |
| 2   | Conad      | conad.svg      | #DA291C (red)    | White             |
| 3   | Coop       | coop.svg       | #E2231A (red)    | White             |
| 4   | Carrefour  | carrefour.svg  | #00338D (blue)   | White             |
| 5   | Lidl       | lidl.svg       | #0050AA (blue)   | White             |
| 6   | Eurospin   | eurospin.svg   | #005596 (blue)   | White             |
| 7   | Pam        | pam.svg        | #E30613 (red)    | White             |
| 8   | Despar     | despar.svg     | #007A33 (green)  | White             |
| 9   | Unieuro    | unieuro.svg    | #2D8BF0 (blue)   | White             |
| 10  | MediaWorld | mediaworld.svg | #DF0000 (red)    | White             |
| 11  | IKEA       | ikea.svg       | #0051BA (blue)   | Yellow/White      |
| 12  | Decathlon  | decathlon.svg  | #0082C3 (blue)   | White             |
| 13  | Bennet     | bennet.svg     | #E3000F (red)    | White             |
| 14  | Tigotà     | tigota.svg     | #005596 (blue)   | White             |
| 15  | Sephora    | sephora.svg    | #000000 (black)  | White             |
| 16  | Douglas    | douglas.svg    | #7BB4AE (teal)   | Dark              |
| 17  | Coin       | coin.svg       | #000000 (black)  | White             |
| 18  | OVS        | ovs.svg        | #000000 (black)  | White             |
| 19  | H&M        | hm.svg         | #CD1125 (red)    | White             |
| 20  | Zara       | zara.svg       | #000000 (black)  | White             |

## Suggested Sources

- Brand press kits / media pages
- Worldvectorlogo, Brandsoftheworld, or similar vector logo databases
- Wikipedia SVG logos (often high quality, CC licensed)
- Manual trace from high-res brand assets if needed

## Notes

- This is a manual sourcing task — not automatable
- Some brands may require contacting for official assets
- Ensure license compatibility for app usage (most loyalty card apps display brand logos under fair use for card identification)
