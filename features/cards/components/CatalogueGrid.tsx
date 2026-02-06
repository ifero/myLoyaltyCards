/**
 * CatalogueGrid Component
 * Story 3.2: Browse Catalogue Grid
 *
 * Displays Italian brands in a responsive grid for quick card addition.
 * Uses FlashList for 60fps scrolling performance.
 */

import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { View, Text, Pressable, useWindowDimensions, StyleSheet } from 'react-native';

import { useTheme } from '@/shared/theme';
import { SPACING } from '@/shared/theme/spacing';

import catalogueData from '@/catalogue/italy.json';
import { CatalogueBrand } from '@/catalogue/types';

/**
 * Breakpoint for responsive columns
 * < 400dp: 3 columns
 * >= 400dp: 4 columns (tablet)
 */
const COLUMN_BREAKPOINT = 400;
const MIN_COLUMNS = 3;
const MAX_COLUMNS = 4;

/**
 * BrandCard - Individual brand item component
 */
const BrandCard: React.FC<{
  brand: CatalogueBrand;
  onPress: (brand: CatalogueBrand) => void;
  testID?: string;
}> = ({ brand, onPress, testID }) => {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={() => onPress(brand)}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`${brand.name} brand`}
      className="m-2 flex-1"
    >
      <View
        className="items-center justify-center rounded-lg p-4"
        style={{
          backgroundColor: brand.color + '15',
          aspectRatio: '1/1'
        }}
      >
        {/* Brand Logo */}
        <View
          style={{
            width: 48,
            height: 48,
            marginBottom: 8,
            backgroundColor: brand.color + '30',
            borderRadius: 4,
            justifyContent: 'center',
            alignItems: 'center'
          }}
          testID={`brand-logo-${brand.id}`}
        >
          <Text style={{ color: brand.color, fontWeight: 'bold', fontSize: 12 }}>
            {brand.name.substring(0, 2).toUpperCase()}
          </Text>
        </View>

        {/* Brand Name */}
        <Text
          className="text-center text-xs font-medium"
          style={{ color: theme.textPrimary }}
          numberOfLines={2}
        >
          {brand.name}
        </Text>
      </View>
    </Pressable>
  );
};

/**
 * CatalogueGrid Component
 *
 * Per acceptance criteria:
 * - AC1: Displays data from CatalogueRepository (italy.json)
 * - AC2: Responsive grid (3 mobile, 4+ tablet)
 * - AC3: Logo centered, contain-fit + label below
 * - AC4: FlashList for 60fps scrolling
 * - AC5: "Add Custom Card" at top (integrated in AddCardScreen)
 * - AC6: Navigate to scanner with brandId/brandName on tap
 */
export function CatalogueGrid() {
  const { theme } = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();

  // Determine number of columns based on screen width
  const numColumns = width < COLUMN_BREAKPOINT ? MIN_COLUMNS : MAX_COLUMNS;

  // Memoize brands data
  const brands = useMemo(() => catalogueData.brands, []);

  /**
   * Handle brand tap - navigate to scanner with brand context
   */
  const handleBrandPress = (brand: CatalogueBrand) => {
    router.push({
      pathname: '/scan',
      params: {
        brandId: brand.id,
        brandName: brand.name,
        brandColor: brand.color,
        brandFormat: brand.defaultFormat
      }
    });
  };

  /**
   * Render brand card item
   */
  const renderItem = ({ item }: { item: CatalogueBrand }) => (
    <BrandCard brand={item} onPress={handleBrandPress} testID={`brand-card-${item.id}`} />
  );

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }} testID="catalogue-grid">
      <FlashList
        data={brands as readonly CatalogueBrand[]}
        renderItem={renderItem}
        numColumns={numColumns}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        testID="catalogue-flash-list"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: SPACING.lg
  }
});
