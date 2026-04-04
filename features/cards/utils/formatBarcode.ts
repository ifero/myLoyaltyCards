/**
 * Barcode Formatting Utility
 * Story 13.3: Restyle Card Detail Screen
 *
 * Shared barcode number formatting used by CardDetails and FullscreenBarcode.
 */

/**
 * Format barcode number with spaces for readability
 * e.g. "1234567890123" → "1234 5678 9012 3"
 */
export const formatBarcodeNumber = (barcode: string): string =>
  barcode.replace(/(.{4})/g, '$1 ').trim();
