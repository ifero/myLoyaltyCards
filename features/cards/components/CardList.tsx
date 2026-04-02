/**
 * CardList Component
 * Story 13.2: Restyle Home Screen (AC1, AC3, AC5, AC6, AC10)
 *
 * 2-column grid with search, sort, single-card state,
 * and empty state using FlashList for performance.
 */

import { FlashList } from '@shopify/flash-list';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  RefreshControl
} from 'react-native';

import { LoyaltyCard } from '@/core/schemas';

import { useCloudSync } from '@/shared/hooks/useCloudSync';
import { useTheme } from '@/shared/theme';
import { SPACING } from '@/shared/theme/spacing';
import { TYPOGRAPHY } from '@/shared/theme/typography';

import { CardTile, TILE_WIDTH } from './CardTile';
import { EmptyState } from './EmptyState';
import { SearchBar } from './SearchBar';
import { SortFilterRow } from './SortFilterRow';
import { useCards } from '../hooks/useCards';
import { useCardSearch } from '../hooks/useCardSearch';
import { useCardSort } from '../hooks/useCardSort';

/** Fixed 2-column layout */
const NUM_COLUMNS = 2;
const SCREEN_MARGIN = 16;
const GUTTER = 16;

/**
 * CardList Component
 *
 * - Fixed 2-column FlashList grid (no responsive breakpoint)
 * - 16pt screen margins, 16pt gutters
 * - SearchBar + SortFilterRow visible when cards >= 2
 * - Single-card state: enlarged centered tile with tip
 * - Empty state via ListEmptyComponent
 * - Pull-to-refresh for cloud sync
 */
export const CardList: React.FC = () => {
  const { theme } = useTheme();
  const { cards, isLoading, error, refetch } = useCards();
  const { forceSync } = useCloudSync();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { searchQuery, setSearchQuery, clearSearch, filterCards } = useCardSearch();
  const { sortOption, setSortOption, sortCards, sortLabel, sortLabels } = useCardSort();

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await forceSync();
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [forceSync, refetch]);

  // Refresh cards when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  // Derive data unconditionally (hooks must run on every render)
  const filtered = filterCards(cards);
  const sorted = sortCards(filtered);
  const totalCount = cards.length;
  const showControls = totalCount >= 2;

  const noResultsElement = useMemo(
    () => (
      <View style={styles.noResults}>
        <Text style={[styles.noResultsText, { color: theme.textSecondary }]}>
          No cards matching &quot;{searchQuery}&quot;
        </Text>
      </View>
    ),
    [searchQuery, theme.textSecondary]
  );

  const renderItem = useCallback(
    ({ item }: { item: LoyaltyCard }) => (
      <View style={styles.tileWrapper}>
        <CardTile card={item} />
      </View>
    ),
    []
  );

  // ---- Loading state ----
  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  // ---- Error state ----
  if (error) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.textSecondary }}>{error}</Text>
      </View>
    );
  }

  // ---- Single-card state ----
  if (totalCount === 1) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={styles.singleCardContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
          />
        }
      >
        <CardTile card={cards[0]} enlarged />
        <Text style={[styles.singleCardTip, { color: theme.textSecondary }]}>
          Tap + to add more cards
        </Text>
      </ScrollView>
    );
  }

  // ---- Multi-card / Empty state ----
  const ListHeader = showControls ? (
    <View style={styles.headerContainer}>
      <SearchBar value={searchQuery} onChangeText={setSearchQuery} onClear={clearSearch} />
      <SortFilterRow
        cardCount={filtered.length}
        sortOption={sortOption}
        onSortChange={setSortOption}
        sortLabel={sortLabel}
        sortLabels={sortLabels}
      />
    </View>
  ) : null;

  const EmptyComponent =
    showControls && searchQuery.trim().length > 0 && sorted.length === 0
      ? noResultsElement
      : EmptyState;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <FlashList
        testID="card-list-flashlist"
        data={sorted}
        renderItem={renderItem}
        numColumns={NUM_COLUMNS}
        keyExtractor={(item) => item.id}
        estimatedItemSize={TILE_WIDTH + 30}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={EmptyComponent}
        refreshing={isRefreshing}
        onRefresh={handleRefresh}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  listContent: {
    paddingHorizontal: SCREEN_MARGIN,
    paddingVertical: SPACING.sm
  },
  headerContainer: {
    marginBottom: 8
  },
  tileWrapper: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: GUTTER / 2,
    marginBottom: GUTTER
  },
  singleCardContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  singleCardTip: {
    fontSize: TYPOGRAPHY.subheadline.fontSize,
    lineHeight: TYPOGRAPHY.subheadline.lineHeight,
    marginTop: 16,
    textAlign: 'center'
  },
  noResults: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48
  },
  noResultsText: {
    fontSize: TYPOGRAPHY.body.fontSize,
    textAlign: 'center'
  }
});
