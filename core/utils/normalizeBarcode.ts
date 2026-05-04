/**
 * Barcode Normalization Utility
 *
 * Canonical post-scan normalization for barcode values returned by ML Kit /
 * expo-camera. Two well-defined transformations are applied:
 *
 *   1. UPC-A → EAN-13 (mathematical equivalence)
 *      A UPC-A barcode is structurally identical to an EAN-13 barcode whose
 *      first digit is `0` (the GS1 country prefix for North America). Most
 *      retail-loyalty pipelines store these values as 13-digit EAN-13 to
 *      keep a single canonical representation. When a scanner returns
 *      `format=UPCA, value=12 digits`, prepending `0` and labelling it as
 *      EAN-13 is always safe and reversible.
 *
 *   2. CODE128 carrying valid EAN-13 data → EAN-13
 *      Many loyalty cards (incl. Italian Conad cards) print their EAN-13
 *      barcode using the Code 128 symbology so the rendered bars are
 *      narrower. The decoded payload is still 13 digits with a valid EAN-13
 *      checksum, in which case treating it as EAN-13 lets the rest of the
 *      app render and search by the canonical format.
 *
 * The function returns BOTH the (possibly transformed) value and the
 * (possibly corrected) format so callers can apply both in one step.
 */
import { BarcodeFormat } from '@/core/schemas';

/**
 * Validate the checksum digit of a 13-digit EAN-13 candidate.
 *
 * Standard weighted-sum: positions 1,3,5,7,9,11 weight 1; positions 2,4,6,8,10,12
 * weight 3. Checksum = (10 - (sum mod 10)) mod 10, must equal digit 13.
 */
export function isValidEAN13Checksum(code: string): boolean {
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

export interface NormalizedBarcode {
  value: string;
  format: BarcodeFormat;
}

/**
 * Canonical post-scan normalization.
 *
 * Applies math-driven format/value corrections that are always safe regardless
 * of catalogue context. Catalogue-driven corrections (e.g. "the brand says
 * EAN-13, force-pad a 12-digit value") should be applied by the caller AFTER
 * this function, since they require knowledge this util doesn't have.
 *
 * @param rawValue        - raw value returned by the scanner
 * @param detectedFormat  - format reported by the scanner
 * @returns                 normalized { value, format }
 */
export function normalizeBarcode(
  rawValue: string,
  detectedFormat: BarcodeFormat
): NormalizedBarcode {
  // Rule 1: UPC-A is EAN-13 with a leading 0.
  if (detectedFormat === 'UPCA' && rawValue.length === 12 && /^\d+$/.test(rawValue)) {
    const padded = `0${rawValue}`;
    if (isValidEAN13Checksum(padded)) {
      return { value: padded, format: 'EAN13' };
    }
  }

  // Rule 2: CODE128 carrying a 13-digit payload with a valid EAN-13 checksum
  // is almost always an EAN-13 barcode rendered via Code 128 symbology.
  if (detectedFormat === 'CODE128' && rawValue.length === 13 && isValidEAN13Checksum(rawValue)) {
    return { value: rawValue, format: 'EAN13' };
  }

  return { value: rawValue, format: detectedFormat };
}

/**
 * Catalogue-driven leading-zero padding for known-EAN13 brands.
 *
 * When the catalogue advertises a brand as EAN-13 but the scanner returns 12
 * digits (e.g. the leading `0` was stripped during decoding), prepend `0` and
 * relabel as EAN-13 IF the resulting 13-digit string has a valid checksum.
 * The checksum gate prevents corrupting genuine non-EAN-13 numeric payloads
 * that happen to be 12 digits long.
 *
 * Idempotent and safe to call after `normalizeBarcode` — it only changes the
 * value when a paste-in / mis-decoded EAN-13 needs its prefix restored.
 */
export function applyExpectedFormat(
  current: NormalizedBarcode,
  expectedFormat: BarcodeFormat | undefined
): NormalizedBarcode {
  if (expectedFormat !== 'EAN13') return current;
  if (current.format === 'EAN13' && current.value.length === 13) return current;

  if (current.value.length === 12 && /^\d+$/.test(current.value)) {
    const padded = `0${current.value}`;
    if (isValidEAN13Checksum(padded)) {
      return { value: padded, format: 'EAN13' };
    }
  }

  return current;
}
