# Story 6.3: Configure App Client for Supabase

**Epic:** 6 - User Authentication & Privacy
**Type:** Enabling
**Status:** ready-for-dev

## Goal

Configure the Expo/React Native app to connect to Supabase, using environment variables and secure client initialization.

## Acceptance Criteria

- Supabase client is initialized in the app
- Environment variables for URLs and keys are set up
- Error handling for connection failures is implemented
- Secure storage for credentials (expo-secure-store)
- Documentation for setup and usage

## Technical Details & Implementation Breakdown

### 1. Supabase JS Client Integration

- Use official Supabase JS client compatible with Expo (check Context7 MCP for latest version)
- Install via Expo:
  ```sh
  npx expo install @supabase/supabase-js
  ```
- Centralize client config in `core/supabase/client.ts`

### 2. Environment Variables

- Store API URL and anon key in `.env` (never in repo)
- Validate presence of env vars at startup; fail fast if missing
  Example:
  ```env
  SUPABASE_URL=https://xyz.supabase.co
  SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
  ```

### 3. Client Initialization

- Example setup:
  ```ts
  import { createClient } from '@supabase/supabase-js';
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    throw new Error('Supabase env vars missing!');
  }
  export const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  ```
- Integrate client in app bootstrap (`app/_layout.tsx`)

### 4. Secure Credential Storage

- Use `expo-secure-store` for any session tokens or sensitive data
- Example:
  ```ts
  import * as SecureStore from 'expo-secure-store';
  await SecureStore.setItemAsync('session', JSON.stringify(session));
  ```
- Never log or expose tokens

### 5. API Exposure

- Expose methods for login, logout, registration, guest mode
- Example API:
  ```ts
  export const login = async (email, password) => {
    return supabase.auth.signInWithPassword({ email, password });
  };
  export const logout = async () => {
    return supabase.auth.signOut();
  };
  ```

### 6. Error Handling & Offline Support

- Implement retries for transient network errors
- Show user-friendly error messages
- Consider offline fallback for guest mode
- Example error handling:
  ```ts
  try {
    await login(email, password);
  } catch (err) {
    // Show user-friendly error
  }
  ```

### 7. Login Persistence & Token Refresh

- Use Supabase’s built-in session management
- Store session in SecureStore, refresh tokens automatically

### 8. Documentation

- Document integration steps for onboarding new developers
- Include troubleshooting for common errors (env missing, network, token expiry)
- Example onboarding doc snippet:

  ```md
  ## Supabase Client Setup

  1. Install @supabase/supabase-js via Expo
  2. Add .env with SUPABASE_URL and SUPABASE_ANON_KEY
  3. Centralize client config in core/supabase/client.ts
  4. Validate env vars at startup
  5. Expose login/logout/register API
  6. Use SecureStore for session tokens
  7. Test on all platforms
  ```

### 9. Testing

- Test client and API on iOS, Android, and Web
- Validate error handling and session persistence

## Acceptance Checklist

- [ ] Supabase client initialized in core/supabase/client.ts
- [ ] API keys and URL stored in .env, not in repo
- [ ] Env variables validated at startup
- [ ] Login persistence and token refresh supported
- [ ] API exposes login, logout, registration, guest mode
- [ ] Connection errors handled gracefully
- [ ] No secrets/tokens logged
- [ ] Integration steps documented
- [ ] Tested on iOS, Android, Web

---

**Linked Epic:** Epic 6
**Sprint:** Sprint 2026-02-27
