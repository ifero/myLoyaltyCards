---
baseline_commit: 652f3c61442ab02841180e7bc837556721576165
---

# Story 16.33: `TOUCH_TARGET.min` is 44, below both the design system's minimum and Material's, and off the 8px grid

Status: ready-for-dev

Epic: 16 — Platform & Tech Debt

> **✅ THE DISAGREEMENT IS SETTLED — this story implements a decision, it does not reopen one.**
> Found 2026-08-21 while reproducing the accumulated design-review notes. `TOUCH_TARGET.min`
> is **44**; `docs/design/cardi/cardi-design-system.md` mandates **"every interactive element is
> at least 48 × 48pt"**. The design system won, on two independent grounds recorded in its own
> "Layout & Spacing" section. Read those before proposing 44.

## The two grounds

**1. A minimum binding on two platforms is the max of their minimums.** `app.json` declares
both `ios` and `android`. Apple HIG specifies 44pt; Material specifies 48dp. 44 is legal on iOS
and **under-spec on Android**, which is half the install base. 48 satisfies both.

**2. 44 is off the grid this system mandates.** The design system says _"Strict 8px grid; 4px
only for micro-adjustment."_ 44 is 5.5 × 8. 48 is 6 × 8. The "4px for micro-adjustment" clause
does not rescue it — a **minimum touch target** is not a nudge, it is a floor, and a floor that
sits half a grid unit off the grid is not a floor anyone can build on.

> The same test settled the other half of this disagreement in the opposite direction, and that
> half needs **no code change**: the design system said screen margin 20px, the token said 24,
> and 20 is 2.5 × 8 while 24 is 3 × 8 — so **the design system moved to 24 and
> `LAYOUT.screenHorizontalMargin` stays as it is.** Do not "fix" the margin token in this story.
> It is already correct.

## Scope

`TOUCH_TARGET` is referenced **64 times across 24 non-test files** under `features/`, `shared/`
and `app/`. It is generated, so the edit itself is one line:

- `tokens/spacing.json` → the touch-target token, then `yarn tokens:build` regenerates
  `shared/theme/tokens.generated.ts`. **Do not hand-edit the generated file.**

Every consumer grows by 4pt in one or both axes. That is the actual work: not the token, but the
vertical rhythm downstream of it.

## Acceptance criteria

- **AC1** — `tokens/spacing.json` sets the touch-target minimum to 48; `yarn tokens:build` is run
  and the regenerated `tokens.generated.ts` is committed. `TOUCH_TARGET.watch` (32) is **not**
  changed — watchOS has its own constraints and is out of scope.
- **AC2** — Every list row, button and icon target that derives its height from
  `TOUCH_TARGET.min` still lays out correctly at 48. Rows that were exactly 44 become 48; check
  in particular `ScannerOverlay`'s `manualEntryRow`, `CardTypeSelectionScreen`'s header and
  `backButton`, and the settings rows.
- **AC3** — Any layout that hard-codes 44 alongside the token is found and converted.
  `grep -rn '\b44\b' features shared app` and report what was and was not a touch target.
- **AC4** — `features/cards/utils/gridLayout.ts` is untouched and its tests still pass.
  `TILE_WIDTH` 171 derives from the 16pt **grid margin**, not from the touch target, and is
  frozen with tests; nothing in this story should reach it.
- **AC5** — The full suite passes. Expect snapshot churn wherever a row height is asserted;
  update snapshots rather than loosening assertions.
- **AC6** — Verified on both platforms, with before/after screenshots of one dense list (settings
  or the brand list) so the density change is visible and deliberate rather than discovered
  later.

## What this story does NOT do

- It does not change `LAYOUT.screenHorizontalMargin` (see the note above — 24 is correct).
- It does not touch the remaining genuine margin one-offs: `CardForm`'s 32 and any literal 24s
  written as numbers rather than tokens. Those are the styling sweep, filed separately.
- It does not address `theme.warning`, `#1F1F24` in `shared/theme/luminance.ts`, or the document
  screens' 14px body text against a 15px minimum. Same styling sweep.
