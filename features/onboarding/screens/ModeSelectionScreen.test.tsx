import { fireEvent, render } from '@testing-library/react-native';

import ModeSelectionScreen from './ModeSelectionScreen';

const mockSelectLocalMode = jest.fn();
const mockSelectCloudMode = jest.fn();

jest.mock('../hooks/useModeSelection', () => ({
  useModeSelection: () => ({
    selectLocalMode: mockSelectLocalMode,
    selectCloudMode: mockSelectCloudMode
  })
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
      border: '#E5E5EB',
      link: '#1A73E8'
    },
    typography: {
      footnote: { fontSize: 13, lineHeight: 18 }
    }
  })
}));

describe('ModeSelectionScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders both mode option cards and recommended badge', () => {
    const { getByTestId, getByText } = render(<ModeSelectionScreen />);

    expect(getByTestId('mode-option-local')).toBeTruthy();
    expect(getByTestId('mode-option-cloud')).toBeTruthy();
    expect(getByText('Recommended')).toBeTruthy();
  });

  it('tapping local card triggers local mode setup', () => {
    const { getByTestId } = render(<ModeSelectionScreen />);

    fireEvent.press(getByTestId('mode-option-local'));
    expect(mockSelectLocalMode).toHaveBeenCalled();
  });

  it('tapping cloud card navigates to sign-up flow', () => {
    const { getByTestId } = render(<ModeSelectionScreen />);

    fireEvent.press(getByTestId('mode-option-cloud'));
    expect(mockSelectCloudMode).toHaveBeenCalled();
  });

  it("opens tooltip modal from what's the difference link", () => {
    const { getByTestId } = render(<ModeSelectionScreen />);

    fireEvent.press(getByTestId('mode-selection-whats-difference'));
    expect(getByTestId('info-tooltip-modal')).toBeTruthy();
  });
});
