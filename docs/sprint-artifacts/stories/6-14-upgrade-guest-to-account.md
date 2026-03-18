# Story 6.14: Upgrade Guest to Account

**Epic:** 6 - User Authentication & Privacy
**Type:** User-Facing
**Status:** in-progress

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

- [x] `core/auth/guest-migration.ts` created with `migrateGuestCardsToCloud()`
- [x] Migration triggered once after first successful authentication (email, Apple, Google)
- [x] `guestMigrationCompleted` flag checked before running migration
- [x] Cards uploaded in batches of 50 via Supabase upsert
- [x] Upsert uses `ON CONFLICT (id)` — idempotent
- [x] Inline migration banner shown (non-blocking)
- [x] Success confirmation shown after completion
- [x] Partial failure recorded and retry available
- [x] `guestMigrationCompleted` flag set after successful migration
- [x] Local cards unaffected regardless of migration outcome
- [x] Unit tests passing (success, partial failure, skip if already migrated)
- [ ] Tested on iOS and Android

---

**Linked Epic:** Epic 6
**Sprint:** Sprint 8 — 2026-03-12

---

## Dev Agent Record

### Implementation Summary

**Migration Service** (`core/auth/guest-migration.ts`):

- `migrateGuestCardsToCloud(userId)` — reads all local SQLite cards, upserts to Supabase in batches of 50
- `isMigrationCompleted()` — checks SecureStore flag before running
- `setMigrationFlag()` — persists `guestMigrationCompleted` with timestamp and userId
- `toCloudRow()` — maps `LoyaltyCard` (camelCase) → cloud row (snake_case + `user_id`)
- SecureStore lazy loader with in-memory fallback (same pattern as `guest-session-repository.ts`)
- Full error handling: invalid userId, DB read failure, partial batch failure

**Hook** (`features/auth/useGuestMigration.ts`):

- `useGuestMigration()` — manages migration lifecycle (idle → migrating → success/error)
- Auto-triggers on mount by checking `getSession()` for authenticated user
- Manual `trigger(userId)` and `retry()` callbacks
- Auto-dismiss success banner after 3 seconds
- Cleanup timer on unmount

**Banner UI** (`features/auth/MigrationBanner.tsx`):

- Non-blocking inline banner with spinner (migrating), success message, or error + retry
- Accessibility: `accessibilityRole="alert"`, `accessibilityLiveRegion="polite"`
- Theme-aware colors via `useTheme()`

**Integration** (`app/index.tsx`):

- `MigrationBanner` rendered above `CardList` on HomeScreen
- Hook auto-detects auth state, runs migration if needed

### Tests Created

- `core/auth/guest-migration.test.ts` — 22 tests (service layer)
- `features/auth/__tests__/useGuestMigration.test.ts` — 12 tests (hook)
- `features/auth/__tests__/MigrationBanner.test.tsx` — 9 tests (component)
- **Total: 43 new tests, all passing**

### File List

- `core/auth/guest-migration.ts` (new)
- `core/auth/guest-migration.test.ts` (new)
- `features/auth/useGuestMigration.ts` (new)
- `features/auth/MigrationBanner.tsx` (new)
- `features/auth/index.ts` (modified — exports)
- `features/auth/__tests__/useGuestMigration.test.ts` (new)
- `features/auth/__tests__/MigrationBanner.test.tsx` (new)
- `app/index.tsx` (modified — banner integration)
- `docs/sprint-artifacts/stories/6-14-upgrade-guest-to-account.md` (updated)
- `docs/sprint-artifacts/sprint-status.yaml` (updated)
