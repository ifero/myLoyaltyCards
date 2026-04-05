/**
 * ScannerOverlay Component
 * Story 13.4: Restyle Add Card Flow (AC3)
 *
 * Full-bleed camera viewfinder with white corner brackets and blue scan line.
 * Renders a CameraView with the barcode scanner hook and visual decorations.
 */

import { MaterialIcons } from '@expo/vector-icons';
import { CameraView } from 'expo-camera';
import React, { useEffect } from 'react';
import { View, Text, Pressable, Linking, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/shared/components/ui/Button';
import { useTheme } from '@/shared/theme';
import { SPACING, TOUCH_TARGET } from '@/shared/theme/spacing';

import { useBarcodeScanner, ScanResult } from '@/features/cards/hooks/useBarcodeScanner';

import { FloatingBackButton } from './FloatingBackButton';

interface ScannerOverlayProps {
  onScan: (result: ScanResult) => void;
  onManualEntry: () => void;
  onBack: () => void;
  brandPill?: React.ReactNode;
  testID?: string;
}

const VIEWFINDER_WIDTH_RATIO = 0.7;
const CORNER_SIZE = 32;
const CORNER_THICKNESS = 4;
const CORNER_RADIUS = 12;

/** White corner brackets for the viewfinder */
const ViewfinderCorners: React.FC<{ size: number }> = ({ size }) => {
  const cornerStyle = {
    position: 'absolute' as const,
    width: CORNER_SIZE,
    height: CORNER_SIZE
  };

  return (
    <View
      style={{
        width: size,
        height: size,
        alignSelf: 'center'
      }}
    >
      {/* Top-left */}
      <View
        style={[
          cornerStyle,
          {
            top: 0,
            left: 0,
            borderTopWidth: CORNER_THICKNESS,
            borderLeftWidth: CORNER_THICKNESS,
            borderColor: '#FFFFFF',
            borderTopLeftRadius: CORNER_RADIUS
          }
        ]}
      />
      {/* Top-right */}
      <View
        style={[
          cornerStyle,
          {
            top: 0,
            right: 0,
            borderTopWidth: CORNER_THICKNESS,
            borderRightWidth: CORNER_THICKNESS,
            borderColor: '#FFFFFF',
            borderTopRightRadius: CORNER_RADIUS
          }
        ]}
      />
      {/* Bottom-left */}
      <View
        style={[
          cornerStyle,
          {
            bottom: 0,
            left: 0,
            borderBottomWidth: CORNER_THICKNESS,
            borderLeftWidth: CORNER_THICKNESS,
            borderColor: '#FFFFFF',
            borderBottomLeftRadius: CORNER_RADIUS
          }
        ]}
      />
      {/* Bottom-right */}
      <View
        style={[
          cornerStyle,
          {
            bottom: 0,
            right: 0,
            borderBottomWidth: CORNER_THICKNESS,
            borderRightWidth: CORNER_THICKNESS,
            borderColor: '#FFFFFF',
            borderBottomRightRadius: CORNER_RADIUS
          }
        ]}
      />
    </View>
  );
};

/** Animated blue scan line */
const ScanLine: React.FC<{ viewfinderSize: number }> = ({ viewfinderSize }) => {
  const { theme } = useTheme();
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withRepeat(
      withTiming(viewfinderSize - 4, {
        duration: 2000,
        easing: Easing.inOut(Easing.ease)
      }),
      -1,
      true
    );
  }, [viewfinderSize, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }]
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: 8,
          right: 8,
          height: 2,
          backgroundColor: theme.primary,
          borderRadius: 1,
          top: 0
        },
        animatedStyle
      ]}
    />
  );
};

export const ScannerOverlay: React.FC<ScannerOverlayProps> = ({
  onScan,
  onManualEntry,
  onBack,
  brandPill,
  testID = 'scanner-overlay'
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const viewfinderSize = screenWidth * VIEWFINDER_WIDTH_RATIO;

  const {
    permission,
    hasScanned,
    error,
    handleBarcodeScanned,
    requestCameraPermission,
    reset,
    isReady
  } = useBarcodeScanner({ onScan, enabled: true });

  // Request permission on mount
  useEffect(() => {
    if (permission === null) {
      requestCameraPermission();
    }
  }, [permission, requestCameraPermission]);

  // Permission denied state
  if (permission && !permission.granted) {
    return (
      <View testID={testID} style={[styles.container, { backgroundColor: theme.background }]}>
        <FloatingBackButton onPress={onBack} style={{ top: insets.top + SPACING.sm }} />
        <View style={styles.centeredContent}>
          <MaterialIcons name="no-photography" size={48} color={theme.textSecondary} />
          <Text
            style={[styles.permissionTitle, { color: theme.textPrimary }]}
            accessibilityRole="header"
          >
            Camera Access Needed
          </Text>
          <Text style={[styles.permissionBody, { color: theme.textSecondary }]}>
            Camera access is needed to scan barcodes.{'\n'}You can enable it in Settings, or enter
            the barcode manually.
          </Text>
          <View style={styles.permissionActions}>
            <Button
              variant="primary"
              onPress={() => Linking.openSettings()}
              testID="open-settings-button"
            >
              Open Settings
            </Button>
            <Button variant="secondary" onPress={onManualEntry} testID="manual-entry-button">
              Enter Manually
            </Button>
          </View>
        </View>
      </View>
    );
  }

  // Error state
  if (error && !isReady) {
    return (
      <View testID={testID} style={[styles.container, { backgroundColor: theme.background }]}>
        <FloatingBackButton onPress={onBack} style={{ top: insets.top + SPACING.sm }} />
        <View style={styles.centeredContent}>
          <MaterialIcons name="error-outline" size={48} color={theme.error} />
          <Text style={[styles.permissionTitle, { color: theme.textPrimary }]}>Camera Error</Text>
          <Text style={[styles.permissionBody, { color: theme.textSecondary }]}>{error}</Text>
          <View style={styles.permissionActions}>
            <Button
              variant="primary"
              onPress={() => {
                reset();
                requestCameraPermission();
              }}
              testID="retry-button"
            >
              Retry
            </Button>
            <Button
              variant="secondary"
              onPress={onManualEntry}
              testID="manual-entry-fallback-button"
            >
              Enter Manually
            </Button>
          </View>
        </View>
      </View>
    );
  }

  // Camera ready — full-bleed scanner
  return (
    <View testID={testID} style={styles.container}>
      {/* Full-bleed camera */}
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['code128', 'ean13', 'ean8', 'qr', 'code39', 'upc_a']
        }}
        onBarcodeScanned={hasScanned ? undefined : handleBarcodeScanned}
      />

      {/* Semi-transparent overlay */}
      <View style={[StyleSheet.absoluteFill, styles.overlay]} />

      {/* Floating back button */}
      <FloatingBackButton onPress={onBack} style={{ top: insets.top + SPACING.sm }} />

      {/* Brand pill (if brand context) */}
      {brandPill && (
        <View
          style={[
            styles.brandPillContainer,
            { top: insets.top + SPACING.sm + TOUCH_TARGET.min + SPACING.md }
          ]}
        >
          {brandPill}
        </View>
      )}

      {/* Viewfinder area */}
      <View style={styles.viewfinderContainer}>
        <View style={{ width: viewfinderSize, height: viewfinderSize }}>
          <ViewfinderCorners size={viewfinderSize} />
          <ScanLine viewfinderSize={viewfinderSize} />
        </View>
        <Text style={styles.instructionText}>Point camera at barcode</Text>
      </View>

      {/* Bottom action: manual entry */}
      <View style={[styles.bottomActions, { paddingBottom: insets.bottom + SPACING.md }]}>
        <Pressable
          onPress={onManualEntry}
          style={styles.manualEntryRow}
          accessibilityRole="button"
          accessibilityLabel="Enter card number manually"
          testID="manual-entry-row"
        >
          <MaterialIcons name="keyboard" size={24} color="#FFFFFF" />
          <Text style={styles.manualEntryText}>Enter card number manually</Text>
          <MaterialIcons name="chevron-right" size={24} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000'
  },
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)'
  },
  brandPillContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10
  },
  viewfinderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16
  },
  instructionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    marginTop: 16
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24
  },
  manualEntryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: TOUCH_TARGET.min,
    gap: 12
  },
  manualEntryText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500'
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 8
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 16
  },
  permissionBody: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16
  },
  permissionActions: {
    width: '100%',
    gap: 12
  }
});
