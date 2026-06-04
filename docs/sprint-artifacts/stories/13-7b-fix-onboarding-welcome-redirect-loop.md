# Story 13.7b: Fix Onboarding Welcome Redirect Loop for Account Users

**Epic:** 13 - UI Implementation
**Type:** Bug Fix (regression follow-up to Story 13.7)
**Status:** done

## Story

As a user who creates an account or signs in,
I want the app to open straight to my card list every time,
so that I am not repeatedly thrown back to the welcome/onboarding screen on every launch.

## Context

Two new TestFlight testers reported being "kicked out" to the welcome screen on every launch — including right after changing the camera permission in iOS Settings (changing a permission force-terminates the app, so reopening is a cold start). The project owner could not reproduce it on an older build.

Root cause is a regression introduced by **Story 13.7 (restyle-onboarding, commit `e0ffe72`)**, which replaced the home-screen onboarding overlay with a routed flow:

1. `app/_layout.tsx` redirects to `/welcome` on every cold start while `isFirstLaunch()` is true (the `first_launch` flag in `expo-sqlite/kv-store`).
2. The flag is only cleared by `completeFirstLaunch()`.
3. After 13.7, `completeFirstLaunch()` is reached **only on the local-mode path** (`Feature Highlights → "Let's go/Skip"`). The cloud/account path (`Mode Selection → Cloud → Create Account → /`) and the "I have an account → Sign In → /" path navigate home **without** clearing the flag.
4. Therefore any user who creates an account or signs in keeps `first_launch` unset and is redirected to `/welcome` on every subsequent cold start.

The old (pre-13.7) `WelcomeScreen` called `completeFirstLaunch()` on **both** CTAs, clearing the flag up-front for every path; the routed-flow refactor dropped that safeguard.

A second, related trap: the Supabase client persists sessions in SecureStore (`persistSession: true`), which **survives app reinstalls**, while the `first_launch` flag in kv-store does **not**. A returning account user whose session is silently restored after a reinstall would be redirected to `/welcome` without ever touching a sign-in screen.

13.7 also added `FirstCardGuidanceScreen` and the `useOnboardingFlow` hook, but the screen was never registered as a route — leaving dead, unreachable code (and its orphaned `onboarding.firstCardGuidance.*` i18n keys).

**Files affected:**

- `app/_layout.tsx`
- `app/__tests__/welcome-redirect.test.tsx` (new)
- `features/onboarding/index.ts`
- `features/onboarding/screens/FirstCardGuidanceScreen.tsx` (deleted)
- `features/onboarding/screens/FirstCardGuidanceScreen.test.tsx` (deleted)
- `features/onboarding/hooks/useOnboardingFlow.ts` (deleted)
- `shared/i18n/locales/en.ts`
- `shared/i18n/locales/it.ts`

## Acceptance Criteria

### AC1: Signed-in users are never redirected to welcome

- [x] On cold start, a user with a persisted Supabase session lands on the card list, never `/welcome`, regardless of the `first_launch` flag value
- [x] This covers all entry paths: account creation, email/OTP verification, sign-in, and a silently restored session after reinstall

### AC2: First-launch flag is cleared for signed-in users

- [x] When a persisted session is detected at boot and `first_launch` is still unset, `completeFirstLaunch()` is called so subsequent cold starts skip the gate without re-evaluating auth

### AC3: New signed-out users still see welcome

- [x] A genuinely new, signed-out user on first launch is still redirected to `/welcome`
- [x] A signed-out returning user whose `first_launch` flag is already cleared (completed local-mode onboarding) is not redirected

### AC4: No flash of the wrong screen

- [x] The persisted-session check resolves during the existing boot sequence (before `isReady`), so the gate decision is made before any screen renders — no welcome/home flash

### AC5: Dead onboarding code removed

- [x] `FirstCardGuidanceScreen` (unrouted) and its test are deleted
- [x] `useOnboardingFlow` (only consumed by that screen) is deleted
- [x] Stale exports removed from `features/onboarding/index.ts`
- [x] Orphaned `onboarding.firstCardGuidance.*` i18n keys removed from `en.ts` and `it.ts` (parity preserved)

### AC6: Tests

- [x] New `app/__tests__/welcome-redirect.test.tsx` covers: signed-in + first-launch (no redirect, flag cleared), signed-out + first-launch (redirect to welcome), signed-out + flag-cleared (no redirect)
- [x] Full suite, typecheck, and lint pass

## Technical Notes

- The gate logic is centralised in `app/_layout.tsx` rather than scattered across each completion screen — gating on auth state fixes every path at once and avoids re-introducing the same "a screen forgot to clear the flag" class of bug.
- `getSupabaseClient().auth.getSession()` reads from local SecureStore (no network round-trip) and is resolved inside the existing async bootstrap, wrapped in try/catch so an env-misconfigured/no-session client falls back to the signed-out flow.
- Local-mode (guest) onboarding still clears the flag via `FeatureHighlightsScreen.finishOnboarding()`; that path is unchanged.

## Definition of Done

- [x] Welcome gate is auth-aware in `app/_layout.tsx`
- [x] Regression test added and passing
- [x] Dead `FirstCardGuidanceScreen` / `useOnboardingFlow` / i18n keys removed
- [x] `yarn typecheck`, `yarn lint`, `yarn test` all pass locally
- [ ] Verified on device: fresh install → create account / sign in → force-quit → reopen lands on the card list (recommended before release)
- [ ] PR reviewed and approved (maintainer merges)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.8 (1M context)

### Completion Notes List

- Root-caused the "kicked out on every launch" reports to the `first_launch` welcome gate, not a lost auth session: account/sign-in paths never called `completeFirstLaunch()` after the Story 13.7 routed-onboarding refactor.
- Made the welcome gate auth-aware in `app/_layout.tsx`: the persisted Supabase session is resolved during boot and passed to `RootLayoutContent`; signed-in users are never redirected and get the stale flag cleared.
- Added `app/__tests__/welcome-redirect.test.tsx` (3 cases) to lock the behaviour.
- Removed dead code introduced by 13.7: unrouted `FirstCardGuidanceScreen` + its test, the `useOnboardingFlow` hook (its only consumer), the two stale `features/onboarding/index.ts` exports, and the orphaned `firstCardGuidance` i18n blocks in both locales.
- Validation: `yarn typecheck` clean; `yarn lint` clean; full `yarn test` suite green.

### File List

**Modified:**

- `app/_layout.tsx` — resolve persisted session at boot; make the welcome gate auth-aware and clear `first_launch` for signed-in users
- `features/onboarding/index.ts` — drop `FirstCardGuidanceScreen` and `useOnboardingFlow` exports
- `shared/i18n/locales/en.ts` — remove orphaned `onboarding.firstCardGuidance` keys
- `shared/i18n/locales/it.ts` — remove orphaned `onboarding.firstCardGuidance` keys
- `docs/sprint-artifacts/sprint-status.yaml` — add Story 13.7b to Sprint 14

**Added:**

- `app/__tests__/welcome-redirect.test.tsx` — regression coverage for the auth-aware welcome gate

**Deleted:**

- `features/onboarding/screens/FirstCardGuidanceScreen.tsx` — unrouted dead screen
- `features/onboarding/screens/FirstCardGuidanceScreen.test.tsx` — test for the deleted screen
- `features/onboarding/hooks/useOnboardingFlow.ts` — hook consumed only by the deleted screen
