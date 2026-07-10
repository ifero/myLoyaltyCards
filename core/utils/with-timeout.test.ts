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

  it('honours a custom timeout message', async () => {
    const neverSettles = new Promise<string>(() => {});
    const result = withTimeout(neverSettles, 500, 'update check timed out');

    jest.advanceTimersByTime(500);

    await expect(result).rejects.toThrow('update check timed out');
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
