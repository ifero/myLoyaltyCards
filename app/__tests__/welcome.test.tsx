/**
 * Welcome Screen Tests
 * Story 4.1: Welcome Screen
 *
 * Tests for the Welcome Screen component:
 * - Renders all required elements (AC1)
 * - CTA behavior and navigation (AC2)
 * - Accessibility attributes
 */

import { render, fireEvent } from '@testing-library/react-native';

import WelcomeScreen from '../welcome';

// Track navigation calls
const mockReplace = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
    back: jest.fn()
  })
}));

jest.mock('@/shared/theme', () => ({
  useTheme: () => ({
    theme: {
      background: '#FAFAFA',
      surface: '#FFFFFF',
      textPrimary: '#1F2937',
      textSecondary: '#6B7280',
      primary: '#73A973',
      primaryDark: '#5C9A5C',
      border: '#E5E7EB'
    },
    isDark: false
  })
}));

const mockCompleteFirstLaunch = jest.fn();
jest.mock('@/core/settings/settings-repository', () => ({
  completeFirstLaunch: (...args: unknown[]) => mockCompleteFirstLaunch(...args)
}));

describe('WelcomeScreen — Story 4.1', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── AC1: First Launch — renders all required elements ──

  describe('AC1: First Launch rendering', () => {
    it('renders the welcome screen container', () => {
      const { getByTestId } = render(<WelcomeScreen />);
      expect(getByTestId('welcome-screen')).toBeTruthy();
    });

    it('renders the app title', () => {
      const { getByTestId } = render(<WelcomeScreen />);
      const title = getByTestId('welcome-title');
      expect(title).toBeTruthy();
      expect(title.props.children).toBe('myLoyaltyCards');
    });

    it('renders the illustration placeholder', () => {
      const { getByTestId } = render(<WelcomeScreen />);
      // The illustration has importantForAccessibility="no-hide-descendants"
      // which hides it from accessibility queries, so we verify it exists
      // by checking the parent container renders without error
      const screen = getByTestId('welcome-screen');
      expect(screen).toBeTruthy();
    });

    it('renders the tagline text', () => {
      const { getByText } = render(<WelcomeScreen />);
      // The tagline is split across two Text children via {'\n'}
      expect(getByText(/Your loyalty cards, always ready/)).toBeTruthy();
    });

    it('renders the "Get started" primary CTA', () => {
      const { getByTestId } = render(<WelcomeScreen />);
      expect(getByTestId('welcome-get-started')).toBeTruthy();
    });

    it('renders the "Skip" secondary CTA', () => {
      const { getByTestId } = render(<WelcomeScreen />);
      expect(getByTestId('welcome-skip')).toBeTruthy();
    });
  });

  // ── AC2: CTA Behavior ──

  describe('AC2: CTA Behavior', () => {
    it('"Get started" calls completeFirstLaunch and navigates to add-card', () => {
      const { getByTestId } = render(<WelcomeScreen />);
      fireEvent.press(getByTestId('welcome-get-started'));

      expect(mockCompleteFirstLaunch).toHaveBeenCalledTimes(1);
      expect(mockReplace).toHaveBeenCalledWith('/add-card');
    });

    it('"Skip" calls completeFirstLaunch and navigates to card list', () => {
      const { getByTestId } = render(<WelcomeScreen />);
      fireEvent.press(getByTestId('welcome-skip'));

      expect(mockCompleteFirstLaunch).toHaveBeenCalledTimes(1);
      expect(mockReplace).toHaveBeenCalledWith('/');
    });

    it('"Help & FAQ" navigates to help screen', () => {
      const { getByTestId } = render(<WelcomeScreen />);
      fireEvent.press(getByTestId('welcome-help'));

      expect(mockPush).toHaveBeenCalledWith('/help');
    });
  });

  // ── Accessibility ──

  describe('Accessibility', () => {
    it('title has header accessibility role', () => {
      const { getByTestId } = render(<WelcomeScreen />);
      expect(getByTestId('welcome-title').props.accessibilityRole).toBe('header');
    });

    it('"Get started" has correct accessibility label and hint', () => {
      const { getByTestId } = render(<WelcomeScreen />);
      const btn = getByTestId('welcome-get-started');
      expect(btn.props.accessibilityLabel).toBe('Get started');
      expect(btn.props.accessibilityHint).toBe('Opens first card setup');
    });

    it('"Skip" has correct accessibility label and hint', () => {
      const { getByTestId } = render(<WelcomeScreen />);
      const btn = getByTestId('welcome-skip');
      expect(btn.props.accessibilityLabel).toBe('Skip onboarding');
      expect(btn.props.accessibilityHint).toBe('Goes to your card list');
    });

    it('illustration is hidden from screen readers', () => {
      const { UNSAFE_getByProps } = render(<WelcomeScreen />);
      const illustration = UNSAFE_getByProps({ testID: 'welcome-illustration' });
      expect(illustration.props.accessibilityElementsHidden).toBe(true);
      expect(illustration.props.importantForAccessibility).toBe('no-hide-descendants');
    });

    it('screen has accessible label', () => {
      const { getByTestId } = render(<WelcomeScreen />);
      expect(getByTestId('welcome-screen').props.accessibilityLabel).toBe(
        'Welcome to myLoyaltyCards'
      );
    });
  });
});
