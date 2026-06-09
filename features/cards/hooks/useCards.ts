/**
 * useCards Hook
 * Story 2.1: Display Card List
 *
 * Hook to fetch and manage loyalty cards from local database.
 * Orders cards by creation date (newest first) per AC3.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

import { getAllCards } from '@/core/database';
import { LoyaltyCard } from '@/core/schemas';

interface UseCardsResult {
  /** Array of loyalty cards ordered by createdAt DESC */
  cards: LoyaltyCard[];
  /** Loading state while fetching */
  isLoading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Refetch cards from database */
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch and manage loyalty cards
 *
 * @returns Cards array, loading state, error, and refetch function
 *
 * @example
 * ```tsx
 * const { cards, isLoading, error, refetch } = useCards();
 * ```
 */
export function useCards(): UseCardsResult {
  const [cards, setCards] = useState<LoyaltyCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  const fetchCards = useCallback(async () => {
    try {
      // Only drive the full-screen loading state on the FIRST load. Subsequent
      // refetches (e.g. CardList's useFocusEffect on back-navigation) update the
      // data in place, so CardList keeps its FlashList mounted and preserves the
      // user's scroll position instead of remounting at the top. (Story 9.3, AC6)
      if (!hasLoadedRef.current) {
        setIsLoading(true);
      }
      setError(null);
      // getAllCards returns cards ordered by createdAt DESC (newest first) per AC3
      const fetchedCards = await getAllCards();
      setCards(fetchedCards);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cards');
    } finally {
      hasLoadedRef.current = true;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  return {
    cards,
    isLoading,
    error,
    refetch: fetchCards
  };
}
