/**
 * Tests for normalizeBarcode + applyExpectedFormat.
 */

import { applyExpectedFormat, isValidEAN13Checksum, normalizeBarcode } from './normalizeBarcode';

describe('isValidEAN13Checksum', () => {
  it('returns true for a known-good EAN-13 (Conad: 0226007855218)', () => {
    expect(isValidEAN13Checksum('0226007855218')).toBe(true);
  });

  it('returns true for a known-good EAN-13 (1234567890128)', () => {
    expect(isValidEAN13Checksum('1234567890128')).toBe(true);
  });

  it('returns false when checksum digit is wrong', () => {
    expect(isValidEAN13Checksum('0226007855219')).toBe(false);
  });

  it('returns false for non-13-digit strings', () => {
    expect(isValidEAN13Checksum('022600785521')).toBe(false);
    expect(isValidEAN13Checksum('02260078552180')).toBe(false);
  });

  it('returns false for non-numeric strings', () => {
    expect(isValidEAN13Checksum('022600785521A')).toBe(false);
    expect(isValidEAN13Checksum('')).toBe(false);
  });
});

describe('normalizeBarcode (canonical)', () => {
  it('promotes UPC-A 12-digit to EAN-13 with leading zero (Conad case)', () => {
    // 226007855218 is the Conad value with the leading 0 stripped (UPC-A form).
    expect(normalizeBarcode('226007855218', 'UPCA')).toEqual({
      value: '0226007855218',
      format: 'EAN13'
    });
  });

  it('does not promote UPC-A when 0-prefix would yield an invalid EAN-13 checksum', () => {
    // 226007855219 padded to 0226007855219 has bad checksum — keep as UPCA.
    expect(normalizeBarcode('226007855219', 'UPCA')).toEqual({
      value: '226007855219',
      format: 'UPCA'
    });
  });

  it('leaves UPC-A alone when value is not exactly 12 digits', () => {
    expect(normalizeBarcode('abc', 'UPCA')).toEqual({
      value: 'abc',
      format: 'UPCA'
    });
    expect(normalizeBarcode('22600785521', 'UPCA')).toEqual({
      value: '22600785521',
      format: 'UPCA'
    });
  });

  it('promotes CODE128 carrying a 13-digit valid EAN-13 to EAN-13', () => {
    expect(normalizeBarcode('0226007855218', 'CODE128')).toEqual({
      value: '0226007855218',
      format: 'EAN13'
    });
  });

  it('keeps CODE128 when 13 digits but invalid EAN-13 checksum', () => {
    expect(normalizeBarcode('0226007855219', 'CODE128')).toEqual({
      value: '0226007855219',
      format: 'CODE128'
    });
  });

  it('keeps CODE128 when not 13 digits', () => {
    expect(normalizeBarcode('SHORT123', 'CODE128')).toEqual({
      value: 'SHORT123',
      format: 'CODE128'
    });
  });

  it('passes EAN-13 through unchanged', () => {
    expect(normalizeBarcode('0226007855218', 'EAN13')).toEqual({
      value: '0226007855218',
      format: 'EAN13'
    });
  });

  it('passes QR through unchanged', () => {
    expect(normalizeBarcode('https://example.com', 'QR')).toEqual({
      value: 'https://example.com',
      format: 'QR'
    });
  });

  it('relabels UPC-A to EAN-13 when scanner returned full 13 digits with valid checksum', () => {
    // ML Kit on iOS sometimes returns the full 13-digit form but still labels UPCA.
    expect(normalizeBarcode('0226007855218', 'UPCA')).toEqual({
      value: '0226007855218',
      format: 'EAN13'
    });
  });

  it('does not relabel UPC-A 13-digit when checksum is invalid', () => {
    expect(normalizeBarcode('0226007855219', 'UPCA')).toEqual({
      value: '0226007855219',
      format: 'UPCA'
    });
  });

  it('trims surrounding whitespace before applying rules', () => {
    expect(normalizeBarcode('  226007855218\n', 'UPCA')).toEqual({
      value: '0226007855218',
      format: 'EAN13'
    });
  });

  it('passes the empty string through unchanged', () => {
    expect(normalizeBarcode('', 'CODE128')).toEqual({
      value: '',
      format: 'CODE128'
    });
  });

  it('rejects values prefixed with + or - (regex requires pure digits)', () => {
    expect(normalizeBarcode('+12345678901', 'UPCA')).toEqual({
      value: '+12345678901',
      format: 'UPCA'
    });
    expect(normalizeBarcode('-22600785521', 'UPCA')).toEqual({
      value: '-22600785521',
      format: 'UPCA'
    });
  });

  it('passes EAN-8 through unchanged (not in scope of any rule)', () => {
    expect(normalizeBarcode('12345670', 'EAN8')).toEqual({
      value: '12345670',
      format: 'EAN8'
    });
  });

  it('is idempotent — passing canonical output back through is a no-op', () => {
    const first = normalizeBarcode('226007855218', 'UPCA');
    const second = normalizeBarcode(first.value, first.format);
    expect(second).toEqual(first);
  });
});

describe('applyExpectedFormat (catalogue-driven)', () => {
  it('restores leading 0 when expected=EAN13 and value is 12 digits with valid padded checksum', () => {
    // Scanner returned 12 digits as EAN13 (mis-decoded). Catalogue says EAN13.
    expect(applyExpectedFormat({ value: '226007855218', format: 'EAN13' }, 'EAN13')).toEqual({
      value: '0226007855218',
      format: 'EAN13'
    });
  });

  it('restores leading 0 when expected=EAN13 and value is 12 digits format=CODE128', () => {
    // Scanner returned 12 digits as CODE128 — catalogue hint pulls it into EAN-13.
    expect(applyExpectedFormat({ value: '226007855218', format: 'CODE128' }, 'EAN13')).toEqual({
      value: '0226007855218',
      format: 'EAN13'
    });
  });

  it('does not pad when padded value would have invalid EAN-13 checksum', () => {
    expect(applyExpectedFormat({ value: '226007855219', format: 'EAN13' }, 'EAN13')).toEqual({
      value: '226007855219',
      format: 'EAN13'
    });
  });

  it('does not change a value that is already 13 digits and EAN-13', () => {
    expect(applyExpectedFormat({ value: '0226007855218', format: 'EAN13' }, 'EAN13')).toEqual({
      value: '0226007855218',
      format: 'EAN13'
    });
  });

  it('is a no-op when expectedFormat is undefined', () => {
    expect(applyExpectedFormat({ value: '226007855218', format: 'UPCA' }, undefined)).toEqual({
      value: '226007855218',
      format: 'UPCA'
    });
  });

  it('is a no-op when expectedFormat is not EAN13', () => {
    expect(applyExpectedFormat({ value: '226007855218', format: 'UPCA' }, 'CODE128')).toEqual({
      value: '226007855218',
      format: 'UPCA'
    });
  });

  it('is idempotent when chained after normalizeBarcode', () => {
    // Realistic flow: scanner returned UPCA-12 → canonical normalize → expected EAN13
    const canonical = normalizeBarcode('226007855218', 'UPCA');
    const final = applyExpectedFormat(canonical, 'EAN13');
    expect(final).toEqual({ value: '0226007855218', format: 'EAN13' });
  });

  it('does not pad non-numeric 12-character values', () => {
    expect(applyExpectedFormat({ value: 'ABCDEFGHIJKL', format: 'CODE128' }, 'EAN13')).toEqual({
      value: 'ABCDEFGHIJKL',
      format: 'CODE128'
    });
  });
});
