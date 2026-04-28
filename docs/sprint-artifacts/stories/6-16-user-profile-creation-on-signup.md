# Story 6.16: User Profile Creation on Signup

**Epic:** 6 - User Authentication & Privacy
**Type:** Bug Fix + Enabling
**Status:** review

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

- [x] Migration `002_user_profile_trigger.sql` exists in `supabase/migrations/`
- [x] Migration adds `display_name text` (nullable) and `avatar_url text` (nullable) to `public.users`
- [x] Migration creates a PostgreSQL function `handle_new_user()` that inserts a row into `public.users` with `id`, `email`, `created_at` from the new `auth.users` row
- [x] Migration creates a trigger `on_auth_user_created` — `AFTER INSERT ON auth.users` — that calls `handle_new_user()`
- [x] Trigger function uses `ON CONFLICT (id) DO NOTHING` to be idempotent
- [x] Migration is idempotent (`CREATE OR REPLACE FUNCTION`, `DROP TRIGGER IF EXISTS` before `CREATE TRIGGER`)

### AC2: Existing `public.users` RLS policies cover new columns

- [x] SELECT, INSERT, UPDATE policies from `001_initial_schema.sql` already cover all columns — verify no new policies are needed
- [x] `display_name` and `avatar_url` are included in the user's own SELECT and UPDATE scope

### AC3: App-layer defensive insert

- [x] `signUp()` in `shared/supabase/auth.ts` attempts an explicit insert into `public.users` after successful `auth.signUp()` as a fallback (in case trigger is absent in a misconfigured environment)
- [x] Uses `upsert` with `onConflict: 'id'` so it is idempotent and does not fail if trigger already created the row
- [x] Failure of the profile insert does NOT fail the signup result — it is logged as a warning, not a fatal error

### AC4: consent data written at signup

- [x] When `signUp()` is called and consent has been given (checked via `getConsentStatus()`), the consent metadata is passed through `auth.signUp()` so the trigger can populate `public.users`, and the fallback upsert mirrors the same fields when a session is present

### AC5: Tests updated

- [x] `auth.test.ts` — new test: `signUp` success case verifies that the Supabase `from('users').upsert()` call is made with correct payload
- [x] Test for conflict-safe behaviour: if profile row already exists, no error is thrown
- [x] Migration SQL is syntactically valid (reviewed, not automatically tested in Jest)

## Technical Notes

- Trigger approach: `supabase/migrations/002_user_profile_trigger.sql` — follows the standard Supabase pattern for syncing `auth.users` to a public profile table
- The `email` field on `public.users` is sourced from `NEW.email` in the trigger (`auth.users` carries email)
- Consent metadata is sourced from `auth.users.raw_user_meta_data`, populated by `auth.signUp({ options: { data }})`
- `created_at` is written as ISO 8601 UTC text via `to_char(..., 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')` to match the existing schema contract
- `display_name` defaults to `NULL` — the user can set it in a future profile editing story
- `avatar_url` defaults to `NULL` — reserved for Epic 14

## Definition of Done

- [x] Migration file created and passes `supabase db push` (local)
- [x] New account registration creates a row in both `auth.users` and `public.users`
- [x] Existing accounts are unaffected (migration is additive only)
- [x] `display_name` and `avatar_url` columns exist on `public.users` and are nullable
- [x] `signUp()` app-layer upsert tested
- [x] All existing auth tests pass
- [ ] PR reviewed and approved

## Tasks / Subtasks

- [x] **Task 1: Add red tests for signup profile fallback** (AC3, AC4, AC5)
  - [x] 1.1 Extend Supabase auth test mocks with `from('users').upsert(...)`
  - [x] 1.2 Add failing test for successful signup with profile upsert payload
  - [x] 1.3 Add failing test for consent-aware signup payload
  - [x] 1.4 Add failing test proving profile upsert warnings are non-fatal

- [x] **Task 2: Implement app-layer profile upsert fallback** (AC3, AC4)
  - [x] 2.1 Import consent helpers into `shared/supabase/auth.ts`
  - [x] 2.2 Upsert `public.users` after successful `auth.signUp()` with `onConflict: 'id'`
  - [x] 2.3 Include `consent_status` and `consented_at` only when local consent exists
  - [x] 2.4 Log fallback upsert failures as warnings without failing signup

- [x] **Task 3: Add idempotent Supabase migration for profile creation** (AC1, AC2)
  - [x] 3.1 Create `supabase/migrations/002_user_profile_trigger.sql`
  - [x] 3.2 Add nullable `display_name` and `avatar_url` columns if missing
  - [x] 3.3 Create `public.handle_new_user()` as an idempotent trigger function
  - [x] 3.4 Recreate trigger `on_auth_user_created` on `auth.users`
  - [x] 3.5 Verify existing `public.users` RLS policies already cover the new columns

- [x] **Task 4: Validate locally and update story tracking** (AC1, AC3, AC4, AC5)
  - [x] 4.1 Run focused auth tests for `shared/supabase/auth.test.ts`
  - [x] 4.2 Run local migration validation (`supabase db push` or equivalent local CLI check)
  - [x] 4.3 Update Dev Agent Record, File List, Change Log, and sprint tracking

## Dev Agent Record

### Agent Model Used

GPT-5.4

### Debug Log References

- 2026-04-28: Story scaffold added because the draft lacked executable Tasks / Subtasks, Dev Agent Record, File List, Change Log, and Status sections.
- 2026-04-28: Working branch created: `feature/6-16-user-profile-creation-on-signup`.
- 2026-04-28: Initial signup tests failed until the Supabase `from('users').upsert(...)` mock was wired into `shared/supabase/auth.test.ts`.
- 2026-04-28: Local Supabase validation was blocked by long Docker image pulls; final validation succeeded once `supabase start` completed and `db push --local` reported the database up to date.
- 2026-04-28: Live local signup verification passed for `story616.1777383384@example.com`; the same user ID was present in both `auth.users` and `public.users`.
- 2026-04-28: Review follow-up fixed the confirmation-required signup path by sending consent metadata through `auth.signUp()`, then revalidated with `supabase db reset --local` and a live trigger-only signup for `story616.1777386259858@example.com`.

### Completion Notes List

- Added consent-aware, conflict-safe, and warning-only signup fallback tests to `shared/supabase/auth.test.ts`.
- Updated `shared/supabase/auth.ts` to pass consent metadata through `auth.signUp()` and only run the fallback `public.users` upsert when Supabase returned a session.
- Added `supabase/migrations/002_user_profile_trigger.sql` with nullable `display_name` and `avatar_url` columns plus an idempotent `auth.users` trigger.
- Local validation passed via `npx jest shared/supabase/auth.test.ts --runInBand --verbose` and `npx supabase db reset --local`.
- Live local signup verification passed via a direct Supabase auth signup with consent metadata, and direct database inspection confirmed matching rows in `auth.users` and `public.users` plus ISO-formatted `created_at`.

### Change Log

- 2026-04-28: Added executable task tracking sections to the story so implementation can proceed task-by-task under BMAD workflow constraints.
- 2026-04-28: Added signup fallback tests covering base payload, consent propagation, existing-row idempotence, and warning-only failure handling.
- 2026-04-28: Implemented `signUp()` consent metadata propagation and limited the fallback profile upsert to session-bearing signups.
- 2026-04-28: Added `002_user_profile_trigger.sql` to create nullable profile columns and sync `auth.users` into `public.users`.
- 2026-04-28: Validated the auth test slice and local Supabase migration state, then moved the story to review.
- 2026-04-28: Verified one real local signup end to end and confirmed row creation in both `auth.users` and `public.users`.
- 2026-04-28: Fixed review findings for confirmation-required signups and ISO timestamp formatting, then revalidated with `db reset --local` plus a live metadata-bearing signup.

### File List

- `shared/supabase/auth.ts` — MODIFIED: Added defensive `public.users` upsert fallback to `signUp()` with consent-aware payload fields
- `shared/supabase/auth.test.ts` — MODIFIED: Added signup tests for payload shape, consent propagation, existing-row idempotence, and warning-only fallback errors
- `supabase/migrations/002_user_profile_trigger.sql` — NEW: Added nullable profile columns and `auth.users` -> `public.users` trigger sync
- `docs/sprint-artifacts/stories/6-16-user-profile-creation-on-signup.md` — MODIFIED: Updated acceptance criteria, task tracking, validation notes, and story status
- `docs/sprint-artifacts/sprint-status.yaml` — MODIFIED: Moved Story 6.16 from backlog to review

## Status

review
