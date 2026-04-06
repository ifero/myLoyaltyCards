/**
 * BrandList Component
 * Story 13.4: Restyle Add Card Flow (AC1, AC2)
 *
 * SectionList for the Card Type Selection screen.
 * Default: "Popular Cards" → "Other card" → "All Cards" sections.
 * Search active: "Results" section with filtered brands.
 */

import React, { useMemo } from 'react';
import { View, Text, SectionList, StyleSheet } from 'react-native';

import { useTheme } from '@/shared/theme';

import { CatalogueBrand } from '@/catalogue/types';

import { BrandRow } from './BrandRow';
import { OtherCardRow } from './OtherCardRow';

type BrandListItem = { type: 'brand'; brand: CatalogueBrand } | { type: 'other-card' };

interface BrandListSection {
  title: string;
  data: BrandListItem[];
}

interface BrandListProps {
  isSearching: boolean;
  query: string;
  popularBrands: CatalogueBrand[];
  allBrands: CatalogueBrand[];
  filteredBrands: CatalogueBrand[];
  onBrandPress: (brand: CatalogueBrand) => void;
  onOtherCardPress: () => void;
  testID?: string;
}

export const BrandList: React.FC<BrandListProps> = ({
  isSearching,
  query,
  popularBrands,
  allBrands,
  filteredBrands,
  onBrandPress,
  onOtherCardPress,
  testID = 'brand-list'
}) => {
  const { theme } = useTheme();

  const sections: BrandListSection[] = useMemo(() => {
    if (isSearching) {
      const items: BrandListItem[] = filteredBrands.map((brand) => ({
        type: 'brand' as const,
        brand
      }));
      // Always show "Other card" option when searching
      items.push({ type: 'other-card' as const });
      return [{ title: 'RESULTS', data: items }];
    }

    return [
      {
        title: 'POPULAR CARDS',
        data: popularBrands.map((brand) => ({ type: 'brand' as const, brand }))
      },
      {
        title: '', // Empty title for "Other card" separator section
        data: [{ type: 'other-card' as const }]
      },
      {
        title: 'ALL CARDS',
        data: allBrands.map((brand) => ({ type: 'brand' as const, brand }))
      }
    ];
  }, [isSearching, filteredBrands, popularBrands, allBrands]);

  const renderItem = ({
    item,
    index,
    section
  }: {
    item: BrandListItem;
    index: number;
    section: BrandListSection;
  }) => {
    if (item.type === 'other-card') {
      return <OtherCardRow onPress={onOtherCardPress} />;
    }

    const isLast =
      index === section.data.length - 1 || section.data[index + 1]?.type === 'other-card';
    return (
      <BrandRow
        brand={item.brand}
        onPress={onBrandPress}
        showSeparator={!isLast}
        testID={`brand-row-${item.brand.id}`}
      />
    );
  };

  const renderSectionHeader = ({ section }: { section: BrandListSection }) => {
    if (!section.title) return null;
    return (
      <View style={[styles.sectionHeader, { backgroundColor: theme.background }]}>
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{section.title}</Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (!isSearching) return null;

    if (filteredBrands.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No cards found</Text>
        </View>
      );
    }

    return (
      <View style={styles.footerContainer}>
        <Text style={[styles.footerText, { color: theme.textTertiary }]}>
          Showing results matching &quot;{query}&quot;
        </Text>
      </View>
    );
  };

  return (
    <SectionList
      testID={testID}
      sections={sections}
      keyExtractor={(item, index) =>
        item.type === 'other-card' ? 'other-card' : `brand-${item.brand.id}-${index}`
      }
      renderItem={renderItem}
      renderSectionHeader={renderSectionHeader}
      ListFooterComponent={renderFooter}
      stickySectionHeadersEnabled={false}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.content}
    />
  );
};

const styles = StyleSheet.create({
  content: {
    paddingBottom: 32
  },
  sectionHeader: {
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 8
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase'
  },
  emptyContainer: {
    paddingHorizontal: 24,
    paddingTop: 24,
    alignItems: 'center'
  },
  emptyText: {
    fontSize: 16
  },
  footerContainer: {
    paddingHorizontal: 24,
    paddingTop: 24
  },
  footerText: {
    fontSize: 14
  }
});
