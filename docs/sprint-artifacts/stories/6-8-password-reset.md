# Story 6.8: Password Reset

**Epic:** 6 - User Authentication & Privacy
**Type:** User-Facing
**Status:** in-progress

## Goal

Allow users who have forgotten their password to reset it via email, so they can regain access to their account without losing their data.

## Acceptance Criteria

- "Forgot Password?" link visible on the Sign In screen
- User can enter their email to request a reset link
- Clear feedback message shown after submission (success and error cases)
- Deep-link from reset email opens a new-password form in-app (or via Supabase hosted UI)
- User is signed in automatically after successful reset
- No change to locally stored cards during this flow

## Technical Details & Implementation Breakdown

### 1. Forgot Password Entry Point

- Add "Forgot Password?" link/button below the password field on `SignInScreen.tsx`
- Navigate to a new `app/forgot-password.tsx` screen (Expo Router)
- Screen: single email input + "Send Reset Link" button

  ```tsx
  <TextInput placeholder="Email" keyboardType="email-address" autoCapitalize="none" />
  <Button title="Send Reset Link" onPress={handleSendReset} />
  ```

### 2. Supabase Password Reset Request

- Call `supabase.auth.resetPasswordForEmail` with a `redirectTo` deep link:

  ```ts
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'myloyaltycards://reset-password'
  });
  ```

- Add `myloyaltycards://reset-password` to `app.json` scheme handlers
- Add new wrapper to `shared/supabase/auth.ts`:

  ```ts
  export const requestPasswordReset = async (email: string): Promise<AuthResult<void>>;
  ```

### 3. Confirmation Screen

- After submission (regardless of whether email exists — prevents user enumeration), show:
  - "Check your email for a reset link."
  - "Didn't receive it? Check your spam folder or try again."
- Provide "Back to Sign In" navigation

### 4. Deep Link Handler — New Password Form

- Register scheme in `app.json`: `"scheme": "myloyaltycards"`
- Add `app/reset-password.tsx` screen that:
  - Reads the access token and refresh token from the URL params
  - Calls `supabase.auth.exchangeCodeForSession` or sets the session from URL hash
  - Shows "New Password" + "Confirm Password" fields
  - On submit calls `supabase.auth.updateUser({ password: newPassword })`
  - On success navigates to main app (user is now signed in)

  ```ts
  export const updatePassword = async (newPassword: string): Promise<AuthResult<void>>;
  ```

### 5. Validation

- Email: valid format check before submission
- New password: min 8 chars, at least 1 letter + 1 number (matches registration rules)
- Passwords match check

### 6. Error Handling

- Network error during reset request → show retry message
- Invalid/expired reset link → show "Link expired, request a new one"
- Password too weak → inline error

### 7. Security

- Never confirm or deny whether an email is registered (prevent enumeration)
- Reset tokens are single-use (handled by Supabase)
- Session token stored in `expo-secure-store` after successful reset

### 8. Testing

- Unit tests for `requestPasswordReset` and `updatePassword` in `shared/supabase/auth.test.ts`
- Test: invalid email format blocked client-side
- Test: success response shows confirmation screen
- Test: deep link opens new-password screen with correct params
- Test: weak password rejected with inline error
- Manual: verify reset email arrives and link works on iOS + Android

## Edge Cases & Risks

- Email not registered: Show same success message (prevent enumeration)
- Expired link: Clear message with re-request CTA
- User taps link on a different device: Flow still works (Supabase session created on that device)
- App not installed when link tapped: Falls back to Supabase hosted UI or App Store

## Acceptance Checklist

- [x] "Forgot Password?" link on Sign In screen
- [x] `app/forgot-password.tsx` screen with email input
- [x] `requestPasswordReset` wrapper added to `shared/supabase/auth.ts`
- [x] Confirmation message shown regardless of whether email exists
- [x] Deep link `myloyaltycards://reset-password` registered in `app.json`
- [x] `app/reset-password.tsx` screen with new password form
- [x] `updatePassword` wrapper added to `shared/supabase/auth.ts`
- [x] Password validation matches registration rules
- [x] Session stored in SecureStore after reset
- [x] Unit tests for all new auth functions
- [x] No user enumeration possible
- [ ] Flow tested on iOS and Android

---

## Dev Agent Record

### Implementation Notes

- `requestPasswordReset` and `updatePassword` wrappers added to `shared/supabase/auth.ts`
- `ForgotPasswordScreen` created at `features/auth/ForgotPasswordScreen.tsx` — email entry + confirmation view
- `ResetPasswordScreen` created at `features/auth/ResetPasswordScreen.tsx` — deep-link session establishment + new password form
- "Forgot Password?" link added to `SignInScreen` below password field
- Route files: `app/forgot-password.tsx`, `app/reset-password.tsx`
- Stack screens registered in `app/_layout.tsx`
- Feature barrel updated in `features/auth/index.ts`
- Deep link scheme `myloyaltycards://` already registered in `app.json`
- All validation matches registration rules (min 8 chars, 1 letter, 1 number)
- No user enumeration: always shows same confirmation regardless of email existence

### Tests Created

- `shared/supabase/auth.test.ts` — 7 new tests for `requestPasswordReset` and `updatePassword`
- `features/auth/__tests__/ForgotPasswordScreen.test.tsx` — 16 tests
- `features/auth/__tests__/ResetPasswordScreen.test.tsx` — 16 tests
- `features/auth/__tests__/SignInScreen.test.tsx` — 1 new test for forgot password link
- **Total: 720 tests passing across 58 suites (0 failures)**

### File List

- `shared/supabase/auth.ts` (modified — added requestPasswordReset, updatePassword)
- `shared/supabase/auth.test.ts` (modified — added 7 tests)
- `features/auth/ForgotPasswordScreen.tsx` (new)
- `features/auth/ResetPasswordScreen.tsx` (new)
- `features/auth/index.ts` (modified — barrel export)
- `features/auth/__tests__/ForgotPasswordScreen.test.tsx` (new)
- `features/auth/__tests__/ResetPasswordScreen.test.tsx` (new)
- `features/auth/__tests__/SignInScreen.test.tsx` (modified — 1 new test)
- `features/auth/SignInScreen.tsx` (modified — added Forgot Password link)
- `app/forgot-password.tsx` (new — route)
- `app/reset-password.tsx` (new — route)
- `app/_layout.tsx` (modified — registered 2 new Stack screens)

---

**Linked Epic:** Epic 6
**Sprint:** Sprint 8 — 2026-03-12
