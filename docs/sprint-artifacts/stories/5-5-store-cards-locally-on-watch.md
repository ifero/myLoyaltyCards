# Story 5.5: Store Cards Locally on Watch

## Story Information

| Field        | Value                                                   |
| ------------ | ------------------------------------------------------- |
| **Story ID** | 5.5                                                     |
| **Epic**     | 5 - Apple Watch App                                     |
| **Sprint**   | 4                                                       |
| **Status**   | ready-for-dev                                           |
| **Priority** | High                                                    |
| **Estimate** | Medium (1-2 days)                                       |
| **Owners**   | PM: John · UX: Sally · Dev: Amelia · Tech Writer: Paige |

---

## User Story

**As a** user,
**I want** my cards stored directly on my Apple Watch,
**So that** they are available without my phone nearby.

---

## Acceptance Criteria

### AC1: Persistence

```gherkin
Given cards have been synced to my watch
When I restart the watch app
Then all cards are still available
```

### AC2: Offline Availability

```gherkin
Given my phone is out of range
When I open the watch app
Then I can still view and open any synced card
```

### AC3: Data Integrity

```gherkin
Given the watch app updates
When I reopen the app after update
Then my stored cards are not lost
```

---

## Technical Requirements

- Use SwiftData (or Core Data if needed for compatibility)
- Store full card payload matching the shared schema
- Implement basic migration strategy for future schema changes
- Ensure read-only behavior (no editing on watch)

Testing notes:

- Verify data persists across app restarts and updates
- Validate schema fields align with phone schema

---

## Tasks/Subtasks

- [ ] Create SwiftData models for cards
- [ ] Implement local storage layer (CRUD: read-only for UI)
- [ ] Add lightweight migration/versioning strategy
- [ ] Load stored cards into the list view

---

## Testing Checklist

- [ ] Cards persist across restarts
- [ ] Cards available offline
- [ ] No editing possible on watch

---

## Definition of Done

- [ ] All acceptance criteria pass
- [ ] Local storage is stable across restarts and updates
- [ ] Data model matches shared schema
