import { fireEvent, render, screen } from '@testing-library/react-native';

import { TextField } from './TextField';

const mockUseTheme = jest.fn();

jest.mock('@/shared/theme', () => ({
  useTheme: () => mockUseTheme()
}));

const lightTheme = {
  textPrimary: '#1F1F24',
  textTertiary: '#8F8F94',
  error: '#DC2626',
  primary: '#1A73E8',
  border: '#E5E5EB',
  backgroundSubtle: '#F5F5F5',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF'
};

const darkTheme = {
  textPrimary: '#F5F5F7',
  textTertiary: '#99999E',
  error: '#F87171',
  primary: '#4DA3FF',
  border: '#38383A',
  backgroundSubtle: '#05070A',
  surface: '#1C1C1E',
  surfaceElevated: '#1C1C1E'
};

describe('TextField', () => {
  beforeEach(() => {
    mockUseTheme.mockReturnValue({ theme: lightTheme });
  });

  it('renders label and value', () => {
    render(<TextField label="Name" value="Mario" onChangeText={jest.fn()} testID="field" />);

    expect(screen.getByText('Name')).toBeTruthy();
    expect(screen.getByDisplayValue('Mario')).toBeTruthy();
  });

  it('shows error message', () => {
    render(
      <TextField label="Email" value="" onChangeText={jest.fn()} error="Required" testID="field" />
    );

    expect(screen.getByTestId('field-error')).toBeTruthy();
    expect(screen.getByText('Required')).toBeTruthy();
  });

  it('calls onChangeText', () => {
    const onChangeText = jest.fn();
    render(<TextField label="Name" value="" onChangeText={onChangeText} testID="field" />);

    fireEvent.changeText(screen.getByTestId('field'), 'ABC');
    expect(onChangeText).toHaveBeenCalledWith('ABC');
  });

  it('applies focused border color on focus', () => {
    render(<TextField label="Name" value="" onChangeText={jest.fn()} testID="field" />);

    const input = screen.getByTestId('field');
    fireEvent(input, 'focus');
    expect(input.props.style.borderColor).toBe(lightTheme.primary);
  });

  it('applies default border when filled but not focused', () => {
    render(<TextField label="Name" value="Mario" onChangeText={jest.fn()} testID="field" />);

    const input = screen.getByTestId('field');
    expect(input.props.style.borderColor).toBe(lightTheme.border);
  });

  it('handles disabled state', () => {
    render(<TextField label="Name" value="" onChangeText={jest.fn()} disabled testID="field" />);

    const input = screen.getByTestId('field');
    expect(input.props.editable).toBe(false);
  });

  it('supports dark mode tokens', () => {
    mockUseTheme.mockReturnValue({ theme: darkTheme });
    render(<TextField label="Name" value="" onChangeText={jest.fn()} testID="field" />);

    const input = screen.getByTestId('field');
    expect(input.props.style.backgroundColor).toBe(darkTheme.surfaceElevated);
  });
});
