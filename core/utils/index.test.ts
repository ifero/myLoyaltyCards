import { inferBarcodeFormat, getBarcodeFormatDescription, mapHexToCardColor } from './index';

test('utils index re-exports work', () => {
  expect(typeof inferBarcodeFormat).toBe('function');
  expect(typeof getBarcodeFormatDescription).toBe('function');
  expect(typeof mapHexToCardColor).toBe('function');

  // basic smoke calls
  expect(inferBarcodeFormat('5901234123457')).toBe('EAN13');
  expect(getBarcodeFormatDescription('EAN13')).toBe('EAN-13 (Retail)');
  expect(mapHexToCardColor('#FF0000')).toBe('red');
});
