/**
 * MultiCodePickerSheet Tests
 * Story 2.9: Scan Cards from Image or Screenshot (AC5)
 */

import { act, render, fireEvent } from '@testing-library/react-native';
import React from 'react';
import { Modal, StyleSheet } from 'react-native';

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
    // Holds every slide: a test finishes one by calling the callback it was handed.
    withTiming: jest.fn((value: number) => value),
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

  it('presents nothing before the first multi-code scan', () => {
    const { UNSAFE_getByType, queryByTestId } = render(
      <MultiCodePickerSheet visible={false} codes={[]} onSelect={jest.fn()} onDismiss={jest.fn()} />
    );
    expect(UNSAFE_getByType(Modal).props.visible).toBe(false);
    expect(
      queryByTestId('multi-code-picker-sheet-content', { includeHiddenElements: true })
    ).toBeNull();
  });

  // Story 22.1, AC8 — BrandScannerScreen derives BOTH props from one list, and every way out
  // (Cancel, the scrim, a row, Android back) empties it. The picker used to return null on that
  // render, which unmounted the shared sheet before its slide-out could run.
  describe('closing', () => {
    const finishSlideOut = () => {
      const { withTiming } = jest.requireMock<{ withTiming: jest.Mock }>('react-native-reanimated');
      const slideOut = withTiming.mock.calls.at(-1)?.[2] as
        | ((finished: boolean) => void)
        | undefined;
      act(() => slideOut?.(true));
    };

    it('slides out with the rows it showed, though the caller empties them as it closes', () => {
      const { rerender, getByTestId, queryByTestId } = render(
        <MultiCodePickerSheet {...defaultProps} />
      );
      rerender(<MultiCodePickerSheet {...defaultProps} visible={false} codes={[]} />);
      expect(getByTestId('code-row-1', { includeHiddenElements: true })).toBeTruthy();

      finishSlideOut();
      expect(queryByTestId('code-row-0', { includeHiddenElements: true })).toBeNull();
    });

    it('shows the next scan its own codes', () => {
      const { rerender, getByText } = render(<MultiCodePickerSheet {...defaultProps} />);
      rerender(<MultiCodePickerSheet {...defaultProps} visible={false} codes={[]} />);
      finishSlideOut();

      rerender(
        <MultiCodePickerSheet
          {...defaultProps}
          codes={[{ value: '9780201379624', format: 'EAN13' }]}
        />
      );
      expect(getByText('9780201379624')).toBeTruthy();
    });
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

  // Story 22.1, AC8 — the picker was the one hand-rolled sheet left: its own Modal, scrim, slide
  // and handle. It is now the shared BottomSheet, whose grabber is the spec's 36 × 4 (the size
  // this picker already drew; the shared sheet was the off-spec one).
  it('is drawn by the shared sheet, grabber included (AC8)', () => {
    const { getByTestId } = render(<MultiCodePickerSheet {...defaultProps} />);
    expect(getByTestId('multi-code-picker-sheet-content')).toBeTruthy();
    expect(
      StyleSheet.flatten(getByTestId('multi-code-picker-sheet-grabber').props.style)
    ).toMatchObject({ width: 36, height: 4 });
    expect(getByTestId('multi-code-cancel')).toBeTruthy();
  });

  it('announces its title as the sheet heading', () => {
    const { getByText } = render(<MultiCodePickerSheet {...defaultProps} />);
    expect(getByText('Multiple barcodes found').props.accessibilityRole).toBe('header');
  });

  // The rows run edge to edge — their rules span the sheet — with their content on the sheet's
  // 24pt margin, in line with the title above them.
  it('runs its rows edge to edge, aligned with the title', () => {
    const { getByTestId } = render(<MultiCodePickerSheet {...defaultProps} />);
    expect(StyleSheet.flatten(getByTestId('code-row-0').props.style)).toMatchObject({
      marginHorizontal: -24,
      paddingHorizontal: 24
    });
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

    // The shared sheet hides its scrim from assistive technology, so RNTL 13 skips it by
    // default; include hidden elements to locate and press it, as a finger would.
    fireEvent.press(getByTestId('multi-code-picker-sheet-scrim', { includeHiddenElements: true }));

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
