# Story 6.10: Delete Account

**Epic:** 6 - User Authentication & Privacy
**Type:** User-Facing
**Status:** ready-for-dev

> ⚠️ **Prerequisite before pickup:** The Supabase Edge Function `delete-account` must be scaffolded and deployed to the dev environment before development begins. This is a new infrastructure piece (service-role key, server-side deletion) that is not part of the existing client setup. Do not start this story until the Edge Function skeleton exists. Recommended: pick this story up **last** in Sprint 8.

## Goal

Allow authenticated users to permanently delete their cloud account and all associated cloud data, satisfying the GDPR right to erasure, while preserving locally stored cards on the device.

## Acceptance Criteria

- "Delete Account" option visible in Settings when signed in
- Multi-step confirmation flow prevents accidental deletion
- User must type "DELETE" to confirm
- Cloud account and all cloud cards deleted after confirmation
- Auth token cleared from SecureStore
- User returned to guest mode
- Local SQLite cards remain on the device
- Deletion is acknowledged within the UI (not silently processed)

## Technical Details & Implementation Breakdown

### 1. Delete Account Entry Point

- In `features/settings/SettingsScreen.tsx`, show "Delete Account" as a destructive list item under an "Account" or "Privacy" section
- Only visible when `authState === 'authenticated'`

  ```tsx
  <SettingsItem title="Delete Account" onPress={handleDeletePress} destructive />
  ```

### 2. Multi-Step Confirmation

- **Step 1:** Informational alert:
  ```
  "Delete Account?"
  "This will permanently delete your account and all backed-up data. Cards stored on this device will not be deleted."
  [Cancel] [Continue]
  ```
- **Step 2:** Confirmation screen or modal requiring typed confirmation:
  ```tsx
  <TextInput
    placeholder='Type "DELETE" to confirm'
    value={confirmText}
    onChangeText={setConfirmText}
  />
  <Button
    title="Permanently Delete My Account"
    disabled={confirmText !== 'DELETE'}
    onPress={handleConfirmDelete}
  />
  ```

### 3. Supabase Account Deletion

- Add new function to `shared/supabase/auth.ts`:

  ```ts
  /**
   * Delete the current user's account and all associated data.
   * Calls a Supabase Edge Function or admin API to remove the user record.
   * Row-Level Security cascades handle cloud card deletion server-side.
   */
  export const deleteAccount = async (): Promise<AuthResult<void>>;
  ```

- Implementation: call a Supabase Edge Function `delete-account` (server-side) that:
  1. Deletes all `loyalty_cards` rows for the user (RLS cascade or explicit delete)
  2. Calls `supabase.auth.admin.deleteUser(userId)` (requires service-role key — Edge Function only)
- On success: call `signOut()` locally to clear session

### 4. Supabase Edge Function: `delete-account`

- Location: `supabase/functions/delete-account/index.ts`
- Validates the requesting user's JWT
- Deletes user's cloud cards then deletes the auth user
- Returns `{ success: true }` or `{ error: string }`

### 5. Auth State & Navigation

- After successful deletion, update auth state to `'guest'`
- Clear all in-memory session/user data
- Navigate user to the main card list (guest mode)
- Local SQLite data is NOT cleared

### 6. Loading & Feedback

- Show loading indicator while deletion is in progress
- On success: brief toast/banner "Account deleted. You are now in guest mode."
- On error: clear error message with option to retry or contact support

### 7. Error Handling

- Network error: Show retry option, do not delete local data
- Partial failure (cloud cards deleted, user record not): Supabase Edge Function handles atomicity using a transaction where possible
- User is signed out server-side but app still shows signed in: Force local sign-out on any auth error

### 8. Testing

- Unit test: `deleteAccount()` wrapper in `shared/supabase/auth.test.ts`
- Unit test: "Delete Account" button disabled unless `confirmText === 'DELETE'`
- Integration: verify local SQLite cards survive deletion flow
- Manual: complete deletion flow on iOS + Android
- Manual: verify cloud account no longer exists in Supabase dashboard

## Edge Cases & Risks

- User cancels at any step: No change
- Deletion in progress, app backgrounded: Operation continues, state reconciled on foreground
- Edge Function timeout: Surface error, guide user to retry
- GDPR erasure window: Cloud deletion is immediate; confirm within 30-day SLA per privacy policy

## Acceptance Checklist

- [ ] "Delete Account" in Settings (authenticated only)
- [ ] Two-step confirmation (alert + typed "DELETE" confirm)
- [ ] `deleteAccount()` function in `shared/supabase/auth.ts`
- [ ] Supabase Edge Function `delete-account` created and deployed
- [ ] Cloud cards deleted server-side
- [ ] Auth user record deleted from Supabase
- [ ] Local SQLite cards unaffected
- [ ] Auth token cleared from SecureStore
- [ ] Auth state transitions to guest mode
- [ ] Loading and success/error feedback shown
- [ ] Unit tests passing
- [ ] Tested on iOS and Android

---

**Linked Epic:** Epic 6
**Sprint:** Sprint 8 — 2026-03-12
