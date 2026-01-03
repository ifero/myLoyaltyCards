import React, { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { LIGHT_THEME, DARK_THEME, type Theme } from './colors';

/**
 * Theme context type
 */
interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  colorScheme: 'light' | 'dark';
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

  const value = useMemo<ThemeContextType>(() => {
    const isDark = systemColorScheme === 'dark';
    return {
      theme: isDark ? DARK_THEME : LIGHT_THEME,
      isDark,
      colorScheme: isDark ? 'dark' : 'light',
    };
  }, [systemColorScheme]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

/**
 * useTheme hook
 *
 * Returns the current theme context including:
 * - theme: The current theme object (LIGHT_THEME or DARK_THEME)
 * - isDark: Boolean indicating if dark mode is active
 * - colorScheme: 'light' or 'dark' string
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
