/**
 * Consent Repository — Unit Tests
 * Story 6-4: Privacy Policy & Consent Flow
 */

jest.mock('expo-sqlite/kv-store', () => ({
  __esModule: true,
  default: {
    getItemSync: jest.fn(),
    setItemSync: jest.fn(),
    removeItemSync: jest.fn()
  }
}));

import Storage from 'expo-sqlite/kv-store';

import {
  getConsentStatus,
  setConsentGiven,
  revokeConsent,
  getConsentTimestamp,
  resetConsent
} from './consent-repository';

describe('consent-repository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── getConsentStatus ──────────────────────────────────────────────

  describe('getConsentStatus', () => {
    it('returns false when never set (null)', () => {
      (Storage.getItemSync as jest.Mock).mockReturnValueOnce(null);
      expect(getConsentStatus()).toBe(false);
    });

    it('returns false when explicitly "false"', () => {
      (Storage.getItemSync as jest.Mock).mockReturnValueOnce('false');
      expect(getConsentStatus()).toBe(false);
    });

    it('returns true when "true"', () => {
      (Storage.getItemSync as jest.Mock).mockReturnValueOnce('true');
      expect(getConsentStatus()).toBe(true);
    });
  });

  // ── setConsentGiven ───────────────────────────────────────────────

  describe('setConsentGiven', () => {
    it('stores consent status as "true"', () => {
      setConsentGiven();
      expect(Storage.setItemSync).toHaveBeenCalledWith('privacy_consent_status', 'true');
    });

    it('stores an ISO 8601 timestamp', () => {
      const before = new Date().toISOString();
      setConsentGiven();
      const after = new Date().toISOString();

      const call = (Storage.setItemSync as jest.Mock).mock.calls.find(
        (c: string[]) => c[0] === 'privacy_consent_timestamp'
      );
      expect(call).toBeDefined();

      const stored = call![1] as string;
      expect(stored >= before).toBe(true);
      expect(stored <= after).toBe(true);
    });
  });

  // ── revokeConsent ─────────────────────────────────────────────────

  describe('revokeConsent', () => {
    it('stores consent status as "false"', () => {
      revokeConsent();
      expect(Storage.setItemSync).toHaveBeenCalledWith('privacy_consent_status', 'false');
    });

    it('removes the consent timestamp', () => {
      revokeConsent();
      expect(Storage.removeItemSync).toHaveBeenCalledWith('privacy_consent_timestamp');
    });
  });

  // ── getConsentTimestamp ───────────────────────────────────────────

  describe('getConsentTimestamp', () => {
    it('returns null when never set', () => {
      (Storage.getItemSync as jest.Mock).mockReturnValueOnce(null);
      expect(getConsentTimestamp()).toBeNull();
    });

    it('returns the stored ISO 8601 string', () => {
      const ts = '2026-03-06T10:00:00.000Z';
      (Storage.getItemSync as jest.Mock).mockReturnValueOnce(ts);
      expect(getConsentTimestamp()).toBe(ts);
    });
  });

  // ── resetConsent ──────────────────────────────────────────────────

  describe('resetConsent', () => {
    it('removes both consent keys', () => {
      resetConsent();
      expect(Storage.removeItemSync).toHaveBeenCalledWith('privacy_consent_status');
      expect(Storage.removeItemSync).toHaveBeenCalledWith('privacy_consent_timestamp');
    });
  });
});
