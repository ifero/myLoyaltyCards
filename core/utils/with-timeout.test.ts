/**
 * withTimeout Tests
 * Story 16.10: Fix offline cold-start hang
 */

import { withTimeout } from './with-timeout';

describe('withTimeout', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('resolves with the promise value when it settles before the timeout', async () => {
    await expect(withTimeout(Promise.resolve('done'), 1000)).resolves.toBe('done');
  });

  it('rejects with the original error when the promise rejects before the timeout', async () => {
    await expect(withTimeout(Promise.reject(new Error('boom')), 1000)).rejects.toThrow('boom');
  });

  it('rejects with a timeout error when the promise never settles in time', async () => {
    const neverSettles = new Promise<string>(() => {});
    const result = withTimeout(neverSettles, 1000);

    jest.advanceTimersByTime(1000);

    await expect(result).rejects.toThrow('Operation timed out after 1000ms');
  });

  it('echoes a custom timeout message VERBATIM (a contract the OTA classifier relies on)', async () => {
    const neverSettles = new Promise<string>(() => {});
    const result = withTimeout(neverSettles, 500, 'update check timed out');

    jest.advanceTimersByTime(500);

    // Asserted with an Error instance, which compares the message for EXACT
    // equality. `toThrow('...')` alone would NOT do: that matcher only checks
    // substring containment, so it would stay green if this util ever wrapped or
    // prefixed the message. `app/_layout.tsx` classifies an OTA failure by
    // testing `error.message === <the literal it passed here>` (Story 16.14,
    // AD-16-14-02) — if the echo stopped being verbatim, every real timeout
    // would be mis-tagged as a generic error. Verbatim echo is therefore a
    // contract other code depends on, not an incidental formatting detail.
    await expect(result).rejects.toThrow(new Error('update check timed out'));
  });

  it('keeps the timeout result when the promise rejects later (first settlement wins, no unhandled rejection)', async () => {
    let rejectLate!: (error: Error) => void;
    const late = new Promise<string>((_, reject) => {
      rejectLate = reject;
    });
    const result = withTimeout(late, 1000);

    jest.advanceTimersByTime(1000);
    await expect(result).rejects.toThrow('Operation timed out after 1000ms');

    // The late rejection is consumed by withTimeout's own handler.
    expect(() => rejectLate(new Error('late failure'))).not.toThrow();
    await Promise.resolve();
  });
});
