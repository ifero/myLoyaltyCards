/**
 * CardDetails Component
 * Story 2.6: View Card Details
 *
 * Displays full details of a loyalty card including:
 * - Virtual Logo
 * - Card name
 * - Barcode preview (tappable to open Barcode Flash)
 * - Barcode number (copyable)
 * - Barcode format
 * - Card color indicator
 * - Date added
 * - Action buttons (Edit, Delete)
 */

import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LoyaltyCard, BarcodeFormat } from '@/core/schemas';

import { useTheme, CARD_COLORS, SAGE_COLORS } from '@/shared/theme';
import { SPACING, TOUCH_TARGET } from '@/shared/theme/spacing';

import { BarcodeRenderer } from './BarcodeRenderer';
import { DetailRow } from './DetailRow';
import { VirtualLogo } from './VirtualLogo';

interface CardDetailsProps {
  /** The loyalty card to display */
  card: LoyaltyCard;
  /** Callback when copy is successful - for toast notifications */
  onCopy?: () => void;
}

/**
 * Human-readable barcode format names
 */
const BARCODE_FORMAT_LABELS: Record<BarcodeFormat, string> = {
  CODE128: 'Code 128',
  EAN13: 'EAN-13',
  EAN8: 'EAN-8',
  QR: 'QR Code',
  CODE39: 'Code 39',
  UPCA: 'UPC-A'
};

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
function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * CardDetails Component
 *
 * Full card details view with:
 * - Large Virtual Logo at top (120px)
 * - Card name prominently displayed
 * - Tappable barcode preview that opens Barcode Flash
 * - Copyable barcode number
 * - Detail rows for format, color, and date
 * - Action buttons at bottom
 */
export const CardDetails: React.FC<CardDetailsProps> = ({ card, onCopy }) => {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

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
   * Open Barcode Flash (full-screen barcode view)
   */
  const handleOpenBarcodeFlash = useCallback(() => {
    router.push(`/barcode/${card.id}`);
  }, [router, card.id]);

  /**
   * Navigate to Edit Card screen (Story 2.7)
   */
  const handleEditCard = useCallback(() => {
    router.push(`/card/${card.id}/edit`);
  }, [router, card.id]);

  /**
   * Show delete confirmation (Story 2.8)
   */
  const handleDeleteCard = useCallback(() => {
    // Show confirmation dialog (will be fully implemented in Story 2.8)
    Alert.alert('Delete Card', `Are you sure you want to delete "${card.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          // Delete functionality coming in Story 2.8
          Alert.alert('Delete', 'Delete functionality coming in Story 2.8');
        }
      }
    ]);
  }, [card.name]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={[
        styles.contentContainer,
        { paddingBottom: insets.bottom + SPACING.lg }
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Card Visual - Virtual Logo */}
      <View style={styles.visualSection}>
        <VirtualLogo name={card.name} color={card.color} size={120} testID="card-details-logo" />
      </View>

      {/* Card Name */}
      <Text style={[styles.cardName, { color: theme.textPrimary }]} testID="card-details-name">
        {card.name}
      </Text>

      {/* Barcode Preview Section */}
      <View style={styles.barcodeSection}>
        <Pressable
          onPress={handleOpenBarcodeFlash}
          style={({ pressed }) => [
            styles.barcodePreview,
            { backgroundColor: '#FFFFFF' },
            pressed && styles.pressed
          ]}
          accessibilityRole="button"
          accessibilityLabel="View full screen barcode"
          accessibilityHint="Opens the barcode in full screen for scanning"
          testID="card-details-barcode-preview"
        >
          <BarcodeRenderer
            value={card.barcode}
            format={card.barcodeFormat}
            width={card.barcodeFormat === 'QR' ? 150 : 240}
            height={100}
          />
        </Pressable>
        <Text style={[styles.barcodeHint, { color: theme.textSecondary }]}>Tap to enlarge</Text>
      </View>

      {/* Details Section */}
      <View style={[styles.detailsSection, { backgroundColor: theme.surface }]}>
        {/* Barcode Number - Copyable */}
        <DetailRow
          label="Number"
          value={card.barcode}
          onPress={handleCopyBarcode}
          accessibilityHint="Double tap to copy barcode number"
          rightElement={<Text style={{ color: theme.primary, fontSize: 16 }}>📋</Text>}
          testID="card-details-barcode-number"
        />

        {/* Barcode Format */}
        <DetailRow
          label="Format"
          value={BARCODE_FORMAT_LABELS[card.barcodeFormat]}
          testID="card-details-format"
        />

        {/* Card Color */}
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

        {/* Date Added */}
        <DetailRow
          label="Added"
          value={formatDate(card.createdAt)}
          style={{ borderBottomWidth: 0 }}
          testID="card-details-date"
        />
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsSection}>
        {/* Edit Button */}
        <Pressable
          onPress={handleEditCard}
          style={({ pressed }) => [
            styles.editButton,
            { backgroundColor: SAGE_COLORS[500] },
            pressed && styles.pressed
          ]}
          accessibilityRole="button"
          accessibilityLabel="Edit card"
          testID="card-details-edit-button"
        >
          <Text style={styles.editButtonText}>Edit Card</Text>
        </Pressable>

        {/* Delete Button */}
        <Pressable
          onPress={handleDeleteCard}
          style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Delete card"
          testID="card-details-delete-button"
        >
          <Text style={styles.deleteButtonText}>Delete Card</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  contentContainer: {
    paddingHorizontal: SPACING.md
  },
  visualSection: {
    alignItems: 'center',
    marginTop: SPACING.lg,
    marginBottom: SPACING.md
  },
  cardName: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: SPACING.lg
  },
  barcodeSection: {
    alignItems: 'center',
    marginBottom: SPACING.lg
  },
  barcodePreview: {
    padding: SPACING.md,
    borderRadius: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  barcodeHint: {
    fontSize: 12,
    marginTop: SPACING.xs
  },
  pressed: {
    opacity: 0.7
  },
  detailsSection: {
    borderRadius: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8
  },
  actionsSection: {
    gap: SPACING.md
  },
  editButton: {
    height: TOUCH_TARGET.min + 4, // 48px
    borderRadius: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center'
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  },
  deleteButton: {
    height: TOUCH_TARGET.min + 4, // 48px
    borderRadius: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent'
  },
  deleteButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600'
  }
});
