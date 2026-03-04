# Story 6.3: Configure App Client for Supabase

**Epic:** 6 - User Authentication & Privacy
**Type:** Enabling
**Status:** review

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

## Tasks / Subtasks

- [x] **Task 1: Install expo-secure-store dependency**
  - [x] 1.1 Run `npx expo install expo-secure-store`
  - [x] 1.2 Verify correct version in package.json

- [x] **Task 2: Enhance Supabase client with SecureStore session adapter**
  - [x] 2.1 Add `SecureStoreAdapter` implementing `SupportedStorage` interface in `shared/supabase/client.ts`
  - [x] 2.2 Pass adapter to `createClient` auth options (`persistSession: true`, `autoRefreshToken: true`, `storage: SecureStoreAdapter`)
  - [x] 2.3 Handle web/test fallback (SecureStore is native-only) — return `null` gracefully on unsupported platforms
  - [x] 2.4 Never log tokens in adapter methods

- [x] **Task 3: Create auth API (`shared/supabase/auth.ts`)**
  - [x] 3.1 `signInWithEmail(email, password)` — wraps `supabase.auth.signInWithPassword`
  - [x] 3.2 `signUp(email, password)` — wraps `supabase.auth.signUp`
  - [x] 3.3 `signOut()` — wraps `supabase.auth.signOut`
  - [x] 3.4 `getSession()` — wraps `supabase.auth.getSession`
  - [x] 3.5 `continueAsGuest()` — returns local guest session (no Supabase call); sets `isGuest` flag
  - [x] 3.6 All methods catch errors, never throw raw Supabase errors to callers; return typed `AuthResult<T>` union

- [x] **Task 4: Create `.env.example` template file**
  - [x] 4.1 Add `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_KEY` entries with placeholder values
  - [x] 4.2 Add instructional comments referencing setup docs

- [x] **Task 5: Write unit tests for `shared/supabase/auth.ts`**
  - [x] 5.1 Test `signInWithEmail` — success and error paths
  - [x] 5.2 Test `signUp` — success and error paths
  - [x] 5.3 Test `signOut` — success path
  - [x] 5.4 Test `getSession` — returns session or null
  - [x] 5.5 Test `continueAsGuest` — returns guest session with `isGuest: true`
  - [x] 5.6 Test error handling — raw Supabase errors never propagated as-is

- [x] **Task 6: Update `shared/supabase/client.test.ts`**
  - [x] 6.1 Add test for SecureStore adapter on native platform (mock SecureStore)
  - [x] 6.2 Add test for web/Jest fallback — adapter degrades gracefully
  - [x] 6.3 Add test that session persisted (`persistSession: true`) in client options

- [x] **Task 7: Run full test suite and fix regressions**

## Acceptance Checklist

- [x] Supabase client initialized in `shared/supabase/client.ts` (already existed; enhanced with SecureStore adapter)
- [x] API keys and URL stored in `.env`, `.env.example` template committed
- [x] Env variables validated at startup
- [x] Login persistence and token refresh supported (via SecureStore adapter)
- [x] API exposes login, logout, registration, guest mode
- [x] Connection errors handled gracefully — typed `AuthResult` returned
- [x] No secrets/tokens logged
- [x] Integration steps documented in `.env.example` and `docs/sprint-artifacts/manual-supabase-steps-6-1.md` reference
- [x] Tested: unit tests cover all auth methods

---

**Linked Epic:** Epic 6
**Sprint:** Sprint 2026-02-27

---

## Dev Agent Record

### Debug Log

| Task     | Notes                                                                                                                                                                                           |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Task 1   | `expo-secure-store@15.0.8` installed (SDK 54 compatible)                                                                                                                                        |
| Task 2   | Added `createSecureStoreAdapter(store)` factory; `SecureStoreAdapter` singleton; `createSupabaseClient` now accepts `storage` param. `getSupabaseClient()` singleton reset util added for tests |
| Task 3   | `auth.ts` created with `signInWithEmail`, `signUp`, `signOut`, `getSession`, `continueAsGuest`. `toAuthError` handles both Error instances and plain Supabase error objects `{ message, code }` |
| Task 5/6 | 23 auth tests + 24 client tests = 47 new tests. SecureStore chunking adapter added (iOS Keychain ~2KB limit). All 458 suite tests green.                                                        |

### Completion Notes

All tasks complete. `shared/supabase/client.ts` enhanced with `createSecureStoreAdapter` factory: handles iOS Keychain 2KB limit via transparent value chunking; native → SecureStore; web/Jest → graceful noop. `shared/supabase/auth.ts` is the single auth API: typed `AuthResult<T>` discriminated union, no raw errors surfaced, no token logging. `.env.example` extended with session storage notes. Full test suite 458/458 pass.

### File List

_Files added / modified during implementation:_

- `shared/supabase/client.ts` — enhanced with SecureStore storage adapter
- `shared/supabase/auth.ts` — new auth API module
- `shared/supabase/auth.test.ts` — new unit tests for auth API
- `shared/supabase/client.test.ts` — extended with SecureStore adapter tests
- `.env.example` — new template for env vars
- `docs/sprint-artifacts/stories/6-3-configure-app-client.md` — tasks, record
