/**
 * ScannerOverlay Component Tests
 * Story 13.4: Restyle Add Card Flow (AC3)
 */

import { render, screen, fireEvent } from '@testing-library/react-native';

import { ScannerOverlay } from './ScannerOverlay';

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
  CameraView: 'CameraView'
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
    withTiming: (value: number) => value,
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

describe('ScannerOverlay', () => {
  const defaultProps = {
    onScan: jest.fn(),
    onManualEntry: jest.fn(),
    onBack: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
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
