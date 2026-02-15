# Story 5.6: Sync Cards from Phone

## Story Information

| Field        | Value                                                   |
| ------------ | ------------------------------------------------------- |
| **Story ID** | 5.6                                                     |
| **Epic**     | 5 - Apple Watch App                                     |
| **Sprint**   | 4                                                       |
| **Status**   | ready-for-dev                                           |
| **Priority** | High                                                    |
| **Estimate** | Medium (1-2 days)                                       |
| **Owners**   | PM: John · UX: Sally · Dev: Amelia · Tech Writer: Paige |

---

## User Story

**As a** user,
**I want** my cards to sync automatically from phone to watch,
**So that** new or updated cards appear on my watch without manual steps.

---

## Acceptance Criteria

### AC1: Sync on Add/Edit/Delete

```gherkin
Given I add a card on my phone
When the watch is connected
Then the new card appears on my watch within 30 seconds

Given I edit a card on my phone
When sync occurs
Then the updated card appears on my watch

Given I delete a card on my phone
When sync occurs
Then the card is removed from my watch
```

### AC2: Retry on Reconnect

```gherkin
Given the watch is disconnected
When it reconnects
Then pending changes are synced automatically
```

---

## Technical Requirements

- Use WatchConnectivity for phone ↔ watch sync
- Sync message includes version field and card payload (no catalogue transfer)
- Implement retry with backoff (3 attempts)
- Ensure watch remains read-only (no outbound edits)

Testing notes:

- Validate sync with multiple cards and large payloads
- Ensure brandId is included so watch can map logo locally
- Verify last-write-wins behavior is applied on phone before sending

---

## Tasks/Subtasks

- [ ] Implement WatchConnectivity messaging
- [x] Define sync message format and versioning
- [x] Add retry + error logging
- [x] Integrate with watch local storage

---

## Testing Checklist

- [ ] Sync completes within 30 seconds when connected
- [ ] Retry works after disconnect/reconnect
- [ ] Watch list reflects phone changes

---

## Definition of Done

- [ ] All acceptance criteria pass
- [ ] Sync is reliable and resilient
- [ ] Watch remains read-only
