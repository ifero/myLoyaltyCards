# Supabase Integration

## Multi-Tenant Architecture: Cloud vs Local Schema

### Key Difference

The cloud database schema differs from the local SQLite schema in one critical way:

| Aspect     | Local SQLite (Phone/Watch) | Cloud Supabase            |
| ---------- | -------------------------- | ------------------------- |
| Users      | Single user per device     | Multi-tenant (many users) |
| `user_id`  | ❌ Not present             | ✅ **Required field**     |
| Isolation  | Physical device separation | Row Level Security (RLS)  |
| Data Model | `LoyaltyCard` (Zod schema) | `LoyaltyCard + user_id`   |

### Why This Design?

**Local Database:**

- Each phone/watch belongs to one user
- No need to track ownership within the database
- Simpler schema, faster queries
- Privacy: data stays on device in guest mode

**Cloud Database:**

- Shared database across all users
- `user_id` field associates each card with its owner
- RLS policies enforce data isolation automatically
- Supabase Auth provides the `user_id` via `auth.uid()`

### Sync Logic Mapping

When syncing between local and cloud:

**Upload (Local → Cloud):**

```typescript
// Local card (no user_id)
const localCard: LoyaltyCard = {
  id: '...',
  name: 'Conad Card'
  // ... other fields
};

// Add user_id when uploading to cloud
const cloudCard = {
  ...localCard,
  user_id: session.user.id // from Supabase Auth
};

await supabase.from('loyalty_cards').upsert(cloudCard);
```

**Download (Cloud → Local):**

```typescript
// Fetch only current user's cards (RLS handles filtering)
const { data: cloudCards } = await supabase.from('loyalty_cards').select('*');

// Strip user_id before saving locally
const localCards = cloudCards.map(({ user_id, ...card }) => card);

await db.transaction(() => {
  localCards.forEach((card) => insertCard(card));
});
```

### Type Conversions During Sync

The local and cloud databases use different types for some fields due to platform limitations:

| Field                      | Local (SQLite)    | Cloud (Supabase) | Conversion Strategy                                                            |
| -------------------------- | ----------------- | ---------------- | ------------------------------------------------------------------------------ |
| `id`                       | `TEXT`            | `uuid`           | Postgres accepts UUID strings; no conversion needed                            |
| `is_favorite`              | `INTEGER (0/1)`   | `boolean`        | Upload: `!!value` (JS truthy)<br>Download: SQLite auto-converts boolean to 0/1 |
| `created_at`, `updated_at` | `TEXT (ISO 8601)` | `text`           | No conversion (both use ISO 8601 strings)                                      |

**Implementation Notes:**

**Boolean Conversion:**

```typescript
// Upload (Local → Cloud)
const cloudCard = {
  ...localCard,
  is_favorite: !!localCard.isFavorite // Convert to boolean
};

// Download (Cloud → Local)
const localCard = {
  ...cloudCard,
  is_favorite: cloudCard.is_favorite ? 1 : 0 // Convert to 0/1
};
```

**UUID Handling:**

- Local: Generated using `uuid` library (returns string)
- Cloud: Native PostgreSQL `uuid` type
- **No conversion needed:** Postgres automatically accepts valid UUID strings
- **Validation:** UUIDs must follow standard format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

**Date/Time Handling:**

- Both use ISO 8601 string format: `2026-03-01T10:30:00.123Z`
- No conversion needed
- Always store in UTC timezone

## Row Level Security (RLS)

RLS policies automatically enforce that:

- Users can only SELECT their own cards
- Users can only INSERT cards with their own `user_id`
- Users can only UPDATE/DELETE their own cards
- No server-side filtering code needed in the app

### Policies Applied

See [001_initial_schema.sql](./migrations/001_initial_schema.sql) for the full policy definitions.

## Migrations

### Running Migrations

**Push local migrations to Supabase:**

```bash
yarn supabase db push
```

**Pull remote schema to local:**

```bash
yarn supabase db pull
```

**Generate TypeScript types from schema:**

```bash
yarn supabase gen types typescript --local > core/database/supabase-types.ts
```

### Migration Naming Convention

Format: `{number}_{description}.sql`

Examples:

- `001_initial_schema.sql` - Initial schema (loyalty_cards, users, privacy_log)
- `002_add_sharing_feature.sql` - Future feature addition

## Environment Variables

Required in `.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=your-anon-key
```

The `anon` (public) key is safe for client-side code because RLS protects the data.

## Testing Multi-Tenancy

To verify data isolation:

1. Create User A, add cards
2. Sign out, create User B, add cards
3. Verify User B cannot see User A's cards
4. Sign back in as User A
5. Verify User A still sees only their cards

## References

- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- Manual setup steps: [docs/sprint-artifacts/manual-supabase-steps-6-1.md](../docs/sprint-artifacts/manual-supabase-steps-6-1.md)
