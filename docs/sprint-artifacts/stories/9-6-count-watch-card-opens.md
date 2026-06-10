# Story 9.6: Count Card Opens on the Watch

Status: review

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

- [x] Emit a `CARD_USED` event (per 9.6a ADR) when a card's barcode is displayed on the Watch (AC: 1)
- [x] Queue events when the phone is unreachable; flush on reachability; dedup/idempotency (AC: 3)

### Phone — apply usage events

- [x] Handle inbound `CARD_USED` in `core/watch-connectivity.ts`; apply commutative increment + `lastUsedAt = max` via the Story 9.1 usage path (AC: 1, 2)
- [x] Re-sync the updated snapshot to the Watch (AC: 5)

### Docs / rules (per 9.6a ADR)

- [x] Apply the refined read-only wording across the 7 references (CONTRIBUTING, project_context ×2, architecture, epics ×3) + add `CARD_USED` to the documented message types

### Tests

- [x] Phone: inbound `CARD_USED` increments correctly; commutative under duplicates/out-of-order (AC: 1, 2)
- [x] Watch: offline queue + flush, no double-count (AC: 3)
- [x] Watch stays read-only for card data — no mutation path added (AC: 4)

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

claude-fable-5 (Amelia, BMAD dev agent)

### Implementation Plan

- **Watch (Swift):** `WatchSessionManager.recordCardUsed(cardId:)` builds `{version: 1, type: "CARD_USED", payload: {id, usedAt}}` with `usedAt` from a static `ISO8601DateFormatter` (`.withInternetDateTime, .withFractionalSeconds` → ms precision per ADR) and hands it to `WCSession.transferUserInfo` (current, non-deprecated; OS-level FIFO queue survives unreachability and relaunch → AC3 offline queue). Events created before `WCSession` activation completes are buffered in-memory (NSLock-guarded) and flushed in `activationDidCompleteWith`. Emission point: `BarcodeFlashView.task(id: card.id)` — the single surface where a card's barcode is displayed (all navigation paths flow through it).
- **Phone (TS):** `core/watch-connectivity.ts` gains a zod-validated `CARD_USED` message schema (`version === 1`, ms-precision UTC regex on `usedAt`) + `parseWatchUsageEvent` + `subscribeToWatchUserInfo` ('user-info' events; v1.1.0 lib delivers missed/queued items as a batch on subscribe — verified in `dist/events/subscriptions.js`). New `watch_usage_events` dedup table (migration v2, persisted so a post-relaunch retransmit can't slip past — pruned by `applied_at`, 30-day window). `card-repository.applyWatchUsageEvents` runs in one transaction: `INSERT OR IGNORE` event id `"<cardId>:<usedAt>"` → only on first sight `usage_count += 1`, `last_used_at = max(last_used_at, usedAt)` (CASE WHEN on ms-ISO strings — lexicographic == chronological), `updated_at = now` (cloud delta-sync pickup); single `pushSnapshotToWatch` per batch with ≥1 applied event (AC5). Wiring in `app/_layout.tsx` beside the existing `requestCards` handler; subscription starts after DB init, so pre-launch events held by the lib's native queue land after the DB is ready.
- **Library version note:** ADR cites `react-native-watch-connectivity` v2.0.0 docs; installed is v1.1.0. Verified the installed version exposes the identical receive surface (`watchEvents.addListener('user-info', cb)` with batch + missed-queue semantics), so no upgrade is needed (tight scope).
- **Docs task:** all 7 read-only rewords + both documented `SyncMessage` unions were already applied at ADR ratification (verified in CONTRIBUTING.md:270, project_context.md:237/245/327, architecture.md:1018–1042, epics.md:266/1008/1980) — this story verifies and records; the code-level schema work is the `core/watch-connectivity.ts` change above.
- **Tests:** TDD per task. Watch: new CI-enforced TS contract test (`targets/watch/__tests__/watch-usage-event-contract.test.ts`) — emission shape, ms-precision formatter, transferUserInfo transport, activation buffering, and the AC4 read-only guarantee (outbound watch messages ⊆ {requestCards, CARD_USED}); Swift compile verified via `yarn watch:build`. Phone: migration v2 tests; zod parse + user-info subscription unit tests; `applyWatchUsageEvents` unit tests (SQL-string level) + **integration tests on real SQLite** (better-sqlite3 + real migrations) for increment/max/dedup/commutativity/out-of-order/prune semantics (AC1/AC2/AC3).

### Debug Log References

### Completion Notes List

- **Watch emission (AC1):** `BarcodeFlashView.task(id: card.id)` now calls `WatchSessionManager.shared.recordCardUsed(cardId:)` — one event per barcode open, covering every navigation path (list row + any future deep link, since all barcode display flows through this view). Event matches the ADR contract exactly: `{version: 1, type: "CARD_USED", payload: {id, usedAt}}` with `usedAt` from `ISO8601DateFormatter` (`.withInternetDateTime, .withFractionalSeconds`, UTC) → millisecond precision.
- **Offline queue (AC3, watch side):** transport is `WCSession.transferUserInfo` — the OS queues FIFO while the phone is unreachable, persists across watch app relaunches, and delivers when the counterpart runs (verified current/non-deprecated at ADR ratification). Events recorded before `WCSession` activation completes are buffered in-memory (NSLock-guarded; SwiftUI main thread vs. background delegate callbacks) and flushed from `activationDidCompleteWith`.
- **Phone apply path (AC1/AC2/AC3):** `applyWatchUsageEvents` (core/database/card-repository.ts) runs one transaction per delivered batch: `INSERT OR IGNORE` into the new persisted `watch_usage_events` ledger (event id `"<cardId>:<usedAt>"`) decides first-sight; only then `usage_count += 1`, `last_used_at = max(current, usedAt)` via CASE WHEN (ms-ISO strings: lexicographic == chronological), `updated_at = now` for cloud delta-sync pickup — mirroring the Story 9.1 `incrementUsageCount` semantics. The persisted ledger (migration v2, `DB_VERSION = 2`) is pruned by `applied_at` (30-day window) so a post-relaunch retransmit can never slip past dedup while the table stays bounded.
- **Receive wiring (AC1/AC5):** `subscribeToWatchUserInfo` ('user-info' events) added to core/watch-connectivity.ts; v1.1.0 of `react-native-watch-connectivity` delivers OS-queued items as a batch on subscribe (incl. pre-launch events — verified in `dist/events/subscriptions.js`) and single-item arrays afterwards. `app/_layout.tsx` subscribes after DB init, validates each item with the zod `CARD_USED` schema (`parseWatchUsageEvent` — rejects unknown types/versions, second-precision or non-UTC timestamps), and applies the batch. `applyWatchUsageEvents` pushes ONE refreshed snapshot per batch with ≥1 applied event (AC5 — watch ordering converges).
- **Read-only preserved (AC4):** no mutation path added. Contract test pins: `transferUserInfo` has exactly one call site (the usage-event sender), all `sendMessage` literals are `requestCards`, and no card-mutation verbs travel watch → phone. Phone-side, the user-info handler can only ever apply usage events (zod rejects everything else).
- **Docs (ADR task):** all 7 read-only rewords + `CARD_USED` in both documented `SyncMessage` unions were applied at ADR ratification — verified at CONTRIBUTING.md:270, project_context.md:237/245/327, architecture.md:1018–1042, epics.md:266/1008/1980. No doc changes needed in this story; the code-level schema (`core/watch-connectivity.ts`) is implemented here.
- **Library note:** ADR cites `react-native-watch-connectivity` v2.0.0; installed v1.1.0 verified to expose the identical receive surface (`watchEvents.addListener('user-info', cb)` with missed-queue batch semantics). No upgrade needed — kept scope tight.
- **Validation:** `yarn typecheck` ✓, `yarn lint` ✓, `yarn test` 150 suites / 1503 tests ✓ (incl. 11 new real-SQLite integration tests for commutativity/out-of-order/dedup/prune, 8 new repository unit tests, 12 new watch-connectivity tests, 3 new migration tests), coverage 90.87%/80.74%/86.91%/91.44% (≥80% gate) ✓, watch contract tests 4 suites / 40 tests ✓ (incl. new 6-test usage-event contract), `yarn watch:build` **BUILD SUCCEEDED** ✓.
- **⚠️ Physical-device validation pending:** the watchOS Simulator does not support `transferUserInfo` — the end-to-end flow (watch open → phone count → re-sync) must be validated on a physical phone+watch pair (per ADR ratification note / Sprint 14 retro). Code-level behavior is fully covered by tests.
- **Code review:** round 1 (opus subagent, adversarial, fresh context) → **APPROVED (0 findings)**. Non-blocking notes: doc-comment wording on the 9.1-path comparison (tightened in-place to spell out the deliberate `max()` vs `now()` difference); defensive non-array wrap in `subscribeToWatchUserInfo` kept as forward-compat; `console.warn` matches `_layout.tsx` file convention (logger migration is 16-2 territory).
- **QA review:** round 1 (opus subagent) → **APPROVED (0 findings)**. All 5 ACs traced to asserting tests (AC evidence recorded in review); gates re-run independently: typecheck ✓ lint ✓ 1503/1503 ✓ coverage 90.93/80.8/87.07/91.5 ≥80% ✓; File List verified == `git status`; docs task (7 refs + 2 unions) spot-checked ✓.

### File List

- `targets/watch/WatchSessionManager.swift` — modified: `recordCardUsed(cardId:at:)`, ms-precision ISO8601 formatter, pre-activation buffer + flush, single `transferUserInfo` call site
- `targets/watch/BarcodeFlashView.swift` — modified: emit usage event on barcode display
- `targets/watch/__tests__/watch-usage-event-contract.test.ts` — new: CI-enforced contract tests (shape, ms precision, transport, buffering, AC4 read-only audit)
- `core/watch-connectivity.ts` — modified: `CARD_USED` in `WatchMessage` union, zod usage-event schema, `parseWatchUsageEvent`, `subscribeToWatchUserInfo`
- `core/watch-connectivity.test.ts` — modified: 12 new tests (parse validation + user-info subscription)
- `core/database/migrations.ts` — modified: `DB_VERSION` 1→2, `watch_usage_events` dedup table (fresh-install schema + v1→v2 migration)
- `core/database/migrations.test.ts` — modified: 3 new migration tests
- `core/database/card-repository.ts` — modified: `applyWatchUsageEvents` (transactional dedup + commutative apply + bounded prune + single batch re-sync)
- `core/database/card-repository.test.ts` — modified: 8 new unit tests
- `core/database/card-repository.integration.test.ts` — modified: 11 new real-SQLite tests (AC1/AC2/AC3/AC5 semantics)
- `core/database/index.ts` — modified: export `applyWatchUsageEvents`
- `app/_layout.tsx` — modified: subscribe to watch user-info, validate + apply usage events
- `docs/sprint-artifacts/sprint-status.yaml` — modified: story status tracking
- `docs/sprint-artifacts/stories/9-6-count-watch-card-opens.md` — modified: story record

## Change Log

| Date       | Version | Description                                                                                                           | Author       |
| ---------- | ------- | --------------------------------------------------------------------------------------------------------------------- | ------------ |
| 2026-06-09 | 0.1     | Drafted via correct-course (C2)                                                                                       | Amelia (dev) |
| 2026-06-10 | 1.0     | Implemented CARD_USED watch→phone usage events per ADR-2026-06-09-001 (emission, dedup apply, re-sync, tests, docs ✓) | Amelia (dev) |
