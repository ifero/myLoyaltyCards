---
baseline_commit: 652f3c61442ab02841180e7bc837556721576165
---

# Story 16.31: The scanner viewfinder is a square around a barcode that is not — and the format it needs is already in its props

Status: ready-for-dev

Epic: 16 — Platform & Tech Debt

> **✅ THE CODE FACT IS CONFIRMED; THE UX COST IS AN ARGUMENT, NOT A MEASUREMENT.**
> Found 2026-08-21 while specifying the capture pattern
> (`docs/design/cardi/stitch-prompts-capture.txt`, finding 6). Verified against `origin/main`.
> Read the "what is and is not established" section before treating this as a defect — the
> square is unambiguous, the harm is reasoned.

## The code fact

`features/add-card/components/ScannerOverlay.tsx`:

```
const VIEWFINDER_WIDTH_RATIO = 0.7;
const viewfinderSize = screenWidth * VIEWFINDER_WIDTH_RATIO;
…
<View style={{ width: viewfinderSize, height: viewfinderSize }}>
  <ViewfinderCorners size={viewfinderSize} />
  <ScanLine viewfinderSize={viewfinderSize} />
</View>
```

One scalar drives both dimensions, so the brackets are always a **square** — ≈275 × 275 on a
393pt-wide device.

Meanwhile the component **already receives the format it is about to scan**:

- `BrandScannerScreen` passes `expectedFormat={brand?.defaultFormat}` to `ScannerOverlay`;
- `ScannerOverlay` forwards it into `useBarcodeScanner({ onScan, enabled: true, expectedFormat })`
  and nowhere else.

So the information needed to shape the frame is threaded through the component and used only for
decoding, never for geometry.

## Why a square is the wrong shape

An EAN-13 is 95 modules wide by roughly 20 tall — about **4.75 : 1**. A QR code is **1 : 1**. A
square bracket is right for one of those and wrong for the other, and the app knows which it is
about to meet.

The cost is not aesthetic. A viewfinder teaches a gesture: people move the phone until the thing
they are scanning **fills the frame they were given**. Given a square frame and a wide barcode,
filling it means backing away until the code is small enough to be square-ish — which is the one
failure mode a viewfinder exists to prevent, because it reduces the pixels per module at exactly
the moment the decoder needs them most.

## What IS and IS NOT established

- **Established:** one scalar drives both dimensions; `expectedFormat` is available and unused
  for layout; the aspect mismatch against EAN-13 is arithmetic.
- **NOT established:** that people actually back away, or that any scan has failed because of
  this. Nobody has watched a user against this build. `BarcodeFlash` was confirmed working at a
  real checkout (Story 16.23 lineage), but that is the _display_ screen, not this one.
- **Therefore:** ship this as an improvement with a measurable claim, not as a regression fix.
  If a device session shows no difference in time-to-first-scan, the square is merely untidy and
  this story can close as won't-fix without embarrassment.

## Acceptance criteria

- **AC1** — The viewfinder's width and height are independent, derived from `expectedFormat`:
  a wide rectangle for the linear formats (`ean13`, `ean8`, `code128`, `code39`, `upc_a`) and a
  square for `qr`.
- **AC2** — With no `expectedFormat` — the custom-card path enters the scanner with
  `mode: 'custom'` and no brand, so this is a real case, not a defensive one — the frame falls
  back to the **wide** rectangle, because linear formats are the large majority of the catalogue.
- **AC3** — `ScanLine` continues to sweep the frame's **height**, whatever that becomes; it must
  not be left animating over a stale `viewfinderSize`.
- **AC4** — The brackets stay corners-only at the current 32/4/12 (`CORNER_SIZE`,
  `CORNER_THICKNESS`, `CORNER_RADIUS`). This story changes the rectangle, not the mark.
- **AC5** — A unit test asserts the aspect: a linear `expectedFormat` yields width > height, `qr`
  yields width === height, and `undefined` yields width > height.
- **AC6** — Verified on a device against a real EAN-13 and a real QR, with both screenshots
  attached, and a note on whether time-to-first-scan changed. If it did not, say so — see the
  section above.

## Notes for the implementer

`docs/design/cardi/frames/cardi-capture-frames.html` (frame B) draws the intended linear frame at
**300 × 120**, and `docs/design/cardi/stitch-prompts-capture.txt` prompt B specifies it. Those are
frame constants at a 393pt width; derive from `screenWidth` in code rather than copying 300.

The design-system decision this rests on is recorded in `docs/design/cardi/cardi-design-system.md`
under "The beam rule, both halves": the brackets and the sweeping line are **correct on this
screen** even though the barcode-display screen forbids both, because here the app is the scanner
rather than the thing being scanned. Do not "fix" the brackets away by citing that rule.
