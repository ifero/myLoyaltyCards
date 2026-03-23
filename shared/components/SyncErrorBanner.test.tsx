import { fireEvent, render, screen } from '@testing-library/react-native';

import { SyncErrorBanner } from './SyncErrorBanner';

jest.mock('@/shared/theme', () => ({
  useTheme: () => ({
    theme: {
      textPrimary: '#1F2937'
    }
  })
}));

describe('SyncErrorBanner', () => {
  it('renders nothing when message is null', () => {
    const { queryByTestId } = render(
      <SyncErrorBanner message={null} onRetry={jest.fn()} onDismiss={jest.fn()} />
    );

    expect(queryByTestId('sync-error-banner')).toBeNull();
  });

  it('renders error message and actions when message exists', () => {
    render(
      <SyncErrorBanner message="Cloud sync failed" onRetry={jest.fn()} onDismiss={jest.fn()} />
    );

    expect(screen.getByTestId('sync-error-banner')).toBeTruthy();
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
});
