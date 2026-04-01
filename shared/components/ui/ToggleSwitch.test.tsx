import { fireEvent, render, screen } from '@testing-library/react-native';

import { ToggleSwitch } from './ToggleSwitch';

const mockUseTheme = jest.fn();

jest.mock('@/shared/theme', () => ({
  useTheme: () => mockUseTheme()
}));

const lightTheme = {
  textPrimary: '#0F172A',
  primary: '#1A73E8',
  borderStrong: '#475569',
  surfaceElevated: '#1A1F26',
  textTertiary: '#94A3B8'
};

const darkTheme = {
  textPrimary: '#F8FAFC',
  primary: '#4DA3FF',
  borderStrong: '#64748B',
  surfaceElevated: '#111418',
  textTertiary: '#94A3B8'
};

describe('ToggleSwitch', () => {
  beforeEach(() => {
    mockUseTheme.mockReturnValue({ theme: lightTheme });
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
