/**
 * BarcodeRenderer Component
 * Story 2.5: Display Barcode (Barcode Flash)
 *
 * Multi-format barcode rendering component that supports:
 * - Linear barcodes: CODE128, EAN13, EAN8, CODE39, UPCA (via JsBarcode)
 * - 2D barcodes: QR (via react-native-qrcode-svg)
 *
 * Renders barcodes as SVG for crisp, scalable display.
 */

import JsBarcode from 'jsbarcode';
import React, { useMemo } from 'react';
import { View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SvgXml } from 'react-native-svg';

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
 * Map BarcodeFormat to JsBarcode format string
 */
const JSBARCODE_FORMAT_MAP: Record<Exclude<BarcodeFormat, 'QR'>, string> = {
  CODE128: 'CODE128',
  EAN13: 'EAN13',
  EAN8: 'EAN8',
  CODE39: 'CODE39',
  UPCA: 'UPC'
};

/**
 * Generate SVG string for linear barcode using JsBarcode
 */
function generateBarcodeSvg(
  value: string,
  format: Exclude<BarcodeFormat, 'QR'>,
  width: number,
  height: number,
  color: string
): string | null {
  try {
    // Create a minimal SVG document for JsBarcode
    const svgNS = 'http://www.w3.org/2000/svg';

    // Create encoder options
    const jsFormat = JSBARCODE_FORMAT_MAP[format];

    // We need to calculate the encoding first to get dimensions
    // JsBarcode expects a DOM element, so we'll use a custom approach
    // by creating an SVG string directly

    // For now, use xmldom-like approach with a simple string builder
    let svgContent = '';
    let svgWidth = width;
    let svgHeight = height;

    // Create a mock element that JsBarcode can use
    const mockSvg = {
      nodeName: 'svg',
      _attributes: {} as Record<string, string>,
      _children: [] as Array<{ tagName: string; attributes: Record<string, string> }>,
      setAttribute(name: string, value: string) {
        this._attributes[name] = value;
        if (name === 'width') svgWidth = parseFloat(value);
        if (name === 'height') svgHeight = parseFloat(value);
      },
      getAttribute(name: string) {
        return this._attributes[name];
      },
      hasAttribute(name: string) {
        return name in this._attributes;
      },
      appendChild(child: { tagName: string; attributes: Record<string, string> }) {
        this._children.push(child);
      },
      getElementsByTagName() {
        return [];
      },
      createElementNS(_ns: string, tagName: string) {
        const element: {
          tagName: string;
          attributes: Record<string, string>;
          setAttribute: (name: string, value: string) => void;
          hasAttribute: (name: string) => boolean;
        } = {
          tagName,
          attributes: {},
          setAttribute(name: string, value: string) {
            this.attributes[name] = value;
          },
          hasAttribute(name: string) {
            return name in this.attributes;
          }
        };
        return element;
      }
    };

    // Run JsBarcode
    JsBarcode(mockSvg as unknown as SVGElement, value, {
      format: jsFormat,
      width: 2,
      height,
      displayValue: false,
      margin: 10,
      lineColor: color,
      background: 'transparent'
    });

    // Build SVG string from the mock element
    svgContent = `<svg xmlns="${svgNS}" width="${mockSvg._attributes.width || svgWidth}" height="${mockSvg._attributes.height || svgHeight}" viewBox="0 0 ${mockSvg._attributes.width || svgWidth} ${mockSvg._attributes.height || svgHeight}">`;

    for (const child of mockSvg._children) {
      const attrs = Object.entries(child.attributes)
        .map(([key, val]) => `${key}="${val}"`)
        .join(' ');
      svgContent += `<${child.tagName} ${attrs}/>`;
    }

    svgContent += '</svg>';

    return svgContent;
  } catch (error) {
    console.warn('Failed to generate barcode:', error);
    return null;
  }
}

/**
 * BarcodeRenderer Component
 *
 * Renders barcodes in various formats optimized for scanning.
 * Linear barcodes use JsBarcode + react-native-svg.
 * QR codes use react-native-qrcode-svg.
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
  const isQR = format === 'QR';
  const barcodeWidth = width ?? (isQR ? 200 : 280);

  // Generate SVG for linear barcodes (must be called unconditionally per React rules)
  const svgXml = useMemo(() => {
    if (isQR) return null;
    return generateBarcodeSvg(
      value,
      format as Exclude<BarcodeFormat, 'QR'>,
      barcodeWidth,
      height,
      color
    );
  }, [value, format, barcodeWidth, height, color, isQR]);

  // QR Code rendering
  if (isQR) {
    return (
      <View
        style={{ backgroundColor }}
        accessibilityLabel={`QR code for ${value}`}
        accessibilityRole="image"
      >
        <QRCode value={value} size={barcodeWidth} color={color} backgroundColor={backgroundColor} />
      </View>
    );
  }

  if (!svgXml) {
    // Fallback for invalid barcode
    return (
      <View
        style={{
          width: barcodeWidth,
          height,
          backgroundColor: '#f0f0f0',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        accessibilityLabel="Invalid barcode"
        accessibilityRole="image"
      />
    );
  }

  return (
    <View
      style={{ backgroundColor, width: barcodeWidth, height }}
      accessibilityLabel={`${format} barcode for ${value}`}
      accessibilityRole="image"
    >
      <SvgXml xml={svgXml} width={barcodeWidth} height={height} />
    </View>
  );
}
