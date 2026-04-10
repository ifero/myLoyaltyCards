import { act, render, screen } from '@testing-library/react-native';

import { SyncIndicator } from './SyncIndicator';

jest.mock('@/shared/theme', () => ({
  useTheme: () => ({
    theme: {
      primary: '#1A73E8',
      success: '#16A34A',
      surfaceElevated: '#2C2C2E',
      textSecondary: '#6B7280'
    },
    isDark: false
  })
}));

describe('SyncIndicator', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders nothing when idle', () => {
    const { queryByTestId } = render(<SyncIndicator syncState="idle" />);
    expect(queryByTestId('sync-indicator')).toBeNull();
  });

  it('renders nothing when error (handled by SyncErrorBanner)', () => {
    const { queryByTestId } = render(<SyncIndicator syncState="error" />);
    expect(queryByTestId('sync-indicator')).toBeNull();
  });

  it('renders animated sync glyph and message when syncing', () => {
    render(<SyncIndicator syncState="syncing" />);

    expect(screen.getByTestId('sync-indicator')).toBeTruthy();
    expect(screen.getByTestId('sync-indicator-icon')).toBeTruthy();
    expect(screen.getByText('Syncing cards…')).toBeTruthy();
  });

  it('renders success icon and message when success', () => {
    render(<SyncIndicator syncState="success" />);

    expect(screen.getByTestId('sync-indicator')).toBeTruthy();
    expect(screen.getByTestId('sync-success-icon')).toBeTruthy();
    expect(screen.getByText('All changes synced')).toBeTruthy();
  });

  it('auto-dismisses success after 2500ms', () => {
    const onSuccessDismissed = jest.fn();
    render(<SyncIndicator syncState="success" onSuccessDismissed={onSuccessDismissed} />);

    expect(onSuccessDismissed).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(2500);
    });

    expect(onSuccessDismissed).toHaveBeenCalledTimes(1);
  });

  it('has correct accessibility attributes for syncing', () => {
    render(<SyncIndicator syncState="syncing" />);
    const indicator = screen.getByTestId('sync-indicator');

    expect(indicator.props.accessibilityLiveRegion).toBe('polite');
    expect(indicator.props.accessibilityLabel).toBe('Syncing cards');
  });

  it('has correct accessibility attributes for success', () => {
    render(<SyncIndicator syncState="success" />);
    const indicator = screen.getByTestId('sync-indicator');

    expect(indicator.props.accessibilityLabel).toBe('Cards synced');
  });
});
