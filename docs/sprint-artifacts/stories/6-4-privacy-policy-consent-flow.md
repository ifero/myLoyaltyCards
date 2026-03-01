# Story 6.4: Privacy Policy & Consent Flow

**Epic:** 6 - User Authentication & Privacy
**Type:** User-Facing
**Status:** ready-for-dev

## Goal

Ensure users can view the privacy policy and must provide explicit consent before account creation, in compliance with GDPR.

## Acceptance Criteria

- Privacy policy is accessible in onboarding and settings
- Consent checkbox is required before account creation
- Consent is stored and can be audited
- GDPR compliance is documented
- Policy content is available offline

## Technical Details

- Store consent status in Supabase (users table: consentStatus, timestamp)
- Policy content in markdown/HTML, bundled for offline access
- Link to policy in onboarding, registration, and settings
- Consent checkbox required before account creation (cannot proceed without)
- Audit trail: log consent in privacy_log table
- UI: clear, accessible, and responsive on all platforms
- GDPR compliance: consent can be revoked, user can request data deletion

## Acceptance Checklist

- [ ] Privacy policy accessible in onboarding and settings
- [ ] Consent checkbox required before account creation
- [ ] Consent status stored in Supabase
- [ ] Consent logged in privacy_log table
- [ ] Policy content available offline
- [ ] UI accessible and responsive
- [ ] GDPR compliance (revoke consent, data deletion)

---

**Linked Epic:** Epic 6
**Sprint:** Sprint 2026-02-27
