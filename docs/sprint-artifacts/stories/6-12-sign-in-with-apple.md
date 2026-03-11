# Story 6.12: Sign In with Apple

**Epic:** 6 - User Authentication & Privacy
**Type:** User-Facing
**Status:** backlog

> ⚠️ **Physical iOS device required from Day 1.** Apple Sign In does not work on the iOS Simulator. A real device must be available and provisioned before development starts — do not wait until the testing phase. Verify Apple Developer Portal entitlements and device provisioning before picking up this story.

## Goal

Allow users to create an account or sign in using their Apple ID, satisfying Apple's App Store requirement to offer Sign in with Apple when any third-party social login is available.

## Acceptance Criteria

- "Sign in with Apple" button visible on both Sign In and Create Account screens
- Apple authentication sheet appears on tap
- Account created or linked in Supabase on success
- User signed in automatically and auth token stored securely
- Private relay email supported (Apple's hide-my-email)
- Works on iOS only (not available on Android or Web — hide button on those platforms)

## Technical Details & Implementation Breakdown

### 1. Dependencies

```bash
npx expo install expo-apple-authentication
```

- Requires `ios.usesAppleSignIn: true` in `app.json` / Expo config plugin
- Requires "Sign In with Apple" capability in Xcode / Apple Developer Portal
- Supabase project must have Apple OAuth provider configured (App ID + key)

### 2. Apple Sign-In Button

- Use `AppleAuthentication.AppleAuthenticationButton` from `expo-apple-authentication`
- Only render on iOS (use `Platform.OS === 'ios'` guard):

  ```tsx
  import * as AppleAuthentication from 'expo-apple-authentication';
  import { Platform } from 'react-native';

  {
    Platform.OS === 'ios' && (
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={8}
        style={styles.appleButton}
        onPress={handleSignInWithApple}
      />
    );
  }
  ```

- Render on both Sign In screen (`features/auth/SignInScreen.tsx`) and Create Account screen (`features/auth/CreateAccountScreen.tsx`)

### 3. Apple Authentication Flow

```ts
const handleSignInWithApple = async () => {
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL
    ]
  });
  // credential.identityToken → send to Supabase
};
```

### 4. Supabase Integration

- Add new wrapper to `shared/supabase/auth.ts`:

  ```ts
  /**
   * Sign in or register with Apple ID.
   * Exchanges Apple's identity token with Supabase OAuth.
   */
  export const signInWithApple = async (
    identityToken: string
  ): Promise<AuthResult<AuthSession>>;
  ```

- Implementation:

  ```ts
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: identityToken
  });
  ```

### 5. Secure Token Storage

- On success, store session via the existing SecureStore adapter (already used by email sign-in)
- The Supabase client handles session persistence automatically via the SecureStore adapter set up in `shared/supabase/client.ts`

### 6. Private Relay Email

- Apple may return a private relay email (e.g. `abc123@privaterelay.appleid.com`)
- Store this email as-is; do not attempt to validate format against typical email patterns
- First name and last name only available on the **first** authorization — cache them using `SecureStore` if needed for display purposes

### 7. Error Handling

- User cancels the Apple sheet: `AppleAuthentication.AppleAuthenticationError.CANCELED` — handle silently (no error shown)
- Apple sign-in not available (device unsupported): `AppleAuthentication.isAvailableAsync()` check — hide button
- Supabase token exchange fails: Show error message, allow retry

  ```ts
  import { AppleAuthenticationError } from 'expo-apple-authentication';
  // ...
  } catch (err: unknown) {
    if ((err as { code?: string }).code === 'ERR_REQUEST_CANCELED') return; // User dismissed
    // Show error message
  }
  ```

### 8. Availability Check

- Check `AppleAuthentication.isAvailableAsync()` on component mount; hide button if unavailable:

  ```tsx
  const [appleAvailable, setAppleAvailable] = useState(false);
  useEffect(() => {
    AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
  }, []);
  ```

### 9. Xcode & App Store Configuration

- Enable "Sign In with Apple" entitlement in `ios/myLoyaltyCards/myLoyaltyCards.entitlements`
- Add `expo-apple-authentication` to the Expo config plugin array in `app.json`
- Configure Apple OAuth provider in Supabase dashboard (requires Apple Developer Program account)

### 10. Testing

- Unit test: `signInWithApple()` wrapper handles Supabase error response correctly
- Unit test: cancellation error handled silently
- Manual: Full sign-in flow on physical iOS device (Apple Sign In requires real device)
- Manual: Verify private relay email stored correctly
- Manual: Second sign-in with same Apple ID links to existing account (not duplicate)

## Manual Configuration Required (Ifero)

> 🔑 These steps require your Apple Developer account and Supabase dashboard access. Complete these **before dev picks up this story**. Devs cannot test without this configuration in place.

### Step 1 — Apple Developer Portal

1. Go to [developer.apple.com](https://developer.apple.com) → Certificates, Identifiers & Profiles

2. **Enable Sign In with Apple on the App ID:**
   - Identifiers → App IDs → `com.iferoporefi.myloyaltycards`
   - Under Capabilities, enable **Sign In with Apple**
   - Save

3. **Create a Services ID** (this is the OAuth client identifier Supabase will use):
   - Identifiers → `+` → Services IDs
   - Description: `myLoyaltyCards Sign In with Apple`
   - Identifier: `com.iferoporefi.myloyaltycards.auth` ← note this down
   - Enable **Sign In with Apple**, click Configure
   - Primary App ID: select `com.iferoporefi.myloyaltycards`
   - Domains and Subdomains: `<your-supabase-project-ref>.supabase.co`
   - Return URLs: `https://<your-supabase-project-ref>.supabase.co/auth/v1/callback`
   - Save and Register

   > 📋 Find the Supabase callback URL: Supabase Dashboard → Authentication → Providers → Apple → it shows the exact Redirect URL to paste here.

4. **Create a Sign In with Apple Key:**
   - Keys → `+`
   - Key Name: `myLoyaltyCards Apple Auth`
   - Enable **Sign In with Apple**, click Configure → select your Primary App ID
   - Register and **download the `.p8` file immediately** (it can only be downloaded once)
   - Note down:
     - **Key ID** (10-character string shown on the key detail page)
     - **Team ID** (top-right of developer.apple.com, e.g. `ABC123DEF4`)

### Step 2 — Supabase Dashboard

1. Go to Supabase Dashboard → your project → **Authentication** → **Providers** → **Apple**
2. Toggle **Enable Apple provider** ON
3. Fill in:
   - **Service ID (client_id):** `com.iferoporefi.myloyaltycards.auth` (Services ID from Step 1.3)
   - **Team ID:** your Apple Team ID (from Step 1.4)
   - **Key ID:** from Step 1.4
   - **Private Key:** paste the full contents of the `.p8` file downloaded in Step 1.4
4. Save

### Step 3 — Verify Callback URL

- Confirm the **Redirect URL** shown in Supabase matches exactly what you entered in the Services ID configuration in Step 1.3
- Format: `https://<your-supabase-project-ref>.supabase.co/auth/v1/callback`

### Summary Checklist for Ifero

- [ ] Sign In with Apple enabled on App ID `com.iferoporefi.myloyaltycards`
- [ ] Services ID `com.iferoporefi.myloyaltycards.auth` created and configured with Supabase callback URL
- [ ] `.p8` key file downloaded and stored securely
- [ ] Key ID and Team ID noted
- [ ] Supabase Dashboard → Apple provider enabled with all 4 fields filled
- [ ] Callback URL verified to match between Apple portal and Supabase

---

## Edge Cases & Risks

- Apple ID revoked post sign-in: Token refresh will fail → force sign-out gracefully
- Email already registered via email/password: Supabase links accounts by email automatically (verify Supabase project linking settings)
- **Simulator:** Apple Sign In does not work on simulator — physical iOS device is **mandatory from Day 1**, not just for final testing

## Acceptance Checklist

- [ ] `expo-apple-authentication` installed via `npx expo install`
- [ ] `ios.usesAppleSignIn: true` in `app.json`
- [ ] "Sign In with Apple" capability enabled in Xcode
- [ ] Apple button rendered on iOS only (platform guard)
- [ ] Button on both Sign In and Create Account screens
- [ ] `signInWithApple()` wrapper added to `shared/supabase/auth.ts`
- [ ] Supabase Apple OAuth provider configured
- [ ] Session stored via SecureStore adapter
- [ ] Cancellation handled silently
- [ ] Availability check hides button when unavailable
- [ ] Private relay email handled correctly
- [ ] Unit tests passing
- [ ] Physical iOS device provisioned and available **before story pickup** (not at testing phase)
- [ ] Manual testing on physical iOS device

---

**Linked Epic:** Epic 6
**Sprint:** Sprint 8 — 2026-03-12
