/**
 * DetailRow Component Tests
 * Story 2.6: View Card Details
 */

import { render, fireEvent } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';

import { DetailRow } from './DetailRow';

// Mock theme provider
jest.mock('@/shared/theme', () => ({
  useTheme: () => ({
    theme: {
      textPrimary: '#1F2937',
      textSecondary: '#6B7280',
      border: '#E5E7EB'
    }
  })
}));

describe('DetailRow', () => {
  describe('Rendering', () => {
    it('renders label and value correctly', () => {
      const { getByText } = render(<DetailRow label="Format" value="Code 128" />);

      expect(getByText('Format')).toBeTruthy();
      expect(getByText('Code 128')).toBeTruthy();
    });

    it('renders with testID when provided', () => {
      const { getByTestId } = render(
        <DetailRow label="Format" value="Code 128" testID="detail-row" />
      );

      expect(getByTestId('detail-row')).toBeTruthy();
    });

    it('renders right element when provided', () => {
      const { getByTestId } = render(
        <DetailRow
          label="Color"
          value="Blue"
          rightElement={<Text testID="right-element">Icon</Text>}
          testID="detail-row"
        />
      );

      expect(getByTestId('right-element')).toBeTruthy();
    });
  });

  describe('Interaction', () => {
    it('calls onPress when tapped and onPress is provided', () => {
      const mockOnPress = jest.fn();
      const { getByText } = render(
        <DetailRow label="Number" value="1234567890" onPress={mockOnPress} />
      );

      fireEvent.press(getByText('Number'));
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('does not crash when tapped without onPress', () => {
      const { getByText } = render(<DetailRow label="Format" value="Code 128" />);

      // Should not throw
      expect(() => {
        fireEvent.press(getByText('Format'));
      }).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    it('has correct accessibility label when pressable', () => {
      const { getByRole } = render(
        <DetailRow
          label="Number"
          value="1234567890"
          onPress={() => {}}
          accessibilityHint="Double tap to copy"
        />
      );

      const button = getByRole('button');
      expect(button.props.accessibilityLabel).toBe('Number: 1234567890');
      expect(button.props.accessibilityHint).toBe('Double tap to copy');
    });
  });

  describe('Text Handling', () => {
    it('renders long value without crashing', () => {
      const longValue = '1234567890123456789012345678901234567890';
      const { getByText } = render(<DetailRow label="Number" value={longValue} />);

      expect(getByText(longValue)).toBeTruthy();
    });
  });
});
