# Story 5.7: Create Watch Complication

## Story Information

| Field        | Value                      |
| ------------ | -------------------------- |
| **Story ID** | 5-7                        |
| **Epic**     | 5 - Apple Watch App        |
| **Sprint**   | Next sprint                |
| **Status**   | Backlog                    |
| **Priority** | Medium                     |
| **Estimate** | 3 points                   |
| **Owners**   | PM: Ifero · Dev: — · QA: — |

---

## Story

As an Apple Watch user,
I want a home screen complication that shows my most relevant loyalty card or sync status,
so that I can launch the app or check card readiness quickly without opening the app.

## Context

The watch app already displays the card list and barcode. A complication would make the app feel integrated into the Apple Watch experience and give users faster access to their most important cards.

This story should focus on one complication family that provides a meaningful glance state and a reliable tap target into the watch app.

## Acceptance Criteria

- AC1 — Complication is implemented for at least one supported family, ideally Modular Large or Circular Small depending on the watch target.
- AC2 — The complication provides a glanceable card title or sync status and, when tapped, opens the watch app to the card list or active card screen.
- AC3 — The complication updates with the latest available card data when the watch app syncs or when the complication timeline reloads.
- AC4 — The complication gracefully falls back to a static icon or "No cards" state when no card is synced yet.
- AC5 — The complication is included in the watch target build and passes watchOS compile/validation.

## Implementation Approach

1. Review the current watch app target and identify the supported complication families in `WatchKit`.
2. Add a complication target or extension if missing, with an initial timeline provider and sample data.
3. Use the synced card metadata from the watch's local database or `CardStore` to render the complication content.
4. Support a tap action that opens the watch app to the card list or most recently used card.
5. Validate on device/simulator that the complication updates, appears on the watch face, and survives timeline reloads.

## Tasks

- [ ] Add or update the watch complication target in `watch-ios/`.
- [ ] Implement complication data provider using existing synced card state.
- [ ] Add fallback state for "No cards available".
- [ ] Add watchOS unit/regression test for complication timeline generation.
- [ ] Validate complication on device or simulator.
- [ ] Document the supported complication family and any watch face limitations.

## Definition of Done

- [ ] Complication builds successfully in the watch target.
- [ ] Complication can be added to a watch face and responds to tap.
- [ ] Complication content updates from synced card state.
- [ ] No watchOS runtime or build errors are introduced.
- [ ] Story artifact is updated with validation evidence.
