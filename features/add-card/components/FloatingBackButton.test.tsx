/**
 * FloatingBackButton Component Tests
 * Story 13.4: Restyle Add Card Flow (AC4)
 */

import { render, screen, fireEvent } from '@testing-library/react-native';

import { FloatingBackButton } from './FloatingBackButton';

describe('FloatingBackButton', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with default testID', () => {
    render(<FloatingBackButton onPress={mockOnPress} />);
    expect(screen.getByTestId('floating-back-button')).toBeTruthy();
  });

  it('renders chevron-left icon', () => {
    render(<FloatingBackButton onPress={mockOnPress} />);
    expect(screen.getByText('chevron-left')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    render(<FloatingBackButton onPress={mockOnPress} />);
    fireEvent.press(screen.getByTestId('floating-back-button'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('has "Go back" accessibility label', () => {
    render(<FloatingBackButton onPress={mockOnPress} />);
    const button = screen.getByTestId('floating-back-button');
    expect(button.props.accessibilityLabel).toBe('Go back');
    expect(button.props.accessibilityRole).toBe('button');
  });

  it('accepts custom testID', () => {
    render(<FloatingBackButton onPress={mockOnPress} testID="custom-back" />);
    expect(screen.getByTestId('custom-back')).toBeTruthy();
  });
});
