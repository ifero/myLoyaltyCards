/**
 * ScannerOverlay Component
 * Story 13.4: Restyle Add Card Flow (AC3)
 * Story 22.1: Viewfinder shaped to the expected format (16.31); banner clear of the actions
 *             (16.30); the action stack in flow, never absolute (AC9)
 *
 * Full-bleed camera viewfinder with white corner brackets and a beam scan line.
 * Renders a CameraView with the barcode scanner hook and visual decorations.
 */

import { MaterialIcons } from '@expo/vector-icons';
import { CameraView } from 'expo-camera';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  Pressable,
  Linking,
  Platform,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
  type LayoutChangeEvent
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BarcodeFormat } from '@/core/schemas';
import { logger } from '@/core/utils';

import { Button } from '@/shared/components/ui/Button';
import { useTheme } from '@/shared/theme';
import { IDENTITY_COLORS } from '@/shared/theme/colors';
import { LAYOUT, SPACING, TOUCH_TARGET } from '@/shared/theme/spacing';
import { TYPOGRAPHY } from '@/shared/theme/typography';

import { useBarcodeScanner, ScanResult } from '@/features/cards/hooks/useBarcodeScanner';

import { FloatingBackButton } from './FloatingBackButton';
import { NoCodeFoundBanner } from './NoCodeFoundBanner';
import type { ImageScanErrorReason } from '../hooks/useImageScan';

interface ScannerOverlayProps {
  onScan: (result: ScanResult) => void;
  onManualEntry: () => void;
  onBack: () => void;
  brandPill?: React.ReactNode;
  testID?: string;
  /** When provided, a 'Scan from image' row is shown in the bottom actions */
  onImageScan?: () => void;
  /** Shows a centered ActivityIndicator over the viewfinder while an image is being decoded */
  isProcessingImage?: boolean;
  /** Shows the NoCodeFoundBanner when true */
  imageError?: boolean;
  /**
   * Which failure the banner should describe (Story 16.23). Omitted falls back
   * to the banner's own `notFound` default.
   */
  imageErrorReason?: ImageScanErrorReason;
  onImageErrorDismiss?: () => void;
  onImageErrorRetry?: () => void;
  onImageErrorManualEntry?: () => void;
  /**
   * Optional catalogue-driven format hint forwarded to the scanner hook so a
   * stripped EAN-13 leading zero can be auto-restored.
   */
  expectedFormat?: BarcodeFormat;
}

/**
 * Classify an `onMountError` message into a bounded, indexable Sentry tag.
 *
 * `CameraMountError` carries a `message` and nothing else — `expo-camera` provides
 * no error code — so a prefix match is the only classification available. It is
 * still worth doing rather than forwarding the raw string: the message is free
 * text from a third party, and one of `expo-camera`'s four emitters interpolates
 * an `AVError` description into it. That is harmless today, but "safe because of
 * what this version happens to interpolate" is not the same as safe by
 * construction, and tag values are the one field the PII scrubber never touches.
 *
 * Prefixes verified against `expo-camera`'s own emitters — `CameraSessionManager`
 * (iOS) and `ExpoCameraView` (Android). An unrecognised message reports `'other'`,
 * which is itself the signal that upstream changed and this list needs revisiting.
 *
 * ⚠️ These prefixes are duplicated, deliberately, in two other places that must
 * move with them: `EXPECTED_STRINGS` in `scripts/verify-native-strings.mjs` (the
 * gate asserting they still exist upstream) and the classification cases in
 * `ScannerOverlay.test.tsx`. Nothing links the three mechanically — a shared
 * constant would have to span a component and a bare-Node script — so changing a
 * prefix here means changing all three.
 */
const classifyMountError = (
  message: string
): 'in-use' | 'permission' | 'session-reset' | 'start-failed' | 'other' => {
  if (message.startsWith('Camera component could not be rendered')) return 'in-use';
  if (message.startsWith('Camera permissions not granted')) return 'permission';
  if (message.startsWith('Camera session was reset')) return 'session-reset';
  if (message.startsWith('Camera could not be started')) return 'start-failed';
  return 'other';
};

/**
 * Which rectangle each symbology needs (Story 16.31, via 22.1). A `Record` over the whole union,
 * so a new format is a compile error here until someone decides its shape.
 */
const VIEWFINDER_SHAPE: Record<BarcodeFormat, 'wide' | 'square'> = {
  EAN13: 'wide',
  EAN8: 'wide',
  CODE128: 'wide',
  CODE39: 'wide',
  UPCA: 'wide',
  QR: 'square'
};

/**
 * The wide frame: 300 × 120 at the capture frame's 393pt — an EAN-13 is ~4.75 : 1, and a
 * viewfinder teaches people to fill it, so a square one sends them backing away from a linear
 * code until it is small. Derived from the width rather than copied, so it scales.
 */
const WIDE_WIDTH_RATIO = 300 / 393;
const WIDE_ASPECT = 300 / 120;

/** The square frame, for QR: the 70 % of the width every format used to get. */
const SQUARE_WIDTH_RATIO = 0.7;

export type ViewfinderSize = { width: number; height: number };

/**
 * The viewfinder's rectangle for the code about to be scanned. With no expected format — the
 * custom-card path enters with no brand — it is the WIDE one, because linear formats are the
 * large majority of the catalogue.
 */
export const getViewfinderSize = (
  screenWidth: number,
  expectedFormat: BarcodeFormat | undefined
): ViewfinderSize => {
  const shape = expectedFormat ? VIEWFINDER_SHAPE[expectedFormat] : 'wide';

  if (shape === 'square') {
    const side = Math.round(screenWidth * SQUARE_WIDTH_RATIO);
    return { width: side, height: side };
  }

  const width = Math.round(screenWidth * WIDE_WIDTH_RATIO);
  return { width, height: Math.round(width / WIDE_ASPECT) };
};

const CORNER_SIZE = 32;
const CORNER_THICKNESS = 4;
const CORNER_RADIUS = 12;

/** The gap between the scan banner and the top of the action stack (capture frame E). */
const BANNER_GAP = SPACING.md;

/** White corner brackets for the viewfinder — corners only, whatever the rectangle. */
const ViewfinderCorners: React.FC<ViewfinderSize> = ({ width, height }) => {
  const cornerStyle = {
    position: 'absolute' as const,
    width: CORNER_SIZE,
    height: CORNER_SIZE
  };

  return (
    <View
      style={{
        width,
        height,
        alignSelf: 'center'
      }}
    >
      {/* Top-left */}
      <View
        testID="viewfinder-corner-tl"
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

/** Animated beam scan line, sweeping the viewfinder's HEIGHT. */
const ScanLine: React.FC<{ viewfinderHeight: number }> = ({ viewfinderHeight }) => {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withRepeat(
      withTiming(viewfinderHeight - 4, {
        duration: 2000,
        easing: Easing.inOut(Easing.ease)
      }),
      -1,
      true
    );
  }, [viewfinderHeight, translateY]);

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
          // Beam, fixed, not `theme.primary`: this line is drawn on the #000000
          // camera container, which no theme touches, and light-mode `primary`
          // is ink. The design system requires it by name — the beam rule's
          // "read" half: "the same 2px #FCCC0C line is forbidden on barcode/[id]
          // and mandatory on add-card/scan", because here we are the scanner.
          backgroundColor: IDENTITY_COLORS.beam,
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
  testID = 'scanner-overlay',
  onImageScan,
  isProcessingImage = false,
  imageError = false,
  imageErrorReason,
  onImageErrorDismiss,
  onImageErrorRetry,
  onImageErrorManualEntry,
  expectedFormat
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const viewfinder = getViewfinderSize(screenWidth, expectedFormat);
  const [cameraMountError, setCameraMountError] = useState<string | null>(null);
  // The action stack's measured height, which the scan banner sits above. Null until the stack
  // has laid out: there is nothing to derive the banner's offset from before that.
  const [actionStackHeight, setActionStackHeight] = useState<number | null>(null);
  const hasReportedMountErrorRef = useRef(false);

  const { permission, hasScanned, error, handleBarcodeScanned, requestCameraPermission, reset } =
    useBarcodeScanner({ onScan, enabled: true, expectedFormat });

  const effectiveCameraError = cameraMountError ?? error;

  const handleCameraMountError = useCallback(
    (event: { message: string }) => {
      // A camera that will not start is a total scan failure, and it previously
      // left no production trace — only the on-screen message below. Reported once
      // per mount: `onMountError` can fire repeatedly for one broken session.
      if (!hasReportedMountErrorRef.current) {
        hasReportedMountErrorRef.current = true;
        logger.notify('Camera preview failed to mount', {
          tags: {
            surface: 'camera',
            outcome: 'mount-error',
            reason: classifyMountError(event.message),
            platform: Platform.OS
          },
          // A single integer, so a `reason: 'other'` event is not a total black
          // hole the way it would be with no residual signal at all: two unknown
          // messages of different lengths are visibly different causes, and a
          // recurring unknown is distinguishable from a one-off. Its two sibling
          // classifiers keep `nativeCode` for the same purpose; this is the most
          // that can be kept here without reintroducing the free text.
          context: [{ messageLength: event.message.length }]
        });
      }
      setCameraMountError(event.message || t('addCard.scanner.cameraStartError'));
    },
    [t]
  );

  const handleActionStackLayout = useCallback((event: LayoutChangeEvent) => {
    setActionStackHeight(event.nativeEvent.layout.height);
  }, []);

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
        <FloatingBackButton
          onPress={onBack}
          style={{ top: insets.top + SPACING.sm, left: insets.left + SPACING.md }}
        />
        <View style={styles.centeredContent}>
          <MaterialIcons name="no-photography" size={48} color={theme.textSecondary} />
          <Text
            style={[styles.permissionTitle, { color: theme.textPrimary }]}
            accessibilityRole="header"
          >
            {t('addCard.scanner.cameraAccessTitle')}
          </Text>
          <Text style={[styles.permissionBody, { color: theme.textSecondary }]}>
            {t('addCard.scanner.cameraAccessBody')}
          </Text>
          <View style={styles.permissionActions}>
            <Button
              variant="primary"
              onPress={() => Linking.openSettings()}
              testID="open-settings-button"
            >
              {t('common.actions.openSettings')}
            </Button>
            <Button variant="secondary" onPress={onManualEntry} testID="manual-entry-button">
              {t('addCard.scanner.manualEntry')}
            </Button>
          </View>
        </View>
      </View>
    );
  }

  // Error state
  if (effectiveCameraError) {
    return (
      <View testID={testID} style={[styles.container, { backgroundColor: theme.background }]}>
        <FloatingBackButton
          onPress={onBack}
          style={{ top: insets.top + SPACING.sm, left: insets.left + SPACING.md }}
        />
        <View style={styles.centeredContent}>
          <MaterialIcons name="error-outline" size={48} color={theme.error} />
          <Text style={[styles.permissionTitle, { color: theme.textPrimary }]}>
            {t('addCard.scanner.cameraErrorTitle')}
          </Text>
          <Text style={[styles.permissionBody, { color: theme.textSecondary }]}>
            {effectiveCameraError}
          </Text>
          <View style={styles.permissionActions}>
            {onImageScan && (
              <Button
                variant="primary"
                onPress={onImageScan}
                testID="scan-from-image-fallback-button"
              >
                {t('addCard.scanner.scanFromImage')}
              </Button>
            )}
            <Button
              variant={onImageScan ? 'secondary' : 'primary'}
              onPress={() => {
                setCameraMountError(null);
                reset();
                requestCameraPermission();
              }}
              testID="retry-button"
            >
              {t('common.actions.retry')}
            </Button>
            <Button
              variant="secondary"
              onPress={onManualEntry}
              testID="manual-entry-fallback-button"
            >
              {t('addCard.scanner.manualEntry')}
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
        onMountError={handleCameraMountError}
        onBarcodeScanned={hasScanned ? undefined : handleBarcodeScanned}
      />

      {/* Semi-transparent overlay */}
      <View style={[StyleSheet.absoluteFill, styles.overlay]} />

      {/* Floating back button */}
      <FloatingBackButton
        onPress={onBack}
        style={{ top: insets.top + SPACING.sm, left: insets.left + SPACING.md }}
      />

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

      {/* Viewfinder: a layer centred on the whole screen, as the capture frame draws it */}
      <View style={[StyleSheet.absoluteFill, styles.viewfinderContainer]}>
        <View testID="viewfinder" style={viewfinder}>
          <ViewfinderCorners {...viewfinder} />
          <ScanLine viewfinderHeight={viewfinder.height} />
        </View>
        <Text style={styles.instructionText}>{t('addCard.scanner.instruction')}</Text>
      </View>

      {/* Processing indicator overlay */}
      {isProcessingImage && (
        <View style={styles.processingOverlay} testID="image-processing-indicator">
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.processingText}>{t('addCard.scanner.processingImage')}</Text>
        </View>
      )}

      {/* No-code-found banner: above the action stack by its MEASURED height plus the frame's
          16pt gap (Story 16.30) — it was a hardcoded `bottom: 96`, under a ~146pt stack that
          painted over both recovery links. Still over the live feed, so the camera never stops. */}
      {imageError && onImageErrorDismiss && actionStackHeight !== null && (
        <View
          testID="no-code-found-banner-anchor"
          style={[styles.bannerContainer, { bottom: actionStackHeight + BANNER_GAP }]}
        >
          <NoCodeFoundBanner
            reason={imageErrorReason}
            onDismiss={onImageErrorDismiss}
            onRetry={onImageErrorRetry ?? onImageErrorDismiss}
            onManualEntry={onImageErrorManualEntry ?? onManualEntry}
          />
        </View>
      )}

      {/* Bottom actions: scan from image (optional) + manual entry. The container's ONE in-flow
          child, anchored by its `justifyContent: 'flex-end'` — never `position: absolute` (AC9). */}
      <View
        testID="scanner-bottom-actions"
        onLayout={handleActionStackLayout}
        style={[styles.bottomActions, { paddingBottom: insets.bottom + SPACING.md }]}
      >
        {onImageScan && (
          <>
            <Pressable
              onPress={onImageScan}
              style={styles.manualEntryRow}
              accessibilityRole="button"
              accessibilityLabel={t('addCard.scanner.scanFromImageAccessibilityLabel')}
              testID="scan-from-image-row"
            >
              <MaterialIcons name="image" size={24} color="#FFFFFF" />
              <Text style={styles.manualEntryText}>{t('addCard.scanner.scanFromImage')}</Text>
              <MaterialIcons name="chevron-right" size={24} color="#FFFFFF" />
            </Pressable>
            <View style={styles.rowDivider} />
          </>
        )}
        <Pressable
          onPress={onManualEntry}
          style={styles.manualEntryRow}
          accessibilityRole="button"
          accessibilityLabel={t('addCard.scanner.manualEntryAccessibilityLabel')}
          testID="manual-entry-row"
        >
          <MaterialIcons name="keyboard" size={24} color="#FFFFFF" />
          <Text style={styles.manualEntryText}>{t('addCard.scanner.manualEntry')}</Text>
          <MaterialIcons name="chevron-right" size={24} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'flex-end'
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
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16
  },
  // Text over the live feed takes the Strong tokens: the capture frame sets it at Inter 500,
  // which is not bundled, and semibold keeps the extra weight it gave text over the camera.
  instructionText: {
    ...TYPOGRAPHY.bodyMdStrong,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    marginTop: 16
  },
  bottomActions: {
    paddingHorizontal: LAYOUT.screenHorizontalMargin
  },
  manualEntryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: TOUCH_TARGET.min,
    gap: 12
  },
  manualEntryText: {
    ...TYPOGRAPHY.bodyLgStrong,
    flex: 1,
    color: '#FFFFFF'
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginVertical: SPACING.xs
  },
  // `bottom` is applied inline from the measured action stack.
  bannerContainer: {
    position: 'absolute',
    left: 0,
    right: 0
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    zIndex: 20
  },
  processingText: {
    ...TYPOGRAPHY.bodyMdStrong,
    color: '#FFFFFF'
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.screenHorizontalMargin,
    gap: 8
  },
  permissionTitle: {
    ...TYPOGRAPHY.headlineSm,
    textAlign: 'center',
    marginTop: 16
  },
  permissionBody: {
    ...TYPOGRAPHY.bodyMd,
    textAlign: 'center',
    marginBottom: 16
  },
  permissionActions: {
    width: '100%',
    gap: 12
  }
});
