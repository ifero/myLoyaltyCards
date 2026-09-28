/**
 * ScannerOverlay Component Tests
 * Story 13.4: Restyle Add Card Flow (AC3)
 */

import { act, render, screen, fireEvent } from '@testing-library/react-native';
import { Dimensions, StyleSheet } from 'react-native';

import { BarcodeFormat } from '@/core/schemas';
import { logger } from '@/core/utils';

import { TOUCH_TARGET } from '@/shared/theme/spacing';

import { ScannerOverlay, getViewfinderSize } from './ScannerOverlay';

jest.mock('@/core/utils', () => {
  const actual = jest.requireActual('@/core/utils');
  return { ...actual, logger: { ...actual.logger, notify: jest.fn() } };
});

const mockNotify = logger.notify as jest.Mock;
const mockCameraView = jest.fn();

// Mock theme
jest.mock('@/shared/theme', () => ({
  useTheme: () => ({
    theme: {
      primary: '#1A73E8',
      background: '#FFFFFF',
      textPrimary: '#1F1F24',
      textSecondary: '#66666B',
      textTertiary: '#8F8F94',
      error: '#FF3B30'
    },
    isDark: false
  })
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 })
}));

// Mock expo-camera
jest.mock('expo-camera', () => ({
  CameraView: (props: unknown) => {
    mockCameraView(props);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const React = require('react');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { View } = require('react-native');
    return React.createElement(View, { testID: 'camera-view' });
  }
}));

// Override reanimated mock to add Easing and withRepeat
jest.mock('react-native-reanimated', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mockReact = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mockRN = require('react-native');

  const AnimatedView = mockReact.forwardRef((props: Record<string, unknown>, ref: unknown) =>
    mockReact.createElement(mockRN.View, { ...props, ref })
  );

  return {
    __esModule: true,
    default: { View: AnimatedView, Text: mockRN.Text },
    useSharedValue: (initial: number) => ({ value: initial }),
    useAnimatedStyle: () => ({}),
    // A spy, so the scan line's sweep target can be read (Story 16.31, via 22.1). Created HERE,
    // because this factory runs when ScannerOverlay is imported — before any module-level const.
    withTiming: jest.fn((value: number) => value),
    withRepeat: (value: number) => value,
    withSpring: (value: number) => value,
    Easing: {
      inOut: () => 'easing-fn',
      ease: 'ease'
    }
  };
});

// Mock useBarcodeScanner
const mockUseBarcodeScanner = jest.fn();
jest.mock('@/features/cards/hooks/useBarcodeScanner', () => ({
  useBarcodeScanner: (opts: unknown) => mockUseBarcodeScanner(opts),
  ScanResult: {}
}));

/**
 * The action stack lays out long before an image scan can fail, and the banner derives its offset
 * from that height (Story 16.30) — so a test showing the banner lets the stack measure first.
 */
const measureActionStack = (height = 154) =>
  fireEvent(screen.getByTestId('scanner-bottom-actions'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 393, height } }
  });

describe('ScannerOverlay', () => {
  const defaultProps = {
    onScan: jest.fn(),
    onManualEntry: jest.fn(),
    onBack: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCameraView.mockClear();
  });

  describe('camera ready state', () => {
    beforeEach(() => {
      mockUseBarcodeScanner.mockReturnValue({
        permission: { granted: true },
        hasScanned: false,
        error: null,
        handleBarcodeScanned: jest.fn(),
        requestCameraPermission: jest.fn(),
        reset: jest.fn(),
        isReady: true
      });
    });

    it('renders overlay container', () => {
      render(<ScannerOverlay {...defaultProps} />);
      expect(screen.getByTestId('scanner-overlay')).toBeTruthy();
    });

    it('renders instruction text', () => {
      render(<ScannerOverlay {...defaultProps} />);
      expect(screen.getByText('Point camera at barcode')).toBeTruthy();
    });

    it('renders floating back button', () => {
      render(<ScannerOverlay {...defaultProps} />);
      expect(screen.getByTestId('floating-back-button')).toBeTruthy();
    });

    it('renders manual entry row', () => {
      render(<ScannerOverlay {...defaultProps} />);
      expect(screen.getByTestId('manual-entry-row')).toBeTruthy();
      expect(screen.getByText('Enter card number manually')).toBeTruthy();
    });

    it('falls back to error UI when the camera preview fails to mount', () => {
      const onImageScan = jest.fn();
      render(<ScannerOverlay {...defaultProps} onImageScan={onImageScan} />);

      const cameraProps = mockCameraView.mock.calls.at(-1)?.[0] as {
        onMountError?: (event: { message: string }) => void;
      };

      act(() => {
        cameraProps.onMountError?.({ message: 'Failed to start camera preview' });
      });

      expect(screen.getByText('Camera Error')).toBeTruthy();
      expect(screen.getByText('Failed to start camera preview')).toBeTruthy();
      expect(screen.getByTestId('scan-from-image-fallback-button')).toBeTruthy();
      expect(screen.queryByTestId('camera-view')).toBeNull();
    });

    // Story 16.23 follow-up: a camera that will not start is a total scan failure,
    // and it left no production trace at all — only an on-screen message.
    it('notifies when the camera preview fails to mount', () => {
      render(<ScannerOverlay {...defaultProps} />);

      const cameraProps = mockCameraView.mock.calls.at(-1)?.[0] as {
        onMountError?: (event: { message: string }) => void;
      };

      act(() => {
        cameraProps.onMountError?.({ message: 'Failed to start camera preview' });
      });

      expect(mockNotify).toHaveBeenCalledWith(
        'Camera preview failed to mount',
        expect.objectContaining({
          tags: expect.objectContaining({ surface: 'camera', outcome: 'mount-error' })
        })
      );
    });

    it.each([
      ['Camera component could not be rendered - is there any other instance running?', 'in-use'],
      ['Camera permissions not granted - component could not be rendered.', 'permission'],
      ['Camera session was reset', 'session-reset'],
      ['Camera could not be started - The operation could not be completed', 'start-failed'],
      ['Something upstream changed', 'other']
    ])('classifies the mount error %# as reason "%s"', (message, expectedReason) => {
      render(<ScannerOverlay {...defaultProps} />);
      const cameraProps = mockCameraView.mock.calls.at(-1)?.[0] as {
        onMountError?: (event: { message: string }) => void;
      };

      act(() => {
        cameraProps.onMountError?.({ message });
      });

      expect(mockNotify.mock.calls[0]?.[1]?.tags?.reason).toBe(expectedReason);
    });

    it('never forwards the raw mount-error message to telemetry', () => {
      // `CameraMountError` carries only a free-text `message`, and one of
      // expo-camera's emitters interpolates an AVError description into it. Safe
      // today, but tag values are the one field the PII scrubber never touches, so
      // the message is classified rather than forwarded. This is the lock on that.
      render(<ScannerOverlay {...defaultProps} />);
      const cameraProps = mockCameraView.mock.calls.at(-1)?.[0] as {
        onMountError?: (event: { message: string }) => void;
      };

      act(() => {
        cameraProps.onMountError?.({
          message: 'Camera could not be started - /var/mobile/secret-detail.txt'
        });
      });

      const serialised = JSON.stringify(mockNotify.mock.calls);
      expect(serialised).not.toContain('/var/mobile');
      expect(serialised).not.toContain('secret-detail');
      // The classification still landed, so this is not passing by emitting nothing.
      expect(mockNotify.mock.calls[0]?.[1]?.tags?.reason).toBe('start-failed');
    });

    it('records the message length so an unknown reason is not a black hole', () => {
      // The two sibling classifiers keep `nativeCode` for their `other` bucket;
      // this has no code to keep, so a single integer is the most that can be
      // retained without reintroducing the free text. It still separates two
      // different unknown causes, and a recurring one from a one-off.
      render(<ScannerOverlay {...defaultProps} />);
      const cameraProps = mockCameraView.mock.calls.at(-1)?.[0] as {
        onMountError?: (event: { message: string }) => void;
      };

      act(() => {
        cameraProps.onMountError?.({ message: 'Some upstream wording we do not know' });
      });

      expect(mockNotify.mock.calls[0]?.[1]?.tags?.reason).toBe('other');
      expect(mockNotify.mock.calls[0]?.[1]?.context?.[0]).toEqual({
        messageLength: 'Some upstream wording we do not know'.length
      });
    });

    it('notifies only once when the camera reports repeated mount errors', () => {
      render(<ScannerOverlay {...defaultProps} />);

      const cameraProps = mockCameraView.mock.calls.at(-1)?.[0] as {
        onMountError?: (event: { message: string }) => void;
      };

      act(() => {
        cameraProps.onMountError?.({ message: 'Failed to start camera preview' });
        cameraProps.onMountError?.({ message: 'Failed to start camera preview' });
      });

      expect(mockNotify).toHaveBeenCalledTimes(1);
    });

    it('does not notify when the camera mounts successfully', () => {
      render(<ScannerOverlay {...defaultProps} />);
      expect(mockNotify).not.toHaveBeenCalled();
    });

    it('uses image scan from the fallback camera error UI', () => {
      const onImageScan = jest.fn();
      render(<ScannerOverlay {...defaultProps} onImageScan={onImageScan} />);

      const cameraProps = mockCameraView.mock.calls.at(-1)?.[0] as {
        onMountError?: (event: { message: string }) => void;
      };

      act(() => {
        cameraProps.onMountError?.({ message: 'Failed to start camera preview' });
      });

      fireEvent.press(screen.getByTestId('scan-from-image-fallback-button'));
      expect(onImageScan).toHaveBeenCalledTimes(1);
    });

    it('calls onBack when floating back button is pressed', () => {
      render(<ScannerOverlay {...defaultProps} />);
      fireEvent.press(screen.getByTestId('floating-back-button'));
      expect(defaultProps.onBack).toHaveBeenCalledTimes(1);
    });

    it('calls onManualEntry when manual entry row is pressed', () => {
      render(<ScannerOverlay {...defaultProps} />);
      fireEvent.press(screen.getByTestId('manual-entry-row'));
      expect(defaultProps.onManualEntry).toHaveBeenCalledTimes(1);
    });

    it('renders brand pill when provided', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const React = require('react');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Text } = require('react-native');
      const pill = React.createElement(Text, { testID: 'test-pill' }, 'Brand');

      render(<ScannerOverlay {...defaultProps} brandPill={pill} />);
      expect(screen.getByTestId('test-pill')).toBeTruthy();
    });

    describe('image scan row', () => {
      it('does not render scan-from-image-row when onImageScan is not provided', () => {
        render(<ScannerOverlay {...defaultProps} />);
        expect(screen.queryByTestId('scan-from-image-row')).toBeNull();
      });

      it('renders scan-from-image-row when onImageScan is provided', () => {
        render(<ScannerOverlay {...defaultProps} onImageScan={jest.fn()} />);
        expect(screen.getByTestId('scan-from-image-row')).toBeTruthy();
        expect(screen.getByText('Scan from image')).toBeTruthy();
      });

      it('calls onImageScan when scan-from-image-row is pressed', () => {
        const onImageScan = jest.fn();
        render(<ScannerOverlay {...defaultProps} onImageScan={onImageScan} />);
        fireEvent.press(screen.getByTestId('scan-from-image-row'));
        expect(onImageScan).toHaveBeenCalledTimes(1);
      });
    });

    describe('processing indicator', () => {
      it('does not render processing indicator by default', () => {
        render(<ScannerOverlay {...defaultProps} />);
        expect(screen.queryByTestId('image-processing-indicator')).toBeNull();
      });

      it('renders processing indicator when isProcessingImage is true', () => {
        render(<ScannerOverlay {...defaultProps} isProcessingImage />);
        expect(screen.getByTestId('image-processing-indicator')).toBeTruthy();
        expect(screen.getByText('Scanning image\u2026')).toBeTruthy();
      });
    });

    describe('imageError / NoCodeFoundBanner', () => {
      it('does not render banner when imageError is false', () => {
        render(<ScannerOverlay {...defaultProps} onImageErrorDismiss={jest.fn()} />);
        expect(screen.queryByTestId('no-code-found-banner')).toBeNull();
      });

      it('renders NoCodeFoundBanner when imageError is true and onImageErrorDismiss provided', () => {
        render(<ScannerOverlay {...defaultProps} imageError onImageErrorDismiss={jest.fn()} />);
        measureActionStack();
        expect(screen.getByTestId('no-code-found-banner')).toBeTruthy();
      });

      it('calls onImageErrorDismiss when banner close is pressed', () => {
        const onImageErrorDismiss = jest.fn();
        render(
          <ScannerOverlay {...defaultProps} imageError onImageErrorDismiss={onImageErrorDismiss} />
        );
        measureActionStack();
        fireEvent.press(screen.getByTestId('banner-close'));
        expect(onImageErrorDismiss).toHaveBeenCalledTimes(1);
      });

      it('calls onImageErrorRetry when banner retry is pressed', () => {
        const onImageErrorRetry = jest.fn();
        render(
          <ScannerOverlay
            {...defaultProps}
            imageError
            onImageErrorDismiss={jest.fn()}
            onImageErrorRetry={onImageErrorRetry}
          />
        );
        measureActionStack();
        fireEvent.press(screen.getByTestId('banner-retry-image'));
        expect(onImageErrorRetry).toHaveBeenCalledTimes(1);
      });

      it('calls onImageErrorManualEntry when banner manual entry is pressed', () => {
        const onImageErrorManualEntry = jest.fn();
        render(
          <ScannerOverlay
            {...defaultProps}
            imageError
            onImageErrorDismiss={jest.fn()}
            onImageErrorManualEntry={onImageErrorManualEntry}
          />
        );
        measureActionStack();
        fireEvent.press(screen.getByTestId('banner-manual-entry'));
        expect(onImageErrorManualEntry).toHaveBeenCalledTimes(1);
      });

      // Story 16.23 (AC2): the overlay is the seam that carries the reason from
      // useImageScan to the banner, so a broken hand-off would silently restore
      // the old one-message-for-everything behaviour.
      it('forwards imageErrorReason to the banner', () => {
        render(
          <ScannerOverlay
            {...defaultProps}
            imageError
            imageErrorReason="scanFailed"
            onImageErrorDismiss={jest.fn()}
          />
        );
        measureActionStack();
        expect(screen.getByText('Something went wrong reading that image')).toBeTruthy();
      });

      it("falls back to the banner's notFound copy when no reason is given", () => {
        render(<ScannerOverlay {...defaultProps} imageError onImageErrorDismiss={jest.fn()} />);
        measureActionStack();
        expect(
          screen.getByText(
            "We couldn't read a barcode in this image — try scanning the card itself"
          )
        ).toBeTruthy();
      });
    });
  });

  // Story 16.31, absorbed by 22.1 — the viewfinder is shaped to the code it expects. One scalar
  // drove both sides, so the brackets were always a ~275pt square: right for QR, wrong for the
  // linear symbologies that are most of the catalogue.
  describe('viewfinder geometry (16.31)', () => {
    const LINEAR: BarcodeFormat[] = ['EAN13', 'EAN8', 'CODE128', 'CODE39', 'UPCA'];

    it.each(LINEAR)('is a wide rectangle for %s, at the frame proportions', (format) => {
      const { width, height } = getViewfinderSize(393, format);
      expect(width).toBeGreaterThan(height);
      // The capture frame draws it 300 x 120 at 393pt; the code derives it from the width.
      expect({ width, height }).toEqual({ width: 300, height: 120 });
    });

    it('is a square for QR', () => {
      const { width, height } = getViewfinderSize(393, 'QR');
      expect(width).toBe(height);
    });

    // The custom-card path enters with no brand, so no format: a real case, not a defensive one.
    it('falls back to the wide rectangle when no format is expected', () => {
      const { width, height } = getViewfinderSize(393, undefined);
      expect(width).toBeGreaterThan(height);
    });

    it('scales with the screen rather than copying the frame constant', () => {
      expect(getViewfinderSize(360, 'EAN13').width).toBeLessThan(300);
      expect(getViewfinderSize(430, 'EAN13').width).toBeGreaterThan(300);
    });

    describe('in the overlay', () => {
      beforeEach(() => {
        mockUseBarcodeScanner.mockReturnValue({
          permission: { granted: true },
          hasScanned: false,
          error: null,
          handleBarcodeScanned: jest.fn(),
          requestCameraPermission: jest.fn(),
          reset: jest.fn(),
          isReady: true
        });
      });

      const { width: windowWidth } = Dimensions.get('window');
      const box = () => StyleSheet.flatten(screen.getByTestId('viewfinder').props.style);

      it('draws the brackets around the rectangle the expected format needs', () => {
        render(<ScannerOverlay {...defaultProps} expectedFormat="EAN13" />);
        expect(box()).toMatchObject(getViewfinderSize(windowWidth, 'EAN13'));
      });

      it('draws a square for an expected QR code', () => {
        render(<ScannerOverlay {...defaultProps} expectedFormat="QR" />);
        const { width, height } = box();
        expect(width).toBe(height);
      });

      it('sweeps the scan line over the frame HEIGHT, not a stale square side', () => {
        const { withTiming: mockWithTiming } = jest.requireMock('react-native-reanimated');
        render(<ScannerOverlay {...defaultProps} expectedFormat="EAN13" />);
        const { height } = getViewfinderSize(windowWidth, 'EAN13');
        expect(mockWithTiming).toHaveBeenCalledWith(height - 4, expect.anything());
      });

      it('keeps the brackets at 32 / 4 / 12 — the rectangle changes, not the mark', () => {
        render(<ScannerOverlay {...defaultProps} expectedFormat="EAN13" />);
        expect(
          StyleSheet.flatten(screen.getByTestId('viewfinder-corner-tl').props.style)
        ).toMatchObject({
          width: 32,
          height: 32,
          borderTopWidth: 4,
          borderLeftWidth: 4,
          borderTopLeftRadius: 12
        });
      });
    });
  });

  // Story 16.30 + AC9, absorbed by 22.1. The banner sat at a hardcoded `bottom: 96` while the
  // action stack below it was ~146pt tall and painted over it, burying both recovery links. The
  // stack is now in flow, and the banner's offset is DERIVED from the stack's measured height.
  describe('bottom actions and the scan banner (16.30, AC9)', () => {
    beforeEach(() => {
      mockUseBarcodeScanner.mockReturnValue({
        permission: { granted: true },
        hasScanned: false,
        error: null,
        handleBarcodeScanned: jest.fn(),
        requestCameraPermission: jest.fn(),
        reset: jest.fn(),
        isReady: true
      });
    });

    const withBanner = () =>
      render(
        <ScannerOverlay
          {...defaultProps}
          onImageScan={jest.fn()}
          imageError
          onImageErrorDismiss={jest.fn()}
        />
      );

    it('lays the action stack out in flow, anchored to the bottom — never absolutely (AC9)', () => {
      render(<ScannerOverlay {...defaultProps} />);
      expect(
        StyleSheet.flatten(screen.getByTestId('scanner-bottom-actions').props.style).position
      ).not.toBe('absolute');
      expect(
        StyleSheet.flatten(screen.getByTestId('scanner-overlay').props.style).justifyContent
      ).toBe('flex-end');
    });

    it('sits the banner 16pt above the measured stack, so nothing overlaps its links (16.30)', () => {
      withBanner();
      measureActionStack(154);

      const anchor = StyleSheet.flatten(
        screen.getByTestId('no-code-found-banner-anchor').props.style
      );
      expect(anchor.bottom).toBe(154 + 16);
      // Its lower edge clears the top of the stack: no overlap, whatever the stack measures.
      expect(anchor.bottom as number).toBeGreaterThan(154);
    });

    it('follows the stack when it grows (e.g. Dynamic Type), instead of a fixed offset', () => {
      withBanner();
      measureActionStack(154);
      measureActionStack(210);
      expect(
        StyleSheet.flatten(screen.getByTestId('no-code-found-banner-anchor').props.style).bottom
      ).toBe(210 + 16);
    });

    // Before the first layout there is no height to derive from; showing the banner then would
    // put it at the bottom edge, under the rows it must clear.
    it('waits for the stack to be measured before showing the banner', () => {
      withBanner();
      expect(screen.queryByTestId('no-code-found-banner')).toBeNull();
      measureActionStack(154);
      expect(screen.getByTestId('no-code-found-banner')).toBeTruthy();
    });

    it('keeps each action row at the touch-target height (16.33)', () => {
      render(<ScannerOverlay {...defaultProps} onImageScan={jest.fn()} />);
      for (const row of ['scan-from-image-row', 'manual-entry-row']) {
        expect(StyleSheet.flatten(screen.getByTestId(row).props.style).height).toBe(
          TOUCH_TARGET.min
        );
      }
    });
  });

  describe('permission denied state', () => {
    beforeEach(() => {
      mockUseBarcodeScanner.mockReturnValue({
        permission: { granted: false },
        hasScanned: false,
        error: null,
        handleBarcodeScanned: jest.fn(),
        requestCameraPermission: jest.fn(),
        reset: jest.fn(),
        isReady: false
      });
    });

    it('shows "Camera Access Needed" message', () => {
      render(<ScannerOverlay {...defaultProps} />);
      expect(screen.getByText('Camera Access Needed')).toBeTruthy();
    });

    it('shows Open Settings button', () => {
      render(<ScannerOverlay {...defaultProps} />);
      expect(screen.getByTestId('open-settings-button')).toBeTruthy();
    });

    it('shows Enter Manually button', () => {
      render(<ScannerOverlay {...defaultProps} />);
      expect(screen.getByTestId('manual-entry-button')).toBeTruthy();
    });

    it('calls onManualEntry when Enter Manually is pressed', () => {
      render(<ScannerOverlay {...defaultProps} />);
      fireEvent.press(screen.getByTestId('manual-entry-button'));
      expect(defaultProps.onManualEntry).toHaveBeenCalledTimes(1);
    });

    it('renders back button in permission denied state', () => {
      render(<ScannerOverlay {...defaultProps} />);
      expect(screen.getByTestId('floating-back-button')).toBeTruthy();
    });
  });

  describe('error state', () => {
    beforeEach(() => {
      mockUseBarcodeScanner.mockReturnValue({
        permission: { granted: true },
        hasScanned: false,
        error: 'Camera failed to start',
        handleBarcodeScanned: jest.fn(),
        requestCameraPermission: jest.fn(),
        reset: jest.fn(),
        isReady: false
      });
    });

    it('shows "Camera Error" title', () => {
      render(<ScannerOverlay {...defaultProps} />);
      expect(screen.getByText('Camera Error')).toBeTruthy();
    });

    it('shows error message', () => {
      render(<ScannerOverlay {...defaultProps} />);
      expect(screen.getByText('Camera failed to start')).toBeTruthy();
    });

    it('shows Retry button', () => {
      render(<ScannerOverlay {...defaultProps} />);
      expect(screen.getByTestId('retry-button')).toBeTruthy();
    });

    it('shows Enter Manually fallback button', () => {
      render(<ScannerOverlay {...defaultProps} />);
      expect(screen.getByTestId('manual-entry-fallback-button')).toBeTruthy();
    });
  });
});
