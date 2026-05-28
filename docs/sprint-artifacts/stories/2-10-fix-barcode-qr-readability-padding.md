# Story 2.10: Fix Barcode and QR Readability + Quiet-Zone Padding

## Story Information

| Field        | Value                                 |
| ------------ | ------------------------------------- |
| **Story ID** | 2-10                                  |
| **Epic**     | 2 - Card Management & Barcode Display |
| **Sprint**   | 14                                    |
| **Status**   | in-progress                           |
| **Priority** | High                                  |
| **Estimate** | 3 points (Dev: 1-1.5d, QA: 0.5d)      |
| **Owners**   | PM: Ifero · Dev: — · QA: —            |

---

## Story

As a shopper presenting my loyalty card at checkout,
I want generated barcodes and QR codes to be scanner-readable on first try,
so that I can complete checkout quickly without retrying scans.

## Context

Real-device testing reported two linked issues:

1. QR codes are frequently unreadable from the app display.
2. Both linear barcodes and QR codes need more scanner-safe padding (quiet zone).

Current rendering behavior should be hardened so scanner reliability does not depend on device model, brightness variance, or overly tight symbol framing.

This story is a focused bugfix and does not change card data model, routing, or supported barcode formats.

## Scope

- In scope:
  - Improve rendered symbol readability for QR and linear formats.
  - Add explicit quiet-zone padding at barcode-generation level.
  - Verify behavior in all barcode display surfaces on phone.
- Out of scope:
  - New barcode formats.
  - Redesign of card detail UI layout beyond readability requirements.

## Acceptance Criteria

- AC1 — QR code readability is reliable across phone display surfaces (`CardDetails`, fullscreen barcode, barcode flash) with a pass rate of 5/5 successful scans per surface on QA sample payload.
- AC2 — Renderer applies explicit quiet-zone padding for both QR and linear formats using generator options (not only container spacing).
- AC3 — Symbols are not clipped at supported widths/heights and remain high-contrast black on white.
- AC4 — Barcode value and format mapping remain unchanged; no mutation of stored card data.
- AC5 — Automated coverage asserts scanner-safety options/dimensions for QR and linear generation paths.
- AC6 — QA validation matrix confirms both one QR sample and one linear sample (EAN13 or CODE128) pass 5/5 consecutive scans from the device screen in normal checkout-like conditions.

## Implementation Approach

1. Review current barcode generation options and identify where quiet zones are missing or too small.
2. Apply scanner-safe quiet-zone defaults in shared rendering logic used by all phone barcode surfaces.
3. Keep dimensions and scaling deterministic so symbols are not clipped by parent layout.
4. Update existing barcode renderer/component tests to lock option regressions.
5. Run targeted manual validation with representative formats (QR + EAN13/CODE128).

## Tasks

- [x] Update phone barcode rendering defaults for scanner-safe quiet zones.
- [x] Ensure QR and linear sizing remain readable and unclipped at current UI sizes.
- [x] Confirm all phone barcode entry points use the same hardened renderer config.
- [x] Add/update tests for renderer options and dimensions.
- [ ] Execute manual scanner validation matrix (QR + linear).
- [ ] Capture validation evidence in story notes before moving to `review`.

## QA Test Cases

| TC ID      | AC Mapping | Scenario                             | Steps                                                                                             | Expected Result                                                                   |
| ---------- | ---------- | ------------------------------------ | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| TC-2-10-01 | AC1, AC6   | QR reliability in barcode flash      | Open barcode flash for QR sample; perform 5 scan attempts with the same scanner setup             | 5/5 successful decodes with correct payload                                       |
| TC-2-10-02 | AC1, AC6   | QR reliability in fullscreen barcode | Open fullscreen barcode for same QR sample; perform 5 scan attempts                               | 5/5 successful decodes with correct payload                                       |
| TC-2-10-03 | AC6        | Linear reliability in phone surfaces | Use EAN13 or CODE128 sample in barcode flash and fullscreen; perform 5 scans per surface          | 5/5 successful decodes per surface                                                |
| TC-2-10-04 | AC2, AC5   | Quiet-zone options are explicit      | Run unit tests for renderer options; inspect generated options snapshot/assertions                | Non-zero explicit quiet-zone related options are asserted for QR and linear paths |
| TC-2-10-05 | AC3        | No clipping at supported sizes       | Render QR and linear symbols at current app dimensions on detail + fullscreen + flash surfaces    | Symbols are fully visible with no cropped modules/bars                            |
| TC-2-10-06 | AC4        | Data integrity preserved             | Compare scanned/encoded value + format before/after readability fix using same test card fixtures | Stored card barcode value and format remain unchanged                             |

### Evidence Required For Review

- Screenshot or short recording for QR and linear scans in each relevant phone surface.
- Test run output for renderer/unit tests covering option assertions.
- Brief QA matrix summary with pass/fail counts per TC.

## Dependencies

- Existing barcode rendering stack (`@bwip-js/react-native`).
- Existing barcode surfaces in card details and barcode flash flows.

## Definition of Done

- [ ] All acceptance criteria pass.
- [ ] No regressions to existing barcode formats or card data.
- [ ] Updated tests pass.
- [ ] Manual validation evidence is attached to the story.
- [ ] `sprint-status.yaml` keeps the story tracked as `ready-for-dev` until implementation starts.

---

## Dev Agent Record

### Agent Model Used

GPT-5.4

### Debug Log References

- 2026-05-24: Story scaffold extended because the draft lacked Dev Agent Record, File List, Change Log, and Status sections required for BMAD tracking.
- 2026-05-24: Working branch created: `fix/2.10-barcode-qr-readability-padding`.
- 2026-05-24: Hardened the shared phone renderer in `features/cards/components/BarcodeRenderer.tsx` with explicit bwip-js quiet-zone padding for linear and QR output plus a 220px minimum QR size.
- 2026-05-24: Focused barcode validation passed via `yarn test BarcodeRenderer.test.tsx CardDetails.test.tsx FullscreenBarcode.test.tsx BarcodeFlash.test.tsx --runInBand`.
- 2026-05-24: Real-device scanner validation is still pending because this session does not have device/scanner access.

### Completion Notes List

- Added explicit generator-level `paddingwidth` and `paddingheight` defaults for both linear and QR generation paths in the shared phone barcode renderer.
- Enforced a scanner-safe minimum QR render size so phone surfaces passing narrower widths still generate a readable QR symbol without changing barcode data or format mapping.
- Extended renderer regression coverage to lock quiet-zone options and QR dimension floors, then revalidated the `CardDetails`, `FullscreenBarcode`, `BarcodeFlash`, and `BarcodeRenderer` test slice successfully.
- Manual QA evidence for TC-2-10-01, TC-2-10-02, TC-2-10-03, and TC-2-10-06 is still required before the story can move to `review`.

### Change Log

- 2026-05-24: Added BMAD tracking sections to the story so implementation status and remaining validation work can be recorded explicitly.
- 2026-05-24: Hardened shared phone barcode rendering with explicit quiet-zone defaults and a 220px minimum QR size floor.
- 2026-05-24: Added focused regression coverage for quiet-zone options and QR sizing, then validated the phone barcode component slice.

### File List

- `features/cards/components/BarcodeRenderer.tsx` — MODIFIED: Added explicit bwip-js quiet-zone defaults and enforced a scanner-safe minimum QR size.
- `features/cards/components/BarcodeRenderer.test.tsx` — MODIFIED: Added regression coverage for quiet-zone options and QR size clamping.
- `docs/sprint-artifacts/stories/2-10-fix-barcode-qr-readability-padding.md` — MODIFIED: Updated task tracking and implementation notes.
- `docs/sprint-artifacts/sprint-status.yaml` — MODIFIED: Moved Story 2.10 from ready-for-dev to in-progress.

## Status

in-progress
