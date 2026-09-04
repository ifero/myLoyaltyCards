---
baseline_commit: 115709db1516be13e449145bcc6ac9ac139e5c97
---

# Story 16.27: Fix Apple Watch barcode geometry — uniform module width, spec quiet zones, adaptive rotation

Status: review

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

- [x] **Task 1 — Measure on device first** (AC: 1, 2)
  - [x] Log actual `geometry.size` inside the `GeometryReader` on a real watch; compare to the table
  - [x] Record the true available px on at least the smallest and largest watch available
- [x] **Task 2 — Integer-snap the renderer** (AC: 1, 2, 4, 5)
  - [x] Per-symbology unit counts + quiet zones; remove the `quietZoneModules: 10` literal
  - [x] `module = floor(availablePx / totalUnits)`, centre the remainder — mirror `renderQRCodeImage`
  - [x] Bump `cacheVersion` from `watch-barcode-v2` (`:27`) so no device serves a stale image
- [x] **Task 3 — Reclaim space** (AC: 6)
  - [x] `boxInnerPadding` 2 → 0; ~~hide the nav bar on this screen~~ — **superseded 2026-09-04 by
        ifero: the nav bar and card name STAY.** The space came from
        `.ignoresSafeArea(edges: [.horizontal, .bottom])` instead, which reclaims more than this
        sub-task asked for. See the reopened-AC6 section in the Dev Agent Record.
- [x] **Task 4 — Adaptive rotation** (AC: 3, 9)
  - [x] Predicate derived from AC1; prove stability (hysteresis or non-oscillating input)
  - [x] Fix the `156 × 88` default so the first render is not wrong-sized/wrong-oriented
- [x] **Task 5 — Close the seam** (AC: 7)
  - [x] Make `.frame()` and the generated image agree exactly; assert it
- [x] **Task 6 — Contract test** (AC: 8)
  - [x] Extend `watch-layout-contract.test.ts` across the device table
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

- **16.23** — the source of the mechanism, and **now shipped** (PR #187), so its story file carries
  completion notes and a landed fix, not just analysis. Read its ROOT CAUSE section for how bar-width
  spread was measured and A/B-proven. Note the retraction discipline there: an early theory (Android downscale cap)
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

claude-opus-5 (Claude Code, `bmad-dev-story`)

### Debug Log References

`BarcodeFlashView.swift` gained a **DEBUG-only** `Logger(category: "BarcodeGeometry")` that records
what was planned and what was drawn. It is the instrument Task 1 asked for and it stays in the tree so
the geometry can be re-measured on real hardware without adding code:

```bash
xcrun simctl spawn booted log config --mode "level:debug" \
  --subsystem com.iferoporefi.myloyaltycards.watch
xcrun simctl spawn booted log show --last 30s --debug --info \
  --predicate 'category == "BarcodeGeometry"' --style compact
```

A `container=` line is one **planned** layout; a `drawn=` line is an image that actually reached the
screen. Exactly one `drawn=` per presentation is the invariant — two means a superseded geometry was
rendered and the symbol flipped.

### Completion Notes List

#### Measured, not derived (Task 1 — the story asked for this first, and it changed three decisions)

The device table is now sourced from Xcode's own simulator profiles
(`…/Profiles/DeviceTypes/Apple Watch *.simdevicetype/Contents/Resources/profile.plist`), which report
`mainScreenWidth`/`Height` in pixels, `mainScreenScale` = 2 and **`mainScreenWidthDPI` = 326 for all
seven watchOS 10 sizes**. That confirms the story's amended 12.83 px/mm and retires the original 9.5.

The container measurements moved twice as the safe-area decision changed; the **shipped** figures are
the last column, taken with `.ignoresSafeArea(edges: [.horizontal, .bottom])`.

| Case  | Screen px | Screen pt | Inside the safe area | **Shipped**     |
| ----- | --------- | --------- | -------------------- | --------------- |
| 40 mm | 324 × 394 | 162 × 197 | 158 × 130.5          | **162 × 149.5** |
| 41 mm | 352 × 430 | 176 × 215 | not measured         | not measured    |
| 42 mm | 374 × 446 | 187 × 223 | not measured         | not measured    |
| 44 mm | 368 × 448 | 184 × 224 | not measured         | not measured    |
| 45 mm | 396 × 484 | 198 × 242 | not measured         | not measured    |
| 46 mm | 416 × 496 | 208 × 248 | 204 × 150            | **208 × 186**   |
| 49 mm | 410 × 502 | 205 × 251 | not measured         | not measured    |

Measured by running the built watch app on booted watchOS 26.4 simulators and reading the
`BarcodeGeometry` log. **⚠️ Simulators, not physical hardware** — layout geometry is the same engine, but
this does not discharge AC10, which is about a scanner.

**The story's warning was right, and understated.** It flagged that assuming `geometry.size` ≈ the full
screen made the px/module table optimistic. Inside the safe area the loss was **4 pt of width and
66.5–98 pt of height** — a third of the display. Reclaiming the horizontal and bottom edges recovers the
width entirely and most of the height; what remains is the top strip holding the navigation bar and the
system clock, and that is kept deliberately (see the reopened-AC6 section above).

Achieved module widths, from the log: **40 mm → 3 px (0.234 mm)**, **46 mm → 4 px (0.312 mm)**, both
horizontal. That is the AC2 magnification record. Both are far below ISO 15420's 80 % print floor, which
is exactly why AC2 forbids gating on it.

#### AC6's second half — measured, escalated, and then settled by ifero

**⚠️ SUPERSEDED — read the reopened-AC6 section above.** The measurement below stands and is why the
question was escalated, but the conclusion it originally drew ("deliberately not implemented") no longer
describes what shipped: ifero settled it directly, the navigation bar and card name stay, and Task 3 is
complete. The finding that survives is the mechanism — the bar lives outside the destination's safe
area — which is exactly why the top strip is the one edge worth keeping.

AC6 says to hide the navigation bar because "the title bar consumes exactly the long-axis height AC3
depends on". **It does not.** Built and run both ways on a 40 mm simulator:

| Build                                         | Container reported | Title/chevron |
| --------------------------------------------- | ------------------ | ------------- |
| with `.toolbar(.hidden, for: .navigationBar)` | 158 × 130.5 pt     | absent        |
| without it                                    | **158 × 130.5 pt** | present       |

Identical. watchOS draws the navigation bar **outside** the destination's safe area — in the black band
above the white card, not over it — so hiding it reclaims nothing, while costing the back chevron and the
card's name on screen. It is therefore **deliberately not implemented**, with the measurement recorded in
a comment at the call site and asserted (negatively) in the contract test.

AC6's first half — `boxInnerPadding` 2 → 0 — **is** implemented and does pay: 4 pt of the width the
module divides.

#### The rotation predicate fires, and two bugs were found proving it

`WatchBarcodeModulePlan.resolve` rotates iff the long axis yields a **strictly larger integer module**,
with ties keeping the incumbent. Running it over the device table shows it is a genuine computed
consequence (40 mm EAN-13 at full screen: 2 px horizontal vs 3 px rotated → rotate; 45 mm: 3 vs 4 →
rotate), not a stub that always answers horizontal — the contract test fails if rotation never fires.

Two defects surfaced only because the app was actually run:

1. **The symbol flipped on appear.** `GeometryReader` reports the full screen first and the settled
   container ~60 ms later, and the two resolve differently (46 mm: rotated at 4 px/module, then
   horizontal at 3). The first image was being drawn and then replaced. Fixed with a 120 ms settle at
   the top of the render task — `.task(id:)` cancels on every target change, so a superseded geometry
   now never reaches the renderer. Verified: exactly one `drawn=` line per presentation on both sizes.
   This is the same class of defect AC9 names for the `156 × 88` default (also fixed, now `.zero`).
2. **The hysteresis latched on a transient.** The incumbent was `barcodeOrientation` — the last geometry
   _planned_ — so the full-screen first pass pinned `rotated`, and the settled 40 mm geometry (a tie at
   2 px/module) kept it rather than defaulting to horizontal. The latch now tracks `renderedOrientation`,
   the orientation actually **drawn**, which is what AC3 means by "already on screen". After the fix the
   40 mm settles horizontal, as ifero's "rotate only when it's needed" requires.

#### What the contract test does now (AC8)

`watch-layout-contract.test.ts` no longer only regex-reads the Swift — it **lifts the geometry solver out
of `WatchPresentationLayout.swift` and runs it** under `xcrun --sdk macosx swift`, the same technique
Story 16.28 introduced for the encoders (the story's guardrail saying these tests "do not run it" is now
out of date). The solver was written as pure `Int`/`Double` specifically so it could be lifted; the
`swiftDeclaration` / `runSwiftProgram` plumbing moved to a shared `swift-source-helpers.ts` rather than
being copied.

Asserted across 7 screen sizes × 5 inset models × 14 unit counts: the module is a whole number and the
largest that fits; the symbol is exactly `module × units`; the leftover is under one unit row; the frame
equals the pixel size over the scale, exactly; the image fits its container; rotation only where the long
axis wins; **a tie never flips an incumbent, and resolution is a fixed point**; a 1/20 pt wobble over two
whole points changes the answer at most once and never back; a shorter symbol gets a wider module; and
`module == 0` (no uniform symbol at any orientation) is the _only_ refusal.

#### Found in passing — Code 128's STOP pattern was truncated (raised here, FIXED elsewhere)

While checking unit counts against BWIPP I found that `encodeCode128`'s `widthsTable` has `"233111"` at
index 106 (STOP). The published pattern is `"2331112"` — **the terminating 2-module bar is missing**, so
every Code 128 symbol the watch draws is 2 modules short and ends on a space. Confirmed three ways:
BWIPP's own source vendored at `node_modules/@bwip-js/react-native/barcode.ps` ends its `encs` table
`(211232) (2331112)`; `bwipjs.raw({ bcid: 'code128', text: '5901234123457' })` returns 67 elements /
123 modules ending `2,3,3,1,1,1,2`; the shipped Swift, executed, returns 121. The table also has 110
entries where Code 128 has 107 code words — indices 107–109 are unreachable duplicates that hid the
off-by-one.

This is a **separate, independent cause** of "checkout scanners don't recognise the watch barcode", it is
an encoder-table defect rather than geometry, and Code 128 is the default fallback format — so it was
raised as its own Epic 16 story rather than smuggled into this one. It was never caught because
`REFERENCE_SYMBOLS` in the symbology contract covered EAN-8, UPC-A and Code 39 but **not** Code 128.

**It has since been fixed and merged as Story 16.37 (PR #222)**, while this story was in review, so the
defect is closed and this section is a record of where it came from rather than an outstanding item. Two
consequences for this change: main's Code 128 reference vectors now sit alongside the harness refactor
here (they merged cleanly), and 16.37 shipped its own `cacheVersion` bump to `watch-barcode-v4` — so this
story's bump had to become **v5** on rebase, since two stories landing the same version would each have
let the other's stale images through.

#### Also noted, not fixed

- **QR's 112 pt floor has ~2.5 pt of headroom on a 40 mm.** The measured container is 130.5 pt and the
  floor plus the value label needs 128. AC11 protects the floor, so it stands, but a slightly deeper safe
  area would clip a QR. The contract test documents the boundary rather than asserting a fit that the
  floor deliberately breaks.
- `renderPlaceholderImage` (`BarcodeGenerator.swift`) is dead code — defined, never called.
- Story 10.4 (Wear OS) plans to port `WatchBarcodeLayoutMetrics.make`; it should inherit this maths.

#### ⚠️ AC6 AND THE MODULE RULE WERE BOTH REOPENED BY IFERO — read this before the sections below

The sections that follow were written against an earlier, narrower implementation. Two rounds of review
from ifero changed the design materially, and the numbers here supersede any that contradict them.

**Round 1 — "we should use the whole space horizontally and vertically, with a very very small
padding. why aren't we doing this?"** Fair, and I had stopped short. The `GeometryReader` was sitting
wholly inside the safe area, so it was handed 158 × 130.5 pt of a 162 × 197 pt watch — **a third of the
display black and unused, 40 % on a 46 mm.** Reclaiming it was not cosmetic: the module steps in whole
pixels, so the extra length is what buys a step.

Reclaiming **all** of it turned out to be wrong for a reason only measurement found: with the top edge
also ignored, the **system clock renders white glyphs straight through the black bars** in the top-right
(cropped and confirmed on a 46 mm). watchOS offers no API to suppress it. Clearing it needs about 33 pt
against the 6–11.5 pt of slack the module step has, so there is no arrangement that buys both — a wider
module bought by corrupting the symbol is not a wider module. Shipped: `.ignoresSafeArea(edges:
[.horizontal, .bottom])`, which takes every edge the system does not draw into and keeps the one it does.

**Round 2 — "nah, you need to leave the navigation and the card name too, otherwise it's a mess."**
Settled AC6's nav-bar half: the bar and title **stay**. This also removes the tension above, since the
strip that holds the bar is the same strip that keeps the clock off the symbol. Task 3 is ticked: both
halves of the reclaim landed, in the form ifero directed.

**Round 3 — "can't it get wide? scanners don't care if the lower part of the barcode is clipped by the
rounded corner. let's make it wide."** This one found a genuine design error of mine, and it is the
single biggest change in the story.

The module was dividing the screen by the symbol **plus its quiet zone** — 113 units for an EAN-13. A
quiet zone is white space, and pricing it the same as a bar makes the margins compete with the bars for
pixels. Dividing by the **95 units that are actually bars and spaces**, and letting the leftover become
the quiet zone, changes everything:

| Watch | Module before  | Module after               | Symbol width before | after             |
| ----- | -------------- | -------------------------- | ------------------- | ----------------- |
| 40 mm | 2 px, 0.156 mm | **3 px, 0.234 mm** (+50 %) | 226 px of 324       | **285 px of 324** |
| 46 mm | 3 px, 0.234 mm | **4 px, 0.312 mm** (+33 %) | 339 px of 416       | **380 px of 416** |

Measured on device, not derived. A welcome consequence: with a wider module available on the short
axis, **both watches now resolve to horizontal** — rotation is no longer forced on any tested size,
which is exactly ifero's "rotate only when it's needed".

**The cost, stated plainly.** The quiet zone is no longer the GS1 figure. The module arithmetic now
guarantees only `minimumQuietZoneUnitsPerSide = 4` per side, and the realised margin is whatever the
bars leave — 7.7 X / 5.3 X on a 40 mm, 5.0 X / 4.0 X on a 46 mm — against GS1's 11 X leading / 7 X trailing for
EAN-13. That is a deliberate trade: those figures cannot be met at the next module up on any watch, a
wider narrow element is the lever every 1D decoder normalises against, and a quiet zone only has to be
_clear_. The floor exists so an exact fit can never put a bar against the black bezel, which a decoder
would read as another bar. **If a real scanner disagrees, that constant is the single number to raise** —
it gives the quiet zone back monotonically. This is now the most important thing for AC10 to test.

#### ⚠️ AC4 is no longer literally satisfied — say so plainly

AC4 reads "EAN-13 needs 11 modules leading + 7 trailing (18)". The **values** are implemented and
untouched: `quietZone(for:)` still returns 11/7 for EAN-13, 7/7 for EAN-8, 9/9 for UPC-A and 10/10 for
Code 39 and Code 128, all from GS1 / ISO/IEC. What changed is what reaches the screen. Since Round 3 the
geometry guarantees only a flat **4 modules per side** and then distributes the leftover in the
symbology's ratio, so the realised margin is 7.7 X / 5.3 X on a 40 mm and 5.0 X / 4.0 X on a 46 mm — under the
spec figures on both.

So AC4's letter is not met, by design, and this is called out here for the same reason AC6's deviation
is: a reader should not have to infer it. The spec ratio still governs how the available margin is
_split_, which is the part that survives — swapping 11 and 7 fails a contract test.

#### Why the quiet-zone floor is 4, and what it costs

A QA pass fairly objected that every other constant in this change is sourced — 326 dpi from Xcode's
simulator profiles, the quiet zones from GS1/ISO, the 80 % floor from ISO 15420 — while this one had no
derivation at all. It now does. Measured over the supported line-up with EAN-13 on the **width axis**,
which is the axis that decides because the kept top strip shortens the rotated one below it:

| Floor | Watches at 4 px/module | Tightest realised margin |
| ----- | ---------------------- | ------------------------ |
| 2 X   | 45, 46, 49 mm          | **2.0 X** (45 mm)        |
| 3 X   | 46, 49 mm              | 3.0 X (49 mm)            |
| 4 X   | 46 mm                  | 4.0 X (46 mm)            |

The trade is exactly one-for-one, and the third column is not a coincidence: on whichever watch sits
closest to a module boundary the ratio split **clamps to the floor**, so the tightest realised margin in
the line-up always _equals_ it. The floor is therefore not a spare backstop — choosing it is choosing
that margin directly, which is a stronger reason to state the number honestly than I first gave it.
(An earlier draft of this table averaged the leftover and reported 4.5 X / 3.75 X; running the shipped
clamp gives 4.0 X / 3.0 X. A QA pass caught the adjacent figure, which is how the column was rechecked.)

**4 is chosen for being several times the single narrow element a decoder has to distinguish the margin
from**, while every watch still gains 50 % of module width over what shipped before this story — so the
width ifero asked for is taken without putting a 2 X gap against a black bezel on the 45 mm.

It remains a judgement, and it is labelled as one at the call site. The table is pinned by a contract
test that measures the realised margins through the shipped bar layout, so moving the constant shows its
own consequence rather than drifting. **AC10 is what turns it from arithmetic into evidence.**

**One watch now clears ISO 15420's 80 % floor.** Worth stating because the story's banner says none can,
and under the original divisor that was true. With the module dividing 103 units instead of 115, 4
px/module needs 412 px and the **46 mm has 416 px on its short axis** — 0.312 mm, 94 % of EAN-13's
nominal X. The other six sizes sit at 3 px, about 71 %. AC2's instruction not to gate on the floor still
stands: enforcing it would blank the barcode on six of the seven.

⚠️ **This number went stale once already and inverted its own conclusion.** A code-review pass corrected
it to 452 px under the then-current divisor; Round 3 changed the divisor and nobody re-derived it, so a
comment claiming "more than any watch has" survived into a design where one watch clears it. The
constant it depends on now carries an explicit warning to recompute.

**Wear OS has the same defect,** as ifero recalled. Confirmed from source: `BarcodeLayoutMetrics.kt`
says it is "ported from watchOS's `WatchBarcodeLayoutMetrics.make`" with "the linear `0.52`-of-height /
88–110 clamp reproduced verbatim", and it is narrower still because it inscribes the box in the circle
on round screens. Tracked as **Story 16.38** rather than fixed here — different platform, different
encoder (ZXing), and round screens need their own answer.

#### Addressed in code review

A Sonnet code-review pass over the diff raised three items; all three were fixed rather than argued.

1. **A factual error in a doc comment.** `pixelsPerMillimetre` claimed ISO 15420's 80 % floor "would
   demand 460 px" — that figure used EAN-13's _old_ flat 115 units, which this very change replaces with 113. Corrected to 452 px, with the derivation (0.264 mm → 4 px/module → 4 × 113) written out so the
   number cannot silently rot again.
2. **`renderTaskID` did not cover every input.** It keyed the card id, pixel size and orientation but not
   the payload, so a card whose barcode value was edited in place would keep the old image while the
   `Text(value)` beside it — read live from the body — showed the new number. The reviewer filed it as
   low-confidence and pre-existing; it was cheap to close, and closing it exposed a **second, worse
   layer**: the guard inside the task compared its own hand-maintained subset of the same inputs, so even
   with the id fixed the task would restart and then return early. `renderedPixelSize` is gone and the
   guard now compares the whole `renderTaskID`, which cannot drift from the id by construction.
   `renderedOrientation` stays because it has a second job as the hysteresis incumbent. Covered by a new
   contract test.
3. **The AC6 reversal rests on one empirical result with no automated coverage of the claim itself.**
   True and unavoidable — a simulator's safe area is not unit-testable. The call-site comment now carries
   the exact two-command re-measurement recipe, so a future reader can re-verify rather than rediscover
   the method, and the test guards the code shape.

#### Verification run

- `yarn watch:build:ci` (prebuild + `xcodebuild -target watch -sdk watchsimulator`) — **BUILD SUCCEEDED**,
  no new warnings.
- Watch contract suites — **120 passed**, including the two that compile and execute the shipped Swift.
- `yarn test` — **2184 passed / 177 suites**, no regressions.
- `yarn typecheck`, `yarn format:check` — clean. `yarn lint` — 0 errors; the 3 warnings are the
  pre-existing `exhaustive-deps` backlog owned by Story 16.24.
- Rendered and screenshotted on 40 mm and 46 mm simulators after every design change: uniform bars, full
  width, full bar height, horizontal on both, title and back chevron intact, human-readable value below.
- `yarn check:story-catalogue-sync` — clean, with the two follow-up stories this work raised.

#### ⛔ AC10 is NOT satisfied — the one gate this story cannot close here

AC10 requires a physical Apple Watch against a real checkout lane, one rotated device and one not. No
physical watch or scanner is available in this environment, and the simulator cannot stand in for it —
AC10 is explicitly about scanner behaviour, not pixels. **Task 7 is left unticked.** What to test when a
device is available:

1. A rotated symbol against a **single-line handheld laser**, which is the assumption AC3 rests on
   (flatbed lanes are omnidirectional and will not discriminate). If it fails, AC3's predicate is what
   changes — a product call, per the story's own open question.
2. Whether 2 px/module on a 40 mm is enough in a real lane. The `BarcodeGeometry` log reports the module
   achieved on the device under test, so record it alongside the result.

### File List

- `targets/watch/WatchPresentationLayout.swift` — modified
- `targets/watch/BarcodeGenerator.swift` — modified
- `targets/watch/BarcodeFlashView.swift` — modified
- `targets/watch/__tests__/watch-layout-contract.test.ts` — modified
- `targets/watch/__tests__/watch-barcode-symbology-contract.test.ts` — modified
- `targets/watch/__tests__/swift-source-helpers.ts` — added
- `watch-ios/Tests/BarcodeGeneratorTests.swift` — modified
- `targets/watch/en.lproj/Localizable.strings` — modified (rotated-symbol accessibility label)
- `targets/watch/it.lproj/Localizable.strings` — modified (rotated-symbol accessibility label)
- `docs/epics.md` — modified (Story 16.38 raised by this work; 16.37 was raised here too and has already merged as #222)
- `docs/sprint-artifacts/sprint-status.yaml` — modified
- `docs/sprint-artifacts/stories/16-27-fix-watch-barcode-geometry.md` — modified

### Change Log

| Date       | Change                                                                                                                                                                                                                                                                                                                       |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-03 | Integer module width: every element of a linear symbol is an exact multiple of one whole-pixel module, so bar-width variance is zero by construction (AC1, AC2).                                                                                                                                                             |
| 2026-09-03 | Per-symbology asymmetric quiet zones — EAN-13 is 11 leading / 7 trailing, not a flat 20 — and per-symbol unit counts via `BarcodeGenerator.symbolUnits` (AC4, AC5).                                                                                                                                                          |
| 2026-09-03 | Adaptive 90° rotation, chosen only where the long axis yields a strictly larger module, with hysteresis keyed on the orientation actually drawn (AC3, AC9).                                                                                                                                                                  |
| 2026-09-03 | Renderer takes whole device pixels and the frame is that size over the scale, so `.frame()` and the bitmap agree exactly and SwiftUI never rescales (AC7).                                                                                                                                                                   |
| 2026-09-03 | `boxInnerPadding` 2 → 0; the `156 × 88` first-render default replaced with `.zero`; a 120 ms settle stops a superseded geometry being drawn (AC6 first half, AC9).                                                                                                                                                           |
| 2026-09-03 | `cacheVersion` bumped to `watch-barcode-v4`, and the cache key now carries pixel size and orientation instead of truncated points (Task 2).                                                                                                                                                                                  |
| 2026-09-03 | Contract test now **executes** the shipped geometry solver across the device table, insets and unit counts, including rotation stability (AC8).                                                                                                                                                                              |
| 2026-09-03 | AC6's nav-bar half deliberately **not** implemented: measured on 40 mm, hiding the bar reclaims zero container height. Recorded at the call site and in the test.                                                                                                                                                            |
| 2026-09-03 | Code review: corrected the 80 % floor figure to 452 px, keyed the render task on the payload, and replaced the render guard's subset comparison with the whole task id.                                                                                                                                                      |
| 2026-09-04 | Reclaimed the horizontal and bottom safe-area edges (ifero); the top strip stays, because the navigation bar and the un-suppressable system clock live there — measured rendering white glyphs through the bars when it does not.                                                                                            |
| 2026-09-04 | Bar height is the whole cross axis, replacing the inherited 52 %-of-height clamped to 88-110 pt, which left a quarter of the box empty for no benefit.                                                                                                                                                                       |
| 2026-09-04 | The module now divides the SYMBOL's modules, not the symbol plus its quiet zone (ifero): 40 mm 2 px -> 3 px (+50 %), 46 mm 3 px -> 4 px (+33 %), and neither watch needs rotation any more.                                                                                                                                  |
| 2026-09-04 | The quiet zone takes the leftover, split in the symbology's ratio with a guaranteed 4-module floor per side — a deliberate trade against GS1's 11 X / 7 X, and the first thing for AC10 to test.                                                                                                                             |
| 2026-09-04 | Code review round 3: recomputed the 80 % floor under the new divisor — 412 px, which the 46 mm's 416 px clears — after Round 3 silently invalidated the figure an earlier review had corrected; retuned the wobble sweep onto a live orientation boundary so it stops passing vacuously.                                     |
| 2026-09-04 | QA review: bar positioning extracted into a liftable pure type so the contract test EXECUTES it; rotation announced to VoiceOver; the render threshold shared instead of duplicated; Stories 16.37 and 16.38 raised for the two defects found in passing.                                                                    |
| 2026-09-04 | QA review round 2: recorded the quiet-zone floor's derivation as a measured trade table and pinned it in a contract test, added a bar-layout case where the floor clamp actually binds, and flagged AC4 as no longer literally satisfied.                                                                                    |
| 2026-09-04 | QA verification: corrected the trade table's realised-margin column (an average, not the post-clamp minimum — the floor is always realised on one watch), the stale 5.5 X figure, and re-tracked Stories 16.37/16.38 as `backlog` rather than `drafted`, since neither has a story file and `drafted` maps to ready-for-dev. |
| 2026-09-04 | Rebased onto main after Stories 16.36 and 16.37 merged: `cacheVersion` moved to v5 (16.37 had taken v4), and this story's provisional 16.37 tracker/catalogue entries were dropped in favour of the real ones main now carries.                                                                                              |
