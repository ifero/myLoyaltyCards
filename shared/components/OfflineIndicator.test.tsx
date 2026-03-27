import { render, screen } from '@testing-library/react-native';

const mockUseNetworkStatus = jest.fn();

jest.mock('@/shared/hooks/useNetworkStatus', () => ({
  useNetworkStatus: (...args: unknown[]) => mockUseNetworkStatus(...args)
}));

import { OfflineIndicator } from './OfflineIndicator';

describe('OfflineIndicator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when network is offline', () => {
    mockUseNetworkStatus.mockReturnValue({ isConnected: false, isInternetReachable: false });

    render(<OfflineIndicator />);

    expect(screen.getByTestId('offline-indicator')).toBeTruthy();
    expect(screen.getByText("You're offline. Changes saved locally.")).toBeTruthy();
  });

  it('renders when connected but internet not reachable', () => {
    mockUseNetworkStatus.mockReturnValue({ isConnected: true, isInternetReachable: false });

    render(<OfflineIndicator />);

    expect(screen.getByTestId('offline-indicator')).toBeTruthy();
    expect(screen.getByText("You're offline. Changes saved locally.")).toBeTruthy();
  });

  it('does not render when network is online', () => {
    mockUseNetworkStatus.mockReturnValue({ isConnected: true, isInternetReachable: true });

    render(<OfflineIndicator />);

    expect(screen.queryByTestId('offline-indicator')).toBeNull();
  });
});
