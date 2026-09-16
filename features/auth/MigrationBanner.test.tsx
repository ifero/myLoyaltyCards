/**
 * MigrationBanner Component Tests
 * Story 6.14: Upgrade Guest to Account
 *
 * Tests rendering of the inline migration banner in each status state.
 */

import { render, fireEvent } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';

import MigrationBanner from './MigrationBanner';

// ---------------------------------------------------------------------------
// Mock theme
// ---------------------------------------------------------------------------

jest.mock('@/shared/theme', () => ({
  useTheme: () => ({
    theme: {
      primary: '#181824',
      textPrimary: '#181824',
      textSecondary: '#55555F',
      background: '#F0F0E8',
      surface: '#FFFFFF',
      border: '#D6D6CB',
      // Deliberately the DARK error pair: `onError` there is ink, so a component
      // that reverted to a hardcoded white could not pass the assertion below.
      // A mock carrying the light pair would make that test vacuous, since
      // light `onError` IS white.
      error: '#FF453A',
      onError: '#181824'
    }
  })
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MigrationBanner', () => {
  const defaultProps = {
    status: 'idle' as const,
    message: null as string | null,
    onRetry: jest.fn(),
    onDismiss: jest.fn()
  };

  it('renders nothing when status is idle', () => {
    const { queryByTestId } = render(<MigrationBanner {...defaultProps} />);

    expect(queryByTestId('migration-banner')).toBeNull();
  });

  it('renders nothing when message is null', () => {
    const { queryByTestId } = render(
      <MigrationBanner {...defaultProps} status="migrating" message={null} />
    );

    expect(queryByTestId('migration-banner')).toBeNull();
  });

  it('shows spinner and message during migration', () => {
    const { getByTestId } = render(
      <MigrationBanner
        {...defaultProps}
        status="migrating"
        message="Your cards are being backed up…"
      />
    );

    expect(getByTestId('migration-banner')).toBeTruthy();
    expect(getByTestId('migration-spinner')).toBeTruthy();
    expect(getByTestId('migration-message').props.children).toContain('backed up');
  });

  it('hides dismiss button during migration', () => {
    const { queryByTestId } = render(
      <MigrationBanner {...defaultProps} status="migrating" message="Backing up…" />
    );

    expect(queryByTestId('migration-dismiss-button')).toBeNull();
  });

  it('shows success message with dismiss button', () => {
    const { getByTestId, queryByTestId } = render(
      <MigrationBanner
        {...defaultProps}
        status="success"
        message="Your cards are safe — backed up to the cloud ✓"
      />
    );

    expect(getByTestId('migration-message').props.children).toContain('safe');
    expect(getByTestId('migration-dismiss-button')).toBeTruthy();
    expect(queryByTestId('migration-spinner')).toBeNull();
  });

  it('shows error message with retry and dismiss buttons', () => {
    const { getByTestId } = render(
      <MigrationBanner
        {...defaultProps}
        status="error"
        message="Some cards couldn't be backed up. Tap to retry."
      />
    );

    expect(getByTestId('migration-message').props.children).toContain('retry');
    expect(getByTestId('migration-retry-button')).toBeTruthy();
    expect(getByTestId('migration-dismiss-button')).toBeTruthy();
  });

  /**
   * The retry label sits on a `theme.error` fill, against which white fails AA
   * in dark mode. `onError` follows the fill; this proves the component reads it
   * rather than the literal white it carried until Story 21.2.
   */
  it('paints the retry label with onError, not a literal', () => {
    const { getByTestId } = render(
      <MigrationBanner {...defaultProps} status="error" message="Backup failed" />
    );

    const style = StyleSheet.flatten(getByTestId('migration-retry-label').props.style) as {
      color?: string;
    };
    expect(style.color).toBe('#181824');
    expect(style.color).not.toBe('#FFFFFF');
  });

  it('calls onRetry when retry button is pressed', () => {
    const onRetry = jest.fn();
    const { getByTestId } = render(
      <MigrationBanner {...defaultProps} status="error" message="Error" onRetry={onRetry} />
    );

    fireEvent.press(getByTestId('migration-retry-button'));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss when dismiss button is pressed', () => {
    const onDismiss = jest.fn();
    const { getByTestId } = render(
      <MigrationBanner {...defaultProps} status="success" message="Success" onDismiss={onDismiss} />
    );

    fireEvent.press(getByTestId('migration-dismiss-button'));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('has accessibilityRole alert for screen reader support', () => {
    const { getByTestId } = render(
      <MigrationBanner {...defaultProps} status="migrating" message="Migrating…" />
    );

    expect(getByTestId('migration-banner').props.accessibilityRole).toBe('alert');
  });
});
