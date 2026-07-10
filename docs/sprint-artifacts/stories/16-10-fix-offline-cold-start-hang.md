# Story 16.10: Fix offline cold-start hang (app stuck on the loading spinner with no connectivity)

Status: done

## Story

As a user opening the app with no internet connection,
I want the app to boot into my cached cards instead of hanging on the loading spinner,
so that the "offline-first" promise actually holds — my loyalty cards are usable in a shop with no signal.

## Context

Reported by ifero 2026-07-09: with the device **offline**, the app gets stuck on the loading screen **indefinitely**. This directly contradicts the offline-first product promise (the headline reason this product exists). Highest-priority defect of the batch.

Root cause, confirmed in code (dev investigation + Architect verification, 2026-07-09):

- **Boot gate:** `RootLayout` renders a hand-rolled `ActivityIndicator` while `!isReady` (`app/_layout.tsx:386-392`); the real UI mounts only when `isReady === true` (`:394-398`). `isReady` starts `false` (`:271`) and flips at exactly one place — `setIsReady(true)` (`:317`) — reached only if `initializeApp()` (`:276-322`) runs to completion. There is no `expo-splash-screen` gating; this spinner **is** the "loading screen".
- **The hang — an unguarded network await:** `initializeApp()` awaits `getSupabaseClient().auth.getSession()` (`app/_layout.tsx:311`). The client is `autoRefreshToken: true`, `persistSession: true` over a SecureStore adapter (`shared/supabase/client.ts:198-204`). On a cold launch with a **persisted-but-expired** token, `getSession()` performs a **network** token refresh; offline it never settles (no response + auth-js retry/backoff). There is **no timeout / `Promise.race` / `AbortController`** on this path.
- **Why this specific await exists (must be preserved):** the comment at `:306-309` states it resolves auth state _before_ any UI renders "so the welcome gate (`RootLayoutContent`) never flashes or bounces an already signed-in user." The result feeds `RootLayoutContent isAuthenticated={isAuthenticated}` (`:396`). So the fix must still know auth state before first paint — just without the network.
- **The `try/catch` is a false safety net:** `:313-315` only catches a _rejected_ promise; it cannot rescue a promise that never resolves.
- **The offline-safe answer already exists in-repo:** `shared/supabase/useAuthState.ts:37-44` subscribes to `onAuthStateChange`; Supabase fires `INITIAL_SESSION` **synchronously from storage** (its comment: "sets the initial state without needing a separate getSession() call") — same persisted session, **no network**.
- **Secondary risk (verify):** `Updates.checkForUpdateAsync()` / `fetchUpdateAsync()` / `reloadAsync()` (`:279-291`) are network calls, but `Updates.isEnabled`-gated and `try/catch`-wrapped; they normally reject fast offline. Confirm they can't stall the gate.

_Part of Epic 16 — Platform & Tech Debt (reliability bucket; see 16-7, 16-8). Filed here per the 16-8 precedent. **Fast-tracked as a HOTFIX ahead of Sprint 17 per ifero (2026-07-09).**_

## Architecture Decision — AD-16-10-01: gate boot on the synchronous `INITIAL_SESSION`, not a network `getSession()`

**Decision.** Remove the blocking `await …auth.getSession()` from the boot path (`app/_layout.tsx:311`). Derive the initial `isAuthenticated` value from Supabase's **synchronous `INITIAL_SESSION`** event (via `onAuthStateChange`, storage-only — no network), and flip `isReady` when that first event arrives. Add a short **safety timeout** so `isReady` is guaranteed to flip to a safe default (`guest`) even if the listener never fires.

**Rejected — Option B (bound the `getSession()` await with a timeout/abort).** It _bounds_ the hang but doesn't _remove_ it: every offline cold-start with an expired token still burns the full timeout as spinner time. That's a slower brick, not a fix. Option A makes offline boot **instant**.

**Why Option A is the lean choice:**

- **Reuses a proven, boring mechanism.** `useAuthState.ts` (Story 6.9) already relies on the synchronous `INITIAL_SESSION` — same SecureStore adapter, same persisted session, no network. We wire in an existing pattern, not a new one.
- **Preserves the no-flash intent.** Gating `isReady` on receipt of the first `INITIAL_SESSION` keeps auth state known before first paint (so signed-in users aren't bounced to welcome) — but the gate is now a storage read, not a network refresh.
- **Fixes a latent staleness bug.** `isAuthenticated` is currently a one-shot boot snapshot; sourcing it from `onAuthStateChange` makes it reactive for the app's lifetime.
- **Token refresh still happens — lazily.** With `autoRefreshToken: true`, the network refresh runs in the background once the app is up and connectivity allows, driven by the same listener. Boot no longer waits on it.

**Constraints for the dev (must hold):**

- `setIsReady(true)` must be reachable with **zero** network dependency (test: gate flips with NetInfo offline + a persisted, expired token).
- Keep the `dbError` path (`:377-384`) and guest-session bootstrap (`:296-304`) intact.
- Verify `Updates.checkForUpdateAsync()` (`:279-291`) cannot stall boot offline; bound it if it can.

**Recommended structure (dev discretion):** extract the boot auth-gate into a small, unit-testable hook in `shared/` (extend/compose `useAuthState`) so `app/_layout.tsx` stays thin and the offline-boot behaviour is testable in isolation. Scoped as **AD-16-10-01** (story-local; no `docs/architecture.md` change — it's a boot-sequencing fix within an existing pattern).

## Acceptance Criteria

1. **Given** the device is offline (airplane mode / no reachable network) **and** the app is cold-started, **When** the app boots, **Then** it reaches the main UI and displays locally-cached cards within a bounded time — it **never** hangs on the loading spinner.
2. **Given** a persisted-but-expired session and no connectivity, **When** boot runs, **Then** **no blocking network call gates `isReady`** — the initial auth state is derived from the synchronous `INITIAL_SESSION` (storage-only) and `setIsReady(true)` is reached without a network round-trip.
3. **Given** the app booted offline, **When** connectivity returns, **Then** the session recovers via the background auto-refresh / `onAuthStateChange` (no manual restart) and sync resumes.
4. **Given** a signed-in user (online **or** offline), **When** the app boots, **Then** they are **not** flashed/bounced onto the welcome screen — auth state is known before first paint (the no-flash guarantee is preserved).
5. **Given** the online happy path, **Then** boot behaviour and perceived latency are unchanged; **and** guest mode offline boots to cached cards (no regression).
6. **Given** the defensive safety timeout, **When** (hypothetically) the `INITIAL_SESSION` listener never fires, **Then** `isReady` still flips to a safe default (guest) within the timeout — the app can never hang.
7. Tests cover: offline-cold-start reaches `isReady` with **no network** (expired token, NetInfo offline); no-flash for signed-in; connectivity-return recovery; safety-timeout fallback; online happy path unchanged. `yarn lint` / `typecheck` / `test` pass; coverage maintained.

## Tasks / Subtasks

- [x] Replace the blocking `getSession()` await (`app/_layout.tsx:306-315`) with an `onAuthStateChange` subscription that sets `isAuthenticated` from the first (`INITIAL_SESSION`) event and flips `isReady` on receipt — reuse the pattern in `useAuthState.ts:37-44` (AC: 1, 2, 4)
- [x] Add a safety timeout that flips `isReady` (default guest) if no auth event arrives within N ms (AC: 6)
- [x] Ensure background token refresh + reactive auth updates keep `isAuthenticated` correct after connectivity returns (AC: 3)
- [x] Verify `Updates.checkForUpdateAsync()` (`:279-291`) can't stall boot offline; bound it if needed (AC: 1)
- [x] Preserve the `dbError` path (`:377-384`), the guest-session bootstrap (`:296-304`), and the no-flash welcome gate (AC: 4, 5)
- [x] _(Recommended)_ extract the boot auth-gate into a testable `shared/` hook so `_layout.tsx` stays thin (AC: 7)
- [x] Tests: offline-cold-start (expired token, NetInfo offline) reaches `isReady` with no network; no-flash signed-in; connectivity-return recovery; safety-timeout fallback; online happy path (AC: 7)
- [ ] Device smoke test: airplane-mode cold start shows cached cards (AC: 1) — stakeholder (ifero) on RC build. _(manual; post-merge, owned by ifero)_

## Dev Notes

### Locked approach

See **AD-16-10-01** above — Option A (gate on synchronous `INITIAL_SESSION` + safety timeout). No open fork remains for the dev; the "how" is decided. Keep the change tight (`app/_layout.tsx` + an optional `shared/` boot-auth hook). No schema or native change.

### References

- Boot gate + hang: `app/_layout.tsx:269-399` — `:311` hung await, `:306-315` intent + false-safety `try/catch`, `:317` `setIsReady(true)`, `:386-392` spinner, `:396` `isAuthenticated` prop, `:279-291` `Updates.*`.
- Client auth config: `shared/supabase/client.ts:197-204` (`autoRefreshToken: true` `:200`, `detectSessionInUrl: false` `:201`).
- Offline-safe pattern to reuse: `shared/supabase/useAuthState.ts:25-49` (`:37-44` `INITIAL_SESSION`).
- Connectivity (available if needed): `shared/hooks/useNetworkStatus.ts` (optimistic default → confirmed via `NetInfo.fetch()`).
- Local DB init (ruled out — local-only): `core/database/database.ts:9,50`.
- Coding rules: `docs/project_context.md`, `AGENTS.md` (layer boundaries `app → features → shared → core`; `const` arrows; `logger` wrapper).

### Definition of Ready

- [x] Status, Story, Context present
- [x] Root cause confirmed in code (file:line)
- [x] Architecture decision locked (AD-16-10-01) — no open fix fork
- [x] Acceptance criteria testable and mapped to tasks
- [x] Scope tight (single file + optional `shared/` hook; no schema/native change)
- [x] Test strategy defined (offline boot / no-flash / recovery / safety timeout)
- [ ] Device smoke test owner assigned (ifero, on next RC) — post-merge validation, not a dev blocker

### Project Structure Notes

Primary change confined to `app/_layout.tsx` (optionally a small `shared/` boot-auth hook). No schema or native change. Part of Epic 16 — Platform & Tech Debt. Sibling to 16-8.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Amelia, BMAD dev agent) — implementation. Code review + QA review delegated to sonnet subagents per stakeholder protocol.

### Debug Log References

- Developed in the **main checkout** (not a `.claude` worktree), so a plain `yarn test` runs the full suite: **1650 tests pass across 159 suites**. `yarn lint`: 0 errors / 0 warnings. `yarn typecheck`: 0 errors.
- **Coverage:** thresholds (80% global over `core/**` + `features/**`) pass. New `core/utils/with-timeout.ts` = **100%** stmts/branches/funcs/lines. `useBootAuthGate.ts` + `client.ts` (shared) and `_layout.tsx` (app) are outside `collectCoverageFrom`, but all are unit-tested.
- **Timer-sensitivity check:** the safety-timeout hook + the `_layout` integration tests use fake timers; ran the timer-sensitive suites 3× consecutively and the full suite (+`test:coverage`) with **zero** failures — no flakiness.

### Code Review — Round 1 (Sonnet, adversarial, fresh context)

The reviewer traced the **installed** `@supabase/auth-js@2.105.1` and ran an empirical repro against the real library, surfacing a genuine flaw in the original approach:

- **[High] The `INITIAL_SESSION`-is-synchronous premise (AD-16-10-01) is false for an expired token.** With `autoRefreshToken: true`, the SDK does a **network refresh (up to ~30s backoff) _before_ emitting `INITIAL_SESSION`** when the persisted token is expired/near-expiry. So the original hook resolved the expired-offline case only via the 3s safety timeout → defaulting to **guest**, which (a) didn't literally satisfy AC2 and (b) **regressed AC4**: a post-reinstall signed-in user (expired token, offline) would be misclassified as guest and bounced to `/welcome`. **Fixed** by adding `hasPersistedSession()` — a pure SecureStore read (no network, no refresh) that seeds `isAuthenticated` from the persisted session, so an expired-but-present session boots as signed-in. This delivers AD-16-10-01's **intent** (storage-only, no network, no-flash) correctly; the naive "synchronous `INITIAL_SESSION`" mechanism could not. `onAuthStateChange` remains the authoritative, reactive source once it resolves.
- **[Med] `fetchUpdateAsync`/`reloadAsync` unbounded.** Documented: they run only when a manifest is served (i.e. online), and `fetchUpdateAsync` self-bounds via its own server timeout (Expo docs), so they can't hang an offline boot. Comment added in `_layout.tsx`.
- **[Med] No end-to-end test of the update-check timeout wiring.** **Fixed**: `layout-offline-boot.test.tsx` renders `RootLayout` with `isEnabled: true` + a never-settling `checkForUpdateAsync`, asserting boot still completes after the bound.
- **[Low] False "synchronous / no network" comments.** **Fixed** across `useBootAuthGate.ts` and `_layout.tsx`.

### QA Review — Round 1 (Sonnet, release-readiness lens)

Independent gates re-run green (159 suites / 1648 tests, coverage above threshold). Verdict CHANGES_REQUESTED → all three must-fix items resolved:

- **[Med] AC1 integration test was weak.** `layout-offline-boot` test 1 only asserted `getAllCards` ran (it fires unconditionally from `initializeApp().then()`), not that the render gate flipped. **Fixed**: added `testID="boot-loading"` to the loading view and now assert the spinner is present while gated and **gone** after the bound — proving `isReady = isInitialized && isAuthReady` actually became true (a broken AND-gate would now fail the test).
- **[Med] False "synchronous INITIAL_SESSION" comment survived at its origin.** Round-1 code review corrected this in `useBootAuthGate.ts`/`_layout.tsx` but missed `useAuthState.ts` (7+ consumers). **Fixed**: corrected the comment in `useAuthState.ts` + its test header — INITIAL_SESSION is synchronous only for a valid/absent session, not an expired token (network refresh first). Comment-only; no logic change to the shared hook.
- **[Med] No regression test for the newly-reactive `isAuthenticated`.** The fix makes auth state reactive for the app's lifetime; a post-boot `SIGNED_OUT` interacting with the welcome gate was untested. **Fixed**: `welcome-redirect › does NOT bounce to welcome when a signed-in user signs out post-boot` — asserts no `/welcome` redirect after a reactive sign-out (first_launch already cleared).
- **[Low] Chunked-session path unproven end-to-end.** **Fixed** (cheap): `client › reads a CHUNKED (>1800 byte) session end-to-end through the real SecureStore adapter` wires `hasPersistedSession` against `createSecureStoreAdapter` with a multi-JWT session.
- **[Low ×3 deferred]** widen coverage to `shared/`; a `_layout`-level guest safety-timeout integration test; quantify fast-fail-offline latency — all recorded under Deferred follow-ups.

### Implementation Plan

1. **`shared/supabase/client.ts`** — added `getSessionStorageKey(url)` (mirrors supabase-js's default `sb-<ref>-auth-token` exactly — we only READ the key it writes, so no session-migration risk) and `hasPersistedSession(env?, storage?)`: a pure SecureStore read that reports whether a session (even expired) is persisted, with **no network / no token refresh**. Best-effort → `false` on any failure.
2. **`shared/supabase/useBootAuthGate.ts`** (new) — boot auth gate combining three offline-safe signals: (a) `useAuthState` (reactive `onAuthStateChange` — authoritative once resolved), (b) `hasPersistedSession()` (optimistic storage seed, resolves fast even when the SDK is stalled on an offline refresh), (c) a `BOOT_AUTH_SAFETY_TIMEOUT_MS` (3000ms) backstop. `isReady = authResolved || storageResolved || safetyElapsed`; `isAuthenticated = authResolved ? live : storageProbe === 'present'`.
3. **`core/utils/with-timeout.ts`** (new) — generic `withTimeout(promise, ms, msg?)` that rejects on timeout while keeping the original promise's handlers attached (no unhandled rejection on late settle). Context7 confirmed `Updates.checkForUpdateAsync()` takes no JS timeout arg, so bounding is our responsibility.
4. **`app/_layout.tsx`** — removed the blocking `await getSession()` boot gate. Split the single `isReady` into **infra readiness** (`isInitialized`: local DB init + guest-session bootstrap, offline-safe) and **auth readiness** (`isAuthReady` from `useBootAuthGate`). UI gates on `isInitialized && isAuthReady` — which _guarantees_ the no-flash behaviour (AC4) instead of relying on a race. Bounded `Updates.checkForUpdateAsync()` with `withTimeout(…, UPDATE_CHECK_TIMEOUT_MS=5000)`. `isAuthenticated` is now sourced reactively from the hook (fixes the latent one-shot-snapshot staleness).
5. **Test maintenance** — the two existing `_layout` suites mocked the old `getSession()` gate; updated their Supabase mocks to the `onAuthStateChange` + `hasPersistedSession` mechanism. Behavioural assertions unchanged (welcome-gate redirect logic, DB-error localisation).

### Completion Notes List

- **AC1 (offline boot never hangs)** ✅ Auth resolves from the storage probe (no network) and the update check is bounded (`withTimeout` 5s). Neither can block boot. Tests: `useBootAuthGate › seeds isAuthenticated … when the auth listener is stalled`; `layout-offline-boot › completes boot after the update-check timeout …`; `with-timeout › rejects with a timeout error …`.
- **AC2 (no blocking network gates `isReady`)** ✅ Readiness comes from `hasPersistedSession()` (pure SecureStore read) — proven to resolve even when `onAuthStateChange` is stalled on an offline refresh. Tests: `client › hasPersistedSession …`; `useBootAuthGate › seeds isAuthenticated=true from the storage probe when the auth listener is stalled (expired token) …`.
- **AC3 (connectivity-return recovery)** ✅ `useAuthState`'s subscription stays live; a later `SIGNED_IN`/`TOKEN_REFRESHED` takes over as authoritative. Tests: `useBootAuthGate › recovers reactively …`; `… lets the live auth state override the optimistic probe …`.
- **AC4 (no-flash for signed-in, incl. expired-token offline)** ✅ The storage probe seeds `isAuthenticated=true` for an expired-but-present session before first paint, so a post-reinstall user is not bounced to `/welcome`. Tests: `layout-offline-boot › boots as authenticated from the storage probe … no welcome bounce`; `welcome-redirect.test.tsx` (3 cases).
- **AC5 (online happy path + guest offline unchanged)** ✅ Valid/absent sessions still resolve via the synchronous `INITIAL_SESSION`; guest boots to cached cards. Tests: `useBootAuthGate › becomes ready as guest …`; full suite green.
- **AC6 (safety timeout)** ✅ If neither the listener nor the probe resolves, `isReady` flips to guest after `BOOT_AUTH_SAFETY_TIMEOUT_MS`. Test: `useBootAuthGate › flips to ready (guest default) via the safety timeout …`.
- **AC7 (test coverage + gates)** ✅ New/added tests: `useBootAuthGate.test.ts` (11), `with-timeout.test.ts` (5), `client.test.ts` getSessionStorageKey/hasPersistedSession (11, incl. chunked end-to-end), `layout-offline-boot.test.tsx` (2), plus a post-boot sign-out regression in `welcome-redirect.test.tsx`. Full suite **159 suites / 1650 tests** green; lint / typecheck clean; coverage thresholds maintained (`with-timeout.ts` 100%).

### Deviation from AD-16-10-01 (for ifero's review)

The locked AD said "gate on the synchronous `INITIAL_SESSION`." Code review empirically showed that event is **not** synchronous when the token is expired (the SDK refreshes over the network first). I kept the AD's **intent** — resolve initial auth **storage-only, no network, no-flash** — but implemented it via a direct `hasPersistedSession()` SecureStore read rather than the (refresh-gated) `INITIAL_SESSION` event. Same architecture spirit; corrected mechanism. Flagging explicitly since it departs from the AD's literal wording.

### Deferred follow-ups (out of scope; tight-scope, flag-don't-fix)

- **Device smoke test (Task 8)** — airplane-mode cold start shows cached cards. Owned by ifero on the next RC build; post-merge validation, not a dev blocker.
- **`useAuthState` `getSession()` note** — `useAuthState` itself is unchanged; the storage-only concern lives in the new probe, so existing `useAuthState` consumers are unaffected.
- **`Updates.fetchUpdateAsync()` mid-download stall (online, flaky network)** — only reachable when a manifest was served (i.e. with connectivity), so it is outside this story's offline cold-start scope and is pre-existing. If we want a hard "boot never hangs" guarantee even on a degraded connection mid-OTA-download, bound `fetchUpdateAsync` with `withTimeout` too (tune the timeout so it doesn't abort legitimate slow bundle downloads). Deferred to keep this hotfix tightly scoped.
- **Widen coverage scope to `shared/`** (QA finding) — `jest.config.js` `collectCoverageFrom` spans only `core/**` + `features/**`, so `useBootAuthGate.ts` / `client.ts` / `_layout.tsx` (this hotfix's safety-critical logic) sit outside the enforced 80% threshold. All are unit/integration tested, but "coverage maintained" is only measured for that subset. Fast-follow: add `shared/**` (pre-existing repo policy, not introduced here).
- **`_layout`-level guest safety-timeout integration test** (QA finding) — the pure-guest + fully-stalled-listener path riding the 3s backstop is unit-tested in `useBootAuthGate.test.ts`; a `_layout` integration equivalent would harden the one-line composition.
- **Quantify offline fast-fail latency** (QA finding) — no automated measurement proves a true airplane-mode boot resolves quickly rather than always riding the 5s update-check bound; covered by the pending device smoke test (Task 8).

### File List

- `app/_layout.tsx` — removed blocking `getSession()` boot gate; split `isInitialized` (infra) from `isAuthReady` (`useBootAuthGate`); gate UI on both; bounded the Expo update check with `withTimeout`; `isAuthenticated` now reactive from the hook; added `testID="boot-loading"` to the loading view (test hook).
- `shared/supabase/client.ts` — added `getSessionStorageKey` + `hasPersistedSession` (pure SecureStore session probe, no network).
- `shared/supabase/client.test.ts` — added tests for `getSessionStorageKey` + `hasPersistedSession` (incl. expired-session-still-true, corrupt JSON, missing env, **chunked >1800-byte session end-to-end via the real SecureStore adapter**).
- `shared/supabase/useBootAuthGate.ts` — **new** boot auth gate hook (storage probe + reactive `onAuthStateChange` + safety timeout).
- `shared/supabase/useBootAuthGate.test.ts` — **new** unit tests (stalled-listener storage seed, no-flash, recovery, optimistic→authoritative handoff, safety timeout, env-misconfig, unmount cleanup).
- `shared/supabase/useAuthState.ts` — corrected a misleading comment (INITIAL_SESSION is **not** synchronous for an expired token — the SDK refreshes over the network first); **no logic change** (shared hook used by 7+ consumers).
- `shared/supabase/useAuthState.test.ts` — corrected the header comment to match; no test-logic change.
- `core/utils/with-timeout.ts` — **new** promise timeout utility.
- `core/utils/with-timeout.test.ts` — **new** unit tests (resolve/reject/timeout/late-settle).
- `core/utils/index.ts` — export `withTimeout` from the barrel.
- `app/__tests__/layout-offline-boot.test.tsx` — **new** integration tests (update-check timeout bound — asserts the render gate flips via `testID="boot-loading"`; offline expired-token boots authenticated, no welcome bounce).
- `app/__tests__/welcome-redirect.test.tsx` — updated Supabase mock to `onAuthStateChange` + `hasPersistedSession`; added a post-boot `SIGNED_OUT` regression test (reactive auth must not re-bounce to `/welcome`).
- `app/__tests__/layout-initialization-error.test.tsx` — updated Supabase mock to `onAuthStateChange` + `hasPersistedSession` (assertions unchanged).
- `docs/sprint-artifacts/sprint-status.yaml` — 16-10 ready-for-dev → in-progress (→ review on PR open; → done on merge).
- `docs/sprint-artifacts/stories/16-10-fix-offline-cold-start-hang.md` — Status: review; populated Dev Agent Record.

## Change Log

| Date       | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Author              |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| 2026-07-09 | Story drafted from stakeholder bug report (offline infinite loading). Status → drafted.                                                                                                                                                                                                                                                                                                                                                                                                         | John (PM)           |
| 2026-07-09 | Refined to ready-for-dev: locked the boot-gate fix as **AD-16-10-01** (gate on synchronous `INITIAL_SESSION`; rejected the `getSession()`-timeout option), made the no-flash guarantee + safety-timeout explicit ACs, rewrote tasks to the locked approach, added the Definition of Ready. Status drafted → ready-for-dev.                                                                                                                                                                      | Winston (Architect) |
| 2026-07-10 | Implemented AD-16-10-01: new `useBootAuthGate` + `withTimeout` util bounding the Expo update check; `_layout.tsx` gates UI on infra-ready **and** auth-ready (no blocking `getSession()`). Status ready-for-dev → review.                                                                                                                                                                                                                                                                       | Amelia (Dev)        |
| 2026-07-10 | Code review round 1 (Sonnet): fixed a High finding — `INITIAL_SESSION` isn't synchronous for expired tokens (network refresh first), which regressed AC4 (expired-offline user bounced to `/welcome`). Added `hasPersistedSession()` (pure SecureStore probe, no network) to seed auth; documented update fetch/reload bounds; added `_layout` integration tests; corrected comments. Full suite **1648 pass**, lint/typecheck clean, coverage maintained.                                      | Amelia (Dev)        |
| 2026-07-10 | Code review round 2 (Sonnet): High finding confirmed resolved. Fixed two Low doc items — corrected a missed `storage-only INITIAL_SESSION` comment and removed an unsound `fetchUpdateAsync` self-bounding claim (flagged the online mid-download edge as a follow-up). Comment-only; gates still green.                                                                                                                                                                                        | Amelia (Dev)        |
| 2026-07-10 | Code review round 3 (Sonnet): **APPROVED — zero comments**. Verified the non-comment logic diff byte-identical to round 2; all 7 ACs satisfied.                                                                                                                                                                                                                                                                                                                                                 | Amelia (Dev)        |
| 2026-07-10 | QA review round 1 (Sonnet, release-readiness): resolved 3 must-fix items — strengthened the AC1 test to assert the render gate flips (`testID="boot-loading"`), corrected the false `INITIAL_SESSION`-synchronous comment at its origin (`useAuthState.ts`), and added a post-boot `SIGNED_OUT` welcome-gate regression test; added a chunked-session end-to-end probe test. Deferred 3 Lows (coverage scope, guest-safety-timeout integration test, offline-latency measurement). Gates green. | Amelia (Dev)        |
