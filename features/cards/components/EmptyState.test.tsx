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

// Mock react-native-svg (used for wallet illustration)
jest.mock('react-native-svg', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  const MockSvg = (props: Record<string, unknown>) =>
    React.createElement(View, { ...props, testID: 'svg-root' });
  const MockRect = (props: Record<string, unknown>) =>
    React.createElement(View, { ...props, testID: 'svg-rect' });
  const MockCircle = (props: Record<string, unknown>) =>
    React.createElement(View, { ...props, testID: 'svg-circle' });
  const MockG = (props: Record<string, unknown>) => React.createElement(View, props);
  return {
    __esModule: true,
    default: MockSvg,
    Svg: MockSvg,
    Rect: MockRect,
    Circle: MockCircle,
    G: MockG
  };
});

// Mock ThemeProvider
jest.mock('@/shared/theme', () => ({
  useTheme: () => ({
    theme: {
      primary: '#1A73E8',
      textPrimary: '#1F1F24',
      textSecondary: '#66666B',
      textTertiary: '#8F8F94',
      border: '#E5E5EB'
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
    it('renders SVG wallet illustration', () => {
      render(<EmptyState />);
      expect(screen.getByTestId('svg-root')).toBeTruthy();
    });

    it('renders title "No cards yet"', () => {
      render(<EmptyState />);
      const title = screen.getByText('No cards yet');
      expect(title).toBeTruthy();
      expect(title.props.accessibilityRole).toBe('header');
    });

    it('renders encouraging subtitle with rewards copy', () => {
      render(<EmptyState />);
      expect(
        screen.getByText('Add your first loyalty card and\nnever miss rewards at checkout')
      ).toBeTruthy();
    });

    it('renders CTA button with "+" prefix', () => {
      render(<EmptyState />);
      expect(screen.getByText(/\+\s+Add Your First Card/)).toBeTruthy();
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
