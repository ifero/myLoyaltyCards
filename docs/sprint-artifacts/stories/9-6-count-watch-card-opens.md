# Story 9.6: Count Card Opens on the Watch

Status: ready-for-dev

> Drafted 2026-06-09 via `correct-course` (`sprint-artifacts/sprint-change-proposal-2026-06-09.md`).
> ✅ **Gates cleared 2026-06-09 → `ready-for-dev`:** [ADR-2026-06-09-001](../../adr-2026-06-09-watch-usage-events.md) **Accepted** (Architect) + PM scope confirmed (ifero). Depends on Story 9.4 (done). Relates to PRD **FR76** (usage recorded on every display surface, incl. watch).

## Story

As a user,
I want opening a card on my Watch to count toward its usage,
so that "most used / recently used" sorting is accurate on both the Watch and the phone (the `usageCount`/`lastUsedAt` counters are shared).

## Acceptance Criteria

1. **Given** I open a card's barcode on the Watch
   **When** the phone is (or later becomes) reachable
   **Then** the phone increments that card's `usageCount` by 1 and updates `lastUsedAt` to the open time

2. **Given** multiple/duplicate usage events (per the 9.6a ADR)
   **Then** reconciliation is conflict-free — increments are commutative, `lastUsedAt = max` — and no card-data edit conflict occurs

3. **Given** the phone is unreachable when I open a card on the Watch
   **When** reachability is restored
   **Then** the queued usage event(s) flush and apply (offline-safe), without double-counting

4. **Given** this feature
   **Then** the Watch remains **read-only for card data** — no create/edit/delete/favourite is initiated from the Watch

5. **Given** usage has been applied on the phone
   **When** the next snapshot syncs to the Watch
   **Then** the Watch list ordering reflects the updated usage (closes the loop with Story 9.4 sync)

## Tasks / Subtasks

### Watch — emit usage events

- [ ] Emit a `CARD_USED` event (per 9.6a ADR) when a card's barcode is displayed on the Watch (AC: 1)
- [ ] Queue events when the phone is unreachable; flush on reachability; dedup/idempotency (AC: 3)

### Phone — apply usage events

- [ ] Handle inbound `CARD_USED` in `core/watch-connectivity.ts`; apply commutative increment + `lastUsedAt = max` via the Story 9.1 usage path (AC: 1, 2)
- [ ] Re-sync the updated snapshot to the Watch (AC: 5)

### Docs / rules (per 9.6a ADR)

- [ ] Apply the refined read-only wording across the 7 references (CONTRIBUTING, project_context ×2, architecture, epics ×3) + add `CARD_USED` to the documented message types

### Tests

- [ ] Phone: inbound `CARD_USED` increments correctly; commutative under duplicates/out-of-order (AC: 1, 2)
- [ ] Watch: offline queue + flush, no double-count (AC: 3)
- [ ] Watch stays read-only for card data — no mutation path added (AC: 4)

## Dev Notes

- **9.6a ADR is now Accepted** ([ADR-2026-06-09-001](../../adr-2026-06-09-watch-usage-events.md)) — implement to its finalized contract:
  - **Message:** `{ version: 1, type: "CARD_USED", payload: { id, usedAt } }`, watch → phone. `usedAt` = ISO-8601 UTC at **millisecond** precision (required for dedup correctness).
  - **Dedup event id** `"<cardId>:<usedAt>"`; phone applies each unique id **once**: `usageCount += 1`, `lastUsedAt = max(lastUsedAt, usedAt)`.
  - **Transport:** `transferUserInfo` (queued / guaranteed / survives relaunch) — **not** `sendMessage` (reachability-gated). Phone receives via `watchEvents.on('user-info', …)`, which delivers a **batch** (incl. pre-launch events) → iterate + dedup; size/persist the dedup window so a late retransmit can't slip past it.
  - **⚠️ Validate on a physical phone+watch pair** — the watchOS Simulator does **not** support `transferUserInfo` (satisfies AC6 / Sprint 14 retro at build time).
- **Watch→phone channel already exists** (`requestCards` in `core/watch-connectivity.ts`) — `CARD_USED` extends that direction; no new transport plumbing class.
- **Reuse the phone usage path** from Story 9.1 (done) for the actual increment so phone and watch opens are counted identically.
- **Shared counter is the whole point:** because `usageCount`/`lastUsedAt` are shared, fixing the watch gap also corrects the phone's frequency/recency sort (the original observation that triggered this work).
- **Wear OS (Epic 10):** mirror the same protocol once built (parity scope added to Epic 10 on 2026-06-09).

### References

- Proposal: [sprint-change-proposal-2026-06-09.md](../sprint-change-proposal-2026-06-09.md)
- ADR gate: [9-6a-watch-usage-event-adr.md](./9-6a-watch-usage-event-adr.md)
- Usage tracking (phone): Story 9.1 (`features/cards`)
- Watch connectivity: [core/watch-connectivity.ts](../../../core/watch-connectivity.ts)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

## Change Log

| Date       | Version | Description                     | Author       |
| ---------- | ------- | ------------------------------- | ------------ |
| 2026-06-09 | 0.1     | Drafted via correct-course (C2) | Amelia (dev) |
