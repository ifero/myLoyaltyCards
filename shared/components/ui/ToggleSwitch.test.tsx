import { fireEvent, render, screen } from '@testing-library/react-native';

import { ToggleSwitch } from './ToggleSwitch';

const mockUseTheme = jest.fn();

jest.mock('@/shared/theme', () => ({
  useTheme: () => mockUseTheme()
}));

const lightTheme = {
  textPrimary: '#181824',
  primary: '#181824',
  borderStrong: '#9A9A93',
  surfaceElevated: '#F7F7F1',
  textTertiary: '#6B6B63'
};

const darkTheme = {
  textPrimary: '#F0F0E8',
  primary: '#FCCC0C',
  borderStrong: '#55555F',
  surfaceElevated: '#20202E',
  textTertiary: '#8F8F85'
};

describe('ToggleSwitch', () => {
  beforeEach(() => {
    mockUseTheme.mockReturnValue({ theme: lightTheme });
  });

  /**
   * The ON track is a WASH of `primary`, and in dark `primary` is beam. A beam
   * wash above 10 % alpha composites to olive — `#463C1F` at the 20 % this
   * carried until Story 21.2 — which the design system forbids by name. The
   * alpha is therefore load-bearing, not styling, so it is pinned: the knob and
   * the border carry the on-state in beam at its TRUE value, and the track stays
   * a tonal layer.
   */
  it.each([
    ['light', lightTheme],
    ['dark', darkTheme]
  ])('washes the on-track at 10%% alpha in %s, never higher', (_scheme, theme) => {
    mockUseTheme.mockReturnValue({ theme });

    render(<ToggleSwitch value onValueChange={jest.fn()} testID="toggle" />);

    expect(screen.getByTestId('toggle-track').props.style.backgroundColor).toBe(
      `${theme.primary}1A`
    );
  });

  it('renders switch with label', () => {
    render(
      <ToggleSwitch value={false} onValueChange={jest.fn()} label="Dark Mode" testID="toggle" />
    );

    expect(screen.getByText('Dark Mode')).toBeTruthy();
  });

  it('triggers value change on press', () => {
    const onValueChange = jest.fn();
    render(<ToggleSwitch value={false} onValueChange={onValueChange} testID="toggle" />);

    fireEvent.press(screen.getByTestId('toggle'));
    expect(onValueChange).toHaveBeenCalledWith(true);
  });

  it('does not trigger when disabled', () => {
    const onValueChange = jest.fn();
    render(<ToggleSwitch value={false} onValueChange={onValueChange} disabled testID="toggle" />);

    fireEvent.press(screen.getByTestId('toggle'));
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('moves knob when ON', () => {
    render(<ToggleSwitch value onValueChange={jest.fn()} testID="toggle" />);

    const knob = screen.getByTestId('toggle-knob');
    expect(knob.props.style.transform[0].translateX).toBe(22);
  });

  it('supports dark mode colors', () => {
    mockUseTheme.mockReturnValue({ theme: darkTheme });
    render(<ToggleSwitch value onValueChange={jest.fn()} testID="toggle" />);

    const knob = screen.getByTestId('toggle-knob');
    expect(knob.props.style.backgroundColor).toBe(darkTheme.primary);
  });
});
