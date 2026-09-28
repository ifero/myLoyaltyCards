/**
 * BarcodeScanner Component
 * Story 2.3: Scan Barcode with Camera
 *
 * Full-screen camera viewfinder with barcode detection overlay.
 */

import { MaterialIcons } from '@expo/vector-icons';
import { CameraView } from 'expo-camera';
import { useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, Pressable, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native-unistyles';

import { useTheme } from '@/shared/theme';
import { TYPOGRAPHY } from '@/shared/theme/typography';

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
  const { t } = useTranslation();
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
  const handlePermissionDenied = useCallback(() => {
    Alert.alert(
      t('addCard.scanner.cameraAccessTitle'),
      t('addCard.scanner.cameraAccessBody'),
      [
        {
          text: t('addCard.scanner.manualEntry'),
          style: 'cancel',
          onPress: onManualEntry
        },
        {
          text: t('common.actions.openSettings'),
          onPress: async () => {
            await Linking.openSettings();
          }
        }
      ],
      { cancelable: true }
    );
  }, [t, onManualEntry]);

  // Request permission on mount if not granted
  const handleRequestPermission = useCallback(async () => {
    const granted = await requestCameraPermission();
    if (!granted) {
      handlePermissionDenied();
      onError?.(t('addCard.scanner.cameraPermissionDeniedError'));
    }
  }, [handlePermissionDenied, onError, requestCameraPermission, t]);

  // Request permission on mount when permission status is null
  useEffect(() => {
    if (permission === null) {
      handleRequestPermission();
    }
  }, [permission, handleRequestPermission]);

  // Show permission request UI.
  // `&& !error` matters: when `requestPermission()` REJECTS — the OS never answers,
  // as opposed to denying — the hook sets `error` but `permission` stays null. Without
  // this guard that state renders the loading string forever, with no retry and no
  // manual-entry escape, and the error branch below is unreachable. See the tests.
  if (permission === null && !error) {
    // Permission status is still loading
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: theme.background }]}>
        <Text style={{ ...TYPOGRAPHY.bodyMd, color: theme.textPrimary }}>
          {t('addCard.scanner.checkingPermission')}
        </Text>
      </SafeAreaView>
    );
  }

  if (permission?.granted === false) {
    // Permission denied - show error state
    return (
      <SafeAreaView style={[styles.centeredPadded, { backgroundColor: theme.background }]}>
        <View style={styles.contentCenter}>
          <MaterialIcons
            name="photo-camera"
            size={48}
            color={theme.textSecondary}
            style={{ marginBottom: 8 }}
          />
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            {t('addCard.scanner.cameraAccessTitle')}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {t('addCard.scanner.cameraAccessBody')}
          </Text>
          <View style={styles.buttonGroup}>
            <Pressable
              onPress={async () => {
                await Linking.openSettings();
              }}
              style={[styles.button, { backgroundColor: theme.primary }]}
              accessibilityRole="button"
              accessibilityLabel={t('common.actions.openSettings')}
            >
              <Text style={[styles.buttonLabelWhite, { color: theme.onPrimary }]}>
                {t('common.actions.openSettings')}
              </Text>
            </Pressable>
            <Pressable
              onPress={onManualEntry}
              style={[
                styles.buttonOutlined,
                { borderColor: theme.border, backgroundColor: theme.surface }
              ]}
              accessibilityRole="button"
              accessibilityLabel={t('addCard.scanner.manualEntryAccessibilityLabel')}
            >
              <Text style={[styles.buttonLabel, { color: theme.textPrimary }]}>
                {t('addCard.scanner.manualEntry')}
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
      <SafeAreaView style={[styles.centeredPadded, { backgroundColor: theme.background }]}>
        <View style={styles.contentCenter}>
          <MaterialIcons
            name="error-outline"
            size={48}
            color={theme.error}
            style={{ marginBottom: 8 }}
          />
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            {t('addCard.scanner.cameraErrorTitle')}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {error || t('addCard.scanner.cameraErrorFallback')}
          </Text>
          <View style={styles.buttonGroup}>
            <Pressable
              onPress={() => {
                reset();
                handleRequestPermission();
              }}
              style={[styles.button, { backgroundColor: theme.primary }]}
              accessibilityRole="button"
              accessibilityLabel={t('common.actions.retry')}
            >
              <Text style={[styles.buttonLabelWhite, { color: theme.onPrimary }]}>
                {t('common.actions.retry')}
              </Text>
            </Pressable>
            <Pressable
              onPress={onManualEntry}
              style={[
                styles.buttonOutlined,
                { borderColor: theme.border, backgroundColor: theme.surface }
              ]}
              accessibilityRole="button"
              accessibilityLabel={t('addCard.scanner.manualEntryAccessibilityLabel')}
            >
              <Text style={[styles.buttonLabel, { color: theme.textPrimary }]}>
                {t('addCard.scanner.manualEntry')}
              </Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Camera is ready - show viewfinder
  return (
    <SafeAreaView style={[styles.flex1, { backgroundColor: '#000' }]} edges={['top', 'bottom']}>
      <View style={styles.cameraRoot}>
        {/* Camera View - AC3 */}
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ['code128', 'ean13', 'ean8', 'qr', 'code39', 'upc_a']
          }}
          onBarcodeScanned={hasScanned ? undefined : handleBarcodeScanned}
        />

        {/* Viewfinder Overlay - AC3: a full-screen layer, so the cutout stays centred on it */}
        <View style={[StyleSheet.absoluteFill, styles.viewfinderLayer]}>
          {/* Semi-transparent overlay around viewfinder */}
          <View style={styles.dimOverlay}>
            {/* Viewfinder cutout - 70% screen width, centered */}
            <View style={styles.viewfinderCutout} />
          </View>

          {/* Instructional text - AC3 */}
          <View style={styles.instructionWrap}>
            <Text style={styles.instructionText}>{t('addCard.scanner.instruction')}</Text>
          </View>
        </View>

        {/* Manual Entry Button - AC1, AC7. The root's one in-flow child, anchored by its
            `justifyContent: 'flex-end'` — never `position: absolute` (Story 22.1, AC9). */}
        <View testID="barcode-scanner-bottom-bar" style={styles.bottomBar}>
          <Pressable
            onPress={onManualEntry}
            style={styles.manualEntryButton}
            accessibilityRole="button"
            accessibilityLabel={t('addCard.scanner.manualEntryAccessibilityLabel')}
          >
            <Text style={styles.buttonLabelWhite}>{t('addCard.scanner.manualEntry')}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: {
    flex: 1
  },
  cameraRoot: {
    flex: 1,
    justifyContent: 'flex-end'
  },
  viewfinderLayer: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  centeredPadded: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 48
  },
  contentCenter: {
    alignItems: 'center'
  },
  title: {
    ...TYPOGRAPHY.headlineSm,
    marginBottom: 8,
    textAlign: 'center'
  },
  subtitle: {
    ...TYPOGRAPHY.bodyMd,
    marginBottom: 48,
    textAlign: 'center'
  },
  buttonGroup: {
    width: '100%',
    gap: 24
  },
  button: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8
  },
  buttonOutlined: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1
  },
  buttonLabelWhite: {
    ...TYPOGRAPHY.bodyLgStrong,
    color: '#FFFFFF'
  },
  buttonLabel: {
    ...TYPOGRAPHY.bodyLgStrong
  },
  dimOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)'
  },
  viewfinderCutout: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: '70%',
    aspectRatio: 1,
    marginLeft: '-35%',
    marginTop: '-35%',
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 16,
    backgroundColor: 'transparent'
  },
  instructionWrap: {
    position: 'absolute',
    top: '25%',
    width: '100%',
    paddingHorizontal: 48
  },
  instructionText: {
    ...TYPOGRAPHY.bodyMdStrong,
    textAlign: 'center',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3
  },
  bottomBar: {
    paddingHorizontal: 48,
    paddingBottom: 48
  },
  manualEntryButton: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: 'rgba(255, 255, 255, 0.1)'
  }
});
