# Story 4.2: First-Card Guidance

## Story Information

| Field        | Value                              |
| ------------ | ---------------------------------- |
| **Story ID** | 4.2                                |
| **Epic**     | 4 - Onboarding Experience          |
| **Sprint**   | 3                                  |
| **Status**   | done                               |
| **Priority** | High                               |
| **Estimate** | Medium (1-2 days)                  |
| **Owners**   | PM: John · UX: Sally · Dev: Amelia |

---

## User Story

**As a** new user,
**I want** a short guided flow that helps me add my first loyalty card,
**So that** I can experience value immediately and understand how the app works.

---

## Acceptance Criteria

### AC1: Trigger

```gherkin
Given I have no cards saved and I completed the Welcome screen
When I land on the main screen
Then the app automatically offers a "First card guidance" modal or overlay
```

### AC2: Guided Steps

```gherkin
Given the guidance is shown
When I step through the guidance
Then I can follow 2–3 steps:
  1. "Add your first card" — highlights the Add Card CTA
  2. Offer quick choice: "Scan barcode" or "Add manually"
  3. Confirm success with a short "Nice! Your card is ready" message
```

### AC3: Persistence

```gherkin
Given I complete or skip the guidance
Then the app sets `onboarding_completed` flag and does not show the guidance again
```

### AC4: Failure Modes

```gherkin
Given camera or permission is denied
When user chooses "Scan"
Then the app shows an inline explanation with link to Settings to enable camera
```

---

## Technical Requirements

- Implement reusable `OnboardingOverlay` component (no external native libs if avoidable). Add `testID="onboard-overlay"` and `testID="onboard-add-manual"`, `testID="onboard-scan"` on actions.
- Track `onboarding_completed` flag using `features/settings` (AsyncStorage-backed)
- Offer quick paths into existing flows: navigate to `add-card` or `scan` flow
- Fallback gracefully for camera permission denial

Testing notes:

- Reuse permission test patterns from `2-3-scan-barcode-with-camera.md` (mock `Linking.openSettings` and camera permission mocks). Add unit tests for overlay visibility when `onboarding_completed` is false and integration test that selects `onboard-scan` and handles permission denial path.

---

## Tasks/Subtasks

- [x] Design onboarding overlay (UX)
- [x] Implement `features/onboarding/OnboardingOverlay.tsx`
- [x] Add persistent flag `onboarding_completed`
- [x] Integrate with `app/index.tsx` to show when appropriate
- [x] Add unit tests for overlay (intro, permission-denied, success)
- [x] Add integration tests (simulate flows)
  - [x] Basic flows (overlay visibility, Add manually navigation)
  - [x] Camera permission denial integration test (open Settings flow)
- [x] **Obtain stakeholder (Ifero) review and explicit approval before committing each implementation step.**

---

## Testing Checklist

- [ ] Overlay appears only for users with zero cards and not completed onboarding
- [ ] Steps highlight Add Card and navigate correctly
- [ ] Camera permission denial handled gracefully
- [ ] Flag persists after completion

---

## Definition of Done

- [ ] All acceptance criteria pass
- [ ] Tests cover overlay and flow
- [ ] Components are typed, linted, and reviewed
- [ ] Story progresses from `drafted` → `ready-for-dev` after SM/PM review

---

## Dev Agent Record

- Implementation plan, file list and test outcomes will be documented here by Dev.

### Implementation Plan

- Validate existing integration coverage for camera permission denial flow in `app/__tests__/onboarding.integration.test.tsx`.
- Run full test suite to confirm no regressions.

### Debug Log

- None.

### Completion Notes

- Verified the camera permission denial integration test exists and exercises the Open Settings flow.
- Full Jest suite passed.

## File List

- docs/sprint-artifacts/stories/4-2-first-card-guidance.md
- docs/sprint-artifacts/sprint-status.yaml

## Change Log

- 2026-02-10: Marked camera permission denial integration test as complete; full test suite run.
- 2026-02-10: Stakeholder approval recorded; story marked Ready for Review.
- 2026-02-10: Story marked done (already merged).

## Status

- Status: done
