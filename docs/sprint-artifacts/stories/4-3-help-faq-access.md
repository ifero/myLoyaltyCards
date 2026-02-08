# Story 4.3: Help & FAQ Access

## Story Information

| Field        | Value                                       |
| ------------ | ------------------------------------------- |
| **Story ID** | 4.3                                         |
| **Epic**     | 4 - Onboarding Experience                   |
| **Sprint**   | 3                                           |
| **Status**   | ready-for-dev                               |
| **Priority** | Medium                                      |
| **Estimate** | Small (0.5-1 day)                           |
| **Owners**   | PM: John · Tech Writer: Paige · Dev: Amelia |

---

## User Story

**As a** user,
**I want** easy access to help and FAQs from the Welcome screen and Settings,
**So that** I can find answers to common questions and troubleshooting steps quickly.

---

## Acceptance Criteria

### AC1: Access Points

```gherkin
Given I am on the Welcome screen
When I tap "Help" or "FAQ"
Then I see an in-app Help screen with curated content

Given I am in Settings
When I tap "Help & FAQ"
Then I navigate to the same in-app Help screen
```

### AC2: Content

```gherkin
Given I open the Help screen
Then I see:
  - Search box for keywords
  - Short Q&A entries (Add card, Scan, Permissions, Privacy)
  - Links to Submit Feedback or Contact Support
  - Each Q expands to show steps
```

### AC3: Offline Support

```gherkin
Given I have no network
When I view Help
Then content loads from a bundled `help.json` fallback
```

---

## Technical Requirements

- Add `app/help.tsx` screen and route
- Store FAQs in `docs/help.json` (source-of-truth) and bundle a small fallback in the app
- Implement simple search/filter for FAQ list (client-side)
- Add link to contact support (mailto or web URL) and a feedback submission action

---

## Tasks/Subtasks

- [ ] Author initial FAQ entries (Tech Writer: Paige) — add `docs/help.json` sample payload
- [ ] Implement `app/help.tsx` and wire route(s) (Dev: Amelia)
- [ ] Add search and expand/collapse UI (Dev: Amelia)
- [ ] Bundle fallback FAQ data (Dev: Amelia)
- [ ] Add unit and component tests (Dev: Amelia) — include offline fallback test

---

## Testing Checklist

- [ ] Help accessible from Welcome and Settings
- [ ] FAQs search returns relevant results
- [ ] Content available offline from fallback
- [ ] Contact / feedback action opens appropriate target

---

## Definition of Done

- [ ] All acceptance criteria pass
- [ ] Test coverage added
- [ ] Content reviewed by Tech Writer

---

## Dev Agent Record

- Implementation notes and file changes will be recorded by Dev during work.
