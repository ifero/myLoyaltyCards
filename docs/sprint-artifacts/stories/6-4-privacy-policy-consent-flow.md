# Story 6.4: Privacy Policy & Consent Flow

**Epic:** 6 - User Authentication & Privacy
**Type:** User-Facing
**Status:** in-progress

## Goal

Ensure users can view the privacy policy and must provide explicit consent before account creation, in compliance with GDPR.

## Acceptance Criteria

- AC1: Privacy policy is accessible in onboarding and settings
- AC2: Consent checkbox is required before account creation
- AC3: Consent is stored and can be audited
- AC4: GDPR compliance is documented
- AC5: Policy content is available offline

## Technical Details

- Store consent status locally via expo-sqlite/kv-store for guest/offline; in Supabase users table (consent_status, consented_at) for authenticated users
- Policy content bundled as TS module for deterministic offline access
- Link to policy in onboarding (WelcomeScreen), registration (future Story 6-6), and settings
- Consent checkbox (shared component) required before account creation (cannot proceed without)
- Audit trail: log consent events in privacy_log table via Supabase
- UI: clear, accessible, and responsive on all platforms
- GDPR compliance: consent can be revoked, user can request data deletion

## Dev Notes

### Architecture

- `core/privacy/` — consent business logic (no React imports)
- `shared/components/` — ConsentCheckbox UI (cross-feature, used by future Story 6-6)
- `features/privacy/` — PrivacyPolicyScreen (renders bundled policy)
- `assets/legal/` — bundled privacy policy content as TS module
- Route: `app/privacy-policy.tsx` — thin re-export

### Dependencies (in-place)

- `shared/supabase/schemas.ts` — CloudUser has consent_status/consented_at, CloudPrivacyLog has event_type enum
- `shared/supabase/auth.ts` — auth API (signUp does not enforce consent yet — that's Story 6-6)
- `core/settings/settings-repository.ts` — KV store pattern to follow
- `features/settings/SettingsScreen.tsx` — add Privacy Policy link
- `features/onboarding/WelcomeScreen.tsx` — add Privacy Policy link

### Layer Boundaries

- `app/` → `features/` → `shared/` → `core/` (ESLint enforced)
- ConsentCheckbox in `shared/` because `features/auth/` (Story 6-6) needs it

## Tasks / Subtasks

- [ ] **Task 1: Create privacy policy content (bundled offline)**
  - [ ] 1.1 Create `assets/legal/privacy-policy.ts` — TS module exporting markdown string (AC5)
  - [ ] 1.2 Content covers: data collected, purpose, retention, user rights (GDPR), contact info (AC4)

- [ ] **Task 2: Create consent repository (`core/privacy/consent-repository.ts`)**
  - [ ] 2.1 Add consent keys to KV store: `privacy_consent_status`, `privacy_consent_timestamp`
  - [ ] 2.2 Implement `getConsentStatus(): boolean` — returns false if never set
  - [ ] 2.3 Implement `setConsentGiven(): void` — stores true + ISO 8601 timestamp
  - [ ] 2.4 Implement `revokeConsent(): void` — stores false, clears timestamp
  - [ ] 2.5 Implement `getConsentTimestamp(): string | null`
  - [ ] 2.6 Write unit tests for all functions (co-located)

- [ ] **Task 3: Create PrivacyPolicyScreen (`features/privacy/PrivacyPolicyScreen.tsx`)**
  - [ ] 3.1 Create screen component that renders bundled policy text
  - [ ] 3.2 Scrollable, styled with theme, accessible (AC1, AC5)
  - [ ] 3.3 Create `features/privacy/index.ts` feature export
  - [ ] 3.4 Create route `app/privacy-policy.tsx` (thin re-export)
  - [ ] 3.5 Write unit tests for screen rendering

- [ ] **Task 4: Create ConsentCheckbox (`shared/components/ConsentCheckbox.tsx`)**
  - [ ] 4.1 Reusable checkbox + "I agree to the Privacy Policy" label with link (AC2)
  - [ ] 4.2 `checked` / `onToggle` controlled props
  - [ ] 4.3 Privacy Policy link navigates to `/privacy-policy`
  - [ ] 4.4 Accessible: proper roles, labels, hint text
  - [ ] 4.5 Write unit tests for rendering and interaction

- [ ] **Task 5: Add Privacy Policy link to SettingsScreen**
  - [ ] 5.1 Add "Privacy Policy" row to SettingsScreen (AC1)
  - [ ] 5.2 Navigates to `/privacy-policy` on press
  - [ ] 5.3 Write/update unit tests

- [ ] **Task 6: Add Privacy Policy link to WelcomeScreen**
  - [ ] 6.1 Add "Privacy Policy" link to WelcomeScreen (AC1)
  - [ ] 6.2 Navigates to `/privacy-policy` on press
  - [ ] 6.3 Write/update unit tests

- [ ] **Task 7: Create consent logging service (`core/privacy/consent-logger.ts`)**
  - [ ] 7.1 `logConsentEvent(userId, eventType)` — inserts into privacy_log via Supabase
  - [ ] 7.2 Handles `consent_given` and `consent_withdrawn` event types
  - [ ] 7.3 Graceful fallback when offline or guest (no-op, no crash)
  - [ ] 7.4 Write unit tests

- [ ] **Task 8: Run full test suite, validate all ACs**
  - [ ] 8.1 Run full test suite — no regressions
  - [ ] 8.2 Validate each AC is satisfied
  - [ ] 8.3 Update File List and Change Log

## Acceptance Checklist

- [ ] Privacy policy accessible in onboarding and settings (AC1)
- [ ] Consent checkbox component ready for account creation (AC2)
- [ ] Consent status stored locally via KV store (AC3)
- [ ] Consent logged in privacy_log table via Supabase (AC3)
- [ ] Policy content available offline — bundled TS module (AC5)
- [ ] UI accessible and responsive (AC1, AC2)
- [ ] GDPR compliance: consent can be revoked (AC4)

---

**Linked Epic:** Epic 6
**Sprint:** Sprint 2026-02-27

---

## Dev Agent Record

### Debug Log

| Task | Notes |
| ---- | ----- |

### Completion Notes

_(To be filled on completion)_

### File List

_Files added / modified during implementation:_

### Change Log

| Date | Change |
| ---- | ------ |
