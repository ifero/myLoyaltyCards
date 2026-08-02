/**
 * useBarcodeScanner Hook
 * Story 2.3: Scan Barcode with Camera
 * Story 16.23: the CODE128 format fallback is no longer silent
 *
 * Hook for managing camera permissions, barcode detection, and scanner state.
 */

import { useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { BarcodeFormat } from '@/core/schemas';
import { applyExpectedFormat, logger, normalizeBarcode } from '@/core/utils';

/**
 * Map expo-camera barcode types to our schema format
 */
const BARCODE_FORMAT_MAP: Record<string, BarcodeFormat> = {
  code128: 'CODE128',
  ean13: 'EAN13',
  ean8: 'EAN8',
  qr: 'QR',
  code39: 'CODE39',
  upc_a: 'UPCA'
};

/**
 * Sentry tag identifying the scan surface (Story 16.23).
 *
 * `'camera'` rather than a screen name on purpose: this hook backs BOTH the
 * add-card camera and the edit/rescan camera, and it has no way to know which
 * one mounted it. Claiming otherwise would make the tag wrong half the time.
 */
const SCAN_SURFACE = 'camera';

/**
 * Map barcode format from expo-camera to our schema.
 *
 * `reportedFormats` accumulates the labels already reported by this scanner
 * instance, so an unmapped barcode left sitting in frame cannot emit the same
 * event indefinitely: `hasScanned` re-arms every 2 s, which would otherwise mean
 * one Sentry event every two seconds for as long as the user holds still. Scoped
 * per hook instance rather than per scan, because the scanner screen is transient
 * — remounting it reports again, which keeps a recurring problem countable.
 */
function mapBarcodeFormat(expoFormat: string, reportedFormats: Set<string>): BarcodeFormat {
  const normalizedFormat = expoFormat.toLowerCase();
  const mapped = BARCODE_FORMAT_MAP[normalizedFormat];

  if (mapped === undefined) {
    // CODE128 stays the fallback (Story 16.23 AC4 is observability only), but a
    // card stored under the wrong format is re-rendered as Code 128 for good:
    // `normalizeBarcode` Rule 3 rescues only the 13-digit-valid-EAN-13 case.
    if (!reportedFormats.has(normalizedFormat)) {
      reportedFormats.add(normalizedFormat);
      logger.notify('Barcode format fell back to CODE128', {
        tags: { surface: SCAN_SURFACE, platform: Platform.OS },
        // A decoder constant, not user data — but runtime data all the same, so it
        // cannot be a tag: tag values must be literals and are NOT scrubbed.
        context: [{ unmappedFormat: expoFormat }]
      });
    }
    return 'CODE128';
  }

  return mapped;
}

export interface ScanResult {
  barcode: string;
  format: BarcodeFormat;
}

interface UseBarcodeScannerOptions {
  onScan: (result: ScanResult) => void;
  enabled?: boolean;
  /**
   * Optional catalogue-driven format hint. When `EAN13` is supplied and the
   * scanner returns 12 digits whose `0`-prefixed form has a valid checksum,
   * the result is auto-promoted to EAN-13 with the leading zero restored.
   */
  expectedFormat?: BarcodeFormat;
}

/**
 * useBarcodeScanner - Hook for camera and barcode detection
 *
 * Features:
 * - Camera permission management
 * - Barcode detection with format mapping
 * - Haptic feedback on successful scan
 * - Error handling
 */
export function useBarcodeScanner({
  onScan,
  enabled = true,
  expectedFormat
}: UseBarcodeScannerOptions) {
  const [permission, requestPermission] = useCameraPermissions();
  const [hasScanned, setHasScanned] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Deliberately a ref, not per-call state: see `mapBarcodeFormat`. It must
  // outlive individual scans (the 2 s re-arm would otherwise re-report) but not
  // the mounted scanner.
  const reportedFormatsRef = useRef<Set<string>>(new Set());
  // Same one-per-mounted-scanner scope as the formats above, and a Set for the
  // same reason: a denial and a failed request are DIFFERENT outcomes with
  // different fixes, so one shared boolean would let whichever happened second go
  // unreported. Keyed by the outcome tag.
  const reportedPermissionOutcomesRef = useRef<Set<string>>(new Set());

  // Reset scan state when enabled changes
  useEffect(() => {
    if (!enabled) {
      setHasScanned(false);
      setError(null);
    }
  }, [enabled]);

  /**
   * Handle barcode scanned event
   */
  const handleBarcodeScanned = (event: { data: string; type: string }) => {
    // Prevent multiple scans of the same barcode
    if (hasScanned || !enabled) {
      return;
    }

    // Clear any existing timeout
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
    }

    // Mark as scanned to prevent duplicate scans
    setHasScanned(true);

    // Provide haptic feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Map format → canonical normalization → optional catalogue-driven hint
    const baseFormat = mapBarcodeFormat(event.type, reportedFormatsRef.current);
    const canonical = normalizeBarcode(event.data, baseFormat);
    const final = applyExpectedFormat(canonical, expectedFormat);
    onScan({
      barcode: final.value,
      format: final.format
    });

    // Reset scan state after a delay to allow for re-scanning if needed
    scanTimeoutRef.current = setTimeout(() => {
      setHasScanned(false);
    }, 2000);
  };

  /**
   * Request camera permission
   */
  const requestCameraPermission = async () => {
    try {
      setError(null);
      const result = await requestPermission();
      if (!result.granted) {
        // A denied camera is a scan failure the field could not previously see:
        // the user gets clear UI, but production telemetry had nothing, so a
        // "scanning is broken for me" report had no counterpart in Sentry.
        // Reported once per mounted scanner — `ScannerOverlay` re-requests on
        // mount whenever `permission` is null, so a permanently-denied user would
        // otherwise emit an event every time they open the screen.
        if (!reportedPermissionOutcomesRef.current.has('permission-denied')) {
          reportedPermissionOutcomesRef.current.add('permission-denied');
          logger.notify('Camera permission denied', {
            tags: { surface: SCAN_SURFACE, outcome: 'permission-denied', platform: Platform.OS }
          });
        }
        setError('Camera permission denied');
      }
      return result.granted;
    } catch (err) {
      if (!reportedPermissionOutcomesRef.current.has('permission-error')) {
        reportedPermissionOutcomesRef.current.add('permission-error');
        // Distinct from a denial: the OS never gave us an answer at all, which is
        // a different problem with a different fix — and tracked under its own key
        // so a denial later in the same mount is still reported.
        logger.notify('Camera permission request failed', {
          tags: { surface: SCAN_SURFACE, outcome: 'permission-error', platform: Platform.OS },
          context: [{ errorName: err instanceof Error ? err.name : typeof err }]
        });
      }
      const message = err instanceof Error ? err.message : 'Failed to request camera permission';
      setError(message);
      return false;
    }
  };

  /**
   * Reset scanner state
   */
  const reset = () => {
    setHasScanned(false);
    setError(null);
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, []);

  return {
    permission,
    hasScanned,
    error,
    handleBarcodeScanned,
    requestCameraPermission,
    reset,
    isReady: permission?.granted === true && enabled
  };
}
