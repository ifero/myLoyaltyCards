# Story 5.3: Implement Card List (Carbon UI)

## Story Information

| Field        | Value                                                   |
| ------------ | ------------------------------------------------------- |
| **Story ID** | 5.3                                                     |
| **Epic**     | 5 - Apple Watch App                                     |
| **Sprint**   | 4                                                       |
| **Status**   | ready-for-dev                                           |
| **Priority** | High                                                    |
| **Estimate** | Medium (1-2 days)                                       |
| **Owners**   | PM: John · UX: Sally · Dev: Amelia · Tech Writer: Paige |

---

## User Story

**As a** user,
**I want** to see my cards in a clean, fast list on my Apple Watch,
**So that** I can quickly find and select a card at checkout.

---

## Acceptance Criteria

### AC1: List UI

```gherkin
Given I open the watch app
When the app loads
Then I see a vertical list of cards with OLED-black background
And each card shows its name and visual identifier (brand logo if available, otherwise initials + color)
And the list supports Digital Crown scrolling
```

### AC2: Empty State

```gherkin
Given no cards are synced to the watch
When I open the watch app
Then I see a message instructing me to add cards in the phone app
```

### AC3: Performance

```gherkin
Given I open the watch app from a cold start
When the app launches
Then the list is visible within 2 seconds
```

---

## Technical Requirements

- Use SwiftUI List or ScrollView optimized for watchOS
- Carbon Utility styling: OLED black background, minimal chrome
- Ensure list supports Digital Crown (default with List)
- Display card name and either brand logo (brandId → logo via local catalogue) or initials + color
- No catalogue browsing UI is exposed on watchOS
- Include a lightweight empty state view
- Use read-only data source (local watch storage)

Testing notes:

- Verify list performance on simulator and device
- Validate the empty state message is readable and localized (EN for now)

---

## Tasks/Subtasks

- [ ] Implement CardListView in watch-ios
- [ ] Add Carbon styling tokens (black background, thin separators)
- [ ] Implement empty state view
- [ ] Wire to local card storage (read-only)

---

## Testing Checklist

- [ ] List renders in under 2 seconds on cold start
- [ ] Digital Crown scrolling works
- [ ] Empty state visible when no cards

---

## Definition of Done

- [ ] All acceptance criteria pass
- [ ] Visual styling matches Carbon Utility direction
- [ ] Performance target met in simulator and device
