/**
 * CardTypeSelectionScreen
 * Story 13.4: Restyle Add Card Flow (AC1, AC2, T2)
 *
 * First screen in the add-card flow. Shows a searchable brand list with
 * popular cards, all catalogue brands, and "Other card" option.
 * Navigation: Brand tap → BrandScannerScreen, Other card → CardSetupScreen (custom)
 */

import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect } from 'react';
import { View, StyleSheet, Pressable, AccessibilityInfo } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/shared/theme';
import { SPACING, LAYOUT, TOUCH_TARGET } from '@/shared/theme/spacing';

import { CatalogueBrand } from '@/catalogue/types';

import { BrandList } from '../components/BrandList';
import { BrandSearchBar } from '../components/BrandSearchBar';
import { useBrandSearch } from '../hooks/useBrandSearch';

export const CardTypeSelectionScreen: React.FC = () => {
  const { theme } = useTheme();
  const { query, setQuery, isSearching, popularBrands, allBrands, filteredBrands, clearSearch } =
    useBrandSearch();

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility?.('Card type selection screen');
  }, []);

  const handleBrandPress = useCallback((brand: CatalogueBrand) => {
    router.push({
      pathname: '/add-card/scan',
      params: {
        brandId: brand.id,
        brandName: brand.name,
        brandColor: brand.color,
        brandLogo: brand.logo
      }
    });
  }, []);

  const handleOtherCardPress = useCallback(() => {
    router.push({
      pathname: '/add-card/scan',
      params: { mode: 'custom' }
    });
  }, []);

  const handleBackPress = useCallback(() => {
    router.back();
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={handleBackPress}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          testID="back-button"
        >
          <MaterialIcons name="chevron-left" size={28} color={theme.textPrimary} />
        </Pressable>
      </View>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <BrandSearchBar
          value={query}
          onChangeText={setQuery}
          onClear={clearSearch}
          testID="brand-search-bar"
        />
      </View>

      {/* Brand list */}
      <BrandList
        isSearching={isSearching}
        popularBrands={popularBrands}
        allBrands={allBrands}
        filteredBrands={filteredBrands}
        query={query}
        onBrandPress={handleBrandPress}
        onOtherCardPress={handleOtherCardPress}
        testID="brand-list"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.screenHorizontalMargin - 8,
    height: TOUCH_TARGET.min
  },
  backButton: {
    width: TOUCH_TARGET.min,
    height: TOUCH_TARGET.min,
    justifyContent: 'center',
    alignItems: 'center'
  },
  searchContainer: {
    paddingHorizontal: LAYOUT.screenHorizontalMargin,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm
  }
});
