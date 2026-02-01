/**
 * useBarcodeScanner Hook Tests
 * Story 2.3: Scan Barcode with Camera
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';

import { useBarcodeScanner } from './useBarcodeScanner';

// Mock expo-camera
const mockRequestPermission = jest.fn();
const mockUseCameraPermissions = jest.fn();

jest.mock('expo-camera', () => ({
  CameraView: 'CameraView',
  CameraType: {
    back: 'back',
    front: 'front'
  },
  useCameraPermissions: () => mockUseCameraPermissions()
}));

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error'
  }
}));

describe('useBarcodeScanner', () => {
  const mockOnScan = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCameraPermissions.mockReturnValue([{ granted: true }, mockRequestPermission]);
  });

  describe('Initialization', () => {
    it('initializes with granted permission', () => {
      const { result } = renderHook(() => useBarcodeScanner({ onScan: mockOnScan }));

      expect(result.current.isReady).toBe(true);
      expect(result.current.hasScanned).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('initializes with denied permission', () => {
      mockUseCameraPermissions.mockReturnValue([{ granted: false }, mockRequestPermission]);

      const { result } = renderHook(() => useBarcodeScanner({ onScan: mockOnScan }));

      expect(result.current.isReady).toBe(false);
    });

    it('handles null permission status', () => {
      mockUseCameraPermissions.mockReturnValue([null, mockRequestPermission]);

      const { result } = renderHook(() => useBarcodeScanner({ onScan: mockOnScan }));

      expect(result.current.isReady).toBe(false);
    });
  });

  describe('Barcode Detection', () => {
    it('calls onScan when barcode is detected', async () => {
      const { result } = renderHook(() => useBarcodeScanner({ onScan: mockOnScan }));

      act(() => {
        result.current.handleBarcodeScanned({
          data: '1234567890',
          type: 'code128'
        });
      });

      await waitFor(() => {
        expect(mockOnScan).toHaveBeenCalledWith({
          barcode: '1234567890',
          format: 'CODE128'
        });
      });
    });

    it('maps barcode formats correctly', async () => {
      const formats = [
        { type: 'ean13', expected: 'EAN13' },
        { type: 'ean8', expected: 'EAN8' },
        { type: 'qr', expected: 'QR' },
        { type: 'code39', expected: 'CODE39' },
        { type: 'upc_a', expected: 'UPCA' },
        { type: 'unknown', expected: 'CODE128' } // default
      ];

      for (const { type, expected } of formats) {
        jest.clearAllMocks();

        // Create fresh hook for each format test
        const { result, unmount } = renderHook(() => useBarcodeScanner({ onScan: mockOnScan }));

        act(() => {
          result.current.handleBarcodeScanned({
            data: '123',
            type
          });
        });

        await waitFor(() => {
          expect(mockOnScan).toHaveBeenCalledWith({
            barcode: '123',
            format: expected
          });
        });

        unmount();
      }
    });

    it('prevents duplicate scans', async () => {
      const { result } = renderHook(() => useBarcodeScanner({ onScan: mockOnScan }));

      act(() => {
        result.current.handleBarcodeScanned({
          data: '1234567890',
          type: 'code128'
        });
      });

      // Try to scan again immediately
      act(() => {
        result.current.handleBarcodeScanned({
          data: '1234567890',
          type: 'code128'
        });
      });

      await waitFor(() => {
        expect(mockOnScan).toHaveBeenCalledTimes(1);
      });
    });

    it('does not scan when disabled', () => {
      const { result } = renderHook(() =>
        useBarcodeScanner({ onScan: mockOnScan, enabled: false })
      );

      act(() => {
        result.current.handleBarcodeScanned({
          data: '1234567890',
          type: 'code128'
        });
      });

      expect(mockOnScan).not.toHaveBeenCalled();
    });
  });

  describe('Permission Management', () => {
    it('requests permission when called', async () => {
      mockRequestPermission.mockResolvedValue({ granted: true });

      const { result } = renderHook(() => useBarcodeScanner({ onScan: mockOnScan }));

      await act(async () => {
        const granted = await result.current.requestCameraPermission();
        expect(granted).toBe(true);
      });

      expect(mockRequestPermission).toHaveBeenCalled();
    });

    it('handles permission denial', async () => {
      mockRequestPermission.mockResolvedValue({ granted: false });

      const { result } = renderHook(() => useBarcodeScanner({ onScan: mockOnScan }));

      await act(async () => {
        const granted = await result.current.requestCameraPermission();
        expect(granted).toBe(false);
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Camera permission denied');
      });
    });

    it('handles permission request errors', async () => {
      mockRequestPermission.mockRejectedValue(new Error('Permission error'));

      const { result } = renderHook(() => useBarcodeScanner({ onScan: mockOnScan }));

      await act(async () => {
        const granted = await result.current.requestCameraPermission();
        expect(granted).toBe(false);
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Permission error');
      });
    });
  });

  describe('Reset Functionality', () => {
    it('resets scan state', async () => {
      const { result } = renderHook(() => useBarcodeScanner({ onScan: mockOnScan }));

      act(() => {
        result.current.handleBarcodeScanned({
          data: '1234567890',
          type: 'code128'
        });
      });

      await waitFor(() => {
        expect(result.current.hasScanned).toBe(true);
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.hasScanned).toBe(false);
      expect(result.current.error).toBe(null);
    });
  });
});
