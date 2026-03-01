# Story 6.6: Create Account with Email

**Epic:** 6 - User Authentication & Privacy
**Type:** User-Facing
**Status:** ready-for-dev

## Goal

Enable users to register an account using email and password, with secure token storage and validation.

## Acceptance Criteria

- Registration form with email, password, confirm password
- Password requirements displayed and validated
- Secure token storage (expo-secure-store)
- Success confirmation and automatic sign-in
- Error handling for invalid input

## Technical Details & Implementation Breakdown

### 1. Registration Form

- Fields: email, password, confirm password
- UI: loading indicator, error feedback, success confirmation
- Accessibility: labels, keyboard navigation, screen reader support
  Example:
  ```tsx
  <TextInput placeholder="Email" ... />
  <TextInput placeholder="Password" secureTextEntry ... />
  <TextInput placeholder="Confirm Password" secureTextEntry ... />
  <Button title="Register" onPress={handleRegister} disabled={!formValid} />
  ```

### 2. Validation

- Client-side: validate email format, password strength (min 8 chars, 1 number, 1 letter), passwords match
- Server-side: Supabase Auth enforces email uniqueness and password requirements
- Show inline errors for invalid input
  Example:
  ```ts
  const validatePassword = (pw: string) => /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(pw);
  ```

### 3. Supabase Auth Integration

- Use Supabase JS client:
  ```ts
  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });
  if (error) {
    // Show error message
  }
  ```
- Handle error cases: email already registered, weak password, network errors

### 4. Secure Token Storage

- Store session token in `expo-secure-store`:
  ```ts
  import * as SecureStore from 'expo-secure-store';
  await SecureStore.setItemAsync('session', JSON.stringify(data.session));
  ```
- Never store token in AsyncStorage or log it

### 5. Automatic Sign-In

- On successful registration, sign in user and persist session
- Redirect to main app screen with success feedback

### 6. Error Handling

- Show clear error messages for all failure cases
- Handle network errors gracefully (retry, offline feedback if possible)
  Example:
  ```tsx
  {
    error && <Text style={{ color: 'red' }}>{error.message}</Text>;
  }
  ```

### 7. Documentation

- Document registration flow, error handling, and edge cases
- Include troubleshooting for common issues
  Example:

  ```md
  ## Registration Flow

  1. User enters email, password, confirm password
  2. Validate input client-side
  3. Call supabase.auth.signUp
  4. On success, store session in SecureStore and redirect
  5. On error, show feedback and allow retry
  ```

### 8. Testing

- Test registration on iOS, Android, and Web
- Validate error handling, token storage, and auto sign-in

## Edge Cases & Risks

- Email already registered: Show error, suggest login or password reset
- Weak password: Block registration, show requirements
- Network errors: Retry logic, offline feedback
- Token exposure: Never log or store in insecure storage

## Acceptance Checklist

- [ ] Registration form with email, password, confirm password
- [ ] Password requirements validated client/server
- [ ] Secure token storage (expo-secure-store)
- [ ] Success confirmation and auto sign-in
- [ ] Error handling for invalid input
- [ ] Edge cases handled (email exists, weak password, network)
- [ ] No token in AsyncStorage or logs
- [ ] Registration flow documented
- [ ] Tested on all platforms

---

**Linked Epic:** Epic 6
**Sprint:** Sprint 2026-02-27
