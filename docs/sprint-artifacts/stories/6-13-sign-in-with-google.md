# Story 6.13: Sign In with Google

**Epic:** 6 - User Authentication & Privacy
**Type:** User-Facing
**Status:** backlog

## Goal

Allow users to create an account or sign in using their Google account, providing a fast one-tap sign-in alternative available on both iOS and Android.

## Acceptance Criteria

- "Sign in with Google" button visible on Sign In and Create Account screens (iOS and Android)
- Google account picker appears on tap
- Account created or linked in Supabase on success
- User signed in automatically and auth token stored securely
- Works on both iOS and Android

## Technical Details & Implementation Breakdown

### 1. Dependencies

```bash
npx expo install expo-auth-session expo-crypto expo-web-browser
```

- Uses Supabase OAuth + `expo-auth-session` for the OAuth redirect flow
- No Google SDK required — Supabase handles the OAuth exchange server-side
- Add `expo-web-browser` config plugin to `app.json` (required for `maybeCompleteAuthSession`)

### 2. Supabase Google OAuth Configuration

- Enable Google OAuth provider in Supabase Dashboard → Authentication → Providers
- Create OAuth 2.0 credentials in Google Cloud Console for both iOS and Android (bundle ID + package name)
- Set `Authorized redirect URI` in Google Cloud Console to the Supabase callback URL
- Add URL scheme to `app.json` for deep link return:
  ```json
  {
    "scheme": "myloyaltycards"
  }
  ```

### 3. Google Sign-In Button

- Create a custom Google-branded button (Google sign-in buttons must follow Google brand guidelines):

  ```tsx
  <TouchableOpacity style={styles.googleButton} onPress={handleSignInWithGoogle}>
    <GoogleIcon width={20} height={20} />
    <Text style={styles.googleButtonText}>Sign in with Google</Text>
  </TouchableOpacity>
  ```

- Render on both `features/auth/SignInScreen.tsx` and `features/auth/CreateAccountScreen.tsx`

### 4. OAuth Flow with Supabase

- Add new wrapper to `shared/supabase/auth.ts`:

  ```ts
  /**
   * Initiates Google OAuth sign-in via Supabase.
   * Opens a browser session for Google account selection.
   * Returns the session after the OAuth callback completes.
   */
  export const signInWithGoogle = async (): Promise<AuthResult<AuthSession>>;
  ```

- Implementation using Supabase's OAuth flow:

  ```ts
  import * as WebBrowser from 'expo-web-browser';
  import { makeRedirectUri } from 'expo-auth-session';

  WebBrowser.maybeCompleteAuthSession();

  const redirectTo = makeRedirectUri({ scheme: 'myloyaltycards', path: 'auth/callback' });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true
    }
  });

  if (error || !data.url) {
    return { success: false, error: toAuthError(error ?? new Error('No OAuth URL')) };
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type !== 'success') {
    // User dismissed the browser
    return { success: false, error: { message: 'Sign-in cancelled.' } };
  }

  // Extract session from URL params
  const url = new URL(result.url);
  const accessToken = url.searchParams.get('access_token');
  // ... parse and set session
  ```

### 5. Auth Callback Handling

- Add `app/auth/callback.tsx` route to handle the deep link return from Google OAuth
- This route reads URL params (access_token, refresh_token) and sets the Supabase session:

  ```ts
  const { data, error } = await supabase.auth.setSession({
    access_token,
    refresh_token
  });
  ```

- On success: navigate to main app screen

### 6. Secure Token Storage

- Session persistence handled automatically by the SecureStore adapter in `shared/supabase/client.ts`

### 7. Error Handling

- User dismisses the browser: Return silently (no error shown to user)
- OAuth denied by user: Show neutral message "Sign-in was not completed"
- Supabase exchange fails: Show error, allow retry
- Network error during flow: Show "Check your connection and try again"

### 8. Testing

- Unit test: `signInWithGoogle()` handles OAuth error response
- Unit test: browser dismissal handled gracefully (no crash)
- Manual: Full sign-in flow on iOS physical device
- Manual: Full sign-in flow on Android device
- Manual: Re-signing with same Google account links to existing Supabase account
- Manual: Different Google account creates separate account

## Manual Configuration Required (Ifero)

> 🔑 These steps require your Google account (Google Cloud Console access) and Supabase dashboard access. Complete these **before dev picks up this story**. Devs cannot test without this configuration in place.

### Step 1 — Google Cloud Console

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Select or create a project for myLoyaltyCards
3. Navigate to **APIs & Services** → **OAuth consent screen**
   - User type: **External**
   - App name: `myLoyaltyCards`
   - Support email: your email
   - Authorized domains: `<your-supabase-project-ref>.supabase.co`
   - Save and Continue through all screens
4. Navigate to **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**

   **Create credential A — Web application** (used by Supabase for the server-side exchange):
   - Application type: **Web application**
   - Name: `myLoyaltyCards Supabase Web`
   - Authorized redirect URIs: `https://<your-supabase-project-ref>.supabase.co/auth/v1/callback`
   - Create → note down **Client ID** and **Client Secret**

   > 📋 Find the exact Supabase callback URL: Dashboard → Authentication → Providers → Google → it shows the Redirect URL to paste here.

   **Create credential B — iOS** (needed for native iOS OAuth picker):
   - Application type: **iOS**
   - Name: `myLoyaltyCards iOS`
   - Bundle ID: `com.iferoporefi.myloyaltycards`
   - Create → note down the iOS **Client ID**

   **Create credential C — Android** (needed for native Android OAuth picker):
   - Application type: **Android**
   - Name: `myLoyaltyCards Android`
   - Package name: `com.iferoporefi.myloyaltycards`
   - SHA-1 certificate fingerprint: run `cd android && ./gradlew signingReport` in the project root and copy the debug SHA-1 (for dev/testing). For production use the release keystore SHA-1.
   - Create

### Step 2 — Supabase Dashboard

1. Go to Supabase Dashboard → your project → **Authentication** → **Providers** → **Google**
2. Toggle **Enable Google provider** ON
3. Fill in:
   - **Client ID:** the Web application Client ID from Step 1 (credential A)
   - **Client Secret:** the Web application Client Secret from Step 1 (credential A)
4. Save

   > ℹ️ The iOS and Android credentials (B and C) are used by the native Google sign-in flow and don't go into Supabase — they're referenced in the app bundle ID/package configuration which is already set in `app.json`.

### Step 3 — Verify Callback URL

- Confirm the **Redirect URL** shown in Supabase matches exactly what you entered in the Web application credential in Step 1
- Format: `https://<your-supabase-project-ref>.supabase.co/auth/v1/callback`

### Summary Checklist for Ifero

- [ ] Google Cloud Console project created/selected
- [ ] OAuth consent screen configured with Supabase domain as authorized domain
- [ ] Web application credential created with Supabase callback URL → Client ID + Secret noted
- [ ] iOS credential created with bundle ID `com.iferoporefi.myloyaltycards`
- [ ] Android credential created with package `com.iferoporefi.myloyaltycards` + SHA-1
- [ ] Supabase Dashboard → Google provider enabled with Web Client ID + Secret
- [ ] Callback URL verified to match between Google Console and Supabase

---

## Edge Cases & Risks

- Email already registered via email/password: Supabase links by email (verify project settings)
- Google revokes access: Token refresh fails → force local sign-out
- Deep link not handled: Verify `app.json` scheme and Expo Router callback route are correct
- In-app browser blocked: `expo-web-browser` opens system Safari/Chrome, which is not blocked

## Acceptance Checklist

- [ ] `expo-auth-session`, `expo-crypto`, `expo-web-browser` installed
- [ ] Google OAuth provider enabled in Supabase Dashboard
- [ ] Google Cloud Console OAuth credentials configured for iOS + Android
- [ ] `app.json` scheme set to `myloyaltycards`
- [ ] Google-branded button on Sign In and Create Account screens
- [ ] `signInWithGoogle()` wrapper added to `shared/supabase/auth.ts`
- [ ] `app/auth/callback.tsx` route handles deep link return
- [ ] Session stored via SecureStore adapter
- [ ] Browser dismissal handled silently
- [ ] Unit tests passing
- [ ] Tested on iOS and Android physical devices

---

**Linked Epic:** Epic 6
**Sprint:** Sprint 8 — 2026-03-12
