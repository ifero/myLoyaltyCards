# ADR-2026-06-09-001: Watch usage events (refine "watch read-only")

- **Status:** **Accepted** — ratified 2026-06-09 by Winston (Architect); PM scope confirmed 2026-06-09 (ifero). Folded into `architecture.md` as `ADR-2026-06-09-001`. Deliverable of Story **9.6a**; **unblocks** Story **9.6**.
- **Date:** 2026-06-09
- **Drivers:** ifero (stakeholder), `correct-course` (`sprint-artifacts/sprint-change-proposal-2026-06-09.md`)
- **Supersedes wording of:** ARCH-20 ("Watch is READ-ONLY for MVP") — _refines_, does not remove.

---

## Context

Epic 9 promises "most-used cards at the top … on both phone and watch." Card usage (`usageCount`, `lastUsedAt`) is incremented when a card's barcode is **displayed** (Story 9.1) — but **only on the phone**. Opening a card on the Watch displays its barcode yet counts nothing. Because `usageCount`/`lastUsedAt` are a **single shared value** (synced phone↔watch), watch-driven usage is invisible, so the frequency/recency sort (FR21/FR22) is wrong on **both** surfaces for a watch-heavy user.

The blocker is a deliberate invariant: **"Watch is READ-ONLY for MVP (prevents conflicts)"** — qualified everywhere as _"card editing only on phone."_ The rule exists to stop the watch and phone making **conflicting edits to card data** (name, barcode, colour, favourite, deletion).

Key insight: **usage is not card-data editing.** It is an append-only, **commutative** signal. Two increments in any order yield the same result; `lastUsedAt` is a monotonic `max`. So a watch→phone usage channel does **not** create the edit-conflict class the read-only rule guards against.

(The watch is also not strictly "write-nothing" today: it already sends `requestCards` control messages phone-ward via `core/watch-connectivity.ts`.)

## Decision (proposed)

1. **Refine the invariant** from "watch is read-only" to:

   > **The watch is read-only for card _data_** (create/edit/delete/favourite happen only on the phone). The watch **may emit usage events** (card-opened). The phone applies them as **commutative** updates — no card-data edit conflict is introduced.

2. **Add one versioned message, watch → phone:**

   ```jsonc
   {
     "version": 1,
     "type": "CARD_USED",
     "payload": { "id": "<uuid>", "usedAt": "<ISO-8601 UTC, millisecond precision>" }
   }
   ```

   > **Ratification note (precision, 2026-06-09):** `usedAt` MUST carry **millisecond** precision (e.g. `2026-06-09T12:34:56.789Z`). The dedup event id (Decision 4) is `"<cardId>:<usedAt>"`, so sub-second resolution is precisely what guarantees two genuinely-distinct opens of the same card cannot collapse into one. Second-resolution timestamps are non-conformant.

3. **Phone reconciliation (conflict-free):** on receiving `CARD_USED`, reuse the Story 9.1 usage path:
   - `usageCount = usageCount + 1`
   - `lastUsedAt = max(lastUsedAt, usedAt)`
   - then re-publish the snapshot to the watch (closes the loop with Story 9.4).

4. **Offline + idempotency:** the watch **queues** events locally and **flushes** on reachability. To avoid double-counting on retransmission, each event carries a stable **client event id** (e.g. `"<cardId>:<usedAt>"`); the phone dedupes recently-seen ids within a bounded window. Increment is applied **once per unique event id**.

5. **Wear OS (Epic 10):** the same message shape + reconciliation is adoptable over the Wearable Data Layer — Epic 10 mirrors this (parity scope added 2026-06-09).

## Conflict-safety argument (AC2)

- `usageCount` forms a commutative monoid under `+1` events → order-independent; only **at-least-once** delivery + dedup is required for exactness.
- `lastUsedAt` under `max` is commutative, associative, idempotent (a CRDT LWW-style register) → order-independent, duplicate-safe.
- No field the watch writes is a field the **user edits** → disjoint from the phone's edit surface → the original conflict class is untouched.

## Consequences

- **Positive:** FR21/FR22 become accurate across surfaces; the favourite/most-used promise holds on the watch; small, additive protocol change.
- **Negative / cost:** the watch gains a (telemetry-only) write path — the read-only rule must be **reworded consistently** (below); delivery is best-effort, so dedup + offline queue are required; Wear OS inherits the obligation.
- **Risk:** low, contingent on the dedup window being sized so legitimately-distinct opens (same card, different second) are not merged — `usedAt` at millisecond precision plus `cardId` makes collisions effectively impossible.

## Docs to update on ratification (Story 9.6 "docs" task)

> ✅ **Applied 2026-06-09 at ratification** (Architect) — all 7 references reworded + `CARD_USED` added to both documented `SyncMessage` unions (architecture.md & project_context.md). The code-level `sync.ts` schema change remains Story 9.6's implementation task. The `epics.md:1922` row had already advanced to ~line 1980 via the correct-course and is now flipped from "proposed" to "ratified."

Reword consistently (data-vs-usage) at all 7 references, and add `CARD_USED` to the documented message types:

| File                      | Line | Current                                                                                   |
| ------------------------- | ---- | ----------------------------------------------------------------------------------------- |
| `CONTRIBUTING.md`         | 270  | "Apple Watch is read-only — never add mutation paths to the watch."                       |
| `docs/project_context.md` | 237  | "Watch is READ-ONLY for MVP (prevents conflicts)"                                         |
| `docs/project_context.md` | 324  | "Watch is READ-ONLY for MVP"                                                              |
| `docs/architecture.md`    | 1029 | "Watch is READ-ONLY for MVP"                                                              |
| `docs/epics.md`           | 266  | "ARCH-20: Watch is READ-ONLY for MVP (editing only happens on phone)"                     |
| `docs/epics.md`           | 1008 | "Watch is READ-ONLY for MVP (card editing only on phone)"                                 |
| `docs/epics.md`           | 1922 | "Watch is READ-ONLY (consistent with watchOS behavior)" (Epic 10 — already forward-noted) |

Also add `CARD_USED` to the `SyncMessage` type list in `docs/project_context.md` (§ Message Versioning) and `docs/architecture.md` (sync section).

## Alternatives considered

- **A. Keep watch read-only; accept skewed usage.** Rejected — defeats Epic 9's "both surfaces" goal (the triggering complaint).
- **B. Watch tracks usage _locally_ only (no phone sync).** Rejected — the counter is shared; a watch-local count diverges and never improves the phone sort, and would itself be overwritten by the next phone→watch snapshot.
- **C. Full bidirectional card sync (watch can edit data).** Rejected — reintroduces exactly the edit-conflict class the read-only rule prevents; far larger scope/risk.

## API currency (AC6)

Before implementation (Story 9.6), verify current/non-deprecated WatchConnectivity delivery APIs via Context7 / official docs — likely `transferUserInfo` (queued, guaranteed, survives relaunch) over `sendMessage` (requires reachability). Confirm `react-native-watch-connectivity` exposes the receive side on the phone.

**Verified at ratification (2026-06-09, Architect):**

- ✅ **`WCSession.transferUserInfo(_:)` is current / non-deprecated** ([Apple docs](https://developer.apple.com/documentation/watchconnectivity/wcsession/1615671-transferuserinfo)). Queues dictionaries, delivers FIFO, and **continues even if the app is suspended — queued until the counterpart launches**; received via `session(_:didReceiveUserInfo:)`. Correct primitive for the offline-queue requirement. `sendMessage` (reachability-gated) and `updateApplicationContext` (latest-state-only, would lose discrete counts) are correctly rejected.
- ✅ **`react-native-watch-connectivity` v2.0.0** (current) exposes the phone-side receive as `watchEvents.on('user-info', cb)`, emitting an **array that includes user-info received before the RN app initialised** — relaunch-queued events arrive as a batch; the handler MUST iterate and dedup by event id.
- ⚠️ **Implementation constraint (Story 9.6):** the **watchOS Simulator does not support `transferUserInfo(_:)`** — this path MUST be validated on a **physical phone+watch pair** (reinforces the Sprint 14 retro "spike-first on device"). Story 9.6 AC6 stays binding for the precise version check at build time.

## Sign-off

- [x] **PM** — confirmed 2026-06-09 (ifero): pulling usage past the "read-only-for-MVP" line is in scope.
- [x] **Architect** — ratified 2026-06-09 (Winston): design validated (commutativity + dedup + offline + API currency); `usedAt` tightened to ms precision; Status → Accepted; folded into `architecture.md` as `ADR-2026-06-09-001`; read-only wording refined across all 7 references.
