/**
 * EmptyState Component Tests
 * Story 2.1: Display Card List - AC1
 */

import { render, screen, fireEvent } from '@testing-library/react-native';
import { useRouter } from 'expo-router';

import { EmptyState } from './EmptyState';

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

describe('EmptyState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush
    });
  });

  describe('Rendering - AC1', () => {
    it('renders the card icon emoji', () => {
      render(<EmptyState />);

      const icon = screen.getByLabelText('Credit card icon');
      expect(icon).toBeTruthy();
      expect(icon.props.children).toBe('💳');
    });

    it('renders the primary welcome message', () => {
      render(<EmptyState />);

      const primaryText = screen.getByText('No cards yet');
      expect(primaryText).toBeTruthy();
      expect(primaryText.props.accessibilityRole).toBe('header');
    });

    it('renders the encouraging subtext', () => {
      render(<EmptyState />);

      const subtext = screen.getByText('Add your first loyalty card to get started');
      expect(subtext).toBeTruthy();
    });

    it('renders the Add Card button', () => {
      render(<EmptyState />);

      const button = screen.getByLabelText('Add Card');
      expect(button).toBeTruthy();
      expect(button.props.accessibilityRole).toBe('button');
      expect(button.props.accessibilityHint).toBe('Opens the add card screen');
    });

    it('renders button with correct text', () => {
      render(<EmptyState />);

      const buttonText = screen.getByText('Add Card');
      expect(buttonText).toBeTruthy();
    });
  });

  describe('Layout - AC1', () => {
    it('renders a layout container for the empty state', () => {
      render(<EmptyState />);

      const container = screen.getByLabelText('Credit card icon').parent;
      expect(container).toBeTruthy();
    });
  });

  describe('Navigation - AC1', () => {
    it('navigates to add-card screen when button is pressed', () => {
      render(<EmptyState />);

      const button = screen.getByLabelText('Add Card');
      fireEvent.press(button);

      expect(mockPush).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith('/add-card');
    });
  });

  describe('Accessibility - AC1', () => {
    it('has proper accessibility labels', () => {
      render(<EmptyState />);

      const icon = screen.getByLabelText('Credit card icon');
      expect(icon).toBeTruthy();

      const button = screen.getByLabelText('Add Card');
      expect(button).toBeTruthy();
      expect(button.props.accessibilityHint).toBe('Opens the add card screen');
    });

    it('has proper accessibility roles', () => {
      render(<EmptyState />);

      const primaryText = screen.getByText('No cards yet');
      expect(primaryText.props.accessibilityRole).toBe('header');

      const button = screen.getByLabelText('Add Card');
      expect(button.props.accessibilityRole).toBe('button');
    });
  });
});
