# Story 6.18: OTP Email Verification Flow

**Epic:** 6 - User Authentication & Privacy
**Type:** User-Facing
**Status:** review

## Story

As a new user who has just created an account,
I want to verify my email address by entering a 6-digit OTP code sent to my inbox,
so that I can confirm my account without ever leaving the app or dealing with unreliable magic links.

## Context

This story replaces the current magic-link email confirmation flow with an in-app OTP verification screen. After successful account creation, the user is navigated to `/verify-email` where they enter a 6-digit code delivered to their email. On success, they are signed in and routed to the main app.

**Design dependency:** Story 6.17 approved by Ifero on 2026-04-28. Remaining non-design readiness items are tracked below.

**Supabase config:** `enable_confirmations = true` must be set under `[auth.email]` in `supabase/config.toml` and the production Supabase project dashboard.

**Key files:**

- `supabase/config.toml` — enable confirmations
- `shared/supabase/auth.ts` — add `verifyEmailOtp()` and `resendVerificationEmail()`
- `features/auth/VerifyEmailScreen.tsx` (new)
- `app/verify-email.tsx` (new route, re-export)
- `features/auth/CreateAccountScreen.tsx` — redirect to `/verify-email` after signup

## Ready-for-dev blockers (cleared)

- Approved Story 6.17 design handoff is recorded below and no longer blocks implementation.
- All non-design readiness blockers were verified on 2026-04-28 before implementation started.
- The approved 6.17 prototype locks auto-submit on the 6th digit / full 6-digit paste.
- The auth layer must expose stable verification error codes so UI and tests do not branch on raw Supabase error strings.

### Readiness evidence ledger

| Item                                    | Current state | Evidence                                                                                                                     | Owner                  | Verified on | Action to clear |
| --------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ----------- | --------------- |
| Story 6.17 design approval              | Verified      | Story 6.17 marked `done`; Ifero approved Figma OTP Verification page                                                         | Ifero                  | 2026-04-28  | None            |
| Local `auth.email.enable_confirmations` | Verified      | `supabase/config.toml` now shows `[auth.email] enable_confirmations = true`; local signup behavior re-verified               | Implementation owner   | 2026-04-28  | None            |
| Local email OTP template                | Verified      | Repo has custom `[auth.email.template.confirmation]` override and `supabase/templates/confirmation.html` uses `{{ .Token }}` | Implementation owner   | 2026-04-28  | None            |
| Production email confirmations          | Verified      | Production signup reached Supabase and returned `over_email_send_rate_limit`, proving email confirmations are active         | Implementation owner   | 2026-04-28  | None            |
| Production OTP email template           | Verified      | Production template updated in the production dashboard and confirmed to use `{{ .Token }}` for OTP delivery                 | Supabase project owner | 2026-04-28  | None            |

Status rule: keep Story 6.18 in `drafted` until every non-design row above is either verified or explicitly waived by Ifero.

## Approved 6.17 Design Handoff

- **Approved by:** Ifero on 2026-04-28
- **Figma page:** `OTP Verification`
- **Approved frame names:**
  - Light: `OTP Verify — Empty — Light`, `OTP Verify — Filling — Light`, `OTP Verify — Complete — Light`, `OTP Verify — Loading — Light`, `OTP Verify — Wrong OTP — Light`, `OTP Verify — Expired OTP — Light`, `OTP Verify — Verification Unavailable — Light`, `OTP Verify — Resend Success — Light`, `OTP Verify — Resend Failure — Light`, `OTP Verify — Success — Light`
  - Dark: `OTP Verify — Empty — Dark`, `OTP Verify — Filling — Dark`, `OTP Verify — Complete — Dark`, `OTP Verify — Loading — Dark`, `OTP Verify — Wrong OTP — Dark`, `OTP Verify — Expired OTP — Dark`, `OTP Verify — Verification Unavailable — Dark`, `OTP Verify — Resend Success — Dark`, `OTP Verify — Resend Failure — Dark`, `OTP Verify — Success — Dark`
- **Locked verify trigger:** auto-submit immediately on the 6th digit or after a full 6-digit paste
- **Locked success handoff:** success is transition-only and practically instant; any success styling may appear only momentarily and must not delay navigation into the main app

## Dev / QA Handoff Notes

### Interaction contract

- Focus lands on the first OTP cell on screen entry.
- OTP entry accepts numeric characters only; non-digit input is ignored.
- Typing advances focus; backspace on an empty cell moves backward and clears the previous cell.
- Pasting a full 6-digit code fills all cells left-to-right and triggers verification once complete.
- Any edit after an OTP error clears the error state before the next submit attempt.
- Submit behavior is locked by the approved 6.17 prototype: entering the 6th digit or pasting a full 6-digit code triggers verification immediately, and the Confirm CTA transitions to loading in sync with the OTP cells.
- Success is transition-only and effectively instant. Once OTP verification succeeds, navigation proceeds immediately; any success styling may appear only momentarily and must not become a separate confirmation screen.
- Resend cooldown restarts only after a successful resend response.
- The "Wrong email? Go back" path returns to `/create-account` and preserves the email field only; password, confirm-password, consent state, and transient server errors reset.
- The resend cooldown uses an absolute expiry timestamp so background/foreground transitions do not reset it or make it go negative.

### Additional error handling

- Verification network failure shows inline error: "Couldn't verify right now. Check your connection and try again."
- Resend failure shows inline error and does not restart the cooldown timer.
- Missing or invalid `email` query param routes back to `/create-account` instead of rendering a broken screen.

### Error contract

- `verifyEmailOtp()` must expose stable error codes for UI branching and tests. Minimum codes: `invalid_otp`, `expired_otp`, `network_error`, `unknown_error`.
- `VerifyEmailScreen` branches on normalized error codes, not raw provider message text.

### Dependency evidence required before implementation starts

- Verified local confirmation setting recorded with owner + date
- Verified local email template behavior recorded with owner + date
- Verified production confirmation setting recorded with owner + date
- Verified production email template behavior recorded with owner + date

### QA notes

- Manual path: create account -> redirect to `/verify-email` -> wrong code -> expired code -> resend -> successful code -> back stack cleared.
- Verify fallback behavior when confirmations are disabled and `signUp()` returns a session immediately.
- Verify timer behavior survives brief background/foreground transitions without going negative.

## Acceptance Criteria

### AC1: Supabase OTP confirmations enabled

- [x] `supabase/config.toml` has `enable_confirmations = true` under `[auth.email]`
- [x] Production Supabase project has "Enable email confirmations" turned on
- [x] Email template in Supabase project sends OTP code (not a magic link) — using the Supabase email OTP token variable (`{{ .Token }}`) in the template body

### AC2: New auth functions

- [ ] `verifyEmailOtp(email: string, token: string): Promise<AuthResult<AuthSession>>` added to `shared/supabase/auth.ts`
  - Calls `supabase.auth.verifyOtp({ email, token, type: 'signup' })`
  - Returns a typed `AuthResult` consistent with existing auth functions
- [x] `verifyEmailOtp()` exposes stable error codes for UI branching and tests: `invalid_otp`, `expired_otp`, `network_error`, `unknown_error`
- [x] `resendVerificationEmail(email: string): Promise<AuthResult<void>>` added to `shared/supabase/auth.ts`
  - Calls `supabase.auth.resend({ type: 'signup', email })`

### AC3: `/verify-email` route and screen

- [x] `app/verify-email.tsx` created as a thin re-export of `features/auth/VerifyEmailScreen`
- [x] Route accepts `email` as a URL query parameter (`/verify-email?email=user@example.com`)
- [x] `/verify-email` is registered in the root Expo Router stack with standard push presentation and the approved auth-screen header behavior
- [x] Screen implements the approved Figma design from Story 6.17:
  - App icon at top centre
  - "Verify your email" heading
  - "We sent a 6-digit code to {email}" subtitle with the email address displayed
  - 6 individual OTP cell inputs, auto-advance on digit entry, auto-submit on 6th digit
  - "Confirm" primary CTA button (disabled until 6 digits entered)
  - "Resend code" text link with 60s cooldown timer, active after cooldown
  - "Wrong email? Go back" text link navigates back to `/create-account`

### AC4: State handling

- [x] **Loading state:** CTA shows spinner while `verifyEmailOtp()` is in flight; inputs disabled
- [x] **Error — wrong OTP:** Cell borders turn error-red; error message "Incorrect code. Please try again." displayed below cells; inputs remain editable
- [x] **Error — expired OTP:** Error message "This code has expired. Please request a new one." displayed; Resend link activated immediately regardless of cooldown
- [x] **Error — network / verification unavailable:** Inline error message "Couldn't verify right now. Check your connection and try again." displayed; CTA becomes enabled again after the request settles
- [x] **Success:** Navigate to `/` (main app) immediately on successful verification; any success visual is transition-only, visible only momentarily, and must not delay navigation or create a separate confirmation screen

### AC5: Resend flow

- [x] "Resend code" triggers `resendVerificationEmail(email)`
- [x] 60-second countdown timer starts after initial send AND after each resend
- [x] Link is disabled and shows "Resend in 0:42" format during cooldown
- [x] Link is active when cooldown expires
- [x] Successful resend shows brief inline confirmation ("Code resent")
- [x] Failed resend shows inline error and leaves the cooldown timer unchanged

### AC6: `CreateAccountScreen` updated

- [x] After successful `signUp()`, instead of showing the status message, navigate to `/verify-email?email={email}`
- [x] Remove the `statusMessage` state and associated UI from `CreateAccountScreen`
- [x] If `signUp()` returns a session immediately (email confirmations disabled in env), navigate directly to `/` as before — maintain backwards compatibility

### AC7: Navigation / stack

- [x] `/verify-email` is a full route in the Expo Router stack, not a modal
- [x] Back navigation from `/verify-email` goes to `/create-account`
- [x] After successful OTP verification and navigation to `/`, the verify-email and create-account routes are removed from the back stack (use `router.replace('/')`)
- [x] Acceptance check: after success and arrival on `/`, pressing back does not return to `/verify-email` or `/create-account`

### AC8: Tests

- [x] `shared/supabase/auth.test.ts` — new tests for `verifyEmailOtp()`: success, wrong token, expired token, network error
- [x] `shared/supabase/auth.test.ts` — new test for `resendVerificationEmail()`: success and error cases
- [x] `features/auth/__tests__/VerifyEmailScreen.test.tsx` (new) — component tests:
  - Renders correctly with email param
  - 6-cell input renders and accepts digits
  - Auto-submits on 6th digit
  - Shows error state on wrong OTP
  - Shows expired error state
  - Shows network error state
  - Resend button cooldown behaviour
  - Redirects when email param is missing or invalid
- [x] `features/auth/__tests__/CreateAccountScreen.test.tsx` — updated: verify navigation to `/verify-email` (not status message) on successful signup

## Technical Notes

- OTP cell inputs: 6 controlled `TextInput` components in a row, each `maxLength={1}`, `keyboardType="number-pad"`. On change, auto-focus next cell. On backspace, auto-focus previous cell.
- Email passed as URL param: `router.push({ pathname: '/verify-email', params: { email } })` — read via `useLocalSearchParams()` in the screen
- `router.replace('/')` after success prevents back-navigation to the verification screen
- Supabase `verifyOtp` with `type: 'signup'` is the correct call for email verification (not `type: 'email'`)
- Persist resend cooldown as an absolute expiry timestamp rather than only decrementing local interval state.
- Reuse the same email validation rule as Create Account when checking the query param.

## Definition of Done

- [x] Story 6.17 Figma frames approved by Ifero before this story begins
- [x] `/verify-email` screen implemented to approved designs
- [x] All AC items checked
- [x] `enable_confirmations = true` set locally and in production
- [x] All new and existing tests pass
- [ ] PR reviewed and approved

## Definition of Ready Checklist

| #   | Gate               | Status                                                                    |
| --- | ------------------ | ------------------------------------------------------------------------- |
| 1   | Design Approved    | ✅ Story 6.17 approved by Ifero on 2026-04-28                             |
| 2   | Story Spec Final   | ✅ Acceptance criteria and handoff notes are documented                   |
| 3   | Interaction Spec   | ✅ OTP focus, paste, backspace, resend, and navigation behaviors defined  |
| 4   | Dependencies Clear | ✅ Confirmation-setting and email-template evidence verified before build |
| 5   | Edge Cases Defined | ✅ Wrong OTP, expired OTP, network failure, resend failure, missing email |
| 6   | Tech Notes         | ✅ Supabase, routing, and OTP behavior constraints documented             |
| 7   | Testability        | ✅ Unit tests, component tests, and QA notes define verification          |

**Gate 4 detail:** readiness evidence ledger was completed on 2026-04-28; implementation proceeded against verified local and production confirmation settings plus OTP email templates.

## Tasks / Subtasks

- [x] **Task 1: Add auth-layer OTP tests and APIs** (AC2, AC8)
  - [x] 1.1 Add failing tests for `verifyEmailOtp()` success and normalized error codes
  - [x] 1.2 Add failing tests for `resendVerificationEmail()` success and failure cases
  - [x] 1.3 Implement stable OTP error-code normalization in `shared/supabase/auth.ts`

- [x] **Task 2: Redirect signup into `/verify-email`** (AC3, AC6, AC7)
  - [x] 2.1 Remove create-account status-message confirmation path
  - [x] 2.2 Push to `/verify-email` with email handoff when signup returns no session
  - [x] 2.3 Preserve only the email field when routing back to `/create-account`

- [x] **Task 3: Build OTP verification screen states and interactions** (AC3, AC4, AC5, AC7)
  - [x] 3.1 Implement 6-cell OTP entry with digit-only input, auto-advance, backspace, and full-paste handling
  - [x] 3.2 Implement loading, wrong-code, expired-code, verification-unavailable, resend-success, and resend-failure states
  - [x] 3.3 Implement absolute resend cooldown persistence and success navigation stack reset

- [x] **Task 4: Validate and review the story slice** (AC8)
  - [x] 4.1 Add/update component tests for create-account and verify-email flows
  - [x] 4.2 Run full Jest suite, ESLint, and TypeScript checks
  - [x] 4.3 Resolve dev review findings until approval
  - [x] 4.4 Resolve QA review findings until approval

## Dev Agent Record

### Agent Model Used

GPT-5.4

### Debug Log References

- 2026-04-29: Story scaffold added because the draft lacked Tasks / Subtasks, Dev Agent Record, File List, Change Log, and Status sections needed for BMAD tracking.
- 2026-04-29: Figma OTP Verification page metadata was used to align copy, layout states, and component reuse with Story 6.17 approved frames.
- 2026-04-29: Initial dev review flagged stack-reset semantics, concurrent verify calls, and missing `unknown_error` test coverage; all were fixed and revalidated.
- 2026-04-29: Initial QA review required explicit `router.replace('/')` in the success handoff; success navigation was updated, then the full validation suite was rerun.

### Completion Notes List

- Added `verifyEmailOtp()` and `resendVerificationEmail()` to `shared/supabase/auth.ts` with stable `invalid_otp`, `expired_otp`, `network_error`, and `unknown_error` codes.
- Replaced the post-signup create-account status message with `/verify-email` navigation while preserving the direct-to-home fallback when Supabase returns a session immediately.
- Implemented `VerifyEmailScreen` using existing auth layout primitives plus OTP-specific cell handling, resend cooldown persistence, inline state messaging, and the approved Story 6.17 copy.
- Added comprehensive Jest coverage for auth normalization, verify-email UI states, resend success/failure, cooldown behavior, redirect guards, and the wrong-email return path.
- Final validation passed with 1305 Jest tests, `yarn lint`, and `yarn typecheck`.
- Dev subagent review approved after follow-up fixes, and QA subagent review approved after the final navigation adjustment.

### Change Log

- 2026-04-29: Added Story 6.18 execution tracking sections to the story artifact so implementation could be documented under BMAD workflow rules.
- 2026-04-29: Added OTP verification and resend auth APIs plus stable error-code normalization tests.
- 2026-04-29: Updated create-account to route into `/verify-email` and prefill the email field on the return path.
- 2026-04-29: Implemented `VerifyEmailScreen`, registered the route, and matched Story 6.17 state copy for loading, error, resend, and success handoff.
- 2026-04-29: Added component coverage for verify-email auto-submit, paste, cooldown, resend failure, and invalid/missing email redirects.
- 2026-04-29: Addressed dev and QA review findings, reran the full test suite, lint, and typecheck, and moved the story to review.

### File List

- `shared/supabase/auth.ts` — MODIFIED: Added OTP verification, resend helpers, stable error-code normalization, and review-follow-up guards
- `shared/supabase/auth.test.ts` — MODIFIED: Added OTP verification and resend tests, including `unknown_error` normalization coverage
- `features/auth/CreateAccountScreen.tsx` — MODIFIED: Replaced status-message signup completion with verify-email routing and email-prefill support
- `features/auth/VerifyEmailScreen.tsx` — NEW: Added the OTP verification UI, state handling, cooldown persistence, and success navigation logic
- `features/auth/__tests__/CreateAccountScreen.test.tsx` — MODIFIED: Added verify-email redirect and email-prefill assertions
- `features/auth/__tests__/VerifyEmailScreen.test.tsx` — NEW: Added render, auto-submit, paste, error-state, resend, cooldown, and redirect coverage
- `features/auth/index.ts` — MODIFIED: Exported `VerifyEmailScreen`
- `app/verify-email.tsx` — NEW: Added thin route re-export for the verify-email screen
- `app/_layout.tsx` — MODIFIED: Registered the verify-email stack route and set `initialRouteName = 'index'`
- `docs/sprint-artifacts/stories/6-18-otp-email-verification-flow.md` — MODIFIED: Updated acceptance tracking, readiness notes, implementation record, and status
- `docs/sprint-artifacts/sprint-status.yaml` — MODIFIED: Moved Story 6.18 to review

## Status

review
