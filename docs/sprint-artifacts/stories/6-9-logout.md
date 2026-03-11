# Story 6.9: Logout

**Epic:** 6 - User Authentication & Privacy
**Type:** User-Facing
**Status:** review

## Goal

Allow signed-in users to sign out of their account on this device, returning to guest mode without losing locally stored cards.

## Acceptance Criteria

- "Sign Out" option clearly visible in Settings screen when user is signed in
- Confirmation dialog shown before sign-out ("Your cards will remain on this device")
- Auth token removed from SecureStore on confirmation
- User returned to guest mode
- Locally stored cards remain accessible after sign-out
- Settings screen updates to reflect guest mode (shows "Sign In" / "Create Account")

## Technical Details & Implementation Breakdown

### 1. Sign Out Entry Point

- In `features/settings/SettingsScreen.tsx`, show a "Sign Out" list item when `authState === 'authenticated'`
- Hide "Sign Out" when in guest mode (show "Sign In" and "Create Account" instead)

  ```tsx
  {
    isAuthenticated && <SettingsItem title="Sign Out" onPress={handleSignOutPress} destructive />;
  }
  ```

### 2. Confirmation Dialog

- Use `Alert.alert` (or a bottom sheet) before triggering sign-out:

  ```tsx
  Alert.alert(
    'Sign Out?',
    'You will return to guest mode. Your cards will remain on this device.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: confirmSignOut }
    ]
  );
  ```

### 3. Supabase Sign-Out

- Call existing `signOut()` from `shared/supabase/auth.ts` (already implemented with `scope: 'local'`):

  ```ts
  const result = await signOut();
  if (!result.success) {
    // show error toast or alert
  }
  ```

- `scope: 'local'` is correct — preserves sessions on other devices

### 4. Auth State Update

- After successful sign-out, update global auth state to `'guest'`
- Clear any in-memory user/session data
- Redirect user to main card list (they continue as guest)
- Do NOT clear local SQLite card data

### 5. Settings Screen State

- After sign-out, Settings must reactively update:
  - Remove "Sign Out" button
  - Show "Sign In" and "Create Account" options
  - Remove account email display
- This should happen via the global auth state context/store

### 6. Error Handling

- Network failure during sign-out: Surface error, allow retry
- Session already expired: Treat as already signed out, clear local state and continue

### 7. Testing

- Unit test: `signOut()` returns `{ success: true }` on valid session
- Unit test: Settings hides "Sign Out" when in guest mode
- Unit test: Settings shows "Sign Out" when authenticated
- Integration: Sign out → verify SQLite cards unaffected
- Manual: Sign out on iOS and Android, verify guest mode restored

## Edge Cases & Risks

- User cancels confirmation: No action taken, stay signed in
- Sign-out fails due to network: Show error, do NOT leave user in ambiguous state
- Session already expired server-side: CleanUp local state gracefully, do not show error to user

## Acceptance Checklist

- [x] "Sign Out" visible in Settings only when authenticated
- [x] Confirmation dialog shown before sign-out
- [x] `signOut()` called from `shared/supabase/auth.ts`
- [x] Auth token cleared from SecureStore
- [x] Auth state updated to guest mode
- [x] Local SQLite cards unaffected
- [x] Settings screen reactively shows guest mode options post sign-out
- [x] Error handling for failed sign-out
- [x] Unit tests passing
- [ ] Tested on iOS and Android

## File List

- `shared/supabase/useAuthState.ts` — New: reactive auth state hook using onAuthStateChange
- `shared/supabase/useAuthState.test.ts` — New: 7 unit tests for useAuthState hook
- `features/settings/SettingsScreen.tsx` — Modified: conditional rendering based on auth state, confirmation dialog, navigate to `/` on sign-out
- `features/settings/SettingsScreen.test.tsx` — New (moved from app/**tests**): 18 tests covering guest/authenticated rendering, sign-out flow, loading state
- `app/__tests__/settings.test.tsx` — Deleted: moved to co-located path
- `docs/sprint-artifacts/stories/6-9-logout.md` — Modified: status and checklist updates

## Dev Agent Record

### Implementation Notes

- Created `useAuthState` hook (`shared/supabase/useAuthState.ts`) that subscribes to Supabase's `onAuthStateChange` for reactive auth state detection
- Updated `SettingsScreen` to conditionally render guest mode sections (badge, Sign In, Create Account) vs authenticated sections (Sign Out) based on `useAuthState`
- Added `Alert.alert` confirmation dialog before sign-out with Cancel/Sign Out options
- Changed post-sign-out navigation from `/sign-in` to `/` (home) so user returns to guest mode with local cards accessible
- Moved settings tests from `app/__tests__/` to co-located `features/settings/SettingsScreen.test.tsx` per project convention
- Loading state hides all auth-dependent sections until session check completes

### Debug Log

- Initial test run: 1 failure in "shows error message when sign-out fails" — async state update from `setSignOutError` needed `act()` wrapper. Fixed by wrapping alert onPress callback in `act(async () => {})`.

## Change Log

- 2026-03-11: Implemented Story 6.9 Logout — conditional settings rendering, confirmation dialog, useAuthState hook, 25 tests added

---

**Linked Epic:** Epic 6
**Sprint:** Sprint 8 — 2026-03-12
