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

  describe('sortCards — favourites tier (Story 9.3)', () => {
    it('sorts favourites above non-favourites regardless of usageCount (AC1, AC2)', () => {
      const favCards = [
        makeCard({ id: '1', name: 'Alpha', isFavorite: false, usageCount: 100 }),
        makeCard({ id: '2', name: 'Beta', isFavorite: true, usageCount: 0 })
      ];

      const { result } = renderHook(() => useCardSort());
      const sorted = result.current.sortCards(favCards);

      // Beta is favourite → wins despite zero usage vs Alpha's 100
      expect(sorted.map((c) => c.id)).toEqual(['2', '1']);
    });

    it('orders the favourites block (by usageCount) ahead of the non-favourites block in a mixed list (AC1, AC2)', () => {
      const mixed = [
        makeCard({ id: 'nf-hi', isFavorite: false, usageCount: 100 }),
        makeCard({ id: 'fav-lo', isFavorite: true, usageCount: 1 }),
        makeCard({ id: 'nf-lo', isFavorite: false, usageCount: 5 }),
        makeCard({ id: 'fav-hi', isFavorite: true, usageCount: 9 })
      ];

      const { result } = renderHook(() => useCardSort());
      const sorted = result.current.sortCards(mixed);

      // Favourites first, ordered by usageCount (9 > 1), then non-favourites by usageCount
      // (100 > 5). The favourite with usageCount 1 still outranks the non-favourite with 100.
      expect(sorted.map((c) => c.id)).toEqual(['fav-hi', 'fav-lo', 'nf-hi', 'nf-lo']);
    });

    it('keeps the favourite "usual store" card in the top 3 of a 10-card list (AC3)', () => {
      const tenCards = [
        // User-designated favourite with only moderate usage — must still surface near the top.
        makeCard({ id: 'primary', isFavorite: true, usageCount: 12 }),
        makeCard({ id: 'c2', usageCount: 30 }),
        makeCard({ id: 'c3', usageCount: 25 }),
        makeCard({ id: 'c4', usageCount: 20 }),
        makeCard({ id: 'c5', usageCount: 15 }),
        makeCard({ id: 'c6', usageCount: 10 }),
        makeCard({ id: 'c7', usageCount: 8 }),
        makeCard({ id: 'c8', usageCount: 5 }),
        makeCard({ id: 'c9', usageCount: 2 }),
        makeCard({ id: 'c10', usageCount: 0 })
      ];

      const { result } = renderHook(() => useCardSort());
      const top3 = result.current
        .sortCards(tenCards)
        .slice(0, 3)
        .map((c) => c.id);

      // AC3: the relevant card (the favourite "usual store" card) lands in the top 3 — the
      // favourite leads via Tier 0, then the two highest-usage non-favourites follow.
      expect(top3).toEqual(['primary', 'c2', 'c3']);
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

    it('ignores isFavorite — favourite-first rule does not apply (AC4)', () => {
      const recentCards = [
        makeCard({
          id: '1',
          name: 'Old',
          isFavorite: true,
          createdAt: '2026-01-01T00:00:00Z'
        }),
        makeCard({
          id: '2',
          name: 'New',
          isFavorite: false,
          createdAt: '2026-02-01T00:00:00Z'
        })
      ];

      const { result } = renderHook(() => useCardSort());

      act(() => {
        result.current.setSortOption('recent');
      });

      const sorted = result.current.sortCards(recentCards);
      // New created later → first, despite Old being favourite
      expect(sorted.map((c) => c.name)).toEqual(['New', 'Old']);
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

    it('pins favourites to the top, then sorts alphabetically within each group (AC4)', () => {
      const azCards = [
        makeCard({ id: '1', name: 'Apple', isFavorite: false }),
        makeCard({ id: '2', name: 'Zebra', isFavorite: true }),
        makeCard({ id: '3', name: 'Mango', isFavorite: true }),
        makeCard({ id: '4', name: 'Banana', isFavorite: false })
      ];

      const { result } = renderHook(() => useCardSort());

      act(() => {
        result.current.setSortOption('az');
      });

      const sorted = result.current.sortCards(azCards);
      // Favourites first, alphabetical (Mango, Zebra); then non-favourites, alphabetical (Apple, Banana)
      expect(sorted.map((c) => c.name)).toEqual(['Mango', 'Zebra', 'Apple', 'Banana']);
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
