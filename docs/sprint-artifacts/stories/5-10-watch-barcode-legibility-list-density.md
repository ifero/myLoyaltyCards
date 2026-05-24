# Story 5.10: Watch Barcode Legibility and List Density Polish

## Story Information

| Field        | Value                         |
| ------------ | ----------------------------- |
| **Story ID** | 5-10                          |
| **Epic**     | 5 - Apple Watch App           |
| **Sprint**   | 14                            |
| **Status**   | ready-for-dev                 |
| **Priority** | High                          |
| **Estimate** | 2 points (Dev: ~1d, QA: 0.5d) |
| **Owners**   | PM: Ifero · Dev: — · QA: —    |

---

## Story

As a watch user,
I want the barcode to be larger, the card name to be clearly shown as the screen title, and the list rows to be denser,
so that I can find a card faster and present a scan-ready code with less friction.

## Context

Current watch UX feedback highlights three practical issues:

1. Barcode area is too small for quick, confident scanning.
2. Card name should be used as the barcode screen title for immediate context.
3. Card list rows are too padded, reducing visible card count per screen.

This story is a focused watch polish bugfix and should preserve existing navigation and sync behavior.

## Scope

- In scope:
  - Increase effective barcode rendering area in watch barcode screen.
  - Promote card name to title treatment in barcode view.
  - Reduce list row spacing/padding to improve information density.
- Out of scope:
  - Watch sync protocol changes.
  - New watch navigation flows.
  - New watch card editing capabilities.

## Acceptance Criteria

- AC1 — Barcode render area is increased for both linear and QR formats (target at least 80% of available barcode container width) while keeping scanner-safe contrast and no clipping.
- AC2 — Barcode screen displays the selected card name as title-level context.
- AC3 — Card list row padding/spacing is reduced so visible row density improves on 41mm screens (target: at least +1 additional visible row versus current baseline fixture) without truncation regressions.
- AC4 — Row tap targets remain watch-usable and accessibility-safe.
- AC5 — Existing interaction behavior remains intact: tap row opens barcode view; tap barcode or crown interaction dismisses back to list.
- AC6 — Watch tests/validation artifacts are updated for any changed identifiers/layout assumptions, and automated checks pass for updated watch UI expectations.

## Implementation Approach

1. Rebalance barcode-screen layout to maximize usable symbol area.
2. Move card naming emphasis to title-level presentation in barcode view.
3. Tune `CardRowView` spacing and element sizing for denser but readable list rows.
4. Preserve accessibility and interaction affordances after density changes.
5. Re-run watch UI validation and update tests where needed.

## Tasks

- [ ] Increase barcode view sizing strategy for QR and linear watch formats.
- [ ] Update barcode screen title behavior to show selected card name clearly.
- [ ] Reduce list row padding/spacing and validate readability on 41mm and 45mm previews/simulators.
- [ ] Confirm tap targets and accessibility labels remain valid.
- [ ] Update watch UI tests/fixtures affected by layout/title adjustments.
- [ ] Capture before/after validation evidence in story notes.

## QA Test Cases

| TC ID      | AC Mapping | Scenario                                 | Steps                                                                                | Expected Result                                                                 |
| ---------- | ---------- | ---------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| TC-5-10-01 | AC1        | Barcode size increase (linear)           | Open watch barcode view for linear sample on 41mm and 45mm simulators                | Barcode visually occupies at least 80% of container width and remains unclipped |
| TC-5-10-02 | AC1        | Barcode size increase (QR)               | Open watch barcode view for QR sample on 41mm and 45mm simulators                    | QR symbol area is larger than baseline and unclipped                            |
| TC-5-10-03 | AC2        | Card name as title context               | Open barcode view from list for sample card names (short and long)                   | Selected card name is presented as title-level context and remains readable     |
| TC-5-10-04 | AC3        | List density improvement                 | Compare before/after list with baseline fixture data on 41mm                         | At least one additional row is visible after density changes                    |
| TC-5-10-05 | AC4, AC5   | Interaction and accessibility regression | Validate row tap target behavior, dismiss by barcode tap/crown, and VoiceOver labels | Navigation and dismissal behavior unchanged; accessibility labels remain valid  |
| TC-5-10-06 | AC6        | Test artifact update                     | Run watch UI/unit checks affected by layout/title updates                            | Updated watch tests pass with no identifier regressions                         |

### Evidence Required For Review

- Before/after screenshots on 41mm for list density and barcode view.
- Short note confirming title behavior for short and long card names.
- Watch test run output for updated checks.

## Dependencies

- Existing watch SwiftUI views and barcode generator.
- Existing watch UI tests for card list and barcode screen behavior.

## Definition of Done

- [ ] All acceptance criteria pass.
- [ ] Watch barcode readability is improved in validation runs.
- [ ] Card list density improvement is verified on small and large watch sizes.
- [ ] No regressions in navigation, sync, or barcode dismissal behavior.
- [ ] Story remains `ready-for-dev` in sprint tracking until implementation starts.
