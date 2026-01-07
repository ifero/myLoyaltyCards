/**
 * CardList Component
 * Story 2.1: Display Card List
 *
 * Main card list component using FlashList for performance.
 * Displays cards in a responsive grid or empty state when no cards exist.
 */

import { FlashList } from '@shopify/flash-list';
import React from 'react';
import { View, Text, useWindowDimensions, ActivityIndicator, StyleSheet } from 'react-native';

import { LoyaltyCard } from '@/core/schemas';

import { useTheme } from '@/shared/theme';
import { SPACING } from '@/shared/theme/spacing';

import { CardTile } from './CardTile';
import { EmptyState } from './EmptyState';
import { useCards } from '../hooks/useCards';

/**
 * Breakpoint for responsive columns
 * < 400dp: 2 columns
 * >= 400dp: 3 columns
 */
const COLUMN_BREAKPOINT = 400;
const MIN_COLUMNS = 2;
const MAX_COLUMNS = 3;

/**
 * CardList Component
 *
 * - Uses FlashList for 10x performance vs FlatList
 * - Responsive columns based on screen width
 * - Shows EmptyState when no cards
 * - Shows loading spinner while fetching
 * - 8px gap between items, 16px horizontal padding
 */
export const CardList: React.FC = () => {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const { cards, isLoading, error } = useCards();

  // Determine number of columns based on screen width
  const numColumns = width < COLUMN_BREAKPOINT ? MIN_COLUMNS : MAX_COLUMNS;

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.textSecondary }}>{error}</Text>
      </View>
    );
  }

  // Render card item
  const renderItem = ({ item }: { item: LoyaltyCard }) => <CardTile card={item} />;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <FlashList
        data={cards}
        renderItem={renderItem}
        numColumns={numColumns}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={EmptyState}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: SPACING.md - SPACING.sm / 2, // 16px - 4px margin = 12px
    paddingVertical: SPACING.sm,
  },
});
