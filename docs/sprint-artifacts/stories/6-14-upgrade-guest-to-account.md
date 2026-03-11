# Story 6.14: Upgrade Guest to Account

**Epic:** 6 - User Authentication & Privacy
**Type:** User-Facing
**Status:** ready-for-dev

## Goal

When a guest user creates an account (via any method: email, Apple, or Google), automatically migrate all their locally stored cards to the cloud without data loss or interruption, transitioning seamlessly to an authenticated session.

## Acceptance Criteria

- All local cards uploaded to cloud immediately after first successful authentication
- Cards remain visible and usable throughout the migration
- User sees confirmation that their data was backed up
- No duplicates created if migration is triggered more than once (idempotent)
- Guest session replaced by authenticated session seamlessly
- Error during migration shown clearly with retry option

## Technical Details & Implementation Breakdown

### 1. Migration Trigger

- Migration is triggered **once** immediately after the first successful authentication:
  - `signUp` (email)
  - `signInWithApple` (first time Apple ID)
  - `signInWithGoogle` (first time Google account)
- Detection: check if `migrationCompleted` flag exists in SecureStore before running migration

  ```ts
  const migrationDone = await SecureStore.getItemAsync('guestMigrationCompleted');
  if (!migrationDone) {
    await migrateGuestCardsToCloud(userId);
  }
  ```

### 2. Migration Service

- Create `core/auth/guest-migration.ts`:

  ```ts
  /**
   * Reads all locally stored loyalty cards from SQLite and upserts them
   * to the Supabase cloud backend under the authenticated user's account.
   *
   * This operation is idempotent — cards with the same `id` are upserted,
   * not duplicated.
   */
  export const migrateGuestCardsToCloud = async (userId: string): Promise<MigrationResult>;

  export type MigrationResult =
    | { success: true; migratedCount: number }
    | { success: false; error: string; migratedCount: number };
  ```

### 3. Migration Implementation

- Read all cards from the local SQLite `loyalty_cards` table via the existing database layer
- Upsert cards to Supabase cloud using `ON CONFLICT (id) DO UPDATE`:

  ```ts
  const { error } = await supabase.from('loyalty_cards').upsert(
    localCards.map((card) => ({ ...card, user_id: userId })),
    {
      onConflict: 'id'
    }
  );
  ```

- Cards are uploaded in batches of 50 to avoid payload limits
- After successful upload, set `migrationCompleted` flag:

  ```ts
  await SecureStore.setItemAsync(
    'guestMigrationCompleted',
    JSON.stringify({ completedAt: new Date().toISOString(), userId })
  );
  ```

### 4. UI During Migration

- Show an inline migration progress banner (not a blocking modal):

  ```tsx
  {
    migrating && (
      <Banner>
        <ActivityIndicator size="small" />
        <Text>Your cards are being backed up ✓</Text>
      </Banner>
    );
  }
  ```

  > 🎨 **UX note (Sally):** Copy must feel reassuring, not alarming. Users may fear they're losing data. Use "Your cards are being backed up" — not "Uploading" or "Syncing" which can feel technical or risky. Always include the checkmark or a positive signal even during the in-progress state.

- Cards remain visible and fully usable during migration
- On completion, show a brief success banner: "Your cards are safe — backed up to the cloud ✓"
- Auto-dismiss success banner after 3 seconds

### 5. Error Handling

- If migration fails partially (some cards uploaded, others not):
  - Record which cards failed
  - Surface a non-blocking error: "Some cards couldn't be backed up. Tap to retry."
  - Retry uploads cards that haven't been migrated yet (idempotent)
- If migration fails completely:
  - Show inline error with "Retry" button
  - User can continue using app; local cards are unaffected
  - Re-attempt on next app launch while `migrationCompleted` flag is not set

### 6. Idempotency

- Each card has a stable `id` (UUID) from SQLite
- Supabase upsert uses `ON CONFLICT (id)` — re-running migration never creates duplicates
- Once `guestMigrationCompleted` is set, migration is skipped on future launches

### 7. Guest Session Cleanup

- After migration, the `guestSessionId` stored in SecureStore can be discarded
- Auth state transitions from `'guest'` to `'authenticated'` regardless of migration success (sign-in succeeded)

### 8. Testing

- Unit test: `migrateGuestCardsToCloud()` — success path with 3 cards
- Unit test: `migrateGuestCardsToCloud()` — partial failure (Supabase error on batch 2)
- Unit test: migration skipped when `guestMigrationCompleted` flag exists
- Unit test: upsert is idempotent (running twice doesn't duplicate)
- Integration: create 5 cards as guest, create account, verify all 5 appear in Supabase
- Manual: iOS and Android end-to-end

## Edge Cases & Risks

- Guest has 0 cards: Migration runs, uploads nothing, sets flag — no user-visible action
- Card with same ID already in cloud (e.g. if migration partially ran before): Upsert handles cleanly
- Network drops mid-migration: Partial uploads recorded, retry on next launch
- userId mismatch: Migration function validates that `user_id` on upload matches authenticated user

## Acceptance Checklist

- [ ] `core/auth/guest-migration.ts` created with `migrateGuestCardsToCloud()`
- [ ] Migration triggered once after first successful authentication (email, Apple, Google)
- [ ] `guestMigrationCompleted` flag checked before running migration
- [ ] Cards uploaded in batches of 50 via Supabase upsert
- [ ] Upsert uses `ON CONFLICT (id)` — idempotent
- [ ] Inline migration banner shown (non-blocking)
- [ ] Success confirmation shown after completion
- [ ] Partial failure recorded and retry available
- [ ] `guestMigrationCompleted` flag set after successful migration
- [ ] Local cards unaffected regardless of migration outcome
- [ ] Unit tests passing (success, partial failure, skip if already migrated)
- [ ] Tested on iOS and Android

---

**Linked Epic:** Epic 6
**Sprint:** Sprint 8 — 2026-03-12
