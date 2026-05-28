/**
 * useImageScan Hook Tests
 * Story 2.9: Scan Cards from Image or Screenshot
 */

import { renderHook, act } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import ImageCodeScanner, {
  BarcodeFormat as ImageBarcodeFormat
} from 'react-native-image-code-scanner';

import { ScanResult } from '@/features/cards/hooks/useBarcodeScanner';

import { useImageScan } from './useImageScan';

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn()
}));

jest.mock('react-native-image-code-scanner', () => ({
  __esModule: true,
  default: {
    scan: jest.fn()
  },
  BarcodeFormat: {
    CODE_128: 'CODE_128',
    CODE_39: 'CODE_39',
    EAN_13: 'EAN_13',
    EAN_8: 'EAN_8',
    QR_CODE: 'QR_CODE',
    UPC_A: 'UPC_A'
  }
}));

const mockLaunch = ImagePicker.launchImageLibraryAsync as jest.Mock;
const mockScanImage = ImageCodeScanner.scan as jest.Mock;

const CANCELLED_RESULT: ImagePicker.ImagePickerResult = {
  canceled: true,
  assets: null
};

const assetResult = (uri: string): ImagePicker.ImagePickerResult => ({
  canceled: false,
  assets: [
    {
      uri,
      width: 800,
      height: 600,
      assetId: null,
      base64: null,
      duration: null,
      exif: null,
      fileName: 'test.jpg',
      fileSize: 12345,
      mimeType: 'image/jpeg',
      pairedVideoAsset: null,
      type: 'image'
    }
  ]
});

describe('useImageScan', () => {
  let onCodeResolved: jest.Mock<void, [ScanResult]>;

  beforeEach(() => {
    jest.clearAllMocks();
    onCodeResolved = jest.fn();
  });

  it('does nothing when user cancels the picker', async () => {
    mockLaunch.mockResolvedValueOnce(CANCELLED_RESULT);

    const { result } = renderHook(() => useImageScan({ onCodeResolved }));

    await act(async () => {
      await result.current.pickAndScan();
    });

    expect(result.current.isProcessing).toBe(false);
    expect(result.current.showError).toBe(false);
    expect(result.current.multiCodes).toHaveLength(0);
    expect(onCodeResolved).not.toHaveBeenCalled();
  });

  it('sets showError when no barcodes found in image', async () => {
    mockLaunch.mockResolvedValueOnce(assetResult('file://test.jpg'));
    mockScanImage.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useImageScan({ onCodeResolved }));

    await act(async () => {
      await result.current.pickAndScan();
    });

    expect(result.current.showError).toBe(true);
    expect(result.current.isProcessing).toBe(false);
    expect(onCodeResolved).not.toHaveBeenCalled();
  });

  it('calls onCodeResolved with correct args when exactly 1 barcode found', async () => {
    mockLaunch.mockResolvedValueOnce(assetResult('file://test.jpg'));
    mockScanImage.mockResolvedValueOnce([
      { content: '1234567890128', format: ImageBarcodeFormat.EAN_13 }
    ]);

    const { result } = renderHook(() => useImageScan({ onCodeResolved }));

    await act(async () => {
      await result.current.pickAndScan();
    });

    expect(onCodeResolved).toHaveBeenCalledWith({
      barcode: '1234567890128',
      format: 'EAN13'
    });
    expect(result.current.showError).toBe(false);
    expect(result.current.multiCodes).toHaveLength(0);
  });

  it('preserves leading zeros in barcode data (AC3)', async () => {
    mockLaunch.mockResolvedValueOnce(assetResult('file://test.jpg'));
    mockScanImage.mockResolvedValueOnce([
      { content: '0012345678901', format: ImageBarcodeFormat.EAN_13 }
    ]);

    const { result } = renderHook(() => useImageScan({ onCodeResolved }));

    await act(async () => {
      await result.current.pickAndScan();
    });

    expect(onCodeResolved).toHaveBeenCalledWith({
      barcode: '0012345678901',
      format: 'EAN13'
    });
  });

  it('sets multiCodes when 2+ barcodes found', async () => {
    mockLaunch.mockResolvedValueOnce(assetResult('file://test.jpg'));
    mockScanImage.mockResolvedValueOnce([
      { content: 'CODE-A', format: ImageBarcodeFormat.CODE_128 },
      { content: 'CODE-B', format: ImageBarcodeFormat.CODE_39 }
    ]);

    const { result } = renderHook(() => useImageScan({ onCodeResolved }));

    await act(async () => {
      await result.current.pickAndScan();
    });

    expect(result.current.multiCodes).toHaveLength(2);
    expect(result.current.multiCodes[0]).toEqual({ value: 'CODE-A', format: 'CODE128' });
    expect(result.current.multiCodes[1]).toEqual({ value: 'CODE-B', format: 'CODE39' });
    expect(onCodeResolved).not.toHaveBeenCalled();
  });

  it('caps multiCodes at 6 when more than 6 barcodes present', async () => {
    mockLaunch.mockResolvedValueOnce(assetResult('file://test.jpg'));
    mockScanImage.mockResolvedValueOnce(
      Array.from({ length: 9 }, (_, i) => ({
        content: `CODE-${i}`,
        format: ImageBarcodeFormat.CODE_128
      }))
    );

    const { result } = renderHook(() => useImageScan({ onCodeResolved }));

    await act(async () => {
      await result.current.pickAndScan();
    });

    expect(result.current.multiCodes).toHaveLength(6);
  });

  it('sets showError and clears isProcessing when ImageCodeScanner.scan throws', async () => {
    mockLaunch.mockResolvedValueOnce(assetResult('file://test.jpg'));
    mockScanImage.mockRejectedValueOnce(new Error('Decode failed'));

    const { result } = renderHook(() => useImageScan({ onCodeResolved }));

    await act(async () => {
      await result.current.pickAndScan();
    });

    expect(result.current.showError).toBe(true);
    expect(result.current.isProcessing).toBe(false);
    expect(onCodeResolved).not.toHaveBeenCalled();
  });

  it('dismissError clears showError', async () => {
    mockLaunch.mockResolvedValueOnce(assetResult('file://test.jpg'));
    mockScanImage.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useImageScan({ onCodeResolved }));

    await act(async () => {
      await result.current.pickAndScan();
    });

    expect(result.current.showError).toBe(true);

    act(() => {
      result.current.dismissError();
    });

    expect(result.current.showError).toBe(false);
  });

  it('dismissMultiPicker clears multiCodes', async () => {
    mockLaunch.mockResolvedValueOnce(assetResult('file://test.jpg'));
    mockScanImage.mockResolvedValueOnce([
      { content: 'A', format: ImageBarcodeFormat.CODE_128 },
      { content: 'B', format: ImageBarcodeFormat.CODE_128 }
    ]);

    const { result } = renderHook(() => useImageScan({ onCodeResolved }));

    await act(async () => {
      await result.current.pickAndScan();
    });

    expect(result.current.multiCodes).toHaveLength(2);

    act(() => {
      result.current.dismissMultiPicker();
    });

    expect(result.current.multiCodes).toHaveLength(0);
  });

  it('selectCode clears multiCodes and calls onCodeResolved', async () => {
    mockLaunch.mockResolvedValueOnce(assetResult('file://test.jpg'));
    mockScanImage.mockResolvedValueOnce([
      { content: 'SELECTED', format: ImageBarcodeFormat.QR_CODE },
      { content: 'OTHER', format: ImageBarcodeFormat.CODE_128 }
    ]);

    const { result } = renderHook(() => useImageScan({ onCodeResolved }));

    await act(async () => {
      await result.current.pickAndScan();
    });

    act(() => {
      result.current.selectCode({ value: 'SELECTED', format: 'QR' });
    });

    expect(result.current.multiCodes).toHaveLength(0);
    expect(onCodeResolved).toHaveBeenCalledWith({ barcode: 'SELECTED', format: 'QR' });
  });

  it('maps all supported barcode format types correctly', async () => {
    const formats: Array<{ type: ImageBarcodeFormat; expected: string }> = [
      { type: ImageBarcodeFormat.CODE_128, expected: 'CODE128' },
      { type: ImageBarcodeFormat.EAN_13, expected: 'EAN13' },
      { type: ImageBarcodeFormat.EAN_8, expected: 'EAN8' },
      { type: ImageBarcodeFormat.QR_CODE, expected: 'QR' },
      { type: ImageBarcodeFormat.CODE_39, expected: 'CODE39' },
      { type: ImageBarcodeFormat.UPC_A, expected: 'UPCA' }
    ];

    for (const { type, expected } of formats) {
      jest.clearAllMocks();
      const cb = jest.fn();

      mockLaunch.mockResolvedValueOnce(assetResult('file://test.jpg'));
      mockScanImage.mockResolvedValueOnce([{ content: 'VALUE', format: type }]);

      const { result } = renderHook(() => useImageScan({ onCodeResolved: cb }));

      await act(async () => {
        await result.current.pickAndScan();
      });

      expect(cb).toHaveBeenCalledWith(expect.objectContaining({ format: expected }));
    }
  });

  it('auto-corrects CODE128 to EAN13 when code is valid EAN-13 (13 digits + valid checksum)', async () => {
    mockLaunch.mockResolvedValueOnce(assetResult('file://test.jpg'));
    // 0226007855218 is a valid EAN-13 (from your Conad card example)
    mockScanImage.mockResolvedValueOnce([
      { content: '0226007855218', format: ImageBarcodeFormat.CODE_128 }
    ]);

    const { result } = renderHook(() => useImageScan({ onCodeResolved }));

    await act(async () => {
      await result.current.pickAndScan();
    });

    expect(onCodeResolved).toHaveBeenCalledWith({
      barcode: '0226007855218',
      format: 'EAN13'
    });
  });

  it('keeps CODE128 when code is 13 digits but invalid EAN-13 checksum', async () => {
    mockLaunch.mockResolvedValueOnce(assetResult('file://test.jpg'));
    // Valid format but wrong checksum
    mockScanImage.mockResolvedValueOnce([
      { content: '0226007855219', format: ImageBarcodeFormat.CODE_128 }
    ]);

    const { result } = renderHook(() => useImageScan({ onCodeResolved }));

    await act(async () => {
      await result.current.pickAndScan();
    });

    expect(onCodeResolved).toHaveBeenCalledWith({
      barcode: '0226007855219',
      format: 'CODE128'
    });
  });

  it('keeps CODE128 when code is not 13 digits', async () => {
    mockLaunch.mockResolvedValueOnce(assetResult('file://test.jpg'));
    mockScanImage.mockResolvedValueOnce([
      { content: 'SHORT123', format: ImageBarcodeFormat.CODE_128 }
    ]);

    const { result } = renderHook(() => useImageScan({ onCodeResolved }));

    await act(async () => {
      await result.current.pickAndScan();
    });

    expect(onCodeResolved).toHaveBeenCalledWith({
      barcode: 'SHORT123',
      format: 'CODE128'
    });
  });

  it('promotes UPC-A 12-digit to EAN-13 with leading zero (canonical)', async () => {
    mockLaunch.mockResolvedValueOnce(assetResult('file://test.jpg'));
    // ML Kit on iOS often returns this Conad barcode as UPC-A (12 digits, leading 0 stripped)
    mockScanImage.mockResolvedValueOnce([
      { content: '226007855218', format: ImageBarcodeFormat.UPC_A }
    ]);

    const { result } = renderHook(() => useImageScan({ onCodeResolved }));

    await act(async () => {
      await result.current.pickAndScan();
    });

    expect(onCodeResolved).toHaveBeenCalledWith({
      barcode: '0226007855218',
      format: 'EAN13'
    });
  });

  it('restores stripped EAN-13 leading zero when expectedFormat=EAN13 (catalogue hint)', async () => {
    mockLaunch.mockResolvedValueOnce(assetResult('file://test.jpg'));
    // Some scanners return CODE128 carrying 12 digits when the source is a leading-0 EAN-13
    mockScanImage.mockResolvedValueOnce([
      { content: '226007855218', format: ImageBarcodeFormat.CODE_128 }
    ]);

    const { result } = renderHook(() => useImageScan({ onCodeResolved, expectedFormat: 'EAN13' }));

    await act(async () => {
      await result.current.pickAndScan();
    });

    expect(onCodeResolved).toHaveBeenCalledWith({
      barcode: '0226007855218',
      format: 'EAN13'
    });
  });

  it('does not pad to EAN-13 when expectedFormat=EAN13 but checksum would be invalid', async () => {
    mockLaunch.mockResolvedValueOnce(assetResult('file://test.jpg'));
    mockScanImage.mockResolvedValueOnce([
      { content: '226007855219', format: ImageBarcodeFormat.CODE_128 }
    ]);

    const { result } = renderHook(() => useImageScan({ onCodeResolved, expectedFormat: 'EAN13' }));

    await act(async () => {
      await result.current.pickAndScan();
    });

    expect(onCodeResolved).toHaveBeenCalledWith({
      barcode: '226007855219',
      format: 'CODE128'
    });
  });

  it('applies normalization to multi-code results too', async () => {
    mockLaunch.mockResolvedValueOnce(assetResult('file://test.jpg'));
    mockScanImage.mockResolvedValueOnce([
      { content: '226007855218', format: ImageBarcodeFormat.UPC_A },
      { content: 'OTHER', format: ImageBarcodeFormat.CODE_128 }
    ]);

    const { result } = renderHook(() => useImageScan({ onCodeResolved }));

    await act(async () => {
      await result.current.pickAndScan();
    });

    expect(result.current.multiCodes).toEqual([
      { value: '0226007855218', format: 'EAN13' },
      { value: 'OTHER', format: 'CODE128' }
    ]);
  });
});
