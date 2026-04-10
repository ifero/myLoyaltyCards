import { render, screen } from '@testing-library/react-native';

const mockUseNetworkStatus = jest.fn();

jest.mock('@/shared/hooks/useNetworkStatus', () => ({
  useNetworkStatus: (...args: unknown[]) => mockUseNetworkStatus(...args)
}));

jest.mock('@/shared/theme', () => ({
  useTheme: () => ({
    theme: { primary: '#1A73E8', surfaceElevated: '#2C2C2E' },
    isDark: false
  })
}));

import { OfflineIndicator } from './OfflineIndicator';

describe('OfflineIndicator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when offline with pending changes > 0', () => {
    mockUseNetworkStatus.mockReturnValue({ isConnected: false, isInternetReachable: false });

    render(<OfflineIndicator pendingChangeCount={3} />);

    expect(screen.getByTestId('offline-indicator')).toBeTruthy();
    expect(screen.getByText('Offline \u2022 3 changes will sync when online')).toBeTruthy();
  });

  it('renders singular message when 1 pending change', () => {
    mockUseNetworkStatus.mockReturnValue({ isConnected: false, isInternetReachable: false });

    render(<OfflineIndicator pendingChangeCount={1} />);

    expect(screen.getByText('Offline \u2022 1 change will sync when online')).toBeTruthy();
  });

  it('renders when connected but internet not reachable with pending changes', () => {
    mockUseNetworkStatus.mockReturnValue({ isConnected: true, isInternetReachable: false });

    render(<OfflineIndicator pendingChangeCount={2} />);

    expect(screen.getByTestId('offline-indicator')).toBeTruthy();
  });

  it('does NOT render when offline but pendingChangeCount is 0', () => {
    mockUseNetworkStatus.mockReturnValue({ isConnected: false, isInternetReachable: false });

    render(<OfflineIndicator pendingChangeCount={0} />);

    expect(screen.queryByTestId('offline-indicator')).toBeNull();
  });

  it('does not render when network is online', () => {
    mockUseNetworkStatus.mockReturnValue({ isConnected: true, isInternetReachable: true });

    render(<OfflineIndicator pendingChangeCount={5} />);

    expect(screen.queryByTestId('offline-indicator')).toBeNull();
  });

  it('has status accessibility role (not alert)', () => {
    mockUseNetworkStatus.mockReturnValue({ isConnected: false, isInternetReachable: false });

    render(<OfflineIndicator pendingChangeCount={3} />);

    expect(screen.getByTestId('offline-indicator').props.accessibilityRole).toBe('status');
  });

  it('displays cloud-off icon', () => {
    mockUseNetworkStatus.mockReturnValue({ isConnected: false, isInternetReachable: false });

    render(<OfflineIndicator pendingChangeCount={1} />);

    expect(screen.getByTestId('offline-icon')).toBeTruthy();
  });

  it('includes pending count in accessibility label', () => {
    mockUseNetworkStatus.mockReturnValue({ isConnected: false, isInternetReachable: false });

    render(<OfflineIndicator pendingChangeCount={3} />);

    expect(screen.getByTestId('offline-indicator').props.accessibilityLabel).toContain('3 changes');
  });
});
