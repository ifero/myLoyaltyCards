import { fireEvent, render } from '@testing-library/react-native';

import { ModeOptionCard } from './ModeOptionCard';

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

describe('ModeOptionCard', () => {
  it('renders icon, title and subtitle', () => {
    const { getByText } = render(
      <ModeOptionCard
        icon="smartphone"
        title="Keep cards on this device"
        subtitle="Fast and private"
        onPress={jest.fn()}
      />
    );

    expect(getByText('Keep cards on this device')).toBeTruthy();
    expect(getByText('Fast and private')).toBeTruthy();
  });

  it('renders Recommended badge when prop is true', () => {
    const { getByText } = render(
      <ModeOptionCard
        icon="smartphone"
        title="Keep cards on this device"
        subtitle="Fast and private"
        recommended
        onPress={jest.fn()}
      />
    );

    expect(getByText('Recommended')).toBeTruthy();
  });

  it('fires onPress callback', () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      <ModeOptionCard
        icon="cloud-upload"
        title="Sync across all devices"
        subtitle="Create account"
        onPress={onPress}
      />
    );

    fireEvent.press(getByRole('button'));
    expect(onPress).toHaveBeenCalled();
  });
});
