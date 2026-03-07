/**
 * Consent Logger — Unit Tests
 * Story 6-4: Privacy Policy & Consent Flow
 *
 * Tests the privacy_log event insertion via injected insert function.
 */

import { logConsentEvent } from './consent-logger';

describe('consent-logger', () => {
  let mockInsertFn: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockInsertFn = jest.fn().mockResolvedValue({ error: null });
  });

  // ── Happy path ─────────────────────────────────────────────────────

  it('calls insertFn with consent_given event', async () => {
    await logConsentEvent('user-123', 'consent_given', mockInsertFn);

    expect(mockInsertFn).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-123',
        event_type: 'consent_given'
      })
    );
  });

  it('calls insertFn with consent_withdrawn event', async () => {
    await logConsentEvent('user-456', 'consent_withdrawn', mockInsertFn);

    expect(mockInsertFn).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-456',
        event_type: 'consent_withdrawn'
      })
    );
  });

  it('includes event_time as ISO 8601 string', async () => {
    const before = new Date().toISOString();
    await logConsentEvent('user-123', 'consent_given', mockInsertFn);
    const after = new Date().toISOString();

    const insertArg = mockInsertFn.mock.calls[0]![0] as { event_time: string };
    expect(insertArg.event_time >= before).toBe(true);
    expect(insertArg.event_time <= after).toBe(true);
  });

  // ── Error handling ─────────────────────────────────────────────────

  it('does not throw when insertFn returns an error', async () => {
    mockInsertFn.mockResolvedValue({ error: { message: 'RLS violation' } });

    await expect(logConsentEvent('user-123', 'consent_given', mockInsertFn)).resolves.not.toThrow();
  });

  it('logs a warning when insertFn returns an error', async () => {
    const error = { message: 'RLS violation' };
    mockInsertFn.mockResolvedValue({ error });

    await logConsentEvent('user-123', 'consent_given', mockInsertFn);

    expect(console.warn).toHaveBeenCalledWith(
      '[consent-logger] Failed to log event:',
      'consent_given',
      error
    );
  });

  it('does not throw when insertFn rejects (network error)', async () => {
    mockInsertFn.mockRejectedValue(new Error('Network error'));

    await expect(logConsentEvent('user-123', 'consent_given', mockInsertFn)).resolves.not.toThrow();
  });

  it('logs a warning when insertFn rejects (network error)', async () => {
    const err = new Error('Network error');
    mockInsertFn.mockRejectedValue(err);

    await logConsentEvent('user-123', 'consent_given', mockInsertFn);

    expect(console.warn).toHaveBeenCalledWith(
      '[consent-logger] Network error logging event:',
      'consent_given',
      err
    );
  });

  // ── Guest / offline ────────────────────────────────────────────────

  it('is a no-op when userId is null (guest mode)', async () => {
    await logConsentEvent(null, 'consent_given', mockInsertFn);

    expect(mockInsertFn).not.toHaveBeenCalled();
  });

  it('is a no-op when userId is empty string', async () => {
    await logConsentEvent('', 'consent_given', mockInsertFn);

    expect(mockInsertFn).not.toHaveBeenCalled();
  });
});
