---
baseline_commit: 011dadfb378e749b85a598dce6f705b04ac799bd
---

# Story 16.27: Fix Apple Watch barcode geometry — uniform module width, spec quiet zones, adaptive rotation

Status: ready-for-dev

Epic: 16 — Platform & Tech Debt

> **The margins are not the bottleneck — the _quantisation_ is.** ifero asked to "reduce the margins to
> use as much space as possible". Outer padding is **already 0** (`WatchPresentationLayout.swift:57-58`)
> and inner is 2 (`:59`), so the reclaim available there is ~2.5 % of width. The actual defect is that
> **`BarcodeGenerator` renders 1-module bars at two different pixel widths.**
>
> **✅ MECHANISM ESTABLISHED — but from source, not hardware.** `renderCGImage`
> (`targets/watch/BarcodeGenerator.swift:313-364`) disables antialiasing (`:335`) and snaps every module
> boundary with `Int(round(acc))` (`:342`, `:349-350`). The module width is not an integer, so 1-module
> elements land on **2 px or 3 px** (small watches) / **3 px or 4 px** (large) — a **1.33×–1.50× spread**
> on the narrow element. Squeezed further by `quietZoneModules: 10` per side (`:74`), which is measured
> in **modules** and therefore eats a fixed **17.4 %** of the symbol's width.
>
> ⚠️ **THE px/module TABLE IS DERIVED FROM SOURCE, NOT MEASURED ON A WATCH** — unlike Story 16.22's and
> 16.23's numbers. It also assumes `geometry.size.width` ≈ full screen width, which the safe area and
> the nav bar make **optimistic**. **Treat the table as a lower bound and re-measure on device as
> implementation task 1.**
>
> **⚠️ DO NOT GATE ON THE 80 % PRINT SPEC.** An earlier draft of AC2 said "refuse to draw below 80 %
> magnification". That is **wrong and was removed**: at ≈12.8 px/mm an integer snap yields 3 px = 71 %
> or 4 px = 95 %, and hitting 80 % needs 460 px — which **no watch has on its short axis**. That AC
> would have **blanked the barcode on most of the line-up**. ISO 15420's floor is a **print** spec for
> ink on paper read by laser at distance; an emissive screen read at 10 cm is a different regime.
> **Uniformity and contrast are the levers. Size is not.**
>
> **✅ THE QR PATH ALREADY IMPLEMENTS THE FIX.** `renderQRCodeImage` computes
> `floor(min(widthPx / extent, heightPx / extent))` and centres the result (`:392-395`, `:425-431`).
> **Copy that pattern.** This is a consistency fix with a working in-repo precedent, not a new design.
>
> **Native change → NOT OTA-eligible.** Shares `BarcodeGenerator.swift` with **16.28** and
> `BarcodeFlashView.swift` with **16.26**. **Land this one first** — 16.28's new encoders must be written
> against the corrected renderer.

## Story

As a user presenting my Apple Watch to a checkout scanner,
I want the barcode drawn with bars of consistent width and as large as the display allows,
so that the scanner decodes it instead of rejecting a symbol whose narrow bars vary by up to 50 %.

## Context

### Derived geometry (lower bound — re-measure on device)

Computed at `boxInnerPadding: 2` and `@2x`, EAN-13 = 95 modules + 2×10 quiet = **115 units**:

| Watch | Width  | Content px | px/module | Narrow bar renders as        |
| ----- | ------ | ---------- | --------- | ---------------------------- |
| 40 mm | 162 pt | 316        | 2.75      | 2 px **or** 3 px — **1.50×** |
| 41 mm | 176 pt | 344        | 2.99      | 2 px or 3 px                 |
| 44 mm | 184 pt | 360        | 3.13      | 3 px or 4 px — 1.33×         |
| 45 mm | 198 pt | 388        | 3.37      | 3 px or 4 px                 |
| 46 mm | 208 pt | 408        | 3.55      | 3 px or 4 px                 |

### What Story 16.23 does and does not license

16.23 established that the narrow element is _"the measurement every digit's classification normalises
against"_, and pinned **Apple Vision** failing at ≈2.83 px/module.

- ✅ **The mechanism transfers.** Integer snapping produces genuinely unequal _physical_ bar widths, and
  every 1D decoder normalises against the narrow element.
- ❌ **The number does not.** A supermarket lane runs Datalogic / Zebra firmware reading an **analog
  reflectance waveform**, not pixels, and is far more tolerant than Vision. **Do not cite 2.83 as a
  threshold for checkout scanners.**

### Magnification reality

Apple Watch is ≈326 ppi ≈ **12.8 px/mm** (cross-checked: 41 mm is 352 × 430 px over a 904 mm² display →
12.9). So 1 px ≈ 0.078 mm against EAN-13's nominal 0.33 mm module. **The symbol is below print-spec
magnification on every watch and that cannot be fixed** — see the banner. Optimise uniformity.

## Acceptance Criteria

- **AC1 — The module width is an integer number of device pixels.** Compute
  `module = floor(availablePx / totalUnits)`, render every element as an exact multiple of it, and centre
  the remainder in the quiet zone. Bar-width variance becomes **zero by construction**, not by tuning.
  **Follow `renderQRCodeImage` (`:392-395`, `:425-431`)** — it already does exactly this.
- **AC2 — Maximise the integer module; never refuse to draw.** Choose the largest integer module the
  space affords and **record the magnification achieved**. Do **not** gate on the 80 % print floor.
- **AC3 — Rotate 90° only when the long axis yields a strictly larger integer module.** Horizontal is
  the default; rotation is the fallback geometry forces, per ifero's decision 2026-08-02 ("rotate only
  when it's needed"). The predicate is a **computed consequence of AC1**, never a hardcoded device list,
  and it must be **stable** — key it off a non-oscillating input or apply hysteresis. A fractional
  wobble in `geometry.size` flipping orientation mid-view is worse than either orientation.
- **AC4 — Quiet zones follow the symbology.** EAN-13 needs 11 modules leading + 7 trailing (18), not the
  current symmetric 20; Code128 needs 10 each side. Today `quietZoneModules: 10` is one literal for every
  format (`:74`).
- **AC5 — Unit counts are computed per symbol.** A 13-digit Code128 is ≈123 modules vs EAN-13's 95 —
  ≈24 % wider, crossing the rotation threshold on more devices. Nothing may assume EAN-13's geometry.
- **AC6 — Take the margin reclaim, including the toolbar.** Drop `boxInnerPadding` 2 → 0, **and hide the
  navigation bar on this screen**: `BarcodeFlashView.swift:102` sets `.navigationTitle(titleText)` and the
  `GeometryReader` does not ignore the safe area, so the title bar consumes exactly the long-axis height
  AC3 depends on. Cheapest space win in the story, and the most literal answer to the original request.
- **AC7 — The generated image and its frame agree exactly.** `updateBarcodeTargetSize` rounds **down**
  (`:146-149`) while `.frame()` at `:40` uses the **unrounded** `layout.barcodeSize`. SwiftUI then rescales
  by a fraction of a pixel and `.interpolation(.none)` resolves it by **duplicating a pixel column —
  reintroducing the exact ±1 px jitter this story removes.** Assert the parity; do not assume it.
- **AC8 — A layout contract test covers the geometry** across the full device table, extending
  `targets/watch/__tests__/watch-layout-contract.test.ts`. Assert: integer module width, per-symbology
  quiet zone, the rotation predicate **and its stability**, and AC7's frame/image parity. `widthFillRatio`
  (`WatchPresentationLayout.swift:85`) already exists so fill is measured, not eyeballed — extend it.
- **AC9 — Boundaries are defined, not discovered in the field.** An oversized payload (a 20-char
  alphanumeric Code128 is ≈250 modules, illegible at any orientation) gets a **defined** behaviour rather
  than an unreadable smear. A short payload (EAN-8 = 67 modules) **grows** its module to use the space.
  The hardcoded `barcodeTargetSize` default of `156 × 88` (`:13`) no longer causes a wrong-sized first
  render — with rotation added that becomes a **visible orientation flip on appear**.
- **AC10 — Validated against a real scanner, not a screenshot.** Physical watch, real lane, one rotated
  and one non-rotated device; record which sizes were covered. **The rotation assumption under test:**
  flatbed lanes (Datalogic Magellan, Zebra MP7000) are omnidirectional and do not care, but a
  **single-line handheld laser does**. If the field contradicts AC3, **the predicate is what changes.**
- **AC11 — The QR path is untouched.** QR keeps its square-fit branch and 112 pt floor
  (`WatchPresentationLayout.swift:66-71`) and the phone-pre-rendered `barcodeImageBase64` fast path
  (`BarcodeFlashView.swift:118-124`). It is 2D and does not share this failure mode.

## Tasks / Subtasks

- [ ] **Task 1 — Measure on device first** (AC: 1, 2)
  - [ ] Log actual `geometry.size` inside the `GeometryReader` on a real watch; compare to the table
  - [ ] Record the true available px on at least the smallest and largest watch available
- [ ] **Task 2 — Integer-snap the renderer** (AC: 1, 2, 4, 5)
  - [ ] Per-symbology unit counts + quiet zones; remove the `quietZoneModules: 10` literal
  - [ ] `module = floor(availablePx / totalUnits)`, centre the remainder — mirror `renderQRCodeImage`
  - [ ] Bump `cacheVersion` from `watch-barcode-v2` (`:27`) so no device serves a stale image
- [ ] **Task 3 — Reclaim space** (AC: 6)
  - [ ] `boxInnerPadding` 2 → 0; hide the nav bar on this screen
- [ ] **Task 4 — Adaptive rotation** (AC: 3, 9)
  - [ ] Predicate derived from AC1; prove stability (hysteresis or non-oscillating input)
  - [ ] Fix the `156 × 88` default so the first render is not wrong-sized/wrong-oriented
- [ ] **Task 5 — Close the seam** (AC: 7)
  - [ ] Make `.frame()` and the generated image agree exactly; assert it
- [ ] **Task 6 — Contract test** (AC: 8)
  - [ ] Extend `watch-layout-contract.test.ts` across the device table
- [ ] **Task 7 — Real-scanner validation** (AC: 10, 11)

## Dev Notes

### Files to touch — current state and what must survive

**`targets/watch/BarcodeGenerator.swift`**

- Current: `generateImage` (`:39`) switches on format, encodes to module widths (`encodeEAN13` `:95`,
  `encodeCode128` `:164`), renders via `renderCGImage` (`:313`) with `quietZoneModules: 10`, caches into
  an `NSCache` keyed on `cacheVersion|value|format|WxH` (`:45`).
- Changes: the renderer's module maths and the quiet-zone parameterisation.
- **Must survive:** the `NSCache` budget (`:29-35`, 64 items / 4 MB), off-main-thread rendering
  (`:72-77`), `Task.isCancelled` checks (`:80`, `:128`), and the QR branch untouched (AC11).

**`targets/watch/WatchPresentationLayout.swift`**

- Current: `WatchBarcodeLayoutMetrics.make` (`:49-89`) computes padding, barcode size, `widthFillRatio`.
- **Must survive:** `WatchCardRowLayoutMetrics.compact` (`:25-34`) — the card-row metrics are parsed by
  `watch-layout-contract.test.ts` via **regex**; changing that declaration's formatting breaks the test.

**`targets/watch/BarcodeFlashView.swift`**

- Changes: nav-bar visibility (AC6), frame/image parity (AC7), the `156 × 88` default (AC9).
- **Must survive:** the Story 9.6 `recordCardUsed` call (`:110`), tap-dismiss (`:43`), crown dismissal
  (`:93-100`), and the QR `barcodeImageBase64` fast path (`:118-124`).

### Guardrails

- ⚠️ **The watch contract tests regex-parse Swift source; they do not run it.** If you change the layout
  maths you must **mirror it in TypeScript** in `watch-layout-contract.test.ts`. A refactor that changes
  the shape of a Swift declaration can break the regex even when the behaviour is correct.
- **Bump `cacheVersion`.** The cache key includes target size but **not** the renderer version, so
  without a bump a device serves a stale pre-fix image.
- Watch is **read-only for card data** (ADR-2026-06-09-001). No new sync messages.
- Native → **not OTA-eligible**.

### Testing

- **CI-enforced:** the TS contract tests in `targets/watch/__tests__/`. `yarn test` runs them and works
  inside a `.claude` worktree after `yarn install` (`jest.config.js` anchors its `.claude` ignores to
  `<rootDir>`).
- **Swift XCTests under `watch-ios/Tests/` do not auto-run in CI.** Add to
  `BarcodeGeneratorTests.swift` if useful locally, but **the CI gate is the TS test**.
- Compile: `yarn watch:build` — needs the **main checkout** (`ios/` is gitignored).
- **AC10 is the only test that can prove the story.** Everything else proves the maths.

### Previous story intelligence

- **16.23** — the source of the mechanism. Read its ROOT CAUSE section for how bar-width spread was
  measured and A/B-proven. Note the retraction discipline there: an early theory (Android downscale cap)
  was **reversed** by evidence and retired. Apply the same standard to the table in this story.
- **16.22** — the closest structural analogue: a **frozen derivation** (`TILE_WIDTH = 171`) that stopped
  being a function of the viewport. Same bug family; its fix (a pure helper + a layout contract test
  sweeping a width range) is the pattern to copy.
- **9.5 / 9.6** — established the `BarcodeFlashView` lifecycle blocks this story edits.

### Git intelligence

`0d79e28` added a CI `prettier --check` gate — `docs/**` and `targets/**` are both subject to it, so run
`yarn format:check` before pushing. `feb846e` stopped the watchOS CI job building the phone app and
cut it to `-target watch -sdk watchsimulator`; a red watchOS job is **often a timeout**, so check the
duration before assuming a compile break.

### Library versions

No new dependency. Pure CoreGraphics + SwiftUI, already linked.

### Project structure notes

`targets/watch/` is generated into the gitignored `ios/` by `@bacons/apple-targets` at prebuild — never
edit `ios/`. `deploymentTarget: '10.0'` means watchOS 10, so **40 mm is the smallest supported size**.

### Out of scope — flag, don't fix

- **Story 10.4 (Wear OS)** plans to port `WatchBarcodeLayoutMetrics.make` — it should inherit the
  **fixed** maths, not today's. Flag when this lands.
- Real symbologies for EAN-8 / UPC-A / Code39 → **Story 16.28** (shares this file; land this first).
- Display luminance → **Story 16.26** (shares `BarcodeFlashView.swift`; different region).

### Open questions for ifero

None blocking. **If AC10 shows a single-line handheld laser cannot read the rotated symbol**, bring the
result back — AC3's predicate is the thing that changes, and that is a product call, not a dev one.

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

### Change Log
