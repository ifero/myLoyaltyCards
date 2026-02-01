/**
 * useBrightness Hook Tests
 * Story 2.5: Display Barcode (Barcode Flash)
 */

import { renderHook, act } from '@testing-library/react-native';

import { useBrightness } from './useBrightness';

// Mock expo-brightness
const mockGetBrightnessAsync = jest.fn();
const mockSetBrightnessAsync = jest.fn();

jest.mock('expo-brightness', () => ({
  getBrightnessAsync: () => mockGetBrightnessAsync(),
  setBrightnessAsync: (value: number) => mockSetBrightnessAsync(value)
}));

describe('useBrightness', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetBrightnessAsync.mockResolvedValue(0.5);
    mockSetBrightnessAsync.mockResolvedValue(undefined);
  });

  it('should return maximize and restore functions', () => {
    const { result } = renderHook(() => useBrightness());

    expect(result.current.maximize).toBeDefined();
    expect(result.current.restore).toBeDefined();
    expect(typeof result.current.maximize).toBe('function');
    expect(typeof result.current.restore).toBe('function');
  });

  it('should maximize brightness to 1.0', async () => {
    const { result } = renderHook(() => useBrightness());

    await act(async () => {
      await result.current.maximize();
    });

    expect(mockGetBrightnessAsync).toHaveBeenCalledTimes(1);
    expect(mockSetBrightnessAsync).toHaveBeenCalledWith(1.0);
  });

  it('should store original brightness before maximizing', async () => {
    mockGetBrightnessAsync.mockResolvedValue(0.7);
    const { result } = renderHook(() => useBrightness());

    await act(async () => {
      await result.current.maximize();
    });

    expect(mockGetBrightnessAsync).toHaveBeenCalled();
  });

  it('should restore original brightness', async () => {
    mockGetBrightnessAsync.mockResolvedValue(0.6);
    const { result } = renderHook(() => useBrightness());

    // First maximize to store original
    await act(async () => {
      await result.current.maximize();
    });

    // Then restore
    await act(async () => {
      await result.current.restore();
    });

    // Should have been called with 1.0 for maximize and 0.6 for restore
    expect(mockSetBrightnessAsync).toHaveBeenCalledWith(1.0);
    expect(mockSetBrightnessAsync).toHaveBeenCalledWith(0.6);
  });

  it('should not restore if maximize was never called', async () => {
    const { result } = renderHook(() => useBrightness());

    await act(async () => {
      await result.current.restore();
    });

    // setBrightnessAsync should not be called since we never maximized
    expect(mockSetBrightnessAsync).not.toHaveBeenCalled();
  });

  it('should only store original brightness once on multiple maximize calls', async () => {
    mockGetBrightnessAsync.mockResolvedValue(0.4);
    const { result } = renderHook(() => useBrightness());

    await act(async () => {
      await result.current.maximize();
      await result.current.maximize();
      await result.current.maximize();
    });

    // Should only read brightness once
    expect(mockGetBrightnessAsync).toHaveBeenCalledTimes(1);
    // Should set brightness 3 times
    expect(mockSetBrightnessAsync).toHaveBeenCalledTimes(3);
  });

  it('should handle errors gracefully during maximize', async () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    mockGetBrightnessAsync.mockRejectedValue(new Error('Brightness not available'));

    const { result } = renderHook(() => useBrightness());

    // Should not throw
    await act(async () => {
      await result.current.maximize();
    });

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should handle errors gracefully during restore', async () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    mockGetBrightnessAsync.mockResolvedValue(0.5);
    mockSetBrightnessAsync
      .mockResolvedValueOnce(undefined) // maximize succeeds
      .mockRejectedValueOnce(new Error('Brightness not available')); // restore fails

    const { result } = renderHook(() => useBrightness());

    await act(async () => {
      await result.current.maximize();
    });

    // Should not throw
    await act(async () => {
      await result.current.restore();
    });

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should clear stored brightness after restore', async () => {
    mockGetBrightnessAsync.mockResolvedValue(0.5);
    const { result } = renderHook(() => useBrightness());

    // Maximize and restore
    await act(async () => {
      await result.current.maximize();
      await result.current.restore();
    });

    // Calling restore again should not call setBrightnessAsync
    jest.clearAllMocks();
    await act(async () => {
      await result.current.restore();
    });

    expect(mockSetBrightnessAsync).not.toHaveBeenCalled();
  });
});
