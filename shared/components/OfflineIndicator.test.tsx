import { render, screen } from '@testing-library/react-native';

let mockIsDark = false;

jest.mock('@/shared/theme', () => ({
  useTheme: () => ({
    theme: mockIsDark
      ? { primary: '#4DA3FF', surfaceElevated: '#2C2C2E' }
      : { primary: '#1A73E8', surfaceElevated: '#2C2C2E' },
    isDark: mockIsDark
  })
}));

jest.mock('@/shared/theme/sync-tokens', () => ({
  SYNC_TOKENS: {
    offlineBg: { light: '#FFF3D6', dark: '#4A3A1A' },
    offlineText: { light: '#EF9500', dark: '#FFD60A' }
  }
}));

import { OfflineIndicator } from './OfflineIndicator';

describe('OfflineIndicator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when offline with pending changes > 0', () => {
    render(<OfflineIndicator isOffline pendingChangeCount={3} />);

    expect(screen.getByTestId('offline-indicator')).toBeTruthy();
    expect(screen.getByText('Offline \u2022 3 changes will sync when online')).toBeTruthy();
  });

  it('renders singular message when 1 pending change', () => {
    render(<OfflineIndicator isOffline pendingChangeCount={1} />);

    expect(screen.getByText('Offline \u2022 1 change will sync when online')).toBeTruthy();
  });

  it('does NOT render when offline but pendingChangeCount is 0', () => {
    render(<OfflineIndicator isOffline pendingChangeCount={0} />);

    expect(screen.queryByTestId('offline-indicator')).toBeNull();
  });

  it('does not render when isOffline is false', () => {
    render(<OfflineIndicator isOffline={false} pendingChangeCount={5} />);

    expect(screen.queryByTestId('offline-indicator')).toBeNull();
  });

  it('has summary accessibility role (not alert)', () => {
    render(<OfflineIndicator isOffline pendingChangeCount={3} />);

    expect(screen.getByTestId('offline-indicator').props.accessibilityRole).toBe('summary');
  });

  it('displays cloud-off icon', () => {
    render(<OfflineIndicator isOffline pendingChangeCount={1} />);

    expect(screen.getByTestId('offline-icon')).toBeTruthy();
  });

  it('includes pending count in accessibility label', () => {
    render(<OfflineIndicator isOffline pendingChangeCount={3} />);

    expect(screen.getByTestId('offline-indicator').props.accessibilityLabel).toContain('3 changes');
  });

  it('uses dark mode tokens when isDark is true', () => {
    mockIsDark = true;

    render(<OfflineIndicator isOffline pendingChangeCount={2} />);

    const container = screen.getByTestId('offline-indicator');
    expect(container.props.style.backgroundColor).toBe('#4A3A1A');

    mockIsDark = false;
  });
});
