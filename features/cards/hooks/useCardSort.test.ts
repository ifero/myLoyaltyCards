/**
 * useCardSort Hook Tests
 * Story 13.2: Restyle Home Screen — AC6
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { renderHook, act, waitFor } from '@testing-library/react-native';

import { LoyaltyCard } from '@/core/schemas';

import { useCardSort } from './useCardSort';

const makeCard = (overrides: Partial<LoyaltyCard> = {}): LoyaltyCard => ({
  id: '1',
  name: 'Alpha',
  barcode: '123',
  barcodeFormat: 'CODE128',
  brandId: null,
  color: 'blue',
  isFavorite: false,
  lastUsedAt: null,
  usageCount: 0,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ...overrides
});

const cards: LoyaltyCard[] = [
  makeCard({
    id: '1',
    name: 'Charlie',
    usageCount: 5,
    lastUsedAt: '2026-03-01T10:00:00Z',
    createdAt: '2026-01-03T00:00:00Z'
  }),
  makeCard({
    id: '2',
    name: 'Alpha',
    usageCount: 2,
    lastUsedAt: '2026-03-10T10:00:00Z',
    createdAt: '2026-01-01T00:00:00Z'
  }),
  makeCard({
    id: '3',
    name: 'Bravo',
    usageCount: 5,
    lastUsedAt: '2026-03-05T10:00:00Z',
    createdAt: '2026-01-02T00:00:00Z'
  }),
  makeCard({
    id: '4',
    name: 'Delta',
    usageCount: 0,
    lastUsedAt: null,
    createdAt: '2026-01-04T00:00:00Z'
  })
];

describe('useCardSort', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('defaults to "frequent" sort option', () => {
      const { result } = renderHook(() => useCardSort());
      expect(result.current.sortOption).toBe('frequent');
      expect(result.current.sortLabel).toBe('Frequently used');
    });

    it('loads persisted preference from AsyncStorage', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('az');

      const { result } = renderHook(() => useCardSort());

      await waitFor(() => {
        expect(result.current.sortOption).toBe('az');
      });
    });

    it('ignores invalid persisted values', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('invalid');

      const { result } = renderHook(() => useCardSort());

      await waitFor(() => {
        expect(result.current.sortOption).toBe('frequent');
      });
    });
  });

  describe('setSortOption', () => {
    it('updates sort option and persists to AsyncStorage', async () => {
      const { result } = renderHook(() => useCardSort());

      act(() => {
        result.current.setSortOption('az');
      });

      expect(result.current.sortOption).toBe('az');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@myLoyaltyCards/sortPreference', 'az');
    });
  });

  describe('sortCards — frequent', () => {
    it('sorts by usageCount descending, then lastUsedAt descending', () => {
      const { result } = renderHook(() => useCardSort());
      const sorted = result.current.sortCards(cards);

      // Charlie (5, Mar 1) and Bravo (5, Mar 5) tie on count → Bravo wins (more recent lastUsedAt)
      // Alpha (2), Delta (0)
      expect(sorted.map((c) => c.name)).toEqual(['Bravo', 'Charlie', 'Alpha', 'Delta']);
    });

    it('falls back to createdAt when usageCount and lastUsedAt are equal', () => {
      const tiedCards = [
        makeCard({
          id: '1',
          name: 'X',
          usageCount: 0,
          lastUsedAt: null,
          createdAt: '2026-01-01T00:00:00Z'
        }),
        makeCard({
          id: '2',
          name: 'Y',
          usageCount: 0,
          lastUsedAt: null,
          createdAt: '2026-02-01T00:00:00Z'
        })
      ];

      const { result } = renderHook(() => useCardSort());
      const sorted = result.current.sortCards(tiedCards);

      // Y created more recently → first
      expect(sorted.map((c) => c.name)).toEqual(['Y', 'X']);
    });
  });

  describe('sortCards — recent', () => {
    it('sorts by createdAt descending', () => {
      const { result } = renderHook(() => useCardSort());

      act(() => {
        result.current.setSortOption('recent');
      });

      const sorted = result.current.sortCards(cards);
      expect(sorted.map((c) => c.name)).toEqual(['Delta', 'Charlie', 'Bravo', 'Alpha']);
    });
  });

  describe('sortCards — az', () => {
    it('sorts alphabetically (locale-aware, case-insensitive)', () => {
      const { result } = renderHook(() => useCardSort());

      act(() => {
        result.current.setSortOption('az');
      });

      const sorted = result.current.sortCards(cards);
      expect(sorted.map((c) => c.name)).toEqual(['Alpha', 'Bravo', 'Charlie', 'Delta']);
    });
  });

  describe('sortLabels', () => {
    it('provides all sort labels', () => {
      const { result } = renderHook(() => useCardSort());

      expect(result.current.sortLabels).toEqual({
        frequent: 'Frequently used',
        recent: 'Recently added',
        az: 'A-Z'
      });
    });

    it('sortLabel reflects current option', () => {
      const { result } = renderHook(() => useCardSort());

      expect(result.current.sortLabel).toBe('Frequently used');

      act(() => {
        result.current.setSortOption('az');
      });

      expect(result.current.sortLabel).toBe('A-Z');
    });
  });

  describe('does not mutate input', () => {
    it('returns a new array without mutating original', () => {
      const { result } = renderHook(() => useCardSort());
      const original = [...cards];
      result.current.sortCards(cards);
      expect(cards).toEqual(original);
    });
  });
});
