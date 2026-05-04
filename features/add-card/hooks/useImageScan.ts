/**
 * useImageScan Hook
 * Story 2.9: Scan Cards from Image or Screenshot
 *
 * Manages the full image-scan flow:
 *   1. Launch system image picker (photo library)
 *   2. Decode all barcodes in the selected image via @react-native-ml-kit/barcode-scanning
 *   3. Normalize each detected barcode (UPC-A → EAN-13, CODE128-as-EAN-13, etc.)
 *   4. Optionally apply a catalogue-driven expectedFormat hint to recover a
 *      stripped EAN-13 leading zero
 *   5. Return state for single-code auto-resolve, multi-code selection, and error cases
 */

import BarcodeScanning, {
  BarcodeFormat as MlKitBarcodeFormat
} from '@react-native-ml-kit/barcode-scanning';
import * as ImagePicker from 'expo-image-picker';
import { useState, useCallback } from 'react';

import { BarcodeFormat } from '@/core/schemas';
import { applyExpectedFormat, normalizeBarcode } from '@/core/utils';

import { ScanResult } from '@/features/cards/hooks/useBarcodeScanner';

const BARCODE_FORMAT_MAP: Record<string, BarcodeFormat> = {
  code128: 'CODE128',
  code_128: 'CODE128',
  ean13: 'EAN13',
  ean_13: 'EAN13',
  ean8: 'EAN8',
  ean_8: 'EAN8',
  qr: 'QR',
  qrcode: 'QR',
  qr_code: 'QR',
  code39: 'CODE39',
  code_39: 'CODE39',
  upc_a: 'UPCA'
};

const MLKIT_FORMAT_MAP: Partial<Record<MlKitBarcodeFormat, BarcodeFormat>> = {
  [MlKitBarcodeFormat.CODE_128]: 'CODE128',
  [MlKitBarcodeFormat.EAN_13]: 'EAN13',
  [MlKitBarcodeFormat.EAN_8]: 'EAN8',
  [MlKitBarcodeFormat.QR_CODE]: 'QR',
  [MlKitBarcodeFormat.CODE_39]: 'CODE39',
  [MlKitBarcodeFormat.UPC_A]: 'UPCA'
};

function mapFormat(rawFormat: string | number): BarcodeFormat {
  if (typeof rawFormat === 'number') {
    return MLKIT_FORMAT_MAP[rawFormat as MlKitBarcodeFormat] ?? 'CODE128';
  }

  const normalizedFormat = rawFormat.toLowerCase();
  return BARCODE_FORMAT_MAP[normalizedFormat] ?? 'CODE128';
}

export interface DetectedCode {
  value: string;
  format: BarcodeFormat;
}

interface UseImageScanOptions {
  onCodeResolved: (result: ScanResult) => void;
  /**
   * Optional catalogue-driven format hint. When provided as `EAN13` and the
   * scanner returns 12 digits whose `0`-prefixed form has a valid checksum,
   * the result is auto-promoted to EAN-13 with the leading zero restored.
   */
  expectedFormat?: BarcodeFormat;
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

export const useImageScan = ({
  onCodeResolved,
  expectedFormat
}: UseImageScanOptions): UseImageScanResult => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showError, setShowError] = useState(false);
  const [multiCodes, setMultiCodes] = useState<DetectedCode[]>([]);

  const dismissError = useCallback(() => setShowError(false), []);

  const dismissMultiPicker = useCallback(() => setMultiCodes([]), []);

  const selectCode = useCallback(
    (code: DetectedCode) => {
      setMultiCodes([]);
      // Selected codes were already normalized when added to multiCodes; the
      // expectedFormat pass is idempotent so re-applying here is safe.
      const final = applyExpectedFormat({ value: code.value, format: code.format }, expectedFormat);
      onCodeResolved({ barcode: final.value, format: final.format });
    },
    [onCodeResolved, expectedFormat]
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
      const scanned = await BarcodeScanning.scan(uri);

      if (scanned.length === 0) {
        setShowError(true);
      } else if (scanned.length === 1) {
        const firstBarcode = scanned[0]!;
        const baseFormat = mapFormat(firstBarcode.format);
        const canonical = normalizeBarcode(firstBarcode.value, baseFormat);
        const final = applyExpectedFormat(canonical, expectedFormat);
        onCodeResolved({ barcode: final.value, format: final.format });
      } else {
        const codes: DetectedCode[] = scanned.slice(0, 6).map((r) => {
          const baseFormat = mapFormat(r.format);
          const canonical = normalizeBarcode(r.value, baseFormat);
          const final = applyExpectedFormat(canonical, expectedFormat);
          return {
            value: final.value,
            format: final.format
          };
        });
        setMultiCodes(codes);
      }
    } catch {
      setShowError(true);
    } finally {
      setIsProcessing(false);
    }
  }, [onCodeResolved, expectedFormat]);

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
