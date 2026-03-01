# Cloud Database Schemas — myLoyaltyCards

> Story 6-2: Define Cloud Schema & Row-Level Security
> Updated: 2026-03-01

This document describes the Supabase (Postgres) schema used for cloud storage and
Row-Level Security (RLS) policies that enforce per-user data isolation.

---

## Tables

| Table           | Migration file                                             | Purpose                          |
| --------------- | ---------------------------------------------------------- | -------------------------------- |
| `loyalty_cards` | `supabase/migrations/001_create_loyalty_cards.sql`         | Cloud copy of user loyalty cards |
| `users`         | `supabase/migrations/002_create_users_and_privacy_log.sql` | User profile + consent state     |
| `privacy_log`   | `supabase/migrations/002_create_users_and_privacy_log.sql` | Immutable GDPR audit trail       |

---

## `loyalty_cards`

Stores user loyalty cards in the cloud. Synced to/from the local SQLite `loyalty_cards`
table each session. The cloud version adds `user_id` for multi-tenant isolation.

```sql
CREATE TABLE IF NOT EXISTS loyalty_cards (
  id             uuid   PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid   NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name           text   NOT NULL,
  barcode        text   NOT NULL,
  barcode_format text   NOT NULL,      -- CODE128 | EAN13 | EAN8 | QR | CODE39 | UPCA
  brand_id       text,
  color          text   NOT NULL,      -- blue | red | green | orange | grey
  is_favorite    boolean NOT NULL DEFAULT false,
  last_used_at   text,                 -- ISO 8601, nullable
  usage_count    integer NOT NULL DEFAULT 0,
  created_at     text   NOT NULL,      -- ISO 8601
  updated_at     text   NOT NULL       -- ISO 8601
);
```

### RLS policies — `loyalty_cards`

| Policy name                      | Operation | Predicate                     |
| -------------------------------- | --------- | ----------------------------- |
| Users can view their own cards   | SELECT    | `auth.uid() = user_id`        |
| Users can insert their own cards | INSERT    | `auth.uid() = user_id`        |
| Users can update their own cards | UPDATE    | `auth.uid() = user_id` (both) |
| Users can delete their own cards | DELETE    | `auth.uid() = user_id`        |

---

## `users`

Public profile table — one row per `auth.users` entry. Created by the app immediately
after a successful sign-up. Stores email and GDPR consent state separately from
Supabase Auth so the client can query it via RLS-protected `SELECT`.

```sql
CREATE TABLE IF NOT EXISTS public.users (
  id             uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email          text NOT NULL UNIQUE,
  consent_status boolean,             -- NULL = not yet asked, true = given, false = withdrawn
  consented_at   text,                -- ISO 8601, NULL until consent given
  created_at     text NOT NULL        -- ISO 8601
);
```

### RLS policies — `users`

| Policy name                  | Operation | Predicate                |
| ---------------------------- | --------- | ------------------------ |
| Users can view own profile   | SELECT    | `auth.uid() = id`        |
| Users can insert own profile | INSERT    | `auth.uid() = id`        |
| Users can update own profile | UPDATE    | `auth.uid() = id` (both) |

---

## `privacy_log`

Append-only audit trail recording key privacy-related events. Rows are never updated
or deleted manually — `ON DELETE CASCADE` from `auth.users` handles cleanup on
account deletion.

```sql
CREATE TABLE IF NOT EXISTS public.privacy_log (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,   -- see event types below
  event_time text NOT NULL    -- ISO 8601
);
```

#### Valid `event_type` values

| Value               | Description                         |
| ------------------- | ----------------------------------- |
| `login`             | User successfully authenticated     |
| `registration`      | New account created                 |
| `consent_given`     | User accepted privacy/GDPR consent  |
| `consent_withdrawn` | User withdrew consent               |
| `data_export`       | User requested personal data export |
| `account_deletion`  | User initiated account deletion     |

### RLS policies — `privacy_log`

| Policy name                              | Operation | Predicate              |
| ---------------------------------------- | --------- | ---------------------- |
| Users can view own privacy log           | SELECT    | `auth.uid() = user_id` |
| Users can insert own privacy log entries | INSERT    | `auth.uid() = user_id` |

> **Note:** No UPDATE or DELETE policies exist. The log is intentionally immutable.

---

## Design Decisions

1. **`text` for timestamps** — ISO 8601 strings are used instead of `TIMESTAMPTZ` to
   ensure cross-platform determinism (matches local SQLite and the Zod schemas).
2. **`auth.users` as the identity anchor** — `public.users.id` and all `user_id`
   foreign keys reference `auth.users(id)`, not `public.users`. This keeps RLS
   expressions simple (`auth.uid() = user_id`) and avoids circular dependencies.
3. **RLS default-deny** — enabling RLS with no default policy means all access is
   denied until an explicit policy grants it. Each table has the minimal set of
   policies required by the feature epic.
4. **Append-only `privacy_log`** — no UPDATE/DELETE RLS policies are created. The
   audit trail must be tamper-evident from the application side.

---

## TypeScript Types

Cloud Zod schemas and inferred TypeScript types live in:

```
shared/supabase/schemas.ts
```

Key exports:

| Export                        | Description                          |
| ----------------------------- | ------------------------------------ |
| `cloudLoyaltyCardSchema`      | Zod schema for `loyalty_cards` row   |
| `CloudLoyaltyCard`            | TypeScript type                      |
| `cloudUserSchema`             | Zod schema for `users` row           |
| `CloudUser`                   | TypeScript type                      |
| `cloudUserInsertSchema`       | Zod schema for inserting a profile   |
| `cloudPrivacyLogSchema`       | Zod schema for `privacy_log` row     |
| `CloudPrivacyLog`             | TypeScript type                      |
| `cloudPrivacyLogInsertSchema` | Zod schema for inserting a log entry |
| `privacyEventTypeSchema`      | Enum of valid `event_type` values    |
| `PrivacyEventType`            | TypeScript union type                |
