/**
 * OtherCardRow Component Tests
 * Story 13.4: Restyle Add Card Flow (AC1)
 */

import { render, screen, fireEvent } from '@testing-library/react-native';

import { OtherCardRow } from './OtherCardRow';

jest.mock('@/shared/theme', () => ({
  useTheme: () => ({
    theme: {
      textPrimary: '#1F1F24',
      textSecondary: '#66666B',
      textTertiary: '#8F8F94',
      surfaceElevated: '#F5F5F5',
      border: '#E5E5EB'
    },
    isDark: false
  })
}));

describe('OtherCardRow', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders "Other card" title', () => {
    render(<OtherCardRow onPress={mockOnPress} />);
    expect(screen.getByText('Other card')).toBeTruthy();
  });

  it('renders subtitle text', () => {
    render(<OtherCardRow onPress={mockOnPress} />);
    expect(screen.getByText('Add a custom loyalty card')).toBeTruthy();
  });

  it('renders add icon', () => {
    render(<OtherCardRow onPress={mockOnPress} />);
    expect(screen.getByText('add')).toBeTruthy();
  });

  it('renders chevron icon', () => {
    render(<OtherCardRow onPress={mockOnPress} />);
    expect(screen.getByText('chevron-right')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    render(<OtherCardRow onPress={mockOnPress} />);
    fireEvent.press(screen.getByTestId('other-card-row'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('has correct accessibility label', () => {
    render(<OtherCardRow onPress={mockOnPress} />);
    const row = screen.getByTestId('other-card-row');
    expect(row.props.accessibilityLabel).toBe('Other card. Add a custom loyalty card');
    expect(row.props.accessibilityRole).toBe('button');
  });
});
