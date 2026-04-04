/**
 * useCardSort Hook
 * Story 13.2: Restyle Home Screen — AC6 (Sort/Filter Controls)
 *
 * Manages sort state with persistence to AsyncStorage.
 * Supports three sort modes: frequently used, recently added, A-Z.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { LoyaltyCard } from '@/core/schemas';

export type SortOption = 'frequent' | 'recent' | 'az';

const STORAGE_KEY = '@myLoyaltyCards/sortPreference';

const SORT_LABELS: Record<SortOption, string> = {
  frequent: 'Frequently used',
  recent: 'Recently added',
  az: 'A-Z'
};

interface UseCardSortResult {
  /** Current sort option */
  sortOption: SortOption;
  /** Update the sort option (persists to storage) */
  setSortOption: (option: SortOption) => void;
  /** Sort cards according to the current option */
  sortCards: (cards: LoyaltyCard[]) => LoyaltyCard[];
  /** Human-readable label for current sort option */
  sortLabel: string;
  /** All available sort labels */
  sortLabels: typeof SORT_LABELS;
}

const sortByFrequent = (a: LoyaltyCard, b: LoyaltyCard): number => {
  // Primary: usageCount descending
  if (a.usageCount !== b.usageCount) return b.usageCount - a.usageCount;
  // Tiebreaker: lastUsedAt descending (most recent first)
  if (a.lastUsedAt && b.lastUsedAt) return b.lastUsedAt.localeCompare(a.lastUsedAt);
  if (a.lastUsedAt) return -1;
  if (b.lastUsedAt) return 1;
  // Final fallback: recently added
  return b.createdAt.localeCompare(a.createdAt);
};

const sortByRecent = (a: LoyaltyCard, b: LoyaltyCard): number =>
  b.createdAt.localeCompare(a.createdAt);

const sortByAZ = (a: LoyaltyCard, b: LoyaltyCard): number =>
  a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });

/**
 * Hook for sorting loyalty cards with persistent preference.
 *
 * - "Frequently used": sorts by usageCount desc → lastUsedAt desc → createdAt desc
 * - "Recently added": sorts by createdAt desc
 * - "A-Z": sorts by name (locale-aware, case-insensitive)
 */
export const useCardSort = (): UseCardSortResult => {
  const [sortOption, setSortOptionState] = useState<SortOption>('frequent');

  // Load persisted preference on mount
  useEffect(() => {
    const loadPreference = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored && (stored === 'frequent' || stored === 'recent' || stored === 'az')) {
          setSortOptionState(stored);
        }
      } catch {
        // Silently default to 'frequent'
      }
    };
    loadPreference();
  }, []);

  const setSortOption = useCallback((option: SortOption) => {
    setSortOptionState(option);
    AsyncStorage.setItem(STORAGE_KEY, option).catch(() => {
      // Best-effort persistence
    });
  }, []);

  const sortCards = useCallback(
    (cards: LoyaltyCard[]): LoyaltyCard[] => {
      const sorted = [...cards];
      switch (sortOption) {
        case 'frequent':
          sorted.sort(sortByFrequent);
          break;
        case 'recent':
          sorted.sort(sortByRecent);
          break;
        case 'az':
          sorted.sort(sortByAZ);
          break;
      }
      return sorted;
    },
    [sortOption]
  );

  return {
    sortOption,
    setSortOption,
    sortCards,
    sortLabel: SORT_LABELS[sortOption],
    sortLabels: SORT_LABELS
  };
};
