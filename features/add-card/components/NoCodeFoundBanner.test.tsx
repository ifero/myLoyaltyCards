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

  it('renders the error message text', () => {
    const { getByText } = render(<NoCodeFoundBanner {...defaultProps} />);
    expect(getByText('No barcode found in this image')).toBeTruthy();
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
