/**
 * useBarcodeScanner Hook
 * Story 2.3: Scan Barcode with Camera
 *
 * Hook for managing camera permissions, barcode detection, and scanner state.
 */

import { useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useState, useEffect, useRef } from 'react';

import { BarcodeFormat } from '@/core/schemas';

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
 * Map barcode format from expo-camera to our schema
 */
function mapBarcodeFormat(expoFormat: string): BarcodeFormat {
  return BARCODE_FORMAT_MAP[expoFormat.toLowerCase()] ?? 'CODE128';
}

export interface ScanResult {
  barcode: string;
  format: BarcodeFormat;
}

interface UseBarcodeScannerOptions {
  onScan: (result: ScanResult) => void;
  enabled?: boolean;
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
export function useBarcodeScanner({ onScan, enabled = true }: UseBarcodeScannerOptions) {
  const [permission, requestPermission] = useCameraPermissions();
  const [hasScanned, setHasScanned] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    // Map format and call onScan
    const format = mapBarcodeFormat(event.type);
    onScan({
      barcode: event.data,
      format
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
        setError('Camera permission denied');
      }
      return result.granted;
    } catch (err) {
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
