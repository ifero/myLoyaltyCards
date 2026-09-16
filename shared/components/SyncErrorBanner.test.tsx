import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { SyncErrorBanner } from './SyncErrorBanner';

let mockIsDark = false;

jest.mock('@/shared/theme', () => ({
  useTheme: () => ({
    theme: mockIsDark
      ? { textPrimary: '#F0F0E8', textSecondary: '#B5B5AB', onError: '#181824' }
      : { textPrimary: '#181824', textSecondary: '#55555F', onError: '#FFFFFF' },
    isDark: mockIsDark
  })
}));

jest.mock('@/shared/theme/spacing', () => ({
  TOUCH_TARGET: { min: 44, recommended: 48 }
}));

jest.mock('@/shared/theme/sync-tokens', () => ({
  SYNC_TOKENS: {
    errorBg: { light: '#FFECEC', dark: '#461E22' },
    errorAccent: { light: '#FF5B30', dark: '#FF453A' },
    errorDismiss: { light: '#636366', dark: '#BEBFC5' }
  }
}));

describe('SyncErrorBanner', () => {
  // In `afterEach`, not inline at the end of a test body: an assertion that
  // throws would skip an inline reset and leak `mockIsDark = true` into
  // whichever test ran next. The dark-mode describe below already does this.
  afterEach(() => {
    mockIsDark = false;
  });

  it('renders nothing when message is null', () => {
    const { queryByTestId } = render(
      <SyncErrorBanner message={null} onRetry={jest.fn()} onDismiss={jest.fn()} />
    );

    expect(queryByTestId('sync-error-banner')).toBeNull();
  });

  it('renders error message, icon, and actions when message exists', () => {
    render(
      <SyncErrorBanner message="Cloud sync failed" onRetry={jest.fn()} onDismiss={jest.fn()} />
    );

    expect(screen.getByTestId('sync-error-banner')).toBeTruthy();
    expect(screen.getByTestId('sync-error-icon')).toBeTruthy();
    expect(screen.getByTestId('sync-error-message').props.children).toBe('Cloud sync failed');
    expect(screen.getByTestId('sync-error-retry-button')).toBeTruthy();
    expect(screen.getByTestId('sync-error-dismiss-button')).toBeTruthy();
  });

  it('calls handlers when retry and dismiss are pressed', () => {
    const onRetry = jest.fn();
    const onDismiss = jest.fn();

    render(<SyncErrorBanner message="Cloud sync failed" onRetry={onRetry} onDismiss={onDismiss} />);

    fireEvent.press(screen.getByTestId('sync-error-retry-button'));
    fireEvent.press(screen.getByTestId('sync-error-dismiss-button'));

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('has alert accessibility role', () => {
    render(<SyncErrorBanner message="Error" onRetry={jest.fn()} onDismiss={jest.fn()} />);

    expect(screen.getByTestId('sync-error-banner').props.accessibilityRole).toBe('alert');
  });

  /**
   * The retry label sits on an `errorAccent` fill, which IS the error token, and
   * white stops clearing AA against the dark red (3.41:1). `onError` is the
   * token that follows the fill; this proves the component reads it rather than
   * a literal, in BOTH schemes — a revert to a hardcoded white would otherwise
   * pass the whole suite.
   */
  it.each([
    ['light', false, '#FFFFFF'],
    ['dark', true, '#181824']
  ])('paints the retry label with onError in %s', (_scheme, isDark, expected) => {
    mockIsDark = isDark;
    render(
      <SyncErrorBanner message="Cloud sync failed" onRetry={jest.fn()} onDismiss={jest.fn()} />
    );

    const style = StyleSheet.flatten(screen.getByTestId('sync-error-retry-label').props.style) as {
      color?: string;
    };
    expect(style.color).toBe(expected);
  });

  /**
   * The banner's message is body text, and the design system's dark rule is
   * cream, "never pure white". It read `NEUTRAL_COLORS.white` in dark until
   * Story 21.2.
   */
  it('never paints the message pure white', () => {
    mockIsDark = true;
    render(
      <SyncErrorBanner message="Cloud sync failed" onRetry={jest.fn()} onDismiss={jest.fn()} />
    );

    const style = StyleSheet.flatten(screen.getByTestId('sync-error-message').props.style) as {
      color?: string;
    };
    expect(style.color).toBe('#F0F0E8');
  });

  it('retry button has correct accessibility label and hint', () => {
    render(<SyncErrorBanner message="Error" onRetry={jest.fn()} onDismiss={jest.fn()} />);

    const retryBtn = screen.getByTestId('sync-error-retry-button');
    expect(retryBtn.props.accessibilityLabel).toBe('Retry cloud sync');
    expect(retryBtn.props.accessibilityHint).toBe('Attempts to sync your cards to the cloud again');
  });

  it('dismiss button has correct accessibility hint', () => {
    render(<SyncErrorBanner message="Error" onRetry={jest.fn()} onDismiss={jest.fn()} />);

    expect(screen.getByTestId('sync-error-dismiss-button').props.accessibilityHint).toBe(
      'Hides the error message'
    );
  });
});

describe('SyncErrorBanner (dark mode)', () => {
  beforeEach(() => {
    mockIsDark = true;
  });

  afterEach(() => {
    mockIsDark = false;
  });

  it('uses dark mode error tokens', () => {
    render(<SyncErrorBanner message="Error" onRetry={jest.fn()} onDismiss={jest.fn()} />);

    const banner = screen.getByTestId('sync-error-banner');
    expect(StyleSheet.flatten(banner.props.style).backgroundColor).toBe('#461E22');
    expect(StyleSheet.flatten(banner.props.style).borderColor).toBe('#FF453A');
  });
});
