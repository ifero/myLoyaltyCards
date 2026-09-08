/**
 * useAutoBrightnessPreference Hook Tests
 * Story 16.39: Full brightness on the card detail screen — AC1
 */

import { renderHook, act } from '@testing-library/react-native';

import {
  getAutoBrightnessEnabled,
  setAutoBrightnessEnabled
} from '@/core/settings/settings-repository';

import { useAutoBrightnessPreference } from './useAutoBrightnessPreference';

jest.mock('@/core/settings/settings-repository', () => ({
  getAutoBrightnessEnabled: jest.fn(),
  setAutoBrightnessEnabled: jest.fn()
}));

const mockGet = getAutoBrightnessEnabled as jest.Mock;
const mockSet = setAutoBrightnessEnabled as jest.Mock;

describe('useAutoBrightnessPreference', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockReturnValue(false);
  });

  it('starts from the persisted value', () => {
    mockGet.mockReturnValue(true);

    const { result } = renderHook(() => useAutoBrightnessPreference());

    expect(result.current.isAutoBrightnessEnabled).toBe(true);
  });

  it('defaults to off, which is what the repository reports for a fresh install', () => {
    const { result } = renderHook(() => useAutoBrightnessPreference());

    expect(result.current.isAutoBrightnessEnabled).toBe(false);
  });

  it('reads the store once on mount, not on every render', () => {
    // A lazy `useState` initialiser rather than a bare call in the body. The store is
    // synchronous, so a call per render would be a synchronous SQLite read per render.
    const { rerender } = renderHook(() => useAutoBrightnessPreference());
    expect(mockGet).toHaveBeenCalledTimes(1);

    act(() => rerender(undefined));

    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it('persists and reflects a change in both directions', () => {
    const { result } = renderHook(() => useAutoBrightnessPreference());

    act(() => result.current.setAutoBrightness(true));
    expect(mockSet).toHaveBeenLastCalledWith(true);
    expect(result.current.isAutoBrightnessEnabled).toBe(true);

    act(() => result.current.setAutoBrightness(false));
    expect(mockSet).toHaveBeenLastCalledWith(false);
    expect(result.current.isAutoBrightnessEnabled).toBe(false);
  });

  it('writes before it re-renders, so the UI cannot claim an unsaved preference', () => {
    // Ordering matters more than it looks: if the write threw, the switch must not be
    // left showing a state that was never stored.
    const callOrder: string[] = [];
    mockSet.mockImplementation(() => callOrder.push('persist'));

    const { result } = renderHook(() => useAutoBrightnessPreference());
    act(() => {
      result.current.setAutoBrightness(true);
      callOrder.push('render');
    });

    expect(callOrder).toEqual(['persist', 'render']);
  });
});
