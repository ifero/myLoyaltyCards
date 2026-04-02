/**
 * useCardSearch Hook
 * Story 13.2: Restyle Home Screen — AC3 (Search Bar)
 *
 * Manages search query state and filters cards by name (case-insensitive).
 */

import { useCallback, useState } from 'react';

import { LoyaltyCard } from '@/core/schemas';

interface UseCardSearchResult {
  /** Current search query */
  searchQuery: string;
  /** Update the search query */
  setSearchQuery: (query: string) => void;
  /** Clear the search query */
  clearSearch: () => void;
  /** Filter cards by the current search query */
  filterCards: (cards: LoyaltyCard[]) => LoyaltyCard[];
}

/**
 * Hook for searching/filtering loyalty cards by name.
 *
 * - Case-insensitive substring match on card `name`
 * - Returns all cards when query is empty
 */
export const useCardSearch = (): UseCardSearchResult => {
  const [searchQuery, setSearchQuery] = useState('');

  const clearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  const filterCards = useCallback(
    (cards: LoyaltyCard[]): LoyaltyCard[] => {
      const trimmed = searchQuery.trim();
      if (trimmed.length === 0) return cards;

      const lowerQuery = trimmed.toLowerCase();
      return cards.filter((card) => card.name.toLowerCase().includes(lowerQuery));
    },
    [searchQuery]
  );

  return { searchQuery, setSearchQuery, clearSearch, filterCards };
};
