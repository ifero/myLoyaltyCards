/**
 * BarcodeScanner Component
 * Story 2.3: Scan Barcode with Camera
 *
 * Full-screen camera viewfinder with barcode detection overlay.
 */

import { CameraView } from 'expo-camera';
import { useEffect, useCallback } from 'react';
import { View, Text, Pressable, Alert, Linking, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/shared/theme';

import { useBarcodeScanner, ScanResult } from '../hooks/useBarcodeScanner';

interface BarcodeScannerProps {
  onScan: (result: ScanResult) => void;
  onManualEntry: () => void;
  onError?: (error: string) => void;
}

/**
 * BarcodeScanner - Camera viewfinder with barcode detection
 *
 * Features per acceptance criteria:
 * - AC1: Camera viewfinder interface with "Enter Manually" button
 * - AC2: Camera permission request with helpful error message
 * - AC3: Live camera preview with viewfinder overlay and instructions
 * - AC4: Automatic barcode detection with haptic feedback
 * - AC7: Manual entry fallback button
 * - AC8: Error handling with retry option
 */
export function BarcodeScanner({ onScan, onManualEntry, onError }: BarcodeScannerProps) {
  const { theme } = useTheme();
  const {
    permission,
    hasScanned,
    error,
    handleBarcodeScanned,
    requestCameraPermission,
    reset,
    isReady
  } = useBarcodeScanner({
    onScan,
    enabled: true
  });

  /**
   * Handle permission denied - show helpful message with options
   */
  const handlePermissionDenied = () => {
    Alert.alert(
      'Camera Access Needed',
      'Camera access is needed to scan barcodes.\n\nYou can enable it in Settings, or enter the barcode manually.',
      [
        {
          text: 'Enter Manually',
          style: 'cancel',
          onPress: onManualEntry
        },
        {
          text: 'Open Settings',
          onPress: async () => {
            await Linking.openSettings();
          }
        }
      ],
      { cancelable: true }
    );
  };

  // Request permission on mount if not granted
  const handleRequestPermission = useCallback(async () => {
    const granted = await requestCameraPermission();
    if (!granted) {
      handlePermissionDenied();
      onError?.('Camera permission denied');
    }
  }, [requestCameraPermission, onError]);

  // Request permission on mount when permission status is null
  useEffect(() => {
    if (permission === null) {
      handleRequestPermission();
    }
  }, [permission, handleRequestPermission]);

  // Show permission request UI
  if (permission === null) {
    // Permission status is still loading
    return (
      <SafeAreaView
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: theme.background }}
      >
        <Text style={{ color: theme.textPrimary }}>Checking camera permission...</Text>
      </SafeAreaView>
    );
  }

  if (permission.granted === false) {
    // Permission denied - show error state
    return (
      <SafeAreaView
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: theme.background }}
      >
        <View className="items-center">
          <Text className="mb-2 text-6xl">📷</Text>
          <Text
            className="mb-1 text-center text-xl font-semibold"
            style={{ color: theme.textPrimary }}
          >
            Camera Access Needed
          </Text>
          <Text className="mb-6 text-center text-sm" style={{ color: theme.textSecondary }}>
            Camera access is needed to scan barcodes.{'\n'}You can enable it in Settings, or enter
            the barcode manually.
          </Text>
          <View className="w-full gap-3">
            <Pressable
              onPress={async () => {
                await Linking.openSettings();
              }}
              className="h-12 items-center justify-center rounded-lg"
              style={{ backgroundColor: theme.primary }}
              accessibilityRole="button"
              accessibilityLabel="Open Settings"
            >
              <Text className="text-base font-semibold text-white">Open Settings</Text>
            </Pressable>
            <Pressable
              onPress={onManualEntry}
              className="h-12 items-center justify-center rounded-lg border"
              style={{
                borderColor: theme.border,
                backgroundColor: theme.surface
              }}
              accessibilityRole="button"
              accessibilityLabel="Enter Manually"
            >
              <Text className="text-base font-semibold" style={{ color: theme.textPrimary }}>
                Enter Manually
              </Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Show error state if camera error occurred
  if (error && !isReady) {
    return (
      <SafeAreaView
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: theme.background }}
      >
        <View className="items-center">
          <Text className="mb-2 text-6xl">⚠️</Text>
          <Text
            className="mb-1 text-center text-xl font-semibold"
            style={{ color: theme.textPrimary }}
          >
            Camera Error
          </Text>
          <Text className="mb-6 text-center text-sm" style={{ color: theme.textSecondary }}>
            {error || 'Camera error. Please try again.'}
          </Text>
          <View className="w-full gap-3">
            <Pressable
              onPress={() => {
                reset();
                handleRequestPermission();
              }}
              className="h-12 items-center justify-center rounded-lg"
              style={{ backgroundColor: theme.primary }}
              accessibilityRole="button"
              accessibilityLabel="Retry"
            >
              <Text className="text-base font-semibold text-white">Retry</Text>
            </Pressable>
            <Pressable
              onPress={onManualEntry}
              className="h-12 items-center justify-center rounded-lg border"
              style={{
                borderColor: theme.border,
                backgroundColor: theme.surface
              }}
              accessibilityRole="button"
              accessibilityLabel="Enter Manually"
            >
              <Text className="text-base font-semibold" style={{ color: theme.textPrimary }}>
                Enter Manually
              </Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Camera is ready - show viewfinder
  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: '#000' }} edges={['top', 'bottom']}>
      <View className="flex-1">
        {/* Camera View - AC3 */}
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ['code128', 'ean13', 'ean8', 'qr', 'code39', 'upc_a']
          }}
          onBarcodeScanned={hasScanned ? undefined : handleBarcodeScanned}
        />

        {/* Viewfinder Overlay - AC3 */}
        <View className="flex-1 items-center justify-center">
          {/* Semi-transparent overlay around viewfinder */}
          <View className="absolute inset-0" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
            {/* Viewfinder cutout - 70% screen width, centered */}
            <View
              className="absolute left-1/2 top-1/2"
              style={{
                width: '70%',
                aspectRatio: 1,
                marginLeft: '-35%',
                marginTop: '-35%',
                borderWidth: 2,
                borderColor: '#fff',
                borderRadius: 16,
                backgroundColor: 'transparent'
              }}
            />
          </View>

          {/* Instructional text - AC3 */}
          <View className="absolute top-1/4 w-full px-6">
            <Text
              className="text-center text-base font-medium"
              style={{
                color: '#fff',
                textShadowColor: 'rgba(0, 0, 0, 0.75)',
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 3
              }}
            >
              Point camera at barcode
            </Text>
          </View>
        </View>

        {/* Manual Entry Button - AC1, AC7 */}
        <View className="absolute bottom-0 left-0 right-0 px-6 pb-6" style={{ paddingBottom: 48 }}>
          <Pressable
            onPress={onManualEntry}
            className="h-12 items-center justify-center rounded-lg border-2"
            style={{
              borderColor: '#fff',
              backgroundColor: 'rgba(255, 255, 255, 0.1)'
            }}
            accessibilityRole="button"
            accessibilityLabel="Enter Manually"
          >
            <Text className="text-base font-semibold text-white">Enter Manually</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
