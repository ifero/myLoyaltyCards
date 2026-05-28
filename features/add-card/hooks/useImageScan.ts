/**
 * useImageScan Hook
 * Story 2.9: Scan Cards from Image or Screenshot
 *
 * Manages the full image-scan flow:
 *   1. Launch system image picker (photo library)
 *   2. Decode all barcodes in the selected image via react-native-image-code-scanner
 *   3. Normalize each detected barcode (UPC-A → EAN-13, CODE128-as-EAN-13, etc.)
 *   4. Optionally apply a catalogue-driven expectedFormat hint to recover a
 *      stripped EAN-13 leading zero
 *   5. Return state for single-code auto-resolve, multi-code selection, and error cases
 */

import * as ImagePicker from 'expo-image-picker';
import { useState, useCallback } from 'react';
import ImageCodeScanner, {
  BarcodeFormat as ImageBarcodeFormat
} from 'react-native-image-code-scanner';

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

const SUPPORTED_IMAGE_SCAN_FORMATS = [
  ImageBarcodeFormat.CODE_128,
  ImageBarcodeFormat.EAN_13,
  ImageBarcodeFormat.EAN_8,
  ImageBarcodeFormat.QR_CODE,
  ImageBarcodeFormat.CODE_39,
  ImageBarcodeFormat.UPC_A
];

function mapFormat(rawFormat: string): BarcodeFormat {
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
      // Re-run the full normalize → expectedFormat pipeline. Multi-code entries
      // are already normalized at the time they are pushed into state, but both
      // passes are idempotent, and re-applying here keeps `selectCode` a single
      // source of truth even if a future caller pushes raw values into
      // `multiCodes`.
      const canonical = normalizeBarcode(code.value, code.format);
      const final = applyExpectedFormat(canonical, expectedFormat);
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
      const scanned = await ImageCodeScanner.scan({
        path: uri,
        formats: SUPPORTED_IMAGE_SCAN_FORMATS
      });

      if (scanned.length === 0) {
        setShowError(true);
      } else if (scanned.length === 1) {
        const firstBarcode = scanned[0]!;
        const baseFormat = mapFormat(firstBarcode.format);
        const canonical = normalizeBarcode(firstBarcode.content, baseFormat);
        const final = applyExpectedFormat(canonical, expectedFormat);
        onCodeResolved({ barcode: final.value, format: final.format });
      } else {
        const codes: DetectedCode[] = scanned.slice(0, 6).map((r) => {
          const baseFormat = mapFormat(r.format);
          const canonical = normalizeBarcode(r.content, baseFormat);
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
