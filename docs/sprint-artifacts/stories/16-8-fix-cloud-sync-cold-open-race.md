# Story 16.8: Fix cloud sync failure on cold app open (auth/network readiness race)

Status: done

## Story

As a signed-in user,
I want cloud sync to reliably run when I open the app — and to recover on its own if the first attempt hits a cold-start hiccup,
so that my cards sync on every open instead of failing until I manually pull-to-refresh.

## Context

Surfaced 2026-06-11: cloud sync fails on (nearly) **every cold app open** on the phone; a manual pull-to-refresh then succeeds. Diagnosed by a read-only dev investigation, grounded in the code:

- The naive theory (Supabase client/session "not created yet") is **refuted**: `app/_layout.tsx` `initializeApp()` awaits `getSession()` (`:303`) and gates the UI behind `isReady` (`:378-389`), so the client + session are ready **before** the home screen (and the sync hooks) mount.
- **Real root cause — `useCloudSync`'s auto-trigger** (`shared/hooks/useCloudSync.ts:108-115`) fires the first sync as soon as `authState === 'authenticated'`, but:
  1. **No network gate** — unlike `useAutoSync` (`useAutoSync.ts:53`), it never checks `isConnected/isInternetReachable`; and `useNetworkStatus` **optimistically** initializes connectivity to `true` (`useNetworkStatus.ts:15-18`), so sync can fire before connectivity is verified.
  2. **No retry/backoff** — `useCloudSync` has none (vs `useAutoSync`'s `retryWithBackoff`, `useAutoSync.ts:80-103`); a single transient cold-start failure surfaces immediately as the error banner _"Cloud sync failed. Pull to retry."_ (`useCloudSync.ts:85-87` → `app/index.tsx:43` → `SyncStatusContainer.tsx:35,54`).
  3. **Latches on failure** — `autoTriggeredRef` is set `true` on the **first** attempt regardless of outcome (`useCloudSync.ts:113`) and only resets when `authState === 'guest'` (`:117-121`). So once the first cold-start fire fails, it **never auto-retries** — matching "fails every open, works on manual pull."

### Confirmed 2026-06-11 (ifero)

- **Signed in to an account** → the auto-trigger path is active (not a guest-mode red herring).
- Failure banner is **"Cloud sync failed. Pull to retry."** → the catch path at `useCloudSync.ts:85-87`.
- **Manual pull-to-refresh succeeds right after** → the client/session/network are healthy by then; this **pins the `autoTriggeredRef` latch race as the dominant cause**. Pull-to-refresh calls `forceSync`, which bypasses the latch and works.

➡️ **Therefore: latch-on-success is the root-cause fix.** The network gate + retry/backoff are **defense-in-depth** — they stop the first-fire failure from happening at all, but even if one slips through, latch-on-success guarantees auto-recovery instead of a stuck failure.

- Scope note: at-rest encryption does **not** gate sync (no crypto in the sync path). The only "keys" involved are the Supabase env credentials and the restored session JWT.

Related (note for awareness): two `useCloudSync` instances auto-fire on the home screen (`app/index.tsx:33` + `features/cards/components/CardList.tsx:60`) → a double sync on open.

_Part of Epic 16 — Platform & Tech Debt (standing tech-debt bucket; see 16-1, 16-2, 16-7). Filed here (vs an Epic 7 bugfix) per ifero, 2026-06-11._

## Acceptance Criteria

1. **(Root cause)** **Given** the auto-trigger latch (`autoTriggeredRef`) **Then** it is set only after a **successful** sync — a failed first attempt does **not** permanently suppress auto-sync for the session (it re-attempts on the next auth/network event).
2. **Given** the first cold-start auto-sync fails transiently **When** connectivity returns or the next auth/network event fires **Then** sync **auto-retries and recovers** — reaching the same healthy state a manual pull-to-refresh reaches today, with no manual action required.
3. **Given** I am signed in and open the app **When** the first auto-sync runs **Then** it fires only once the session is restored **and** the network is confirmed reachable (not on the optimistic default).
4. **Given** a transient sync failure on open **Then** it is retried with backoff (matching `useAutoSync`) **before** surfacing the "Cloud sync failed. Pull to retry." banner — a single cold-start hiccup does not show a hard error.
5. **Given** these changes **Then** happy-path and **guest-mode** behaviour are preserved (no auto-sync for guests), the manual pull-to-refresh (`forceSync`) path is unchanged, and sync-status indicators still reflect real state.
6. Tests cover: latch-only-on-success (failed first fire still auto-retries); auto-recovery after a simulated cold-start failure; auto-sync gated on auth **and** network ready; no regression to guest/happy-path. `yarn lint` / `typecheck` / `test` pass; coverage maintained.

## Tasks / Subtasks

- [x] **(Root cause)** Move the `autoTriggeredRef` latch to the **success** path so failures auto-recover on the next auth/network event (`useCloudSync.ts:113-121`) (AC: 1, 2)
- [x] Gate the `useCloudSync` auto-trigger on network-ready in addition to auth — consume `useNetworkStatus`, require `isConnected && isInternetReachable` (`useCloudSync.ts:108-115`) (AC: 3)
- [x] Wrap the sync run in `retryWithBackoff` (already used by `useAutoSync.ts:80-103`) (AC: 4)
- [ ] _(Consider — decide in dev)_ consume the session from `onAuthStateChange`/`useAuthState` instead of a fresh `getSession()` snapshot to remove snapshot-vs-restore skew (`useAuthState.ts:42-44`, `useCloudSync.ts:43`) (AC: 2, 3) — **DEFERRED**: out of scope per "tight scope, flag don't fix" memory; latch-on-success + retry already resolves the race. Filed as follow-up in Completion Notes.
- [ ] _(Consider — decide in dev)_ de-dupe the two `useCloudSync` auto-fire instances (`app/index.tsx:33`, `features/cards/components/CardList.tsx:60`) so only one runs on open (AC: 5) — **DEFERRED**: same rationale; double-fire is not directly caused by the bug. Filed as follow-up in Completion Notes.
- [x] Tests: latch-on-success, cold-start failure → auto-recovery, auth+network gating, guest/happy-path unchanged (AC: 6)
- [ ] Verify on a real cold open (signed-in) that sync succeeds without a manual pull (AC: 1, 2) — **PENDING STAKEHOLDER**: requires device-level smoke test by ifero on next RC build (aligns with Epic 9 retro action #2).

## Dev Notes

### Confirmed symptom (2026-06-11, ifero)

| Question                       | Answer                                  | Implication                                                    |
| ------------------------------ | --------------------------------------- | -------------------------------------------------------------- |
| Signed-in vs guest?            | **Signed in**                           | Auto-trigger path is active; diagnosis holds.                  |
| Pull-to-refresh after failure? | **Succeeds**                            | Underlying sync is healthy → **latch race is the root cause**. |
| Error text?                    | **"Cloud sync failed. Pull to retry."** | Generic catch path (`useCloudSync.ts:85-87`).                  |

Two minor symptom details remain unconfirmed but are **non-blocking** (the dual-mode fix covers them): network type at open (Wi-Fi vs cellular) and first-launch-after-reinstall vs warm relaunch.

### Recommended Fix (from investigation)

The smallest, cleanest change is confined to **`shared/hooks/useCloudSync.ts`**: **latch-on-success (root)** + network gate + `retryWithBackoff` (defense-in-depth). The two "consider" items (session-from-`onAuthStateChange`, de-dupe instances) are robustness nice-to-haves — keep here or split during dev.

### References

- Investigation (2026-06-11): cloud sync fails on cold open; manual pull recovers. Confirmed signed-in + pull-recovers + generic banner.
- Trigger + bug: `shared/hooks/useCloudSync.ts:108-115` (auto-fire), `:113-121` (latch), `:42-87` (run + error surface).
- Gated/retried sibling to mirror: `shared/hooks/useAutoSync.ts:49-103` (network check `:53`, `retryWithBackoff` `:80`).
- Optimistic network default: `shared/hooks/useNetworkStatus.ts:15-18`.
- Startup/readiness: `app/_layout.tsx:267-314` (`getSession()` `:303`; `isReady` gate `:378-389`).
- Auth state (deferred `INITIAL_SESSION`): `shared/supabase/useAuthState.ts:25-49` (`:42-44`).
- Client (SecureStore adapter; corrupt-chunk → null): `shared/supabase/client.ts:197-219` (`:66,72`).
- Error surfaced: `app/index.tsx:43`, `shared/components/SyncStatusContainer.tsx:35,54`.
- Double-fire: `app/index.tsx:33`, `features/cards/components/CardList.tsx:60`.
- Not a fresh regression: `useCloudSync.ts` last changed in Story 7.2; `useAuthState` (`e3541ff`) widened the loading window by relying solely on the deferred `INITIAL_SESSION`.

### Project Structure Notes

- Primary change: `shared/hooks/useCloudSync.ts` (+ its test). Optional: `shared/supabase/useAuthState.ts` (expose session), `app/index.tsx` / `features/cards/components/CardList.tsx` (de-dupe).
- No schema or native change; contained to the sync-hook layer.
- Part of Epic 16 — Platform & Tech Debt (see 16-1, 16-2, 16-7).

## Dev Agent Record

### Agent Model Used

claude-opus-4-7 (Amelia, BMAD dev agent) — primary implementation. Code review + QA review delegated to sonnet subagents per stakeholder protocol.

### Debug Log References

- TDD RED → GREEN: 10 new tests for AC1–AC5 failed pre-implementation; all 32 `useCloudSync` tests pass post-implementation (12 pre-existing + 14 AC-tagged + 3 race-safety regressions from code-review rounds 1–2 + 1 AC2 auth-event-recovery test from QA review round 1 + 1 multi-instance dedup test + 1 auto-vs-manual supersede test from the efficiency pass).
- Full regression sweep: **1523 tests pass across 150 suites** (measured in-worktree via a config override that disables only the repo's `/.claude/` path guard — see note below). Lint: 0 errors / 0 warnings. Typecheck: 0 errors.
- **Test-count note:** the repo's `jest.config.js` ignores the entire `/.claude/` path (`testPathIgnorePatterns` + `modulePathIgnorePatterns`) to avoid Haste collisions from nested worktrees. Because this story was developed inside `.claude/worktrees/`, a plain `yarn test` finds **zero** tests here; the suite was run with a temporary `--config` override that swaps the `/.claude/` ignore for a `node_modules`-only ignore (faithfully reproducing what CI runs from a clean checkout, where no path contains `/.claude/`). Earlier revisions of this record cited **1561 / 154 suites**, which is not reproducible from this worktree; the reproduced figure is **1522 / 150**.

### Implementation Plan

1. **`useNetworkStatus.ts`** — added a third return field `isReady: boolean`, initialised `false` and flipped `true` once `NetInfo.fetch()` (or any subsequent emission) confirms real connectivity. Lets consumers distinguish the optimistic initial-render default from a confirmed state. `useAutoSync` is purely additive-compatible (it does not consume `isReady`).
2. **`useCloudSync.ts`** — refactored along three axes:
   - **`performSync`** is the throwing inner routine. It raises a marker class `KnownSyncError` for structured failures (session lost, download fail, upload fail) and lets unexpected errors bubble. This lets the auto-trigger consume failures uniformly via `retryWithBackoff` while the manual path surfaces specific user-facing messages.
   - **`runManualSync`** wraps `performSync` for `triggerSync` / `forceSync` (pull-to-refresh). Single attempt; sets `syncError` to the underlying message for `KnownSyncError`, or `GENERIC_SYNC_ERROR` for unexpected throws. Pull-to-refresh is intentionally **not** retried — the user is already retrying.
   - **Auto-trigger effect** now gates on `authState === 'authenticated' && isNetworkReady && isConnected && isInternetReachable`. Wraps `performSync(false)` in `retryWithBackoff({ maxRetries: 3, baseDelay: 1000 })`. The latch (`autoTriggeredRef.current = true`) flips **only after** the retried call resolves. Failures (after retries exhausted) leave the latch unset and surface `GENERIC_SYNC_ERROR`, so the next auth/network event re-fires a fresh attempt.
   - Sign-out resets the latch (preserved from prior behaviour) so a subsequent sign-in re-syncs.
3. **`useCloudSync.test.ts`** — rewrote into AC-tagged `describe` blocks (happy-path auto-trigger; manual triggerSync/forceSync; AC1 latch-on-success; AC2 auto-recovery; AC3 auth+network gate; AC4 retryWithBackoff; AC5 guest+happy-path). Existing manual-trigger tests were redirected to `triggerSync()` (preserves specific error messages) since the auto-trigger path now collapses post-retry failures to the generic banner.
4. **`useNetworkStatus.test.ts`** — updated the two `toEqual` assertions for the new `isReady` field; added explicit initial-render expectation (`isReady: false`).

### Completion Notes List

- **AC1 (latch-on-success)** ✅ The latch only flips inside the `.then()` of `retryWithBackoff(() => performSync(false))`. A failed first attempt — even after all retries are exhausted — does **not** latch, so a subsequent auth/network event fires a fresh attempt. Test: `AC1 › does NOT latch autoTriggeredRef on a failed first attempt`.
- **AC2 (auto-recovery)** ✅ Test: `AC2 › auto-retries successfully after a cold-start failure recovers` — download fails persistently → banner shown → flip backend to success + simulate `networkOffline → networkReady` → auto-trigger fires again → sync succeeds → banner cleared.
- **AC3 (auth + network gate)** ✅ The auto-trigger effect blocks on `authState`, `isNetworkReady`, `isConnected`, and `isInternetReachable`. The optimistic `useNetworkStatus` default (`isConnected=true, isInternetReachable=true, isReady=false`) does **not** fire. Tests: `AC3 ›` block (5 cases).
- **AC4 (retryWithBackoff before banner)** ✅ Auto-trigger wraps `performSync` in the same `retryWithBackoff` used by `useAutoSync` (3 retries, 1s base). A single-fire transient hiccup recovers silently (no banner); the banner only appears once retries are exhausted. `forceSync` is **intentionally** not retried — proven by `forceSync does NOT use retryWithBackoff`.
- **AC5 (guest + happy-path preserved)** ✅ Guest mode never auto-fires. Manual `forceSync` / `triggerSync` still work and surface specific errors. Sign-out resets the latch so a re-sign-in re-triggers.
- **AC6 (test coverage + quality bar)** ✅ 32 tests in `useCloudSync.test.ts` (12 → 32, +20 new: 14 AC-tagged + 3 race-safety regressions from code-review rounds 1–2 + 1 AC2 auth-event-recovery test from QA review round 1 + 1 multi-instance dedup test + 1 auto-vs-manual supersede test from the efficiency pass). Full suite: 1523 tests pass, 0 fail, 0 `act` warnings. Lint + typecheck clean.

### Deferred follow-ups (out of scope; tight-scope, flag-don't-fix)

- **`useAuthState` snapshot-vs-restore skew**: the "consider" task to consume the session from `onAuthStateChange` instead of `getSession()`. Not blocking — `retryWithBackoff` + latch-on-success absorbs the symptom. Recommend a small follow-up to expose the session from `useAuthState` if we want to remove `getSession()` from the hot path.
- **Double `useCloudSync` instances** — ✅ **RESOLVED in the efficiency pass.** `useCloudSync` is mounted by 3 call sites (`app/index.tsx:33`, `features/cards/components/CardList.tsx:60`, `features/settings/hooks/useSyncTrigger.ts:11`); HomeScreen + its child CardList co-exist, so each instance previously fired its own cold-open auto-sync. The hook now backs onto a module-level singleton store: the cold-open sync runs **once** regardless of mount count (shared latch + in-flight guards), and all consumers read one consistent snapshot. Covered by `race-safety › runs the cold-open auto-sync only ONCE across multiple concurrently mounted instances`.
- **Device-level smoke test** (cold open, signed in, no manual pull): owned by ifero — verify on next RC build per Epic 9 retrospective action #2.
- **`useAutoSync` should also gate on `isReady`** (QA round 1 nit): the sibling hook still consumes the optimistic `useNetworkStatus` default (`isConnected/isInternetReachable` only), so it would fire on the first render's optimistic `(true, true)`. Pre-existing behaviour; `useAutoSync` has its own guards (`isDirty()`, `isRunningRef`) that make this benign in practice, but tightening it to mirror `useCloudSync`'s `isReady` gate is the natural follow-up.
- **Auto-trigger + long-running manual sync race** (QA round 1 low) — ✅ **RESOLVED in the efficiency pass** (the shared in-flight guard made it cross-instance and more reachable, so it was fixed rather than deferred). `runAutoSync` now checks the shared `isRunning` guard *inside* the retry callback: if a manual sync already owns it, the auto path bails cleanly (no retry-budget burn, no banner) and leaves the latch unset so a later event can re-fire. Covered by `race-safety › auto-sync started while a manual sync is in flight bails quietly`.
- **Per-field re-render granularity** (efficiency-pass review, low): the single `CloudSyncSnapshot` object means any field change (e.g. `downloadedCount`) re-renders every subscriber, even one that only reads `isSyncing`. This matches the pre-refactor per-instance `useState` coupling (no regression), but the singleton spreads it across all consumers. If this ever shows up in profiling, the fix is a selector-aware `useSyncExternalStoreWithSelector` wrapper or per-field stores — deferred to keep the current implementation simple and readable.

### File List

- `shared/hooks/useCloudSync.ts` — refactored auto-trigger (latch-on-success, network gate, retryWithBackoff); split internal `performSync` from `runManualSync`. **Efficiency pass:** hoisted sync state + latch + in-flight guards into a module-level singleton store consumed via `useSyncExternalStore`, so the cold-open sync runs once across all mounted instances and every consumer shares one snapshot. Removed `mountedRef` / per-effect `cancelled` (the store outlives components, so there is no state-update-after-unmount hazard). Actions are now stable module constants. Added test-only `__resetCloudSyncStoreForTests`.
- `shared/hooks/useCloudSync.test.ts` — rewrote with AC-tagged describe blocks; 12 → 31 tests (incl. 3 race-safety regressions from code review + 1 AC2 auth-event-recovery test from QA review + 1 multi-instance dedup test from the efficiency pass). Resets the module store in `beforeEach`; the unmount test now asserts store-owned (not cancellation) semantics.
- `shared/hooks/useNetworkStatus.ts` — added `isReady` field.
- `shared/hooks/useNetworkStatus.test.ts` — updated assertions for the new field.
- `docs/sprint-artifacts/sprint-status.yaml` — 16-8 ready-for-dev → in-progress (auto-promoted to `review` on PR open; → `done` on merge).
- `docs/sprint-artifacts/stories/16-8-fix-cloud-sync-cold-open-race.md` — Status: review; populated Dev Agent Record.

## Change Log

| Date       | Change                                                                                          | Author              |
| ---------- | ----------------------------------------------------------------------------------------------- | ------------------- |
| 2026-06-12 | Story 16.8 implementation: latch-on-success + network gate + retryWithBackoff. Status → review. | Amelia (dev agent)  |
| 2026-06-13 | Code-review round 1 (sonnet, 10 findings): introduced `SyncBusyError` so retry-window races no longer latch on no-ops; added `mountedRef` to guard post-unmount state mutations; added `SyncCancelledError` for cancel during retry sleeps; mock `retryWithBackoff` now honours options.maxRetries/onRetry; tightened AC3 optimistic-default fixture; renamed shadowed test vars; added 2 race-safety regression tests (1557 → 1559). | Amelia (dev agent) |
| 2026-06-13 | Code-review round 2 (sonnet, 3 findings + 1 partial): swapped `throw new SyncCancelledError()` → `if (cancelled) return` inside the retry wrapper so cancel exits in O(1) instead of burning ~7s of backoff sleep (also removed the unused error class); guarded `runManualSync`'s setSyncError calls with mountedRef; added StrictMode-explaining comment on the mountedRef effect; added an unmount-during-sync regression test (1559 → 1560). | Amelia (dev agent) |
| 2026-06-13 | Code-review round 3 (sonnet, 3 nits): collapsed a stray double blank line; removed a redundant `blocking = true;` no-op in the unmount test; reconciled stale "12 → 26 tests" in the File List with the actual count (29). | Amelia (dev agent) |
| 2026-06-13 | Code-review rounds 4–5 (sonnet, 3 doc-consistency nits, consolidated): added the missing round-3 row to this Change Log; refreshed the Debug Log References test counts (26 → 29 / 1557 → 1560); reconciled the Debug Log arithmetic ("initial 14 + 3 = 17" → "12 pre-existing + 14 AC-tagged + 3 race-safety = 29") so the line reads correctly in isolation. | Amelia (dev agent) |
| 2026-06-13 | QA review round 1 (sonnet, 2 low + 2 nits): added an auth-event-recovery test to the AC2 block to close a traceability gap (token-refresh cycle through 'loading' back to 'authenticated' re-fires the auto-trigger); documented two QA-surfaced follow-ups (useAutoSync should also gate on isReady; SyncBusyError-vs-long-manual-sync race banner suppression); cleaned up the sprint-status note. | Amelia (dev agent) |
| 2026-06-13 | QA review round 2 (sonnet, 1 doc-consistency nit): reconciled Debug Log References test total (1560 → 1561) to match the AC6 completion note after QA round 1 added the auth-event-recovery test. Further doc-only QA review iterations are intentionally not logged here to avoid changelog meta-recursion (the convention from this row forward). | Amelia (dev agent) |
| 2026-06-13 | Efficiency pass (stakeholder request — dedup duplicate cold-open syncs): hoisted `useCloudSync`'s state + latch + in-flight guards into a module-level singleton store consumed via `useSyncExternalStore`, so the 3 concurrent call sites (HomeScreen + CardList + settings) collapse to ONE cold-open sync sharing one snapshot. Removed `mountedRef`/`cancelled` machinery (store outlives components); actions are now stable module constants (no churn on auth changes); no-op snapshot writes bail to avoid spurious re-renders. Added a multi-instance dedup test, rewrote the unmount test for store-owned semantics, collapsed two race-safety tests to single-`act` scopes (eliminating the `act`-interleaving warning the store surfaced). 30 → 31 useCloudSync tests; full suite 1522 pass / 0 fail / 0 `act` warnings. Also corrected the prior, non-reproducible 1561/154 figures to the reproduced 1522/150. | Amelia (dev agent) |
| 2026-06-13 | Efficiency-pass review (sonnet, 1 med + 2 low): fixed the medium finding — the shared in-flight guard made the auto-vs-manual `SyncBusyError` race cross-instance and user-visible (spurious banner after a successful pull-to-refresh during cold open). `runAutoSync` now checks `isRunning` inside the retry callback and bails quietly when a manual sync owns the guard; added a regression test proving the banner is suppressed (verified it fails on the naive version). Added a `getServerSnapshot` explainer comment (RN-no-SSR). Logged per-field re-render granularity as a deferred follow-up. 31 → 32 useCloudSync tests; full suite 1523 pass / 0 fail / 0 `act` warnings. | Amelia (dev agent) |
