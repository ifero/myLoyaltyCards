# Story 2.9: Scan Cards from Image or Screenshot

## Story Information

| Field        | Value                                 |
| ------------ | ------------------------------------- |
| **Story ID** | 2-9                                   |
| **Epic**     | 2 - Card Management & Barcode Display |
| **Sprint**   | Next sprint                           |
| **Status**   | Backlog                               |
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

- [ ] Add UI for "Scan from image" in the add-card flow.
- [ ] Integrate an image decoding library or API for barcode/QR detection.
- [ ] Map decoded results to the existing `ScanResult` structure.
- [ ] Add selection UI for multiple detections.
- [ ] Add regression tests covering image import and leading-zero preservation.
- [ ] Validate the feature on device and in relevant emulators.

## Dependencies

- Image picker / file access permissions
- Barcode/QR image decoding library or native API
- Existing scan result routing and card setup flow

## Definition of Done

- [ ] Users can scan from an image or screenshot.
- [ ] Leading zeros are preserved in detected barcode values.
- [ ] Multi-code images can be resolved by user selection.
- [ ] No new workflow is required outside the existing add-card flow.
- [ ] Tests cover the new image scanning path.
