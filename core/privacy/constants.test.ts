/**
 * Privacy Constants — Unit Tests
 * Story 6-11: Privacy & Consent
 */

import { PRIVACY_POLICY_VERSION } from './constants';

describe('privacy constants', () => {
  it('exports PRIVACY_POLICY_VERSION as a non-empty string', () => {
    expect(typeof PRIVACY_POLICY_VERSION).toBe('string');
    expect(PRIVACY_POLICY_VERSION.length).toBeGreaterThan(0);
  });

  it('PRIVACY_POLICY_VERSION follows semantic versioning format', () => {
    expect(PRIVACY_POLICY_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
