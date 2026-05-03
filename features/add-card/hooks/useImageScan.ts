/**
 * useImageScan Hook
 * Story 2.9: Scan Cards from Image or Screenshot
 *
 * Manages the full image-scan flow:
 *   1. Launch system image picker (photo library)
 *   2. Decode all barcodes in the selected image via expo-camera's scanFromURLAsync
 *   3. Return state for single-code auto-resolve, multi-code selection, and error cases
 */

import { scanFromURLAsync, BarcodeType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useState, useCallback } from 'react';

import { BarcodeFormat } from '@/core/schemas';

import { ScanResult } from '@/features/cards/hooks/useBarcodeScanner';

import { logScanDebug } from './useImageScan.debug';

const BARCODE_FORMAT_MAP: Record<string, BarcodeFormat> = {
  code128: 'CODE128',
  ean13: 'EAN13',
  ean8: 'EAN8',
  qr: 'QR',
  code39: 'CODE39',
  upc_a: 'UPCA'
};

/**
 * Validate EAN-13 checksum
 * EAN-13 uses a standard weighted sum calculation
 */
function isValidEAN13Checksum(code: string): boolean {
  if (code.length !== 13) return false;
  if (!/^\d+$/.test(code)) return false;

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(code[i], 10);
    const weight = i % 2 === 0 ? 1 : 3;
    sum += digit * weight;
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(code[12], 10);
}

/**
 * Auto-correct format when CODE128 is detected but looks like EAN-13
 * This handles cases where the barcode was encoded as CODE128 but contains valid EAN-13 data
 */
function intelCorrectFormat(barcode: string, detectedFormat: BarcodeFormat): BarcodeFormat {
  // If detected as CODE128, check if it's actually a valid EAN-13
  if (detectedFormat === 'CODE128' && barcode.length === 13 && isValidEAN13Checksum(barcode)) {
    return 'EAN13';
  }
  return detectedFormat;
}

const SUPPORTED_BARCODE_TYPES: BarcodeType[] = [
  'code128',
  'ean13',
  'ean8',
  'qr',
  'code39',
  'upc_a'
];

function mapFormat(expoFormat: string): BarcodeFormat {
  return BARCODE_FORMAT_MAP[expoFormat.toLowerCase()] ?? 'CODE128';
}

export interface DetectedCode {
  value: string;
  format: BarcodeFormat;
}

interface UseImageScanOptions {
  onCodeResolved: (result: ScanResult) => void;
}

export interface UseImageScanResult {
  isProcessing: boolean;
  showError: boolean;
  multiCodes: DetectedCode[];
  pickAndScan: () => Promise<void>;
  dismissError: () => void;
  dismissMultiPicker: () => void;
  selectCode: (code: DetectedCode) => void;
}

export const useImageScan = ({ onCodeResolved }: UseImageScanOptions): UseImageScanResult => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showError, setShowError] = useState(false);
  const [multiCodes, setMultiCodes] = useState<DetectedCode[]>([]);

  const dismissError = useCallback(() => setShowError(false), []);

  const dismissMultiPicker = useCallback(() => setMultiCodes([]), []);

  const selectCode = useCallback(
    (code: DetectedCode) => {
      setMultiCodes([]);
      onCodeResolved({ barcode: code.value, format: code.format });
    },
    [onCodeResolved]
  );

  const pickAndScan = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      allowsEditing: false,
      exif: false,
      base64: false,
      aspect: [4, 3]
    });

    if (result.canceled || result.assets.length === 0) {
      console.log('[useImageScan] User canceled image picker');
      return;
    }

    const uri = result.assets[0].uri;
    console.log('[useImageScan] Selected image URI:', uri, 'dimensions:', {
      width: result.assets[0].width,
      height: result.assets[0].height
    });
    setIsProcessing(true);
    setShowError(false);
    setMultiCodes([]);

    try {
      console.log('[useImageScan] Scanning barcode from URI...');
      const scanStartTime = Date.now();
      const scanned = await scanFromURLAsync(uri, SUPPORTED_BARCODE_TYPES);
      const scanDurationMs = Date.now() - scanStartTime;
      console.log('[useImageScan] scanFromURLAsync result:', {
        count: scanned.length,
        details: scanned.map((s) => ({ data: s.data, type: s.type })),
        durationMs: scanDurationMs
      });

      // Log debug info
      logScanDebug(
        uri,
        SUPPORTED_BARCODE_TYPES,
        scanned.length,
        scanned.map((s) => ({ data: s.data, type: s.type })),
        scanDurationMs
      );

      if (scanned.length === 0) {
        console.log('[useImageScan] No barcodes detected in image');
        setShowError(true);
      } else if (scanned.length === 1) {
        console.log('[useImageScan] Single barcode detected:', scanned[0]);
        const baseFormat = mapFormat(scanned[0].type);
        const correctedFormat = intelCorrectFormat(scanned[0].data, baseFormat);
        console.log(
          `[useImageScan] Format: ${scanned[0].type} → ${baseFormat} → ${correctedFormat}`
        );
        onCodeResolved({ barcode: scanned[0].data, format: correctedFormat });
      } else {
        console.log('[useImageScan] Multiple barcodes detected:', scanned.length);
        const codes: DetectedCode[] = scanned.slice(0, 6).map((r) => {
          const baseFormat = mapFormat(r.type);
          const correctedFormat = intelCorrectFormat(r.data, baseFormat);
          return {
            value: r.data,
            format: correctedFormat
          };
        });
        setMultiCodes(codes);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[useImageScan] Error scanning barcode:', errorMsg);

      // Log debug info with error
      logScanDebug(uri, SUPPORTED_BARCODE_TYPES, 0, [], 0, errorMsg);

      setShowError(true);
    } finally {
      setIsProcessing(false);
    }
  }, [onCodeResolved]);

  return {
    isProcessing,
    showError,
    multiCodes,
    pickAndScan,
    dismissError,
    dismissMultiPicker,
    selectCode
  };
};
