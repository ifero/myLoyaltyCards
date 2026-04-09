import { fireEvent, render } from '@testing-library/react-native';
import { useRouter } from 'expo-router';

import { completeFirstLaunch } from '@/core/settings/settings-repository';

import FeatureHighlightsScreen from './FeatureHighlightsScreen';

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
      textPrimary: '#1F1F24',
      textSecondary: '#66666B',
      primary: '#1A73E8',
      borderStrong: '#8F8F94',
      link: '#1A73E8'
    },
    typography: {
      title2: { fontSize: 22, lineHeight: 28, fontWeight: '700' }
    }
  })
}));

describe('FeatureHighlightsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders first slide by default', () => {
    const { getByTestId } = render(<FeatureHighlightsScreen />);
    expect(getByTestId('highlight-slide-0')).toBeTruthy();
  });

  it('next advances from first slide to second (pagination updates)', () => {
    const { getByTestId, getAllByTestId } = render(<FeatureHighlightsScreen />);

    fireEvent.press(getAllByTestId('highlight-next-button')[0]);
    expect(getByTestId('pagination-dot-1')).toBeTruthy();
  });

  it('skip completes onboarding and navigates home', () => {
    const replaceSpy = useRouter().replace as jest.Mock;
    const { getByTestId } = render(<FeatureHighlightsScreen />);

    fireEvent.press(getByTestId('highlights-skip'));
    expect(completeFirstLaunch).toHaveBeenCalled();
    expect(replaceSpy).toHaveBeenCalledWith('/');
  });
});
