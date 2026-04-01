import { fireEvent, render, screen } from '@testing-library/react-native';

import { ColorPicker } from './ColorPicker';

const mockUseTheme = jest.fn();

jest.mock('@/shared/theme', () => ({
  CARD_COLORS: {
    blue: '#1A73E8',
    red: '#E2231A',
    green: '#16A34A',
    orange: '#F59E0B',
    grey: '#64748B'
  },
  useTheme: () => mockUseTheme()
}));

const lightTheme = { primary: '#1A73E8', border: '#D6DEE8' };
const darkTheme = { primary: '#4DA3FF', border: '#2A3441' };

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
});
