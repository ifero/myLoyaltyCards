/**
 * Consent Repository — Unit Tests
 * Story 6-4: Privacy Policy & Consent Flow
 * Story 6-11: Privacy & Consent (version tracking)
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
  getConsentVersion,
  needsReConsent,
  resetConsent
} from './consent-repository';
import { PRIVACY_POLICY_VERSION } from './constants';

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

    it('stores the current PRIVACY_POLICY_VERSION', () => {
      setConsentGiven();
      expect(Storage.setItemSync).toHaveBeenCalledWith(
        'privacy_consent_version',
        PRIVACY_POLICY_VERSION
      );
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

    it('removes the consent version', () => {
      revokeConsent();
      expect(Storage.removeItemSync).toHaveBeenCalledWith('privacy_consent_version');
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
    it('removes all consent keys', () => {
      resetConsent();
      expect(Storage.removeItemSync).toHaveBeenCalledWith('privacy_consent_status');
      expect(Storage.removeItemSync).toHaveBeenCalledWith('privacy_consent_timestamp');
      expect(Storage.removeItemSync).toHaveBeenCalledWith('privacy_consent_version');
    });
  });

  // ── getConsentVersion ─────────────────────────────────────────────

  describe('getConsentVersion', () => {
    it('returns null when never set', () => {
      (Storage.getItemSync as jest.Mock).mockReturnValueOnce(null);
      expect(getConsentVersion()).toBeNull();
    });

    it('returns the stored version string', () => {
      (Storage.getItemSync as jest.Mock).mockReturnValueOnce('1.0.0');
      expect(getConsentVersion()).toBe('1.0.0');
    });
  });

  // ── needsReConsent ────────────────────────────────────────────────

  describe('needsReConsent', () => {
    it('returns true when consent was never given', () => {
      (Storage.getItemSync as jest.Mock).mockReturnValue(null);
      expect(needsReConsent()).toBe(true);
    });

    it('returns true when consent status is false', () => {
      (Storage.getItemSync as jest.Mock).mockImplementation((key: string) => {
        if (key === 'privacy_consent_status') return 'false';
        return null;
      });
      expect(needsReConsent()).toBe(true);
    });

    it('returns true when stored version differs from current', () => {
      (Storage.getItemSync as jest.Mock).mockImplementation((key: string) => {
        if (key === 'privacy_consent_status') return 'true';
        if (key === 'privacy_consent_version') return '0.9.0';
        return null;
      });
      expect(needsReConsent()).toBe(true);
    });

    it('returns false when consent given and version matches', () => {
      (Storage.getItemSync as jest.Mock).mockImplementation((key: string) => {
        if (key === 'privacy_consent_status') return 'true';
        if (key === 'privacy_consent_version') return PRIVACY_POLICY_VERSION;
        return null;
      });
      expect(needsReConsent()).toBe(false);
    });
  });
});
