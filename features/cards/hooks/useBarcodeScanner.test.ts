/**
 * useBarcodeScanner Hook Tests
 * Story 2.3: Scan Barcode with Camera
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';

import { logger } from '@/core/utils';

import { useBarcodeScanner } from './useBarcodeScanner';

// Only `logger.notify` is stubbed; `normalizeBarcode` / `applyExpectedFormat`
// stay REAL because the format-promotion assertions depend on them.
jest.mock('@/core/utils', () => {
  const actual = jest.requireActual('@/core/utils');
  return { ...actual, logger: { ...actual.logger, notify: jest.fn() } };
});

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

const mockNotify = logger.notify as jest.Mock;

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

    // Story 16.23 (AC4): the `?? 'CODE128'` fallback stores a card with the
    // wrong `barcodeFormat`, and it did so silently. The fallback itself is a
    // reasonable default and is deliberately unchanged — it just has to be
    // countable in production now.
    it('notifies when a camera format falls through to CODE128', async () => {
      const { result } = renderHook(() => useBarcodeScanner({ onScan: mockOnScan }));

      act(() => {
        result.current.handleBarcodeScanned({ data: '123', type: 'itf14' });
      });

      await waitFor(() => {
        expect(mockNotify).toHaveBeenCalledWith(
          'Barcode format fell back to CODE128',
          expect.objectContaining({
            tags: expect.objectContaining({ surface: 'camera' }),
            context: [expect.objectContaining({ unmappedFormat: 'itf14' })]
          })
        );
      });

      // Observability only — the stored format must not change.
      expect(mockOnScan).toHaveBeenCalledWith({ barcode: '123', format: 'CODE128' });
    });

    it('does not notify for any mapped camera format label', async () => {
      const mapped = ['code128', 'ean13', 'ean8', 'qr', 'code39', 'upc_a'];

      for (const type of mapped) {
        jest.clearAllMocks();
        const { result, unmount } = renderHook(() => useBarcodeScanner({ onScan: mockOnScan }));

        act(() => {
          result.current.handleBarcodeScanned({ data: '123', type });
        });

        await waitFor(() => {
          expect(mockOnScan).toHaveBeenCalledTimes(1);
        });
        expect(mockNotify).not.toHaveBeenCalled();

        unmount();
      }
    });

    it('reports a repeated unmapped label only once per mounted scanner', async () => {
      // `hasScanned` re-arms after 2 s, so an unmapped barcode left in frame would
      // otherwise emit one Sentry event every two seconds for as long as the user
      // holds the camera still.
      jest.useFakeTimers();
      const { result } = renderHook(() => useBarcodeScanner({ onScan: mockOnScan }));

      act(() => {
        result.current.handleBarcodeScanned({ data: '123', type: 'itf14' });
      });
      expect(mockNotify).toHaveBeenCalledTimes(1);

      // Let the re-entry guard re-arm, then present the same barcode again.
      act(() => {
        jest.advanceTimersByTime(2000);
      });
      act(() => {
        result.current.handleBarcodeScanned({ data: '123', type: 'itf14' });
      });

      expect(mockNotify).toHaveBeenCalledTimes(1);
      // The scan itself is unaffected — dedupe is telemetry-only.
      expect(mockOnScan).toHaveBeenCalledTimes(2);
      jest.useRealTimers();
    });

    it('reports again for a remounted scanner, so a recurring problem stays countable', async () => {
      const first = renderHook(() => useBarcodeScanner({ onScan: mockOnScan }));
      act(() => {
        first.result.current.handleBarcodeScanned({ data: '123', type: 'itf14' });
      });
      expect(mockNotify).toHaveBeenCalledTimes(1);
      first.unmount();

      const second = renderHook(() => useBarcodeScanner({ onScan: mockOnScan }));
      act(() => {
        second.result.current.handleBarcodeScanned({ data: '123', type: 'itf14' });
      });

      expect(mockNotify).toHaveBeenCalledTimes(2);
      second.unmount();
    });

    it('still reports a DIFFERENT unmapped label on the same scanner', async () => {
      jest.useFakeTimers();
      const { result } = renderHook(() => useBarcodeScanner({ onScan: mockOnScan }));

      act(() => {
        result.current.handleBarcodeScanned({ data: '123', type: 'itf14' });
      });
      act(() => {
        jest.advanceTimersByTime(2000);
      });
      act(() => {
        result.current.handleBarcodeScanned({ data: '456', type: 'codabar' });
      });

      expect(mockNotify).toHaveBeenCalledTimes(2);
      jest.useRealTimers();
    });

    it('never sends the scanned value to telemetry', async () => {
      const { result } = renderHook(() => useBarcodeScanner({ onScan: mockOnScan }));

      act(() => {
        result.current.handleBarcodeScanned({ data: '2095110257978', type: 'itf14' });
      });

      await waitFor(() => {
        expect(mockNotify).toHaveBeenCalledTimes(1);
      });
      expect(JSON.stringify(mockNotify.mock.calls)).not.toContain('2095110257978');
    });

    it('preserves EAN-13 with leading zero through the format mapping loop', async () => {
      const { result } = renderHook(() => useBarcodeScanner({ onScan: mockOnScan }));

      act(() => {
        result.current.handleBarcodeScanned({
          data: '0226007855218',
          type: 'ean13'
        });
      });

      await waitFor(() => {
        expect(mockOnScan).toHaveBeenCalledWith({
          barcode: '0226007855218',
          format: 'EAN13'
        });
      });
    });

    it('promotes UPC-A 12-digit to EAN-13 with leading zero (canonical)', async () => {
      const { result } = renderHook(() => useBarcodeScanner({ onScan: mockOnScan }));

      act(() => {
        result.current.handleBarcodeScanned({
          data: '226007855218',
          type: 'upc_a'
        });
      });

      await waitFor(() => {
        expect(mockOnScan).toHaveBeenCalledWith({
          barcode: '0226007855218',
          format: 'EAN13'
        });
      });
    });

    it('promotes CODE128 carrying valid 13-digit EAN-13 to EAN-13', async () => {
      const { result } = renderHook(() => useBarcodeScanner({ onScan: mockOnScan }));

      act(() => {
        result.current.handleBarcodeScanned({
          data: '0226007855218',
          type: 'code128'
        });
      });

      await waitFor(() => {
        expect(mockOnScan).toHaveBeenCalledWith({
          barcode: '0226007855218',
          format: 'EAN13'
        });
      });
    });

    it('restores stripped EAN-13 leading zero when expectedFormat=EAN13 (catalogue hint)', async () => {
      const { result } = renderHook(() =>
        useBarcodeScanner({ onScan: mockOnScan, expectedFormat: 'EAN13' })
      );

      act(() => {
        // Scanner returned 12 digits as CODE128 — catalogue knows brand is EAN-13.
        result.current.handleBarcodeScanned({
          data: '226007855218',
          type: 'code128'
        });
      });

      await waitFor(() => {
        expect(mockOnScan).toHaveBeenCalledWith({
          barcode: '0226007855218',
          format: 'EAN13'
        });
      });
    });

    it('does not pad to EAN-13 when expectedFormat=EAN13 but checksum would be invalid', async () => {
      const { result } = renderHook(() =>
        useBarcodeScanner({ onScan: mockOnScan, expectedFormat: 'EAN13' })
      );

      act(() => {
        result.current.handleBarcodeScanned({
          data: '226007855219',
          type: 'code128'
        });
      });

      await waitFor(() => {
        expect(mockOnScan).toHaveBeenCalledWith({
          barcode: '226007855219',
          format: 'CODE128'
        });
      });
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

  // Story 16.23 follow-up: a denied camera is a scan failure the field could not
  // see. The user gets clear UI for it, but nothing reached production telemetry,
  // so "scanning is broken for me" reports had no counterpart in Sentry.
  describe('Permission telemetry (Story 16.23)', () => {
    it('notifies when the camera permission is denied', async () => {
      mockRequestPermission.mockResolvedValueOnce({ granted: false });
      const { result } = renderHook(() => useBarcodeScanner({ onScan: mockOnScan }));

      await act(async () => {
        await result.current.requestCameraPermission();
      });

      expect(mockNotify).toHaveBeenCalledWith(
        'Camera permission denied',
        expect.objectContaining({
          tags: expect.objectContaining({ surface: 'camera', outcome: 'permission-denied' })
        })
      );
    });

    it('notifies when the permission request itself throws', async () => {
      mockRequestPermission.mockRejectedValueOnce(new Error('permission subsystem down'));
      const { result } = renderHook(() => useBarcodeScanner({ onScan: mockOnScan }));

      await act(async () => {
        await result.current.requestCameraPermission();
      });

      expect(mockNotify).toHaveBeenCalledWith(
        'Camera permission request failed',
        expect.objectContaining({
          tags: expect.objectContaining({ surface: 'camera', outcome: 'permission-error' })
        })
      );
    });

    it('survives a permission rejection that is not an Error', async () => {
      mockRequestPermission.mockRejectedValueOnce('permission subsystem string');
      const { result } = renderHook(() => useBarcodeScanner({ onScan: mockOnScan }));

      await act(async () => {
        await result.current.requestCameraPermission();
      });

      expect(mockNotify.mock.calls[0]?.[1]?.context?.[0]).toEqual({ errorName: 'string' });
      expect(result.current.error).toBe('Failed to request camera permission');
    });

    it('reports a denial AND an error in the same mount, not just the first', async () => {
      // A single shared boolean guard would drop whichever happened second — but
      // "the user said no" and "the OS never answered" have different fixes, so the
      // dedupe is keyed by outcome rather than by "have we reported anything yet".
      mockRequestPermission.mockRejectedValueOnce(new Error('subsystem down'));
      mockRequestPermission.mockResolvedValueOnce({ granted: false });

      const { result } = renderHook(() => useBarcodeScanner({ onScan: mockOnScan }));

      await act(async () => {
        await result.current.requestCameraPermission();
        await result.current.requestCameraPermission();
      });

      expect(mockNotify).toHaveBeenCalledTimes(2);
      const outcomes = mockNotify.mock.calls.map((call) => call[1]?.tags?.outcome);
      expect(outcomes).toEqual(['permission-error', 'permission-denied']);
    });

    it('does not notify when permission is granted', async () => {
      mockRequestPermission.mockResolvedValueOnce({ granted: true });
      const { result } = renderHook(() => useBarcodeScanner({ onScan: mockOnScan }));

      await act(async () => {
        await result.current.requestCameraPermission();
      });

      expect(mockNotify).not.toHaveBeenCalled();
    });

    it('reports a repeated permission THROW only once per mounted scanner', async () => {
      mockRequestPermission.mockRejectedValue(new Error('permission subsystem down'));
      const { result } = renderHook(() => useBarcodeScanner({ onScan: mockOnScan }));

      await act(async () => {
        await result.current.requestCameraPermission();
        await result.current.requestCameraPermission();
      });

      expect(mockNotify).toHaveBeenCalledTimes(1);
      // The UI error is still set every time — only the telemetry is deduped.
      expect(result.current.error).toBe('permission subsystem down');
    });

    it('reports a repeated denial only once per mounted scanner', async () => {
      // ScannerOverlay re-requests on mount whenever `permission` is null, and a
      // user who has permanently denied will hit this every time they open the
      // scanner. One event per mount is the signal; a stream of them is noise.
      mockRequestPermission.mockResolvedValue({ granted: false });
      const { result } = renderHook(() => useBarcodeScanner({ onScan: mockOnScan }));

      await act(async () => {
        await result.current.requestCameraPermission();
        await result.current.requestCameraPermission();
      });

      expect(mockNotify).toHaveBeenCalledTimes(1);
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
