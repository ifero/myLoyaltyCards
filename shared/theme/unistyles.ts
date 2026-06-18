/**
 * Unistyles theme registry
 * Story 16.1: Migrate Styling Engine — NativeWind → Unistyles
 *
 * react-native-unistyles is the styling engine. The canonical design tokens
 * still live in `shared/theme/{colors,typography,spacing,sync-tokens}` — the
 * Unistyles themes below are DERIVED from them (no duplication, AC2). Theme
 * selection is driven by `ThemeProvider`/`useThemePreference`, which calls
 * `UnistylesRuntime.setTheme()` (see ThemeProvider.tsx) — Unistyles adaptive
 * themes are intentionally OFF so the in-app ThemePickerSheet keeps control
 * (no regression to Story 13-10 behaviour).
 *
 * This module is a side-effect import: importing it runs `StyleSheet.configure`.
 * It is imported once at the app entrypoint (`app/_layout.tsx`) and in
 * `jest.setup.js` (after `react-native-unistyles/mocks`) so themed styles
 * resolve in tests too.
 */
import { Appearance } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { getThemePreference } from '@/core/settings/settings-repository';

import { LIGHT_THEME, DARK_THEME, CARD_COLORS, BARCODE_FLASH } from './colors';
import { SPACING, LAYOUT, TOUCH_TARGET } from './spacing';
import { SYNC_TOKENS } from './sync-tokens';
import { TYPOGRAPHY } from './typography';

/**
 * Sync tokens are authored as `{ light, dark }` pairs (with a couple of
 * scheme-independent strings). Flatten them per colour-scheme so migrated
 * components can read `theme.sync.errorBg` directly.
 */
type SyncScheme = 'light' | 'dark';
type FlatSyncTokens = {
  [K in keyof typeof SYNC_TOKENS]: (typeof SYNC_TOKENS)[K] extends { light: string; dark: string }
    ? string
    : (typeof SYNC_TOKENS)[K];
};

export const flattenSyncTokens = (scheme: SyncScheme): FlatSyncTokens => {
  const entries = Object.entries(SYNC_TOKENS).map(([key, value]) => {
    if (value !== null && typeof value === 'object' && 'light' in value && 'dark' in value) {
      return [key, value[scheme]];
    }
    return [key, value];
  });
  return Object.fromEntries(entries) as FlatSyncTokens;
};

/** Tokens shared across both schemes (spacing, typography, etc.). */
const sharedTokens = {
  spacing: SPACING,
  layout: LAYOUT,
  touchTarget: TOUCH_TARGET,
  typography: TYPOGRAPHY,
  cardColors: CARD_COLORS,
  barcodeFlash: BARCODE_FLASH
} as const;

export const lightTheme = {
  colors: LIGHT_THEME,
  sync: flattenSyncTokens('light'),
  ...sharedTokens
} as const;

export const darkTheme = {
  colors: DARK_THEME,
  sync: flattenSyncTokens('dark'),
  ...sharedTokens
} as const;

export const appThemes = {
  light: lightTheme,
  dark: darkTheme
} as const;

/**
 * Phone-only app — no responsive breakpoints are required (AC1). A single
 * base breakpoint is registered so Unistyles' registry is well-formed; the
 * `mq` API is intentionally unused.
 */
const breakpoints = {
  xs: 0
} as const;

type AppThemes = typeof appThemes;
type AppBreakpoints = typeof breakpoints;

declare module 'react-native-unistyles' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface UnistylesThemes extends AppThemes {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface UnistylesBreakpoints extends AppBreakpoints {}
}

/**
 * Resolve the theme to show on first paint from the persisted preference +
 * system appearance. `ThemeProvider` re-asserts the resolved theme in a layout
 * effect on mount, so this only governs the very first frame (mirrors the prior
 * NativeWind `setColorScheme`-in-layout-effect behaviour).
 */
export const resolveInitialTheme = (): keyof AppThemes => {
  const preference = getThemePreference();
  if (preference === 'system') {
    return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
  }
  return preference;
};

StyleSheet.configure({
  themes: appThemes,
  breakpoints,
  settings: {
    // Adaptive themes OFF — ThemeProvider/useThemePreference drives selection.
    adaptiveThemes: false,
    initialTheme: resolveInitialTheme
  }
});
