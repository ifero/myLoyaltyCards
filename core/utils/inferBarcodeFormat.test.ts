/**
 * inferBarcodeFormat Tests
 * Story 2.2: Add Card Manually (Updated)
 */

import { inferBarcodeFormat, getBarcodeFormatDescription } from './inferBarcodeFormat';

describe('inferBarcodeFormat', () => {
  describe('EAN-13 detection', () => {
    it('detects 13-digit numbers as EAN-13', () => {
      expect(inferBarcodeFormat('5901234123457')).toBe('EAN13');
      expect(inferBarcodeFormat('4006381333931')).toBe('EAN13');
    });
  });

  describe('EAN-8 detection', () => {
    it('detects 8-digit numbers as EAN-8', () => {
      expect(inferBarcodeFormat('96385074')).toBe('EAN8');
      expect(inferBarcodeFormat('12345678')).toBe('EAN8');
    });
  });

  describe('UPC-A detection', () => {
    it('detects 12-digit numbers as UPC-A', () => {
      expect(inferBarcodeFormat('012345678905')).toBe('UPCA');
      expect(inferBarcodeFormat('123456789012')).toBe('UPCA');
    });
  });

  describe('QR Code detection', () => {
    it('detects URLs as QR Code', () => {
      expect(inferBarcodeFormat('https://example.com')).toBe('QR');
      expect(inferBarcodeFormat('http://test.com/path')).toBe('QR');
    });

    it('detects mailto links as QR Code', () => {
      expect(inferBarcodeFormat('mailto:test@example.com')).toBe('QR');
    });

    it('detects tel links as QR Code', () => {
      expect(inferBarcodeFormat('tel:+1234567890')).toBe('QR');
    });

    it('detects long content as QR Code', () => {
      const longContent = 'A'.repeat(50);
      expect(inferBarcodeFormat(longContent)).toBe('QR');
    });
  });

  describe('Code 39 detection', () => {
    it('detects alphanumeric with allowed special chars as Code 39', () => {
      expect(inferBarcodeFormat('ABC-1234')).toBe('CODE39');
      expect(inferBarcodeFormat('TEST 123')).toBe('CODE39');
      expect(inferBarcodeFormat('ITEM.001')).toBe('CODE39');
    });
  });

  describe('Code 128 fallback', () => {
    it('returns CODE128 for empty string', () => {
      expect(inferBarcodeFormat('')).toBe('CODE128');
      expect(inferBarcodeFormat('   ')).toBe('CODE128');
    });

    it('returns CODE128 for numeric values not matching other formats', () => {
      expect(inferBarcodeFormat('123')).toBe('CODE128'); // Too short for standards
      expect(inferBarcodeFormat('12345')).toBe('CODE128');
      expect(inferBarcodeFormat('1234567890')).toBe('CODE128'); // 10 digits
    });

    it('returns CODE128 for mixed content with lowercase', () => {
      expect(inferBarcodeFormat('abc123')).toBe('CODE128');
    });
  });

  describe('edge cases', () => {
    it('handles whitespace-padded values', () => {
      expect(inferBarcodeFormat('  5901234123457  ')).toBe('EAN13');
    });

    it('preserves scanner-detected format via defaultValues', () => {
      // This is handled by CardForm, not this utility
      // But we verify the utility doesn't break on pre-formatted values
      expect(inferBarcodeFormat('ABC123')).toBe('CODE39');
    });
  });
});

describe('getBarcodeFormatDescription', () => {
  it('returns human-readable descriptions', () => {
    expect(getBarcodeFormatDescription('CODE128')).toBe('Code 128 (Universal)');
    expect(getBarcodeFormatDescription('EAN13')).toBe('EAN-13 (Retail)');
    expect(getBarcodeFormatDescription('EAN8')).toBe('EAN-8 (Compact)');
    expect(getBarcodeFormatDescription('QR')).toBe('QR Code');
    expect(getBarcodeFormatDescription('CODE39')).toBe('Code 39 (Industrial)');
    expect(getBarcodeFormatDescription('UPCA')).toBe('UPC-A (North America)');
  });
});
