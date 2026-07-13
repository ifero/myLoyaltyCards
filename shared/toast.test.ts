/**
 * Toast utility tests
 * Story 16.13: Widen the Jest coverage gate to `shared/**`
 *
 * `showToast` wraps Burnt's toast with an availability guard and an error
 * guard. These tests cover all three branches: the happy path, a `Burnt.toast`
 * that rejects, and an unavailable `Burnt.toast`.
 */

import * as Burnt from 'burnt';

import { logger } from '@/core/utils/logger';

import { showToast, type ToastOptions } from './toast';

describe('showToast', () => {
  const mockToast = Burnt.toast as jest.Mock;
  const options: ToastOptions = { title: 'Card saved' };
  let warnSpy: jest.SpiedFunction<typeof logger.warn>;

  beforeEach(() => {
    warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('forwards the options to Burnt.toast on the happy path', async () => {
    await showToast(options);

    expect(mockToast).toHaveBeenCalledWith(options);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('catches and warns when Burnt.toast rejects', async () => {
    const error = new Error('native toast failure');
    mockToast.mockRejectedValueOnce(error);

    await showToast(options);

    expect(warnSpy).toHaveBeenCalledWith('[toast] Failed to show toast', error);
  });

  it('warns and returns early when Burnt.toast is unavailable', async () => {
    // Swap the toast export for a non-function to hit the availability guard.
    // toast.ts and this test share the same mocked-module object, so the guard
    // sees the swap; the finally restores it for any later test.
    const mutableBurnt = Burnt as { toast: unknown };
    const originalToast = mutableBurnt.toast;
    mutableBurnt.toast = undefined;

    try {
      await showToast(options);
    } finally {
      mutableBurnt.toast = originalToast;
    }

    expect(warnSpy).toHaveBeenCalledWith('[toast] Burnt toast is unavailable');
    expect(mockToast).not.toHaveBeenCalled();
  });
});
