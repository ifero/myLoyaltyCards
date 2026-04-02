/**
 * EmptyState Component Tests
 * Story 13.2: Restyle Home Screen — AC4, AC7, AC9
 */

import { render, screen, fireEvent } from '@testing-library/react-native';
import { useRouter } from 'expo-router';

import { EmptyState } from './EmptyState';

// Mock expo-router
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: jest.fn()
}));

jest.mock('@expo/vector-icons', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native');
  return {
    MaterialIcons: ({
      name,
      accessibilityLabel,
      testID
    }: {
      name: string;
      accessibilityLabel?: string;
      testID?: string;
    }) => React.createElement(Text, { testID: testID ?? `icon-${name}`, accessibilityLabel }, name)
  };
});

// Mock ThemeProvider
jest.mock('@/shared/theme', () => ({
  useTheme: () => ({
    theme: {
      primary: '#1A73E8',
      textPrimary: '#0F172A',
      textSecondary: '#475569',
      textTertiary: '#94A3B8',
      border: '#D6DEE8'
    },
    isDark: false
  })
}));

describe('EmptyState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
  });

  describe('Rendering — AC4', () => {
    it('renders wallet vector icon (no emoji)', () => {
      render(<EmptyState />);
      expect(screen.getByText('account-balance-wallet')).toBeTruthy();
    });

    it('renders sparkle accent', () => {
      render(<EmptyState />);
      expect(screen.getByText('auto-awesome')).toBeTruthy();
    });

    it('renders title "No cards yet"', () => {
      render(<EmptyState />);
      const title = screen.getByText('No cards yet');
      expect(title).toBeTruthy();
      expect(title.props.accessibilityRole).toBe('header');
    });

    it('renders encouraging subtitle', () => {
      render(<EmptyState />);
      expect(screen.getByText('Add your first loyalty card to get started')).toBeTruthy();
    });

    it('renders CTA button "Add Your First Card"', () => {
      render(<EmptyState />);
      expect(screen.getByText('Add Your First Card')).toBeTruthy();
    });

    it('does not render any emoji', () => {
      const { toJSON } = render(<EmptyState />);
      const json = JSON.stringify(toJSON());
      expect(json).not.toContain('💳');
    });
  });

  describe('Navigation — AC4', () => {
    it('navigates to add-card screen when CTA is pressed', () => {
      render(<EmptyState />);
      const cta = screen.getByTestId('empty-state-cta');
      fireEvent.press(cta);
      expect(mockPush).toHaveBeenCalledWith('/add-card');
    });
  });

  describe('Accessibility — AC9', () => {
    it('has wallet illustration accessibility label', () => {
      render(<EmptyState />);
      expect(screen.getByLabelText('Wallet illustration')).toBeTruthy();
    });

    it('title has header accessibility role', () => {
      render(<EmptyState />);
      const title = screen.getByText('No cards yet');
      expect(title.props.accessibilityRole).toBe('header');
    });
  });
});
