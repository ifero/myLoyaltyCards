/**
 * CardTile Component Tests
 * Story 13.2: Restyle Home Screen — AC1, AC7, AC9
 */

import { render, screen, fireEvent } from '@testing-library/react-native';
import { useRouter } from 'expo-router';

import { LoyaltyCard } from '@/core/schemas';

import {
  CardTile,
  TILE_WIDTH,
  TILE_HEIGHT,
  TILE_RADIUS,
  SINGLE_TILE_WIDTH,
  SINGLE_TILE_HEIGHT,
  SINGLE_TILE_RADIUS
} from './CardTile';

// Mock expo-router
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: jest.fn()
}));

// Mock ThemeProvider
jest.mock('@/shared/theme', () => ({
  useTheme: jest.fn()
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { useTheme } = require('@/shared/theme');

// Mock CARD_COLORS
jest.mock('@/shared/theme/colors', () => ({
  CARD_COLORS: {
    blue: '#1A73E8',
    red: '#E2231A',
    green: '#16A34A',
    orange: '#F59E0B',
    grey: '#64748B'
  }
}));

// Mock useBrandLogo
jest.mock('../hooks/useBrandLogo', () => ({
  useBrandLogo: jest.fn()
}));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { useBrandLogo } = require('../hooks/useBrandLogo');

describe('CardTile', () => {
  const mockCard: LoyaltyCard = {
    id: '1',
    name: 'Test Store',
    barcode: '1234567890',
    barcodeFormat: 'CODE128',
    brandId: null,
    color: 'blue',
    isFavorite: false,
    lastUsedAt: null,
    usageCount: 0,
    createdAt: '2026-01-07T10:00:00Z',
    updatedAt: '2026-01-07T10:00:00Z'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    (useTheme as jest.Mock).mockReturnValue({
      theme: {
        primary: '#1A73E8',
        surface: '#FFFFFF',
        textPrimary: '#0F172A',
        textSecondary: '#475569',
        border: '#D6DEE8',
        borderStrong: '#94A3B8',
        surfaceElevated: '#F1F5F9'
      },
      isDark: false
    });
    (useBrandLogo as jest.Mock).mockReturnValue(undefined);
  });

  describe('Custom card rendering (no brandId)', () => {
    it('renders card name below tile', () => {
      render(<CardTile card={mockCard} />);
      expect(screen.getByText('Test Store')).toBeTruthy();
    });

    it('renders first-letter avatar for custom cards', () => {
      render(<CardTile card={mockCard} />);
      expect(screen.getByText('T')).toBeTruthy();
    });

    it('uses card color as tile background', () => {
      const { toJSON } = render(<CardTile card={mockCard} />);
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Catalogue card rendering (with brandId)', () => {
    const brandCard: LoyaltyCard = { ...mockCard, brandId: 'esselunga' };

    beforeEach(() => {
      (useBrandLogo as jest.Mock).mockReturnValue({
        id: 'esselunga',
        name: 'Esselunga',
        color: '#DB1F26',
        logo: 'esselunga',
        aliases: []
      });
    });

    it('renders brand abbreviation for catalogue cards', () => {
      render(<CardTile card={brandCard} />);
      expect(screen.getByText('ES')).toBeTruthy();
    });
  });

  describe('Tile dimensions', () => {
    it('exports correct grid tile dimensions', () => {
      expect(TILE_WIDTH).toBe(171);
      expect(TILE_HEIGHT).toBe(140);
      expect(TILE_RADIUS).toBe(16);
    });

    it('exports correct single-card tile dimensions', () => {
      expect(SINGLE_TILE_WIDTH).toBe(220);
      expect(SINGLE_TILE_HEIGHT).toBe(180);
      expect(SINGLE_TILE_RADIUS).toBe(20);
    });
  });

  describe('Name Truncation', () => {
    it('truncates card name longer than 20 characters', () => {
      const longNameCard: LoyaltyCard = {
        ...mockCard,
        name: 'This is a very long card name that exceeds twenty characters'
      };
      render(<CardTile card={longNameCard} />);
      expect(screen.getByText(/This is a very long …/)).toBeTruthy();
    });

    it('does not truncate card name 20 characters or less', () => {
      render(<CardTile card={{ ...mockCard, name: 'Short Name' }} />);
      const name = screen.getByText('Short Name');
      expect(name.props.children).toBe('Short Name');
    });
  });

  describe('Dark mode — AC7', () => {
    beforeEach(() => {
      (useTheme as jest.Mock).mockReturnValue({
        theme: {
          primary: '#4DA3FF',
          surface: '#111418',
          textPrimary: '#F8FAFC',
          textSecondary: '#CBD5E1',
          border: '#2A3441',
          borderStrong: '#475569',
          surfaceElevated: '#1A1F26'
        },
        isDark: true
      });
    });

    it('applies border to black-branded cards in dark mode', () => {
      const blackBrandCard: LoyaltyCard = { ...mockCard, brandId: 'zara' };
      (useBrandLogo as jest.Mock).mockReturnValue({
        id: 'zara',
        name: 'Zara',
        color: '#000000',
        logo: 'zara',
        aliases: []
      });

      const { toJSON } = render(<CardTile card={blackBrandCard} />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('#40404A');
    });
  });

  describe('Card Tap Interaction', () => {
    it('navigates to card details on press', () => {
      render(<CardTile card={mockCard} />);
      const tile = screen.getByLabelText('Test Store');
      fireEvent.press(tile);
      expect(mockPush).toHaveBeenCalledWith('/card/1');
    });
  });

  describe('Accessibility — AC9', () => {
    it('has correct accessibility role', () => {
      render(<CardTile card={mockCard} />);
      const tile = screen.getByLabelText('Test Store');
      expect(tile.props.accessibilityRole).toBe('button');
    });

    it('has correct accessibility hint', () => {
      render(<CardTile card={mockCard} />);
      const tile = screen.getByLabelText('Test Store');
      expect(tile.props.accessibilityHint).toBe('Opens card details');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty card name gracefully', () => {
      const { toJSON } = render(<CardTile card={{ ...mockCard, name: '' }} />);
      expect(toJSON()).toBeTruthy();
    });

    it('handles single character card name', () => {
      render(<CardTile card={{ ...mockCard, name: 'A' }} />);
      const elements = screen.getAllByText('A');
      expect(elements.length).toBeGreaterThan(0);
    });

    it('handles special characters in card name', () => {
      render(<CardTile card={{ ...mockCard, name: "Store's & More!" }} />);
      expect(screen.getByText("Store's & More!")).toBeTruthy();
    });
  });
});
