# Story 6.5: Implement Guest Mode

**Epic:** 6 - User Authentication & Privacy
**Type:** User-Facing
**Status:** ready-for-dev

## Goal

Allow users to use all app features without creating an account, with data stored locally only.

## Acceptance Criteria

- No login required for core features
- All card management and sync to watch work in guest mode
- Upgrade path to account creation is visible in settings
- Data is stored only on device (not cloud)
- No prompts for account creation during normal use

## Technical Details & Implementation Breakdown

### 1. Local Storage

- Use `expo-sqlite` for persistent local storage of cards and settings
- On first launch, generate a guest session UUID and store locally
- All CRUD operations (add, edit, delete, view) work offline
  Example:
  ```ts
  import { v4 as uuidv4 } from 'uuid';
  const guestSessionId = uuidv4();
  await SecureStore.setItemAsync('guestSessionId', guestSessionId);
  ```

### 2. Guest Session Management

- Guest session identified by UUID (not linked to any cloud account)
- Store session info in SQLite or SecureStore
- No email or cloud sync required

### 3. Watch Sync

- Sync cards to Apple Watch via Bluetooth only (no cloud)
- Use platform APIs for local device-to-device sync

### 4. UI/UX

- No login or account prompts during normal use
- Settings screen shows “Create Account” option, explaining benefits (backup, multi-device)
- Guest mode visually distinct (e.g., badge or info in settings)
  Example:
  ```tsx
  <Button title="Create Account" onPress={handleUpgrade} />
  <Text>Upgrade to backup and sync your cards across devices.</Text>
  ```

### 5. Upgrade Path

- On account creation, migrate all local data to cloud (Supabase)
- Ensure no data loss during migration
- After upgrade, guest session is replaced by authenticated session
  Example:
  ```ts
  // On account creation
  const localCards = await getLocalCards();
  await supabase.from('loyalty_cards').insert(localCards);
  // Remove guest session, start authenticated session
  ```

### 6. Security

- No sensitive data (email, password) stored for guest
- Data is only on device; no cloud exposure

### 7. Testing

- Test guest mode on iOS, Android, and Web
- Validate data persistence across app restarts
- Test upgrade flow to account creation

## Edge Cases & Risks

- Data loss on upgrade: Ensure migration preserves all cards/settings
- Guest session deletion: Warn user before deleting local data
- Watch sync failures: Provide retry and error feedback
- Multiple devices: Guest mode is device-specific; no sync between devices

## Acceptance Checklist

- [ ] All features work in guest mode
- [ ] Data persists across app restarts
- [ ] Guest session uses anonymous UUID
- [ ] No cloud sync or email required
- [ ] Watch sync via Bluetooth only
- [ ] Upgrade to account preserves local data
- [ ] Guest/auth flows separated in code
- [ ] No sensitive data stored for guest
- [ ] Tested on all platforms

---

**Linked Epic:** Epic 6
**Sprint:** Sprint 2026-02-27
