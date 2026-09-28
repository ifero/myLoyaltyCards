import { fireEvent, render, screen } from '@testing-library/react-native';
import { createRef } from 'react';
import { StyleSheet, type TextInput } from 'react-native';

import { LIGHT_THEME } from '@/shared/theme/colors';
import { TOUCH_TARGET } from '@/shared/theme/spacing';

import { FieldError, FieldLabel, TextField } from './TextField';

// AC4b — an ODD value on purpose, as in `Button.test`. With the real 48, a field that hardcoded 48
// would pass the height test; 47 exists nowhere else, so only a field that reads the token can.
jest.mock('@/shared/theme/spacing', () => ({
  ...jest.requireActual('@/shared/theme/spacing'),
  TOUCH_TARGET: { min: 47 }
}));

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

  // Story 22.1, AC7 — "Form field labels are UPPERCASE — label-bold (Inter 13px, weight 600,
  // +0.02em tracking)". The tracking arrives in POINTS through the token (0.02em × 13 = 0.26pt):
  // a literal `letterSpacing: 0.02` would be ~13× too tight.
  it('sets the label in uppercase label-bold, tracked in points (AC7)', () => {
    render(<TextField label="Card name" value="" onChangeText={jest.fn()} testID="field" />);

    const label = screen.getByText('Card name');
    expect(flattenStyle(label.props.style)).toMatchObject({
      fontFamily: 'Inter',
      fontSize: 13,
      fontWeight: '600',
      letterSpacing: 0.26,
      textTransform: 'uppercase',
      color: LIGHT_THEME.textPrimary
    });
    // The capitals are a style: the string a screen reader receives stays sentence case.
    expect(label.props.children).toBe('Card name');
  });

  it('keeps placeholders, values and errors in sentence case (AC7)', () => {
    render(
      <TextField
        label="Card name"
        value="Mario"
        placeholder="Enter card name"
        onChangeText={jest.fn()}
        error="Card name is required"
        testID="field"
      />
    );

    expect(flattenStyle(screen.getByTestId('field').props.style).textTransform).toBeUndefined();
    expect(
      flattenStyle(screen.getByTestId('field-error').props.style).textTransform
    ).toBeUndefined();
  });

  // React 19: `ref` is a plain prop, so a form library can reach the input to focus it.
  it('forwards its ref to the underlying input', () => {
    const ref = createRef<TextInput>();
    render(<TextField ref={ref} label="Name" value="" onChangeText={jest.fn()} testID="field" />);

    expect(ref.current).not.toBeNull();
    expect(typeof ref.current?.focus).toBe('function');
  });

  it('caps the input at maxLength and can show the count beside the label', () => {
    const { rerender } = render(
      <TextField
        label="Name"
        value=""
        maxLength={50}
        showCharacterCount
        onChangeText={jest.fn()}
        testID="field"
      />
    );

    expect(screen.getByTestId('field').props.maxLength).toBe(50);
    expect(screen.getByText('0/50')).toBeTruthy();

    rerender(
      <TextField
        label="Name"
        value="Test Card"
        maxLength={50}
        showCharacterCount
        onChangeText={jest.fn()}
        testID="field"
      />
    );
    expect(screen.getByText('9/50')).toBeTruthy();
  });

  it('shows no count unless asked', () => {
    render(
      <TextField label="Name" value="" maxLength={50} onChangeText={jest.fn()} testID="field" />
    );
    expect(screen.queryByText('0/50')).toBeNull();
  });

  // Story 21.6 handed this over: the frames set card numbers in JetBrains Mono so the digits
  // align, and the add and edit flows must agree.
  it('sets a mono field in the mono-code face', () => {
    render(<TextField label="Card number" value="" onChangeText={jest.fn()} mono testID="field" />);
    expect(flattenStyle(screen.getByTestId('field').props.style)).toMatchObject({
      fontFamily: 'JetBrains Mono',
      fontSize: 16,
      fontWeight: '500'
    });
  });

  it('sets an ordinary field in Inter', () => {
    render(<TextField label="Name" value="" onChangeText={jest.fn()} testID="field" />);
    expect(flattenStyle(screen.getByTestId('field').props.style)).toMatchObject({
      fontFamily: 'Inter',
      fontSize: 17
    });
  });

  // AC10 / AC4b — the height IS the token, so 16.33's 44 → 48 reaches every input with no literal
  // here to hunt for (`tokens.generated.test.ts` pins the value itself).
  it('takes its minimum height from the touch-target token, at the 12pt control radius', () => {
    render(<TextField label="Name" value="" onChangeText={jest.fn()} testID="field" />);
    const { minHeight, borderRadius } = flattenStyle(screen.getByTestId('field').props.style);
    expect(TOUCH_TARGET.min).toBe(47);
    expect(minHeight).toBe(47);
    expect(borderRadius).toBe(12);
  });
});

// The idiom on its own, for a field that is not a text input: the colour picker, a read-only value.
describe('FieldLabel', () => {
  it('is the same uppercase label-bold as a text field label', () => {
    render(<FieldLabel testID="label">Card color</FieldLabel>);
    expect(flattenStyle(screen.getByTestId('label').props.style)).toMatchObject({
      fontSize: 13,
      fontWeight: '600',
      letterSpacing: 0.26,
      textTransform: 'uppercase',
      color: LIGHT_THEME.textPrimary
    });
  });
});

describe('FieldError', () => {
  it('announces itself and uses the error colour, never a hardcoded red', () => {
    render(<FieldError testID="error">Card name is required</FieldError>);
    const error = screen.getByTestId('error');
    expect(error.props.accessibilityLiveRegion).toBe('polite');
    expect(flattenStyle(error.props.style).color).toBe(LIGHT_THEME.error);
  });
});
