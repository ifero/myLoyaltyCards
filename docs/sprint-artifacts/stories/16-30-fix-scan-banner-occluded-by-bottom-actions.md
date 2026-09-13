---
baseline_commit: 652f3c61442ab02841180e7bc837556721576165
---

# Story 16.30: The image-scan failure banner is painted underneath the scanner's bottom action rows

Status: ready-for-dev

Epic: 16 — Platform & Tech Debt

> **✅ CONFIRMED BY ARITHMETIC AND PAINT ORDER — no device session needed to establish it.**
> Found 2026-08-21 while specifying the capture pattern for the Cardì redesign
> (`docs/design/cardi/stitch-prompts-capture.txt`, finding 11). Verified against
> `origin/main`; the files are identical to main at the baseline above.
>
> **This is not a cosmetic overlap. The banner's two escape routes are the part that gets
> buried,** so a person whose image scan just failed is shown a message whose recovery links are
> underneath an opaque row.

## The defect

`features/add-card/components/ScannerOverlay.tsx` renders, in this order:

1. `{imageError && …}` → `NoCodeFoundBanner` inside `styles.bannerContainer` — `bottom: 96`
   (line 526)
2. `<View style={[styles.bottomActions, …]}>` — `bottom: 0`, `paddingBottom: insets.bottom +
SPACING.md` (line 437, styles at 500–506)

In React Native later siblings paint **on top**, so `bottomActions` is drawn over the banner.

The action stack's height, with the real token values from
`shared/theme/tokens.generated.ts` (`SPACING.md = 16`, `SPACING.xs = 4`,
`TOUCH_TARGET.min = 44`):

| part                                        | height    |
| ------------------------------------------- | --------- |
| `paddingBottom` = `insets.bottom` (34) + 16 | 50        |
| "Scan from image" row (`TOUCH_TARGET.min`)  | 44        |
| divider + `marginVertical: SPACING.xs` × 2  | ≈ 8.3     |
| "Enter card number manually" row            | 44        |
| **total, measured up from the bottom edge** | **≈ 146** |

The banner starts at 96 and is roughly 100pt tall, so it spans **96 → ~196**. The overlap is
**96 → 146**, which is exactly where `NoCodeFoundBanner`'s `actionsRow` sits — the two links
"Try another image" and "Enter it manually" are at the foot of the banner plate.

So the failure message is legible, and **both of its recovery affordances are occluded** by the
"Scan from image" row painted over them. The banner also auto-dismisses after 5 s
(`AUTO_DISMISS_MS`), so the links are unreachable for their whole lifetime.

## Two things that are NOT the defect, so nobody re-litigates them

- **The dark plate showing behind the rows is harmless.** `rgba(0,0,0,0.80)` behind cream text
  on a camera feed reads fine. The bug is the occluded links, not the plate.
- **`accessibilityLiveRegion="polite"` already announces the message**, so this is not an a11y
  regression for screen-reader users — it is a visual/touch defect for everyone else.

## Acceptance criteria

- **AC1** — With `imageError` true, the banner's `actionsRow` is fully visible and tappable: no
  part of `NoCodeFoundBanner` is overlapped by `styles.bottomActions`.
- **AC2** — The fix is layout, not z-order. Raising the banner above the action stack is
  correct; moving `bottomActions` earlier in the tree so the banner paints on top is **not** —
  that leaves the two rows unreachable instead, trading one occlusion for another.
- **AC3** — The offset is derived, not hard-coded to a new magic number. `bottom: 96` was
  already a magic number that happened to be wrong; replace it with a value computed from the
  action stack (or lay the two out as siblings in one bottom-anchored container).
- **AC4** — A test asserts the banner and the action rows do not overlap. If RN Testing Library
  cannot measure layout, assert the structural invariant instead — that the banner and the
  actions share one bottom-anchored parent with the banner ordered above them.
- **AC5** — Verified on a device or simulator with a real image-scan failure, screenshot
  attached. This one is cheap to trigger: pick any photo with no barcode in it.

## Notes for the implementer

The Cardì capture frames already draw the corrected layout —
`docs/design/cardi/frames/cardi-capture-frames.html`, frame E — using `bottom: 171px`, which
clears the ≈146 stack with a 16px gap. That figure is a frame constant, not a recommendation for
the code; compute it in the component.

While in this file, `styles.bottomActions` and `styles.centeredContent` both use
`paddingHorizontal: 24`. That matches `LAYOUT.screenHorizontalMargin` (24) but is written as a
literal — worth replacing with the token, and out of scope for the margin question itself, which
is a design-system decision recorded separately.
