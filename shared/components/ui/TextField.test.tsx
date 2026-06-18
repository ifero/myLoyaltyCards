import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { LIGHT_THEME } from '@/shared/theme/colors';

import { TextField } from './TextField';

// TextField styles via Unistyles (react-native-unistyles/mocks resolves themed
// styles against the first-registered theme — `light`). So assertions use the
// real LIGHT_THEME tokens.
//
// Dark-mode limitation: the official Unistyles v3 mock always returns the first
// theme from useUnistyles()/StyleSheet.create — UnistylesRuntime.setTheme() is a
// no-op in the mock — so a useUnistyles()-based component cannot be unit-rendered
// in dark mode here. ThemeProvider.test.tsx asserts the engine is switched to
// dark AND that the token set flips; the on-device light/dark visual sweep (AC5)
// remains the authoritative regression gate for dark-token application.
const flattenStyle = (style: unknown) =>
  StyleSheet.flatten(style as never) as Record<string, unknown>;

describe('TextField', () => {
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
    expect(flattenStyle(input.props.style).borderColor).toBe(LIGHT_THEME.primary);
  });

  it('applies default border when filled but not focused', () => {
    render(<TextField label="Name" value="Mario" onChangeText={jest.fn()} testID="field" />);

    const input = screen.getByTestId('field');
    expect(flattenStyle(input.props.style).borderColor).toBe(LIGHT_THEME.border);
  });

  it('handles disabled state', () => {
    render(<TextField label="Name" value="" onChangeText={jest.fn()} disabled testID="field" />);

    const input = screen.getByTestId('field');
    expect(input.props.editable).toBe(false);
  });

  it('applies the themed surfaceElevated background', () => {
    render(<TextField label="Name" value="" onChangeText={jest.fn()} testID="field" />);

    const input = screen.getByTestId('field');
    expect(flattenStyle(input.props.style).backgroundColor).toBe(LIGHT_THEME.surfaceElevated);
  });

  it('applies the subtle background when disabled', () => {
    render(<TextField label="Name" value="" onChangeText={jest.fn()} disabled testID="field" />);

    const input = screen.getByTestId('field');
    expect(flattenStyle(input.props.style).backgroundColor).toBe(LIGHT_THEME.backgroundSubtle);
  });
});
