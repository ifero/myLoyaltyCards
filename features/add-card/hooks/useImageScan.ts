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
      base64: false
    });

    if (result.canceled || result.assets.length === 0) return;

    const uri = result.assets[0].uri;
    setIsProcessing(true);
    setShowError(false);
    setMultiCodes([]);

    try {
      const scanned = await scanFromURLAsync(uri, SUPPORTED_BARCODE_TYPES);

      if (scanned.length === 0) {
        setShowError(true);
      } else if (scanned.length === 1) {
        onCodeResolved({ barcode: scanned[0].data, format: mapFormat(scanned[0].type) });
      } else {
        const codes: DetectedCode[] = scanned.slice(0, 6).map((r) => ({
          value: r.data,
          format: mapFormat(r.type)
        }));
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
