/**
 * CardList Component
 * Story 13.2: Restyle Home Screen (AC1, AC3, AC5, AC6, AC10)
 * Story 16.22: Fix card-grid tile overlap on narrow screens (AC1, AC2, AC3, AC10)
 *
 * 2-column grid with search, sort, single-card state,
 * and empty state using FlashList for performance.
 */

import { FlashList } from '@shopify/flash-list';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  RefreshControl,
  useWindowDimensions
} from 'react-native';

import { LoyaltyCard } from '@/core/schemas';

import { useCloudSync } from '@/shared/hooks/useCloudSync';
import { useTheme } from '@/shared/theme';
import { SPACING } from '@/shared/theme/spacing';
import { TYPOGRAPHY } from '@/shared/theme/typography';

import { CardTile } from './CardTile';
import { EmptyState } from './EmptyState';
import { SearchBar } from './SearchBar';
import { SortFilterRow } from './SortFilterRow';
import { useCards } from '../hooks/useCards';
import { useCardSearch } from '../hooks/useCardSearch';
import { useCardSort } from '../hooks/useCardSort';
import {
  GUTTER,
  LIST_CONTENT_PADDING,
  NUM_COLUMNS,
  getGridTileHeight,
  getGridTileWidth,
  getSingleTileHeight,
  getSingleTileWidth
} from '../utils/gridLayout';

/**
 * CardList Component
 *
 * - Fixed 2-column FlashList grid (the column COUNT has no responsive breakpoint;
 *   the tile WIDTH is derived from the viewport — see utils/gridLayout.ts)
 * - 16pt screen margins, 16pt gutters at every width, spent as
 *   LIST_CONTENT_PADDING on the list plus GUTTER / 2 on each tile wrapper
 * - SearchBar + SortFilterRow visible when cards >= 2
 * - Single-card state: enlarged centered tile with tip
 * - Empty state via ListEmptyComponent
 * - Pull-to-refresh for cloud sync
 *
 * The grid geometry lives in utils/gridLayout.ts. Those values are intentionally
 * local to this feature and differ from the shared/theme/spacing LAYOUT tokens
 * used by other screens — the repo is canonical for design (see
 * docs/design/CONTRIBUTING-DESIGN.md). (Historical breadcrumb: originally derived
 * from Figma node 52:64 — Figma is now ideation-only.)
 */
export const CardList: React.FC<{ highlightCardId?: string | null }> = ({ highlightCardId }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { cards, isLoading, error, refetch } = useCards();
  const { forceSync } = useCloudSync();
  const [isRefreshing, setIsRefreshing] = useState(false);
  // ONE subscription for the whole list. Never move this into CardTile — that
  // would create one subscription per rendered tile.
  const { width: windowWidth } = useWindowDimensions();

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

  // Tile geometry, derived from the viewport so a tile always fits the cell
  // FlashList assigns it. Exactly 171 x 140 at the 390 dp design reference width.
  const gridTile = useMemo(() => {
    const width = getGridTileWidth(windowWidth);
    return { width, height: getGridTileHeight(width) };
  }, [windowWidth]);

  const singleTile = useMemo(() => {
    const width = getSingleTileWidth(windowWidth);
    return { width, height: getSingleTileHeight(width) };
  }, [windowWidth]);

  const noResultsElement = useMemo(
    () => (
      <View style={styles.noResults}>
        <Text style={[styles.noResultsText, { color: theme.textSecondary }]}>
          {t('cards.home.noResults', { query: searchQuery })}
        </Text>
      </View>
    ),
    [searchQuery, t, theme.textSecondary]
  );

  const renderItem = useCallback(
    ({ item }: { item: LoyaltyCard }) => (
      <View style={styles.tileWrapper}>
        <CardTile
          card={item}
          highlighted={item.id === highlightCardId}
          tileWidth={gridTile.width}
          tileHeight={gridTile.height}
        />
      </View>
    ),
    [highlightCardId, gridTile.width, gridTile.height]
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
        <CardTile
          card={cards[0]!}
          enlarged
          highlighted={cards[0]!.id === highlightCardId}
          tileWidth={singleTile.width}
          tileHeight={singleTile.height}
        />
        <Text style={[styles.singleCardTip, { color: theme.textTertiary }]}>
          {t('cards.home.singleCardTip')}
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
    // Only the remainder of the 16 pt screen margin — the rest is on each
    // tileWrapper below, so two adjacent wrappers form the 16 pt gutter while the
    // outer edges still total 16 pt. FlashList measures its cells from a probe view
    // inside this container, so this padding is part of the cell-width arithmetic.
    paddingHorizontal: LIST_CONTENT_PADDING,
    paddingVertical: SPACING.sm
  },
  headerContainer: {
    // Restores the 16 pt visual margin for SearchBar + SortFilterRow, which sit in
    // the same content container but have no tileWrapper of their own.
    paddingHorizontal: GUTTER / 2,
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
    paddingTop: 32
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
