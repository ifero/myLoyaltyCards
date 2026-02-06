/**
 * useAddCard Hook Tests - Brand Context (Story 3.3)
 *
 * Tests for brand-aware card creation.
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import * as Burnt from 'burnt';
import * as Haptics from 'expo-haptics';
import { v4 as uuidv4 } from 'uuid';

import { insertCard } from '@/core/database';
import { BarcodeFormat, CardColor } from '@/core/schemas';

import { useAddCard, AddCardInput } from './useAddCard';

// Mock dependencies
jest.mock('uuid');
jest.mock('expo-haptics');
jest.mock('burnt');
jest.mock('expo-router', () => ({
  router: {
    back: jest.fn()
  }
}));
jest.mock('@/core/database', () => ({
  insertCard: jest.fn()
}));

describe('useAddCard - Brand Context (Story 3.3)', () => {
  const mockUuid = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    jest.clearAllMocks();
    (uuidv4 as jest.Mock).mockReturnValue(mockUuid);
    (Haptics.notificationAsync as jest.Mock).mockResolvedValue(undefined);
    (Burnt.toast as jest.Mock).mockReturnValue(undefined);
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    (console.error as jest.Mock).mockRestore();
  });

  describe('Brand-aware card creation', () => {
    it('should save card with brandId when provided', async () => {
      const { result } = renderHook(() => useAddCard());

      const input: AddCardInput = {
        name: 'Esselunga',
        barcode: '1234567890',
        barcodeFormat: 'EAN13' as BarcodeFormat,
        color: 'blue' as CardColor,
        brandId: 'esselunga'
      };

      await result.current.addCard(input);

      await waitFor(() => {
        expect(insertCard).toHaveBeenCalledWith(
          expect.objectContaining({
            brandId: 'esselunga',
            name: 'Esselunga',
            barcode: '1234567890'
          })
        );
      });
    });

    it('should save card with null brandId when not provided', async () => {
      const { result } = renderHook(() => useAddCard());

      const input: AddCardInput = {
        name: 'Custom Card',
        barcode: '1234567890',
        barcodeFormat: 'CODE128' as BarcodeFormat,
        color: 'red' as CardColor
      };

      await result.current.addCard(input);

      await waitFor(() => {
        expect(insertCard).toHaveBeenCalledWith(
          expect.objectContaining({
            brandId: null,
            name: 'Custom Card'
          })
        );
      });
    });

    it('should preserve brand color when provided', async () => {
      const { result } = renderHook(() => useAddCard());

      const input: AddCardInput = {
        name: 'Conad',
        barcode: '1234567890',
        barcodeFormat: 'EAN13' as BarcodeFormat,
        color: 'red' as CardColor,
        brandId: 'conad'
      };

      await result.current.addCard(input);

      await waitFor(() => {
        expect(insertCard).toHaveBeenCalledWith(
          expect.objectContaining({
            brandId: 'conad',
            color: 'red'
          })
        );
      });
    });
  });
});
