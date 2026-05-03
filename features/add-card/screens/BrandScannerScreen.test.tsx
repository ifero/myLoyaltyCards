/**
 * BrandScannerScreen Tests
 * Story 13.4: Restyle Add Card Flow (AC3, AC4, T3)
 */

import { render, screen, fireEvent } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AccessibilityInfo } from 'react-native';

import { BrandScannerScreen } from './BrandScannerScreen';
import { useImageScan } from '../hooks/useImageScan';

// Override expo-router mock to add useLocalSearchParams
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: jest.fn(() => ({
    brandId: 'esselunga',
    brandName: 'Esselunga',
    brandColor: '#FF0000',
    brandLogo: 'esselunga'
  })),
  useNavigation: () => ({
    addListener: jest.fn(() => jest.fn()),
    dispatch: jest.fn()
  }),
  useFocusEffect: jest.fn()
}));

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
      out: () => 'easing-fn',
      ease: 'ease'
    }
  };
});

// Mock catalogue repository
jest.mock('@/core/catalogue/catalogue-repository', () => ({
  CatalogueRepository: {
    getInstance: () => ({
      getBrandById: jest.fn((id: string) =>
        id === 'esselunga'
          ? {
              id: 'esselunga',
              name: 'Esselunga',
              color: '#FF0000',
              logo: 'esselunga',
              aliases: []
            }
          : undefined
      )
    })
  }
}));

// Mock useBarcodeScanner
jest.mock('@/features/cards/hooks/useBarcodeScanner', () => ({
  useBarcodeScanner: () => ({
    permission: { granted: true },
    hasScanned: false,
    error: null,
    handleBarcodeScanned: jest.fn(),
    requestCameraPermission: jest.fn(),
    reset: jest.fn(),
    isReady: true
  }),
  ScanResult: {}
}));

// Mock useImageScan
const mockPickAndScan = jest.fn();
const mockDismissError = jest.fn();
const mockDismissMultiPicker = jest.fn();
const mockSelectCode = jest.fn();

const mockUseImageScan = {
  isProcessing: false,
  showError: false,
  multiCodes: [],
  pickAndScan: mockPickAndScan,
  dismissError: mockDismissError,
  dismissMultiPicker: mockDismissMultiPicker,
  selectCode: mockSelectCode
};

jest.mock('../hooks/useImageScan', () => ({
  useImageScan: jest.fn(() => mockUseImageScan)
}));

// Mock brandLogos
jest.mock('@/features/cards/utils/brandLogos', () => ({
  getBrandLogoComponent: jest.fn(() => undefined)
}));

// Mock luminance util for BrandPill
jest.mock('@/shared/theme/luminance', () => ({
  getContrastForeground: jest.fn(() => '#FFFFFF')
}));

describe('BrandScannerScreen', () => {
  const announceSpy = jest
    .spyOn(AccessibilityInfo, 'announceForAccessibility')
    .mockImplementation(jest.fn());

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the scanner overlay', () => {
    render(<BrandScannerScreen />);
    // ScannerOverlay renders with testID="brand-scanner-screen"
    expect(screen.getByTestId('brand-scanner-screen')).toBeTruthy();
  });

  it('renders brand pill with brand name', () => {
    render(<BrandScannerScreen />);
    expect(screen.getByText('Esselunga')).toBeTruthy();
  });

  it('renders manual entry option', () => {
    render(<BrandScannerScreen />);
    expect(screen.getByText('Enter card number manually')).toBeTruthy();
  });

  it('renders floating back button', () => {
    render(<BrandScannerScreen />);
    expect(screen.getByTestId('floating-back-button')).toBeTruthy();
  });

  it('renders instruction text', () => {
    render(<BrandScannerScreen />);
    expect(screen.getByText('Point camera at barcode')).toBeTruthy();
  });

  it('announces scanner screen for accessibility on mount', () => {
    render(<BrandScannerScreen />);
    expect(announceSpy).toHaveBeenCalledWith('Barcode scanner screen');
  });

  it('replaces setup route when returnToSetup is true', () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      returnToSetup: 'true'
    });

    render(<BrandScannerScreen />);
    fireEvent.press(screen.getByTestId('manual-entry-row'));

    expect(router.replace).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/add-card/setup' })
    );
  });

  describe('image scan integration', () => {
    beforeEach(() => {
      (useLocalSearchParams as jest.Mock).mockReturnValue({
        brandId: 'esselunga',
        brandName: 'Esselunga',
        brandColor: '#FF0000',
        brandLogo: 'esselunga'
      });
    });

    it('renders scan-from-image-row (onImageScan provided via useImageScan)', () => {
      render(<BrandScannerScreen />);
      expect(screen.getByTestId('scan-from-image-row')).toBeTruthy();
    });

    it('calls pickAndScan when scan-from-image-row is pressed', () => {
      render(<BrandScannerScreen />);
      fireEvent.press(screen.getByTestId('scan-from-image-row'));
      expect(mockPickAndScan).toHaveBeenCalledTimes(1);
    });

    it('shows processing indicator when isProcessing is true', () => {
      (useImageScan as jest.Mock).mockReturnValueOnce({
        ...mockUseImageScan,
        isProcessing: true
      });
      render(<BrandScannerScreen />);
      expect(screen.getByTestId('image-processing-indicator')).toBeTruthy();
    });

    it('shows no-code-found banner when showError is true', () => {
      (useImageScan as jest.Mock).mockReturnValueOnce({
        ...mockUseImageScan,
        showError: true
      });
      render(<BrandScannerScreen />);
      expect(screen.getByTestId('no-code-found-banner')).toBeTruthy();
    });

    it('calls dismissError when banner close is pressed', () => {
      (useImageScan as jest.Mock).mockReturnValueOnce({
        ...mockUseImageScan,
        showError: true
      });
      render(<BrandScannerScreen />);
      fireEvent.press(screen.getByTestId('banner-close'));
      expect(mockDismissError).toHaveBeenCalledTimes(1);
    });

    it('renders MultiCodePickerSheet when multiCodes is non-empty', () => {
      (useImageScan as jest.Mock).mockReturnValueOnce({
        ...mockUseImageScan,
        multiCodes: [
          { value: 'CODE-A', format: 'CODE128' },
          { value: 'CODE-B', format: 'EAN13' }
        ]
      });
      render(<BrandScannerScreen />);
      expect(screen.getByTestId('multi-code-picker-sheet')).toBeTruthy();
    });

    it('calls dismissMultiPicker when MultiCodePickerSheet cancel is pressed', () => {
      (useImageScan as jest.Mock).mockReturnValueOnce({
        ...mockUseImageScan,
        multiCodes: [{ value: 'CODE-A', format: 'CODE128' }]
      });
      render(<BrandScannerScreen />);
      fireEvent.press(screen.getByTestId('multi-code-cancel'));
      expect(mockDismissMultiPicker).toHaveBeenCalledTimes(1);
    });

    it('calls selectCode when a code row is pressed in the sheet', () => {
      (useImageScan as jest.Mock).mockReturnValueOnce({
        ...mockUseImageScan,
        multiCodes: [{ value: 'CODE-A', format: 'CODE128' }]
      });
      render(<BrandScannerScreen />);
      fireEvent.press(screen.getByTestId('code-row-0'));
      expect(mockSelectCode).toHaveBeenCalledWith({ value: 'CODE-A', format: 'CODE128' });
    });
  });
});
