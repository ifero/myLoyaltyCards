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
    const digit = parseInt(code.charAt(i), 10);
    const weight = i % 2 === 0 ? 1 : 3;
    sum += digit * weight;
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(code.charAt(12), 10);
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
      return;
    }

    const asset = result.assets[0]!;
    const uri = asset.uri;
    setIsProcessing(true);
    setShowError(false);
    setMultiCodes([]);

    try {
      const scanned = await scanFromURLAsync(uri, SUPPORTED_BARCODE_TYPES);

      if (scanned.length === 0) {
        setShowError(true);
      } else if (scanned.length === 1) {
        const firstBarcode = scanned[0]!;
        const baseFormat = mapFormat(firstBarcode.type);
        const correctedFormat = intelCorrectFormat(firstBarcode.data, baseFormat);
        onCodeResolved({ barcode: firstBarcode.data, format: correctedFormat });
      } else {
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
    } catch {
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
