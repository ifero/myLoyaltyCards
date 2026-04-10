import { fireEvent, render, screen } from '@testing-library/react-native';

import { SyncErrorBanner } from './SyncErrorBanner';

let mockIsDark = false;

jest.mock('@/shared/theme', () => ({
  useTheme: () => ({
    theme: mockIsDark
      ? { textPrimary: '#F5F5F7', textSecondary: '#D9D9DE' }
      : { textPrimary: '#1F2937', textSecondary: '#66666B' },
    isDark: mockIsDark
  }),
  NEUTRAL_COLORS: {
    white: '#FFFFFF'
  }
}));

jest.mock('@/shared/theme/colors', () => ({
  NEUTRAL_COLORS: {
    white: '#FFFFFF'
  }
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
    expect(banner.props.style.backgroundColor).toBe('#461E22');
    expect(banner.props.style.borderColor).toBe('#FF453A');
  });
});
