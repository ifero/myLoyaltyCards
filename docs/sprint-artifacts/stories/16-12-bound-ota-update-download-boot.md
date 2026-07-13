---
baseline_commit: 4a7c2941b7b97fe7e1461b5525a0c01bfba67964
---

# Story 16.12: Bound the OTA update download at boot so a stalled fetch can't hang the app

Status: review

Epic: 16 — Platform & Tech Debt

## Story

As a user launching the app on a poor/flaky connection while an OTA update is available,
I want the app to boot within a bounded time even if the update download stalls,
so that a degraded network can never leave me stuck on the loading spinner.

## Context

Follow-up from **Story 16.10** (offline cold-start hang). 16.10 bounded `Updates.checkForUpdateAsync()` with `withTimeout(UPDATE_CHECK_TIMEOUT_MS=5000)` because it gates boot and has no JS-level timeout. But in `app/_layout.tsx` `initializeApp`, the subsequent `Updates.fetchUpdateAsync()` (bundle download) and `Updates.reloadAsync()` are still **UNBOUNDED**.

Verified boot/update block (`app/_layout.tsx`, current `main` post-16.9/16.10):

- `UPDATE_CHECK_TIMEOUT_MS = 5000` (`:277`).
- Update block `:299-314`: `if (Updates.isEnabled)` (`:299`) → inner `try` (`:300`) → `const update = await withTimeout(Updates.checkForUpdateAsync(), UPDATE_CHECK_TIMEOUT_MS)` (`:301-304`, **BOUNDED**) → `if (update.isAvailable)` (`:305`) → `await Updates.fetchUpdateAsync()` (`:306`, **UNBOUNDED**) → `await Updates.reloadAsync()` (`:308`, terminal) → shared `catch { logger.warn(...) }` (`:310-313`).
- Boot gate: `isReady = isInitialized && isAuthReady` (`:398`); loading view `testID="boot-loading"` (`:409-415`).

These calls run only when a manifest was served — i.e. there **is** connectivity — so this is outside 16.10's pure-**offline** scope. But a flaky connection that serves the small manifest then **stalls mid-bundle-download** makes the `await` at `:306` never settle → `setIsInitialized(true)` (`:333`) never runs → `isReady` stays `false` → the spinner shows indefinitely. The shared `try/catch` can't rescue a promise that never settles (the same false-safety-net that motivated 16.10).

Expo API (confirmed via Context7; repo runs `expo-updates ~55.0.21`): `fetchUpdateAsync` takes **no** JS timeout arg; `reloadAsync` takes none and "fulfills right before the reload instruction is sent to the JS runtime" — it is a **local runtime teardown, not a network call**.

## Architecture Decision — AD-16-12-01: bound `fetchUpdateAsync` with a separate generous budget; do NOT bound `reloadAsync`

**Decision.** Add a second constant `UPDATE_FETCH_TIMEOUT_MS` (recommend **30000**) — a bundle download needs far more headroom than the manifest check. Wrap `fetchUpdateAsync` in `withTimeout` with that budget in a dedicated inner `try/catch`; gate `reloadAsync` on the fetch succeeding. On timeout (or a genuine fetch error), `logger.warn` and boot the **current** bundle — `reloadAsync` is simply not reached, so no new branch/state is needed.

**Do NOT bound `reloadAsync`:** it performs no network I/O (the download already finished), tears down the runtime, and code after it is unreliable — a JS timeout can't cancel a native reload and there's no safe recovery to run. It is only reachable after a now-bounded fetch.

**Graceful degradation (key property):** `withTimeout` does **not** abort the native download (`core/utils/with-timeout.ts:17-36` attaches handlers to the original promise; it keeps running and consumes late settlement). So an over-tight budget only **defers** the update to the next cold start — never "update lost" or "unhandled rejection." That de-risks the budget choice.

**Rejected:** setting `updates.fetchTimeout` in `app.json` — a native/config change requiring a rebuild, also alters automatic-update behavior, and diverges from the established `withTimeout` pattern.

## Acceptance Criteria

1. Given an available OTA update and a connection that stalls mid-download, When boot runs, Then `fetchUpdateAsync` is bounded by `UPDATE_FETCH_TIMEOUT_MS` so boot completes within a bounded time — on timeout the app boots the **current** bundle, `reloadAsync` is **NOT** called, and any staged download applies on a later cold start.
2. Given a healthy connection with a slow-but-completing download within budget, When it finishes, Then the happy path is unchanged — `fetchUpdateAsync` then `reloadAsync` both run.
3. Given the fetch timeout (or a genuine fetch error) fires, Then it is logged via `logger.warn` and boot continues (no crash, no `dbError`).
4. Given `reloadAsync` is terminal and network-free, Then it is **NOT** wrapped in `withTimeout`, and Dev Notes document why.
5. Reuse `core/utils/with-timeout.ts` — no new dependency, no schema/native change; single-file change (`app/_layout.tsx`) + tests.
6. Given 16.10's offline path, When fully offline, Then behavior is unchanged (`checkForUpdateAsync` bounded/fast-fails; the fetch path is never reached).
7. Tests cover: manifest-served + never-settling `fetchUpdateAsync` → boot completes on the current bundle (spinner clears) and `reloadAsync` not called; normal fetch under budget → fetch + reload proceed. `yarn lint`/`typecheck`/`test` pass; coverage maintained.

## Tasks / Subtasks

- [x] (AC 1,5) Add `UPDATE_FETCH_TIMEOUT_MS` const (recommend `30000`) + JSDoc next to `UPDATE_CHECK_TIMEOUT_MS` (`app/_layout.tsx:277`).
- [x] (AC 1,2,3,5) Wrap `Updates.fetchUpdateAsync()` in `withTimeout(…, UPDATE_FETCH_TIMEOUT_MS, 'Expo update download timed out')` inside a dedicated inner `try/catch`; gate `reloadAsync` on fetch success; on timeout `logger.warn` + fall through to boot the current bundle (`app/_layout.tsx:305-309`).
- [x] (AC 4) Do **not** bound `reloadAsync`; document the rationale in Dev Notes.
- [x] (AC 1) Update the stale comment near the update block (the mid-download "follow-up" is now implemented).
- [x] (AC 7) In `test/root-layout.offline-boot.test.tsx`, hoist module vars `mockFetchUpdateAsync` + `mockReloadAsync` (mirror `mockCheckForUpdateAsync` at `:20/:30`); set defaults in `beforeEach`.
- [x] (AC 7) Add tests: fetch-stall → bounded boot on current bundle + `reloadAsync` NOT called; normal fetch under budget → fetch + reload proceed.
- [x] (AC 7) Run `yarn lint`/`typecheck`/`test` from the **main** checkout (not a `.claude` worktree).

## Dev Notes

### References (verified 2026-07-11)

- `app/_layout.tsx` — `UPDATE_CHECK_TIMEOUT_MS` `:277`; update block `:299-314` (checkForUpdateAsync bounded `:301-304`; fetchUpdateAsync `:306`; reloadAsync `:308`; shared catch `:310-313`); `setIsInitialized` `:333`; `isReady` `:398`; spinner `:409-415`.
- `core/utils/with-timeout.ts:17-36` — `withTimeout(promise, ms, msg?)` rejects on timeout, mirrors the original's settlement, keeps the original running, consumes late settle (`with-timeout.test.ts:43-56`; 100% covered). Exported from `core/utils/index.ts:14`.
- Story 16.10 — `checkForUpdateAsync` bound + the deferred follow-up note motivating this story.
- **Test home:** `test/root-layout.offline-boot.test.tsx` (Story 16.9 relocated `app/__tests__/layout-offline-boot.test.tsx` → top-level `test/`; the draft's old path is **stale**). `beforeEach` `:102`; the existing check-timeout test (`:117-137`) is the model.

### Coverage note (important)

`jest.config.js:22-27` `collectCoverageFrom` is `features/**` + `core/**` only → **`app/**`is NOT measured**, so`app/\_layout.tsx`wiring is outside the 80% gate;`with-timeout.ts`(in`core/`) already is. "Coverage maintained" holds trivially — do **not** claim new `\_layout`coverage. (Story 16-13 widens the gate to`shared/**`, **not** `app/**`.) Integration tests are still required by `CONTRIBUTING.md` ("new behavior has tests").

### Test Plan

- **Test 1 (AC1):** `checkForUpdateAsync → { isAvailable: true }`; `mockFetchUpdateAsync` returns a never-settling promise; render; assert `boot-loading` present; `advanceTimersByTimeAsync(UPDATE_FETCH_TIMEOUT_MS + 1000)`; assert spinner gone, `getAllCards` ran, and **`mockReloadAsync` NOT called**.
- **Test 2 (AC2):** `isAvailable: true`; fetch + reload both resolve; assert both called (the wrapper doesn't break OTA). (In-test `reloadAsync` is a resolving mock so `initializeApp` continues past it; in prod it tears down the runtime.)
- **Required mock refactor:** the factory currently hardcodes `fetchUpdateAsync`/`reloadAsync` as resolved (`:31-32`) — not controllable. Hoist `mockFetchUpdateAsync`/`mockReloadAsync`, wire the factory to them, set defaults in `beforeEach` after `clearAllMocks` (`:102`) — exactly as `mockCheckForUpdateAsync` is handled (`:20/:30/:108`).
- `with-timeout.ts` already 100% covered — no util tests needed.

### Regressions to preserve

Online happy-path OTA still reloads into the new bundle (AC2); the budget is generous enough not to abort legitimate slow downloads (AC2); 16.10's offline path unaffected (AC6 — the fetch is never reached offline); no unhandled rejection on a late-completing background download; the fetch catch must **not** set `dbError` (stays `logger.warn` + continue). The other two root-layout suites (`…welcome-gate…`, `…initialization-error…`) stay green.

### Project Structure Notes

Single-file change (`app/_layout.tsx`) + the relocated test. Engine-agnostic. No schema or native change. Part of Epic 16 — Platform & Tech Debt; follow-up to 16.10.

### Definition of Ready

- [x] Root cause + boot sequence confirmed in code (file:line)
- [x] AD locked (AD-16-12-01): bound fetch, not reload; budget 30s
- [x] Test strategy defined (fake-timer stall in the relocated test file)
- [x] Scope tight (single file + tests; reuse `withTimeout`)
- [ ] Open decisions confirmed by ifero (below) — recommended defaults baked in

### Open decisions (recommended defaults applied)

1. **`UPDATE_FETCH_TIMEOUT_MS` value** — baked in: `30000` (30s). Range 20–60s defensible; a timed-out slow download still stages for the next launch, so this is low-risk.
2. **Bound `reloadAsync`?** — baked in: **NO** (network-free, terminal, unrecoverable on timeout; only reached after a bounded fetch).
3. **Const vs env** — baked in: plain module const (matches `UPDATE_CHECK_TIMEOUT_MS`); no runtime-tuning need.
4. **Log structure** — baked in: dedicated inner `try/catch` + distinct `logger.warn('Expo update download failed/timed out…')` for observability + a precise test assertion.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Claude Opus 4.8)

### Debug Log References

- Red→green (relocated integration test): the new "download stalls" test failed
  against the unbounded `fetchUpdateAsync` (spinner never cleared), then passed
  once `withTimeout(UPDATE_FETCH_TIMEOUT_MS)` was wired in.
- `yarn typecheck` ✓ · `yarn lint` ✓ · `yarn test` ✓ (163 suites / 1703 tests) ·
  `yarn test:coverage` ✓ (80% gate held; `app/**` is unmeasured by design).

### Completion Notes List

- Added `UPDATE_FETCH_TIMEOUT_MS = 30000` beside `UPDATE_CHECK_TIMEOUT_MS`, with
  JSDoc explaining the more generous budget and the no-abort / defer-to-next-launch
  property (AC1, AC5).
- Wrapped `Updates.fetchUpdateAsync()` in
  `withTimeout(…, UPDATE_FETCH_TIMEOUT_MS, 'Expo update download timed out')`
  inside a dedicated inner `try/catch`; `reloadAsync` runs only if the bounded
  fetch resolves; on timeout / fetch error (or a rare reload failure) the catch
  `logger.warn('Expo update download/reload failed:', error)`s and falls through
  to boot the current bundle — the error never reaches the outer catch, so
  `dbError` is never set (AC1, AC2, AC3).
- `reloadAsync` is deliberately NOT wrapped in `withTimeout` (network-free,
  terminal, unrecoverable on failure; only reached after the bounded fetch) —
  rationale documented in a code comment and AD-16-12-01 (AC4).
- Refreshed the stale update-block comment (the "pre-existing follow-up" is now
  implemented) (AC1).
- Tests (`test/root-layout.offline-boot.test.tsx`): hoisted
  `mockFetchUpdateAsync` / `mockReloadAsync` + a `logger` mock, defaults set in
  `beforeEach`; added four Story 16.12 cases (AC7): (1) download stall —
  budget-pinned (still gated at 29s, booted after 30s), `reloadAsync` NOT called,
  `logger.warn` called, `logger.error` NOT called; (2) immediate fetch error →
  same graceful degradation; (3) slow-but-within-budget download (25s) still
  fetches then reloads, proving the budget doesn't abort a legit slow download
  (AC2); (4) offline check-fails so the fetch path is never reached (AC6).
- Reused `core/utils/with-timeout.ts` — no new dependency, no schema/native
  change; only `app/_layout.tsx` + the one test touched (AC5).

### File List

- `app/_layout.tsx` (modified)
- `test/root-layout.offline-boot.test.tsx` (modified)

### Change Log

| Date       | Change                                                                                                                                                                                                                                                                           | Author       |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| 2026-07-10 | Drafted as a Story 16.10 follow-up. Needs refinement → ready-for-dev.                                                                                                                                                                                                            | Amelia (Dev) |
| 2026-07-11 | Refined → ready-for-dev (AD-16-12-01; research-backed file:line; corrected the stale test path).                                                                                                                                                                                 | Amelia (Dev) |
| 2026-07-13 | Implemented AD-16-12-01: bounded `fetchUpdateAsync` with `UPDATE_FETCH_TIMEOUT_MS` (30s) via `withTimeout`; `reloadAsync` gated on fetch success and left unbounded; +2 integration tests. All gates green → review.                                                             | Amelia (Dev) |
| 2026-07-13 | Review hardening (code + QA): added fetch-error, offline (AC6), and slow-within-budget (AC2) tests; pinned the 30s budget in the stall test (gated at 29s, booted after 30s); broadened the failure log to `Expo update download/reload failed:`. 163 suites / 1703 tests green. | Amelia (Dev) |
