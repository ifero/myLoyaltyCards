/**
 * useTrackCardUsage Hook Tests
 * Story 9.1: Track Card Usage - AC1, AC2
 */

import { renderHook, waitFor } from '@testing-library/react-native';

import * as cardRepository from '@/core/database';
import { logger } from '@/core/utils/logger';

import { useTrackCardUsage } from './useTrackCardUsage';

jest.mock('@/core/database', () => ({
  incrementUsageCount: jest.fn()
}));

// Local focus-cycle mock (overrides the global jest.setup.js expo-router mock for
// this file only). Captures each registered focus callback and fires it once on
// mount — re-firing the captured callback models a genuine blur→focus event,
// rather than coupling the test to "useFocusEffect runs on every render".
// Variable is `mock`-prefixed so jest.mock's factory may reference it.
const mockFocusCallbacks: Array<() => void> = [];
jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void) => {
    mockFocusCallbacks.push(callback);
    callback(); // simulate focus on mount
  }
}));

describe('useTrackCardUsage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFocusCallbacks.length = 0;
    (cardRepository.incrementUsageCount as jest.Mock).mockResolvedValue(undefined);
  });

  it('calls incrementUsageCount with the card id on focus (AC1)', () => {
    renderHook(() => useTrackCardUsage('card-1'));

    expect(cardRepository.incrementUsageCount).toHaveBeenCalledTimes(1);
    expect(cardRepository.incrementUsageCount).toHaveBeenCalledWith('card-1');
  });

  it('increments again on a genuine re-focus event (AC2)', () => {
    renderHook(() => useTrackCardUsage('card-1'));
    expect(cardRepository.incrementUsageCount).toHaveBeenCalledTimes(1);

    // Simulate the screen losing and regaining focus (distinct usage event)
    mockFocusCallbacks.at(-1)!();
    expect(cardRepository.incrementUsageCount).toHaveBeenCalledTimes(2);
  });

  it('does not track when card id is empty (guard)', () => {
    renderHook(() => useTrackCardUsage(''));
    expect(cardRepository.incrementUsageCount).not.toHaveBeenCalled();
  });

  it('does not crash when the tracking write rejects (fire-and-forget)', async () => {
    const loggerError = jest.spyOn(logger, 'error').mockImplementation(() => {});
    (cardRepository.incrementUsageCount as jest.Mock).mockRejectedValue(new Error('db down'));

    expect(() => renderHook(() => useTrackCardUsage('card-1'))).not.toThrow();

    await waitFor(() => {
      expect(loggerError).toHaveBeenCalled();
    });

    loggerError.mockRestore();
  });
});
