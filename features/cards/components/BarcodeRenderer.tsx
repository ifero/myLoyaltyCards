/**
 * BarcodeRenderer Component
 * Story 2.5: Display Barcode (Barcode Flash)
 *
 * Multi-format barcode rendering component that supports:
 * - Linear barcodes: CODE128, EAN13, EAN8, CODE39, UPCA
 * - 2D barcodes: QR
 *
 * Uses @bwip-js/react-native for native barcode generation.
 * Renders barcodes as PNG images via data URLs for optimal performance.
 */

import { toDataURL, type DataURL, type RenderOptions } from '@bwip-js/react-native';
import React, { useEffect, useState } from 'react';
import { Image, PixelRatio, View } from 'react-native';

import type { BarcodeFormat } from '@/core/schemas';

/**
 * Props for BarcodeRenderer component
 */
export interface BarcodeRendererProps {
  /** Barcode value/number */
  value: string;
  /** Barcode format type */
  format: BarcodeFormat;
  /** Width of the barcode (default: 280 for linear, 200 for QR) */
  width?: number;
  /** Height of the barcode (default: 120 for linear, ignored for QR) */
  height?: number;
  /** Color of the barcode bars/modules (default: #000000) */
  color?: string;
  /** Background color (default: transparent) */
  backgroundColor?: string;
}

/**
 * Map BarcodeFormat to bwip-js bcid (barcode identifier)
 */
const BWIPJS_FORMAT_MAP: Record<BarcodeFormat, string> = {
  CODE128: 'code128',
  EAN13: 'ean13',
  EAN8: 'ean8',
  CODE39: 'code39',
  UPCA: 'upca',
  QR: 'qrcode'
};

/**
 * Convert hex color to bwip-js format (without #)
 */
function hexToBwipColor(hex: string): string {
  return hex.replace(/^#/, '');
}

/**
 * BarcodeRenderer Component
 *
 * Renders barcodes in various formats optimized for scanning.
 * Uses bwip-js native React Native integration for all barcode types.
 *
 * @example
 * ```tsx
 * <BarcodeRenderer value="1234567890128" format="EAN13" />
 * ```
 */
export function BarcodeRenderer({
  value,
  format,
  width,
  height = 120,
  color = '#000000',
  backgroundColor = 'transparent'
}: BarcodeRendererProps) {
  const [source, setSource] = useState<DataURL | null>(null);
  const [error, setError] = useState<boolean>(false);

  const isQR = format === 'QR';
  const barcodeWidth = width ?? (isQR ? 200 : 280);

  useEffect(() => {
    let cancelled = false;

    async function generateBarcode() {
      try {
        const bcid = BWIPJS_FORMAT_MAP[format];
        const barColor = hexToBwipColor(color);

        // Calculate scale based on device pixel ratio for crisp rendering
        const scale = PixelRatio.get();

        // bwip-js options
        const options: RenderOptions = {
          bcid,
          text: value,
          scale,
          height: isQR ? barcodeWidth / 10 : height / 10, // Convert to mm (bwip uses mm)
          includetext: false, // Don't show text below barcode
          barcolor: barColor,
          ...(backgroundColor !== 'transparent' && {
            backgroundcolor: hexToBwipColor(backgroundColor)
          })
        };

        // For QR codes, set width equal to height for square aspect
        if (isQR) {
          options.width = barcodeWidth / 10;
        }

        const result = await toDataURL(options);

        if (!cancelled) {
          setSource(result);
          setError(false);
        }
      } catch (err) {
        console.warn('Failed to generate barcode:', err);
        if (!cancelled) {
          setError(true);
          setSource(null);
        }
      }
    }

    generateBarcode();

    return () => {
      cancelled = true;
    };
  }, [value, format, barcodeWidth, height, color, backgroundColor, isQR]);

  // Error or loading fallback
  if (error || !source) {
    return (
      <View
        style={{
          width: barcodeWidth,
          height: isQR ? barcodeWidth : height,
          backgroundColor: error ? '#f0f0f0' : 'transparent',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        accessibilityLabel={error ? 'Invalid barcode' : 'Loading barcode'}
        accessibilityRole="image"
      />
    );
  }

  return (
    <View
      style={{ backgroundColor }}
      accessibilityLabel={`${format} barcode for ${value}`}
      accessibilityRole="image"
    >
      <Image
        source={{ uri: source.uri }}
        style={{
          width: barcodeWidth,
          height: isQR ? barcodeWidth : height
        }}
        resizeMode="contain"
      />
    </View>
  );
}
