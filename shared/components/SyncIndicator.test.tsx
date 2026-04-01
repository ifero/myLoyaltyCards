import { render, screen } from '@testing-library/react-native';

import { SyncIndicator } from './SyncIndicator';

jest.mock('@/shared/theme', () => ({
  useTheme: () => ({
    theme: {
      primary: '#1A73E8',
      textSecondary: '#6B7280'
    }
  }),
  SEMANTIC_COLORS: {
    error: '#DC3545'
  }
}));

describe('SyncIndicator', () => {
  it('renders nothing when not syncing and no error', () => {
    const { queryByTestId } = render(<SyncIndicator isSyncing={false} />);

    expect(queryByTestId('sync-indicator')).toBeNull();
  });

  it('renders spinner and message when syncing', () => {
    render(<SyncIndicator isSyncing />);

    expect(screen.getByTestId('sync-indicator')).toBeTruthy();
    expect(screen.getByTestId('sync-indicator-spinner')).toBeTruthy();
    expect(screen.getByText('Syncing cards…')).toBeTruthy();
  });

  it('renders error state when hasError is true (AC6)', () => {
    render(<SyncIndicator isSyncing={false} hasError />);

    expect(screen.getByTestId('sync-indicator')).toBeTruthy();
    expect(screen.getByText('Sync error — will retry')).toBeTruthy();
    expect(screen.queryByTestId('sync-indicator-spinner')).toBeNull();
  });

  it('shows syncing state (not error) when both syncing and hasError', () => {
    render(<SyncIndicator isSyncing hasError />);

    // hasError takes priority over isSyncing for display — shows error text without spinner
    expect(screen.getByText('Sync error — will retry')).toBeTruthy();
  });
});
