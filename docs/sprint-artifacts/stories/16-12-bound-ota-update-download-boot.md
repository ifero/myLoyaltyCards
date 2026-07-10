# Story 16.12: Bound the OTA update download so a stalled fetch can't hang boot

Status: drafted

## Story

As a user launching the app on a poor/flaky connection while an OTA update is available,
I want the app to boot within a bounded time even if the update download stalls,
so that a degraded network can never leave me stuck on the loading spinner.

## Context

Follow-up from **Story 16.10** (offline cold-start hang). 16.10 bounded `Updates.checkForUpdateAsync()` with `withTimeout(5s)` because it gates boot and has no JS-level timeout. But `Updates.fetchUpdateAsync()` (bundle download) and the subsequent `Updates.reloadAsync()` in `app/_layout.tsx` (`initializeApp`) remain **unbounded**.

Those calls only run when a manifest was successfully served — i.e. there **is** connectivity — so this is outside 16.10's pure-**offline** scope. But a **flaky/degraded** connection that serves the manifest and then **stalls mid-bundle-download** would keep boot on the spinner unbounded, which contradicts the "boot can never hang" spirit of the 16.10 fix. Per Expo docs `fetchUpdateAsync` "rejects … on … timeout communicating with the server," but that server-side timeout is not a guaranteed hard client bound — the same reasoning led 16.10 to bound `checkForUpdateAsync` explicitly.

Pre-existing behaviour; low frequency; **explicitly deferred from 16.10** to keep that CRITICAL hotfix tightly scoped (see 16.10 "Deferred follow-ups").

## Acceptance Criteria

1. **Given** an available OTA update **and** a connection that stalls mid-download, **When** boot runs, **Then** `fetchUpdateAsync()` is bounded so boot proceeds within a bounded time (never hangs) — on timeout the app boots the current (already-installed) bundle and the update applies on a later launch.
2. **Given** a healthy connection with a legitimately large bundle, **When** the update downloads, **Then** the timeout budget is generous enough not to abort a normal download (no regression to the happy-path OTA flow).
3. **Given** the fetch timeout fires, **Then** the outcome is logged (`logger.warn`) and boot continues via the existing `try/catch` path (no crash, no `dbError`).
4. Reuse the existing `withTimeout` utility (`core/utils/with-timeout.ts`). No new dependency; no schema/native change.
5. Tests cover: fetch-stall → bounded boot (spinner clears); normal fetch under budget → update path proceeds; timeout → current bundle boots. `yarn lint` / `typecheck` / `test` pass; coverage maintained.

## Tasks / Subtasks

- [ ] Wrap `Updates.fetchUpdateAsync()` in `withTimeout` behind a tunable `UPDATE_FETCH_TIMEOUT_MS` constant in `app/_layout.tsx` (AC: 1, 2, 4)
- [ ] Decide + document the timeout budget — balance bounding the hang against not aborting legitimate slow downloads (suggest 20–30s; refine during grooming) (AC: 2)
- [ ] On timeout, fall through to normal boot (skip `reloadAsync`) and `logger.warn` the skip (AC: 1, 3)
- [ ] Decide whether `reloadAsync` needs any handling (terminal; only reached after a successful fetch) — document the decision (AC: 1)
- [ ] Tests: extend `app/__tests__/layout-offline-boot.test.tsx` — fetch-stall bounded; normal fetch proceeds; timeout boots current bundle (AC: 5)

## Dev Notes

### References

- `app/_layout.tsx` — `initializeApp` Expo update block (`Updates.isEnabled` → `checkForUpdateAsync` (already bounded) → `fetchUpdateAsync` → `reloadAsync`).
- `core/utils/with-timeout.ts` — the timeout utility to reuse (added in 16.10).
- Story 16.10 — `checkForUpdateAsync` bound + the deferred-follow-up note motivating this story.
- Expo `Updates.fetchUpdateAsync()` docs (rejection/timeout semantics) — confirm current behaviour via Context7 during dev (per AGENTS.md).

### Definition of Ready (not yet met — needs SM/Architect refinement)

- [ ] Timeout budget agreed (must not abort legitimate slow downloads)
- [ ] `reloadAsync` handling decision confirmed
- [ ] Test strategy for a stalled fetch under fake timers confirmed

### Project Structure Notes

Single-file change (`app/_layout.tsx`) + tests. Engine-agnostic. No schema or native change. Part of Epic 16 — Platform & Tech Debt; follow-up to 16.10.

## Change Log

| Date       | Change                                                                                                                  | Author       |
| ---------- | ----------------------------------------------------------------------------------------------------------------------- | ------------ |
| 2026-07-10 | Drafted as a Story 16.10 follow-up (deferred `fetchUpdateAsync`/`reloadAsync` bound). Needs refinement → ready-for-dev. | Amelia (Dev) |
