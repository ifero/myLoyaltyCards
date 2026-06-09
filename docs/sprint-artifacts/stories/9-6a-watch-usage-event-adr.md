# Story 9.6a: Watch Usage-Event Architecture (Spike / ADR) [Enabling]

Status: done

> Drafted 2026-06-09 via `correct-course` (`sprint-artifacts/sprint-change-proposal-2026-06-09.md`).
> **Owner:** Architect. **Gates:** none to start; its output gates Story 9.6.
> Honours Sprint 14 retro: "Spike-first for Watch/native APIs" + "Mandatory API-currency check."
> **PM scope confirmed 2026-06-09 (ifero)** — usage-counting (C2) is in scope; watch stays read-only for card data. Status → `ready-for-dev`; ready for the **Architect** to ratify the Proposed ADR (flip → Accepted), fold into `architecture.md` as `ADR-2026-06-09-001`, and apply the read-only wording refinement across the 7 references.

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

4. **Given** the "watch read-only" rule lives in 7 places (CONTRIBUTING, project*context ×2, architecture, epics ×3)
   **Then** the ADR specifies the exact refined wording — *"read-only for card data; usage events permitted"\_ — and lists every file/line to update

5. **Given** Epic 10 (Wear OS) must stay consistent
   **Then** the ADR confirms the same protocol/strategy is adoptable on Wear OS (Wearable Data Layer)

6. **(API currency)** Any WatchConnectivity APIs used (e.g. `transferUserInfo`, `sendMessage`, application context) are verified current/non-deprecated via Context7 / official docs.

## Tasks / Subtasks

- [x] Review current `react-native-watch-connectivity` + WatchConnectivity capabilities for watch→phone delivery (guaranteed vs best-effort); verify API currency (AC: 1, 6) — ✅ `transferUserInfo` (queued, survives relaunch); RN `watchEvents.on('user-info')` batch receive; Simulator-unsupported
- [x] Design the `CARD_USED` message + the phone-side handler that applies commutative increments (AC: 1, 2)
- [x] Define offline queue + flush + dedup/idempotency (AC: 3) — dedup id `"<cardId>:<usedAt>"`, ms-precision `usedAt`
- [x] Specify the read-only wording refinement + the exact edit list across the 7 references (AC: 4) — ✅ all 7 applied 2026-06-09
- [x] Confirm Wear OS adoptability (AC: 5) — ✅ Wearable Data Layer (`MessageClient`/`DataClient`), same shape + reconciliation
- [x] Write the ADR to `docs/architecture/adr/` (or `docs/`); get **PM** confirmation that pulling usage past the "read-only-for-MVP" line is in scope — ✅ ADR ratified; PM confirmed 2026-06-09
- [x] On acceptance, mark 9.6 `ready-for-dev` — ✅ done 2026-06-09

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

- **ADR draft produced 2026-06-09** → [`docs/adr-2026-06-09-watch-usage-events.md`](../../adr-2026-06-09-watch-usage-events.md), Status **Proposed**. Covers the `CARD_USED` message, the commutative conflict-safety argument, offline/dedup, the read-only refinement + exact 7-reference edit list, Wear OS consistency, and an API-currency note. **PM scope confirmation received 2026-06-09 (ifero). Awaiting Architect ratification** (Status Proposed → Accepted) before 9.6 goes `ready-for-dev`.
- **ADR ratified 2026-06-09 (Winston, Architect).** Status → **Accepted**. Validated commutativity + dedup (tightened `usedAt` → ms precision), offline via `transferUserInfo` (verified current; Simulator-unsupported → physical-device test in 9.6), and Wear OS adoptability (Wearable Data Layer). Folded into `architecture.md` as `ADR-2026-06-09-001`; read-only wording refined across all **7 references** (CONTRIBUTING ×1, project_context ×2, architecture ×1, epics ×3); `CARD_USED` added to both documented `SyncMessage` unions. **Story 9.6 unblocked → `ready-for-dev`.**

### File List

- `docs/adr-2026-06-09-watch-usage-events.md` (ADR — now **Accepted**)
- `docs/architecture.md` (SyncMessage union + `CARD_USED` + Watch Editing Policy → ADR-2026-06-09-001)
- `docs/project_context.md` (Sync Patterns + Message Versioning + Watch App Rules)
- `CONTRIBUTING.md` (watch read-only wording)
- `docs/epics.md` (ARCH-20 + Epic 5 note + Epic 10 Wear OS parity)
- `docs/sprint-artifacts/stories/9-6-count-watch-card-opens.md` (gate cleared → ready-for-dev + ADR specifics in Dev Notes)

## Change Log

| Date       | Version | Description                                                                                                                             | Author         |
| ---------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| 2026-06-09 | 0.1     | Drafted via correct-course (C2 gate)                                                                                                    | Amelia (dev)   |
| 2026-06-09 | 0.2     | PM scope confirmed (ifero); status drafted → ready-for-dev; routed to Architect for ADR ratification                                    | Bob (SM)       |
| 2026-06-09 | 0.3     | ADR ratified → Accepted; folded into architecture.md; 7 read-only refs refined; `CARD_USED` added; 9.6 → ready-for-dev; status → review | Winston (Arch) |
