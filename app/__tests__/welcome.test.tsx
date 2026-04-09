import { fireEvent, render } from '@testing-library/react-native';
import { useRouter } from 'expo-router';

import WelcomeScreen from '../welcome';

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

describe('app/welcome route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders get started and sign in options', () => {
    const { getByTestId } = render(<WelcomeScreen />);

    expect(getByTestId('welcome-get-started')).toBeTruthy();
    expect(getByTestId('welcome-sign-in')).toBeTruthy();
  });

  it('get started goes to onboarding mode selection', () => {
    const pushSpy = useRouter().push as jest.Mock;
    const { getByTestId } = render(<WelcomeScreen />);

    fireEvent.press(getByTestId('welcome-get-started'));
    expect(pushSpy).toHaveBeenCalledWith('/onboarding/mode-selection');
  });
});
