import { fireEvent, render } from '@testing-library/react-native';
import { useRouter } from 'expo-router';

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
    },
    typography: {
      title1: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
      headline: { fontSize: 17, lineHeight: 22, fontWeight: '600' }
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
