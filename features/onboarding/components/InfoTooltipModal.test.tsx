import { fireEvent, render } from '@testing-library/react-native';

import { InfoTooltipModal } from './InfoTooltipModal';

jest.mock('@/shared/theme', () => ({
  useTheme: () => ({
    theme: {
      surface: '#FFFFFF',
      textPrimary: '#1F1F24',
      textSecondary: '#66666B',
      primary: '#1A73E8',
      border: '#E5E5EB'
    }
  })
}));

describe('InfoTooltipModal', () => {
  it('renders when visible', () => {
    const { getByTestId } = render(<InfoTooltipModal visible onClose={jest.fn()} testID="modal" />);
    expect(getByTestId('modal')).toBeTruthy();
  });

  it('does not render content when not visible', () => {
    const { queryByTestId } = render(
      <InfoTooltipModal visible={false} onClose={jest.fn()} testID="modal" />
    );
    expect(queryByTestId('modal-content')).toBeNull();
  });

  it('dismiss button closes modal', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(<InfoTooltipModal visible onClose={onClose} testID="modal" />);

    fireEvent.press(getByTestId('info-tooltip-close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('tap outside closes modal', () => {
    const onClose = jest.fn();
    const { UNSAFE_getByProps } = render(
      <InfoTooltipModal visible onClose={onClose} testID="modal" />
    );

    fireEvent.press(UNSAFE_getByProps({ testID: 'modal-scrim' }));
    expect(onClose).toHaveBeenCalled();
  });
});
