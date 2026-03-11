# Story 6.11: Privacy & Consent

**Epic:** 6 - User Authentication & Privacy
**Type:** User-Facing
**Status:** in-progress

> 📋 **Scope guard (PM):** The "What We Collect" data summary in this story is a **read-only informational screen** only. Do NOT build data export, download, or portability features here — those belong to Epic 8. The "Download My Data" CTA must remain a clearly labelled placeholder that does nothing until Epic 8 is implemented.

## Goal

Ensure users can review the Privacy Policy before creating an account and can access a summary of collected data from Settings, satisfying GDPR transparency obligations.

## Acceptance Criteria

- Privacy Policy link visible on the Create Account screen before form submission
- User must acknowledge terms (checkbox or explicit button text) before registering
- Privacy Policy accessible from Settings screen at any time
- Settings shows a summary of what data is collected
- Privacy Policy is the same content as `app/privacy-policy.tsx` (already implemented)

## Technical Details & Implementation Breakdown

### 1. Pre-Registration Consent on Create Account Screen

- In `features/auth/CreateAccountScreen.tsx`, add below the form (before the submit button):

  ```tsx
  <View style={styles.consentRow}>
    <Checkbox value={consentGiven} onValueChange={setConsentGiven} />
    <Text>
      I agree to the{' '}
      <Link href="/privacy-policy">Privacy Policy</Link>
    </Text>
  </View>
  <Button
    title="Create Account"
    disabled={!consentGiven || !formValid}
    onPress={handleRegister}
  />
  ```

- `consentGiven` must be `true` before the submit button is enabled
- The "Privacy Policy" text link navigates to `app/privacy-policy.tsx` (already exists)
- On successful registration, persist `privacyConsentAccepted: true` with timestamp in SecureStore or SQLite settings table

  ```ts
  await SecureStore.setItemAsync(
    'privacyConsent',
    JSON.stringify({ accepted: true, timestamp: new Date().toISOString(), version: '1.0' })
  );
  ```

### 2. SSO Flows (Apple / Google)

- For Sign In with Apple and Sign In with Google, surface the same consent acknowledgement before initiating the OAuth flow if the user is registering for the first time
- Re-existing users (already consented) skip this step
- Check for stored `privacyConsent` record before showing the checkbox

### 3. Privacy Policy Link in Settings

- In `features/settings/SettingsScreen.tsx`, add a "Privacy Policy" row that navigates to `app/privacy-policy.tsx`
- Visible to both guest and authenticated users

  ```tsx
  <SettingsItem title="Privacy Policy" onPress={() => router.push('/privacy-policy')} />
  ```

### 4. Data Summary in Settings (Collected Data)

- Add a "Data & Privacy" section to Settings with a "What We Collect" item
- Navigates to a new `app/data-summary.tsx` screen (or modal) showing:

  | Category          | Data Collected                      |
  | ----------------- | ----------------------------------- |
  | Account           | Email address                       |
  | Cards             | Card names, barcodes, timestamps    |
  | App               | App version, locale (for catalogue) |
  | **Not collected** | Location, contacts, device ID       |

- Only shown to authenticated users (guest users have no cloud data)
- Include "Download My Data" CTA placeholder (links to Epic 8 export feature)

### 5. Consent Versioning

- Store consent version alongside acceptance. If Privacy Policy changes, re-prompt existing users.
- Version managed via a constant `PRIVACY_POLICY_VERSION = '1.0'` in `core/privacy/`

### 6. Testing

- Unit test: Register button disabled when `consentGiven === false`
- Unit test: Register button enabled when `consentGiven === true` and form is valid
- Unit test: Consent record saved to SecureStore after registration
- Integration: Privacy Policy link opens `privacy-policy.tsx`
- Manual: Verify consent flow on Create Account (email, Apple, Google)
- Manual: Verify Settings shows Privacy Policy link and data summary

## Edge Cases & Risks

- User navigates away from Create Account before consenting: Consent checkbox resets (no state persistence until registration succeeds)
- Privacy Policy update: Version check on app launch re-prompts existing users if version mismatch

## Acceptance Checklist

- [x] Consent checkbox on Create Account screen
- [x] "Privacy Policy" link navigates to `app/privacy-policy.tsx`
- [x] Register button disabled until consent given
- [x] Consent version + timestamp persisted to SecureStore on registration
- [ ] SSO flows check for existing consent before re-prompting _(SSO stories 6-12/6-13 deferred to post-MVP backlog; `needsReConsent()` utility ready for integration)_
- [x] "Privacy Policy" link in Settings (guest + authenticated)
- [x] "What We Collect" data summary screen for authenticated users
- [x] `PRIVACY_POLICY_VERSION` constant in `core/privacy/`
- [x] Unit tests passing
- [ ] Tested on iOS and Android _(manual testing)_

---

## Dev Agent Record

### Implementation Summary (2026-03-11)

**Tasks completed:**

1. **Consent Versioning** — Created `core/privacy/constants.ts` with `PRIVACY_POLICY_VERSION = '1.0.0'`. Updated `consent-repository.ts` to store/retrieve consent version. Added `getConsentVersion()` and `needsReConsent()` functions for version-aware consent checking.
2. **Register Button Disabled** — Updated `CreateAccountScreen.tsx` to disable the Register button when consent is not given (`disabled={loading || !consent}`), with matching visual opacity/color changes.
3. **Consent Persisted on Registration** — Added `setConsentGiven()` call in `CreateAccountScreen.handleRegister` after successful `signUp()`. This persists consent status, timestamp, and policy version to local storage.
4. **Data Summary Screen** — Created `features/privacy/DataSummaryScreen.tsx` and route `app/data-summary.tsx`. Shows collected/not-collected data table. Includes disabled "Download My Data" placeholder (Epic 8).
5. **Settings Data & Privacy Section** — Added "Data & Privacy" section to `SettingsScreen.tsx` with "What We Collect" navigation item.
6. **SSO Consent Check Foundation** — `needsReConsent()` utility is ready for SSO integration when stories 6-12/6-13 are implemented.

**Decisions:**

- Used `expo-sqlite/kv-store` (consistent with existing consent-repository) instead of SecureStore as the story suggested — maintains consistency with Story 6-4 patterns.
- Removed consent validation error from form validation since the button is now disabled when consent is not given — the disabled button is the consent gate.
- "Download My Data" CTA is clearly labelled as placeholder per PM scope guard.

### Tests Created/Updated

- `core/privacy/constants.test.ts` — NEW (2 tests)
- `core/privacy/consent-repository.test.ts` — UPDATED (+4 tests: version storage, getConsentVersion, needsReConsent)
- `features/privacy/__tests__/DataSummaryScreen.test.tsx` — NEW (11 tests)
- `features/auth/__tests__/CreateAccountScreen.test.tsx` — UPDATED (+4 tests: button disabled/enabled, consent persisted/not persisted on failure; 9 existing tests updated for disabled button behavior)
- `features/settings/__tests__/SettingsScreen.test.tsx` — NEW (10 tests)

### File List

- `core/privacy/constants.ts` — NEW
- `core/privacy/constants.test.ts` — NEW
- `core/privacy/consent-repository.ts` — MODIFIED (version storage, getConsentVersion, needsReConsent)
- `core/privacy/consent-repository.test.ts` — MODIFIED
- `features/auth/CreateAccountScreen.tsx` — MODIFIED (disabled button, consent persistence)
- `features/auth/__tests__/CreateAccountScreen.test.tsx` — MODIFIED
- `features/privacy/DataSummaryScreen.tsx` — NEW
- `features/privacy/__tests__/DataSummaryScreen.test.tsx` — NEW
- `features/settings/SettingsScreen.tsx` — MODIFIED (Data & Privacy section)
- `features/settings/__tests__/SettingsScreen.test.tsx` — NEW
- `app/data-summary.tsx` — NEW

**Linked Epic:** Epic 6
**Sprint:** Sprint 8 — 2026-03-12
