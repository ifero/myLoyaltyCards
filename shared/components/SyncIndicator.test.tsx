import { render, screen } from '@testing-library/react-native';

import { SyncIndicator } from './SyncIndicator';

jest.mock('@/shared/theme', () => ({
  useTheme: () => ({
    theme: {
      primary: '#73A973',
      textSecondary: '#6B7280'
    }
  })
}));

describe('SyncIndicator', () => {
  it('renders nothing when not syncing', () => {
    const { queryByTestId } = render(<SyncIndicator isSyncing={false} />);

    expect(queryByTestId('sync-indicator')).toBeNull();
  });

  it('renders spinner and message when syncing', () => {
    render(<SyncIndicator isSyncing />);

    expect(screen.getByTestId('sync-indicator')).toBeTruthy();
    expect(screen.getByTestId('sync-indicator-spinner')).toBeTruthy();
    expect(screen.getByText('Syncing cards to cloud…')).toBeTruthy();
  });
});
