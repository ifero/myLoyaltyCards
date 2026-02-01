/**
 * useCards Hook Tests
 * Story 2.1: Display Card List - AC3, AC5
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';

import * as cardRepository from '@/core/database';
import { LoyaltyCard } from '@/core/schemas';

import { useCards } from './useCards';

// Mock card repository
jest.mock('@/core/database', () => ({
  getAllCards: jest.fn()
}));

describe('useCards', () => {
  const mockCards: LoyaltyCard[] = [
    {
      id: '1',
      name: 'Apple Store',
      barcode: '1234567890',
      barcodeFormat: 'CODE128',
      brandId: null,
      color: 'blue',
      isFavorite: false,
      lastUsedAt: null,
      usageCount: 0,
      createdAt: '2026-01-07T10:00:00Z',
      updatedAt: '2026-01-07T10:00:00Z'
    },
    {
      id: '2',
      name: 'Best Buy',
      barcode: '0987654321',
      barcodeFormat: 'EAN13',
      brandId: null,
      color: 'red',
      isFavorite: false,
      lastUsedAt: null,
      usageCount: 0,
      createdAt: '2026-01-08T10:00:00Z',
      updatedAt: '2026-01-08T10:00:00Z'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('returns initial state with loading true and empty cards', () => {
      (cardRepository.getAllCards as jest.Mock).mockResolvedValue([]);

      const { result } = renderHook(() => useCards());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.cards).toEqual([]);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.refetch).toBe('function');
    });
  });

  describe('Fetching Cards - AC3', () => {
    it('fetches cards successfully and orders alphabetically', async () => {
      (cardRepository.getAllCards as jest.Mock).mockResolvedValue(mockCards);

      const { result } = renderHook(() => useCards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(cardRepository.getAllCards).toHaveBeenCalledTimes(1);
      expect(result.current.cards).toHaveLength(2);
      expect(result.current.cards[0]!.name).toBe('Apple Store');
      expect(result.current.cards[1]!.name).toBe('Best Buy');
      expect(result.current.error).toBeNull();
    });

    it('handles empty card list', async () => {
      (cardRepository.getAllCards as jest.Mock).mockResolvedValue([]);

      const { result } = renderHook(() => useCards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.cards).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('sets loading to false after fetch completes', async () => {
      (cardRepository.getAllCards as jest.Mock).mockResolvedValue(mockCards);

      const { result } = renderHook(() => useCards());

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('Error Handling', () => {
    it('handles fetch errors gracefully', async () => {
      const errorMessage = 'Database error';
      (cardRepository.getAllCards as jest.Mock).mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useCards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.cards).toEqual([]);
    });

    it('handles non-Error rejections', async () => {
      (cardRepository.getAllCards as jest.Mock).mockRejectedValue('String error');

      const { result } = renderHook(() => useCards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to load cards');
      expect(result.current.cards).toEqual([]);
    });
  });

  describe('Refetch Functionality', () => {
    it('refetches cards when refetch is called', async () => {
      (cardRepository.getAllCards as jest.Mock).mockResolvedValue(mockCards);

      const { result } = renderHook(() => useCards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Clear previous calls
      jest.clearAllMocks();
      (cardRepository.getAllCards as jest.Mock).mockResolvedValue([mockCards[0]]);

      await act(async () => {
        await result.current.refetch();
      });

      expect(cardRepository.getAllCards).toHaveBeenCalledTimes(1);
      expect(result.current.cards).toEqual([mockCards[0]]);
    });

    it('sets loading state during refetch', async () => {
      (cardRepository.getAllCards as jest.Mock).mockResolvedValue(mockCards);

      const { result } = renderHook(() => useCards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Mock delayed response
      let resolvePromise: (value: LoyaltyCard[]) => void;
      const delayedPromise = new Promise<LoyaltyCard[]>((resolve) => {
        resolvePromise = resolve;
      });
      (cardRepository.getAllCards as jest.Mock).mockReturnValue(delayedPromise);

      act(() => {
        result.current.refetch();
      });

      // Should be loading during refetch
      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolvePromise!(mockCards);
        await delayedPromise;
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('clears error on successful refetch', async () => {
      // First call fails
      (cardRepository.getAllCards as jest.Mock).mockRejectedValue(new Error('Initial error'));

      const { result } = renderHook(() => useCards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Initial error');

      // Refetch succeeds
      (cardRepository.getAllCards as jest.Mock).mockResolvedValue(mockCards);

      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.cards).toEqual(mockCards);
    });
  });

  describe('Offline Access - AC5', () => {
    it('works with local database (no network required)', async () => {
      (cardRepository.getAllCards as jest.Mock).mockResolvedValue(mockCards);

      const { result } = renderHook(() => useCards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should work without network - uses local database
      expect(result.current.cards).toEqual(mockCards);
      expect(result.current.error).toBeNull();
    });
  });
});
