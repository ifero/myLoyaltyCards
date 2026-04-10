import { fireEvent, render, screen } from '@testing-library/react-native';

import { SyncErrorBanner } from './SyncErrorBanner';

jest.mock('@/shared/theme', () => ({
  useTheme: () => ({
    theme: {
      textPrimary: '#1F2937',
      textSecondary: '#66666B'
    },
    isDark: false
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

  it('retry button has correct accessibility label', () => {
    render(<SyncErrorBanner message="Error" onRetry={jest.fn()} onDismiss={jest.fn()} />);

    expect(screen.getByTestId('sync-error-retry-button').props.accessibilityLabel).toBe(
      'Retry cloud sync'
    );
  });
});
