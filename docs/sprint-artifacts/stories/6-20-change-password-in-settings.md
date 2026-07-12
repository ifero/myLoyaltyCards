# Story 6.20: Change password in Settings (OTP-gated)

Status: ready-for-dev

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

- [ ] **T1** (AC1,6) Add the `ActionRow` + `onChangePassword` prop to `AccountSection`; add `settings.account.changePassword*` keys to `en.ts`/`it.ts` (near `:116-128`); update `AccountSection.test.tsx`.
- [ ] **T2** (AC2,4) In `SettingsScreen`, add a `startChangePassword` handler → `sendPasswordResetOtp(email)` → navigate to the OTP screen with `{ email, sentAt, purpose: 'change-password' }`; wire the new `AccountSection` prop.
- [ ] **T3** (AC3,4) Ensure the shared new-password screen honors the settings success-destination param + toast.
- [ ] **T4** (AC5,6) Tests for the Settings entry, the OTP-gate navigation payload, and success/error routing.
- [ ] **T5** (process) On completion set the story `.md` Status → `review`; populate Dev Agent Record.

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

### Debug Log References

### Completion Notes List

### File List

### Change Log

| Date       | Change                                                                            | Author       |
| ---------- | --------------------------------------------------------------------------------- | ------------ |
| 2026-07-09 | Drafted by PM (John) from ifero's bug report.                                     | John (PM)    |
| 2026-07-11 | Refined → ready-for-dev (AD-6-20-01; reuses 6-19 plumbing; sequenced after 6-19). | Amelia (Dev) |
