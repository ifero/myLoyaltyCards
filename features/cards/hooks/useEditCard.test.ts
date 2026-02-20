/**
 * useEditCard Hook Tests
 * Story 2.7: Edit Card
 *
 * Tests cover both successful update flow and error handling to ensure
 * coverage gates are met. Mocks database, navigation, haptics, and toast.
 */

import { renderHook, act } from '@testing-library/react-native';
import * as Burnt from 'burnt';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

import * as db from '@/core/database';
import { LoyaltyCard, BarcodeFormat, CardColor } from '@/core/schemas';

import { useEditCard, EditCardInput } from './useEditCard';

// mock implementations
jest.mock('@/core/database', () => ({
  getCardById: jest.fn(),
  updateCard: jest.fn()
}));

// create a valid card object with all required fields
const baseCard: LoyaltyCard = {
  id: 'card-1',
  name: 'Original',
  barcode: '123',
  barcodeFormat: 'CODE128',
  brandId: null,
  color: 'blue',
  isFavorite: false,
  lastUsedAt: null,
  usageCount: 0,
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z'
};

const editInput: EditCardInput = {
  name: ' Edited ',
  barcode: '456 ',
  barcodeFormat: BarcodeFormat.QRCode,
  color: CardColor.Red
};

describe('useEditCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (db.getCardById as jest.Mock).mockResolvedValue(baseCard);
    (db.updateCard as jest.Mock).mockResolvedValue(undefined);
  });

  it('returns initial state', () => {
    const { result } = renderHook(() => useEditCard());
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.editCard).toBe('function');
  });

  describe('successful edit', () => {
    it('calls getCardById and updateCard with merged data', async () => {
      const { result } = renderHook(() => useEditCard());
      await act(async () => {
        await result.current.editCard(baseCard.id, editInput);
      });
      expect(db.getCardById).toHaveBeenCalledWith(baseCard.id);
      const updated = (db.updateCard as jest.Mock).mock.calls[0][0];
      expect(updated.name).toBe('Edited');
      expect(updated.barcode).toBe('456');
      expect(updated.barcodeFormat).toBe('QR');
      expect(updated.color).toBe('red');
      expect(updated.createdAt).toBe(baseCard.createdAt);
      expect(updated.updatedAt).not.toBe(baseCard.updatedAt);
    });

    it('fires haptic and toast and navigates back', async () => {
      const { result } = renderHook(() => useEditCard());
      await act(async () => {
        await result.current.editCard(baseCard.id, editInput);
      });
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Success
      );
      expect(Burnt.toast).toHaveBeenCalledWith({
        title: 'Card saved',
        preset: 'done'
      });
      expect(router.back).toHaveBeenCalled();
    });
  });

  describe('failure scenarios', () => {
    it('sets error when card not found', async () => {
      (db.getCardById as jest.Mock).mockResolvedValue(null);
      const { result } = renderHook(() => useEditCard());
      await act(async () => {
        await result.current.editCard('nope', editInput);
      });
      expect(result.current.error).toMatch(/Card not found/);
    });

    it('handles updateCard errors', async () => {
      const err = new Error('DB fail');
      (db.updateCard as jest.Mock).mockRejectedValue(err);
      const { result } = renderHook(() => useEditCard());
      await act(async () => {
        await result.current.editCard(baseCard.id, editInput);
      });
      expect(result.current.error).toBe('DB fail');
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Error
      );
      expect(Burnt.toast).toHaveBeenCalledWith({
        title: 'Error',
        message: 'DB fail',
        preset: 'error'
      });
    });

    it('sets isLoading toggles correctly', async () => {
      let resolveDb: () => void;
      (db.updateCard as jest.Mock).mockImplementation(
        () =>
          new Promise((res) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
      resolveDb = res as any;
          })
      );
      const { result } = renderHook(() => useEditCard());
      let promise: Promise<void>;
      act(() => {
        promise = result.current.editCard(baseCard.id, editInput);
      });
      expect(result.current.isLoading).toBe(true);
      await act(async () => {
        resolveDb!();
        await promise;
      });
      expect(result.current.isLoading).toBe(false);
    });
  });
});
