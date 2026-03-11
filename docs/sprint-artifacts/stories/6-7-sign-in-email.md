# Story 6.7: Sign In with Email

**Epic:** 6 - User Authentication & Privacy
**Type:** User-Facing
**Status:** done

## Goal

Allow users to authenticate using email and password, with session persistence and error handling.

## Acceptance Criteria

- Login form with email and password
- Error messages for invalid credentials
- Session persistence using secure storage
- Logout option available
- Success feedback on login

## Technical Details

## Technical Details & Implementation Breakdown

### 1. Sign-In Form

- Fields: email, password
- UI: loading indicator, error feedback, success confirmation
- Accessibility: labels, keyboard navigation, screen reader support
  Example:
  ```tsx
  <TextInput placeholder="Email" ... />
  <TextInput placeholder="Password" secureTextEntry ... />
  <Button title="Sign In" onPress={handleSignIn} disabled={!formValid} />
  ```

### 2. Validation

- Client-side: validate email format, password not empty
- Show inline errors for invalid input
  Example:
  ```ts
  const validateEmail = (email: string) => /.+@.+\..+/.test(email);
  ```

### 3. Supabase Auth Integration

- Use Supabase JS client:
  ```ts
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  if (error) {
    // Show error message
  }
  ```
- Handle error cases: wrong credentials, locked account, network errors

### 4. Secure Token Storage

- Store session token in `expo-secure-store`:
  ```ts
  import * as SecureStore from 'expo-secure-store';
  await SecureStore.setItemAsync('session', JSON.stringify(data.session));
  ```
- Never store token in AsyncStorage or log it

### 5. Automatic Session Restore

- On successful sign-in, persist session and redirect to main app screen
- Implement auto-login on app launch if session exists

### 6. Error Handling

- Show clear error messages for all failure cases
- Handle network errors gracefully (retry, offline feedback if possible)
  Example:
  ```tsx
  {
    error && <Text style={{ color: 'red' }}>{error.message}</Text>;
  }
  ```

### 7. Security

- Rate limit login attempts (e.g. max 5 per 10 min)
- Lockout after multiple failures, show lockout message

### 8. Documentation

- Document sign-in flow, error handling, and edge cases
- Include troubleshooting for common issues
  Example:

  ```md
  ## Sign-In Flow

  1. User enters email and password
  2. Validate input client-side
  3. Call supabase.auth.signInWithPassword
  4. On success, store session in SecureStore and redirect
  5. On error, show feedback and allow retry
  ```

### 9. Testing

- Test sign-in on iOS, Android, and Web
- Validate error handling, token storage, auto-login, rate limit, lockout

## Edge Cases & Risks

- Wrong credentials: Show error, allow retry
- Locked account: Show specific error, suggest password reset or support
- Network errors: Retry logic, offline feedback
- Token exposure: Never log or store in insecure storage
- Rate limit/lockout: Prevent brute force, inform user

## Acceptance Checklist

- [ ] Login form with email and password
- [ ] Error messages for invalid credentials
- [ ] Session persistence and token refresh
- [ ] Logout option available
- [ ] Success feedback on login
- [ ] Edge cases handled (wrong password, user not found, lockout, network)
- [ ] Rate limit and lockout implemented
- [ ] No tokens exposed/logged
- [ ] Login flow documented
- [ ] Tested on all platforms

---

**Linked Epic:** Epic 6
**Sprint:** Sprint 2026-02-27
