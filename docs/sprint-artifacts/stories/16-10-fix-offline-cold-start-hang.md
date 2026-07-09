# Story 16.10: Fix offline cold-start hang (app stuck on the loading spinner with no connectivity)

Status: ready-for-dev

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

- [ ] Replace the blocking `getSession()` await (`app/_layout.tsx:306-315`) with an `onAuthStateChange` subscription that sets `isAuthenticated` from the first (`INITIAL_SESSION`) event and flips `isReady` on receipt — reuse the pattern in `useAuthState.ts:37-44` (AC: 1, 2, 4)
- [ ] Add a safety timeout that flips `isReady` (default guest) if no auth event arrives within N ms (AC: 6)
- [ ] Ensure background token refresh + reactive auth updates keep `isAuthenticated` correct after connectivity returns (AC: 3)
- [ ] Verify `Updates.checkForUpdateAsync()` (`:279-291`) can't stall boot offline; bound it if needed (AC: 1)
- [ ] Preserve the `dbError` path (`:377-384`), the guest-session bootstrap (`:296-304`), and the no-flash welcome gate (AC: 4, 5)
- [ ] _(Recommended)_ extract the boot auth-gate into a testable `shared/` hook so `_layout.tsx` stays thin (AC: 7)
- [ ] Tests: offline-cold-start (expired token, NetInfo offline) reaches `isReady` with no network; no-flash signed-in; connectivity-return recovery; safety-timeout fallback; online happy path (AC: 7)
- [ ] Device smoke test: airplane-mode cold start shows cached cards (AC: 1) — stakeholder (ifero) on RC build.

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

## Change Log

| Date       | Change                                                                                                                                                                                                                                                                                                                     | Author              |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| 2026-07-09 | Story drafted from stakeholder bug report (offline infinite loading). Status → drafted.                                                                                                                                                                                                                                    | John (PM)           |
| 2026-07-09 | Refined to ready-for-dev: locked the boot-gate fix as **AD-16-10-01** (gate on synchronous `INITIAL_SESSION`; rejected the `getSession()`-timeout option), made the no-flash guarantee + safety-timeout explicit ACs, rewrote tasks to the locked approach, added the Definition of Ready. Status drafted → ready-for-dev. | Winston (Architect) |
