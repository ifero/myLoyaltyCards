/**
 * useCardSearch Hook Tests
 * Story 13.2: Restyle Home Screen — AC3
 */

import { renderHook, act } from '@testing-library/react-native';

import { LoyaltyCard } from '@/core/schemas';

import { useCardSearch } from './useCardSearch';

const makeCard = (overrides: Partial<LoyaltyCard> = {}): LoyaltyCard => ({
  id: '1',
  name: 'Esselunga',
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
  makeCard({ id: '1', name: 'Esselunga' }),
  makeCard({ id: '2', name: 'Conad' }),
  makeCard({ id: '3', name: 'IKEA' }),
  makeCard({ id: '4', name: 'MediaWorld' }),
  makeCard({ id: '5', name: 'Esso Station' })
];

describe('useCardSearch', () => {
  it('initializes with empty search query', () => {
    const { result } = renderHook(() => useCardSearch());
    expect(result.current.searchQuery).toBe('');
  });

  it('returns all cards when query is empty', () => {
    const { result } = renderHook(() => useCardSearch());
    expect(result.current.filterCards(cards)).toHaveLength(5);
  });

  it('filters cards by name (case-insensitive)', () => {
    const { result } = renderHook(() => useCardSearch());

    act(() => {
      result.current.setSearchQuery('ess');
    });

    const filtered = result.current.filterCards(cards);
    expect(filtered).toHaveLength(2); // Esselunga, Esso Station
    expect(filtered.map((c) => c.name)).toEqual(['Esselunga', 'Esso Station']);
  });

  it('returns empty array when no cards match', () => {
    const { result } = renderHook(() => useCardSearch());

    act(() => {
      result.current.setSearchQuery('zxywq');
    });

    expect(result.current.filterCards(cards)).toHaveLength(0);
  });

  it('trims whitespace from query', () => {
    const { result } = renderHook(() => useCardSearch());

    act(() => {
      result.current.setSearchQuery('  ikea  ');
    });

    const filtered = result.current.filterCards(cards);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]!.name).toBe('IKEA');
  });

  it('clearSearch resets query to empty string', () => {
    const { result } = renderHook(() => useCardSearch());

    act(() => {
      result.current.setSearchQuery('test');
    });
    expect(result.current.searchQuery).toBe('test');

    act(() => {
      result.current.clearSearch();
    });
    expect(result.current.searchQuery).toBe('');
  });

  it('returns all cards when query is only whitespace', () => {
    const { result } = renderHook(() => useCardSearch());

    act(() => {
      result.current.setSearchQuery('   ');
    });

    expect(result.current.filterCards(cards)).toHaveLength(5);
  });

  it('handles empty cards array', () => {
    const { result } = renderHook(() => useCardSearch());

    act(() => {
      result.current.setSearchQuery('test');
    });

    expect(result.current.filterCards([])).toHaveLength(0);
  });
});
