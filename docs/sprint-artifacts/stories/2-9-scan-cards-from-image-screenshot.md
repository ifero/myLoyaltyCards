# Story 2.9: Scan Cards from Image or Screenshot

## Story Information

| Field        | Value                                 |
| ------------ | ------------------------------------- |
| **Story ID** | 2-9                                   |
| **Epic**     | 2 - Card Management & Barcode Display |
| **Sprint**   | Next sprint                           |
| **Status**   | review                                |
| **Priority** | High                                  |
| **Estimate** | 3 points                              |
| **Owners**   | PM: Ifero · Dev: — · QA: —            |

---

## Story

As a user who has a loyalty card image or screenshot,
I want to scan the barcode or QR code from that image so I can add the card without needing to retype it.

## Context

Many users store loyalty cards as screenshots or receive them in messages. Camera-only scanning is useful, but a saved photo or screenshot should also be a valid input method.

This feature extends the current scanner flow to support image import and detection, while preserving the exact raw barcode string and existing card setup flow.

## Acceptance Criteria

- AC1: A "Scan from image" option is available in the add-card flow.
- AC2: The app can import an image or screenshot and detect a barcode or QR code from it.
- AC3: Detected values preserve leading zeros exactly as captured.
- AC4: The detected code and inferred format prefill the existing `/add-card/setup` flow.
- AC5: If multiple readable codes are found in a single image, the user can pick the correct one.
- AC6: If no code is found, the app shows a clear retry/error message and allows manual entry.
- AC7: The feature reuses existing scan and card setup routing without introducing a separate workflow.

## Implementation Approach

1. Add image import support in the add-card flow (photo library / screenshot picker).
2. Use an image-based barcode/QR decoder that supports the same formats as the camera scanner.
3. Preserve the raw detected string and infer the barcode format before routing into `/add-card/setup`.
4. Handle multiple detections with a user selection dialog.
5. Keep the experience consistent with the existing scanner flow.

## Tasks

- [x] Add UI for "Scan from image" in the add-card flow.
- [x] Integrate an image decoding library or API for barcode/QR detection.
- [x] Map decoded results to the existing `ScanResult` structure.
- [x] Add selection UI for multiple detections.
- [x] Add regression tests covering image import and leading-zero preservation.
- [ ] Validate the feature on device and in relevant emulators.

## Design

UX design spec: [`docs/ux-designs/2-9-scan-from-image.md`](../../ux-designs/2-9-scan-from-image.md)

**Resolved design questions (pre-dev):**

- OQ-1 (decoder): Originally planned to use `expo-camera`'s `scanFromURLAsync`. Replaced during impl with `@react-native-ml-kit/barcode-scanning` for cross-platform parity (commit `c81d26c`); see follow-up fix below for iOS-specific environment work.
- OQ-2 (image resize): `quality: 1`, no resize — full-fidelity input gives the decoder more bytes to work with on hand-cropped or low-resolution screenshots.
- OQ-3 (sheet animation): Use `react-native-reanimated` already in the project.
- OQ-5 (Android permissions): `expo-image-picker` plugin in `app.json` handles READ_MEDIA_IMAGES automatically.

**New dependencies required:**

- `expo-image-picker` (photo library picker)
- `@react-native-ml-kit/barcode-scanning` (cross-platform image barcode decoding)
- `expo-build-properties` (sets iOS deployment target ≥ 18.0 required by ML Kit's prebuilt frameworks)

## Dependencies

- `expo-image-picker` (photo library access)
- `@react-native-ml-kit/barcode-scanning` (image decode, both platforms)
- `expo-build-properties` (iOS deployment target)
- Existing scan result routing and card setup flow

## Definition of Done

- [x] Users can scan from an image or screenshot.
- [x] Leading zeros are preserved in detected barcode values.
- [x] Multi-code images can be resolved by user selection.
- [x] No new workflow is required outside the existing add-card flow.
- [x] Tests cover the new image scanning path.

---

## Dev Agent Record

### Implementation Summary

- **Branch:** `feature/2-9-scan-from-image`
- **New files created:**
  - `features/add-card/hooks/useImageScan.ts` — core image-scan hook wrapping `expo-image-picker` + `@react-native-ml-kit/barcode-scanning` (originally `expo-camera`'s `scanFromURLAsync`; replaced in `c81d26c` for cross-platform parity)
  - `features/add-card/components/NoCodeFoundBanner.tsx` — 5-second auto-dismiss error banner
  - `features/add-card/components/MultiCodePickerSheet.tsx` — bottom-sheet for selecting one of 2–6 detected codes
- **Modified files:**
  - `features/add-card/components/ScannerOverlay.tsx` — added `onImageScan`, `isProcessingImage`, `imageError`, and banner callback props; added processing overlay + NoCodeFoundBanner + "Scan from image" row
  - `features/add-card/screens/BrandScannerScreen.tsx` — wired `useImageScan` hook; renders `MultiCodePickerSheet` as sibling to `ScannerOverlay`
- **Test files:**
  - `features/add-card/hooks/useImageScan.test.ts` (11 tests ✅)
  - `features/add-card/components/NoCodeFoundBanner.test.tsx` (11 tests ✅)
  - `features/add-card/components/MultiCodePickerSheet.test.tsx` (15 tests ✅)
  - `features/add-card/components/ScannerOverlay.test.tsx` (26 tests ✅)
  - `features/add-card/screens/BrandScannerScreen.test.tsx` (15 tests ✅)

### Acceptance Criteria Checklist

- [x] AC1: "Scan from image" row present in ScannerOverlay when `onImageScan` is provided
- [x] AC2: `expo-image-picker` + `scanFromURLAsync` decode barcodes from photos
- [x] AC3: Leading zeros preserved — raw string returned directly from scanner (covered by `useImageScan.test.ts`)
- [x] AC4: `onCodeResolved({ value, format })` prefills existing `/add-card/setup` flow via `handleScan`
- [x] AC5: 2–6 detected codes trigger `MultiCodePickerSheet`; user selection calls `onCodeResolved`
- [x] AC6: 0 results → `showError` → `NoCodeFoundBanner` with retry, dismiss, manual-entry
- [x] AC7: No new workflow; reuses `handleScan` → `router.push('/add-card/setup')`

### Test Run

Full suite at original story merge: **1372 / 1372 passed** ✅ (see Follow-up Fix below for post-iOS-hardening counts)

---

## Follow-up Fix: iOS image-scan hardening (`fix/2-9-ios-image-scan-mlkit`)

After the original story shipped, on-device iOS testing surfaced three problems that this branch addresses.

### Problems found

1. **iOS build failed with a CocoaPods deployment-target error.**
   `RNMLKitBarcodeScanning` requires iOS ≥ 15.5; the project defaulted to 15.1 because no `ios.deploymentTarget` was set in `Podfile.properties.json`.
2. **iPhone 17 Pro / iOS 26.x simulators were filtered out of `xcodebuild`'s destination list.**
   Root cause was _not_ CoreSimulator state — it was the prebuilt Google ML Kit frameworks (`MLImage 1.0.0-beta7`, `MLKitBarcodeScanning 7.0.0`) shipping a `.framework` (rather than `.xcframework`) whose `arm64` slice is `iOS-Device`-only. CocoaPods correctly auto-emits `EXCLUDED_ARCHS[sdk=iphonesimulator*] = arm64` in `Pods-myLoyaltyCards.*.xcconfig`, which forces the whole app to x86_64-sim and excludes every arm64-only iOS 26 simulator. **There is no config-side fix.** Apple Silicon simulator scanning is currently blocked on Google publishing an arm64-iOS-Simulator slice (or replacing the dep with Apple Vision / vision-camera). Workaround for development: run on a physical iPhone.
3. **ML Kit on iOS returned 12-digit `UPC-A` for Italian Conad EAN-13 cards**, dropping the leading `0`. Saved cards therefore couldn't be re-scanned by Conad's POS.

### Fixes shipped on this branch

**Toolchain & build env**

- Added `.nvmrc` pinning Node `24` (RN 0.83.6's codegen requires `>=20.19.4`; SDK-55 `@react-native/dev-middleware` engine check fails on 20.18.0).
- Enabled the new architecture (`expo.newArchEnabled: true` in `app.json`).
- Set `ios.minimumOsVersion: "18.0"` in `app.json`'s `ios` block plus `expo-build-properties` plugin with `ios.deploymentTarget: "18.0"` so future `prebuild` calls produce a consistent target.
- Added a `string-width: ^4.2.3` resolution in `package.json` to keep the codegen path's `cliui → string-width` `require()` chain on a CommonJS version (string-width@5+ is ESM-only and breaks RN codegen at install time).

**EAN-13 leading-zero recovery (the real card-data fix)**

- New shared util `core/utils/normalizeBarcode.ts`:
  - `normalizeBarcode(value, detectedFormat)` — canonical, math-driven post-scan corrections that are always safe regardless of catalogue context. Trims surrounding whitespace before applying any rule.
    - **UPC-A 12-digit → EAN-13 13-digit-with-leading-0** (gated by checksum). Mathematical equivalence: UPC-A and EAN-13 with country prefix `0` encode identical bar patterns; promoting all 12-digit UPC-A scans to EAN-13 is reversible and well-defined.
    - **UPC-A 13-digit → EAN-13** (label-only). ML Kit on iOS sometimes returns the full 13-digit form but still labels `UPCA`; if the digits validate as EAN-13, just relabel.
    - CODE-128 carrying a 13-digit EAN-13 payload with a valid checksum → EAN-13 (lifted out of the previously-duplicated `intelCorrectFormat` in two hooks).
  - `applyExpectedFormat(current, expectedFormat)` — catalogue-driven hint. When `expectedFormat === 'EAN13'` and the current value is 12 digits whose `0`-prefixed form has a valid EAN-13 checksum, restore the leading zero. Checksum gate prevents corrupting genuine 12-digit non-EAN-13 numeric payloads.
  - `isValidEAN13Checksum` — exported for reuse and testing.
- Both scanner hooks (`useImageScan`, `useBarcodeScanner`) now consume the shared util and accept an optional `expectedFormat?: BarcodeFormat`.
- `BrandScannerScreen` passes `brand?.defaultFormat` (from the catalogue) through both the image-scan path (`useImageScan`) and the camera-scan path (`ScannerOverlay → useBarcodeScanner`). Selecting Conad now restores stripped leading zeros automatically on either path.

**Catalogue cleanup**

- `catalogue/italy.json`: removed `defaultFormat: "CODE128"` from 11 brands where CODE-128 was a fallback assumption rather than a confident classification (`esselunga`, `eurospin`, `pam`, `despar`, `unieuro`, `mediaworld`, `bennet`, `sephora`, `douglas`, `coin`, `hm`). The scanner now decides the format on the fly for those brands.
- `defaultFormat` is now only set on brands where the format is genuinely known: 6 EAN-13 (`conad`, `coop`, `carrefour`, `decathlon`, `tigota`, `ovs`) and 3 QR (`lidl`, `ikea`, `zara`).
- Bumped catalogue `version` from `2026-02-01` to `2026-05-04` for OTA refresh.

### New / modified files (this branch)

- **New:** `core/utils/normalizeBarcode.ts`, `core/utils/normalizeBarcode.test.ts`, `.nvmrc`
- **Modified:**
  - `core/utils/index.ts` (re-export normalize util)
  - `features/add-card/hooks/useImageScan.ts` + tests (consume shared util, accept `expectedFormat`)
  - `features/cards/hooks/useBarcodeScanner.ts` + tests (consume shared util, accept `expectedFormat`)
  - `features/add-card/components/ScannerOverlay.tsx` (accept and forward `expectedFormat`)
  - `features/add-card/screens/BrandScannerScreen.tsx` (pass `brand?.defaultFormat` to both scanner paths)
  - `catalogue/italy.json` (clean up CODE-128 defaults, bump version)
  - `app.json` (enable new arch, set iOS minimum, register `expo-build-properties` plugin)
  - `package.json` + `yarn.lock` (add `expo-build-properties`, pin `string-width@^4`)

### Test Run (post-fix)

Full suite: **1404 / 1404 passed** ✅ across 145 suites. Typecheck clean.

### Known limitations

- Apple Silicon iOS simulators cannot run the app while Google ML Kit ships frameworks without an arm64-iOS-Simulator slice. Use a physical iPhone for now. Tracking item: re-evaluate when GoogleMLKit ≥ 9 podspec-side ships `.xcframework`, or migrate image-scan to Apple Vision / vision-camera.
