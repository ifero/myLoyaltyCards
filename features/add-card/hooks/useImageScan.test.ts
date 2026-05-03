/**
 * useImageScan Hook Tests
 * Story 2.9: Scan Cards from Image or Screenshot
 */

import { renderHook, act } from '@testing-library/react-native';
import { scanFromURLAsync } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';

import { ScanResult } from '@/features/cards/hooks/useBarcodeScanner';

import { useImageScan } from './useImageScan';

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn()
}));

jest.mock('expo-camera', () => ({
  scanFromURLAsync: jest.fn()
}));

const mockLaunch = ImagePicker.launchImageLibraryAsync as jest.Mock;
const mockScanFromURL = scanFromURLAsync as jest.Mock;

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
    mockScanFromURL.mockResolvedValueOnce([{ data: '1234567890128', type: 'ean13' }]);

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
    mockScanFromURL.mockResolvedValueOnce([{ data: '0012345678901', type: 'ean13' }]);

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
      { data: 'CODE-A', type: 'code128' },
      { data: 'CODE-B', type: 'code39' }
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
      Array.from({ length: 9 }, (_, i) => ({ data: `CODE-${i}`, type: 'code128' }))
    );

    const { result } = renderHook(() => useImageScan({ onCodeResolved }));

    await act(async () => {
      await result.current.pickAndScan();
    });

    expect(result.current.multiCodes).toHaveLength(6);
  });

  it('sets showError and clears isProcessing when scanFromURLAsync throws', async () => {
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
      { data: 'A', type: 'code128' },
      { data: 'B', type: 'code128' }
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
      { data: 'SELECTED', type: 'qr' },
      { data: 'OTHER', type: 'code128' }
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
    const formats: Array<{ type: string; expected: string }> = [
      { type: 'code128', expected: 'CODE128' },
      { type: 'ean13', expected: 'EAN13' },
      { type: 'ean8', expected: 'EAN8' },
      { type: 'qr', expected: 'QR' },
      { type: 'code39', expected: 'CODE39' },
      { type: 'upc_a', expected: 'UPCA' }
    ];

    for (const { type, expected } of formats) {
      jest.clearAllMocks();
      const cb = jest.fn();

      mockLaunch.mockResolvedValueOnce(assetResult('file://test.jpg'));
      mockScanFromURL.mockResolvedValueOnce([{ data: 'VALUE', type }]);

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
    mockScanFromURL.mockResolvedValueOnce([{ data: '0226007855218', type: 'code128' }]);

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
    mockScanFromURL.mockResolvedValueOnce([{ data: '0226007855219', type: 'code128' }]);

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
    mockScanFromURL.mockResolvedValueOnce([{ data: 'SHORT123', type: 'code128' }]);

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
