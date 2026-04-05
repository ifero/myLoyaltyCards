/**
 * BrandScannerScreen Tests
 * Story 13.4: Restyle Add Card Flow (AC3, AC4, T3)
 */

import { render, screen, fireEvent } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AccessibilityInfo } from 'react-native';

import { BrandScannerScreen } from './BrandScannerScreen';

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
              aliases: [],
              barcodeFormats: []
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
});
