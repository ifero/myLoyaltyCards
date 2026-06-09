# Story 9.6a: Watch Usage-Event Architecture (Spike / ADR) [Enabling]

Status: drafted

> Drafted 2026-06-09 via `correct-course` (`sprint-artifacts/sprint-change-proposal-2026-06-09.md`).
> **Owner:** Architect. **Gates:** none to start; its output gates Story 9.6.
> Honours Sprint 14 retro: "Spike-first for Watch/native APIs" + "Mandatory API-currency check."

## Story

As an architect,
I want a validated design for watch→phone usage events,
so that counting watch card opens (Story 9.6) never reintroduces the card-edit conflicts the "watch read-only for MVP" rule was created to prevent.

## Acceptance Criteria

1. **Given** the current watch architecture (phone→watch snapshots only; watch is read-only for card data)
   **When** the ADR is produced
   **Then** it specifies a **`CARD_USED` (watch → phone)** message in the versioned `SyncMessage` protocol (with `version`, `id`, `usedAt`)

2. **Given** concurrent/duplicate usage events
   **Then** the ADR proves **conflict-free reconciliation** — `usageCount` increments are commutative; `lastUsedAt = max(existing, incoming)` — so no card-data edit conflict is introduced

3. **Given** the watch may be offline / phone unreachable
   **Then** the ADR defines **offline behaviour** (queue on watch, flush on reachability, idempotency/dedup strategy)

4. **Given** the "watch read-only" rule lives in 7 places (CONTRIBUTING, project_context ×2, architecture, epics ×3)
   **Then** the ADR specifies the exact refined wording — _"read-only for card data; usage events permitted"_ — and lists every file/line to update

5. **Given** Epic 10 (Wear OS) must stay consistent
   **Then** the ADR confirms the same protocol/strategy is adoptable on Wear OS (Wearable Data Layer)

6. **(API currency)** Any WatchConnectivity APIs used (e.g. `transferUserInfo`, `sendMessage`, application context) are verified current/non-deprecated via Context7 / official docs.

## Tasks / Subtasks

- [ ] Review current `react-native-watch-connectivity` + WatchConnectivity capabilities for watch→phone delivery (guaranteed vs best-effort); verify API currency (AC: 1, 6)
- [ ] Design the `CARD_USED` message + the phone-side handler that applies commutative increments (AC: 1, 2)
- [ ] Define offline queue + flush + dedup/idempotency (AC: 3)
- [ ] Specify the read-only wording refinement + the exact edit list across the 7 references (AC: 4)
- [ ] Confirm Wear OS adoptability (AC: 5)
- [ ] Write the ADR to `docs/architecture/adr/` (or `docs/`); get **PM** confirmation that pulling usage past the "read-only-for-MVP" line is in scope
- [ ] On acceptance, mark 9.6 `ready-for-dev`

## Dev Notes

- **Why this is a spike:** Story 9.6 reverses a _deliberate_ MVP simplification. The risk is sync conflicts — but usage is **near-commutative** (increment + max-timestamp), which is the key insight that likely keeps it conflict-free. The ADR must validate this, not assume it.
- **Existing channel:** `core/watch-connectivity.ts` already does phone→watch `applicationContext` snapshots + a `requestCards` ping watch→phone. A `CARD_USED` event extends the watch→phone direction that already exists for `requestCards` — so the watch is not "read-only" in the strict sense today (it already sends control messages); the refinement clarifies _data_ vs _signal_.
- **Phone increment source of truth:** Story 9.1 (`features/cards`) already increments `usageCount`/`lastUsedAt` on phone display — reuse that path for incoming watch events.

### References

- Proposal: [sprint-change-proposal-2026-06-09.md](../sprint-change-proposal-2026-06-09.md)
- Sync rules: [docs/project_context.md](../../project_context.md) (§ Sync Patterns / Watch App Rules), [docs/architecture.md](../../architecture.md)
- Watch connectivity: [core/watch-connectivity.ts](../../../core/watch-connectivity.ts)

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Amelia) — initial ADR draft via correct-course

### Debug Log References

### Completion Notes List

- **ADR draft produced 2026-06-09** → [`docs/adr-2026-06-09-watch-usage-events.md`](../../adr-2026-06-09-watch-usage-events.md), Status **Proposed**. Covers the `CARD_USED` message, the commutative conflict-safety argument, offline/dedup, the read-only refinement + exact 7-reference edit list, Wear OS consistency, and an API-currency note. **Awaiting PM scope confirmation + Architect ratification** before 9.6 goes `ready-for-dev`.

### File List

- `docs/adr-2026-06-09-watch-usage-events.md` (new — Proposed ADR)

## Change Log

| Date       | Version | Description                          | Author       |
| ---------- | ------- | ------------------------------------ | ------------ |
| 2026-06-09 | 0.1     | Drafted via correct-course (C2 gate) | Amelia (dev) |
