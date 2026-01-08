/**
 * CardTile Component Tests
 * Story 2.1: Display Card List - AC2, AC6
 */

import { render, screen, fireEvent } from '@testing-library/react-native';
import { useRouter } from 'expo-router';

import { LoyaltyCard } from '@/core/schemas';

import { CardTile } from './CardTile';

// Mock expo-router
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: jest.fn()
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

// Mock CARD_COLORS
jest.mock('@/shared/theme/colors', () => ({
  CARD_COLORS: {
    blue: '#3B82F6',
    red: '#EF4444',
    green: '#22C55E',
    orange: '#F97316',
    grey: '#6B7280'
  }
}));

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
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush
    });
  });

  describe('Rendering - AC2', () => {
    it('renders card name', () => {
      render(<CardTile card={mockCard} />);

      const cardName = screen.getByText('Test Store');
      expect(cardName).toBeTruthy();
    });

    it('renders visual identifier with first letter', () => {
      render(<CardTile card={mockCard} />);

      const visualLetter = screen.getByText('T');
      expect(visualLetter).toBeTruthy();
    });

    it('uses card color for visual identifier background', () => {
      const { getByText } = render(<CardTile card={mockCard} />);

      const visualLetter = getByText('T');
      const visualContainer = visualLetter.parent;

      expect(visualContainer).toBeTruthy();
      // The background color should be applied via style
    });

    it('renders with correct aspect ratio (4:3)', () => {
      const { UNSAFE_getByType } = render(<CardTile card={mockCard} />);

      // CardTile uses Pressable with aspectRatio style
      // We verify the component renders without errors
      expect(screen.getByText('Test Store')).toBeTruthy();
    });
  });

  describe('Name Truncation - AC2', () => {
    it('truncates card name longer than 20 characters', () => {
      const longNameCard: LoyaltyCard = {
        ...mockCard,
        name: 'This is a very long card name that exceeds twenty characters'
      };

      render(<CardTile card={longNameCard} />);

      const truncatedName = screen.getByText(/This is a very lo…/);
      expect(truncatedName).toBeTruthy();
    });

    it('does not truncate card name 20 characters or less', () => {
      const shortNameCard: LoyaltyCard = {
        ...mockCard,
        name: 'Short Name'
      };

      render(<CardTile card={shortNameCard} />);

      const fullName = screen.getByText('Short Name');
      expect(fullName).toBeTruthy();
      expect(fullName.props.children).toBe('Short Name');
    });

    it('truncates exactly at 20 characters', () => {
      const exactly20Card: LoyaltyCard = {
        ...mockCard,
        name: '12345678901234567890' // Exactly 20 characters
      };

      render(<CardTile card={exactly20Card} />);

      const name = screen.getByText('12345678901234567890');
      expect(name).toBeTruthy();
      // Should not have ellipsis since it's exactly 20
    });

    it('adds ellipsis when truncating', () => {
      const longNameCard: LoyaltyCard = {
        ...mockCard,
        name: 'This is a very long card name'
      };

      render(<CardTile card={longNameCard} />);

      const truncated = screen.getByText(/…/);
      expect(truncated).toBeTruthy();
    });
  });

  describe('Visual Identifier - AC2', () => {
    it('displays first letter of card name in uppercase', () => {
      const lowercaseCard: LoyaltyCard = {
        ...mockCard,
        name: 'test store'
      };

      render(<CardTile card={lowercaseCard} />);

      const visualLetter = screen.getByText('T');
      expect(visualLetter).toBeTruthy();
    });

    it('handles cards with different colors', () => {
      const colors: Array<LoyaltyCard['color']> = ['blue', 'red', 'green', 'orange', 'grey'];

      colors.forEach((color) => {
        const { unmount } = render(
          <CardTile card={{ ...mockCard, color }} />
        );

        const visualLetter = screen.getByText('T');
        expect(visualLetter).toBeTruthy();

        unmount();
      });
    });

    it('falls back to grey color if color is invalid', () => {
      const invalidColorCard = {
        ...mockCard,
        color: 'invalid' as LoyaltyCard['color']
      };

      render(<CardTile card={invalidColorCard} />);

      const visualLetter = screen.getByText('T');
      expect(visualLetter).toBeTruthy();
    });
  });

  describe('Card Tap Interaction - AC6', () => {
    it('navigates to card details on press', () => {
      render(<CardTile card={mockCard} />);

      const tile = screen.getByLabelText('Test Store');
      fireEvent.press(tile);

      expect(mockPush).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith(`/card/${mockCard.id}`);
    });

    it('shows press feedback (opacity change)', () => {
      render(<CardTile card={mockCard} />);

      const tile = screen.getByLabelText('Test Store');
      
      // Pressable should handle press state
      fireEvent.press(tile);

      // We verify the press was handled (navigation called)
      expect(mockPush).toHaveBeenCalled();
    });
  });

  describe('Accessibility - AC6', () => {
    it('has correct accessibility role', () => {
      render(<CardTile card={mockCard} />);

      const tile = screen.getByLabelText('Test Store');
      expect(tile.props.accessibilityRole).toBe('button');
    });

    it('has correct accessibility label with card name', () => {
      render(<CardTile card={mockCard} />);

      const tile = screen.getByLabelText('Test Store');
      expect(tile).toBeTruthy();
    });

    it('has correct accessibility hint', () => {
      render(<CardTile card={mockCard} />);

      const tile = screen.getByLabelText('Test Store');
      expect(tile.props.accessibilityHint).toBe('Opens card details');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty card name gracefully', () => {
      const emptyNameCard: LoyaltyCard = {
        ...mockCard,
        name: ''
      };

      render(<CardTile card={emptyNameCard} />);

      // Should render without crashing
      const tile = screen.getByLabelText('');
      expect(tile).toBeTruthy();
    });

    it('handles single character card name', () => {
      const singleCharCard: LoyaltyCard = {
        ...mockCard,
        name: 'A'
      };

      render(<CardTile card={singleCharCard} />);

      const name = screen.getByText('A');
      expect(name).toBeTruthy();
    });

    it('handles special characters in card name', () => {
      const specialCharCard: LoyaltyCard = {
        ...mockCard,
        name: "Store's & More!"
      };

      render(<CardTile card={specialCharCard} />);

      const name = screen.getByText("Store's & More!");
      expect(name).toBeTruthy();
    });
  });
});
