import { fireEvent, render, screen } from '@testing-library/react-native';

import { ActionRow } from './ActionRow';

const mockUseTheme = jest.fn();

jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: ({ name }: { name: string }) => name,
  MaterialCommunityIcons: ({ name }: { name: string }) => name
}));

jest.mock('@/shared/theme', () => ({
  useTheme: () => mockUseTheme()
}));

const lightTheme = {
  border: '#D6DEE8',
  surfaceElevated: '#F1F5F9',
  surface: '#FFFFFF',
  textPrimary: '#0F172A',
  textSecondary: '#475569'
};

const darkTheme = {
  border: '#2A3441',
  surfaceElevated: '#1A1F26',
  surface: '#111418',
  textPrimary: '#F8FAFC',
  textSecondary: '#CBD5E1'
};

describe('ActionRow', () => {
  beforeEach(() => {
    mockUseTheme.mockReturnValue({ theme: lightTheme });
  });

  it('renders label and responds to press', () => {
    const onPress = jest.fn();
    render(
      <ActionRow icon="settings" iconFamily="MI" label="Settings" onPress={onPress} testID="row" />
    );

    fireEvent.press(screen.getByTestId('row'));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Settings')).toBeTruthy();
  });

  it('supports MCI icon family', () => {
    render(
      <ActionRow icon="barcode" iconFamily="MCI" label="Barcode" onPress={jest.fn()} testID="row" />
    );

    expect(screen.getByText('Barcode')).toBeTruthy();
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    render(
      <ActionRow
        icon="settings"
        iconFamily="MI"
        label="Settings"
        onPress={onPress}
        disabled
        testID="row"
      />
    );

    fireEvent.press(screen.getByTestId('row'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('supports dark mode tokens', () => {
    mockUseTheme.mockReturnValue({ theme: darkTheme });
    render(
      <ActionRow
        icon="settings"
        iconFamily="MI"
        label="Settings"
        onPress={jest.fn()}
        testID="row"
      />
    );

    fireEvent(screen.getByTestId('row'), 'pressIn');
    fireEvent(screen.getByTestId('row'), 'pressOut');
    expect(screen.getByText('Settings')).toBeTruthy();
  });
});
