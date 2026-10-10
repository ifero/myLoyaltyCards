/**
 * Barcode Formatting Utility
 * Story 13.3: Restyle Card Detail Screen
 *
 * Barcode number formatting for card detail's Number row (CardDetails). The full-screen barcode
 * shows the number as stored, never grouped (Story 22.4).
 */

/**
 * Format barcode number with spaces for readability
 * e.g. "1234567890123" → "1234 5678 9012 3"
 */
export const formatBarcodeNumber = (barcode: string): string =>
  barcode.replace(/(.{4})/g, '$1 ').trim();
