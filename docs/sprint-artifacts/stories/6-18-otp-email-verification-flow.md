# Story 6.18: OTP Email Verification Flow

**Epic:** 6 - User Authentication & Privacy
**Type:** User-Facing
**Status:** drafted

## Story

As a new user who has just created an account,
I want to verify my email address by entering a 6-digit OTP code sent to my inbox,
so that I can confirm my account without ever leaving the app or dealing with unreliable magic links.

## Context

This story replaces the current magic-link email confirmation flow with an in-app OTP verification screen. After successful account creation, the user is navigated to `/verify-email` where they enter a 6-digit code delivered to their email. On success, they are signed in and routed to the main app.

**Blocked on:** Story 6.17 (OTP verification screen Figma frames) — implementation must not begin until Ifero approves the designs.

**Supabase config:** `enable_confirmations = true` must be set under `[auth.email]` in `supabase/config.toml` and the production Supabase project dashboard.

**Key files:**

- `supabase/config.toml` — enable confirmations
- `shared/supabase/auth.ts` — add `verifyEmailOtp()` and `resendVerificationEmail()`
- `features/auth/VerifyEmailScreen.tsx` (new)
- `app/verify-email.tsx` (new route, re-export)
- `features/auth/CreateAccountScreen.tsx` — redirect to `/verify-email` after signup

## Remaining blocker to ready-for-dev

- Story 6.17 must be completed and explicitly approved by Ifero. Record the approved frame names in this story before promotion.
- Local and production confirmation settings must be verified by the implementation owner before development starts.
- The approved 6.17 prototype must lock the verify trigger decision: manual Confirm only, or auto-submit on the 6th digit.
- The auth layer must expose stable verification error codes so UI and tests do not branch on raw Supabase error strings.
- Confirmation-setting and email-template verification must be recorded here or in a linked checklist with owner and date verified.

## Dev / QA Handoff Notes

### Interaction contract

- Focus lands on the first OTP cell on screen entry.
- OTP entry accepts numeric characters only; non-digit input is ignored.
- Typing advances focus; backspace on an empty cell moves backward and clears the previous cell.
- Pasting a full 6-digit code fills all cells left-to-right and triggers verification once complete.
- Any edit after an OTP error clears the error state before the next submit attempt.
- Submit behavior must match the approved 6.17 prototype. If auto-submit is approved, entering the 6th digit auto-submits and the Confirm CTA transitions to loading immediately. If not approved, the Confirm CTA is the only submit action.
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

- Verified local confirmation setting recorded
- Verified production confirmation setting recorded
- OTP email-template owner identified
- Verification date recorded

### QA notes

- Manual path: create account -> redirect to `/verify-email` -> wrong code -> expired code -> resend -> successful code -> back stack cleared.
- Verify fallback behavior when confirmations are disabled and `signUp()` returns a session immediately.
- Verify timer behavior survives brief background/foreground transitions without going negative.

## Acceptance Criteria

### AC1: Supabase OTP confirmations enabled

- [ ] `supabase/config.toml` has `enable_confirmations = true` under `[auth.email]`
- [ ] Production Supabase project has "Enable email confirmations" turned on
- [ ] Email template in Supabase project sends OTP code (not a magic link) — using the `{{ .Token }}` variable in the template body

### AC2: New auth functions

- [ ] `verifyEmailOtp(email: string, token: string): Promise<AuthResult<AuthSession>>` added to `shared/supabase/auth.ts`
  - Calls `supabase.auth.verifyOtp({ email, token, type: 'signup' })`
  - Returns a typed `AuthResult` consistent with existing auth functions
- [ ] `verifyEmailOtp()` exposes stable error codes for UI branching and tests: `invalid_otp`, `expired_otp`, `network_error`, `unknown_error`
- [ ] `resendVerificationEmail(email: string): Promise<AuthResult<void>>` added to `shared/supabase/auth.ts`
  - Calls `supabase.auth.resend({ type: 'signup', email })`

### AC3: `/verify-email` route and screen

- [ ] `app/verify-email.tsx` created as a thin re-export of `features/auth/VerifyEmailScreen`
- [ ] Route accepts `email` as a URL query parameter (`/verify-email?email=user@example.com`)
- [ ] `/verify-email` is registered in the root Expo Router stack with standard push presentation and the approved auth-screen header behavior
- [ ] Screen implements the approved Figma design from Story 6.17:
  - App icon at top centre
  - "Verify your email" heading
  - "We sent a 6-digit code to {email}" subtitle with the email address displayed
  - 6 individual OTP cell inputs, auto-advance on digit entry, auto-submit on 6th digit
  - "Confirm" primary CTA button (disabled until 6 digits entered)
  - "Resend code" text link with 60s cooldown timer, active after cooldown
  - "Wrong email? Go back" text link navigates back to `/create-account`

### AC4: State handling

- [ ] **Loading state:** CTA shows spinner while `verifyEmailOtp()` is in flight; inputs disabled
- [ ] **Error — wrong OTP:** Cell borders turn error-red; error message "Incorrect code. Please try again." displayed below cells; inputs remain editable
- [ ] **Error — expired OTP:** Error message "This code has expired. Please request a new one." displayed; Resend link activated immediately regardless of cooldown
- [ ] **Error — network / verification unavailable:** Inline error message "Couldn't verify right now. Check your connection and try again." displayed; CTA becomes enabled again after the request settles
- [ ] **Success:** Navigate to `/` (main app) on successful verification

### AC5: Resend flow

- [ ] "Resend code" triggers `resendVerificationEmail(email)`
- [ ] 60-second countdown timer starts after initial send AND after each resend
- [ ] Link is disabled and shows "Resend in 0:42" format during cooldown
- [ ] Link is active when cooldown expires
- [ ] Successful resend shows brief inline confirmation ("Code resent")
- [ ] Failed resend shows inline error and leaves the cooldown timer unchanged

### AC6: `CreateAccountScreen` updated

- [ ] After successful `signUp()`, instead of showing the status message, navigate to `/verify-email?email={email}`
- [ ] Remove the `statusMessage` state and associated UI from `CreateAccountScreen`
- [ ] If `signUp()` returns a session immediately (email confirmations disabled in env), navigate directly to `/` as before — maintain backwards compatibility

### AC7: Navigation / stack

- [ ] `/verify-email` is a full route in the Expo Router stack, not a modal
- [ ] Back navigation from `/verify-email` goes to `/create-account`
- [ ] After successful OTP verification and navigation to `/`, the verify-email and create-account routes are removed from the back stack (use `router.replace('/')`)
- [ ] Acceptance check: after success and arrival on `/`, pressing back does not return to `/verify-email` or `/create-account`

### AC8: Tests

- [ ] `shared/supabase/auth.test.ts` — new tests for `verifyEmailOtp()`: success, wrong token, expired token, network error
- [ ] `shared/supabase/auth.test.ts` — new test for `resendVerificationEmail()`: success and error cases
- [ ] `features/auth/__tests__/VerifyEmailScreen.test.tsx` (new) — component tests:
  - Renders correctly with email param
  - 6-cell input renders and accepts digits
  - Auto-submits on 6th digit
  - Shows error state on wrong OTP
  - Shows expired error state
  - Shows network error state
  - Resend button cooldown behaviour
  - Redirects when email param is missing or invalid
- [ ] `features/auth/__tests__/CreateAccountScreen.test.tsx` — updated: verify navigation to `/verify-email` (not status message) on successful signup

## Technical Notes

- OTP cell inputs: 6 controlled `TextInput` components in a row, each `maxLength={1}`, `keyboardType="number-pad"`. On change, auto-focus next cell. On backspace, auto-focus previous cell.
- Email passed as URL param: `router.push({ pathname: '/verify-email', params: { email } })` — read via `useLocalSearchParams()` in the screen
- `router.replace('/')` after success prevents back-navigation to the verification screen
- Supabase `verifyOtp` with `type: 'signup'` is the correct call for email verification (not `type: 'email'`)
- Persist resend cooldown as an absolute expiry timestamp rather than only decrementing local interval state.
- Reuse the same email validation rule as Create Account when checking the query param.

## Definition of Done

- [ ] Story 6.17 Figma frames approved by Ifero before this story begins
- [ ] `/verify-email` screen implemented to approved designs
- [ ] All AC items checked
- [ ] `enable_confirmations = true` set locally and in production
- [ ] All new and existing tests pass
- [ ] PR reviewed and approved

## Definition of Ready Checklist

| #   | Gate               | Status                                                                    |
| --- | ------------------ | ------------------------------------------------------------------------- |
| 1   | Design Approved    | ❌ Blocked on Story 6.17 approval                                         |
| 2   | Story Spec Final   | ✅ Acceptance criteria and handoff notes are documented                   |
| 3   | Interaction Spec   | ✅ OTP focus, paste, backspace, resend, and navigation behaviors defined  |
| 4   | Dependencies Clear | ❌ Blocked on 6.17 approval and confirmation-setting verification         |
| 5   | Edge Cases Defined | ✅ Wrong OTP, expired OTP, network failure, resend failure, missing email |
| 6   | Tech Notes         | ✅ Supabase, routing, and OTP behavior constraints documented             |
| 7   | Testability        | ✅ Unit tests, component tests, and QA notes define verification          |
