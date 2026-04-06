/**
 * InlineScanButton Component Tests
 * Story 13.4: Restyle Add Card Flow (AC6)
 */

import { render, screen, fireEvent } from '@testing-library/react-native';

import { InlineScanButton } from './InlineScanButton';

jest.mock('@/shared/theme', () => ({
  useTheme: () => ({
    theme: { primary: '#1A73E8' },
    isDark: false
  })
}));

describe('InlineScanButton', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with default testID', () => {
    render(<InlineScanButton onPress={mockOnPress} />);
    expect(screen.getByTestId('inline-scan-button')).toBeTruthy();
  });

  it('renders barcode-scan icon', () => {
    render(<InlineScanButton onPress={mockOnPress} />);
    expect(screen.getByText('barcode-scan')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    render(<InlineScanButton onPress={mockOnPress} />);
    fireEvent.press(screen.getByTestId('inline-scan-button'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('has correct accessibility attributes', () => {
    render(<InlineScanButton onPress={mockOnPress} />);
    const button = screen.getByTestId('inline-scan-button');
    expect(button.props.accessibilityRole).toBe('button');
    expect(button.props.accessibilityLabel).toBe('Scan barcode with camera');
  });
});
