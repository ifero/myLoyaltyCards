/**
 * Barcode Format Inference Utility
 * Story 2.2: Add Card Manually (Updated)
 *
 * Auto-detects barcode format based on value pattern.
 * This removes the need for users to manually select the format.
 */

import { BarcodeFormat } from '@/core/schemas';

/**
 * Infer barcode format from the barcode value.
 *
 * Detection rules:
 * - EAN-13: Exactly 13 digits
 * - EAN-8: Exactly 8 digits
 * - UPC-A: Exactly 12 digits
 * - QR Code: Contains URL patterns, long text, or special characters
 * - Code 39: Alphanumeric with limited special chars (A-Z, 0-9, space, - . $ / + %)
 * - Code 128: Default fallback (can encode anything)
 *
 * Note: When scanned via camera, expo-camera provides accurate format detection.
 * This function is for manual entry where we infer the most likely format.
 *
 * @param value - The barcode value string
 * @returns The inferred BarcodeFormat
 */
export function inferBarcodeFormat(value: string): BarcodeFormat {
  const trimmed = value.trim();

  // Empty or whitespace only - default to CODE128
  if (!trimmed) {
    return 'CODE128';
  }

  // QR Code detection: URLs, email, or very long content
  if (
    /^https?:\/\//i.test(trimmed) ||
    /^mailto:/i.test(trimmed) ||
    /^tel:/i.test(trimmed) ||
    trimmed.length > 48 // QR codes often used for longer content
  ) {
    return 'QR';
  }

  // Pure numeric patterns (most common loyalty cards)
  if (/^\d+$/.test(trimmed)) {
    // EAN-13: Exactly 13 digits (most common retail barcode)
    if (trimmed.length === 13) {
      return 'EAN13';
    }

    // EAN-8: Exactly 8 digits (compact variant)
    if (trimmed.length === 8) {
      return 'EAN8';
    }

    // UPC-A: Exactly 12 digits (common in North America)
    if (trimmed.length === 12) {
      return 'UPCA';
    }

    // Other numeric values -> CODE128 (most versatile)
    return 'CODE128';
  }

  // Code 39: Limited character set (uppercase letters, digits, and specific symbols)
  // Common for inventory/industrial use
  // Only match if content is already uppercase (no lowercase letters)
  const code39Regex = /^[A-Z0-9\s\-.$/+%]+$/;
  if (code39Regex.test(trimmed) && trimmed.length <= 43 && !/[a-z]/.test(trimmed)) {
    return 'CODE39';
  }

  // Default: Code 128 (most versatile, can encode almost anything)
  return 'CODE128';
}

/**
 * Get a human-readable description of the barcode format
 */
export function getBarcodeFormatDescription(format: BarcodeFormat): string {
  const descriptions: Record<BarcodeFormat, string> = {
    CODE128: 'Code 128 (Universal)',
    EAN13: 'EAN-13 (Retail)',
    EAN8: 'EAN-8 (Compact)',
    QR: 'QR Code',
    CODE39: 'Code 39 (Industrial)',
    UPCA: 'UPC-A (North America)'
  };
  return descriptions[format];
}
