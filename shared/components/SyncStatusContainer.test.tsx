import { render, screen } from '@testing-library/react-native';

import { resolvePriority, SyncStatusContainer } from './SyncStatusContainer';

jest.mock('@/shared/hooks/useNetworkStatus', () => ({
  useNetworkStatus: () => ({ isConnected: false, isInternetReachable: false })
}));

jest.mock('@/shared/theme', () => ({
  useTheme: () => ({
    theme: {
      primary: '#1A73E8',
      success: '#16A34A',
      error: '#DC2626',
      surfaceElevated: '#2C2C2E',
      textPrimary: '#1F1F24',
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

const defaultProps = {
  syncState: 'idle' as const,
  syncErrorMessage: null,
  isOffline: false,
  pendingChangeCount: 0,
  onRetrySync: jest.fn(),
  onDismissError: jest.fn(),
  onSuccessDismissed: jest.fn()
};

describe('resolvePriority', () => {
  it('returns error when syncErrorMessage is present', () => {
    expect(resolvePriority('idle', 'Sync failed', false, 0)).toBe('error');
  });

  it('returns syncing when syncState is syncing', () => {
    expect(resolvePriority('syncing', null, false, 0)).toBe('syncing');
  });

  it('returns offline when offline with pending changes', () => {
    expect(resolvePriority('idle', null, true, 3)).toBe('offline');
  });

  it('returns success when syncState is success', () => {
    expect(resolvePriority('success', null, false, 0)).toBe('success');
  });

  it('returns none when idle with no issues', () => {
    expect(resolvePriority('idle', null, false, 0)).toBe('none');
  });

  it('error takes priority over syncing', () => {
    expect(resolvePriority('syncing', 'Error', false, 0)).toBe('error');
  });

  it('syncing takes priority over offline', () => {
    expect(resolvePriority('syncing', null, true, 5)).toBe('syncing');
  });

  it('offline does NOT show when pendingChangeCount is 0', () => {
    expect(resolvePriority('idle', null, true, 0)).toBe('none');
  });
});

describe('SyncStatusContainer', () => {
  it('renders nothing when idle and no issues', () => {
    const { queryByTestId } = render(<SyncStatusContainer {...defaultProps} />);

    expect(queryByTestId('sync-indicator')).toBeNull();
    expect(queryByTestId('sync-error-banner')).toBeNull();
    expect(queryByTestId('offline-indicator')).toBeNull();
  });

  it('renders error banner when error message exists', () => {
    render(<SyncStatusContainer {...defaultProps} syncErrorMessage="Cloud sync failed" />);

    expect(screen.getByTestId('sync-error-banner')).toBeTruthy();
  });

  it('renders sync indicator when syncing', () => {
    render(<SyncStatusContainer {...defaultProps} syncState="syncing" />);

    expect(screen.getByTestId('sync-indicator')).toBeTruthy();
  });

  it('renders offline indicator when offline with pending changes', () => {
    render(<SyncStatusContainer {...defaultProps} isOffline={true} pendingChangeCount={3} />);

    expect(screen.getByTestId('offline-indicator')).toBeTruthy();
  });

  it('renders success indicator when success state', () => {
    render(<SyncStatusContainer {...defaultProps} syncState="success" />);

    expect(screen.getByTestId('sync-indicator')).toBeTruthy();
  });

  it('shows only error when both error and syncing', () => {
    render(<SyncStatusContainer {...defaultProps} syncState="syncing" syncErrorMessage="Error" />);

    expect(screen.getByTestId('sync-error-banner')).toBeTruthy();
    expect(screen.queryByTestId('sync-indicator')).toBeNull();
  });
});
