import { fireEvent, render, screen } from '@testing-library/react-native';

import { TextField } from './TextField';

const mockUseTheme = jest.fn();

jest.mock('@/shared/theme', () => ({
  useTheme: () => mockUseTheme()
}));

const lightTheme = {
  textPrimary: '#0F172A',
  textTertiary: '#94A3B8',
  error: '#DC2626',
  primary: '#1A73E8',
  border: '#D6DEE8',
  backgroundSubtle: '#F1F5F9',
  surface: '#FFFFFF'
};

const darkTheme = {
  textPrimary: '#F8FAFC',
  textTertiary: '#94A3B8',
  error: '#F87171',
  primary: '#4DA3FF',
  border: '#2A3441',
  backgroundSubtle: '#05070A',
  surface: '#111418'
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
    expect(input.props.style.backgroundColor).toBe(darkTheme.surface);
  });
});
