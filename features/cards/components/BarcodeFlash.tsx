/**
 * BarcodeFlash Component
 * Story 2.5: Display Barcode (Barcode Flash)
 *
 * Full-screen barcode overlay optimized for scanning at checkout.
 * Features:
 * - White background for maximum contrast
 * - Centered, large barcode
 * - Card name above barcode
 * - Barcode number below (copyable)
 * - Auto-maximizes screen brightness
 * - Dismissible via tap or swipe
 */

import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect } from 'react';
import { Dimensions, Platform, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';

import type { LoyaltyCard } from '@/core/schemas';

import { BarcodeRenderer } from './BarcodeRenderer';
import { useBrightness } from '../hooks/useBrightness';

/**
 * Props for BarcodeFlash component
 */
export interface BarcodeFlashProps {
  /** The card to display */
  card: LoyaltyCard;
  /** Callback when overlay should be dismissed */
  onDismiss: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * BarcodeFlash Component
 *
 * Displays a full-screen barcode optimized for scanning.
 * Automatically maximizes brightness and restores on dismiss.
 *
 * @example
 * ```tsx
 * <BarcodeFlash card={card} onDismiss={handleDismiss} />
 * ```
 */
export function BarcodeFlash({ card, onDismiss }: BarcodeFlashProps) {
  const { maximize, restore } = useBrightness();

  // Animation values
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(0);

  // Maximize brightness on mount, restore on unmount
  useEffect(() => {
    maximize();
    // Fade in animation
    opacity.value = withTiming(1, { duration: 200 });

    return () => {
      restore();
    };
  }, [maximize, restore, opacity]);

  // Handle dismiss with animation
  const handleDismiss = useCallback(() => {
    opacity.value = withTiming(0, { duration: 150 }, () => {
      runOnJS(onDismiss)();
    });
  }, [onDismiss, opacity]);

  // Handle swipe down dismiss
  const handleSwipeDismiss = useCallback(() => {
    translateY.value = withTiming(SCREEN_HEIGHT, { duration: 200 }, () => {
      runOnJS(onDismiss)();
    });
  }, [onDismiss, translateY]);

  // Copy barcode number to clipboard
  const handleCopyBarcode = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(card.barcode);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.warn('Failed to copy barcode:', error);
    }
  }, [card.barcode]);

  // Pan gesture for swipe to dismiss
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      // Only allow downward swipe
      if (event.translationY > 0) {
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      // If swiped more than 100px or velocity is high, dismiss
      if (event.translationY > 100 || event.velocityY > 500) {
        runOnJS(handleSwipeDismiss)();
      } else {
        // Spring back to original position
        translateY.value = withTiming(0, { duration: 150 });
      }
    });

  // Animated styles
  const animatedContainerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }]
  }));

  // Calculate barcode size based on format
  const isQR = card.barcodeFormat === 'QR';
  const barcodeWidth = isQR ? 200 : Math.min(SCREEN_WIDTH * 0.8, 320);
  const barcodeHeight = isQR ? 200 : 120;

  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.container, animatedContainerStyle]}>
          <Pressable
            style={styles.pressable}
            onPress={handleDismiss}
            accessibilityLabel="Dismiss barcode overlay"
            accessibilityHint="Tap anywhere to close"
            accessibilityRole="button"
          >
            <View style={styles.content}>
              {/* Card Name */}
              <Text style={styles.cardName} accessibilityRole="header" numberOfLines={2}>
                {card.name}
              </Text>

              {/* Barcode */}
              <View style={styles.barcodeContainer}>
                <BarcodeRenderer
                  value={card.barcode}
                  format={card.barcodeFormat}
                  width={barcodeWidth}
                  height={barcodeHeight}
                  color="#000000"
                  backgroundColor="#FFFFFF"
                />
              </View>

              {/* Barcode Number (copyable) */}
              <Pressable
                onLongPress={handleCopyBarcode}
                accessibilityLabel={`Barcode number: ${card.barcode}. Long press to copy.`}
                accessibilityHint="Long press to copy barcode to clipboard"
                accessibilityRole="text"
              >
                <Text style={styles.barcodeNumber} selectable>
                  {card.barcode}
                </Text>
              </Pressable>

              {/* Hint text */}
              <Text style={styles.hintText}>Tap anywhere to close</Text>
            </View>
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  pressable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    // Ensure content respects safe areas but background covers full screen
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    maxWidth: '100%'
  },
  cardName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: '100%'
  },
  barcodeContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    // Subtle shadow for definition
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  barcodeNumber: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#1F2937',
    textAlign: 'center',
    marginTop: 16,
    letterSpacing: 1
  },
  hintText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 40
  }
});
