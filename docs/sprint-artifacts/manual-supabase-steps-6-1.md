# Manual Supabase Dashboard Steps for Story 6-1

## Overview

This document describes manual configuration steps required in the Supabase dashboard after running migrations.

## Critical: Multi-Tenant Architecture

**Cloud vs Local Schema Difference:**

- **Cloud (Supabase):** Includes `user_id` field for multi-tenant support
- **Local (SQLite):** No `user_id` field (single user per device)

The migration automatically sets up Row Level Security (RLS) to ensure users can only access their own cards.

## Required Steps

### 1. Apply Migration to Supabase

Run the migration to create the `loyalty_cards` table with RLS policies:

```bash
# Link your local project to the remote Supabase project
yarn supabase link --project-ref <your-project-ref>

# Push migrations to Supabase
yarn supabase db push
```

Alternatively, you can run the SQL manually in the Supabase dashboard:

- Dashboard > SQL Editor > New query > Paste contents of `supabase/migrations/001_create_loyalty_cards.sql` > Run

### 2. Verify Row Level Security (RLS)

The migration enables RLS automatically, but you should verify:

- Go to: Dashboard > Table Editor > `loyalty_cards` table
- Check: RLS is **enabled** (green toggle)
- View policies: Should see 4 policies (SELECT, INSERT, UPDATE, DELETE)

**RLS Policies Explained:**

- Users can only see/modify cards where `user_id` matches their authenticated user ID
- `auth.uid()` retrieves the current authenticated user's ID
- Foreign key ensures `user_id` references a valid user in `auth.users`
- `ON DELETE CASCADE` ensures cards are deleted when a user account is deleted

### 3. Enable Authentication Providers

Configure authentication methods for your app:

**Email Authentication (Required for MVP):**

- Dashboard > Authentication > Providers > Email
- Enable "Email" provider
- Configure email templates (optional for now, defaults are fine)

**Social Authentication (Future stories):**

- Apple: Dashboard > Authentication > Providers > Apple (Story 6-5)
- Google: Dashboard > Authentication > Providers > Google (Story 6-6)

### 4. Configure SMTP for Email Auth (Optional)

If you want custom email templates or production email delivery:

- Dashboard > Project Settings > Auth > SMTP Settings
- Configure your email provider (e.g., SendGrid, Mailgun)

For development, Supabase's default email service works fine.

### 5. Review API Keys

Verify your API keys are correctly set in your `.env` file:

- Dashboard > Project Settings > API
- Copy `URL` → `EXPO_PUBLIC_SUPABASE_URL` in `.env`
- Copy `anon` `public` key → `EXPO_PUBLIC_SUPABASE_KEY` in `.env`

**Security Note:** The `anon` key is safe to use in client-side code because RLS policies enforce data isolation.

### 6. Test Multi-Tenant Isolation (Recommended)

Create two test users and verify they cannot see each other's cards:

1. Sign up user A via your app
2. Add a card for user A
3. Sign out, sign up user B
4. Verify user B cannot see user A's card
5. Add a card for user B
6. Sign out, sign back in as user A
7. Verify user A still sees only their card, not user B's

## Next Stories

- **Story 6-2:** Define additional RLS policies and cloud schema refinements
- **Story 6-3:** Integrate Supabase client in the app with authentication
- **Story 6-4:** Privacy policy and consent flow
- **Story 7-x:** Implement sync logic to map between local (no user_id) and cloud (with user_id) schemas
