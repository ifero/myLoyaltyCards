---
baseline_commit: 93f1770f9a1a8c33fe7fb00bf95389b07aed66c9
---

# Story 16.23: Fix silent barcode-scan failures on iOS — reported as "PENNY Card EAN-13 not recognised by the library"

Status: ready-for-dev

Epic: 16 — Platform & Tech Debt

> **Run all gates from the main checkout, never a `.claude` worktree.** `jest.config.js` sets
> `modulePathIgnorePatterns: ['/.claude/']` and `testPathIgnorePatterns: [… '/.claude/' …]`, so
> `yarn test` inside a worktree finds **zero tests** and passes vacuously.
>
> **🔴 iOS-only, and input-specific.** Android (Samsung, ifero 2026-07-30) decodes this card via both
> the camera and the image path, and on iOS **only this one card** fails — every other card has always
> worked. So neither the JS pipeline nor the iOS image path is broadly broken.
>
> **Apple Vision is not the limitation either — that was measured, not assumed.** On macOS Vision the
> payload decodes at every leading digit, at 1 px per module, with a 1-module quiet zone, under
> low-quality JPEG, from a **194 × 40 px** image, and from a faithful reconstruction of the entire card.
>
> **🎯 Leading hypothesis: this is not a recognition bug at all — the image never loads.**
> `UIImage(contentsOfFile:)` returning `nil` rejects with `INVALID_IMAGE`
> (`ImageCodeScanner.swift:146-149`), the bare `catch {}` swallows it, and the user is told "No barcode
> found in this image" — which would be simply false. Android's `BitmapFactory` and iOS's ImageIO do not
> accept the same containers, which fits the platform split exactly. **Defect 1 is therefore the
> diagnostic that names this bug, not merely observability polish.** Start with
> `sips -g all <file>` and the [zero-device harness](#zero-device-reproduction-harness), not a device
> session.
>
> **AC2–AC6 ship as an OTA update** — JS/TS + JSON + locales only, so
> `runtimeVersion: { policy: 'appVersion' }` is not a blocker (unlike Story 16.17). **AC7 may not**: if
> the iOS gap can only be closed with a `yarn patch` against the library's Swift, that is a native
> change and needs a new binary. Decide the branch first, then the release path.
>
> ⚠️ When a device session **is** warranted, use a **real iOS device**, never the simulator — the
> library pins an older Vision revision under `#if targetEnvironment(simulator)`.
>
> **The scope decisions recorded below are binding, not questions.** The symbology set stays at 6;
> implement as written and do not pause to re-open it.

## Story

As a user adding a loyalty card by scanning a photo or screenshot of it,
I want the app to tell me **why** the scan failed rather than always saying the image contains no barcode,
so that a scan failure is a recoverable, diagnosable event — and so that we can actually diagnose the next report from the field.

## Context

### The report

ifero reported (2026-07-29) that the barcode on an Italian **Penny Market** loyalty card "is not recognised
by the library", supplying a card image. The printed payload is `2095110257978` (card face also prints
`Codice PENNYCard 2095110257978`), rendered in the 1 + 6 + 6 human-readable grouping characteristic of
EAN-13.

✅ **Failing surface confirmed by ifero (2026-07-29): "scan from image / screenshot".** That path uses
`react-native-image-code-scanner` (iOS Vision / Android ML Kit) via
`features/add-card/hooks/useImageScan.ts` — **not** `expo-camera`.

### 🔴 This is an iOS defect — confirmed 2026-07-30

ifero re-tested the same card on a **Samsung (Android)** device: **both the camera and the
screenshot/image path decode it correctly.** iOS is the failing platform.

That single data point does more work than everything else in this story:

1. **It confirms the payload and our JS pipeline are fine.** The identical `useImageScan` →
   `mapFormat` → `normalizeBarcode` → `applyExpectedFormat` chain runs on both platforms. Android
   succeeds through it. Nothing above the native boundary is at fault.
2. **It localises the failure below the native boundary** — Android uses **ML Kit**, iOS uses Apple
   **Vision**. Different engines, same input, different result. (⚠️ Read on: the next section shows
   Vision is not intrinsically incapable of this barcode, so "Vision is weak" is **not** the conclusion
   to draw from this.)
3. **Story 2.9 predicted exactly this**, at
   `docs/sprint-artifacts/stories/2-9-scan-cards-from-image-screenshot.md:184`: _"Barcode recognition
   should still be verified on both platforms because iOS and Android now use different native engines
   for static images (Vision on iOS, ML Kit on Android)."_ That warning has now cashed in.

**And only this card fails** (ifero, 2026-07-30). Every other card in the app has always scanned fine
on iOS. So the iOS image path is **not** broadly broken — something about this one input defeats it.

### Vision is not the limitation — measured, not assumed

macOS ships the same Vision framework as iOS, so the payload was tested directly against
`VNDetectBarcodesRequest` using the app's exact symbology set. **Every single case decoded correctly:**

| Test                                                                                                                                                                             | Result                                                               |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Leading digit sweep — `X09511025797` + checksum, X = 0…9                                                                                                                         | ✅ all 10 decode. **The `2` prefix / parity pattern is irrelevant.** |
| Module width 1, 2, 3, 4, 6, 10 px                                                                                                                                                | ✅ all decode — even a **95 px-wide** barcode                        |
| Quiet zone 11, 7, 4, 2, 1 modules                                                                                                                                                | ✅ all decode (only a **zero** quiet zone fails)                     |
| Bar height 150 → 25 px at 570 px wide                                                                                                                                            | ✅ decodes down to 25 px (fails only below ~15 px)                   |
| JPEG at `low` / `normal` / `high` / `best`                                                                                                                                       | ✅ all decode                                                        |
| Downscaled to 800 / 500 / 350 / 250 px wide                                                                                                                                      | ✅ all decode, PNG and JPEG alike                                    |
| **Combined worst case: 194 × 40 px, low-quality JPEG, 1-module quiet zone**                                                                                                      | ✅ **decodes**                                                       |
| **Faithful reconstruction of the whole card** — 806 × 496 canvas, bars at the measured 4.81 px/module × 125 px, red→yellow gradient bands, digits below, at low/normal/best JPEG | ✅ **all decode**                                                    |

**Conclusion: Apple Vision reads `2095110257978` under conditions far harsher than any real card
image.** The payload, the symbology, the leading digit, resolution, compression and quiet zone are all
exonerated **for iOS too**.

### 🎯 Leading hypothesis: the image never loads — this is not a recognition bug

Everything reproducible has now been eliminated, and each elimination is independently confirmed:

| Candidate                                        | Status                                                                                                                                                               |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The bars don't encode the printed digits         | ❌ **Dead.** ifero confirmed Android decoded **`2095110257978`**, the correct value — so the bars are a genuine, checksum-valid EAN-13.                              |
| Vision can't handle the payload or geometry      | ❌ **Dead.** Measured above, including a faithful reconstruction of the entire card.                                                                                 |
| Capture quality (glare / skew / blur / contrast) | ❌ **Dead.** The supplied image is a **synthetic digital graphic** — crisp flat-black bars, no noise, no perspective. Not a photograph.                              |
| The orientation double-apply (Defect 4.4)        | ❌ **Dead.** It requires a non-`.up` image **over 2048 px**. This image is 806 px wide, so `scaleImageIfNeeded` never runs, and a digital graphic is `.up`.          |
| **The file never loads on iOS**                  | 🎯 **Leading.** `UIImage(contentsOfFile:)` returning `nil` → `safeReject("INVALID_IMAGE", …)` (`ImageCodeScanner.swift:146-149`) → swallowed by the bare `catch {}`. |

**Reframe the whole story around this.** If the leading hypothesis holds, the app is not failing to
_recognise_ a barcode — it never gets as far as looking at one, and then reports **"No barcode found in
this image"**, which is actively misleading. Defect 1 stops being "nice-to-have observability" and
becomes **the diagnostic that names the bug**.

Why the platform split fits: Android's `BitmapFactory` and iOS's ImageIO do not accept the same set of
containers. A file Android decodes happily can return `nil` from `UIImage(contentsOfFile:)` — candidates
include WebP or AVIF saved with a `.jpg` extension, an unusual colour profile or bit depth, or a
percent-encoded / non-`file://` path surviving
`path.replacingOccurrences(of: "file://", with: "")` (`:144`).

⚠️ **AC1 Step 0 does not need a device, and barely needs the app.** With the real file in hand:
`sips -g all <file>` names the container, colour space, bit depth and alpha in one line, and the
[harness](#zero-device-reproduction-harness) distinguishes `LOAD_FAILED` from `MISS` in the next.

#### Zero-device reproduction harness

`swiftc -O vision.swift -o vision && ./vision <image…>` — mirrors `react-native-image-code-scanner`'s
iOS symbology set for the six formats this app requests.

```swift
import Foundation
import Vision
import AppKit

let symbologies: [VNBarcodeSymbology] = [.code128, .ean13, .ean8, .qr, .code39, .upce]

for path in CommandLine.arguments.dropFirst() {
  guard let img = NSImage(contentsOfFile: path),
        let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
    print("LOAD_FAILED \(path)"); continue          // ← the iOS INVALID_IMAGE case
  }
  let req = VNDetectBarcodesRequest()
  req.symbologies = symbologies
  try? VNImageRequestHandler(cgImage: cg, orientation: .up, options: [:]).perform([req])
  let obs = req.results ?? []
  if obs.isEmpty { print("MISS   \(path)") }
  else { obs.forEach { print("HIT    \(path) -> \($0.symbology.rawValue) \($0.payloadStringValue ?? "<nil>")") } }
}
```

⚠️ One caveat: macOS and iOS may run different Vision **revisions**, so a macOS HIT on ifero's file
does not fully prove iOS would hit — but a macOS **MISS** is strong evidence the file itself is the
problem, and that is the answer worth having first.

### What was already ruled out (verified, not assumed)

Every one of these was executed against this repo at `7837f35`. The baseline has since moved to
`93f1770`, which is **docs-only** (Story 16.22 + the six Epic 10 story files) — no source file
changed, so every result below still holds. **Do not re-litigate them; do not "fix" them.**

| Hypothesis                                    | Verdict          | Evidence                                                                                                                                                                                                                                                                                                                         |
| --------------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The payload is not a valid EAN-13             | ❌ **Ruled out** | Weighted sum of the first 12 digits = 92 → check digit `(10 − 92 mod 10) mod 10` = **8**, matches. Satisfies `isValidEAN13Checksum` (`core/utils/normalizeBarcode.ts:41-54`).                                                                                                                                                    |
| `bwip-js` cannot render it                    | ❌ **Ruled out** | `toSVG({bcid:'ean13', text:'2095110257978'})` succeeds; the same call with a corrupted check digit (`…79`) throws `bwipp.ean13badCheckDigit#6875`. So the renderer is exercising real EAN-13 validation and this value passes.                                                                                                   |
| `inferBarcodeFormat` mislabels it             | ❌ **Ruled out** | 13-digit numeric branch → `'EAN13'` (`core/utils/inferBarcodeFormat.ts:47-51`).                                                                                                                                                                                                                                                  |
| A scanner doesn't request EAN-13              | ❌ **Ruled out** | All three surfaces request it — see [Surface map](#surface-map).                                                                                                                                                                                                                                                                 |
| The `2` GS1 prefix is special-cased somewhere | ❌ **Ruled out** | `20–29` is the GS1 "restricted circulation / in-store" band — exactly what a loyalty card uses. Grep of `core/`, `features/`, `shared/` finds no prefix logic; the only prefix check is `isLikelyUPCA` in the **library's** iOS code, which requires a leading `0`.                                                              |
| The leading-zero bug from Story 2.9 recurring | ❌ **Ruled out** | That bug (iOS Vision reporting Italian Conad EAN-13 as 12-digit UPC-A) only fires on a leading `0`. This payload leads with `2`, so `isLikelyUPCA` returns false and no digit can be stripped.                                                                                                                                   |
| Our JS scan pipeline is at fault              | ❌ **Ruled out** | Android runs the identical `useImageScan` → `mapFormat` → `normalizeBarcode` chain and **succeeds** (ifero, Samsung device, 2026-07-30). The divergence is below the native boundary.                                                                                                                                            |
| The library's Android 1024 px downscale cap   | ❌ **Ruled out** | ⚠️ **This reverses an earlier suspicion in this story.** Android caps the longest edge at **1024 px** and iOS at **2048 px**, so Android degrades the image _more_ — and Android is the platform that works. The cap is not the mechanism; the old "Android decode-headroom" task is retired and Task 6 now targets the iOS gap. |
| Vision cannot decode this payload             | ❌ **Ruled out** | Measured on macOS Vision with the app's symbology set: decodes at every leading digit 0–9, at 1 px/module, with a 1-module quiet zone, under low-quality JPEG, and from a **194 × 40 px** image. See [Vision is not the limitation](#vision-is-not-the-limitation--measured-not-assumed).                                        |
| The iOS image path is broadly broken          | ❌ **Ruled out** | ifero (2026-07-30): **only this card** fails on iOS; every other card has always scanned fine. The defect is input-specific, not structural.                                                                                                                                                                                     |

**Reproduce the renderer check:**

```bash
cd /Users/ifero/Developer/myLoyaltyCards && node --input-type=module -e "import {toSVG} from '@bwip-js/react-native'; console.log((await toSVG({bcid:'ean13',text:'2095110257978',scale:3,height:12,includetext:false})).length)"
```

**Conclusion: nothing in this repo rejects `2095110257978`.** The failure is in the decode step — and
the app currently **cannot tell us which decode step, or why**. That undiagnosability is the primary
defect this story fixes.

### Surface map

| Surface                                                     | Entry point                                               | Decoder                                                               | Formats requested                                                            |
| ----------------------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **Scan from image / screenshot** ⬅ **the reported failure** | `features/add-card/hooks/useImageScan.ts:106-157`         | `react-native-image-code-scanner@1.1.3` (iOS Vision / Android ML Kit) | `CODE_128, EAN_13, EAN_8, QR_CODE, CODE_39, UPC_A` (`useImageScan.ts:40-47`) |
| Add-card camera _(control only)_                            | `features/add-card/components/ScannerOverlay.tsx:316-318` | `expo-camera` `CameraView` (AVFoundation / ML Kit)                    | `code128, ean13, ean8, qr, code39, upc_a`                                    |
| Edit/rescan camera _(control only)_                         | `features/cards/components/BarcodeScanner.tsx:206-208`    | `expo-camera` `CameraView`                                            | `code128, ean13, ean8, qr, code39, upc_a`                                    |

The camera surfaces matter to the diagnosis: if the **physical card** scans fine through the camera
while the **image** of it fails, the defect is in the image pipeline (decode, downscale, or file
handling), not in EAN-13 support. That comparison is Task 1's job.

### Defect 1 — a failed image scan is undiagnosable (primary)

`features/add-card/hooks/useImageScan.ts:126-156` collapses **three different outcomes** into one
user-facing message and emits **zero** telemetry:

```ts
if (scanned.length === 0) {
  setShowError(true);        // decoder ran, found nothing
}
…
} catch {                    // ← native module threw: reason discarded entirely
  setShowError(true);
}
```

Both paths render `addCard.noCodeFound.message` = **"No barcode found in this image"**
(`shared/i18n/locales/en.ts:529-536`). So a permissions failure, an unreadable/HEIC path, an OOM in
the native downscaler, and a genuine no-detection all look identical — to the user _and_ to us.

This is exactly the gap Story **16.14** closed for OTA updates: `logger.warn` is `__DEV__`-only and a
**no-op in production** (`core/utils/logger.ts`), so field failures leave no trace. Here it is worse —
there is no `logger` call at all. **We cannot diagnose ifero's report today, and we could not diagnose
the next one either.**

### Defect 2 — symbology coverage is narrower than the UI implies (bounded: NOT widening)

The app requests **6** of the **14** formats `react-native-image-code-scanner` exposes
(`BarcodeFormat` enum in its `src/index.tsx`). Never requested: `CODE_93`, `UPC_E`, `ITF`, `CODABAR`,
`PDF_417`, `DATA_MATRIX`, `AZTEC`. `expo-camera`'s list is the same 6.

**Decision (ifero, 2026-07-29): keep the 6. Do NOT widen in this story.** The reasoning, recorded here
so it does not get re-opened: `barcodeFormatSchema` (`core/schemas/card.ts:16-23`) is a **cross-platform
sync contract** — watchOS (Swift) and Wear OS (Kotlin) serialise the same string values — so adding a
member is a protocol change, not a local edit. It would also have to move
`BWIPJS_FORMAT_MAP` (`features/cards/components/BarcodeRenderer.tsx:53-60`), `FormatPicker` labels, both
`barcodeTypes` lists, `SUPPORTED_IMAGE_SCAN_FORMATS`, and both locale files **in one change**, and each
new member needs a verified `bwip-js` `bcid` or the renderer falls back to the grey `invalidA11y`
placeholder. None of that is justified by a report about a barcode we have **proven is EAN-13** — a
format already fully supported.

One piece of this **is** in scope, because it is a live inconsistency rather than a widening:
`shared/i18n/locales/en.ts:526` and `it.ts:529` ship a `DATAMATRIX: 'Data Matrix'` label that **no
`BarcodeFormat` member corresponds to** — a dead key, and evidence someone previously started down this
path. Remove it (AC5).

If Task 1 proves the card is in an unrequested symbology after all, **stop and re-scope** — that is a
different story, not a silent expansion of this one.

### Defect 3 — unknown formats are silently relabelled `CODE128`

`mapFormat` (`useImageScan.ts:49-52`) and `mapBarcodeFormat` (`useBarcodeScanner.ts:30-32`) both
`?? 'CODE128'`. If a decoder ever returns a format outside `BARCODE_FORMAT_MAP`, the card is **stored
with the wrong `barcodeFormat`** and later re-rendered as Code 128. `normalizeBarcode` Rule 3
(`core/utils/normalizeBarcode.ts:95-99`) rescues the 13-digit-valid-EAN-13 case only; everything else
is silently corrupted. The fallback is a reasonable default, but it must be **observable**.

### Defect 4 — the iOS Vision path (this is where the bug lives)

All line refs below are `node_modules/react-native-image-code-scanner@1.1.3/ios/ImageCodeScanner.swift`.
**Read the file before theorising** — it is ~350 lines. The iOS flow is:

`UIImage(contentsOfFile:)` → `scaleImageIfNeeded(maxDimension: 2048)` → build 6 candidate images
(Original, Grayscale, Enhanced contrast, Rotated 90°/180°/270°) → try each **sequentially** against a
`VNDetectBarcodesRequest` → first non-empty result wins → if all six miss, `safeResolve([])`.

Four concrete things to check, in priority order. ⚠️ **Only reach for these once AC1 Step 0 returns
`HIT`** — i.e. macOS Vision reads ifero's file but the app does not. A `MISS` or `LOAD_FAILED` means the
problem is the file, and none of the theories below apply.

1. **`[]` vs a rejection — this is the fork in the road.** `guard let originalImage = UIImage(contentsOfFile: cleanPath) else { safeReject("INVALID_IMAGE", …) }` (`:146-149`). A rejection and a genuine
   Vision miss are **indistinguishable in the app today** — both land in the bare `catch {}` and render
   "No barcode found in this image". Resolving this is Defect 1's whole point, and on iOS it is now the
   single most valuable piece of information. `cleanPath` strips `file://` via
   `replacingOccurrences(of: "file://", with: "")`, so a `ph://` asset URI or a percent-encoded path
   would fail here silently.
2. **Simulator ≠ device.** `#if targetEnvironment(simulator) request.revision = VNDetectBarcodesRequestRevision1 #endif` (`:325-327`). The simulator runs an **older Vision revision** than a device.
   A simulator reproduction is therefore not evidence about device behaviour in either direction.
3. **Duplicate symbology registration.** We request both `EAN_13` and `UPC_A`; the switch appends
   `.ean13` for `"EAN_13"` **and** `[.ean13, .upce]` for `"UPC_A"` (`:197-202`), so `.ean13` lands in
   `request.symbologies` twice. Probably benign — verify rather than assume.
4. **⛔ Orientation double-apply — RULED OUT for this report, kept only as a latent library bug.** It
   cannot explain the Penny case (806 px wide ⇒ `scaleImageIfNeeded` never runs; digital graphic ⇒
   `.up`). Do **not** spend time on it here; file it upstream separately if you want it fixed.
   `scaleImageIfNeeded`
   (`:80-92`) draws through `image.draw(in:)`, which **bakes** the orientation into the pixels, then
   re-wraps the result as `UIImage(cgImage: rendered.cgImage!, scale:, orientation: image.imageOrientation)` — re-attaching the original orientation to already-rotated pixels. The handler is
   then built with `orientation: cgImagePropertyOrientation(from: currentImage.imageOrientation)`
   (`:331-335`), applying it again. If real, this only bites images that are **both** non-`.up`
   **and** larger than 2048 px — i.e. camera photos, not screenshots (screenshots are `.up`). The
   90/180/270 retries may be masking it. Confirm with the actual image before treating it as the cause.

**⛔ Do NOT reintroduce ML Kit on iOS.** It is tempting — ML Kit is exactly what works on Android — but
Story 2.9 removed it deliberately and the blocker is structural, not incidental
(`2-9-scan-cards-from-image-screenshot.md:124-134`): Google ships `MLImage` / `MLKitBarcodeScanning` as
`.framework` (not `.xcframework`) with an **iOS-Device-only arm64 slice**, so CocoaPods emits
`EXCLUDED_ARCHS[sdk=iphonesimulator*] = arm64` and **every Apple-Silicon simulator build breaks**. It
was also the source of the Conad leading-zero corruption. If a proposal starts with "just use ML Kit on
iOS too", it must first answer the simulator-architecture problem.

### Defect 5 — `penny-market` carries no `defaultFormat`

`catalogue/italy.json:293-298`:

```json
{
  "id": "penny-market",
  "name": "Penny Market",
  "aliases": ["supermarket", "discount", "grocery"],
  "logo": "penny-market",
  "color": "#CD1414"
}
```

`defaultFormat` is optional (`catalogue/types.ts:23`) and absent here, so `expectedFormat` is
`undefined` on both Penny paths (`features/add-card/screens/BrandScannerScreen.tsx:111,127`) and
`applyExpectedFormat` (`core/utils/normalizeBarcode.ts:117-132`) is a **no-op** for Penny. That safety
net does not cause the reported failure (this payload leads with `2`, not `0`), but Penny is
demonstrably an EAN-13 brand and the hint is missing.

## Acceptance Criteria

1. **Start on a Mac, then confirm on a device.**

   **Step 0 — no device needed, do this first.** Obtain **ifero's actual image file** and run it through
   the [zero-device harness](#zero-device-reproduction-harness). Three outcomes, three different stories:
   - `LOAD_FAILED` → the file cannot be decoded as an image at all. The iOS bug is `INVALID_IMAGE`
     (`ImageCodeScanner.swift:146-149`), not a Vision miss. Check format (HEIC?) and URI scheme (`ph://`?).
   - `MISS` → the **file** is the problem, and it is reproducible on a Mac in one second. Compare it
     against a working card's image: pixel dimensions, module width in px, quiet zone in modules,
     contrast, skew, glare. Vision tolerates 194 × 40 px low-quality JPEG, so whatever breaks it is
     visible.
   - `HIT` → Vision reads the file fine on macOS, so the fault is in **how the app feeds it to Vision**
     on iOS — the picker's output file, the URI, or the library's preprocessing (Defect 4). Only now is
     a device session justified.

   **Then, on a real iOS device** (not a simulator — it pins an older Vision revision, Defect 4.2), run
   the image through **scan-from-image** and record:
   - **Q1 — did `ImageCodeScanner.scan` resolve `[]`, or reject?** If it rejected, capture the code and
     message verbatim (`INVALID_IMAGE` would mean the file never loaded, which is a completely different
     bug from a Vision miss). The Swift `print` statements at `:120`, `:235`, `:246`, `:317`, `:321`
     name which of the six preprocessing candidates was tried — read them from the Xcode console.
   - **Q2 — does the iOS _camera_ decode the physical card?** `expo-camera` uses AVFoundation's metadata
     output on iOS, a **different engine** from Vision. Camera-works + image-fails pins the defect on
     Vision specifically and makes an AVFoundation-based or hybrid fallback viable; both-fail means the
     card's print quality is implicated and the fix is elsewhere.
   - Also record: iOS version, device model, build type (dev/release), source-image pixel dimensions,
     file type (screenshot PNG vs HEIC vs JPEG), and `UIImage.imageOrientation` if reachable.
   - Android is the **known-good control** (ifero, Samsung, 2026-07-30, camera + image both fine). Do
     not re-derive it; use it to bound the search.

   If it does **not** reproduce on iOS, that is a valid outcome: record the evidence and proceed with
   AC2–AC8, which stand on their own.

2. **Image-scan failures are distinguishable.** `useImageScan` separates "decoder returned zero
   results" from "the native call threw", and the thrown reason is captured rather than discarded. The
   user-facing copy differentiates the two cases in **both** `en.ts` and `it.ts`.
3. **Image-scan failures are visible in production.** Both failure paths emit `logger.notify` with a
   string-**literal** message and low-cardinality literal tags. **The barcode value, the image URI, and
   the file name MUST NEVER be sent to Sentry** — tag values are not redacted by the PII scrubber
   (`core/utils/logger.ts`). Safe fields only: surface, platform, format-requested list, result count,
   error class/name.
4. **Unknown-format fallbacks are observable.** When `mapFormat` / `mapBarcodeFormat` falls through to
   `'CODE128'`, a `logger.notify` records the _unmapped format label_ (a low-cardinality decoder
   constant, not user data). Behaviour is unchanged — `CODE128` remains the fallback.
5. **The symbology set stays at 6, and the dead locale key is gone.** `barcodeFormatSchema`,
   `BWIPJS_FORMAT_MAP`, `FormatPicker`, both `barcodeTypes` lists, and `SUPPORTED_IMAGE_SCAN_FORMATS` are
   **unchanged**. The unbacked `DATAMATRIX` key is removed from `en.ts:526` **and** `it.ts:529`, and a
   grep confirms nothing references `multiCode.formats.DATAMATRIX`. The rationale for not widening is
   recorded in the story (already drafted under [Defect 2](#defect-2--symbology-coverage-is-narrower-than-the-ui-implies-bounded-not-widening)).
6. **`penny-market` declares `defaultFormat: "EAN13"`** in `catalogue/italy.json`, and
   `catalogue/italy.test.ts` still passes.
7. **The iOS gap is closed or explicitly deferred with evidence.** Selected by AC1 Step 0's outcome:
   - **(a) `MISS` — the file is marginal for Vision.** Give the user a way to make a better input rather
     than trying to out-decode Vision. Cheapest lever already in the code: `useImageScan.ts:107-114`
     calls `launchImageLibraryAsync({ allowsEditing: false })`. Offering a **crop-and-retry** on failure
     (`allowsEditing: true`) makes the barcode fill the frame, which is exactly what a marginal decode
     needs — no new dependency, no native change, OTA-safe. Do **not** flip the default; offer it as the
     recovery action.
   - **(b) `LOAD_FAILED` — the file never loads.** Then it is a format/URI bug, not a decode bug. Fix it
     where the URI is produced (`ImagePicker` options) or normalise before the call. AC2/AC3 already
     make this case visible instead of silent.
   - **(c) `HIT` — Vision reads it, the app does not.** Now the Defect 4 checks apply. Consider an
     iOS-only second attempt via `expo-camera`'s `scanFromURLAsync` (exported at
     `expo-camera/build/index.d.ts:56`, currently **unused** here) — cheap, no new dependency — and an
     upstream report against `react-native-image-code-scanner` with the minimal repro, plus a
     CI-guarded `yarn patch` if the fix is small and local (the Story 16-19 `burnt` pattern).
   - **(d) A documented deferral** is acceptable if the evidence says the input is simply beyond
     Vision. Say so with the numbers and let AC2–AC4 carry the value.

   **On every branch: the manual-entry escape hatch must be reachable and obvious from the failure
   state.** That is what actually unblocks the user today, and it is one card, not a class.

8. **Regression-safe.** `yarn lint`, `yarn typecheck`, `yarn test`, and `yarn tokens:check` pass from
   the **main checkout** (see [Testing](#testing)). **Android must not regress** — it is the known-good
   platform; re-verify the Penny card on Android after any change to the shared JS path. No change to
   the successful single-code, multi-code, or cancel paths of `useImageScan`; no change to
   `normalizeBarcode` / `applyExpectedFormat` semantics (both are documented as idempotent and have
   callers on three surfaces).

## Tasks / Subtasks

- [ ] **Task 1 — Classify the input on a Mac, then confirm on a device (AC: 1)** ⚠️ before any fix
  - [ ] **Step 0, no device:** get **ifero's actual file** and run the
        [zero-device harness](#zero-device-reproduction-harness). `LOAD_FAILED` / `MISS` / `HIT` selects
        the AC7 branch and may make the device session unnecessary. Do this first — it costs a minute
  - [ ] If `MISS`: measure the file against a **working** card's image — pixel dimensions, module width
        in px, quiet zone in modules, contrast, skew, glare. Vision handles 194 × 40 px low-quality
        JPEG, so the differentiator will be visible
  - [ ] Obtain the Penny card image from ifero; add it to `test-fixtures/` only if licensing is clear
  - [ ] **iOS device** (not simulator): run scan-from-image; log the raw `ImageCodeScanner.scan` return
        value **and** any rejection verbatim. Watch the Xcode console for the Swift `print` trail — it
        names which of the six preprocessing candidates ran (**Q1**)
  - [ ] **iOS camera control:** physical Penny card via the add-card camera — AVFoundation, a different
        engine from Vision. Works ⇒ Vision-specific; fails too ⇒ look at the card's print quality (**Q2**)
  - [ ] Cross-check the same image with iOS Photos live-text / the Camera app — that is Vision too, so
        a miss there is strong evidence the framework simply cannot read this image
  - [ ] Record iOS version, device model, build type, image pixel dimensions, file type
        (screenshot/HEIC/JPEG), and `imageOrientation` if reachable
  - [ ] Do **not** re-derive the Android result — ifero already confirmed camera + image both work on a
        Samsung device (2026-07-30). Use it as the known-good control
- [ ] **Task 2 — Split and surface the image-scan failure modes (AC: 2, 3)**
  - [ ] `useImageScan.ts`: replace bare `catch {}` with `catch (err)`; distinguish no-results from thrown
  - [ ] Add a `logger.notify` at each path — literal message, safe tags only, **no barcode/URI/filename**
  - [ ] Add the differentiated copy to `en.ts` **and** `it.ts` (no parity test exists — check by hand)
  - [ ] Extend `useImageScan.test.ts` with a rejected-`scan` case asserting the notify call and the copy
- [ ] **Task 3 — Make the format fallback observable (AC: 4)**
  - [ ] Add `logger.notify` on the `?? 'CODE128'` branch in `useImageScan.ts` and `useBarcodeScanner.ts`
  - [ ] Assert it fires for an unmapped label and does **not** fire for every mapped label
- [ ] **Task 4 — Remove the dead `DATAMATRIX` locale key (AC: 5)** — the symbology set stays at 6
  - [ ] `grep -rn "DATAMATRIX" --include='*.ts' --include='*.tsx' .` to confirm the key is unreferenced
  - [ ] Delete it from `en.ts:526` and `it.ts:529`; run the i18n-consuming suites
  - [ ] Do **not** touch `barcodeFormatSchema`, `BWIPJS_FORMAT_MAP`, `FormatPicker`,
        `SUPPORTED_IMAGE_SCAN_FORMATS`, or either `barcodeTypes` list
- [ ] **Task 5 — Catalogue hint (AC: 6)**
  - [ ] Add `"defaultFormat": "EAN13"` to `penny-market`; run `catalogue/italy.test.ts`
- [ ] **Task 6 — Close or defer the iOS gap, on the branch Task 1 selected (AC: 7)**
  - [ ] `MISS` ⇒ implement crop-and-retry as the recovery action (`allowsEditing: true` on the retry
        only, never the default) and re-test with the cropped input
  - [ ] `LOAD_FAILED` ⇒ fix where the URI/format is produced; AC2/AC3 already make it visible
  - [ ] `HIT` ⇒ only now read `node_modules/react-native-image-code-scanner/ios/ImageCodeScanner.swift`
        end to end and work the four [Defect 4](#defect-4--the-ios-vision-path-this-is-where-the-bug-lives)
        checks in order; timebox a ~30 min spike on `expo-camera`'s unused `scanFromURLAsync`
  - [ ] Write the evidence and the chosen branch into the story's Completion Notes
  - [ ] Whichever branch: confirm the manual-entry escape hatch is reachable and obvious from the
        failure state
- [ ] **Task 7 — Gates + Android non-regression (AC: 8)**
  - [ ] `yarn lint && yarn typecheck && yarn test && yarn tokens:check` from the main checkout
  - [ ] Re-verify the Penny card on **Android** after any shared-JS change — it is the known-good
        platform and must not regress

## Dev Notes

### Files to touch — current state and what must survive

| File                                            | Change              | Current state / what must be preserved                                                                                                                                                                                                                                                                                                                           |
| ----------------------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `features/add-card/hooks/useImageScan.ts`       | UPDATE              | `pickAndScan` (`:106-157`) has 4 outcomes: cancelled/empty-assets → silent return; 0 results → error; 1 result → `onCodeResolved`; 2+ → `multiCodes` capped at **6** (`:141`). `selectCode` (`:91-104`) deliberately re-runs the normalize pipeline (idempotent by design — keep that comment and behaviour). `isProcessing` must still be cleared in `finally`. |
| `features/cards/hooks/useBarcodeScanner.ts`     | UPDATE              | `handleBarcodeScanned` (`:80-110`) guards re-entry via `hasScanned` + a 2 s reset timeout, and fires haptics **before** `onScan`. Touch only the format-mapping fallback.                                                                                                                                                                                        |
| `shared/i18n/locales/en.ts` + `it.ts`           | UPDATE              | `addCard.noCodeFound` block (`en.ts:529-536`) — keep `dismissAccessibilityLabel`, `retryAccessibilityLabel`, `retry`, `manualEntry`, `manualEntryAccessibilityLabel`; `ScannerOverlay` renders those buttons.                                                                                                                                                    |
| `catalogue/italy.json`                          | UPDATE              | `penny-market` at `:293-298`. Schema-validated by `catalogue/types.ts`; `defaultFormat` must be a `barcodeFormatSchema` member.                                                                                                                                                                                                                                  |
| `core/schemas/card.ts`                          | ⛔ **DO NOT TOUCH** | `barcodeFormatSchema` is the **cross-platform** contract — watchOS (Swift) and Wear OS (Kotlin) serialise the same string values. Adding a member is a sync-protocol change. Out of scope by decision.                                                                                                                                                           |
| `features/cards/components/BarcodeRenderer.tsx` | ⛔ **DO NOT TOUCH** | `BWIPJS_FORMAT_MAP` (`:53-60`). Verified working for this payload — a `toSVG`/`toDataURL` round-trip of `2095110257978` as `ean13` succeeds. Not implicated.                                                                                                                                                                                                     |
| `features/cards/components/FormatPicker.tsx`    | ⛔ **DO NOT TOUCH** | Labels are a `Record<BarcodeFormat, string>` (`:35-42`); it stays in sync with the unchanged schema. Note it reads the same `addCard.multiCode.formats.*` keys as the multi-code sheet — so deleting `DATAMATRIX` (AC5) must not disturb the other six.                                                                                                          |

### Guardrails

- **Never `console.*`** — use `core/utils/logger.ts`. `info`/`warn` are `__DEV__`-only no-ops in
  production; only `notify` (Sentry `captureMessage`, 'warning') and `error` (`captureException`) reach
  the field. `notify`'s `message` must be a **string literal** — a compile-time guard rejects anything
  widening to `string`.
- **PII:** a barcode number identifies a person's loyalty account. It must not reach Sentry as a
  message, tag, or context value. Tag values are **not** scrubbed.
- **Layer boundaries (ESLint-enforced, `eslint.config.mjs`):** `core/` must not import React or from
  `features/`. Cross-feature imports are banned by default, but **`add-card → cards` is an explicitly
  sanctioned exception** (`eslint.config.mjs:70-76`), which is why `useImageScan.ts:23` may import
  `ScanResult` from `@/features/cards/hooks/useBarcodeScanner`. **Do not "fix" that import.** The
  reverse direction (`cards → add-card`) is _not_ allowed.
- **`node_modules` edits are a last resort, not a starting point.** The iOS Vision code lives upstream in
  `react-native-image-code-scanner`. Prefer a fix in our own code (AC7a) or an upstream report (AC7b).
  If a `yarn patch` is genuinely warranted, it needs a CI guard so a dep refresh cannot silently drop
  it — the pattern Story 16-19 established for `burnt`. Never hand-edit `node_modules` without one.
- **Do not "fix" `normalizeBarcode` or `applyExpectedFormat`.** Both are documented as idempotent and
  are called from three surfaces plus `selectCode`. Their tests encode the Conad regression.

### Testing

- Co-locate tests beside the subject; `__tests__/` folders are **banned** (CI-enforced). `app/` holds
  no tests.
- Existing suites to extend: `features/add-card/hooks/useImageScan.test.ts` (already mocks
  `expo-image-picker` and `react-native-image-code-scanner`, including the `BarcodeFormat` enum — reuse
  that mock shape), `core/utils/inferBarcodeFormat.test.ts`, `catalogue/italy.test.ts`.
- Coverage gate is **80 % global** over `features/**`, `core/**`, `shared/**`.
- ⚠️ **Run the gates from the main checkout, not this `.claude` worktree** — a bare `yarn test` inside a
  worktree finds 0 tests (no `node_modules`), which reads as a pass.
- ⚠️ **A green Jest run does not prove the fix.** Jest never executes the native decoder; both
  `expo-camera` and `react-native-image-code-scanner` are mocked. AC1's device evidence is the only
  proof that matters here — this is the Story 16.15 lesson (green CI, fatal production crash).
- The pre-push Jest run intermittently SIGSEGVs a worker. Retry the push; **never** `--no-verify`
  (forbidden by CONTRIBUTING).

### Previous story intelligence

- **Story 2.9 (`39cda57`, `aabbffc`)** — the direct ancestor. Image scanning was moved _off_
  `@react-native-ml-kit/barcode-scanning` onto `react-native-image-code-scanner` because ML Kit forced
  an iOS 15.5 pod floor. The same commit introduced `normalizeBarcode` for the Conad
  "EAN-13 reported as 12-digit UPC-A" bug **and** removed `defaultFormat` from 11 brands where CODE-128
  had been guessed wrongly. Read `docs/sprint-artifacts/stories/2-9-scan-cards-from-image-screenshot.md`
  before touching the catalogue — the precedent is _don't guess a brand's format_, so AC6 is justified
  only because the Penny card's own payload is a checksum-valid EAN-13.
- **Story 2.10 (`aabbffc`)** — hardened `bwip-js` quiet zones and clamped QR to a scanner-safe minimum.
  Relevant precedent if AC1 turns out to be a _rendering_ readability problem rather than a decode one.
- **Story 16.14** — established `logger.notify` precisely because `logger.warn` is invisible in
  production. AC3/AC4 are the same pattern applied to the scanner. Read its story file for the tag
  conventions already in use.
- **Story 16.15** — green Jest, fatal production crash, because the runtime differs from Node. Directly
  motivates AC1's device requirement.
- **Story 2.9's parting warning is the headline precedent** — `2-9…md:184` explicitly said barcode
  recognition must be verified on **both** platforms because iOS and Android now run different native
  engines for static images. That was written as a caveat; ifero's Samsung test turned it into the
  diagnosis. The general lesson for the dev agent: on this project, **"it works" is a per-platform
  claim**, never a global one — and Sentry cannot correct you, since its telemetry is ~100 % iOS.

### Git intelligence

Recent commits touching these paths: `569c3c8` (SVG fix), `aabbffc` (barcode reliability + decoder
swap), `39cda57` (iOS hardening + leading-zero recovery), `159c681` (Story 2.9 initial). The most recent
repo work is catalogue-shaped (`7837f35` added Paghi Poco / il Centesimo / Codice Fiscale) — that commit
is the model to follow for AC6, and per the add-a-brand checklist a **format-only** edit needs no logo or
watch-imageset work.

### Library versions (verified against `package.json` @ `7837f35`)

| Library                           | Version                        | Role                                                    |
| --------------------------------- | ------------------------------ | ------------------------------------------------------- |
| `react-native-image-code-scanner` | `^1.1.3`                       | Image decode (iOS Vision / Android ML Kit), TurboModule |
| `expo-camera`                     | `~55.0.16`                     | Live camera decode                                      |
| `@bwip-js/react-native`           | `^4.8.0` (resolved **4.10.1**) | Render — **not** implicated                             |
| `expo-image-picker`               | `~55.0.19`                     | Gallery picker (`quality: 1`, `exif: false`)            |

`react-native-image-code-scanner` always forces `enhanceContrast`, `convertToGrayscale`, and
`tryRotations` on (`src/index.tsx`) — there is no knob to disable preprocessing, and the JS layer
exposes no reason code when the native call fails.

### Project structure notes

- Story file lives in `docs/sprint-artifacts/stories/` (not flat) — required by
  `scripts/lib/story-refs.mjs` and `.github/workflows/mark-story-done.yml`.
- Branch prefix is **`feature/`**, not `feat/` (CONTRIBUTING).
- Sprint tracking: set `16-23-fix-silent-barcode-scan-failures` to `review` in
  `docs/sprint-artifacts/sprint-status.yaml` when the PR opens; the `done` transition is automation's job.

### Out of scope — flag, don't fix

- **Widening the symbology set** (ifero, 2026-07-29) — see
  [Defect 2](#defect-2--symbology-coverage-is-narrower-than-the-ui-implies-bounded-not-widening). If a
  real card in an unsupported symbology turns up, that is its own story.
- **Reintroducing ML Kit on iOS** — structurally blocked, see the ⛔ note in
  [Defect 4](#defect-4--the-ios-vision-path-this-is-where-the-bug-lives).
- **Any Android-side change.** Android works; it is the control. Touch it only to prove non-regression.
- Any change to `expo-camera`'s live-preview UX, `ScannerOverlay`'s mount-error fallback, or the
  multi-code picker's 6-result cap.
- Adding brand assets for Penny Market (the logo already exists; AC6 is a format-only edit).
- Any change to the watch apps' barcode-format enums — the schema is unchanged, so no parity work is needed.

### Answered by ifero

- **2026-07-29 — failing surface:** scan from image / screenshot.
- **2026-07-29 — AC5:** keep the 6 supported symbologies; document the decision; remove the dead
  `DATAMATRIX` key.
- **2026-07-30 — platform: iOS.** A Samsung device decodes the same card correctly via **both** the
  camera and the screenshot/image path. This retired the Android-downscale hypothesis (Android
  downscales harder and still works).
- **2026-07-30 — scope: this card only.** Every other card has always scanned fine on iOS. The iOS image
  path is not broadly broken, so the fix is input-shaped, not structural. Together with the macOS Vision
  measurements this is what turned AC1 into a file-classification step rather than a device hunt.
- **2026-07-30 — Android decoded the correct value**, `2095110257978`, not merely "a scan succeeded". The
  bars are therefore a genuine checksum-valid EAN-13 and the mock-up theory is dead.
- **2026-07-30 — the input is a synthetic digital graphic**, not a photo of the physical card (crisp
  flat-black bars, no noise or perspective). This killed the capture-quality and orientation hypotheses.

### Open questions for ifero

1. **⭐ The only blocker: the actual image file.** Everything reproducible has been eliminated, so the
   answer is in the bytes. Needed: `sips -g all <file>` output (container, colour space, bit depth,
   alpha) and the file itself through the [harness](#zero-device-reproduction-harness). One minute, no
   device, no build. Until then AC7's branch cannot be chosen.
2. Does the **iOS camera** read the physical Penny card? ifero may already know from everyday use. A
   working camera would confirm the card itself is fine and keep the focus on the file path.

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

### Change Log
