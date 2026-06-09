/**
 * useCardSort Hook
 * Story 13.2: Restyle Home Screen — AC6 (Sort/Filter Controls)
 *
 * Manages sort state with persistence to AsyncStorage.
 * Supports three sort modes: frequently used, recently added, A-Z.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { LoyaltyCard } from '@/core/schemas';

export type SortOption = 'frequent' | 'recent' | 'az';

const STORAGE_KEY = '@myLoyaltyCards/sortPreference';

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
  sortLabels: Record<SortOption, string>;
}

/**
 * Pins favourites above non-favourites. Returns 0 when both cards share the same
 * favourite state, letting the caller fall through to its own ordering.
 */
const compareFavoriteFirst = (a: LoyaltyCard, b: LoyaltyCard): number =>
  a.isFavorite === b.isFavorite ? 0 : a.isFavorite ? -1 : 1;

const sortByFrequent = (a: LoyaltyCard, b: LoyaltyCard): number => {
  // Tier 0: favourites always first
  const favorite = compareFavoriteFirst(a, b);
  if (favorite !== 0) return favorite;
  // Tier 1: usageCount descending
  if (a.usageCount !== b.usageCount) return b.usageCount - a.usageCount;
  // Tier 2: lastUsedAt descending (most recent first)
  if (a.lastUsedAt && b.lastUsedAt) return b.lastUsedAt.localeCompare(a.lastUsedAt);
  if (a.lastUsedAt) return -1;
  if (b.lastUsedAt) return 1;
  // Tier 3: createdAt descending (fallback)
  return b.createdAt.localeCompare(a.createdAt);
};

// "Recently added" is an explicit chronological order — favourites are NOT pinned.
const sortByRecent = (a: LoyaltyCard, b: LoyaltyCard): number =>
  b.createdAt.localeCompare(a.createdAt);

const sortByAZ = (a: LoyaltyCard, b: LoyaltyCard): number => {
  // Favourites stay pinned to the top, then names sort alphabetically within each group
  const favorite = compareFavoriteFirst(a, b);
  if (favorite !== 0) return favorite;
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
};

/**
 * Hook for sorting loyalty cards with persistent preference.
 *
 * - "Frequently used": sorts by isFavorite first → usageCount desc → lastUsedAt desc → createdAt desc
 * - "Recently added": sorts by createdAt desc (favourites are NOT pinned)
 * - "A-Z": sorts by isFavorite first → name (locale-aware, case-insensitive)
 */
export const useCardSort = (): UseCardSortResult => {
  const [sortOption, setSortOptionState] = useState<SortOption>('frequent');
  const { t } = useTranslation();
  const sortLabels: Record<SortOption, string> = {
    frequent: t('cards.sort.frequent'),
    recent: t('cards.sort.recent'),
    az: t('cards.sort.az')
  };

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
    sortLabel: sortLabels[sortOption],
    sortLabels
  };
};
