# Story 6.2: Define Cloud Schema & Row-Level Security

**Epic:** 6 - User Authentication & Privacy
**Type:** Enabling
**Status:** ready-for-dev

## Goal

Design and implement the Supabase database schema for loyalty cards and users, with Row-Level Security (RLS) to ensure data privacy.

## Acceptance Criteria

- `loyalty_cards` table matches Zod schema (id, name, barcode, etc.)
- `users` table for user profiles
- RLS policies restrict access to owner only
- Schema and policies are documented
- Migration scripts (if needed) are available

## Technical Details & Implementation Breakdown

### 1. Schema Definition

- Use Supabase SQL editor (Postgres) to define tables:
  - `loyalty_cards`:
    - id (UUID, PK), user_id (UUID, FK), name (string), barcode (string), barcodeFormat (enum), brandId (nullable string), color (enum), isFavorite (boolean), lastUsedAt (nullable ISO datetime), usageCount (int), createdAt, updatedAt (ISO 8601)
  - `users`:
    - id (UUID, PK), email (string, unique), createdAt (ISO 8601), consentStatus (boolean/timestamp)
  - `privacy_log`:
    - id (UUID, PK), user_id (FK), event_type (enum: login, registration, consent), event_time (ISO 8601)

### 2. Types & Integrity

- Use UUIDs for all primary keys
- Use ISO 8601 for all timestamps
- Enforce foreign key constraints (e.g., loyalty_cards.user_id → users.id)

### 3. Row-Level Security (RLS)

- Enable RLS for all tables in Supabase dashboard
- Default policy: no access unless explicitly granted
- Example RLS policy for `loyalty_cards`:
  ```sql
  CREATE POLICY "User can access own cards" ON loyalty_cards
  	FOR ALL USING (user_id = auth.uid());
  ALTER TABLE loyalty_cards ENABLE ROW LEVEL SECURITY;
  ```
- Write similar policies for `privacy_log` and any other sensitive tables

### 4. Documentation

- Document schema and RLS policies in repo (e.g., docs/schemas/loyalty_cards.sql)
- Include migration scripts if schema changes are needed

### 5. Testing

- Test RLS with multiple users: verify only owner can access/modify their data
- Test edge cases: orphan records, nulls, referential integrity
- Sync schema with frontend types (Zod) for type safety

## Edge Cases & Risks

- Orphan records: Ensure all FK constraints are enforced
- Null values: Validate schema to prevent unexpected nulls
- RLS misconfiguration: Test policies to avoid data leaks
- Schema drift: Keep backend and frontend types in sync (automate if possible)

## Practical Examples

**loyalty_cards Table Example:**

```sql
CREATE TABLE loyalty_cards (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id UUID REFERENCES users(id) ON DELETE CASCADE,
	name VARCHAR(50) NOT NULL,
	barcode VARCHAR(64) NOT NULL,
	barcodeFormat VARCHAR(16) NOT NULL,
	brandId VARCHAR(32),
	color VARCHAR(16) NOT NULL,
	isFavorite BOOLEAN DEFAULT FALSE,
	lastUsedAt TIMESTAMP,
	usageCount INTEGER DEFAULT 0,
	createdAt TIMESTAMP DEFAULT now(),
	updatedAt TIMESTAMP DEFAULT now()
);
```

**privacy_log Table Example:**

```sql
CREATE TABLE privacy_log (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id UUID REFERENCES users(id) ON DELETE CASCADE,
	event_type VARCHAR(16) NOT NULL,
	event_time TIMESTAMP DEFAULT now()
);
```

**RLS Policy Example:**

```sql
CREATE POLICY "User can access own cards" ON loyalty_cards
	FOR ALL USING (user_id = auth.uid());
ALTER TABLE loyalty_cards ENABLE ROW LEVEL SECURITY;
```

**Zod Schema Example (TypeScript):**

```ts
import { z } from 'zod';
export const loyaltyCardSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string().max(50),
  barcode: z.string().max(64),
  barcodeFormat: z.enum(['CODE128', 'EAN13', 'EAN8', 'QR', 'CODE39', 'UPCA']),
  brandId: z.string().nullable(),
  color: z.enum(['blue', 'red', 'green', 'orange', 'grey']),
  isFavorite: z.boolean(),
  lastUsedAt: z.string().datetime().nullable(),
  usageCount: z.number().int(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});
```

**Schema Documentation Snippet:**

```md
## loyalty_cards Table

- id: UUID, PK
- user_id: UUID, FK to users
- name: string, max 50
- barcode: string
- barcodeFormat: enum
- ...
```

## Acceptance Checklist

- [ ] loyalty_cards and users tables created with correct fields
- [ ] privacy_log table for audit trail
- [ ] UUIDs and timestamps used correctly
- [ ] RLS enabled and policies restrict access to owner
- [ ] Referential integrity enforced
- [ ] Schema and RLS documented in repo
- [ ] Schema matches frontend types
- [ ] RLS tested with multiple users

---

**Linked Epic:** Epic 6
**Sprint:** Sprint 2026-02-27
