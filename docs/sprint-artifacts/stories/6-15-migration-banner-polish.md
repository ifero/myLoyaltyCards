# Story 6.15: Migration Banner Polish

**Epic:** 6 - User Authentication & Privacy
**Type:** Tech Debt / Polish
**Status:** drafted
**Priority:** Low
**Estimate:** Small (< 0.5 day)
**Assigned:** Amelia (Developer)

---

## Context

Code review of Story 6.14 (Upgrade Guest to Account) identified 3 low-severity items that were deferred. These are minor polish and cleanup tasks with no functional impact.

---

## Tasks

### Task 1: Remove redundant null check in MigrationBanner

**File:** `features/auth/MigrationBanner.tsx`

The early return checks both `status === 'idle'` and `!message`. Since the hook always sets `message` to `null` when status is `idle`, the `!message` check is redundant. Simplify the guard to only check `status === 'idle'`.

```tsx
// Before
if (status === 'idle' || !message) return null;

// After
if (status === 'idle') return null;
```

### Task 2: Fix error banner copy to match UX

**File:** `features/auth/useGuestMigration.ts`

The error message says "Tap to retry" but the MigrationBanner has a distinct "Retry" button — the banner itself is not tappable. Update the copy to remove the misleading instruction.

```tsx
// Before
setMessage("Some cards couldn't be backed up. Tap to retry.");

// After
setMessage("Some cards couldn't be backed up.");
```

### Task 3: Remove unused uuid mock from migration service tests

**File:** `core/auth/guest-migration.test.ts`

`jest.mock('uuid', ...)` mocks `uuid` but `guest-migration.ts` does not import `uuid`. This is dead mock setup left over from an earlier implementation. Remove it.

```ts
// Remove this block
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid')
}));
```

---

## Acceptance Checklist

- [ ] Redundant `!message` guard removed from MigrationBanner
- [ ] Error copy updated (no "Tap to retry")
- [ ] Unused uuid mock removed from guest-migration.test.ts
- [ ] All 43 migration tests still passing
- [ ] Full test suite green

---

**Linked Epic:** Epic 6
**Origin:** Story 6.14 code review — Low severity items L1, L2, L3
