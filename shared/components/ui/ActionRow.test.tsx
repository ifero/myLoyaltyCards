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
  border: '#E5E5EB',
  surfaceElevated: '#F5F5F5',
  surface: '#FFFFFF',
  textPrimary: '#1F1F24',
  textSecondary: '#66666B'
};

const darkTheme = {
  border: '#38383A',
  surfaceElevated: '#2C2C2E',
  surface: '#1C1C1E',
  textPrimary: '#F5F5F7',
  textSecondary: '#D9D9DE'
};

describe('ActionRow', () => {
  beforeEach(() => {
    mockUseTheme.mockReturnValue({ theme: lightTheme });
  });

  it('renders label and responds to press', () => {
    const onPress = jest.fn();
    render(<ActionRow prefix={null} label="Settings" onPress={onPress} testID="row" />);

    fireEvent.press(screen.getByTestId('row'));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Settings')).toBeTruthy();
  });

  it('supports custom prefix component', () => {
    render(<ActionRow prefix={null} label="Barcode" onPress={jest.fn()} testID="row" />);

    expect(screen.getByText('Barcode')).toBeTruthy();
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    render(<ActionRow prefix={null} label="Settings" onPress={onPress} disabled testID="row" />);

    fireEvent.press(screen.getByTestId('row'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('supports dark mode tokens', () => {
    mockUseTheme.mockReturnValue({ theme: darkTheme });
    render(<ActionRow prefix={null} label="Settings" onPress={jest.fn()} testID="row" />);

    fireEvent(screen.getByTestId('row'), 'pressIn');
    fireEvent(screen.getByTestId('row'), 'pressOut');
    expect(screen.getByText('Settings')).toBeTruthy();
  });

  it('renders plain row with prefix and subtitle', () => {
    render(
      <ActionRow
        prefix={null}
        label="Other card"
        subtitle="Add a custom loyalty card"
        variant="plain"
        onPress={jest.fn()}
        testID="row"
      />
    );

    expect(screen.getByText('Other card')).toBeTruthy();
    expect(screen.getByText('Add a custom loyalty card')).toBeTruthy();
  });
});
