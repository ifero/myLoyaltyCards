/**
 * useEditCard Hook Tests
 * - Verifies update flow and watch sync invocation
 */

import { renderHook, act } from '@testing-library/react-native';
import * as Burnt from 'burnt';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

import * as cardRepository from '@/core/database';
import * as watchSync from '@/core/utils/watch-sync';

import { useEditCard, EditCardInput } from './useEditCard';

jest.mock('@/core/database', () => ({
  getCardById: jest.fn(),
  updateCard: jest.fn()
}));

jest.mock('@/core/utils/watch-sync', () => ({
  syncCardUpsert: jest.fn()
}));

const mockExistingCard = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'Old Name',
  barcode: '000',
  barcodeFormat: 'CODE128',
  brandId: null,
  color: 'blue',
  isFavorite: false,
  lastUsedAt: null,
  usageCount: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

describe('useEditCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (cardRepository.getCardById as jest.Mock).mockResolvedValue(mockExistingCard);
    (cardRepository.updateCard as jest.Mock).mockResolvedValue(undefined);
  });

  it('updates card and notifies watch', async () => {
    const { result } = renderHook(() => useEditCard());

    const input: EditCardInput = {
      name: 'New Name',
      barcode: '999',
      barcodeFormat: 'CODE128',
      color: 'red'
    };

    await act(async () => {
      await result.current.editCard(mockExistingCard.id, input);
    });

    // updateCard called with merged object
    expect(cardRepository.updateCard).toHaveBeenCalledTimes(1);
    const updated = (cardRepository.updateCard as jest.Mock).mock.calls[0][0];
    expect(updated.name).toBe('New Name');
    expect(updated.barcode).toBe('999');
    expect(updated.color).toBe('red');

    // watch sync should be invoked with updated card
    expect(watchSync.syncCardUpsert).toHaveBeenCalledWith(updated);

    // success feedback
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(
      Haptics.NotificationFeedbackType.Success
    );
    expect(Burnt.toast).toHaveBeenCalled();
    expect(router.back).toHaveBeenCalled();
  });
});
