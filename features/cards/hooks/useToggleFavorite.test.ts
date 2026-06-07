/**
 * useToggleFavorite Hook Tests
 * Story 9.2: Mark Card as Favorite — AC1, AC6
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';

import * as cardRepository from '@/core/database';
import { LoyaltyCard } from '@/core/schemas';

import { useToggleFavorite } from './useToggleFavorite';

jest.mock('@/core/database', () => ({
  toggleFavorite: jest.fn()
}));

const baseCard: LoyaltyCard = {
  id: 'card-1',
  name: 'Test Store',
  barcode: '12345',
  barcodeFormat: 'EAN13',
  brandId: null,
  color: 'blue',
  isFavorite: false,
  lastUsedAt: null,
  usageCount: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
};

describe('useToggleFavorite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (cardRepository.toggleFavorite as jest.Mock).mockResolvedValue(undefined);
  });

  it('optimistically flips isFavorite false→true and persists the change (AC1)', async () => {
    const onUpdate = jest.fn();
    const { result } = renderHook(() => useToggleFavorite(baseCard, onUpdate));

    await act(async () => {
      result.current.toggle();
    });

    expect(onUpdate).toHaveBeenCalledWith({ ...baseCard, isFavorite: true });
    expect(cardRepository.toggleFavorite).toHaveBeenCalledWith('card-1');
  });

  it('optimistically flips isFavorite true→false for a pinned card (AC1)', async () => {
    const favCard: LoyaltyCard = { ...baseCard, isFavorite: true };
    const onUpdate = jest.fn();
    const { result } = renderHook(() => useToggleFavorite(favCard, onUpdate));

    await act(async () => {
      result.current.toggle();
    });

    expect(onUpdate).toHaveBeenCalledWith({ ...favCard, isFavorite: false });
  });

  it('rolls back the optimistic update when the write fails (AC6)', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    (cardRepository.toggleFavorite as jest.Mock).mockRejectedValue(new Error('db down'));
    const onUpdate = jest.fn();
    const { result } = renderHook(() => useToggleFavorite(baseCard, onUpdate));

    await act(async () => {
      result.current.toggle();
    });

    await waitFor(() => {
      // 1st call: optimistic flip to true; 2nd call: rollback to original false
      expect(onUpdate).toHaveBeenNthCalledWith(1, { ...baseCard, isFavorite: true });
      expect(onUpdate).toHaveBeenNthCalledWith(2, { ...baseCard, isFavorite: false });
    });
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('clears isPending after the write settles', async () => {
    const onUpdate = jest.fn();
    const { result } = renderHook(() => useToggleFavorite(baseCard, onUpdate));

    await act(async () => {
      result.current.toggle();
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));
  });

  it('ignores a second toggle while a write is still in flight (double-tap guard)', async () => {
    let resolveWrite: () => void = () => {};
    (cardRepository.toggleFavorite as jest.Mock).mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveWrite = resolve;
        })
    );
    const onUpdate = jest.fn();
    const { result } = renderHook(() => useToggleFavorite(baseCard, onUpdate));

    act(() => {
      result.current.toggle(); // starts the (still-pending) write
      result.current.toggle(); // ignored while the first is in flight
    });

    expect(cardRepository.toggleFavorite).toHaveBeenCalledTimes(1);
    expect(onUpdate).toHaveBeenCalledTimes(1);

    // Once the write settles the guard clears and toggling works again
    await act(async () => {
      resolveWrite();
    });
    await act(async () => {
      result.current.toggle();
    });
    expect(cardRepository.toggleFavorite).toHaveBeenCalledTimes(2);
  });

  it('is a no-op when the card is null (Rules-of-Hooks guard)', () => {
    const onUpdate = jest.fn();
    const { result } = renderHook(() => useToggleFavorite(null, onUpdate));

    act(() => {
      result.current.toggle();
    });

    expect(onUpdate).not.toHaveBeenCalled();
    expect(cardRepository.toggleFavorite).not.toHaveBeenCalled();
  });
});
