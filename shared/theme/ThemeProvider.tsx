import React, { createContext, useContext, useLayoutEffect, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { UnistylesRuntime } from 'react-native-unistyles';

import {
  getThemePreference,
  setThemePreference as persistThemePreference,
  type ThemePreference
} from '@/core/settings/settings-repository';

import { LIGHT_THEME, DARK_THEME, type Theme } from './colors';
import { SPACING, LAYOUT, TOUCH_TARGET } from './spacing';
import { TYPOGRAPHY } from './typography';

/**
 * Theme context type
 */
interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  colorScheme: 'light' | 'dark';
  themePreference: ThemePreference;
  setThemePreference: (value: ThemePreference) => void;
  typography: typeof TYPOGRAPHY;
  spacing: typeof SPACING;
  layout: typeof LAYOUT;
  touchTarget: typeof TOUCH_TARGET;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * ThemeProvider props
 */
interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * ThemeProvider Component
 *
 * Provides theme context to the app that respects system preferences
 * for light/dark mode. Uses React Native's useColorScheme hook to
 * detect system theme preference.
 *
 * Story 1.2: Light/dark mode themes respect system preferences
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themePreference, setThemePreferenceState] = React.useState<ThemePreference>(() =>
    getThemePreference()
  );

  const setThemePreference = React.useCallback((value: ThemePreference) => {
    setThemePreferenceState(value);
    persistThemePreference(value);
  }, []);

  const resolvedScheme =
    themePreference === 'system'
      ? systemColorScheme === 'dark'
        ? 'dark'
        : 'light'
      : themePreference;
  const isDark = resolvedScheme === 'dark';

  // Drive the Unistyles engine theme from the resolved scheme. Adaptive themes
  // are OFF (see shared/theme/unistyles.ts), so the in-app ThemePickerSheet and
  // system preference both flow through here — preserving Story 13-10 behaviour.
  useLayoutEffect(() => {
    UnistylesRuntime.setTheme(resolvedScheme);
  }, [resolvedScheme]);

  const value = useMemo<ThemeContextType>(() => {
    return {
      theme: isDark ? DARK_THEME : LIGHT_THEME,
      isDark,
      colorScheme: resolvedScheme,
      themePreference,
      setThemePreference,
      typography: TYPOGRAPHY,
      spacing: SPACING,
      layout: LAYOUT,
      touchTarget: TOUCH_TARGET
    };
  }, [isDark, resolvedScheme, setThemePreference, themePreference]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

/**
 * useTheme hook
 *
 * Returns the current theme context including:
 * - theme: The current theme object (LIGHT_THEME or DARK_THEME)
 * - isDark: Boolean indicating if dark mode is active
 * - colorScheme: 'light' or 'dark' string
 *
 * Theme consumption is intentionally HYBRID after the Unistyles migration
 * (Story 16.1), and both paths are fed by the SAME `shared/theme` tokens and
 * the SAME resolved scheme (this provider calls `UnistylesRuntime.setTheme`):
 * - `useTheme().theme.<token>` — the React context object (this hook). Used by
 *   the app's inline dynamic styles; the flat token shape (`theme.textPrimary`).
 * - `useUnistyles().theme.colors.<token>` — the Unistyles engine theme, used
 *   inside `StyleSheet.create((theme) => …)`; nested shape (`theme.colors.*`).
 * They never diverge because both derive from `shared/theme`. Prefer the
 * Unistyles path for new styling; this context remains the canonical selector
 * for theme preference (`useThemePreference`) and `isDark`/`colorScheme`.
 *
 * @throws Error if used outside of ThemeProvider
 */
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
