import type { NetInfoState } from '@react-native-community/netinfo';
import { act, renderHook } from '@testing-library/react-native';

const mockFetch = jest.fn();
const mockAddEventListener = jest.fn();

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    fetch: (...args: unknown[]) => mockFetch(...args),
    addEventListener: (...args: unknown[]) => mockAddEventListener(...args)
  }
}));

import { useNetworkStatus } from './useNetworkStatus';

const makeState = (overrides: Partial<NetInfoState> = {}): NetInfoState =>
  ({
    type: 'wifi',
    isConnected: true,
    isInternetReachable: true,
    details: null,
    ...overrides
  }) as NetInfoState;

describe('useNetworkStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue(makeState());
  });

  it('loads initial connectivity state from NetInfo.fetch()', async () => {
    const unsubscribe = jest.fn();
    mockAddEventListener.mockReturnValue(unsubscribe);
    mockFetch.mockResolvedValue(makeState({ isConnected: false, isInternetReachable: false }));

    const { result } = renderHook(() => useNetworkStatus());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current).toEqual({ isConnected: false, isInternetReachable: false });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('updates state when NetInfo emits connectivity changes', async () => {
    const listeners: Array<(state: NetInfoState) => void> = [];
    mockFetch.mockResolvedValue(makeState({ isConnected: false, isInternetReachable: false }));
    mockAddEventListener.mockImplementation((listener: (state: NetInfoState) => void) => {
      listeners.push(listener);
      return jest.fn();
    });

    const { result } = renderHook(() => useNetworkStatus());

    await act(async () => {
      listeners.forEach((listener) =>
        listener(makeState({ isConnected: false, isInternetReachable: false }))
      );
    });

    expect(result.current).toEqual({ isConnected: false, isInternetReachable: false });
  });

  it('unsubscribes NetInfo listener on unmount', () => {
    const unsubscribe = jest.fn();
    mockAddEventListener.mockReturnValue(unsubscribe);

    const { unmount } = renderHook(() => useNetworkStatus());
    unmount();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
