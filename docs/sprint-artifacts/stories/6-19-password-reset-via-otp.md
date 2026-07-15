---
baseline_commit: b3a5d1cdb22673ddb07c3d1e301a575d95390c90
---

# Story 6.19: Password reset via OTP (replace the dead deep-link recovery)

Status: done

Epic: 6 — User Authentication & Privacy

## Story

As a user who forgot my password,
I want to reset it with an emailed one-time code (OTP) entered in the app,
so that I can regain access without relying on a deep link that never lands.

## Context

Reported by ifero (Sprint 17). The forgot/reset flow is wired end-to-end but **cannot complete on a device** — three independent breakpoints (verified 2026-07-11):

1. **Send points nowhere usable.** `ForgotPasswordScreen.tsx:67` → `requestPasswordReset` (`shared/supabase/auth.ts:316-332`) → `resetPasswordForEmail(email, { redirectTo: 'myloyaltycards://reset-password' })` (`:318`, used `:322`).
2. **App scheme NOT in the Supabase redirect allowlist.** Scheme is `myloyaltycards` (`app.json:8`), but `config.toml` has `site_url = "http://127.0.0.1:3000"` (`:154`) and `additional_redirect_urls = ["https://127.0.0.1:3000"]` (`:156`). Supabase rejects the app redirect → falls back to `site_url` (localhost web), never the app.
3. **No recovery email template.** Only `[auth.email.template.confirmation]` exists (`config.toml:230-232`); there is **no** `[auth.email.template.recovery]`, so recovery uses the Supabase default **magic link**, not an OTP.

Plus **warm-start deep links are unhandled**: `ResetPasswordScreen` only reads `getInitialURL()` (cold-start only, `core/utils/get-initial-url.ts:9`); there is no `Linking.addEventListener('url', …)` anywhere. The landing screen (`ResetPasswordScreen.tsx:45-50`, `setSession` `:164-167`) expects params it never receives.

**Fix:** replace the deep-link recovery with an in-app **OTP flow mirroring the proven 6.18** email-verification (single 8-digit field). Config is already OTP-shaped (`config.toml` `otp_length = 8` `:215`, `otp_expiry = 3600` `:217`; `confirmation.html` uses `{{ .Token }}`). Supersedes 6-8's un-verified deep-link reset. **Sequenced before 6-20**, which reuses this story's plumbing.

## Architecture Decision — AD-6-19-01: OTP recovery, reusing the 6.18 verify pattern

**Flow:** `ForgotPasswordScreen` (enter email) → `sendPasswordResetOtp` → OTP-verify screen (8-digit, reused) → shared new-password screen (`updatePassword`) → `/`. No redirect allowlist, no `setSession`, no hash parsing, no `getInitialURL`.

**New shared plumbing (`shared/supabase/auth.ts`) — reused by 6-20:**

- `sendPasswordResetOtp(email): AuthResult<void>` → `resetPasswordForEmail(email)` **without** `redirectTo` (the vestige of the dead flow). With a `{{ .Token }}` recovery template this sends a numeric code (Context7-confirmed); preserves no-user-enumeration (success regardless of whether the email exists).
- `verifyPasswordResetOtp(email, token): AuthResult<AuthSession>` → `verifyOtp({ email, token, type: 'recovery' })`. **Rename** `normalizeVerifyEmailOtpError` → `normalizeOtpError` (`auth.ts:68-95`) and share it across both verify functions (pure rename, no behavior change).
- `updatePassword(newPassword)` reused unchanged (`auth.ts:342-355`; the recovery session from `verifyOtp` authorizes it).

**OTP-verify screen** — baked-in recommendation: **parametrize `VerifyEmailScreen`** with `purpose: 'signup' | 'recovery'` (default `'signup'`) switching the verify fn, resend fn, success route, and invalid-email fallback. Reuse over duplication (UI + 60s cooldown identical; copy is i18n-driven). **MANDATORY:** add regression tests proving the signup path is unchanged. [Open decision #2 — ifero may prefer a separate screen for zero regression risk.]

**New-password screen** — **shared with 6-20**: repurpose `ResetPasswordScreen`'s form body (`:287-357`: two `PasswordInput`s + `PasswordStrengthIndicator` + `isValidPassword`), **remove** its dead deep-link/`setSession` preamble (`:129-187`), and add a success-destination param (recovery → `/`). [Open decision #3.]

## Acceptance Criteria

1. **Recovery email is OTP-based.** Given a user requests a reset, When the recovery email is sent, Then it carries an 8-digit `{{ .Token }}` code (not a link). Requires `[auth.email.template.recovery]` in `config.toml` + `supabase/templates/recovery.html`, and the **production dashboard** recovery template switched to OTP (human/dashboard step — see Definition of Ready).
2. **Send wrapper.** Given `sendPasswordResetOtp(email)`, Then it calls `resetPasswordForEmail(email)` (no `redirectTo`), returns `AuthResult<void>`, and surfaces success even for unknown emails (no enumeration).
3. **Verify wrapper.** Given `verifyPasswordResetOtp(email, token)`, Then it calls `verifyOtp({ email, token, type: 'recovery' })`, returns `AuthResult<AuthSession>`, and normalizes errors to `invalid_otp | expired_otp | network_error | unknown_error`.
4. **Forgot screen sends + navigates.** Given a valid email on `ForgotPasswordScreen`, When "Send" succeeds, Then navigate to the recovery OTP screen with `{ email, sentAt: String(Date.now()) }` (mirroring `CreateAccountScreen.tsx:146-156`), replacing the current "check your email" confirmation state (`ForgotPasswordScreen.tsx:101-132`).
5. **OTP verify screen.** Given the recovery OTP screen with a valid `email` param, When 8 digits are entered/pasted, Then it auto-submits `verifyPasswordResetOtp`; wrong/expired/network render the same inline states as 6.18; a 60s absolute-expiry cooldown governs resend (`sendPasswordResetOtp`); an invalid `email` param routes back to `/forgot-password`.
6. **New-password screen.** Given the recovery session from AC5, When the user submits a valid new password (`isValidPassword`, `core/auth/validation.ts:25`) matching confirm, Then `updatePassword` is called and success routes to `/` via `router.replace('/')`; strength shown via `PasswordStrengthIndicator`.
7. **Routing/stack.** Given success, Then forgot-password, OTP, and new-password routes are cleared from the back stack (`router.replace`). New routes registered in `app/_layout.tsx` with i18n titles; app route files are thin re-exports.
8. **Copy localized.** All new strings added to **both** `shared/i18n/locales/en.ts` and `it.ts` (no literals; no key-parity test exists → update both manually).
9. **Tests ≥80%**, co-located `*.test.ts(x)` (NO `__tests__`).

## Tasks / Subtasks

- [x] **T1** (AC1) Add `[auth.email.template.recovery]` to `config.toml` + `supabase/templates/recovery.html` (clone `confirmation.html`, `{{ .Token }}`); document the production-dashboard step.
- [x] **T2** (AC2,3,9) Add `sendPasswordResetOtp` + `verifyPasswordResetOtp` to `auth.ts`; rename `normalizeVerifyEmailOtpError` → `normalizeOtpError` and share it; add `auth.test.ts` suites asserting exact payloads (`resetPasswordForEmail(email)` with no second arg; `verifyOtp({ email, token, type: 'recovery' })`) + all error codes.
- [x] **T3** (AC4,7,8,9) Rewire `ForgotPasswordScreen` to send-then-navigate; update its tests.
- [x] **T4** (AC5,7,8,9) Recovery OTP verify screen — parametrize `VerifyEmailScreen` with `purpose` (default `'signup'`) + regression tests for the signup path; register the route.
- [x] **T5** (AC6,7,8,9) Shared new-password screen (repurpose `ResetPasswordScreen`, deep-link preamble removed, success-destination param) + route + tests.
- [x] **T6** (Open decision #2) Remove the dead `requestPasswordReset` + `ResetPasswordScreen` + `reset-password` route + unused `getInitialURL` usage (recommended), OR leave dormant.
- [x] **T7** (process) On completion set the story `.md` Status → `review`; populate Dev Agent Record.

## Dev Notes

### Reusable 6.18 pieces (proven)

- `shared/supabase/auth.ts` — `verifyEmailOtp(email, token)` `:212-241` (`type:'email'`), `resendVerificationEmail` `:246-262` (`type:'signup'`), `normalizeVerifyEmailOtpError` `:68-95`, `AuthResult`/`AuthError`/`AuthSession` `:24-36`, `updatePassword` `:342-355`.
- `features/auth/VerifyEmailScreen.tsx` — single 8-digit field (`OTP_LENGTH=8` `:16`, `RESEND_COOLDOWN_MS=60_000` `:18`, module-level absolute-expiry `Map` `:19`), auto-submit on 8th digit (`:235-242`), verify `:196`, resend `:256`, success `router.dismissTo('/')`+`replace('/')` `:217-218`, invalid-email `router.replace('/create-account')` `:110-112`.
- Send+navigate pattern to mirror: `CreateAccountScreen.tsx:146-156`.
- Test patterns: `shared/supabase/auth.test.ts` (`verifyEmailOtp` suite `:398-475`, `requestPasswordReset` `:617-667`, `updatePassword` `:673-714`); `features/auth/VerifyEmailScreen.test.tsx`.

### Dead-flow references (to remove or leave — Open decision #2)

`ForgotPasswordScreen.tsx:67`; `auth.ts:316-332` (`requestPasswordReset`, `redirectTo` `:318,:322`); `config.toml:154,156` (allowlist), `:230-232` (only confirmation template); `ResetPasswordScreen.tsx` (`:45-50`, `parseHashFragment` `:22-38`, `setSession` `:164-167`, form `:287-357`); `core/utils/get-initial-url.ts:9`; `app/_layout.tsx:253-258` (`reset-password` route).

### Human prerequisite (dashboard) — non-blocking for dev

The **production** Supabase recovery email template must be switched to an OTP (`{{ .Token }}`) template — a manual dashboard step, exactly as 6.18 tracked for confirmation (`6-18-otp-email-verification-flow.md:42-44`). Dev can build and test against the local `config.toml` recovery template; the prod dashboard switch is a **release-time human action** (like the Chromatic/Sentry human prereqs in Sprint 16). This does **not** block `ready-for-dev`.

### Test Plan

- `auth.test.ts`: send success/error/throw; verify success/invalid/expired/network/unknown (reuse `verifyEmailOtp` fixtures `:398-475`; `updatePassword` already covered).
- OTP screen: render with/without email param; digit-only + 8-digit paste auto-submit; wrong/expired/network states; resend cooldown; invalid-email redirect. **Plus** signup-path regression tests (purpose default unchanged).
- New-password screen: validation (weak/mismatch/empty); success → `/`; update error surfaced.
- `ForgotPasswordScreen.test.tsx`: navigation payload `{ email, sentAt }` on success.
- Watch rate limits during testing: `email_sent = 2`/hr (`config.toml:182`), `token_verifications = 30`/5min (`:192`).

### Regressions to preserve

Signup email-OTP (6.18/6.18a) unchanged — `verifyEmailOtp` stays `type:'email'`, `resendVerificationEmail` stays `type:'signup'`; if parametrizing `VerifyEmailScreen`, default `purpose='signup'` and add explicit signup-path tests; the `normalizeOtpError` rename must keep all existing `verifyEmailOtp` error-code tests green (`auth.test.ts:423-474`). Existing sign-in + its "Forgot password?" link (`SignInScreen.tsx:156-171`) still land on the (rewired) forgot screen. Guest mode unaffected. Keep the auth barrel/routes valid (if removing `reset-password`, remove its route + re-export + tests together).

### Convention note

Neighboring auth screens use local `useState` + `useCallback` (NOT React Hook Form) — match them for consistency (do not introduce RHF/Zod here). Tests co-located as `features/auth/*.test.tsx` (the `features/auth/__tests__/…` paths cited in the 6-18 docs are **stale** — superseded by the Story-16 co-location migration).

### Definition of Ready

- [x] Root cause confirmed in code (three breakpoints, file:line)
- [x] AD locked (AD-6-19-01); shared plumbing specified
- [x] ACs testable + AC-mapped
- [x] Reuses proven 6.18 pattern (no reinvention)
- [ ] Open decisions confirmed by ifero (below) — recommended defaults baked in
- [ ] Human prereq: prod recovery email template (release-time; non-blocking for dev)

### Open decisions (recommended defaults applied)

1. **Recovery email template = human/dashboard prereq** — baked in as a documented release step (local `config.toml` template built by dev; prod dashboard switch owned by ifero). Confirm ownership.
2. **Remove the dead deep-link path** — baked in: remove `ResetPasswordScreen` + `reset-password` route + `requestPasswordReset` + unused `getInitialURL` (deletes their tests) to avoid a confusing second path. **Also:** OTP-verify reuse = parametrize `VerifyEmailScreen` (recommended) vs new screen (zero-risk). Confirm.
3. **Shared new-password screen** for 6-19 + 6-20 with a success-destination param — baked in (the `ResetPasswordScreen` form body already is exactly this).
4. **Password policy** — baked in: no change (keep `isValidPassword` ≥8/letter/digit). Note Supabase `minimum_password_length = 6` (`config.toml:175-178`) is weaker than the app rule; tightening it is out of scope unless desired.

## Dev Agent Record

### Agent Model Used

`claude-opus-4-8` (Amelia / dev). Independent code-review and QA-review passes were run by separate `claude-sonnet-5` subagents (different model, per the review-gate protocol).

### Debug Log References

None — no blocking issues. `yarn typecheck`, `yarn lint`, `yarn test`, and coverage stayed green throughout.

### Completion Notes List

- **AD-6-19-01 implemented as specified.** The dead deep-link recovery is replaced with an in-app OTP flow that reuses the proven 6.18 email-verify pattern.
- **T2 (`shared/supabase/auth.ts`):** added `sendPasswordResetOtp` (`resetPasswordForEmail(email)` — no `redirectTo`, success even for unknown emails / no enumeration) and `verifyPasswordResetOtp` (`verifyOtp({ …, type: 'recovery' })`); renamed `normalizeVerifyEmailOtpError` → `normalizeOtpError` and shared it across both verify flows (pure rename).
- **T3 (`ForgotPasswordScreen`):** send-then-navigate to `/recovery-otp` with `{ email, sentAt }` (mirrors `CreateAccountScreen`); removed the dead "check your email" confirmation state; reworded user copy from "reset link" → "reset code" and renamed the `sendResetLink` key → `sendResetCode`.
- **T4 (`VerifyEmailScreen`):** parametrized with `purpose: 'signup' | 'recovery'` (default `'signup'`) via a `PURPOSE_CONFIG` table (verify/resend fns, i18n copy, success/invalid-email/wrong-email navigation). Recovery is bound through a thin `RecoveryOtpScreen` feature wrapper so `app/recovery-otp` stays a pure re-export. The `signup` path is proven unchanged by an explicit default-purpose regression guard plus the untouched 6.18 suite; the module-level resend-cooldown map key is namespaced by purpose to prevent cross-flow collision.
- **T5 (`NewPasswordScreen`):** shared new-password form repurposed from the deleted `ResetPasswordScreen` body (deep-link/`setSession` preamble removed), with a `successHref` prop (default `/`) so 6-20's Settings flow can reuse it with a different destination.
- **T6:** removed the dead flow — `ResetPasswordScreen` (+test), `app/reset-password`, `requestPasswordReset` (+tests), `core/utils/get-initial-url.ts`, the `reset-password` Stack.Screen, and the orphaned `auth.resetPassword` / `navigation.resetPassword` i18n keys.
- **T1 (`supabase/`):** added `[auth.email.template.recovery]` + `supabase/templates/recovery.html` (cloned from `confirmation.html`, `{{ .Token }}`).
- **AC7 back-stack:** cleared via `dismissTo('/')` + `replace('/new-password')` in the recovery config (kept out of the shared `NewPasswordScreen` so 6-20 preserves its stack).
- **Accepted design decisions (for ifero to confirm):** (1) success navigates straight to `/` with no confirmation screen — exactly per AC6 (`router.replace('/')`) and consistent with the signup OTP flow; (2) `NewPasswordScreen` surfaces a generic error rather than a mount-time session guard if it is ever reached without a recovery session — that path is outside the ACs, fails safely (Supabase rejects the update), and a guard would reintroduce the session-probing this story deliberately removed.
- **Reviews:** Sonnet code review (1 blocker — the AC7 back-stack bug — + 7 findings) and Sonnet QA review (test-coverage gaps) were each looped to **APPROVED / zero comments**.
- **Coverage:** touched files 96.8% stmts / 94.4% branch; full suite 1734 tests green.
- **Bilingual (EN/IT) email templates** (added post-review at ifero's request, 2026-07-14): both `supabase/templates/recovery.html` and `supabase/templates/confirmation.html` now carry English + Italian copy in a single template (Supabase serves one template per email type — there is no per-user-locale switching without custom SMTP + a send hook), with bilingual subject lines in `config.toml`. **Note:** `confirmation.html` originates in Story 6.18, but its bilingual conversion was **handled here in 6.19** so signup and recovery emails stay consistent; it is copy/markup only (no logic, not test-covered).

### ⚠️ Human release prerequisite (production Supabase dashboard)

Recovery is fully OTP-based locally via `config.toml`, but the **hosted project's Reset-Password email template must be switched to the OTP (`{{ .Token }}`) template** before shipping — _Authentication → Email Templates → Reset Password_. Until then, production recovery emails still send Supabase's default magic link. This is the same class of manual step Story 6.18 tracked for the confirmation template; it is non-blocking for dev. Paste the new bilingual `recovery.html` (and its bilingual subject) into that dashboard field; optionally refresh the prod **Confirm signup** template with the now-bilingual `confirmation.html` to match. **Owner: ifero. Status: ☐ pending (do at release).**

### File List

**Added**

- `app/new-password.tsx`
- `app/recovery-otp.tsx`
- `features/auth/NewPasswordScreen.tsx`
- `features/auth/NewPasswordScreen.test.tsx`
- `features/auth/RecoveryOtpScreen.tsx`
- `features/auth/RecoveryOtpScreen.test.tsx`
- `supabase/templates/recovery.html`

**Modified**

- `app/_layout.tsx`
- `core/auth/validation.ts`
- `features/auth/ForgotPasswordScreen.tsx`
- `features/auth/ForgotPasswordScreen.test.tsx`
- `features/auth/VerifyEmailScreen.tsx`
- `features/auth/VerifyEmailScreen.test.tsx`
- `features/auth/index.ts`
- `shared/i18n/locales/en.ts`
- `shared/i18n/locales/it.ts`
- `shared/supabase/auth.ts`
- `shared/supabase/auth.test.ts`
- `supabase/config.toml`
- `supabase/templates/confirmation.html` (Story 6.18 file — bilingual EN/IT conversion handled here; see Completion Notes)

**Deleted**

- `app/reset-password.tsx`
- `core/utils/get-initial-url.ts`
- `features/auth/ResetPasswordScreen.tsx`
- `features/auth/ResetPasswordScreen.test.tsx`

### Change Log

| Date       | Change                                                                                                                | Author       |
| ---------- | --------------------------------------------------------------------------------------------------------------------- | ------------ |
| 2026-07-09 | Drafted by PM (John) from ifero's bug report.                                                                         | John (PM)    |
| 2026-07-11 | Refined → ready-for-dev (AD-6-19-01; OTP recovery reusing the 6.18 pattern).                                          | Amelia (Dev) |
| 2026-07-14 | Implemented OTP recovery (T1–T7); dead deep-link flow removed; Sonnet code-review + QA both approved.                 | Amelia (Dev) |
| 2026-07-14 | Post-review: made recovery + confirmation email templates bilingual (EN/IT) + bilingual subjects, at ifero's request. | Amelia (Dev) |
