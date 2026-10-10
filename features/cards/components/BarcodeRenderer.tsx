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
import React, { memo, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, PixelRatio, type ViewStyle, View } from 'react-native';

import type { BarcodeFormat } from '@/core/schemas';
import { logger } from '@/core/utils/logger';

import { MIN_QR_SIZE, RENDERER_SIDE_PADDING } from '../utils/barcodeGeometry';

/**
 * bwip-js takes a code's height (and a QR code's width) in MILLIMETRES, and the renderer asks for a
 * tenth of the box's points: a 200pt box asks for 20mm. That is not a pixel ratio — a millimetre is
 * about 2.83pt at bwip-js's 72dpi — it only sets the size of the bitmap bwip-js draws, which the
 * image then scales into the box.
 */
const POINTS_PER_REQUESTED_MM = 10;
const DEFAULT_LINEAR_WIDTH = 280;
const DEFAULT_QR_SIZE = 220;
const LINEAR_PADDING_WIDTH = 6;
const LINEAR_PADDING_HEIGHT = 2;
const QR_PADDING_SIZE = 4;

/**
 * Props for BarcodeRenderer component
 */
export interface BarcodeRendererProps {
  /** Barcode value/number */
  value: string;
  /** Barcode format type */
  format: BarcodeFormat;
  /** Width of the barcode (default: 280 for linear, 220 for QR) */
  width?: number;
  /** Height of the barcode (default: 120 for linear, ignored for QR) */
  height?: number;
  /** Color of the barcode bars/modules (default: #000000) */
  color?: string;
  /** Background color (default: #FFFFFF) */
  backgroundColor?: string;
  /** Optional container style override */
  containerStyle?: ViewStyle;
  /**
   * Draw a linear code's bars the full height of its box: no white above or below them, the bitmap
   * stretched to the box. A code the default draw leaves narrower than its box — a short one, such
   * as EAN-8 — widens to it too, every module by the same factor. Off by default, which letterboxes
   * the code inside the box. A QR code ignores it, since stretching a square symbol would distort
   * it.
   */
  fillBox?: boolean;
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
export const BarcodeRenderer = memo(function BarcodeRenderer({
  value,
  format,
  width,
  height = 120,
  color = '#000000',
  backgroundColor = '#FFFFFF',
  containerStyle,
  fillBox = false
}: BarcodeRendererProps) {
  const { t } = useTranslation();
  const [source, setSource] = useState<DataURL | null>(null);
  const [error, setError] = useState<boolean>(false);

  const isQR = format === 'QR';
  const barcodeWidth = isQR
    ? Math.max(width ?? DEFAULT_QR_SIZE, MIN_QR_SIZE)
    : (width ?? DEFAULT_LINEAR_WIDTH);
  // Stretching scales the bitmap to the box on each axis. The bars run the box's full height. Where
  // the box's width already limits the default draw (EAN-13, a long Code 128) they keep the width it
  // gives them; a short code (EAN-8) widens to the box, every module by the same factor.
  const fillsBox = fillBox && !isQR;

  // Memoize bwip-js options to avoid recreating on every render
  const bwipOptions = useMemo((): RenderOptions => {
    const bcid = BWIPJS_FORMAT_MAP[format];
    const barColor = hexToBwipColor(color);
    const scale = PixelRatio.get();

    const options: RenderOptions = {
      bcid,
      text: value,
      scale,
      height: isQR ? barcodeWidth / POINTS_PER_REQUESTED_MM : height / POINTS_PER_REQUESTED_MM,
      includetext: false,
      barcolor: barColor,
      ...(backgroundColor !== 'transparent' && {
        backgroundcolor: hexToBwipColor(backgroundColor)
      }),
      paddingwidth: isQR ? QR_PADDING_SIZE : LINEAR_PADDING_WIDTH,
      // bwip-js's padding is the only white above and below a linear code's bars.
      paddingheight: isQR ? QR_PADDING_SIZE : fillsBox ? 0 : LINEAR_PADDING_HEIGHT
    };

    if (isQR) {
      options.width = barcodeWidth / POINTS_PER_REQUESTED_MM;
    }

    return options;
  }, [format, value, barcodeWidth, height, color, backgroundColor, isQR, fillsBox]);

  useEffect(() => {
    let cancelled = false;

    async function generateBarcode() {
      try {
        const result = await toDataURL(bwipOptions);

        if (!cancelled) {
          setSource(result);
          setError(false);
        }
      } catch (err) {
        logger.warn('Failed to generate barcode:', err);
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
  }, [bwipOptions]);

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
        accessibilityLabel={
          error ? t('cards.barcodeRenderer.invalidA11y') : t('cards.barcodeRenderer.loadingA11y')
        }
        accessibilityRole="image"
      />
    );
  }

  return (
    <View
      style={[{ backgroundColor, paddingHorizontal: RENDERER_SIDE_PADDING }, containerStyle]}
      accessibilityLabel={t('cards.barcodeRenderer.imageA11yLabel', { format, value })}
      accessibilityRole="image"
    >
      <Image
        source={{ uri: source.uri }}
        style={{
          width: barcodeWidth,
          height: isQR ? barcodeWidth : height
        }}
        resizeMode={fillsBox ? 'stretch' : 'contain'}
      />
    </View>
  );
});
