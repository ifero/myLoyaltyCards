/**
 * Privacy Constants
 * Story 6-11: Privacy & Consent
 *
 * Central source of truth for the privacy policy version.
 * Re-exports from assets/legal/privacy-policy.ts to avoid duplication.
 * When the policy text changes, bump the version there — the app
 * will re-prompt existing consented users on next launch.
 */

export { PRIVACY_POLICY_VERSION } from '@/assets/legal/privacy-policy';
