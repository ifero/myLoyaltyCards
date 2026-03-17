/**
 * Consent Repository
 * Story 6-4: Privacy Policy & Consent Flow
 *
 * Manages local privacy consent state via expo-sqlite/kv-store.
 * This is the local-only source of truth for consent status.
 *
 * For authenticated users, consent is also persisted in the Supabase
 * `users` table (consent_status, consented_at) and logged in the
 * `privacy_log` table — see `core/privacy/consent-logger.ts`.
 */

import Storage from 'expo-sqlite/kv-store';

import { PRIVACY_POLICY_VERSION } from './constants';

// ---------------------------------------------------------------------------
// Keys
// ---------------------------------------------------------------------------

const KEYS = {
  CONSENT_STATUS: 'privacy_consent_status',
  CONSENT_TIMESTAMP: 'privacy_consent_timestamp',
  CONSENT_VERSION: 'privacy_consent_version'
} as const;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Whether the user has given privacy consent.
 * Returns `false` when never set (fresh install).
 */
export const getConsentStatus = (): boolean => {
  const value = Storage.getItemSync(KEYS.CONSENT_STATUS);
  return value === 'true';
};

/**
 * Record that the user has given consent.
 * Stores `true`, the current ISO 8601 timestamp, and the policy version.
 */
export const setConsentGiven = (): void => {
  Storage.setItemSync(KEYS.CONSENT_STATUS, 'true');
  Storage.setItemSync(KEYS.CONSENT_TIMESTAMP, new Date().toISOString());
  Storage.setItemSync(KEYS.CONSENT_VERSION, PRIVACY_POLICY_VERSION);
};

/**
 * Revoke previously given consent (GDPR right to withdraw).
 * Stores `false` and removes the timestamp and version.
 */
export const revokeConsent = (): void => {
  Storage.setItemSync(KEYS.CONSENT_STATUS, 'false');
  Storage.removeItemSync(KEYS.CONSENT_TIMESTAMP);
  Storage.removeItemSync(KEYS.CONSENT_VERSION);
};

/**
 * ISO 8601 timestamp of when consent was last given, or `null` if never.
 */
export const getConsentTimestamp = (): string | null => {
  return Storage.getItemSync(KEYS.CONSENT_TIMESTAMP);
};

/**
 * The policy version the user consented to, or `null` if never.
 */
export const getConsentVersion = (): string | null => {
  return Storage.getItemSync(KEYS.CONSENT_VERSION);
};

/**
 * Whether the user needs to re-consent because the policy version changed.
 * Returns `true` when the stored version differs from `PRIVACY_POLICY_VERSION`
 * or when no consent has been given yet.
 */
export const needsReConsent = (): boolean => {
  if (!getConsentStatus()) return true;
  const stored = getConsentVersion();
  return stored !== PRIVACY_POLICY_VERSION;
};

/**
 * Remove all consent data (useful for testing / dev reset).
 */
export const resetConsent = (): void => {
  Storage.removeItemSync(KEYS.CONSENT_STATUS);
  Storage.removeItemSync(KEYS.CONSENT_TIMESTAMP);
  Storage.removeItemSync(KEYS.CONSENT_VERSION);
};
