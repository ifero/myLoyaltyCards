import { fireEvent, render, within } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import { ScrollView } from 'react-native';

import { isFirstLaunch } from '@/core/settings/settings-repository';

import WelcomeScreen from './WelcomeScreen';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 })
}));

jest.mock('@/shared/theme', () => ({
  useTheme: () => ({
    theme: {
      background: '#FFFFFF',
      surface: '#FFFFFF',
      textPrimary: '#1F1F24',
      textSecondary: '#66666B',
      textTertiary: '#8F8F94',
      primary: '#1A73E8',
      primaryDark: '#1967D2',
      border: '#E5E5EB',
      link: '#1A73E8'
    }
  })
}));

jest.mock('@/core/settings/settings-repository', () => ({
  isFirstLaunch: jest.fn(() => true)
}));

describe('WelcomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders branded icon, headline and fanned illustration', () => {
    const { getByText, UNSAFE_getByProps } = render(<WelcomeScreen />);

    expect(UNSAFE_getByProps({ testID: 'welcome-branded-icon' })).toBeTruthy();
    expect(UNSAFE_getByProps({ testID: 'welcome-fanned-illustration' })).toBeTruthy();
    expect(getByText('Your loyalty cards, always with you')).toBeTruthy();
  });

  it('scrolls without bouncing, so Get Started stays reachable at the largest text sizes', () => {
    const { UNSAFE_getByType } = render(<WelcomeScreen />);
    const scroll = UNSAFE_getByType(ScrollView);

    expect(scroll.props.testID).toBe('welcome-screen');
    expect(scroll.props.alwaysBounceVertical).toBe(false);
    expect(within(scroll).getByTestId('welcome-get-started')).toBeTruthy();
  });

  it('Get Started navigates to Mode Selection', () => {
    const pushSpy = useRouter().push as jest.Mock;
    const { getByTestId } = render(<WelcomeScreen />);

    fireEvent.press(getByTestId('welcome-get-started'));
    expect(pushSpy).toHaveBeenCalledWith('/onboarding/mode-selection');
  });

  it('Sign In link navigates to Sign In route', () => {
    const pushSpy = useRouter().push as jest.Mock;
    const { getByTestId } = render(<WelcomeScreen />);

    fireEvent.press(getByTestId('welcome-sign-in'));
    expect(pushSpy).toHaveBeenCalledWith('/sign-in');
  });

  it('redirects to home when onboarding is already completed', () => {
    const replaceSpy = useRouter().replace as jest.Mock;
    (isFirstLaunch as jest.Mock).mockReturnValue(false);

    render(<WelcomeScreen />);
    expect(replaceSpy).toHaveBeenCalledWith('/');

    (isFirstLaunch as jest.Mock).mockReturnValue(true);
  });
});
