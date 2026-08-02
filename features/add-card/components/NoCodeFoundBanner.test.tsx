/**
 * NoCodeFoundBanner Tests
 * Story 2.9: Scan Cards from Image or Screenshot (AC6)
 */

import { render, fireEvent } from '@testing-library/react-native';
import React from 'react';

import { NoCodeFoundBanner } from './NoCodeFoundBanner';

jest.mock('@/shared/theme', () => ({
  useTheme: () => ({
    theme: {
      warning: '#F59E0B',
      primary: '#3B82F6'
    }
  })
}));

jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: 'MaterialIcons'
}));

describe('NoCodeFoundBanner', () => {
  const defaultProps = {
    onDismiss: jest.fn(),
    onRetry: jest.fn(),
    onManualEntry: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders with the correct default testID', () => {
    const { getByTestId } = render(<NoCodeFoundBanner {...defaultProps} />);
    expect(getByTestId('no-code-found-banner')).toBeTruthy();
  });

  it('renders with a custom testID', () => {
    const { getByTestId } = render(<NoCodeFoundBanner {...defaultProps} testID="custom-banner" />);
    expect(getByTestId('custom-banner')).toBeTruthy();
  });

  it('renders the notFound message by default', () => {
    const { getByText } = render(<NoCodeFoundBanner {...defaultProps} />);
    expect(
      getByText("We couldn't read a barcode in this image — try scanning the card itself")
    ).toBeTruthy();
  });

  // Story 16.23 (AC2): the two failure modes must not read the same. The old
  // single message claimed the image held no barcode even when it demonstrably
  // did, and even when the decoder never managed to open the file at all.
  it('renders the notFound message when reason is notFound', () => {
    const { getByText } = render(<NoCodeFoundBanner {...defaultProps} reason="notFound" />);
    expect(
      getByText("We couldn't read a barcode in this image — try scanning the card itself")
    ).toBeTruthy();
  });

  it('renders a distinct message when reason is scanFailed', () => {
    const { getByText, queryByText } = render(
      <NoCodeFoundBanner {...defaultProps} reason="scanFailed" />
    );
    expect(getByText('Something went wrong reading that image')).toBeTruthy();
    expect(
      queryByText("We couldn't read a barcode in this image — try scanning the card itself")
    ).toBeNull();
  });

  it('renders a distinct message when reason is pickerFailed', () => {
    // Deliberately does not mention "that image": the picker never handed us one,
    // so there is nothing about the user's choice for them to reconsider.
    const { getByText, queryByText } = render(
      <NoCodeFoundBanner {...defaultProps} reason="pickerFailed" />
    );
    expect(getByText("We couldn't open your photos")).toBeTruthy();
    expect(queryByText('Something went wrong reading that image')).toBeNull();
  });

  it('uses a retry label that does not presume a first image for pickerFailed', () => {
    const { getByText, queryByText } = render(
      <NoCodeFoundBanner {...defaultProps} reason="pickerFailed" />
    );
    expect(getByText('Try again')).toBeTruthy();
    expect(queryByText('Try another image')).toBeNull();
  });

  it.each(['notFound', 'scanFailed'] as const)(
    'keeps the shared retry label for reason %s',
    (reason) => {
      const { getByText } = render(<NoCodeFoundBanner {...defaultProps} reason={reason} />);
      expect(getByText('Try another image')).toBeTruthy();
    }
  );

  it('still calls onRetry from the pickerFailed retry button', () => {
    // Only the wording changes; the behaviour must be identical.
    const onRetry = jest.fn();
    const { getByTestId } = render(
      <NoCodeFoundBanner {...defaultProps} reason="pickerFailed" onRetry={onRetry} />
    );
    fireEvent.press(getByTestId('banner-retry-image'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('announces the reason-specific message to screen readers', () => {
    const { getByTestId } = render(<NoCodeFoundBanner {...defaultProps} reason="scanFailed" />);
    expect(getByTestId('no-code-found-banner').props.accessibilityLabel).toBe(
      'Something went wrong reading that image'
    );
  });

  it('renders close, retry, and manual entry controls', () => {
    const { getByTestId } = render(<NoCodeFoundBanner {...defaultProps} />);
    expect(getByTestId('banner-close')).toBeTruthy();
    expect(getByTestId('banner-retry-image')).toBeTruthy();
    expect(getByTestId('banner-manual-entry')).toBeTruthy();
  });

  it('renders correct action link labels', () => {
    const { getByText } = render(<NoCodeFoundBanner {...defaultProps} />);
    expect(getByText('Try another image')).toBeTruthy();
    expect(getByText('Enter manually')).toBeTruthy();
  });

  it('calls onDismiss when close button is pressed', () => {
    const onDismiss = jest.fn();
    const { getByTestId } = render(<NoCodeFoundBanner {...defaultProps} onDismiss={onDismiss} />);

    fireEvent.press(getByTestId('banner-close'));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('calls onRetry when "Try another image" is pressed', () => {
    const onRetry = jest.fn();
    const { getByTestId } = render(<NoCodeFoundBanner {...defaultProps} onRetry={onRetry} />);

    fireEvent.press(getByTestId('banner-retry-image'));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('calls onManualEntry when "Enter manually" is pressed', () => {
    const onManualEntry = jest.fn();
    const { getByTestId } = render(
      <NoCodeFoundBanner {...defaultProps} onManualEntry={onManualEntry} />
    );

    fireEvent.press(getByTestId('banner-manual-entry'));

    expect(onManualEntry).toHaveBeenCalledTimes(1);
  });

  it('auto-dismisses after 5 seconds', () => {
    const onDismiss = jest.fn();
    render(<NoCodeFoundBanner {...defaultProps} onDismiss={onDismiss} />);

    expect(onDismiss).not.toHaveBeenCalled();

    jest.advanceTimersByTime(5000);

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does not auto-dismiss before 5 seconds', () => {
    const onDismiss = jest.fn();
    render(<NoCodeFoundBanner {...defaultProps} onDismiss={onDismiss} />);

    jest.advanceTimersByTime(4999);

    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('clears the auto-dismiss timer on unmount', () => {
    const onDismiss = jest.fn();
    const { unmount } = render(<NoCodeFoundBanner {...defaultProps} onDismiss={onDismiss} />);

    unmount();
    jest.advanceTimersByTime(6000);

    expect(onDismiss).not.toHaveBeenCalled();
  });
});
