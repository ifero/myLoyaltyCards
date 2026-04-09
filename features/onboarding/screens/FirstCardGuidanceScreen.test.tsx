import { fireEvent, render } from '@testing-library/react-native';

import FirstCardGuidanceScreen from './FirstCardGuidanceScreen';

const mockCompleteAndGoToAddCard = jest.fn();

jest.mock('../hooks/useOnboardingFlow', () => ({
  useOnboardingFlow: () => ({
    completeAndGoToAddCard: mockCompleteAndGoToAddCard
  })
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
      primaryDark: '#1967D2',
      border: '#E5E5EB'
    },
    typography: {
      title2: { fontSize: 22, lineHeight: 28, fontWeight: '700' }
    }
  })
}));

describe('FirstCardGuidanceScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders icon, heading and CTA', () => {
    const { getByTestId, getAllByText, UNSAFE_getByProps } = render(<FirstCardGuidanceScreen />);

    expect(UNSAFE_getByProps({ testID: 'first-card-guidance-icon' })).toBeTruthy();
    expect(getAllByText('No cards yet').length).toBeGreaterThan(0);
    expect(getAllByText('Add Your First Card').length).toBeGreaterThan(0);
    expect(getByTestId('first-card-guidance-cta')).toBeTruthy();
  });

  it('CTA triggers onboarding completion and add-card navigation', () => {
    const { getByTestId } = render(<FirstCardGuidanceScreen />);

    fireEvent.press(getByTestId('first-card-guidance-cta'));
    expect(mockCompleteAndGoToAddCard).toHaveBeenCalled();
  });
});
