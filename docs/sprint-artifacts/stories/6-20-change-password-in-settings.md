---
baseline_commit: 4420d1a91649ff891456574d06df0a4890f90ebd
---

# Story 6.20: Change password in Settings (OTP-gated)

Status: done

Epic: 6 — User Authentication & Privacy

## Story

As a signed-in user,
I want to change my password from Settings, gated by an emailed OTP,
so that I can rotate my password securely without signing out.

## Context

Reported by ifero (Sprint 17). Signed-in users have **no way** to change their password: `features/settings/components/AccountSection.tsx` exposes only **Sign Out** (`:66-73`) and **Delete Account** (`:74-82`). The Supabase capability already exists — `updatePassword(newPassword)` → `updateUser({ password })` (`shared/supabase/auth.ts:342-355`, tested `:673-714`).

Note `secure_password_change = false` (`config.toml:211`): Supabase does **not** force recent re-auth for `updateUser({ password })`, so the OTP gate here is an **app-level product decision** (defense-in-depth: prove email control before a password change), not a Supabase requirement.

**Depends on 6-19** — reuses `sendPasswordResetOtp`, `verifyPasswordResetOtp`, `normalizeOtpError`, the recovery OTP-verify screen, and the shared new-password screen — all built in 6-19. **Must be sequenced AFTER 6-19.**

## Architecture Decision — AD-6-20-01: OTP-gated change-password reusing 6-19 plumbing

**Flow:** Settings "Change Password" row → `sendPasswordResetOtp(currentUserEmail)` → OTP-verify (recovery, reused from 6-19) → shared new-password screen (`updatePassword`) → back to `/settings` + success toast. The signed-in email is already loaded (`SettingsScreen.tsx:97-111` via `getSession()` → `user.email`).

6-20 adds only three things on top of 6-19: the `AccountSection` row, a `SettingsScreen` handler, and a success-destination branch (`/settings` + toast, vs `/` for recovery).

## Acceptance Criteria

1. **Entry point.** Given an authenticated user in Settings, When viewing the Account section, Then a "Change Password" `ActionRow` appears between Sign Out and Delete Account (`AccountSection.tsx:66-82`), **non-destructive**, with a lock icon, a `testID`, and a localized `accessibilityLabel`. **Not shown for guests** (`AccountSectionGuest`, `SettingsScreen.tsx:207-212`).
2. **OTP gate.** Given the user taps Change Password, Then `sendPasswordResetOtp(currentUserEmail)` is called and the user is taken to the recovery OTP screen (email from `getSession`, `SettingsScreen.tsx:104-107`).
3. **Reuse verify + new-password.** Given a correct OTP, When verified via `verifyPasswordResetOtp`, Then the shared new-password screen (6-19) collects and submits the new password via `updatePassword`.
4. **Post-success destination.** Given the password updates, Then route back to `/settings` (not `/`) and show a success toast (`showToast` pattern, `SettingsScreen.tsx:179`) — the new-password screen accepts a success-destination param.
5. **Errors.** Wrong/expired/network OTP reuse the 6.18/6-19 inline states; an `updatePassword` failure surfaces a localized error.
6. **Copy localized** (en + it); **Tests ≥80%**, co-located `*.test.tsx` (NO `__tests__`).

## Tasks / Subtasks

- [x] **T1** (AC1,6) Add the `ActionRow` + `onChangePassword` prop to `AccountSection`; add `settings.account.changePassword*` keys to `en.ts`/`it.ts` (near `:116-128`); update `AccountSection.test.tsx`.
- [x] **T2** (AC2,4) In `SettingsScreen`, add a `startChangePassword` handler → `sendPasswordResetOtp(email)` → navigate to the OTP screen with `{ email, sentAt, origin: 'change-password' }`; wire the new `AccountSection` prop. _(Param named `origin`, not `purpose`, to avoid colliding with `VerifyEmailScreen`'s `purpose` prop — see Completion Notes.)_
- [x] **T3** (AC3,4) Ensure the shared new-password screen honors the settings success-destination param + toast.
- [x] **T4** (AC5,6) Tests for the Settings entry, the OTP-gate navigation payload, and success/error routing.
- [x] **T5** (process) On completion set the story `.md` Status → `review`; populate Dev Agent Record.

## Dev Notes

### Dependency (sequencing gate)

Sequenced **after 6-19**. Reuses `sendPasswordResetOtp` / `verifyPasswordResetOtp` / `normalizeOtpError` (`shared/supabase/auth.ts`), the recovery OTP-verify screen, and the shared new-password screen — all created in 6-19. Building 6-20 first would require stubbing all of that.

### References (verified 2026-07-11)

- `features/settings/components/AccountSection.tsx` — Sign Out `:66-73`, Delete Account `:74-82`; `ActionRow` props (`shared/components/ui/ActionRow.tsx:10-25`).
- `features/settings/screens/SettingsScreen.tsx` — owns sheet state + handlers (`confirmSignOut :132-158`, `confirmDeleteAccount :160-187`); loads email `:97-111`; `useAuthState` `:41`; `showToast` `:179`; `AccountSection` wired `:201-206`; guest path `:207-212`.
- Confirm/sheet precedent: `SignOutSheet.tsx`, `DeleteAccountSheet.tsx` (BottomSheet-based).
- 6-19 plumbing (dependency): `shared/supabase/auth.ts` `sendPasswordResetOtp` / `verifyPasswordResetOtp`; the recovery OTP screen; the shared new-password screen.
- `updatePassword` `shared/supabase/auth.ts:342-355` (tested `:673-714`).

### Regressions to preserve

Sign Out + Delete Account rows unchanged; guest Settings (`AccountSectionGuest`) must **not** show Change Password; existing `SettingsScreen` email load + sheets untouched; the new-password screen's recovery path (6-19 → `/`) unchanged when 6-20 adds the `/settings` destination.

### Project Structure Notes

Change surface: `features/settings/components/AccountSection.tsx` + `features/settings/screens/SettingsScreen.tsx` + i18n + one shared-screen param (owned by 6-19). No new supabase wrappers (all from 6-19). No schema/native change. Epic 6; Sprint 17, Wave 2 (after 6-19).

### Definition of Ready

- [x] Depends on 6-19 (explicit) — reuses its plumbing
- [x] Entry point + flow specified (file:line)
- [x] ACs testable + AC-mapped
- [ ] **6-19 merged first** (sequencing gate)
- [ ] Open decisions confirmed by ifero (below)

### Open decisions (recommended defaults applied)

1. **OTP gate vs session-only change** — baked in: **OTP-gated** (defense-in-depth; matches the draft + reuses 6-19). Since `secure_password_change=false`, a lighter session-only new-password flow (no OTP) is a valid alternative if ifero prefers less friction.
2. **Success UX** — baked in: route to `/settings` + success toast (matches the `SettingsScreen` toast pattern).
3. **Icon** — baked in: `lock-outline` (consistent with the `ActionRow` icon set); confirm.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (dev-story workflow, Explanatory style).

### Debug Log References

- `tsc --noEmit` → clean (exit 0).
- `eslint` on all changed files → clean (exit 0).
- Full jest suite: **165 suites / 1747 tests green** (after code-review + QA rounds); global coverage **93.23% stmts / 85.59% branch / 88.29% funcs / 93.83% lines** (≥80% gate met).

### Completion Notes List

AD-6-20-01 was implemented by threading **one route param — `origin: 'change-password'`** — through the reused 6.19 recovery flow (Settings → shared OTP screen → shared new-password screen), rather than adding any new screen, route, or supabase wrapper. The three change-points the discriminator drives:

1. **`SettingsScreen.startChangePassword`** — sends the OTP (`sendPasswordResetOtp(email)`) then `router.push('/recovery-otp', { email, sentAt, origin: 'change-password' })`. Surfaces a toast if the session email hasn't loaded yet (no dead tap); the row is `disabled` while the send is in flight so a double tap can't send twice (same pattern as `confirmSignOut`/`confirmDeleteAccount`, which rely on the trigger's disabled state rather than a JS re-entry guard); a send failure surfaces a localized error toast.
2. **`VerifyEmailScreen` (recovery `onVerified`)** — now origin-aware: for `change-password` it **preserves** the Settings back stack (no `dismissTo`) and forwards `origin` to `/new-password`; the recovery path is byte-for-byte unchanged (`dismissTo('/') → replace('/new-password')`).
3. **`NewPasswordScreen`** — reads `origin`: recovery lands on `/` (unchanged); change-password shows a success toast and `dismissTo('/settings')` back to the preserved screen.

Decisions worth flagging for review:

- **Param name `origin`, not `purpose`.** The story's T2 sketched `purpose: 'change-password'`, but `VerifyEmailScreen` already has a `purpose` **prop** (`'signup' | 'recovery'`). Reusing the word as a route param would be genuinely confusing, so the param is `origin`. Behaviour matches the spec exactly.
- **Removed the vestigial `successHref` prop** on `NewPasswordScreen`. It was a 6.19 placeholder for this story, but `app/new-password.tsx` is a pure re-export (route-file lint rule), so a prop could never be set for the real route. AC4 asks for a success-destination **param** — `origin` is that mechanism. Its one prop-based test was converted to the param path.
- **OTP-screen copy reused as-is** from recovery ("Reset your password"). The story scoped 6.20 to exactly three additions on top of 6.19; adding flow-specific "change password" OTP copy was intentionally left out of scope.
- Recovery/confirmation email templates untouched (6.19 already made them bilingual).

### File List

Source:

- `features/settings/components/AccountSection.tsx` — Change Password `ActionRow` (lock icon, between Sign Out & Delete) + `onChangePassword`/`isChangingPassword` props.
- `features/settings/screens/SettingsScreen.tsx` — `startChangePassword` handler + `isChangingPassword` state; wired the new `AccountSection` props; imports `sendPasswordResetOtp`.
- `features/auth/VerifyEmailScreen.tsx` — origin-aware recovery `onVerified` **and `onWrongEmail`** (change-password cancels back to `/settings` instead of the anonymous forgot-password screen); reads/forwards the `origin` param; uses the shared `getSingleParam` helper.
- `features/auth/NewPasswordScreen.tsx` — `origin`-param success destination (`/` vs `dismissTo('/settings')` + toast); removed `successHref` prop; uses the shared `getSingleParam` helper.
- `features/auth/routeParams.ts` — **new**: shared expo-router param unwrap (`getSingleParam`), extracted from `VerifyEmailScreen` so both auth screens share one copy.
- `shared/i18n/locales/en.ts`, `shared/i18n/locales/it.ts` — `settings.account.changePassword` / `changePasswordA11y` / `changePasswordError` / `passwordChanged`.

Tests:

- `features/settings/components/AccountSection.test.tsx` — change-password row wiring + row-order assertion (AC1).
- `features/settings/screens/SettingsScreen.test.tsx` — send+route payload (AC2), send-failure toast (AC5), unexpected-throw toast, empty-email feedback, in-flight double-tap guard; `sendPasswordResetOtp`/`showToast` mocks.
- `features/auth/NewPasswordScreen.test.tsx` — origin=change-password toast + `dismissTo('/settings')` (AC4); router/params/toast mocks.
- `features/auth/RecoveryOtpScreen.test.tsx` — change-password preserves the stack + forwards origin, and cancels back to `/settings` from the wrong-email link (Story 6.20).
- `features/auth/routeParams.test.ts` — **new**: `getSingleParam` string/array/undefined branches.

Process:

- `docs/sprint-artifacts/stories/6-20-change-password-in-settings.md` — `baseline_commit`; task checkboxes; this record; Status → review.
- `docs/sprint-artifacts/sprint-status.yaml` — `6-20` → in-progress → review; `updated` date.

### Change Log

| Date       | Change                                                                                                                                                                                                                                                  | Author       |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| 2026-07-09 | Drafted by PM (John) from ifero's bug report.                                                                                                                                                                                                           | John (PM)    |
| 2026-07-11 | Refined → ready-for-dev (AD-6-20-01; reuses 6-19 plumbing; sequenced after 6-19).                                                                                                                                                                       | Amelia (Dev) |
| 2026-07-15 | Implemented: OTP-gated Change Password in Settings via reused 6.19 plumbing (single `origin` route param); en/it copy; tests + coverage green.                                                                                                          | Amelia (Dev) |
| 2026-07-15 | Code-review round 1 (Sonnet): origin-aware `onWrongEmail` (no signed-in dead-end); empty-email toast feedback; hide chevron while sending; row-order + double-tap tests; extracted shared `getSingleParam`.                                             | Amelia (Dev) |
| 2026-07-15 | QA round 1 (Sonnet): `disabled` (a11y + native block) on the row while sending — replaced the now-redundant JS re-entry guard to match `confirmSignOut` precedent; added AccountSection loading/a11y-label tests + explicit guest-row-absent assertion. | Amelia (Dev) |
