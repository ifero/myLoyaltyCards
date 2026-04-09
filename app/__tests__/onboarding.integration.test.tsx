import { fireEvent, render } from '@testing-library/react-native';
import { useRouter } from 'expo-router';

import { completeFirstLaunch } from '@/core/settings/settings-repository';

import FeatureHighlightsScreen from '@/features/onboarding/screens/FeatureHighlightsScreen';
import ModeSelectionScreen from '@/features/onboarding/screens/ModeSelectionScreen';
import WelcomeScreen from '@/features/onboarding/screens/WelcomeScreen';

jest.mock('@/core/settings/settings-repository', () => ({
  isFirstLaunch: jest.fn(() => true),
  completeFirstLaunch: jest.fn()
}));

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
      borderStrong: '#8F8F94',
      link: '#1A73E8'
    },
    typography: {
      title1: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
      title2: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
      headline: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
      footnote: { fontSize: 13, lineHeight: 18 }
    }
  })
}));

describe('Onboarding flow integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Welcome -> Mode Selection via Get Started', () => {
    const pushSpy = useRouter().push as jest.Mock;
    const { getByTestId } = render(<WelcomeScreen />);

    fireEvent.press(getByTestId('welcome-get-started'));
    expect(pushSpy).toHaveBeenCalledWith('/onboarding/mode-selection');
  });

  it('Mode Selection local option -> Highlights', () => {
    const pushSpy = useRouter().push as jest.Mock;
    const { getByTestId } = render(<ModeSelectionScreen />);

    fireEvent.press(getByTestId('mode-option-local'));
    expect(pushSpy).toHaveBeenCalledWith('/onboarding/highlights');
  });

  it('Highlights skip -> complete onboarding and home', () => {
    const replaceSpy = useRouter().replace as jest.Mock;
    const { getByTestId } = render(<FeatureHighlightsScreen />);

    fireEvent.press(getByTestId('highlights-skip'));
    expect(completeFirstLaunch).toHaveBeenCalled();
    expect(replaceSpy).toHaveBeenCalledWith('/');
  });
});
