/**
 * useImageScan Hook Tests
 * Story 2.9: Scan Cards from Image or Screenshot
 */

import BarcodeScanning, {
  BarcodeFormat as MlKitBarcodeFormat
} from '@react-native-ml-kit/barcode-scanning';
import { renderHook, act } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';

import { ScanResult } from '@/features/cards/hooks/useBarcodeScanner';

import { useImageScan } from './useImageScan';

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn()
}));

jest.mock('@react-native-ml-kit/barcode-scanning', () => ({
  __esModule: true,
  default: {
    scan: jest.fn()
  },
  BarcodeFormat: {
    CODE_128: 1,
    CODE_39: 2,
    EAN_13: 32,
    EAN_8: 64,
    QR_CODE: 256,
    UPC_A: 512
  }
}));

const mockLaunch = ImagePicker.launchImageLibraryAsync as jest.Mock;
const mockScanFromURL = BarcodeScanning.scan as jest.Mock;

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
    mockScanFromURL.mockResolvedValueOnce([]);

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
    mockScanFromURL.mockResolvedValueOnce([
      { value: '1234567890128', format: MlKitBarcodeFormat.EAN_13 }
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
    mockScanFromURL.mockResolvedValueOnce([
      { value: '0012345678901', format: MlKitBarcodeFormat.EAN_13 }
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
    mockScanFromURL.mockResolvedValueOnce([
      { value: 'CODE-A', format: MlKitBarcodeFormat.CODE_128 },
      { value: 'CODE-B', format: MlKitBarcodeFormat.CODE_39 }
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
    mockScanFromURL.mockResolvedValueOnce(
      Array.from({ length: 9 }, (_, i) => ({
        value: `CODE-${i}`,
        format: MlKitBarcodeFormat.CODE_128
      }))
    );

    const { result } = renderHook(() => useImageScan({ onCodeResolved }));

    await act(async () => {
      await result.current.pickAndScan();
    });

    expect(result.current.multiCodes).toHaveLength(6);
  });

  it('sets showError and clears isProcessing when BarcodeScanning.scan throws', async () => {
    mockLaunch.mockResolvedValueOnce(assetResult('file://test.jpg'));
    mockScanFromURL.mockRejectedValueOnce(new Error('Decode failed'));

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
    mockScanFromURL.mockResolvedValueOnce([]);

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
    mockScanFromURL.mockResolvedValueOnce([
      { value: 'A', format: MlKitBarcodeFormat.CODE_128 },
      { value: 'B', format: MlKitBarcodeFormat.CODE_128 }
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
    mockScanFromURL.mockResolvedValueOnce([
      { value: 'SELECTED', format: MlKitBarcodeFormat.QR_CODE },
      { value: 'OTHER', format: MlKitBarcodeFormat.CODE_128 }
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
    const formats: Array<{ type: MlKitBarcodeFormat; expected: string }> = [
      { type: MlKitBarcodeFormat.CODE_128, expected: 'CODE128' },
      { type: MlKitBarcodeFormat.EAN_13, expected: 'EAN13' },
      { type: MlKitBarcodeFormat.EAN_8, expected: 'EAN8' },
      { type: MlKitBarcodeFormat.QR_CODE, expected: 'QR' },
      { type: MlKitBarcodeFormat.CODE_39, expected: 'CODE39' },
      { type: MlKitBarcodeFormat.UPC_A, expected: 'UPCA' }
    ];

    for (const { type, expected } of formats) {
      jest.clearAllMocks();
      const cb = jest.fn();

      mockLaunch.mockResolvedValueOnce(assetResult('file://test.jpg'));
      mockScanFromURL.mockResolvedValueOnce([{ value: 'VALUE', format: type }]);

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
    mockScanFromURL.mockResolvedValueOnce([
      { value: '0226007855218', format: MlKitBarcodeFormat.CODE_128 }
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
    mockScanFromURL.mockResolvedValueOnce([
      { value: '0226007855219', format: MlKitBarcodeFormat.CODE_128 }
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
    mockScanFromURL.mockResolvedValueOnce([
      { value: 'SHORT123', format: MlKitBarcodeFormat.CODE_128 }
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
});
