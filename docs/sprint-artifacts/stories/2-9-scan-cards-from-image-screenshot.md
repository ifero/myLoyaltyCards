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

- OQ-1 (decoder): Use `expo-camera`'s built-in `scanFromURLAsync` — natively implemented on iOS and Android, zero new deps, returns raw string values (AC3 satisfied).
- OQ-2 (image resize): `maxWidth: 2048` / `maxHeight: 2048` in `launchImageLibraryAsync` call.
- OQ-3 (sheet animation): Use `react-native-reanimated` already in the project.
- OQ-5 (Android permissions): `expo-image-picker` plugin in `app.json` handles READ_MEDIA_IMAGES automatically.

**New dependency required:** `expo-image-picker` (photo library picker, not yet installed).

## Dependencies

- `expo-image-picker` (new — photo library access)
- `expo-camera`'s `scanFromURLAsync` (already installed — static image barcode decode)
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
  - `features/add-card/hooks/useImageScan.ts` — core image-scan hook wrapping `expo-image-picker` + `expo-camera`'s `scanFromURLAsync`
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

Full suite: **1372 / 1372 passed** ✅
