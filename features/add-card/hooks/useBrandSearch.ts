/**
 * useBrandSearch Hook
 * Story 13.4: Restyle Add Card Flow (AC2)
 *
 * Provides brand search and filtering logic for the Card Type Selection screen.
 * Returns filtered brands based on search query, with case-insensitive matching
 * on brand name and aliases.
 */

import { useMemo, useState } from 'react';

import { CatalogueRepository } from '@/core/catalogue/catalogue-repository';

import { CatalogueBrand } from '@/catalogue/types';
/** Top 5 popular brand IDs, in display order */
const POPULAR_BRAND_IDS = ['esselunga', 'conad', 'coop', 'carrefour', 'lidl'];

export interface UseBrandSearchReturn {
  query: string;
  setQuery: (value: string) => void;
  isSearching: boolean;
  popularBrands: CatalogueBrand[];
  allBrands: CatalogueBrand[];
  filteredBrands: CatalogueBrand[];
  clearSearch: () => void;
}

export const useBrandSearch = (): UseBrandSearchReturn => {
  const [query, setQuery] = useState('');

  const repo = useMemo(() => CatalogueRepository.getInstance(), []);
  const brands = useMemo(() => repo.getBrands(), [repo]);

  const popularBrands = useMemo(
    () =>
      POPULAR_BRAND_IDS.map((id) => brands.find((b) => b.id === id)).filter(
        (b): b is CatalogueBrand => b !== undefined
      ),
    [brands]
  );

  const allBrands = useMemo(
    () => [...brands].sort((a, b) => a.name.localeCompare(b.name)),
    [brands]
  );

  const isSearching = query.trim().length > 0;

  const filteredBrands = useMemo(() => {
    if (!isSearching) return [];
    const lowerQuery = query.trim().toLowerCase();
    return allBrands.filter((brand) => {
      const matchesName = brand.name.toLowerCase().includes(lowerQuery);
      const matchesAlias = brand.aliases.some((alias) => alias.toLowerCase().includes(lowerQuery));
      return matchesName || matchesAlias;
    });
  }, [query, isSearching, allBrands]);

  const clearSearch = () => setQuery('');

  return {
    query,
    setQuery,
    isSearching,
    popularBrands,
    allBrands,
    filteredBrands,
    clearSearch
  };
};
