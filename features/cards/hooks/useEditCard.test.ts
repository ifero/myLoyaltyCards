import { renderHook, act } from '@testing-library/react-native';
import * as Burnt from 'burnt';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

jest.mock('burnt');
jest.mock('expo-haptics');
jest.mock('expo-router', () => ({
  router: { back: jest.fn() }
}));

// Mock database functions
const mockExistingCard = {
  id: '1',
  name: 'Old',
  barcode: '000',
  barcodeFormat: 'EAN13',
  brandId: null,
  color: 'green',
  isFavorite: false,
  lastUsedAt: null,
  usageCount: 0,
  createdAt: '2020-01-01',
  updatedAt: '2020-01-01'
};

jest.mock('@/core/database', () => ({
  getCardById: jest.fn(() => Promise.resolve(mockExistingCard)),
  updateCard: jest.fn(() => Promise.resolve())
}));

import { getCardById, updateCard as updateCardInDb } from '@/core/database';

import { useEditCard } from './useEditCard';

describe('useEditCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Haptics.notificationAsync as jest.Mock).mockResolvedValue(undefined);
    (Burnt.toast as jest.Mock).mockReturnValue(undefined);
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    (console.error as jest.Mock).mockRestore();
  });

  it('updates card and shows success feedback', async () => {
    const { result } = renderHook(() => useEditCard());

    await act(async () => {
      await result.current.editCard('1', {
        name: 'New Name',
        barcode: '111',
        barcodeFormat: 'EAN13',
        color: 'blue'
      });
    });

    expect(getCardById).toHaveBeenCalledWith('1');
    expect(updateCardInDb).toHaveBeenCalled();
    expect(Haptics.notificationAsync).toHaveBeenCalled();
    expect(Burnt.toast).toHaveBeenCalled();
    expect(router.back).toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });

  it('handles missing card error path', async () => {
    (getCardById as jest.Mock).mockResolvedValueOnce(null);

    const { result } = renderHook(() => useEditCard());

    await act(async () => {
      await result.current.editCard('not-found', {
        name: 'X',
        barcode: '1',
        barcodeFormat: 'EAN13',
        color: 'green'
      });
    });

    expect(result.current.error).toBeDefined();
    expect(Burnt.toast).toHaveBeenCalled();
    expect(Haptics.notificationAsync).toHaveBeenCalled();
  });
});
