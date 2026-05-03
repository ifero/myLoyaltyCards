/**
 * MultiCodePickerSheet Tests
 * Story 2.9: Scan Cards from Image or Screenshot (AC5)
 */

import { render, fireEvent } from '@testing-library/react-native';
import React from 'react';

import { MultiCodePickerSheet } from './MultiCodePickerSheet';
import { DetectedCode } from '../hooks/useImageScan';

jest.mock('@/shared/theme', () => ({
  useTheme: () => ({
    theme: {
      surface: '#FFFFFF',
      border: '#E5E7EB',
      textPrimary: '#111827',
      textSecondary: '#6B7280',
      textTertiary: '#9CA3AF',
      primary: '#3B82F6',
      error: '#EF4444',
      backgroundSubtle: '#F3F4F6'
    }
  })
}));

jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: 'MaterialIcons'
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 })
}));

jest.mock('react-native-reanimated', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mockReact = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mockRN = require('react-native');

  const AnimatedView = mockReact.forwardRef((props: Record<string, unknown>, ref: unknown) =>
    mockReact.createElement(mockRN.View, { ...props, ref })
  );

  return {
    __esModule: true,
    default: { View: AnimatedView, Text: mockRN.Text },
    useSharedValue: (initial: number) => ({ value: initial }),
    useAnimatedStyle: () => ({}),
    withTiming: (value: number) => value,
    withRepeat: (value: number) => value,
    withSpring: (value: number) => value,
    Easing: {
      out: () => 'easing-fn',
      ease: 'ease'
    }
  };
});

const sampleCodes: DetectedCode[] = [
  { value: '1234567890128', format: 'EAN13' },
  { value: 'CODE-ABC-123', format: 'CODE128' }
];

describe('MultiCodePickerSheet', () => {
  const defaultProps = {
    visible: true,
    codes: sampleCodes,
    onSelect: jest.fn(),
    onDismiss: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when visible is false and codes is empty', () => {
    const { toJSON } = render(
      <MultiCodePickerSheet visible={false} codes={[]} onSelect={jest.fn()} onDismiss={jest.fn()} />
    );
    expect(toJSON()).toBeNull();
  });

  it('renders code rows when visible', () => {
    const { getByTestId } = render(<MultiCodePickerSheet {...defaultProps} />);
    expect(getByTestId('code-row-0')).toBeTruthy();
    expect(getByTestId('code-row-1')).toBeTruthy();
  });

  it('renders the correct number of code rows', () => {
    const { queryByTestId } = render(<MultiCodePickerSheet {...defaultProps} />);
    expect(queryByTestId('code-row-0')).toBeTruthy();
    expect(queryByTestId('code-row-1')).toBeTruthy();
    expect(queryByTestId('code-row-2')).toBeNull();
  });

  it('renders drag handle and cancel button', () => {
    const { getByTestId } = render(<MultiCodePickerSheet {...defaultProps} />);
    expect(getByTestId('multi-code-drag-handle')).toBeTruthy();
    expect(getByTestId('multi-code-cancel')).toBeTruthy();
  });

  it('renders the title and subtitle', () => {
    const { getByText } = render(<MultiCodePickerSheet {...defaultProps} />);
    expect(getByText('Multiple barcodes found')).toBeTruthy();
    expect(getByText('Tap the one that matches your loyalty card')).toBeTruthy();
  });

  it('calls onSelect with the correct code when a row is pressed', () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(<MultiCodePickerSheet {...defaultProps} onSelect={onSelect} />);

    fireEvent.press(getByTestId('code-row-0'));

    expect(onSelect).toHaveBeenCalledWith(sampleCodes[0]);
  });

  it('calls onSelect with second code when second row is pressed', () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(<MultiCodePickerSheet {...defaultProps} onSelect={onSelect} />);

    fireEvent.press(getByTestId('code-row-1'));

    expect(onSelect).toHaveBeenCalledWith(sampleCodes[1]);
  });

  it('calls onDismiss when cancel button is pressed', () => {
    const onDismiss = jest.fn();
    const { getByTestId } = render(
      <MultiCodePickerSheet {...defaultProps} onDismiss={onDismiss} />
    );

    fireEvent.press(getByTestId('multi-code-cancel'));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss when scrim is pressed', () => {
    const onDismiss = jest.fn();
    const { getByTestId } = render(
      <MultiCodePickerSheet {...defaultProps} onDismiss={onDismiss} />
    );

    // Scrim is a sibling of the accessibilityViewIsModal sheet, so RNTL 13 hides it
    // by default; include hidden elements to locate and press it.
    fireEvent.press(getByTestId('multi-code-scrim', { includeHiddenElements: true }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('renders EAN-13 format display name', () => {
    const { getByText } = render(<MultiCodePickerSheet {...defaultProps} />);
    expect(getByText('EAN-13')).toBeTruthy();
  });

  it('renders Code 128 format display name', () => {
    const { getByText } = render(<MultiCodePickerSheet {...defaultProps} />);
    expect(getByText('Code 128')).toBeTruthy();
  });

  it('truncates long barcode values to 28 chars', () => {
    const longValue = 'A'.repeat(40);
    const { getByText } = render(
      <MultiCodePickerSheet
        visible
        codes={[{ value: longValue, format: 'CODE128' }]}
        onSelect={jest.fn()}
        onDismiss={jest.fn()}
      />
    );

    expect(getByText(`${'A'.repeat(28)}…`)).toBeTruthy();
  });

  it('does not truncate values at or under 28 chars', () => {
    const shortValue = 'A'.repeat(28);
    const { getByText } = render(
      <MultiCodePickerSheet
        visible
        codes={[{ value: shortValue, format: 'CODE128' }]}
        onSelect={jest.fn()}
        onDismiss={jest.fn()}
      />
    );

    expect(getByText(shortValue)).toBeTruthy();
  });

  it('renders up to 6 code rows', () => {
    const sixCodes: DetectedCode[] = Array.from({ length: 6 }, (_, i) => ({
      value: `CODE-${i}`,
      format: 'CODE128' as const
    }));

    const { getByTestId, queryByTestId } = render(
      <MultiCodePickerSheet visible codes={sixCodes} onSelect={jest.fn()} onDismiss={jest.fn()} />
    );

    for (let i = 0; i < 6; i++) {
      expect(getByTestId(`code-row-${i}`)).toBeTruthy();
    }
    expect(queryByTestId('code-row-6')).toBeNull();
  });

  it('uses the custom testID when provided', () => {
    const { getByTestId } = render(
      <MultiCodePickerSheet {...defaultProps} testID="custom-sheet" />
    );
    expect(getByTestId('custom-sheet')).toBeTruthy();
  });
});
