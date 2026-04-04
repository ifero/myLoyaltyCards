/**
 * FullscreenBarcode Component
 * Story 13.3: Restyle Card Detail Screen (AC6)
 *
 * Fullscreen barcode overlay with white background for scanner readability.
 * - White bg even in dark mode
 * - MI: close icon to dismiss
 * - Barcode at maximum width
 * - Spaced barcode number
 * - Brightness hint
 */

import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions
} from 'react-native';

import type { LoyaltyCard } from '@/core/schemas';

import { TOUCH_TARGET } from '@/shared/theme/spacing';

import { BarcodeRenderer } from './BarcodeRenderer';
import { useBrightness } from '../hooks/useBrightness';
import { formatBarcodeNumber } from '../utils/formatBarcode';

interface FullscreenBarcodeProps {
  card: LoyaltyCard;
  visible: boolean;
  onClose: () => void;
  onCopy?: () => void;
}

export const FullscreenBarcode: React.FC<FullscreenBarcodeProps> = ({
  card,
  visible,
  onClose,
  onCopy
}) => {
  const { width: screenWidth } = useWindowDimensions();
  const { maximize, restore } = useBrightness();

  useEffect(() => {
    if (visible) {
      maximize();
    }
    return () => {
      if (visible) {
        restore();
      }
    };
  }, [visible, maximize, restore]);

  const handleCopyBarcode = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(card.barcode);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onCopy?.();
    } catch (error) {
      console.warn('Failed to copy barcode:', error);
    }
  }, [card.barcode, onCopy]);

  const isQR = card.barcodeFormat === 'QR';
  const barcodeWidth = isQR ? 240 : Math.min(screenWidth - 48, 360);
  const barcodeHeight = isQR ? 240 : 140;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      statusBarTranslucent
      testID="fullscreen-barcode-modal"
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.container}>
        {/* Close button */}
        <Pressable
          onPress={onClose}
          style={styles.closeButton}
          accessibilityRole="button"
          accessibilityLabel="Close fullscreen barcode"
          testID="fullscreen-barcode-close"
          hitSlop={8}
        >
          <MaterialIcons name="close" size={28} color="#333333" />
        </Pressable>

        <View style={styles.content}>
          {/* Card Name */}
          <Text style={styles.cardName} numberOfLines={2} accessibilityRole="header">
            {card.name}
          </Text>

          {/* Barcode */}
          <View style={styles.barcodeCard}>
            <BarcodeRenderer
              value={card.barcode}
              format={card.barcodeFormat}
              width={barcodeWidth}
              height={barcodeHeight}
              color="#000000"
              backgroundColor="#FFFFFF"
            />
          </View>

          {/* Barcode Number */}
          <Pressable
            onPress={handleCopyBarcode}
            accessibilityRole="button"
            accessibilityLabel={`Barcode: ${card.barcode}. Tap to copy.`}
            accessibilityHint="Tap to copy barcode to clipboard"
            testID="fullscreen-barcode-number"
          >
            <Text style={styles.barcodeNumber}>{formatBarcodeNumber(card.barcode)}</Text>
          </Pressable>

          {/* Brightness Hint */}
          <View style={styles.brightnessHint} testID="fullscreen-barcode-brightness-hint">
            <MaterialIcons name="light-mode" size={20} color="#9CA3AF" />
            <Text style={styles.brightnessText}>Increase brightness for scanning</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 16,
    right: 16,
    zIndex: 10,
    width: TOUCH_TARGET.min,
    height: TOUCH_TARGET.min,
    alignItems: 'center',
    justifyContent: 'center'
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24
  },
  cardName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 32,
    maxWidth: '100%'
  },
  barcodeCard: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    alignItems: 'center'
  },
  barcodeNumber: {
    fontSize: 18,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#1F2937',
    textAlign: 'center',
    marginTop: 20,
    letterSpacing: 2
  },
  brightnessHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 40
  },
  brightnessText: {
    fontSize: 14,
    color: '#9CA3AF'
  }
});
