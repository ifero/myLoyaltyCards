# Story 6.1: Create Supabase Project (Production Only)

**Epic:** 6 - User Authentication & Privacy
**Type:** Enabling
**Status:** done

## Goal

Create a Supabase project (single Production environment) to support secure cloud storage and authentication for all users.

## Acceptance Criteria

- Supabase project exists and is accessible
- Production environment is configured (no Dev)
- Environment URL and API key are available and documented
- Credentials are stored securely (never in repo)
- Row-Level Security (RLS) is enabled by default
- Project setup steps are documented for the team

## Technical Details & Implementation Breakdown

### 1. Supabase Project Creation

- Use Supabase dashboard to create a new project (Production only)
- Select correct region for latency/compliance
- Name project clearly (e.g., myLoyaltyCards)

### 2. Environment Variables

- Retrieve API URL and anon key from Supabase dashboard
- Store in `.env` files (never hardcoded, never committed)
  Example:
  ```env
  SUPABASE_URL=https://xyz.supabase.co
  SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
  ```
- Validate presence of env vars at app startup; fail fast if missing

### 3. Client Configuration

- Centralize Supabase client setup in `core/supabase/client.ts`
  Example:
  ```ts
  import { createClient } from '@supabase/supabase-js';
  export const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
  ```
- Integrate client config in app bootstrap (`app/_layout.tsx`)
- Validate env vars and show error if missing

### 4. Security: Row-Level Security (RLS)

- Enable RLS for all tables in Supabase dashboard
- Default policy: no access unless explicitly granted
- Example RLS policy (Postgres):
  ```sql
  -- Only allow user to access their own cards
  CREATE POLICY "User can access own cards" ON loyalty_cards
  	FOR SELECT USING (user_id = auth.uid());
  ```
- Document RLS setup and verification steps

### 5. Error Handling

- Implement connection retries for transient network errors
- Log errors in dev, show user-friendly messages in prod
- Ensure app fails fast if config is missing or invalid

### 6. Documentation

- Write setup steps for onboarding new developers (README or docs/schemas/)
- Include instructions for rotating keys and updating env files

## Edge Cases & Risks

- Missing/invalid env vars: App should not start; show clear error
- RLS not enabled: Data could be exposed; verify and test policies
- Key rotation: Document process for updating keys without downtime
- Network errors: Retry logic, offline fallback if possible

## Practical Examples

**Supabase Client Setup (core/supabase/client.ts):**

```ts
import { createClient } from '@supabase/supabase-js';
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  throw new Error('Supabase env vars missing!');
}
export const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
```

**.env.example:**

```env
SUPABASE_URL=https://xyz.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
```

**RLS Policy Example:**

```sql
CREATE POLICY "User can access own cards" ON loyalty_cards
	FOR SELECT USING (user_id = auth.uid());
ALTER TABLE loyalty_cards ENABLE ROW LEVEL SECURITY;
```

**Onboarding Doc Snippet:**

```md
## Supabase Setup

1. Create project in Supabase dashboard
2. Enable RLS for all tables
3. Copy API URL and anon key to .env
4. Validate env vars at app startup
5. Test connection and RLS policies
```

## Acceptance Checklist

- [x] Supabase project created and accessible
- [x] Production environment URL and API key documented
- [x] Credentials stored securely (not in repo)
- [x] RLS enabled and verified
- [x] Setup steps documented for team
- [x] App validates environment variables at startup
- [x] Connection errors handled gracefully

---

**Linked Epic:** Epic 6
**Sprint:** Sprint 2026-02-27
