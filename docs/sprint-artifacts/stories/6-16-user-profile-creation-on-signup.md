# Story 6.16: User Profile Creation on Signup

**Epic:** 6 - User Authentication & Privacy
**Type:** Bug Fix + Enabling
**Status:** backlog

## Story

As the system,
I want a `public.users` profile row to be created automatically whenever a new auth user registers,
so that every authenticated user has a corresponding profile entry that can support household collaboration and future user-facing features.

## Context

Currently `signUp()` in `shared/supabase/auth.ts` calls `supabase.auth.signUp()` which creates a row in `auth.users` only. The `public.users` table (defined in `001_initial_schema.sql`) is never populated on registration, leaving a dangling auth user with no corresponding profile.

This matters now as a correctness bug, and strategically because `public.users` is the anchor for Epic 14 (Household Collaboration) — `display_name` and `avatar_url` are needed for member identity within households.

**Fix approach:** A PostgreSQL trigger on `auth.users` INSERT is the correct pattern for Supabase. It is server-side, atomic, survives all future auth paths (OAuth, SSO, admin-created users), and cannot be bypassed by a client-side bug.

**Schema additions:** `display_name text` and `avatar_url text`, both nullable, are added to `public.users` in this story to future-proof for Epic 14.

**Files affected:**
- `supabase/migrations/002_user_profile_trigger.sql` (new)
- `shared/supabase/auth.ts` (defensive fallback)
- `shared/supabase/auth.test.ts` (new assertions)

## Acceptance Criteria

### AC1: New migration adds columns and trigger

- [ ] Migration `002_user_profile_trigger.sql` exists in `supabase/migrations/`
- [ ] Migration adds `display_name text` (nullable) and `avatar_url text` (nullable) to `public.users`
- [ ] Migration creates a PostgreSQL function `handle_new_user()` that inserts a row into `public.users` with `id`, `email`, `created_at` from the new `auth.users` row
- [ ] Migration creates a trigger `on_auth_user_created` — `AFTER INSERT ON auth.users` — that calls `handle_new_user()`
- [ ] Trigger function uses `ON CONFLICT (id) DO NOTHING` to be idempotent
- [ ] Migration is idempotent (`CREATE OR REPLACE FUNCTION`, `DROP TRIGGER IF EXISTS` before `CREATE TRIGGER`)

### AC2: Existing `public.users` RLS policies cover new columns

- [ ] SELECT, INSERT, UPDATE policies from `001_initial_schema.sql` already cover all columns — verify no new policies are needed
- [ ] `display_name` and `avatar_url` are included in the user's own SELECT and UPDATE scope

### AC3: App-layer defensive insert

- [ ] `signUp()` in `shared/supabase/auth.ts` attempts an explicit insert into `public.users` after successful `auth.signUp()` as a fallback (in case trigger is absent in a misconfigured environment)
- [ ] Uses `upsert` with `onConflict: 'id'` so it is idempotent and does not fail if trigger already created the row
- [ ] Failure of the profile insert does NOT fail the signup result — it is logged as a warning, not a fatal error

### AC4: consent data written at signup

- [ ] When `signUp()` is called and consent has been given (checked via `getConsentStatus()`), the `consent_status` and `consented_at` columns on `public.users` are populated in the same upsert

### AC5: Tests updated

- [ ] `auth.test.ts` — new test: `signUp` success case verifies that the Supabase `from('users').upsert()` call is made with correct payload
- [ ] Test for conflict-safe behaviour: if profile row already exists, no error is thrown
- [ ] Migration SQL is syntactically valid (reviewed, not automatically tested in Jest)

## Technical Notes

- Trigger approach: `supabase/migrations/002_user_profile_trigger.sql` — follows the standard Supabase pattern for syncing `auth.users` to a public profile table
- The `email` field on `public.users` is sourced from `NEW.email` in the trigger (`auth.users` carries email)
- `created_at` uses `now()::text` for ISO 8601 string format consistent with existing schema convention
- `display_name` defaults to `NULL` — the user can set it in a future profile editing story
- `avatar_url` defaults to `NULL` — reserved for Epic 14

## Definition of Done

- [ ] Migration file created and passes `supabase db push` (local)
- [ ] New account registration creates a row in both `auth.users` and `public.users`
- [ ] Existing accounts are unaffected (migration is additive only)
- [ ] `display_name` and `avatar_url` columns exist on `public.users` and are nullable
- [ ] `signUp()` app-layer upsert tested
- [ ] All existing auth tests pass
- [ ] PR reviewed and approved
