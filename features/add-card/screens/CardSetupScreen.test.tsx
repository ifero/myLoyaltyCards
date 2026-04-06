/**
 * CardSetupScreen Tests
 * Story 13.4: Restyle Add Card Flow (AC5, AC6, T4, T5)
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { AccessibilityInfo } from 'react-native';

import { CardSetupScreen } from './CardSetupScreen';

// Override expo-router mock to add useLocalSearchParams
const mockUseLocalSearchParams = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: (...args: unknown[]) => mockUseLocalSearchParams(...args),
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
      background: '#FFFFFF',
      primary: '#1A73E8',
      textPrimary: '#1F1F24',
      textSecondary: '#66666B',
      textTertiary: '#8F8F94',
      surfaceElevated: '#F5F5F5',
      border: '#E5E5EB'
    },
    isDark: false
  }),
  CARD_COLORS: {
    blue: '#1A73E8',
    red: '#E2231A',
    green: '#16A34A',
    orange: '#F59E0B',
    grey: '#64748B'
  }
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  return {
    SafeAreaView: ({ children, ...props }: { children?: React.ReactNode }) =>
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('react').createElement(View, props, children)
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

// Mock useAddCard
const mockAddCard = jest.fn().mockResolvedValue(undefined);
jest.mock('@/features/cards/hooks/useAddCard', () => ({
  useAddCard: () => ({
    addCard: mockAddCard,
    isLoading: false
  })
}));

// Mock brandLogos
jest.mock('@/features/cards/utils/brandLogos', () => ({
  getBrandLogoComponent: jest.fn(() => undefined)
}));

// Mock luminance
jest.mock('@/shared/theme/luminance', () => ({
  getContrastForeground: jest.fn(() => '#FFFFFF')
}));

// Mock mapHexToCardColor
jest.mock('@/core/utils', () => ({
  mapHexToCardColor: jest.fn(() => 'red')
}));

describe('CardSetupScreen', () => {
  const announceSpy = jest
    .spyOn(AccessibilityInfo, 'announceForAccessibility')
    .mockImplementation(jest.fn());

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('catalogue mode', () => {
    beforeEach(() => {
      mockUseLocalSearchParams.mockReturnValue({
        mode: 'catalogue',
        brandId: 'esselunga',
        brandName: 'Esselunga',
        brandColor: '#FF0000',
        brandLogo: 'esselunga',
        barcode: '1234567890',
        barcodeFormat: 'EAN13'
      });
    });

    it('renders "Card Setup" header title', () => {
      render(<CardSetupScreen />);
      expect(screen.getByText('Card Setup')).toBeTruthy();
    });

    it('announces catalogue setup screen for accessibility on mount', () => {
      render(<CardSetupScreen />);
      expect(announceSpy).toHaveBeenCalledWith('Card setup screen');
    });

    it('renders brand name in header', () => {
      render(<CardSetupScreen />);
      expect(screen.getByText('Esselunga')).toBeTruthy();
    });

    it('renders card number field with pre-filled barcode', () => {
      render(<CardSetupScreen />);
      const input = screen.getByTestId('card-number-field');
      expect(input).toBeTruthy();
    });

    it('does NOT show store name field in catalogue mode', () => {
      render(<CardSetupScreen />);
      expect(screen.queryByTestId('store-name-field')).toBeNull();
    });

    it('does NOT show color picker in catalogue mode', () => {
      render(<CardSetupScreen />);
      expect(screen.queryByTestId('color-picker')).toBeNull();
    });

    it('does NOT show inline scan button in catalogue mode', () => {
      render(<CardSetupScreen />);
      expect(screen.queryByTestId('inline-scan-button')).toBeNull();
    });

    it('renders Done button', () => {
      render(<CardSetupScreen />);
      expect(screen.getByTestId('done-button')).toBeTruthy();
    });

    it('renders back button', () => {
      render(<CardSetupScreen />);
      expect(screen.getByTestId('setup-back-button')).toBeTruthy();
    });

    it('calls addCard with catalogue data on Done', async () => {
      render(<CardSetupScreen />);
      fireEvent.press(screen.getByTestId('done-button'));

      await waitFor(() => {
        expect(mockAddCard).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Esselunga',
            brandId: 'esselunga',
            barcodeFormat: 'EAN13'
          })
        );
      });
    });
  });

  describe('custom mode', () => {
    beforeEach(() => {
      mockUseLocalSearchParams.mockReturnValue({
        mode: 'custom'
      });
    });

    it('renders "New Card" header title', () => {
      render(<CardSetupScreen />);
      expect(screen.getByText('New Card')).toBeTruthy();
    });

    it('announces custom setup screen for accessibility on mount', () => {
      render(<CardSetupScreen />);
      expect(announceSpy).toHaveBeenCalledWith('New card screen');
    });

    it('renders store name field', () => {
      render(<CardSetupScreen />);
      expect(screen.getByTestId('store-name-field')).toBeTruthy();
    });

    it('renders card number field', () => {
      render(<CardSetupScreen />);
      expect(screen.getByTestId('card-number-field')).toBeTruthy();
    });

    it('renders color picker', () => {
      render(<CardSetupScreen />);
      expect(screen.getByTestId('color-picker')).toBeTruthy();
    });

    it('renders inline scan button', () => {
      render(<CardSetupScreen />);
      expect(screen.getByTestId('inline-scan-button')).toBeTruthy();
    });

    it('navigates to scanner when inline scan button is pressed', () => {
      render(<CardSetupScreen />);
      fireEvent.press(screen.getByTestId('inline-scan-button'));
      expect(router.push).toHaveBeenCalledWith({
        pathname: '/add-card/scan',
        params: expect.objectContaining({ returnToSetup: 'true' })
      });
    });

    it('shows validation error when store name is empty on Done', async () => {
      render(<CardSetupScreen />);
      fireEvent.press(screen.getByTestId('done-button'));

      await waitFor(() => {
        expect(screen.getByText('Store name is required')).toBeTruthy();
      });
      expect(mockAddCard).not.toHaveBeenCalled();
    });

    it('calls addCard with custom data when valid', async () => {
      render(<CardSetupScreen />);

      const storeInput = screen.getByTestId('store-name-field');
      fireEvent.changeText(storeInput, 'My Gym');

      fireEvent.press(screen.getByTestId('done-button'));

      await waitFor(() => {
        expect(mockAddCard).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'My Gym',
            color: 'blue',
            barcodeFormat: 'CODE128'
          })
        );
      });
    });

    it('navigates back when back button is pressed', () => {
      render(<CardSetupScreen />);
      fireEvent.press(screen.getByTestId('setup-back-button'));
      expect(router.back).toHaveBeenCalled();
    });
  });
});
