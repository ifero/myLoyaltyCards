import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { TOUCH_TARGET } from '@/shared/theme/spacing';

import { ColorPicker } from './ColorPicker';

const mockUseTheme = jest.fn();

jest.mock('@/shared/theme', () => ({
  CARD_COLORS: {
    blue: '#0C3C84',
    red: '#E42424',
    green: '#0C843C',
    orange: '#FCCC0C',
    grey: '#0C84CC'
  },
  useTheme: () => mockUseTheme()
}));

const lightTheme = { primary: '#1A73E8', border: '#E5E5EB' };
const darkTheme = { primary: '#4DA3FF', border: '#38383A' };

describe('ColorPicker', () => {
  beforeEach(() => {
    mockUseTheme.mockReturnValue({ theme: lightTheme });
  });

  it('renders 5 colors', () => {
    render(<ColorPicker value="blue" onChange={jest.fn()} testID="picker" />);

    expect(screen.getByTestId('picker-blue')).toBeTruthy();
    expect(screen.getByTestId('picker-red')).toBeTruthy();
    expect(screen.getByTestId('picker-green')).toBeTruthy();
    expect(screen.getByTestId('picker-orange')).toBeTruthy();
    expect(screen.getByTestId('picker-grey')).toBeTruthy();
  });

  it('calls onChange with selected color', () => {
    const onChange = jest.fn();
    render(<ColorPicker value="blue" onChange={onChange} testID="picker" />);

    fireEvent.press(screen.getByTestId('picker-red'));
    expect(onChange).toHaveBeenCalledWith('red');
  });

  it('marks selected color state', () => {
    render(<ColorPicker value="green" onChange={jest.fn()} testID="picker" />);

    const selected = screen.getByTestId('picker-green');
    expect(selected.props.accessibilityState.selected).toBe(true);
    expect(selected.props.style.borderWidth).toBe(3);
  });

  it('supports dark mode border token', () => {
    mockUseTheme.mockReturnValue({ theme: darkTheme });
    render(<ColorPicker value="blue" onChange={jest.fn()} testID="picker" />);

    const unselected = screen.getByTestId('picker-red');
    expect(unselected.props.style.borderColor).toBe(darkTheme.border);
  });

  // Story 22.1 (16.33 AC2): at the 48pt target, five swatches with a FIXED 24pt gap need 336pt —
  // more than `CardSetupScreen` has on a 375pt iPhone (327) or a 360dp Android (312). The form
  // frame spreads them across the content width instead, which fits down to a 288pt screen.
  it('sizes every swatch to the touch target and spreads them across the width', () => {
    render(<ColorPicker value="blue" onChange={jest.fn()} testID="picker" />);

    const swatch = StyleSheet.flatten(screen.getByTestId('picker-red').props.style);
    expect(swatch).toMatchObject({ width: TOUCH_TARGET.min, height: TOUCH_TARGET.min });

    const row = StyleSheet.flatten(screen.getByTestId('picker').props.style);
    expect(row.justifyContent).toBe('space-between');
    expect(row.gap).toBeUndefined();
  });
});
