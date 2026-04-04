/**
 * CardDetails Component
 * Story 13.3: Restyle Card Detail Screen
 *
 * Displays full details of a loyalty card with Figma-aligned design:
 * - BrandHero section (catalogue logo or custom avatar)
 * - Barcode on white card with tap-to-enlarge
 * - Info section (number, color for custom, date added)
 * - Manage section with ActionRow pattern (Edit, Delete)
 * - Fullscreen barcode modal overlay
 */

import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  Platform,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  useWindowDimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LoyaltyCard } from '@/core/schemas';

import { ActionRow } from '@/shared/components/ui/ActionRow';
import { useTheme, CARD_COLORS } from '@/shared/theme';
import { SPACING, LAYOUT, TOUCH_TARGET } from '@/shared/theme/spacing';
import { TYPOGRAPHY } from '@/shared/theme/typography';

import { BarcodeRenderer } from './BarcodeRenderer';
import { BrandHero } from './BrandHero';
import { DetailRow } from './DetailRow';
import { FullscreenBarcode } from './FullscreenBarcode';
import { formatBarcodeNumber } from '../utils/formatBarcode';

interface CardDetailsProps {
  /** The loyalty card to display */
  card: LoyaltyCard;
  /** Callback when copy is successful - for toast notifications */
  onCopy?: () => void;
  /** Callback when delete is confirmed - parent handles deletion logic */
  onDelete?: () => void;
  /** Whether delete operation is in progress */
  isDeleting?: boolean;
  /** Callback when scroll position passes the hero section threshold (AC5 condensing header) */
  onScrollPastHero?: (isPast: boolean) => void;
}

/**
 * Human-readable color names
 */
const COLOR_LABELS: Record<string, string> = {
  blue: 'Blue',
  red: 'Red',
  green: 'Green',
  orange: 'Orange',
  grey: 'Grey'
};

/**
 * Format date for display (e.g., "Jan 7, 2026")
 */
const formatDate = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

/** Scroll threshold — ~60% of BrandHero height */
const HERO_SCROLL_THRESHOLD = 120;
const HERO_CONDENSING_RATIO = 0.6;

/**
 * CardDetails Component — Figma-aligned Card Detail screen
 */
export const CardDetails: React.FC<CardDetailsProps> = ({
  card,
  onCopy,
  onDelete,
  isDeleting = false,
  onScrollPastHero
}) => {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: viewportHeight } = useWindowDimensions();
  const [fullscreenVisible, setFullscreenVisible] = useState(false);
  const [heroHeight, setHeroHeight] = useState(200);
  const isPastHeroRef = useRef(false);

  /**
   * Track scroll position for header condensing (AC5)
   */
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = event.nativeEvent.contentOffset.y;
      const isPast = y > Math.max(HERO_SCROLL_THRESHOLD, heroHeight * HERO_CONDENSING_RATIO);
      if (isPast !== isPastHeroRef.current) {
        isPastHeroRef.current = isPast;
        onScrollPastHero?.(isPast);
      }
    },
    [heroHeight, onScrollPastHero]
  );

  /**
   * Measure hero height so ScrollView can always scroll enough
   * for barcode section to reach the top under the header.
   */
  const handleHeroLayout = useCallback((event: LayoutChangeEvent) => {
    const nextHeight = Math.round(event.nativeEvent.layout.height);
    if (nextHeight > 0) {
      setHeroHeight(nextHeight);
    }
  }, []);

  /**
   * Copy barcode number to clipboard with haptic feedback
   */
  const handleCopyBarcode = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(card.barcode);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onCopy?.();
    } catch (error) {
      console.error('Failed to copy barcode:', error);
      Alert.alert('Error', 'Failed to copy barcode to clipboard');
    }
  }, [card.barcode, onCopy]);

  /**
   * Open fullscreen barcode overlay
   */
  const handleOpenFullscreen = useCallback(() => {
    setFullscreenVisible(true);
  }, []);

  /**
   * Close fullscreen barcode overlay
   */
  const handleCloseFullscreen = useCallback(() => {
    setFullscreenVisible(false);
  }, []);

  /**
   * Navigate to Edit Card screen
   */
  const handleEditCard = useCallback(() => {
    router.push(`/card/${card.id}/edit`);
  }, [router, card.id]);

  /**
   * Show delete confirmation dialog
   */
  const handleDeleteCard = useCallback(() => {
    Alert.alert(
      'Delete Card?',
      `Are you sure you want to delete "${card.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onDelete?.();
          }
        }
      ],
      { cancelable: true }
    );
  }, [card.name, onDelete]);

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: insets.bottom + SPACING.xl },
          { minHeight: viewportHeight + heroHeight }
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        testID="card-details-scroll"
      >
        {/* Brand Hero Section (AC1) */}
        <View onLayout={handleHeroLayout}>
          <BrandHero card={card} testID="card-details-hero" />
        </View>

        {/* Barcode Display Area (AC2) */}
        <View style={styles.barcodeSection}>
          <Pressable
            onPress={handleOpenFullscreen}
            style={({ pressed }) => [styles.barcodeCard, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="View full screen barcode"
            accessibilityHint="Opens the barcode in full screen for scanning"
            testID="card-details-barcode-preview"
          >
            <BarcodeRenderer
              value={card.barcode}
              format={card.barcodeFormat}
              width={card.barcodeFormat === 'QR' ? 180 : 280}
              height={card.barcodeFormat === 'QR' ? 180 : 120}
            />
          </Pressable>

          {/* Barcode Number (spaced) */}
          <Text
            style={[styles.barcodeNumber, { color: theme.textPrimary }]}
            testID="card-details-barcode-number-display"
          >
            {formatBarcodeNumber(card.barcode)}
          </Text>

          {/* Tap to enlarge hint */}
          <Text style={[styles.barcodeHint, { color: theme.textTertiary }]}>Tap to enlarge</Text>

          {/* Brightness hint (AC7) */}
          <View style={styles.brightnessHint} testID="card-details-brightness-hint">
            <MaterialIcons name="light-mode" size={20} color={theme.textSecondary} />
            <Text style={[styles.brightnessText, { color: theme.textSecondary }]}>
              Increase brightness for scanning
            </Text>
          </View>
        </View>

        {/* Card Info Section (AC3) */}
        <View
          style={[styles.infoSection, { backgroundColor: theme.surface }]}
          testID="card-details-info-section"
        >
          {/* Barcode Number - Copyable */}
          <DetailRow
            label="Number"
            value={card.barcode}
            onPress={handleCopyBarcode}
            accessibilityHint="Double tap to copy barcode number"
            rightElement={<MaterialIcons name="content-copy" size={20} color={theme.primary} />}
            testID="card-details-barcode-number"
          />

          {/* Color — ONLY for custom cards (AC3) */}
          {card.brandId === null && (
            <DetailRow
              label="Color"
              value={COLOR_LABELS[card.color] || card.color}
              rightElement={
                <View
                  style={[styles.colorDot, { backgroundColor: CARD_COLORS[card.color] }]}
                  accessibilityLabel={`${COLOR_LABELS[card.color]} color`}
                />
              }
              testID="card-details-color"
            />
          )}

          {/* Date Added */}
          <DetailRow
            label="Added"
            value={formatDate(card.createdAt)}
            style={{ borderBottomWidth: 0 }}
            testID="card-details-date"
          />
        </View>

        {/* Manage Actions Section (AC4) */}
        <View style={styles.manageSection} testID="card-details-manage-section">
          <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>Manage</Text>

          {/* Edit Card Row */}
          <ActionRow
            icon="edit"
            iconFamily="MI"
            label="Edit card"
            onPress={handleEditCard}
            disabled={isDeleting}
            testID="card-details-edit-row"
          />

          {/* Separator */}
          <View style={[styles.separator, { backgroundColor: theme.border }]} />

          {/* Delete Card Row — destructive, no chevron */}
          <Pressable
            onPress={handleDeleteCard}
            disabled={isDeleting}
            accessibilityRole="button"
            accessibilityLabel={isDeleting ? 'Deleting card' : 'Delete card'}
            accessibilityState={{ disabled: isDeleting }}
            testID="card-details-delete-row"
            style={({ pressed }) => [
              styles.deleteRow,
              {
                backgroundColor: pressed ? theme.surfaceElevated : theme.surface,
                borderColor: theme.border,
                opacity: isDeleting ? 0.6 : 1
              }
            ]}
          >
            <View style={styles.deleteRowContent}>
              <MaterialIcons name="delete" size={24} color={theme.error} />
              <Text style={[styles.deleteText, { color: theme.error }]}>
                {isDeleting ? 'Deleting...' : 'Delete card'}
              </Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>

      {/* Fullscreen Barcode Overlay (AC6) */}
      <FullscreenBarcode
        card={card}
        visible={fullscreenVisible}
        onClose={handleCloseFullscreen}
        onCopy={onCopy}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  contentContainer: {
    // No horizontal padding — hero is full-width
  },
  // Barcode Section (AC2)
  barcodeSection: {
    alignItems: 'center',
    paddingHorizontal: LAYOUT.screenHorizontalMargin,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md
  },
  barcodeCard: {
    padding: SPACING.md,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    width: '100%'
  },
  barcodeNumber: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    textAlign: 'center',
    marginTop: SPACING.sm,
    letterSpacing: 2
  },
  barcodeHint: {
    ...TYPOGRAPHY.caption1,
    marginTop: SPACING.xs
  },
  brightnessHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: SPACING.md
  },
  brightnessText: {
    ...TYPOGRAPHY.footnote
  },
  pressed: {
    opacity: 0.7
  },
  // Info Section (AC3)
  infoSection: {
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    marginHorizontal: LAYOUT.screenHorizontalMargin,
    marginTop: SPACING.md,
    marginBottom: SPACING.lg
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8
  },
  // Manage Section (AC4)
  manageSection: {
    paddingHorizontal: LAYOUT.screenHorizontalMargin,
    gap: SPACING.sm
  },
  sectionHeader: {
    ...TYPOGRAPHY.footnote,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.xs
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: SPACING.md
  },
  deleteRow: {
    minHeight: TOUCH_TARGET.min,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center'
  },
  deleteRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  deleteText: {
    fontSize: 16,
    fontWeight: '500'
  }
});
