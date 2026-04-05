/**
 * useBrandSearch Hook Tests
 * Story 13.4: Restyle Add Card Flow (AC2)
 */

import { renderHook, act } from '@testing-library/react-native';

import { useBrandSearch } from './useBrandSearch';

// Mock CatalogueRepository
const mockBrands = [
  {
    id: 'esselunga',
    name: 'Esselunga',
    color: '#FF0000',
    logo: 'esselunga',
    aliases: ['fidaty'],
    defaultFormat: 'EAN13'
  },
  {
    id: 'conad',
    name: 'Conad',
    color: '#00AA00',
    logo: 'conad',
    aliases: ['conad card'],
    defaultFormat: 'EAN13'
  },
  {
    id: 'coop',
    name: 'Coop',
    color: '#E2231A',
    logo: 'coop',
    aliases: [],
    defaultFormat: 'CODE128'
  },
  {
    id: 'carrefour',
    name: 'Carrefour',
    color: '#0032A0',
    logo: 'carrefour',
    aliases: ['pass'],
    defaultFormat: 'EAN13'
  },
  {
    id: 'lidl',
    name: 'Lidl',
    color: '#FFC300',
    logo: 'lidl',
    aliases: ['plus'],
    defaultFormat: 'EAN13'
  },
  {
    id: 'auchan',
    name: 'Auchan',
    color: '#D4001B',
    logo: 'auchan',
    aliases: [],
    defaultFormat: 'EAN13'
  },
  {
    id: 'bennet',
    name: 'Bennet',
    color: '#E3001B',
    logo: 'bennet',
    aliases: [],
    defaultFormat: 'EAN13'
  }
];

jest.mock('@/core/catalogue/catalogue-repository', () => ({
  CatalogueRepository: {
    getInstance: () => ({
      getBrands: () => mockBrands
    })
  }
}));

describe('useBrandSearch', () => {
  describe('initial state', () => {
    it('returns empty query', () => {
      const { result } = renderHook(() => useBrandSearch());
      expect(result.current.query).toBe('');
    });

    it('returns isSearching=false when query is empty', () => {
      const { result } = renderHook(() => useBrandSearch());
      expect(result.current.isSearching).toBe(false);
    });

    it('returns popular brands in correct order', () => {
      const { result } = renderHook(() => useBrandSearch());
      const popularIds = result.current.popularBrands.map((b) => b.id);
      expect(popularIds).toEqual(['esselunga', 'conad', 'coop', 'carrefour', 'lidl']);
    });

    it('returns all brands sorted alphabetically', () => {
      const { result } = renderHook(() => useBrandSearch());
      const names = result.current.allBrands.map((b) => b.name);
      expect(names).toEqual([
        'Auchan',
        'Bennet',
        'Carrefour',
        'Conad',
        'Coop',
        'Esselunga',
        'Lidl'
      ]);
    });

    it('returns empty filteredBrands when no query', () => {
      const { result } = renderHook(() => useBrandSearch());
      expect(result.current.filteredBrands).toEqual([]);
    });
  });

  describe('search filtering', () => {
    it('filters by partial name match', () => {
      const { result } = renderHook(() => useBrandSearch());

      act(() => {
        result.current.setQuery('ess');
      });

      expect(result.current.isSearching).toBe(true);
      expect(result.current.filteredBrands).toHaveLength(1);
      expect(result.current.filteredBrands[0]?.id).toBe('esselunga');
    });

    it('matches case-insensitively', () => {
      const { result } = renderHook(() => useBrandSearch());

      act(() => {
        result.current.setQuery('COOP');
      });

      expect(result.current.filteredBrands).toHaveLength(1);
      expect(result.current.filteredBrands[0]?.id).toBe('coop');
    });

    it('matches by alias', () => {
      const { result } = renderHook(() => useBrandSearch());

      act(() => {
        result.current.setQuery('fidaty');
      });

      expect(result.current.filteredBrands).toHaveLength(1);
      expect(result.current.filteredBrands[0]?.id).toBe('esselunga');
    });

    it('returns multiple matches', () => {
      const { result } = renderHook(() => useBrandSearch());

      act(() => {
        result.current.setQuery('co');
      });

      const ids = result.current.filteredBrands.map((b) => b.id);
      expect(ids).toContain('conad');
      expect(ids).toContain('coop');
    });

    it('returns empty array when no matches found', () => {
      const { result } = renderHook(() => useBrandSearch());

      act(() => {
        result.current.setQuery('xyz_nonexistent');
      });

      expect(result.current.filteredBrands).toEqual([]);
    });

    it('trims whitespace from query', () => {
      const { result } = renderHook(() => useBrandSearch());

      act(() => {
        result.current.setQuery('  ess  ');
      });

      expect(result.current.filteredBrands).toHaveLength(1);
      expect(result.current.filteredBrands[0]?.id).toBe('esselunga');
    });

    it('treats whitespace-only query as not searching', () => {
      const { result } = renderHook(() => useBrandSearch());

      act(() => {
        result.current.setQuery('   ');
      });

      expect(result.current.isSearching).toBe(false);
      expect(result.current.filteredBrands).toEqual([]);
    });
  });

  describe('clearSearch', () => {
    it('resets query to empty string', () => {
      const { result } = renderHook(() => useBrandSearch());

      act(() => {
        result.current.setQuery('test');
      });
      expect(result.current.query).toBe('test');

      act(() => {
        result.current.clearSearch();
      });
      expect(result.current.query).toBe('');
      expect(result.current.isSearching).toBe(false);
    });
  });
});
