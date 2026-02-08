# Story 4.1: Welcome Screen

## Story Information

| Field        | Value                                                   |
| ------------ | ------------------------------------------------------- |
| **Story ID** | 4.1                                                     |
| **Epic**     | 4 - Onboarding Experience                               |
| **Sprint**   | 3                                                       |
| **Status**   | ready-for-dev                                           |
| **Priority** | High                                                    |
| **Estimate** | Small (0.5-1 day)                                       |
| **Owners**   | PM: John · UX: Sally · Dev: Amelia · Tech Writer: Paige |

---

## User Story

**As a** new user,
**I want** to see a friendly welcome screen on first launch,
**So that** I quickly understand what the app does and can proceed to add my first card.

---

## Acceptance Criteria

### AC1: First Launch

```gherkin
Given I install and open the app for the first time
When the app finishes initial bootstrap
Then I see a Welcome screen with:
  - App title and short tagline
  - Primary CTA: "Get started" (or localized equivalent)
  - Secondary CTA: "Skip" (persists preference)
  - A subtle illustration or brand-safe image
And the Welcome screen is accessible and localized
```

### AC2: CTA Behavior

```gherkin
Given I tap "Get started" on Welcome
Then I am taken to the first-card guidance flow (Story 4.2)

Given I tap "Skip"
Then the Welcome screen does not show again
And the user lands on the main Cards list
```

### AC3: Non-Intrusive

```gherkin
Given I have previously completed onboarding
When I open the app
Then the Welcome screen does not appear
```

---

## Technical Requirements

- New file: `app/welcome.tsx` (screen)
- Persist `first_launch` boolean using the existing `features/settings` API (AsyncStorage-backed). Add `first_launch: boolean` to `features/settings` typings and use `features/settings` getters/setters to check at bootstrap time.
- Welcome should be responsive and follow theme tokens from `shared/theme`
- Add route `/welcome` and show it on first launch before `app/index.tsx` card list
- Accessibility: semantic headings, proper labels for CTAs
- TestIDs: add `testID="welcome-get-started"` to primary CTA and `testID="welcome-skip"` to secondary CTA

Testing notes:

- Unit: add a unit test that clears `features/settings` then mounts `app/_layout.tsx` to simulate fresh-install and assert `/welcome` is shown. Use `jest.clearAllMocks()` and ensure AsyncStorage is mocked.
- Integration: add an integration test that taps `welcome-get-started` and asserts navigation to onboarding flow (Story 4.2).
- Accessibility: include a `jest-axe` accessibility snapshot test for the Welcome screen.

---

## Tasks/Subtasks

- [x] Design welcome layout and illustration (ux-designer)
- [ ] Implement `app/welcome.tsx` screen
- [ ] Add persistence for `first_launch` flag
- [ ] Hook screen into app bootstrap flow and routing
- [ ] Add localized strings for English + Italian
- [ ] Add unit + component tests
- [ ] Add story to `sprint-status.yaml` (done by SM)

---

## Testing Checklist

- [ ] Welcome appears on fresh install only
- [ ] "Get started" navigates to onboarding guidance
- [ ] "Skip" lands on card list and persists preference
- [ ] Accessibility: VoiceOver reads heading and CTAs
- [ ] Works offline

---

## Definition of Done

- [ ] All acceptance criteria pass
- [ ] Code is covered by unit and component tests
- [ ] Acceptable visual design reviewed by UX (Sally)
- [ ] Localization strings present and wired
- [ ] Story marked as `ready-for-dev` when reviewed and accepted

---

## Dev Agent Record

- Implementation notes, files changed, and tests will be recorded here by the Dev agent during implementation.
