# Story 16.8: Fix cloud sync failure on cold app open (auth/network readiness race)

Status: ready-for-dev

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

- [ ] **(Root cause)** Move the `autoTriggeredRef` latch to the **success** path so failures auto-recover on the next auth/network event (`useCloudSync.ts:113-121`) (AC: 1, 2)
- [ ] Gate the `useCloudSync` auto-trigger on network-ready in addition to auth — consume `useNetworkStatus`, require `isConnected && isInternetReachable` (`useCloudSync.ts:108-115`) (AC: 3)
- [ ] Wrap the sync run in `retryWithBackoff` (already used by `useAutoSync.ts:80-103`) (AC: 4)
- [ ] _(Consider — decide in dev)_ consume the session from `onAuthStateChange`/`useAuthState` instead of a fresh `getSession()` snapshot to remove snapshot-vs-restore skew (`useAuthState.ts:42-44`, `useCloudSync.ts:43`) (AC: 2, 3)
- [ ] _(Consider — decide in dev)_ de-dupe the two `useCloudSync` auto-fire instances (`app/index.tsx:33`, `features/cards/components/CardList.tsx:60`) so only one runs on open (AC: 5)
- [ ] Tests: latch-on-success, cold-start failure → auto-recovery, auth+network gating, guest/happy-path unchanged (AC: 6)
- [ ] Verify on a real cold open (signed-in) that sync succeeds without a manual pull (AC: 1, 2)

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

### Debug Log References

### Completion Notes List

### File List
