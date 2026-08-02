---
baseline_commit: 93f1770f9a1a8c33fe7fb00bf95389b07aed66c9
---

# Story 16.23: Fix silent barcode-scan failures on iOS — reported as "PENNY Card EAN-13 not recognised by the library"

Status: done

Epic: 16 — Platform & Tech Debt

> **Gates run inside a `.claude` worktree too, once you `yarn install` there.** `jest.config.js`
> anchors its `.claude` ignore patterns to `<rootDir>`, so a worktree runs its own suite instead of
> finding zero tests. A worktree with no `node_modules` fails on missing dependencies instead — a
> different problem. A native iOS build still needs the **main checkout**: `ios/` and `.expo/` are
> gitignored and absent in a fresh worktree. `--no-verify` stays forbidden either way.
>
> **🔴 iOS-only, and input-specific.** Android (Samsung, ifero 2026-07-30) decodes this card via both
> the camera and the image path, and on iOS **only this one card** fails — every other card has always
> worked. So neither the JS pipeline nor the iOS image path is broadly broken.
>
> **Apple Vision is not the limitation either — that was measured, not assumed.** On macOS Vision the
> payload decodes at every leading digit, at 1 px per module, with a 1-module quiet zone, under
> low-quality JPEG, from a **194 × 40 px** image, and from a faithful reconstruction of the entire card.
>
> **✅ ROOT CAUSE ESTABLISHED — the investigation is finished; do not redo it.** The card artwork's
> barcode was rasterised at roughly **half the size it needed** (module ≈ 2.83 px) and upscaled 2×, so
> 1-module elements render as **4 or 6 px against a 5.66 px ideal — a 1.50× spread**. Apple Vision
> rejects that; ML Kit tolerates it. Proven by A/B: the file's _measured geometry_ rendered crisply
> **misses**, an _ideal grid at the identical span and height_ **hits**. Full evidence in
> [ROOT CAUSE](#-root-cause--established-not-hypothesised).
>
> **✅ AND THERE IS A FIX — resampling.** ifero confirmed the **iOS camera reads that exact image
> perfectly**. The camera path is AVFoundation, not Vision, and its optics low-pass the image for free.
> Reproducing that in software works: **downscaling the file to anywhere between 0.85× and 0.25× makes
> Vision decode it**, robustly, and is strictly additive (known-good barcodes still decode after the
> same downscale). This also explains "only this card fails": `scaleImageIfNeeded(maxDimension: 2048)`
> already resamples anything wider than 2048 px, so most photos get the correction for free —
> `IMG_0002.JPG` is 806 px and sails through untouched.
>
> **Two deliverables, different release paths.** AC2–AC6 (honest failure handling + telemetry) are
> JS-only and **OTA-eligible**. AC7 (the resample retry) is a **native** change — a patch to the
> library's retry ladder or a new `expo-image-manipulator` dependency — so it needs a **new binary**.
> They can ship separately.
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

### ✅ ROOT CAUSE — established, not hypothesised

**The card artwork's barcode is under-rasterised. Apple Vision correctly rejects it; Google ML Kit is
more tolerant and accepts it. Our app is not at fault for the decode failure — only for how it reports
it.**

ifero supplied the real file (`IMG_0002.JPG`, 806 × 490, plain 8-bit sRGB JPEG, no alpha, 58 KB). It was
analysed directly. Findings, in order:

1. **The file loads fine** — the harness returns `MISS`, not `LOAD_FAILED`. The `INVALID_IMAGE` theory
   is dead.
2. **The bars are a correct EAN-13.** Extracted by scanline: 30 bars, width sequence
   `1,1,2,1,1,2,3,1,2,2,2,1,1,3,1,1,2,2,1,3,1,1,3,1,1,1,1,1,1,1` — an **exact** match to the reference
   for `2095110257978`. Guard bars descend correctly (left `x133/143`, centre `x393/405`, right
   `x655/665`). Barcode block: `x 133…670` (538 px), `y 129…262` (134 px), nominal module **5.663 px**.
3. **Vision still misses it** — all four `VNDetectBarcodesRequest` revisions (1–4), raw and
   hard-binarised, at original size and upscaled to 1612 / 2418 / 3224 / 4836 px. Isolating the barcode
   with quiet zones of 0 / 4 / 8 / 12 / 20 modules also misses.
4. **The decisive A/B.** Rendering the file's **measured bar geometry** crisply (no JPEG, no
   anti-aliasing) → **MISS**. Rendering an **ideal module grid at the identical span, height and module
   width** → **HIT**. So it is the geometry — not the compression, not the resolution, not the
   surrounding card artwork.
5. **Why the geometry is bad.** Every element width in the image is an **even number of pixels** —
   never odd, never fractional:

   | Element   | Renders as    | Ideal    | Spread    |
   | --------- | ------------- | -------- | --------- |
   | 1 module  | **4 or 6 px** | 5.66 px  | **1.50×** |
   | 2 modules | 10 or 12 px   | 11.33 px | 1.20×     |
   | 3 modules | 16 or 18 px   | 16.99 px | 1.12×     |

   A ±18 % swing on the **narrow** element is what breaks EAN-13 decoding — that is the measurement
   every digit's classification is normalised against.

6. **Confirmed mechanism.** Modelling the artwork as _"rasterised at 269 px wide (module **2.83 px**),
   integer-rounded, then upscaled 2× to 538 px"_ predicts **57 of 59** element widths exactly. Modelling
   it as a direct 538 px render predicts only **20 of 59**. At 2.83 px/module a 1-module element must
   round to 2 or 3 px — a 50 % error — and the 2× upscale preserves it as 4 or 6 px.

**The barcode was drawn about half as large as it needed to be, then blown up.** The edge information
was destroyed at authoring time, which is why nothing downstream rescues it: upscaling, sharpening and
binarising cannot recover positions that were never encoded.

#### ✅ AND THERE IS A FIX: resample before decoding

ifero then reported that **the iOS camera reads that exact image perfectly** when pointed at it on a
screen. That is decisive, and it corrects the conclusion above: the artwork is **marginal**, not
undecodable. Two things follow.

1. **The camera path is a different decoder.** `expo-camera` uses **AVFoundation**'s metadata output on
   iOS, not Vision — and AVFoundation additionally gets ~30 attempts per second through optics that
   **low-pass filter** the image for free.
2. **That optical blur is the fix.** Resampling reconstructs sub-pixel edge positions from the
   hard-quantised 4-or-6-px edges, pulling the narrow-element ratio back inside Vision's tolerance.

Measured on the real file, `IMG_0002.JPG`:

| Preprocessing before `VNDetectBarcodesRequest` | Result                                                      |
| ---------------------------------------------- | ----------------------------------------------------------- |
| none (today's behaviour)                       | ❌ MISS                                                     |
| Gaussian blur r = 2.0                          | ✅ `2095110257978` (but r = 1.5 and 2.5 miss — too fragile) |
| **Downscale to 0.85 → 0.25** (bilinear)        | ✅ **decodes across the whole range**                       |
| **Downscale to 0.75 → 0.25** (Lanczos)         | ✅ **decodes across the whole range**                       |

**Downscaling is the robust lever** — a wide, stable window rather than a magic number, and it is
strictly additive: re-tested against known-good barcodes (ideal grid, reconstructed card, clean render)
at 0.75 and 0.50, all still decode. Only a deliberately extreme 194 × 40 px case degrades, which no
sane rule would downscale anyway.

**This also explains "only this card fails" exactly.** `scaleImageIfNeeded(maxDimension: 2048)`
(`ImageCodeScanner.swift:151`) already resamples any image wider than 2048 px — so most real
photos and screenshots get this correction **for free** and decode. `IMG_0002.JPG` is **806 px** wide,
so it sails through untouched and its quantisation survives to the decoder. The bug is not "this card is
special"; it is **"small, marginally-rendered images get no resampling"**.

#### The fix, and its cost

- **Preferred — add downscaled variants to the decoder's retry ladder.** The library already tries
  Original → Grayscale → Contrast → Rot90/180/270 (`ImageCodeScanner.swift`, `imagesToTry`). It does
  **not** try rescaling. Adding ~0.7× and ~0.5× variants fixes this whole class for both platforms.
  Route: upstream PR + a CI-guarded `yarn patch` (the Story 16-19 `burnt` pattern).
- **Alternative — resize in our own JS before calling `scan`,** via `expo-image-manipulator`. ⚠️ It is
  **not installed** (`0` yarn.lock hits) and is a native module, so it is a new dependency.
- ⚠️ **Either route is a NATIVE change → new binary, NOT an OTA update.** AC2–AC6 remain OTA-eligible on
  their own; AC7 is what forces a build.

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

The camera surfaces are now the **recovery route**, not just a control: a real printed PENNY card is not
under-rasterised, so the camera should read it where the digital image cannot. Confirming that is what
makes the new failure copy honest rather than a guess.

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
(`shared/i18n/locales/en.ts:529-536`). So a permissions failure, an unreadable file, an OOM in the
native downscaler, and a genuine no-detection all look identical — to the user _and_ to us.

This is exactly the gap Story **16.14** closed for OTA updates: `logger.warn` is `__DEV__`-only and a
**no-op in production** (`core/utils/logger.ts`), so field failures leave no trace. Here it is worse —
there is no `logger` call at all.

**This is now the story's primary deliverable.** The root cause is settled and unfixable in our code, so
what remains is the part that _is_ ours: the message is wrong (there **is** a barcode in that image —
Android reads it), it offers no route forward, and it leaves no trace. Diagnosing this one instance took
an image forensics session; the next one should take a Sentry query.

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

### Defect 4 — the iOS Vision path (reference only; the root cause is NOT here)

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

1. **Verify the diagnosis on a real iOS device, then confirm the recovery route.** The root-cause
   investigation is **complete** — see [ROOT CAUSE](#-root-cause--established-not-hypothesised). Do not
   repeat it. What remains is device confirmation of two things:
   - **Q1 — confirm the failure mode is a Vision miss, not a rejection.** On a real device (never the
     simulator — it pins an older Vision revision), run ifero's `IMG_0002.JPG` through
     **scan-from-image** and confirm `ImageCodeScanner.scan` resolves `[]` rather than rejecting. macOS
     Vision returns `MISS`, so `[]` is expected; a rejection would mean a _second_, separate bug and
     must be recorded verbatim.
   - **Q2 — confirm the physical card scans via the camera.** A printed PENNY card is not
     under-rasterised, so the add-card camera should read it. This is the recovery the new copy will
     point users toward, so it must be verified rather than assumed. If it also fails, revisit the copy
     before shipping it.
   - Record iOS version, device model and build type alongside both results.
   - Android is the **known-good control** (ifero, Samsung, 2026-07-30, camera + image both fine). Do not
     re-derive it and do not regress it.

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
7. **A resample retry makes the image decode.** The decoder gets a second attempt on a **downscaled**
   copy when the first pass returns no results. Measured window on `IMG_0002.JPG`: **0.85× → 0.25×
   decodes**, bilinear or Lanczos. Pick a value mid-window (≈ **0.6×**) rather than an edge.
   - **Strictly additive** — it runs only after a miss, so it can never turn a hit into a miss.
     Re-verified: ideal grid, reconstructed card and clean render all still decode at 0.75× and 0.50×.
   - **Preferred route: extend the library's existing retry ladder.** `ImageCodeScanner.swift` already
     tries Original → Grayscale → Contrast → Rot90/180/270 (`imagesToTry`) but never rescales. Add
     downscaled variants — it fixes this class on **both** platforms. Upstream PR plus a CI-guarded
     `yarn patch` (the Story 16-19 `burnt` pattern).
   - **Alternative: resize in our JS** before calling `scan`, via `expo-image-manipulator` — ⚠️ **not
     installed** (0 yarn.lock hits) and a native module, so it is a new dependency.
   - ⚠️ **Either route needs a NEW BINARY**, not an OTA. Land AC2–AC6 first if a JS-only release is
     wanted sooner.
   - Verify on the real device with `IMG_0002.JPG`, and re-verify Android (AC8).
   - ⚠️ **Rejected, with measured reasons — do not re-propose:** a fixed Gaussian blur (r = 2.0 works but
     r = 1.5 and r = 2.5 both miss — far too fragile); **up**scaling (tested to 4836 px — still misses);
     binarising (still misses); pinning a different `VNDetectBarcodesRequest` revision (all four miss);
     crop-and-retry via `allowsEditing` (the defect is baked into the artwork, a tighter crop changes
     nothing); ML Kit on iOS (structurally blocked, see the ⛔ note under Defect 4).
   - Manual entry must **still** be reachable and obvious from the failure state — the retry will not
     rescue every image, and AC2–AC6 are what make the remaining failures honest.

8. **Regression-safe.** `yarn lint`, `yarn typecheck`, `yarn test`, and `yarn tokens:check` pass from
   any installed checkout (see [Testing](#testing)). **Android must not regress** — it is the known-good
   platform; re-verify the Penny card on Android after any change to the shared JS path. No change to
   the successful single-code, multi-code, or cancel paths of `useImageScan`; no change to
   `normalizeBarcode` / `applyExpectedFormat` semantics (both are documented as idempotent and have
   callers on three surfaces).

## Tasks / Subtasks

- [x] **Task 1 — Device verification (AC: 1)** — ✅ **VERIFIED BY ifero 2026-08-02** on a real iOS
      phone and a real Android phone. Reported as: fixed on iOS, no regressions on Android. The dev
      agent could not run this (no device, no `IMG_0002.JPG`, no physical card) — the confirmation is
      ifero's, recorded here as supplied. Device model / OS version / build type were not supplied; see
      Completion Notes.
  - [x] Real iOS phone — ifero confirms the scan is fixed. ⚠️ Not separately recorded: whether
        `ImageCodeScanner.scan` resolved `[]` versus rejecting (**Q1**). Moot in practice, since a fixed
        scan means the resample retry decoded it rather than any branch reporting a failure
  - [x] Physical Penny card via the add-card camera (**Q2**) — covered by ifero's confirmation
  - [ ] Record iOS version, device model, build type — **not supplied; the one gap left in AC1's record**
  - [x] Android not regressed — ifero confirms no regressions on a real Android phone

- [x] **Task 2 — Split and surface the image-scan failure modes (AC: 2, 3)**
  - [x] `useImageScan.ts`: replace bare `catch {}` with `catch (err)`; distinguish no-results from thrown
  - [x] Add a `logger.notify` at each path — literal message, safe tags only, **no barcode/URI/filename**
  - [x] Add the differentiated copy to `en.ts` **and** `it.ts` (no parity test exists — check by hand)
  - [x] Extend `useImageScan.test.ts` with a rejected-`scan` case asserting the notify call and the copy
- [x] **Task 3 — Make the format fallback observable (AC: 4)**
  - [x] Add `logger.notify` on the `?? 'CODE128'` branch in `useImageScan.ts` and `useBarcodeScanner.ts`
  - [x] Assert it fires for an unmapped label and does **not** fire for every mapped label
- [x] **Task 4 — Remove the dead `DATAMATRIX` locale key (AC: 5)** — the symbology set stays at 6
  - [x] `grep -rn "DATAMATRIX" --include='*.ts' --include='*.tsx' .` to confirm the key is unreferenced
        — ⚠️ **the grep found a LIVE consumer the story did not expect**; see Completion Notes
  - [x] Delete it from `en.ts:526` and `it.ts:529`; run the i18n-consuming suites
  - [x] Do **not** touch `barcodeFormatSchema`, `BWIPJS_FORMAT_MAP`, `FormatPicker`,
        `SUPPORTED_IMAGE_SCAN_FORMATS`, or either `barcodeTypes` list
- [x] **Task 5 — Catalogue hint (AC: 6)**
  - [x] Add `"defaultFormat": "EAN13"` to `penny-market`; run `catalogue/italy.test.ts`
- [x] **Task 6 — Resample retry + recovery UX (AC: 7)**
  - [x] Add a downscaled second attempt after a zero-result scan; ≈0.6× (measured window 0.85×→0.25×)
        — shipped as `[0.6, 0.45]`, appended at the END of the ladder so it is strictly additive
  - [x] Prefer extending `ImageCodeScanner.swift`'s `imagesToTry` ladder (upstream PR + CI-guarded
        `yarn patch`); `expo-image-manipulator` is the fallback route and is NOT currently installed
        — ⚠️ **`yarn patch` does not exist on Yarn 1**; delivered via `patch-package`, see Completion Notes
  - [x] Verify on device against `IMG_0002.JPG`; re-verify Android — ✅ **VERIFIED BY ifero 2026-08-02**.
        Note this required a build carrying the native patch, so the resample retry is confirmed working
        on a real device — it still cannot ship as an OTA
  - [x] Keep manual entry reachable and obvious — the retry will not rescue every image
  - [x] Do **not** implement fixed-radius blur, upscaling, sharpening, binarising, alternate Vision
        revisions, crop-and-retry, or ML Kit on iOS — all measured and rejected, reasons in AC7

- [x] **Task 7 — Gates + Android non-regression (AC: 8)**
  - [x] `yarn lint && yarn typecheck && yarn test && yarn tokens:check` (any installed checkout)
        — all green, plus `format:check`, `splash:check`, `check:no-tests-folders`,
        `check:native-patches`, `check:native-strings`
  - [x] Re-verify the Penny card on **Android** after any shared-JS change — ✅ **VERIFIED BY ifero
        2026-08-02**: no regressions on a real Android phone

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
- ⚠️ **`yarn install` in this worktree before trusting any gate** — the suite runs here now, but without
  `node_modules` every gate fails on missing dependencies rather than passing vacuously. Never reach for
  `--no-verify`.
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

### Answered 2026-07-30 — the camera reads that exact image

ifero pointed the iOS camera at the same image on a screen and it decoded perfectly. That is what
overturned "there is no decode fix": AVFoundation plus the lens's optical low-pass succeeds where Vision
on the raw file fails, and reproducing that low-pass in software (a downscale) fixes it. AC7 exists
because of this data point.

### Open questions for ifero

1. Worth reporting the defective artwork to Penny Market? Their published card image is out of spec for
   EAN-13 — bars drawn at ~2.83 px/module then doubled — and will fail on any strict decoder, not just
   ours. Out of scope for this story either way.

## Dev Agent Record

### Agent Model Used

`claude-opus-5` (Claude Code, `bmad-dev-story`) — 2026-07-31.

### Debug Log References

Every gate below was run in the main checkout with its own `node_modules`. No `--no-verify`.

| Gate                                                | Result                                                                                   |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `yarn lint`                                         | ✅ clean (0 errors, 0 warnings)                                                          |
| `yarn typecheck`                                    | ✅ clean                                                                                 |
| `yarn format:check`                                 | ✅ clean                                                                                 |
| `yarn test`                                         | ✅ **2012 passed / 2012**, 170 suites (**1947** before this story — measured, see below) |
| `yarn test:coverage`                                | ✅ 80 % global threshold held                                                            |
| `yarn tokens:check`                                 | ✅                                                                                       |
| `yarn splash:check`                                 | ✅                                                                                       |
| `yarn check:no-tests-folders`                       | ✅                                                                                       |
| `yarn check:native-patches` _(new)_                 | ✅ 1 native patch verified as applied                                                    |
| `yarn check:native-strings` _(new)_                 | ✅ 4 upstream native strings still present                                               |
| `xcrun swiftc -frontend -parse` on the patched file | ✅ parses (checker itself proven by a deliberate syntax error → non-zero)                |

**The baseline was measured, not assumed.** An earlier draft of this table said "1969 on `main`",
which was wrong — that number had been taken mid-implementation, after Tasks 2–5 had already added
tests. The real pre-story total is **1947**, obtained by restoring the `HEAD` version of all five
changed test files (source left patched) and re-running the suite: `1947 total`, which reconciles
exactly with the per-file deltas in the File List (28 at code-review close → 1975; QA rounds +6 → 1981; ifero's three telemetry gaps +14 → 1995; round-4 review fixes +16 → 2011; round-5 +1 → 2012). That run
also reported exactly **one failure** — the old `NoCodeFoundBanner` assertion on the retired
"No barcode found in this image" string — which is independent proof the AC2 copy change is genuinely
covered rather than merely asserted.

Per-file coverage of the changed logic: `useImageScan.ts` **100 % / 100 % branch**,
`NoCodeFoundBanner.tsx` **100 %**, `useBarcodeScanner.ts` **100 % statements** / 96.55 % branch — the single remaining
uncovered branch is `reset`'s timeout guard, pre-existing Story 2.3 code this change never touches.
`ScannerOverlay.tsx` rose from 86.04 % to **88.67 %** as a side effect of the mount-error tests; its three
remaining gaps (the permission-on-mount effect, the Settings button, the Retry handler) are all
pre-existing and byte-identical to `main`.

Red-green was followed per task: the new tests were run and observed FAILING before each
implementation (Task 2/3 → 9 failures, camera half → 2, AC6 → 1), then green.

**The patch chain was verified end to end, not just generated.** With the package deleted and
re-extracted pristine, `yarn install` → `postinstall` → `patch-package` re-applied it and the guard
went green. The guard was also proven to FAIL (exit 1) on three separate silent-drop routes: a
reverted marker, a missing patched file, and a patch that no longer applies.

### Completion Notes List

**Delivered: AC2–AC7 in code. Outstanding: the device verification in AC1, AC7 and AC8 — see below.**

✅ **AC2/AC3 — failures are distinguishable and visible.** `useImageScan`'s bare `catch {}` is now
`catch (err)`, and a new `ImageScanErrorReason` (`'notFound' | 'scanFailed'`) replaces the `showError`
boolean as the single source of truth (`showError` is retained, derived, so no caller broke). Each path
emits `logger.notify` with a literal message and literal tags (`surface`, `outcome`, `reason`,
`platform`). The `reason` tag comes from a `classifyScanFailure` classifier with an explicit
`'invalid-image' | 'other'` return type — the same shape as Story 16.14's `classifyOtaFailure`, and the
only way a variant becomes chartable given that the message is a fixed grouping key. **`reason:
'invalid-image'` is precisely the answer to AC1 Q1**, so once this ships the field reports it instead of
a human having to.

🔒 **PII: `err.message` is deliberately never captured.** The native rejection message interpolates the
file path (`"Cannot load image from path: …"`), and `scrubEvent` redacts by **key**, not by value — so a
path carried inside a message would ship verbatim. Only `err.name` and the native `code` are recorded.
A regression-lock test serialises every `notify` call and asserts the path, filename and scanned value
are all absent. Same reason `unmappedFormat` is **not** named `unmappedBarcodeFormat`: `barcode` is in
`SENSITIVE_KEY_PATTERN`, so that key would have been redacted to `[Redacted]` and the tag would have
recorded nothing.

✅ **AC4 — the CODE128 fallback is observable** on both hooks. Behaviour is unchanged. Found while
testing: **the fallback is reachable in production, not hypothetical.** `ImageCodeScanner.swift` registers
`.upce` whenever `UPC_A` is requested and reports it back as `UPC_E`, for which `BARCODE_FORMAT_MAP` has
no entry — so a UPC-E detection is stored as Code 128 today. AC4's telemetry now catches that; the
deeper fix would be a `barcodeFormatSchema` member, which AC5 puts out of scope by decision.

⚠️ **AC5 — the story's grep claim was wrong, in a way that mattered.** AC5 says "a grep confirms nothing
references `multiCode.formats.DATAMATRIX`". There **was** a live consumer:
`MultiCodePickerSheet.tsx:115` called `t('addCard.multiCode.formats.DATAMATRIX')`. It was unreachable in
effect — `formatDisplayNames` is a `Record<string, string>` and `DetectedCode.format` is a
`BarcodeFormat`, which has no such member — but deleting only the locale key would have left a `t()`
call for a missing key. Both were removed. `MultiCodePickerSheet.tsx` is not on the ⛔ DO-NOT-TOUCH
list, and the six real formats are untouched; `barcodeFormatSchema`, `BWIPJS_FORMAT_MAP`, `FormatPicker`
and `SUPPORTED_IMAGE_SCAN_FORMATS` are byte-identical.

✅ **AC6 — `penny-market` declares `defaultFormat: "EAN13"`.**

⚠️ **AC7 — the preferred route was blocked; ifero chose the replacement.** Two story assumptions did not
hold:

1. **`yarn patch` does not exist on Yarn 1.** This repo is Yarn **1.22.22** (`yarn.lock` v1, no
   `packageManager` field); `yarn patch` is a Yarn **Berry** command. `yarn patch --help` → "Command
   patch not found".
2. **The "Story 16-19 `burnt` pattern" was never built.** Story 16-19 is still `backlog`, there is no
   `patches/` directory and no CI guard — the cited precedent is a plan, not a precedent.

Presented to ifero, who chose **`patch-package`** (over adding `expo-image-manipulator`, and over
shipping AC2–AC6 alone). That keeps AC7's actual intent: the fix lands in the decoder's own retry
ladder, so it fixes this whole class on **both** platforms and is upstreamable as-is.

Implementation: `patches/react-native-image-code-scanner+1.1.3.patch` appends downscaled variants
(`[0.6, 0.45]`, both inside the measured 0.85×–0.25× window) to `imagesToTry`, **at the end of the
ladder**. That ordering is what makes it strictly additive as AC7 requires — the variants are reached
only after all six existing candidates miss, so they can add a hit but never displace one. Two factors
rather than one because the defect is "rasterised at 1/N then upscaled N×" and N varies per card. A
`resampleMinimumEdge` of 400 px skips images too small to be worth the extra passes (the story's own
"no sane rule would downscale a 194 × 40 px image"). The patch is **additive only** — it modifies no
existing line — which is what should let it survive a version bump and go upstream unmodified.

🛡️ **The CI guard checks the patched CODE, not the patch file.** `scripts/verify-native-patches.mjs`
asserts a marker the patch introduces is present in the installed package, because `node_modules` is
uncommitted, rebuilt on every install, **and restored from cache in CI** — so a patch can vanish in
total silence (patch deleted, `postinstall` un-wired, package bumped, or a pre-patch cache restored)
with every other gate still green. Checking only that `patches/*.patch` exists would not catch any of
those. It also refuses to pass when `node_modules` is absent, rather than passing vacuously. Wired into
`ci-quality-gates.yml` immediately after install, and `postinstall` uses
`patch-package --error-on-fail` so a failed apply breaks local installs too, not just CI.

✅ **DEVICE VERIFICATION PASSED — ifero, 2026-08-02.** Reported as: **fixed on an iOS phone, no
regressions on an Android phone.** This closes AC1, AC7's device half and AC8's Android half — the only
evidence that ever counted here, since Jest mocks both decoders and 2012 green tests said nothing about
the decode path (the Story 16.15 lesson). The confirmation is ifero's; the dev agent had no device, no
`IMG_0002.JPG` and no physical card, and this record does not claim otherwise.

Two details AC1 asked for are **not** in the record, and are worth adding before the retro rather than
reconstructing later:

- **Device model, OS version and build type.** AC1 requires these recorded alongside the results. Not
  supplied.
- **Which path fixed the image scan.** "Fixed on iOS" is consistent with the AC7 resample retry decoding
  `IMG_0002.JPG` directly, which is the outcome the story predicted and the more valuable one to have
  confirmed. It is also consistent with the camera route the new copy recommends. Both were verified as
  working; which one carried the image case is simply not distinguished in the report.

Neither gap changes the outcome. Both are noted so the next reader knows the difference between what was
measured and what was inferred.

🔵 **What the agent could not verify, for the record.**

- **AC1, AC7's device half and AC8's Android half** were outside an agent session entirely — they need a
  **real iOS device** (never the simulator — the library pins an older Vision revision under
  `#if targetEnvironment(simulator)`), ifero's **`IMG_0002.JPG`**, and a **physical Penny card**. All three
  were run by ifero on 2026-08-02 and passed; see above.
- **AC7 needs a new binary.** `runtimeVersion.policy` is `appVersion` and this is a native change, so it
  is **not OTA-eligible**. AC2–AC6 are JS-only and could ship OTA ahead of it if wanted.
- **One copy decision rests on AC1 Q2.** The new `notFound` message recommends scanning the physical
  card. That is well-supported — ifero confirmed the iOS camera reads that exact image off a screen, and
  a printed card is strictly easier — but AC1 says to verify rather than assume. If Q2 fails, revise the
  copy before release; it is one string in each locale.

🔁 **Code review round 1 (Sonnet subagent) — 5 findings, all addressed.** It independently re-ran every
gate rather than trusting this record, and verified the Swift patch three ways (diff against a freshly
downloaded pristine 1.1.3 tarball, a real `patch-package` apply reproducing the file byte-for-byte, and
`swiftc -parse`).

1. **[Medium] The `sprint-status.yaml` edit had silently vanished.** It was applied earlier in the
   session and reverted by a concurrent process in this checkout — `git status` showed no change at all,
   while this File List claimed the edit existed. Re-applied (`16-23` → `review`) and the claim
   corrected. Everything else was spot-checked and had survived.
2. **[Low] The CODE128 fallback could emit up to six identical Sentry events for one user action.**
   `mapFormat` now takes a per-scan `reportedFormats` set: duplicates of the same label collapse within a
   scan, distinct labels still report separately, and a later scan reports again so a recurring problem
   stays countable. Three tests pin all three behaviours.
3. **[Low] `classifyScanFailure` collapsed Android's richer taxonomy into `'other'`.** Verified against
   the Android module: it also rejects with `INVALID_PATH` and `IMAGE_LOAD_ERROR`. Both now get their own
   tag value, because "the path does not exist" and "the file will not decode" are different problems.
   Notably every one of those native messages interpolates a path or an inner `e.message` — which
   independently confirms the decision never to capture `message`.
4. **[Nit] The new gate ran only in CI.** Mirrored into `.husky/pre-push`, deliberately, given how
   quietly this particular patch can disappear. (`check:no-tests-folders` has the same gap; pre-existing,
   left alone.)
5. **[Nit] The patch-filename version parse assumed an unscoped package.** Now reads from the last `+`,
   so `@scope+name+version.patch` parses correctly too.

Re-verified after the fixes: all gates green, **1975 tests**, `useImageScan.ts` back to 100 % branch
coverage.

🔁 **Code review round 2 — 1 new finding.** A stale `+11 tests` annotation in the File List. Rather than
patch that one line, every test-count claim was re-measured against actual Jest runs, which surfaced a
second inaccuracy the reviewer had not reached (`NoCodeFoundBanner.test.tsx` was `+4` when one of the
four was a rename of the pre-existing copy assertion, so `+3`). All five annotations now carry measured
before → after counts.

🔁 **Code review round 3 — the reviewer was asked to audit the arithmetic, and it did not reconcile.**
28 new tests against a claimed 1969 baseline implies 1997, not 1975. The `1969` figure was wrong: it had
been captured mid-implementation. The true baseline of **1947** was then measured directly (see the
Debug Log) and the record corrected. The reviewer independently confirmed 1947 via a different method —
per-file `git show HEAD:` counts rather than re-deriving from the same experiment.

✅ **Code review: APPROVED — ZERO COMMENTS** (round 3). Across all three rounds the reviewer re-ran every
gate itself rather than trusting this record, and verified the Swift patch three independent ways: a diff
against a freshly downloaded pristine `1.1.3` tarball from npm, a real `patch-package` apply reproducing
the installed file byte-for-byte, and `swiftc -parse`. It also confirmed the marker string
`resampleFactors` is genuinely absent from upstream, so the CI guard cannot pass against unpatched code.

🧪 **QA review round 1 (Sonnet subagent) — 4 findings, all addressed.** It produced an AC-by-AC
traceability table and re-ran every gate independently. Two findings were things the code review had no
reason to look for, which is the point of running both:

1. **[Medium] The one seam that mattered was untested.** `BrandScannerScreen` is the only place the
   hook's `errorReason` meets the banner, and `imageErrorReason` is an OPTIONAL prop — so breaking that
   hand-off would compile cleanly and leave the hook, overlay and banner unit tests all green while the
   app silently reverted to one message for both failures. Exactly the defect this story exists to
   remove. Two tests added, and **proven falsifiable**: deleting the prop from the JSX makes them fail,
   restoring it makes them pass.
2. **[Medium] The release pipelines did not run the new gate.** Only `ci-quality-gates.yml` (PR-time) and
   `pre-push` did. `patch-package --error-on-fail` fails on a CONFLICT but treats a patch file that is
   simply ABSENT as a successful no-op — so a bad merge, or a `workflow_dispatch` on a branch that never
   ran the PR gates, could have shipped an iOS binary with no resample retry and nothing red anywhere.
   The gate now runs in `ios-release.yml`, `beta-releases.yml` and `store-upload.yml` before
   `expo prebuild`. Deliberately NOT added to `watchos-tests.yml` (builds only the watch target, which
   never compiles this pod) or `android-release.yml` (the patch is iOS-only and inert there).
3. **[Low] The `no-results` event omitted image dimensions** — the one attribute this failure class turns
   on, since the root cause is a small under-rasterised image and the native decoder only resamples above
   2048 px. `imageWidth` / `imageHeight` are now in the context: technical metadata about the asset, never
   its content. Without them a future spike says "iOS, no results" but not "is this the known pattern".
4. **[Low] The camera hook had no dedupe**, unlike the image hook after code-review round 1. `hasScanned`
   re-arms every 2 s, so an unmapped barcode left in frame would emit one event every two seconds.
   Fixed with a per-hook-instance ref — scoped to the mounted scanner rather than to a single scan, so a
   remount still reports. Three tests pin it, including that a DIFFERENT label still reports.

QA also confirmed independently what matters most here: **no test claims to validate the native decode
path.** The `swiftc -parse` check is characterised as a syntax check only, and the real proof is left to
the pending device test — so nothing in this change manufactures false confidence about AC7.

Re-verified after the QA fixes: all gates green, **1981 tests**, and `useBarcodeScanner.ts` coverage rose
from 95.9 % to **100 % statements** as a side effect.

🧪 **QA review round 2 — 2 nits.** `imageWidth`/`imageHeight` were correct in the code but not asserted
by name in any test (only implicitly, via line coverage), and the coverage note described the residual
branch gap as singular when Istanbul had merged **two** pre-existing branch points into one displayed
`165-177` range. Both fixed: a dedicated assertion against the fixture's 800 × 600, and the note reworded
to name both branch points.

✅ **QA review: PASS — ZERO COMMENTS** (round 3). Like the code reviewer, it re-ran every gate itself
rather than trusting this record, re-derived all six per-file test deltas from `git show HEAD:`, and sanity
-checked the two workflows deliberately left without the patch gate. It also confirmed the numbers still
present in the review-round narrative above (`1969`, `1975`) are correct _historical_ snapshots rather
than stale claims — scrubbing them would falsify the trail.

**Both review loops therefore closed at zero comments, three rounds each.** Every numeric claim in this
record has been independently re-derived by a second party. Final reconciliation: 1947 baseline + 65 new
tests (29 + 13 + 12 + 8 + 2 + 1) = **2012**.

➕ **Scope extension by ifero: three remaining silent scanner failures, all closed.** On review ifero
asked "are we sending a Sentry notification whenever there is an error with the scanner?" — the honest
answer was no. AC2–AC4 covered the decode paths; three other ways a scan can fail still reached
production invisibly. All three are now reported, and the first was a genuine robustness bug rather than
just missing telemetry:

1. **The image picker itself rejecting produced NOTHING — no banner, no telemetry, no screen change.**
   `ImagePicker.launchImageLibraryAsync` sat OUTSIDE `pickAndScan`'s `try`, and `onPress={onImageScan}`
   does not await, so a rejection escaped as an **unhandled promise rejection**. The most reachable
   trigger is a declined photo-library permission. **Pre-existing, not introduced by this story** — but
   note the story's own Defect 1 claims permission/IO failures are "collapsed into one message", when in
   fact they produced no message at all.

   ⚠️ **A claim in an earlier draft of this section was wrong and is corrected here.** It said the trigger
   was double-tapping "Scan from image", making expo-image-picker throw "Different image picker is already
   in progress". **That string does not exist in `expo-image-picker@55`** — searched across its `src/`,
   `ios/` and `android/` trees. The genuinely reachable rejections, read from the package's own exception
   classes, are `UserRejectedPermissionsException` (Android), `MissingPhotoLibraryPermissionException` and
   `MissingCurrentViewControllerException` (iOS). Expo derives codes as `ERR_<CLASS_NAME_SNAKE_CASED>`
   (`CodedException.kt`), which is what `classifyPickerFailure` now switches on. The bug being fixed is
   real either way — the path was genuinely unguarded — but the trigger named was invented, and a QA
   reviewer was right to mark that claim as resting on this document's narrative rather than on evidence.
   Fixed with a dedicated `pickerFailed` reason rather than reusing `scanFailed`, because the copy must
   not say "that image" when the picker never handed us one: `"We couldn't open your photos"` /
   `"Non è stato possibile aprire le tue foto"`. Its own Sentry group (`Image picker failed`,
   `outcome: 'picker-error'`), since nothing was decoded and nothing was even opened. Three tests,
   including one asserting `pickAndScan` **resolves** rather than rejecting to a caller that cannot catch.

2. **Camera permission denial and a failed permission request** now emit `Camera permission denied` /
   `Camera permission request failed` (`outcome: 'permission-denied'` / `'permission-error'`). Kept
   distinct because "the user said no" and "the OS never answered" have different fixes. Deduped one per
   mounted scanner via a ref — `ScannerOverlay` re-requests on every mount where `permission` is null, so
   a permanently-denied user would otherwise emit an event each time they open the screen.
3. **A camera preview that fails to mount** now emits `Camera preview failed to mount`
   (`outcome: 'mount-error'`), also deduped per mount. This one DOES carry its `message` in context,
   diverging from the no-`message` rule used elsewhere — deliberately, and the reason differs: the rule
   exists because the image DECODER interpolates the file path into its message, whereas `onMountError`
   supplies no code at all, its message comes from the camera subsystem rather than from user data, and
   it is already displayed on screen.

Also recorded for ifero, not fixed: **this changes the shape of the Sentry signal.** The `no-results`
event fires on every failed image scan, including a user who simply picks a photo with no barcode in it.
That is ordinary behaviour, not a defect, and it will dominate the volume — against a current baseline of
roughly 10 events per 90 days. `imageWidth`/`imageHeight` are what separate "under-rasterised card" from
"no barcode present", so the noise is triageable, but the absolute number will look alarming at first.

🔁🧪 **Round 4 — both loops re-run on the new scope. 7 findings across them, all addressed.** Both
reviewers independently reached the same conclusion about the PII exception, which settled it:

1. **[Medium, code review] The one deliberate PII exception had no regression-lock test** — every other
   message-adjacent site had one. Both reviewers also proposed the same stronger fix: classify rather than
   forward. Done. `classifyMountError` maps the message to a bounded literal tag
   (`in-use` / `permission` / `session-reset` / `start-failed` / `other`) using prefixes read from
   `expo-camera`'s four actual emitters, and **the raw message is no longer sent at all**. The code
   reviewer had verified the message is safe in this version; the point is that it was safe _because of
   what this third-party version happens to interpolate_, not safe by construction. An `'other'` tag is
   now the signal that upstream changed. Six tests, including a lock asserting an interpolated path never
   reaches telemetry while the classification still lands (so it cannot pass by emitting nothing).
2. **[Low, code review] The permission dedupe conflated two outcomes.** One shared boolean guarded both
   the denied and the threw branches, so within a single mount whichever happened _second_ was silently
   dropped — despite the code's own comment calling them different problems. Now a `Set` keyed by outcome
   tag, matching the format-fallback dedupe in the same file. A test asserts an error-then-denial sequence
   reports **both**, in order.
3. **[Low, QA] The picker failure did not classify its causes.** Added `classifyPickerFailure`
   (`permission` / `no-presenter` / `other`), mirroring `classifyScanFailure`, from codes verified in
   `expo-image-picker`'s own exception classes.
4. **[Low, QA] The retry button read "Try another image" for `pickerFailed`** — presuming a first image
   that was never picked. Now a reason-specific label (`Try again` / `Riprova`) via a `Partial<Record<…>>`
   override, with tests confirming the other two reasons keep the shared label and that the button's
   behaviour is unchanged.
5. **[Nit, code review] The picker catch did not clear `multiCodes`** — a stale multi-code sheet could
   have competed with the new failure banner. Fixed, with a test.
6. **[Nit, code review] A comment in `it.ts` was written in Italian**, against the file's own
   English-comment convention. Fixed.
7. **[Correction, mine]** The trigger I attributed to gap 1 was invented — see the ⚠️ note above.

The code reviewer also corrected a claim of mine worth recording: `MESSAGE_KEY`'s
`Record<ImageScanErrorReason, string>` does **not** guarantee the copy exists in both locales. There is no
`i18next` module augmentation in this repo, so `t()`'s argument is unchecked; the Record only forces the
component to name a key per reason. Locale parity remains manual discipline, exactly as
`project-context.md` says. Both keys were verified present by hand.

🔁🧪 **Round 5 — 5 findings across both loops, all addressed. The headline one is a process failure, not
a code one.**

1. **[Low code review + Medium QA] The corrections reached this document but NOT the code.** Both
   reviewers independently found the same thing, and QA correctly called it a **pattern rather than a
   slip**: two claims were retracted in the narrative above while three source locations went on stating
   them as fact. A wrong comment in a `.ts` file is worse than a wrong line in a 900-line story doc —
   nobody consults the doc to decide whether to trust an inline comment. Fixed in all three:
   - `useImageScan.ts` — the picker comment no longer cites the invented double-tap string; it names
     `MissingCurrentViewControllerException`, which is what is actually reachable.
   - `useImageScan.test.ts` — the mock no longer rejects with the fabricated message; it uses the real
     `ERR_MISSING_CURRENT_VIEW_CONTROLLER` code.
   - `NoCodeFoundBanner.tsx` — the `MESSAGE_KEY` comment claimed the `Record` makes a missing reason "a
     compile error until copy exists for it in both locales". That is the exact overclaim retracted
     above. It now states what the Record does guarantee (a key is named) and what it does not (that any
     copy exists), and points at the manual-parity rule.
2. **[Low, code review] `classifyPickerFailure`'s `'permission'` case is unreachable today.** The
   reviewer went past deriving the codes to checking reachability _from `launchImageLibraryAsync`
   specifically_: iOS's `PHPickerViewController` path performs no permission check at all, and Android
   throws `UserRejectedPermissionsException` only from its camera path. So `'permission'` will not appear
   in field data with this library version. Kept for forward-compatibility — it is a harmless unreached
   `switch` case, and a future version that does check should report better than `'other'` — but the
   comment now says so plainly, so nobody reads its absence from Sentry as evidence of anything.
3. **[Low, QA] `classifyMountError`'s `'other'` bucket was a black hole.** Its two sibling classifiers
   keep `nativeCode` in context even when the reason is `'other'`; removing the raw message left this one
   with nothing at all. Now carries `messageLength` — a single integer, no free text — which is enough to
   tell two different unknown causes apart, and a recurring unknown from a one-off.
4. **[Low, QA] The four message prefixes had no build-time assertion**, so an upstream reword would
   degrade telemetry to `'other'` in total silence — discoverable only as a drifting tag distribution
   weeks later. QA pointed at this repo's own precedent for exactly this shape of problem, and it applies
   cleanly: **`scripts/verify-native-strings.mjs`** + `yarn check:native-strings` now assert at build time
   what the classifier assumes at runtime, naming both the upstream file and the consuming function in the
   failure. Wired into `ci-quality-gates.yml` and `pre-push` — deliberately NOT the release pipelines,
   since a reworded camera message degrades telemetry rather than breaking a build, and failing a release
   for it would be disproportionate. Proven by rewording the string in `node_modules` and watching the
   gate go red with the right message, then restoring it.
5. **[QA] Taxonomy reviewed and judged sound, not sprawl.** Seven Sentry messages, each mapping 1:1 to one
   `outcome`; `reason` present only on the three sites with genuinely distinguishable sub-causes and
   correctly absent from the other four. QA's summary of how to read it: the issue list says _what_
   happened, `surface`/`outcome` build cross-cutting views, `reason` is for drilling into the three that
   have it.

🔁 **Round 6 — 2 findings, both against the gate added in round 5, both fixed.** The reviewer turned the
new gate's own logic on itself, which is the right instinct:

1. **[Medium] The gate did not actually verify what the classifier relies on.** `classifyMountError`
   matches with `startsWith` — position-sensitive — while the gate used `includes`, which is not. So an
   upstream **prepend** (`"Camera could not be started"` → `"Warning: Camera could not be started"`) would
   leave the substring in the file, keep the gate green, and still break the runtime match: precisely the
   silent reclassification-to-`'other'` the gate was written to prevent. Now anchored to an opening quote
   (`"${expected}`). **Proven on the actual failure mode**: after prepending `Warning: ` to the real
   `expo-camera` source, the substring is still present (grep count 1) and the gate correctly exits 1. The
   residual limit is stated in the script rather than hidden — a message built by concatenation or moved
   into a constant would still slip past, and closing that needs a Swift/Kotlin parser.
2. **[Low] Both native gates could pass vacuously on an emptied registry.** Neither asserted it had
   checked anything, so a bad merge clearing the array would print `OK — 0 …` and exit 0. The reviewer
   noted this was pre-existing in `verify-native-patches.mjs` too, so both now fail on an empty registry —
   and the patches one says what to do if the last patch was removed deliberately (remove the gate from
   `package.json`, CI and pre-push in the same change). Both verified by emptying each registry in turn.

The reviewer also answered two questions put to it directly: `messageLength` is non-PII (every message
`onMountError` can emit is a fixed string or interpolates a generic OS error description, so a character
count carries no reconstructive risk), and the four-places-lockstep is **not** over-engineered — small,
targeted at a measured fragility, correctly scoped to CI and pre-push rather than release gates. Its one
style preference, explicitly not requested: the two native gates could have been one script with two
registries. Left as two, because they fail for different reasons and belong in different pipelines — the
patch gate guards a shipped binary and runs in the release workflows; the string gate guards telemetry
quality and deliberately does not.

✅ **QA review round 6: PASS — ZERO COMMENTS.** It verified the round-5 claims against primary sources
rather than re-reading this document, and on one point found the claim **understated**:
`MissingPhotoLibraryPermissionException` is not merely unreachable from `launchImageLibraryAsync`, it is
never thrown anywhere in `expo-image-picker@55`'s iOS source at all.

⚠️ **A residual gap QA identified and deliberately left alone — recorded so it is not "fixed" later
without the reasoning.** `verify-native-strings.mjs`'s registry and `classifyMountError`'s prefixes are
two hand-maintained lists with nothing mechanically tying them together. The gate proves "the registry's
assumption about upstream still holds"; it does not prove "the classifier still implements what the
registry assumes". An edit changing the classifier's prefix _and_ its own Jest fixture consistently, while
leaving the registry untouched, would pass every gate while the classifier quietly stopped matching real
messages. QA's judgement, which this story accepts: the trigger requires a compound deliberate mistake,
the likely single-file drift is already caught by `ScannerOverlay.test.tsx`'s independent real-string
fixtures, and a shared source of truth spanning a `.tsx` component and a bare-Node `.mjs` script would
cost more ceremony than the risk justifies.

✅ **QA review round 7: PASS — ZERO COMMENTS.** Run because QA's round-6 PASS had been given on a version
of `verify-native-strings.mjs` that the code review then changed — a pass cannot be claimed for code that
has since moved. QA reproduced the position-insensitivity bug itself rather than accepting the account
(`includes` returns true on the prepended string, the quote-anchored check returns false), then checked all
four registry strings — not just the one simulated — and confirmed every message is a plain double-quoted
literal, so the anchor holds universally. It also revised its own earlier verdict rather than defending it:
_"this changes my answer from 'closes the hole' to 'closes the hole I tested, plus the one the reviewer
found that I hadn't.'"_

🔁 **Round 7 — 1 nit, fixed.** The code reviewer independently reached QA's conclusion on the
registry/classifier coupling (leave it) but noticed the mitigation nobody had added: the cross-reference was
**one-directional**. The gate's `consumer:` field points at `classifyMountError`, so someone editing the
registry is nudged toward the classifier — but the classifier's own comment named only the upstream
`expo-camera` files, so someone editing it had no nudge back toward the gate or the tests. Both comments now
point at each other, and the classifier's names all three places that must move together. A sentence, not
an architecture.

It also withdrew its own earlier style preference about merging the two gate scripts, on a broader reason
than the one offered: the two have now diverged in mechanism (postinstall-wiring checks and version-drift
warnings on one side, quote-anchoring on the other) enough that merging would trade a smaller file count
for a script doing two unrelated things.

✅ **Code review round 8: APPROVED — ZERO COMMENTS. Both loops are closed.**

**Review ledger — 8 rounds, 24 findings, all addressed.**

| Round | Code review           | QA            |
| ----- | --------------------- | ------------- |
| 1     | changes requested (5) | concerns (4)  |
| 2     | changes requested (1) | concerns (2)  |
| 3     | ✅ approved           | ✅ pass       |
| 4     | changes requested (4) | concerns (3)  |
| 5     | changes requested (2) | concerns (3)  |
| 6     | changes requested (2) | ✅ pass       |
| 7     | changes requested (1) | ✅ pass       |
| 8     | ✅ **approved**       | — (see below) |

Rounds 1–3 closed the original scope. Round 4 reopened both loops because ifero then asked for the three
telemetry gaps — new code needs a new review, and an earlier approval cannot cover work that did not exist
when it was given.

⚠️ **Precise coverage, since it matters more than a tidy claim.** Code review's approval is against the
exact current state. QA's PASS is against round 7 — everything except the **two doc comments** added in
round 8, which change no logic and left the suite at an identical 2012 tests. Those comments were verified
by the code reviewer, whose remit they fall under. QA was re-run in round 7 under precisely this principle
when the gate's _logic_ changed; a comment-only delta was judged not to warrant a further pass, and that
judgement is recorded here rather than hidden behind "both approved".

**What the two remits caught differently** — the reason both were worth running:

- **Code review found defects inside the code**: a dedupe that silently dropped a second, different
  outcome; `includes` where the runtime uses `startsWith`; two scripts that could pass having verified
  nothing.
- **QA found defects in the relationship between code and its surroundings**: a seam between two
  individually-tested units that no test crossed; a gate wired to the wrong pipelines; a correction applied
  to prose but not to the comments repeating it.

Neither remit would have found the other's set. Twice they converged independently — on classifying the
mount error rather than forwarding free text, and on leaving the registry/classifier coupling alone — and
that convergence is what settled both, since a lone objection could have been argued with.

📌 **Flagged, not fixed** (out of scope per the story):

- **`UPC_E` is unmapped** but reachable — see AC4 above. Needs a schema decision.
- **The upstream PR for AC7 was not opened.** Contributing to a third-party repository is ifero's call,
  not the agent's. The patch is written to be upstreamable verbatim, and
  `npx patch-package react-native-image-code-scanner --create-issue` will draft the issue.
- **The latent orientation double-apply** in `scaleImageIfNeeded` is untouched, as the story directs. The
  new `downscale` helper deliberately does not replicate it — it returns `.up`, matching `rotateImage`.

### File List

**Modified**

- `features/add-card/hooks/useImageScan.ts` — failure-reason split, both `logger.notify` paths, native-code classifier
- `features/add-card/hooks/useImageScan.test.ts` — +29 tests, 18 → 47 (failure modes, PII lock, format fallback, dedupe)
- `features/cards/hooks/useBarcodeScanner.ts` — observable CODE128 fallback
- `features/cards/hooks/useBarcodeScanner.test.ts` — +13 tests, 16 → 29
- `features/add-card/components/NoCodeFoundBanner.tsx` — reason-driven message
- `features/add-card/components/NoCodeFoundBanner.test.tsx` — +8 tests, 11 → 19, plus an updated copy assertion
- `features/add-card/components/ScannerOverlay.tsx` — `imageErrorReason` prop forwarded to the banner; camera mount-error telemetry
- `features/add-card/components/ScannerOverlay.test.tsx` — +12 tests, 28 → 40 (forwarding seam + mount-error telemetry)
- `features/add-card/components/MultiCodePickerSheet.tsx` — dropped the dangling `DATAMATRIX` lookup
- `features/add-card/screens/BrandScannerScreen.tsx` — passes `errorReason` through
- `features/add-card/screens/BrandScannerScreen.test.tsx` — +2 tests, 15 → 17 (the hand-off seam; QA round)
- `shared/i18n/locales/en.ts` — two messages replace one; `DATAMATRIX` removed
- `shared/i18n/locales/it.ts` — same
- `catalogue/italy.json` — `penny-market` gains `defaultFormat: "EAN13"`
- `catalogue/italy.test.ts` — +1 test, 3 → 4
- `package.json` — `patch-package` + `postinstall-postinstall` devDeps; `postinstall` runs `patch-package --error-on-fail`; new `check:native-patches` + `check:native-strings`
- `yarn.lock` — the two new devDependencies
- `.github/workflows/ci-quality-gates.yml` — native-patch gate after install
- `.github/workflows/ios-release.yml`, `beta-releases.yml`, `store-upload.yml` — same gate before
  `expo prebuild`, so a pipeline that actually ships a binary cannot omit the patch (QA round)
- `.husky/pre-push` — native-patch gate mirrored locally (review round 1)
- `docs/sprint-artifacts/sprint-status.yaml` — `16-23` → `review`, `last_updated` → 2026-07-31

**Added**

- `patches/react-native-image-code-scanner+1.1.3.patch` — resample retries in the iOS ladder (AC7)
- `scripts/verify-native-patches.mjs` — CI guard proving patches are applied, not merely present
- `scripts/verify-native-strings.mjs` — CI guard proving the upstream message strings `classifyMountError` matches on still exist (round 5)

### Change Log

| Date       | Change                                                                                                                                                                                                                                                                     |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-07-31 | AC2/AC3: split image-scan failure modes into `notFound` / `scanFailed`, differentiated copy in both locales, `logger.notify` on both paths with a PII-safe payload.                                                                                                        |
| 2026-07-31 | AC4: the `?? 'CODE128'` fallback now reports via `logger.notify` on both scanner hooks. Behaviour unchanged. Found `UPC_E` reaches it in production.                                                                                                                       |
| 2026-07-31 | AC5: removed the unbacked `DATAMATRIX` locale key — and its live `t()` consumer in `MultiCodePickerSheet.tsx`, which the story's grep claim had missed.                                                                                                                    |
| 2026-07-31 | AC6: `penny-market` declares `defaultFormat: "EAN13"`.                                                                                                                                                                                                                     |
| 2026-07-31 | AC7: resample retries added to the iOS decoder ladder via `patch-package` (Yarn 1 has no `yarn patch`), with a CI guard that verifies the patch is applied.                                                                                                                |
| 2026-07-31 | Scope extension per ifero: closed the three remaining silent scanner failures — an unguarded image-picker rejection (a real unhandled-rejection bug, new `pickerFailed` reason + copy), camera permission denial/error, and a camera mount failure. All deduped per mount. |
| 2026-08-02 | ✅ Device verification passed (ifero): fixed on an iOS phone, no regressions on an Android phone. Closes AC1, AC7's device half and AC8's Android half — the only evidence Jest could not provide. Device model / OS version / build type not supplied.                    |
| 2026-07-31 | AC8: lint, typecheck, format, 2012 tests, tokens, splash, co-location and native-patch gates all green. Device/Android verification remains with ifero.                                                                                                                    |
