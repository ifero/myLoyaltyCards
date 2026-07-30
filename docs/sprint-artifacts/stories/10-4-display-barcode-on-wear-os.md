---
baseline_commit: 7837f359540c72c30edcf392e1a897fa99ab9752
---

# Story 10.4: Display the barcode on Wear OS

Status: ready-for-dev

Epic: 10 — Wear OS App

> **Run all gates from the main checkout, never a `.claude` worktree.**
>
> **Depends on 10-1** (module) and **10-3** (the list and its navigation seam).
>
> **Do NOT port `targets/watch/BarcodeGenerator.swift`.** Those 500 lines are hand-rolled EAN-13 and
> Code128 encoders that exist only because watchOS had no barcode library. Android has ZXing. See
> [Do not port the encoders](#do-not-port-the-encoders).
>
> **Wear OS can support all six formats; watchOS supports three.** This story deliberately exceeds
> watchOS parity. See [The format gap](#the-format-gap-wear-os-can-do-better).

## Story

As a user at a checkout counter,
I want my card's barcode on my watch screen, bright and large enough for the scanner to read,
so that I can pay or collect points without taking my phone out of my pocket.

## Context

### What watchOS does

`targets/watch/BarcodeFlashView.swift` (217 lines) + `BarcodeGenerator.swift` (500 lines):

- Tap a row → barcode on a **white** background, **haptic** on open
  (`WKInterfaceDevice.current().play(.success)`, `BarcodeFlashView.swift:107`).
- Dismiss on **tap anywhere** (`:43`, `:183`, `:192`) **or any Digital Crown movement**, single-shot
  (`:90-99`).
- The card name is shown as **title-level** context (Story 5-10 AC2, enforced by
  `watch-layout-contract.test.ts`).
- On open it **emits the `CARD_USED` usage event** so the phone counts it toward shared sorting
  (`:109`) — note the emission point is the _barcode screen_, not the list tap.
- Layout comes from `WatchBarcodeLayoutMetrics.make(...)`
  (`WatchPresentationLayout.swift:37-89`), which branches on QR vs linear:
  - **QR** → a square, side = `min(contentWidth, max(availableHeight − padding − footer, 112))`
  - **Linear** → full content width, height = `min(max(screenHeight * 0.52, 88), 110)`
  - `boxInnerPadding 2`, `contentSpacing 4`, `cornerRadius 8`, value label 10 pt when shown,
    `widthFillRatio` tracked so Story 5-10's "≥ 80 % of container width" is measurable.

### Do not port the encoders

`BarcodeGenerator.swift` hand-implements `encodeEAN13`, `encodeCode128`, `ean13CheckDigit`,
`compressBitStringToModuleWidths` and a `CGImage` renderer, then gets QR from CoreImage. That code
exists because **watchOS ships no barcode-generation library** — it is a workaround, not a design.

Android has **ZXing** (`com.google.zxing:core`), a pure-JVM library covering every format this app
uses. Porting the Swift encoders would mean maintaining hand-written barcode maths in a second
language for no benefit and considerable risk: a subtly wrong check digit produces a barcode that
_looks_ fine and fails at the till, which is unverifiable without a physical scanner.

**Use ZXing. Port the layout maths, not the encoding maths.**

### The format gap: Wear OS can do better

The card schema (`core/schemas/card.ts:16-23`) defines **six** formats. watchOS renders **three**:

| Format  | Phone | watchOS                                            | Wear OS (this story) |
| ------- | ----- | -------------------------------------------------- | -------------------- |
| CODE128 | ✅    | ✅ `encodeCode128`                                 | ✅ ZXing             |
| EAN13   | ✅    | ✅ `encodeEAN13`                                   | ✅ ZXing             |
| QR      | ✅    | ✅ CoreImage                                       | ✅ ZXing             |
| EAN8    | ✅    | ❌ **returns `nil`** (`BarcodeGenerator.swift:57`) | ✅ ZXing             |
| CODE39  | ✅    | ❌ **returns `nil`**                               | ✅ ZXing             |
| UPCA    | ✅    | ❌ **returns `nil`**                               | ✅ ZXing             |

`BarcodeGenerator.swift:38`'s own doc comment admits it: "Supports EAN-13, Code128, and QR." So a user
with an EAN-8 card sees nothing on their Apple Watch today.

Since ZXing covers all six at no extra cost, **support all six**. This is not scope creep — it is the
absence of a limitation. It does mean Wear OS will handle cards Apple Watch cannot; note that in the
README so the asymmetry is deliberate and documented, and consider whether it justifies a follow-up
story to close the watchOS gap (**flagged, not fixed** — see Out of scope).

### The pre-rendered QR image is not needed here

`WatchCardPayload.barcodeImageBase64` (`core/watch-connectivity.ts:162`) carries a phone-rendered QR
PNG at `WATCH_QR_PIXEL_SIZE = 144`, against a `WATCH_SNAPSHOT_MAX_BYTES = 48_000` snapshot budget
(`:169-170`). It exists because of watchOS's rendering limits.

**Wear OS renders its own barcodes from `barcodeValue` + `barcodeFormat`.** Ignore
`barcodeImageBase64` if 10-6's transport happens to carry it — and prefer that 10-6 not send it at all,
since base64 PNGs are the dominant cost in a size-limited payload. Recorded here so 10-6 inherits the
decision; the transport call belongs to that story.

### Wear-specific requirements watchOS does not have

1. **Keep the screen on.** Wear OS aggressively blanks the display and drops to ambient. A barcode that
   dims or disappears mid-scan is the whole feature failing. Hold the screen awake and at full
   brightness for the duration of the barcode screen only.
2. **Maximize brightness — parity with the phone, not an invention.** `features/cards/hooks/useBrightness.ts`
   maximizes brightness for barcode display and restores it after; `docs/ux-design-specification.md`
   calls for "high-contrast white backgrounds for all barcodes to ensure accessibility for hardware
   scanners." watchOS does **not** do this (no brightness handling anywhere in `BarcodeFlashView.swift`).
   Wear OS should, because Android exposes it cleanly and scanner reliability is the point.
3. **Round screens.** A square QR inscribed in a round display loses corners if it is sized against the
   full width. The linear case is worse: a wide, short barcode across the widest chord can clip at both
   ends. Size against the **inscribed safe area**, not the bounding box.
4. **Rotary input instead of the Digital Crown** for the dismiss gesture, if a rotary dismiss is kept at
   all — see Open Decision 3.

## Acceptance Criteria

**AC1 — Tap a card, get its barcode.**
Tapping a row in 10-3's list opens a full-screen barcode on a **white** background with the card name as
title-level context (mirroring Story 5-10 AC2). Haptic feedback confirms the tap.

**AC2 — All six formats render.**
`CODE128`, `EAN13`, `EAN8`, `QR`, `CODE39`, `UPCA` all produce a scannable symbol via ZXing. A format
string that is unknown, empty, or whose value is invalid for the format renders a **clear, localised
error state** naming the problem — never a blank screen, never a crash, never a silently wrong symbol.

**AC3 — Symbol size meets the 5-10 bar.**
The symbol occupies **≥ 80 % of the available barcode container width** for both linear and QR formats,
with no clipping (Story 5-10 AC1). Port `WatchBarcodeLayoutMetrics`'s QR-vs-linear branching, including
the `112` QR floor and the linear `0.52`-of-height / 88–110 clamp, adapted to Wear OS density units.

**AC4 — Round-screen safe.**
Verified on a **round** and a **square/rectangular** Wear OS emulator: the symbol is fully visible with
no corner or end clipping, sized against the inscribed safe area. Record both profiles.

**AC5 — Screen stays awake and bright.**
While the barcode is displayed the screen does not blank, dim, or enter ambient mode, and brightness is
maximized. **Both are restored on exit** — a watch left at full brightness is a battery complaint.
Verify the restore explicitly, including when leaving by every dismissal route in AC6.

**AC6 — Dismissal.**
Tapping the barcode returns to the list. Whatever additional dismissal gesture is chosen (Open Decision 3) also returns, exactly once — mirror watchOS's single-shot crown guard (`crownTriggered`), which
exists so one continuous gesture cannot fire twice.

**AC7 — Works fully offline.**
No network access. Barcodes are generated on-device from locally stored values (Story 5-4 AC3).

**AC8 — Usage-event seam, not the transport.**
Opening the barcode calls a **single seam** that 10-6 implements as the `CARD_USED` emission. This story
must not implement the Data Layer transport. Place the call where watchOS places it — on the barcode
screen appearing (`BarcodeFlashView.swift:109`), not on the list tap — so the two platforms count the
same event.

**AC9 — Localisation.**
Every user-facing string (title, error states, any hint) in `en` **and** `it` resources, added together.
No locale-parity test exists anywhere in this project, so a missing `it` string fails silently.

**AC10 — Rendering is cached and off the main thread.**
Barcode rasterisation is cached per (value, format, size) — watchOS caches (`cacheImage`,
`BarcodeGenerator.swift:368`) and `generateImage` is `async` (`:39`) — and never blocks the UI thread.
Re-opening the same card must not re-encode.

**AC11 — Tests.**
Kotlin unit tests for: each of the six formats producing a non-empty bitmap of the expected aspect;
invalid values per format rejected with the error state rather than a bogus symbol (at minimum a bad
EAN-13 check digit and a Code39 with an out-of-charset character); the QR-vs-linear sizing branch,
including the QR floor and the linear clamp; and cache hit behaviour. **State explicitly in the Dev Agent
Record whether these run in CI.**

**AC12 — Physical-scanner validation.**
At least one **linear** and one **QR** card scanned successfully by a **real** hardware scanner or a
second phone's scanner app, from a real Wear OS watch. Record device, watch model and format.
Rationale: every failure mode that matters here — contrast, module width, quiet zone, brightness — is
invisible in an emulator screenshot. Story 16-15 shipped a fatal crash past green CI; a barcode that
renders beautifully and does not scan is the same class of defect.

**AC13 — No regression.**
`yarn lint`, `yarn typecheck`, `yarn test`, `yarn tokens:check`, `yarn splash:check`,
`yarn check:catalogue-generated`, `yarn watch:build` pass from the main checkout; `./gradlew assembleDebug`
and the Kotlin tests pass in `watch-android/`.

## Tasks / Subtasks

- [ ] **Task 1 — ZXing integration (AC: 2, 10)**
  - [ ] Add `com.google.zxing:core` to `watch-android`. Verify the current stable version at
        implementation time and record it; do not copy a version from this prose.
  - [ ] Map the app's six format strings to ZXing `BarcodeFormat` values. The strings are the
        cross-platform contract (`core/schemas/card.ts:16-23`, "Swift/Kotlin use same string values") —
        match on them exactly, case-normalised as watchOS does (`BarcodeGenerator.swift:43` trims and
        uppercases).
  - [ ] Render to a bitmap with a **white background and black bars**, matching the phone's QR options
        (`backgroundcolor: 'FFFFFF'`, `barcolor: '000000'`) and preserving the quiet zone — ZXing's
        margin hint, not a hand-cropped bitmap.
  - [ ] Cache per (value, format, size); generate off the main thread.

- [ ] **Task 2 — Layout (AC: 3, 4)**
  - [ ] Port `WatchBarcodeLayoutMetrics.make(...)` into a single Kotlin metrics holder — one testable
        source of truth, as on watchOS.
  - [ ] Keep the QR-vs-linear branch, the `112` QR floor, the linear `0.52`/88–110 clamp, and the
        `widthFillRatio` so AC3's ≥ 80 % is _measured_, not asserted by eye.
  - [ ] Size against the inscribed safe area on round devices.

- [ ] **Task 3 — Screen behaviour (AC: 1, 5, 6)**
  - [ ] Haptic on open.
  - [ ] Keep-awake + maximize brightness on enter; **restore both on every exit path**, including
        process death and navigating away — prefer a lifecycle-scoped effect over manual pairing.
  - [ ] Card name as title-level context.
  - [ ] Dismissal per Open Decision 3, with a single-shot guard.

- [ ] **Task 4 — Error and offline states (AC: 2, 7, 9)**
  - [ ] Distinct localised states for unknown format vs invalid value — they have different user
        remedies (the card needs re-adding vs the barcode is wrong).
  - [ ] No network calls anywhere in this path.

- [ ] **Task 5 — Usage-event seam (AC: 8)**
  - [ ] A no-op-able seam invoked on barcode appear, documented as 10-6's to implement. Do not
        pre-implement the Data Layer.

- [ ] **Task 6 — Tests and validation (AC: 11, 12, 13)**
  - [ ] AC11 unit tests.
  - [ ] Round + square emulator verification.
  - [ ] **Physical scanner validation** — AC12. Coordinate with @ifero if no scanner is to hand; a
        second phone running a barcode-scanner app is acceptable evidence.

## Dev Notes

### Anti-patterns — do NOT do these

| ❌ Don't                                                        | ✅ Do instead                                                                        |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Port `BarcodeGenerator.swift`'s encoders                        | ZXing. The Swift encoders are a workaround for a missing library                     |
| Hand-compute check digits                                       | ZXing validates and computes them                                                    |
| Limit to the three formats watchOS supports                     | All six — ZXing covers them free (AC2)                                               |
| Consume `barcodeImageBase64` from the payload                   | Render locally from value + format                                                   |
| Crop the bitmap to make the symbol bigger                       | Preserve the quiet zone; scanners need it. Grow the container instead                |
| Render on the main thread, or re-encode per recomposition       | Cache + off-thread (AC10)                                                            |
| Size the symbol against the full screen width on a round device | Inscribed safe area (AC4)                                                            |
| Leave brightness or keep-awake set on exit                      | Restore on every exit path (AC5)                                                     |
| Implement the Data Layer emission here                          | Seam only; 10-6 owns transport                                                       |
| Show a blank screen for an unsupported format                   | Explicit localised error naming the problem                                          |
| Use a dark theme for the barcode surface                        | White background, black bars — hardware-scanner requirement, not an aesthetic choice |
| Hardcode English strings                                        | `en` + `it` together                                                                 |

### Testing requirements

- Phone-app gates from the **main checkout**; Kotlin tests via Gradle in `watch-android/`.
- **The honest coverage caveat, again:** watchOS's Swift XCTests do not run in CI (the watch scheme has
  no `xcodebuild test` step), which is why `targets/watch/__tests__/watch-layout-contract.test.ts` — a
  TypeScript test that reads Swift source as text — carries the CI-enforced watch layout invariants.
  Gradle unit tests _can_ run in CI; wire them into 10-1's job or say plainly that they run locally
  only.
- **A unit test cannot prove a barcode scans.** It can prove the bitmap is non-empty and correctly
  proportioned. AC12 exists precisely because the remaining risk is physical.

### Previous story intelligence

**Story 5-4** built the watchOS barcode screen; **Story 5-10** enlarged the symbol (≥ 80 % width) and
promoted the card name to title level, and its assertions are now locked in
`watch-layout-contract.test.ts` — read that file to see which invariants the project considers worth
CI-enforcing.

**Story 2-10 (`fix-barcode-qr-readability-padding`)** is the phone-side precedent and worth reading:
barcode readability has already bitten this project once, and padding/quiet-zone handling was the fix.
Do not re-learn it.

**Story 9-6** established that the watch emits `CARD_USED` on card open, applied commutatively on the
phone (`usageCount += 1`, `lastUsedAt = max`), deduped by `"<id>:<usedAt>"`. That dedup key is why 10-6
requires **millisecond-precision** UTC timestamps — second precision is explicitly non-conformant per
the ADR. Relevant here only in that AC8's seam must capture the open time at ms precision.

**Story 16-15** is the cautionary tale: green CI, fatal production crash, because the failing path had
zero coverage on the real runtime. AC12 is the equivalent gate for this story.

**Sentry has effectively no Android telemetry** (~10 events / 90 days, 100 % iOS). A Wear OS barcode
that fails to scan will produce no signal at all — no crash, no event, just a user giving up at a till.

### Latest technical information

- **ZXing `core` is pure JVM** with no Android dependency, so it works on Wear OS unchanged and is unit-
  testable on the JVM without an emulator — which is what makes AC11 cheap.
- **Do not pin the ZXing version from this story.** Resolve current stable at implementation time and
  record it (Task 1).
- The app's six format strings are a **cross-platform contract** — `core/schemas/card.ts:13-14` states
  "Swift/Kotlin use same string values". Do not translate or alias them.

## Out of scope — flagged, not fixed

1. **⚠️ watchOS cannot render EAN8, CODE39 or UPCA** (`BarcodeGenerator.swift:57` leaves `modules` nil →
   `generateImage` returns nil). Cards in those formats show nothing on Apple Watch today. Not a Wear OS
   bug and not this story's to fix, but it is a **live user-facing gap in shipped software** and there is
   no story for it. **Raise with @ifero** — it is a small fix now that ZXing-equivalent maths exists in
   Kotlin to compare against.
2. **Whether 10-6 should stop sending `barcodeImageBase64`.** Dropping it would free most of the 48 KB
   snapshot budget, but it is the watchOS transport's field and changing it touches Apple Watch. 10-6's
   call.
3. **Sync and `CARD_USED` transport** → 10-6.
4. **Barcode value display.** watchOS optionally shows the value under the symbol
   (`showsValueLabel`, 10 pt). Port the layout allowance but adopting it as default UI is a design
   choice; default to matching watchOS's current behaviour.
5. **A Wear OS complication / tile shortcut to a specific card** — parked Epic 5 follow-up, still with no
   story number in Epic 10.

## Open Decisions — binding defaults, implement as written

1. **ZXing (`com.google.zxing:core`), not a port of the Swift encoders.** Rationale above. If ZXing
   proves unavailable for any reason, **stop and raise it** rather than hand-rolling encoders.
2. **Support all six formats.** The cost is a format-mapping table; the benefit is not shipping a known
   gap into a brand-new app.
3. **Dismiss on tap; additionally on rotary input, single-shot.** Mirrors watchOS's tap-or-crown, and
   rotary is the closest Wear OS analogue to the Digital Crown. If rotary dismissal proves fiddly on
   round hardware, tap-only plus the system back gesture is acceptable — record which you shipped, since
   Story 5-10 AC5 treats the dismiss path as a protected behaviour.
4. **Maximize brightness and hold the screen awake, scoped to this screen only.** Parity with the phone's
   `useBrightness`; a deliberate improvement over watchOS. Restoration on exit is AC5 and non-negotiable.
5. **White background, black bars, quiet zone preserved via ZXing's margin hint.** Matches the phone's
   QR render options and the UX spec's hardware-scanner requirement.
6. **Port the layout metrics into one Kotlin holder**, as `WatchPresentationLayout.swift` does, so AC3 is
   unit-testable rather than eyeballed.

## References

- `targets/watch/BarcodeFlashView.swift` — `:43`/`:183`/`:192` tap-dismiss, `:90-99` single-shot crown,
  `:107` haptic, `:109` usage-event emission point
- `targets/watch/BarcodeGenerator.swift` — `:15-21` format enum, `:38` "Supports EAN-13, Code128, and QR",
  `:39` async + cache, `:43` format normalisation, `:51-69` the `nil` fall-through for EAN8/UPCA/CODE39,
  `:368` cache, `:377` CoreImage QR. **Reference only — do not port**
- `targets/watch/WatchPresentationLayout.swift:37-89` — `WatchBarcodeLayoutMetrics.make`, QR/linear
  branching, `112` floor, `0.52`/88–110 clamp, `widthFillRatio`
- `core/schemas/card.ts:13-23` — the six formats; cross-platform string contract
- `core/watch-connectivity.ts:155-170` — `WatchCardPayload`, `barcodeImageBase64`,
  `WATCH_QR_PIXEL_SIZE = 144`, `WATCH_SNAPSHOT_MAX_BYTES = 48_000`; `:172-199` the phone's QR render
  options
- `features/cards/hooks/useBrightness.ts` — the phone's maximize/restore behaviour to mirror
- `docs/sprint-artifacts/stories/5-4-display-barcode-on-watch.md` — mirror story (tap, haptic, dismiss,
  offline)
- `docs/sprint-artifacts/stories/5-10-watch-barcode-legibility-list-density.md` — AC1 ≥ 80 % width,
  AC2 title-level name, AC5 protected dismiss behaviour
- `docs/sprint-artifacts/stories/2-10-fix-barcode-qr-readability-padding.md` — phone-side readability fix
- `docs/sprint-artifacts/stories/9-6-count-watch-card-opens.md` — `CARD_USED` semantics and dedup key
- `docs/adr-2026-06-09-watch-usage-events.md` — ADR-2026-06-09-001, ms-precision requirement
- `docs/ux-design-specification.md` — "Luminance Scannability": high-contrast white barcode backgrounds
- `targets/watch/__tests__/watch-layout-contract.test.ts` — the CI-enforced watch layout invariants

## Dev Agent Record

### Agent Model Used

_To be filled by the dev agent._

### ZXing Version Used (Task 1)

### Debug Log References

### Completion Notes List

### Device / Emulator Verification (AC4)

| Shape       | Device / emulator | API | Result |
| ----------- | ----------------- | --- | ------ |
| Round       |                   |     |        |
| Square/rect |                   |     |        |

### Physical Scanner Validation (AC12)

| Format | Watch model | Scanner used | Result |
| ------ | ----------- | ------------ | ------ |
| Linear |             |              |        |
| QR     |             |              |        |

### Do the Kotlin tests run in CI? (AC11)

_State yes/no explicitly and how._

### File List
