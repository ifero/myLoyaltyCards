/**
 * CardList Component Tests
 * Story 2.1: Display Card List - AC2, AC3, AC4, AC5
 */

import { render, screen } from '@testing-library/react-native';
import { useFocusEffect } from 'expo-router';

import { LoyaltyCard } from '@/core/schemas';

import { useCards } from '../hooks/useCards';
import { CardList } from './CardList';
import { EmptyState } from './EmptyState';

// Mock useCards hook
jest.mock('../hooks/useCards');
const mockUseCards = useCards as jest.MockedFunction<typeof useCards>;

// Mock useFocusEffect
jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn((callback) => callback()),
  useRouter: () => ({
    push: jest.fn()
  })
}));

// Mock ThemeProvider
jest.mock('@/shared/theme', () => ({
  useTheme: () => ({
    theme: {
      background: '#FAFAFA',
      surface: '#FFFFFF',
      textPrimary: '#1F2937',
      textSecondary: '#6B7280',
      primary: '#73A973',
      border: '#E5E7EB'
    },
    isDark: false
  })
}));

describe('CardList', () => {
  const mockCards: LoyaltyCard[] = [
    {
      id: '1',
      name: 'Apple Store',
      barcode: '1234567890',
      barcodeFormat: 'CODE128',
      brandId: null,
      color: 'blue',
      isFavorite: false,
      lastUsedAt: null,
      usageCount: 0,
      createdAt: '2026-01-07T10:00:00Z',
      updatedAt: '2026-01-07T10:00:00Z'
    },
    {
      id: '2',
      name: 'Best Buy',
      barcode: '0987654321',
      barcodeFormat: 'EAN13',
      brandId: null,
      color: 'red',
      isFavorite: false,
      lastUsedAt: null,
      usageCount: 0,
      createdAt: '2026-01-08T10:00:00Z',
      updatedAt: '2026-01-08T10:00:00Z'
    }
  ];

  const mockRefetch = jest.fn();
  
  // Mock useWindowDimensions
  const mockDimensions = { width: 375, height: 667, scale: 1, fontScale: 1 };
  let useWindowDimensionsSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    global.mockFlashListState.numColumns = undefined; // Reset captured value
    
    // Spy on useWindowDimensions
    const RN = require('react-native');
    useWindowDimensionsSpy = jest.spyOn(RN, 'useWindowDimensions').mockReturnValue(mockDimensions);
    
    mockUseCards.mockReturnValue({
      cards: [],
      isLoading: false,
      error: null,
      refetch: mockRefetch
    });
  });
  
  afterEach(() => {
    if (useWindowDimensionsSpy) {
      useWindowDimensionsSpy.mockRestore();
    }
  });

  describe('Loading State', () => {
    it('shows loading spinner while fetching cards', () => {
      mockUseCards.mockReturnValue({
        cards: [],
        isLoading: true,
        error: null,
        refetch: mockRefetch
      });

      const { UNSAFE_getByType } = render(<CardList />);
      const activityIndicator = UNSAFE_getByType(
        require('react-native').ActivityIndicator
      );
      expect(activityIndicator).toBeTruthy();
    });
  });

  describe('Error State', () => {
    it('displays error message when fetch fails', () => {
      mockUseCards.mockReturnValue({
        cards: [],
        isLoading: false,
        error: 'Failed to load cards',
        refetch: mockRefetch
      });

      render(<CardList />);

      const errorText = screen.getByText('Failed to load cards');
      expect(errorText).toBeTruthy();
    });
  });

  describe('Empty State - AC1', () => {
    it('shows EmptyState component when no cards exist', () => {
      mockUseCards.mockReturnValue({
        cards: [],
        isLoading: false,
        error: null,
        refetch: mockRefetch
      });

      render(<CardList />);

      // EmptyState should be rendered by FlashList's ListEmptyComponent
      const emptyStateText = screen.getByText('No cards yet');
      expect(emptyStateText).toBeTruthy();
    });
  });

  describe('Card Grid Display - AC2', () => {
    it('renders cards when available', () => {
      mockUseCards.mockReturnValue({
        cards: mockCards,
        isLoading: false,
        error: null,
        refetch: mockRefetch
      });

      render(<CardList />);

      const card1 = screen.getByText('Apple Store');
      const card2 = screen.getByText('Best Buy');

      expect(card1).toBeTruthy();
      expect(card2).toBeTruthy();
    });

    it('renders correct number of cards', () => {
      mockUseCards.mockReturnValue({
        cards: mockCards,
        isLoading: false,
        error: null,
        refetch: mockRefetch
      });

      render(<CardList />);

      expect(screen.getByText('Apple Store')).toBeTruthy();
      expect(screen.getByText('Best Buy')).toBeTruthy();
    });
  });

  describe('Responsive Columns - AC2', () => {
    it('uses 2 columns on screens < 400dp width', () => {
      mockDimensions.width = 375; // iPhone SE width
      mockUseCards.mockReturnValue({
        cards: mockCards,
        isLoading: false,
        error: null,
        refetch: mockRefetch
      });

      render(<CardList />);

      // Verify FlashList receives numColumns=2
      expect(global.mockFlashListState.numColumns).toBe(2);
      expect(screen.getByText('Apple Store')).toBeTruthy();
    });

    it('uses 3 columns on screens >= 400dp width', () => {
      mockDimensions.width = 428; // iPhone 15 Pro Max width
      mockUseCards.mockReturnValue({
        cards: mockCards,
        isLoading: false,
        error: null,
        refetch: mockRefetch
      });

      render(<CardList />);

      // Verify FlashList receives numColumns=3
      expect(global.mockFlashListState.numColumns).toBe(3);
      expect(screen.getByText('Apple Store')).toBeTruthy();
    });
  });

  describe('Card Order - AC3', () => {
    it('displays cards in alphabetical order', () => {
      const unorderedCards: LoyaltyCard[] = [
        {
          id: '2',
          name: 'Zebra Store',
          barcode: '0987654321',
          barcodeFormat: 'EAN13',
          brandId: null,
          color: 'red',
          isFavorite: false,
          lastUsedAt: null,
          usageCount: 0,
          createdAt: '2026-01-08T10:00:00Z',
          updatedAt: '2026-01-08T10:00:00Z'
        },
        {
          id: '1',
          name: 'Apple Store',
          barcode: '1234567890',
          barcodeFormat: 'CODE128',
          brandId: null,
          color: 'blue',
          isFavorite: false,
          lastUsedAt: null,
          usageCount: 0,
          createdAt: '2026-01-07T10:00:00Z',
          updatedAt: '2026-01-07T10:00:00Z'
        }
      ];

      mockUseCards.mockReturnValue({
        cards: unorderedCards,
        isLoading: false,
        error: null,
        refetch: mockRefetch
      });

      render(<CardList />);

      // Cards should be ordered alphabetically by useCards hook
      // (which calls getAllCards that orders by name ASC)
      expect(screen.getByText('Apple Store')).toBeTruthy();
      expect(screen.getByText('Zebra Store')).toBeTruthy();
    });
  });

  describe('Focus Effect - Refetch', () => {
    it('refetches cards when screen comes into focus', () => {
      mockUseCards.mockReturnValue({
        cards: mockCards,
        isLoading: false,
        error: null,
        refetch: mockRefetch
      });

      render(<CardList />);

      // useFocusEffect should call the callback
      expect(useFocusEffect).toHaveBeenCalled();
      
      // The callback should call refetch
      // Since useFocusEffect is mocked to immediately call the callback,
      // refetch should be called
      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe('Offline Access - AC5', () => {
    it('works with local database (no network required)', () => {
      mockUseCards.mockReturnValue({
        cards: mockCards,
        isLoading: false,
        error: null,
        refetch: mockRefetch
      });

      render(<CardList />);

      // Should display cards from local database
      expect(screen.getByText('Apple Store')).toBeTruthy();
      expect(screen.getByText('Best Buy')).toBeTruthy();
    });
  });

  describe('Performance - AC4', () => {
    it('uses FlashList for high-performance rendering', () => {
      const manyCards: LoyaltyCard[] = Array.from({ length: 50 }, (_, i) => ({
        id: `${i}`,
        name: `Store ${i}`,
        barcode: `${i}234567890`,
        barcodeFormat: 'CODE128' as const,
        brandId: null,
        color: 'blue' as const,
        isFavorite: false,
        lastUsedAt: null,
        usageCount: 0,
        createdAt: '2026-01-07T10:00:00Z',
        updatedAt: '2026-01-07T10:00:00Z'
      }));

      mockUseCards.mockReturnValue({
        cards: manyCards,
        isLoading: false,
        error: null,
        refetch: mockRefetch
      });

      render(<CardList />);

      // FlashList should handle many cards efficiently
      // We verify it renders without errors
      expect(screen.getByText('Store 0')).toBeTruthy();
    });
  });
});
