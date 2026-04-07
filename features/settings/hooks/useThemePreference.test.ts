import { renderHook, act } from '@testing-library/react-native';

import { useThemePreference } from './useThemePreference';

const mockSetThemePreference = jest.fn();

jest.mock('@/shared/theme', () => ({
  useTheme: () => ({
    themePreference: 'system',
    setThemePreference: mockSetThemePreference
  })
}));

describe('useThemePreference', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens and closes picker state', () => {
    const { result } = renderHook(() => useThemePreference());

    expect(result.current.isThemePickerOpen).toBe(false);

    act(() => {
      result.current.openThemePicker();
    });

    expect(result.current.isThemePickerOpen).toBe(true);

    act(() => {
      result.current.closeThemePicker();
    });

    expect(result.current.isThemePickerOpen).toBe(false);
  });

  it('selectTheme persists preference and closes picker', () => {
    const { result } = renderHook(() => useThemePreference());

    act(() => {
      result.current.openThemePicker();
      result.current.selectTheme('dark');
    });

    expect(mockSetThemePreference).toHaveBeenCalledWith('dark');
    expect(result.current.isThemePickerOpen).toBe(false);
  });
});
