/**
 * CardTypeSelectionScreen Tests
 * Story 13.4: Restyle Add Card Flow (AC1, AC2, T2)
 */

import { render, screen, fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { AccessibilityInfo } from 'react-native';

import { CardTypeSelectionScreen } from './CardTypeSelectionScreen';

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
  })
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
const mockBrands = [
  {
    id: 'esselunga',
    name: 'Esselunga',
    color: '#FF0000',
    logo: 'esselunga',
    aliases: ['fidaty'],
    barcodeFormats: ['EAN13']
  },
  {
    id: 'conad',
    name: 'Conad',
    color: '#00AA00',
    logo: 'conad',
    aliases: [],
    barcodeFormats: ['EAN13']
  },
  {
    id: 'coop',
    name: 'Coop',
    color: '#E2231A',
    logo: 'coop',
    aliases: [],
    barcodeFormats: ['CODE128']
  },
  {
    id: 'carrefour',
    name: 'Carrefour',
    color: '#0032A0',
    logo: 'carrefour',
    aliases: [],
    barcodeFormats: ['EAN13']
  },
  {
    id: 'lidl',
    name: 'Lidl',
    color: '#FFC300',
    logo: 'lidl',
    aliases: [],
    barcodeFormats: ['EAN13']
  },
  {
    id: 'auchan',
    name: 'Auchan',
    color: '#D4001B',
    logo: 'auchan',
    aliases: [],
    barcodeFormats: ['EAN13']
  }
];

jest.mock('@/core/catalogue/catalogue-repository', () => ({
  CatalogueRepository: {
    getInstance: () => ({
      getBrands: () => mockBrands
    })
  }
}));

// Mock brandLogos
jest.mock('@/features/cards/utils/brandLogos', () => ({
  getBrandLogoComponent: jest.fn(() => undefined)
}));

describe('CardTypeSelectionScreen', () => {
  const announceSpy = jest
    .spyOn(AccessibilityInfo, 'announceForAccessibility')
    .mockImplementation(jest.fn());

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders back button', () => {
      render(<CardTypeSelectionScreen />);
      expect(screen.getByTestId('back-button')).toBeTruthy();
    });

    it('renders search bar', () => {
      render(<CardTypeSelectionScreen />);
      expect(screen.getByTestId('brand-search-bar')).toBeTruthy();
    });

    it('renders brand list', () => {
      render(<CardTypeSelectionScreen />);
      expect(screen.getByTestId('brand-list')).toBeTruthy();
    });

    it('renders "Other card" row', () => {
      render(<CardTypeSelectionScreen />);
      expect(screen.getByText('Other card')).toBeTruthy();
    });

    it('renders POPULAR CARDS section header', () => {
      render(<CardTypeSelectionScreen />);
      expect(screen.getByText('POPULAR CARDS')).toBeTruthy();
    });

    it('renders brand names from catalogue', () => {
      render(<CardTypeSelectionScreen />);
      expect(screen.getByText('Esselunga')).toBeTruthy();
    });

    it('announces screen for accessibility on mount', () => {
      render(<CardTypeSelectionScreen />);
      expect(announceSpy).toHaveBeenCalledWith('Card type selection screen');
    });
  });

  describe('navigation', () => {
    it('navigates to scanner when brand is pressed', () => {
      render(<CardTypeSelectionScreen />);
      // Press first brand row
      fireEvent.press(screen.getByText('Esselunga'));
      expect(router.push).toHaveBeenCalledWith({
        pathname: '/add-card/scan',
        params: expect.objectContaining({ brandId: 'esselunga', brandName: 'Esselunga' })
      });
    });

    it('navigates to scanner when "Other card" is pressed', () => {
      render(<CardTypeSelectionScreen />);
      fireEvent.press(screen.getByTestId('other-card-row'));
      expect(router.push).toHaveBeenCalledWith({
        pathname: '/add-card/scan',
        params: { mode: 'custom' }
      });
    });

    it('calls router.back when back button is pressed', () => {
      render(<CardTypeSelectionScreen />);
      fireEvent.press(screen.getByTestId('back-button'));
      expect(router.back).toHaveBeenCalled();
    });
  });

  describe('search', () => {
    it('filters brands when typing in search bar', () => {
      render(<CardTypeSelectionScreen />);
      const input = screen.getByTestId('brand-search-bar-input');
      fireEvent.changeText(input, 'ess');

      // Should show RESULTS section instead of POPULAR CARDS
      expect(screen.getByText('RESULTS')).toBeTruthy();
      expect(screen.queryByText('POPULAR CARDS')).toBeNull();
    });
  });
});
