import { act, render, screen } from '@testing-library/react-native';

import { SyncIndicator } from './SyncIndicator';

let mockIsDark = false;

jest.mock('@/shared/theme', () => ({
  useTheme: () => ({
    theme: mockIsDark
      ? {
          primary: '#4DA3FF',
          success: '#22C55E',
          surfaceElevated: '#2C2C2E',
          textSecondary: '#D9D9DE'
        }
      : {
          primary: '#1A73E8',
          success: '#16A34A',
          surfaceElevated: '#2C2C2E',
          textSecondary: '#6B7280'
        },
    isDark: mockIsDark
  })
}));

jest.mock('@/shared/theme/sync-tokens', () => ({
  SYNC_TOKENS: {
    syncingBg: { light: '#E5F5FA', dark: '#2C2C2E' },
    syncingText: { light: '#1A73E8', dark: '#4DA3FF' },
    successBg: { light: '#E9F4EB', dark: '#1E3A27' },
    successText: { light: '#16A34A', dark: '#22C55E' }
  }
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

describe('SyncIndicator (dark mode)', () => {
  beforeEach(() => {
    mockIsDark = true;
  });

  afterEach(() => {
    mockIsDark = false;
  });

  it('uses dark mode syncing tokens', () => {
    render(<SyncIndicator syncState="syncing" />);

    const container = screen.getByTestId('sync-indicator');
    const innerView = container.children[0];
    expect(innerView.props.style.backgroundColor).toBe('#2C2C2E');
  });
});
