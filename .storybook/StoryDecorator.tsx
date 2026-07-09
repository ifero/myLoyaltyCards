import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { View } from 'react-native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';

import { setThemePreference } from '@/core/settings/settings-repository';

import i18n from '@/shared/i18n';
import { ThemeProvider, useTheme } from '@/shared/theme';

type StoryTheme = 'light' | 'dark';

/**
 * Deterministic safe-area metrics so `useSafeAreaInsets()` resolves on web (and
 * in the jest smoke test) even though there is no native window to measure —
 * lets `BottomSheet`/edge controls lay out correctly. Values approximate a
 * notched phone.
 */
const FALLBACK_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 }
};

const ThemedCanvas = ({ children }: { children: ReactNode }) => {
  const { theme } = useTheme();
  return (
    <View testID="story-canvas" style={{ flex: 1, padding: 16, backgroundColor: theme.background }}>
      {children}
    </View>
  );
};

type StoryDecoratorProps = {
  theme?: StoryTheme;
  children: ReactNode;
};

/**
 * The provider stack that wraps every story — and is reused by the story smoke
 * test — so the shared UI primitives render exactly as they do in the app: the
 * real `ThemeProvider` (driving BOTH the `useTheme()` context and the Unistyles
 * engine via `UnistylesRuntime.setTheme`), i18n, and safe-area insets (AC1).
 *
 * The requested scheme is applied by persisting the preference to the in-memory
 * kv-store mock and remounting `ThemeProvider` via `key`, so both theming paths
 * flip together when the toolbar toggles.
 */
export const StoryDecorator = ({ theme = 'light', children }: StoryDecoratorProps) => {
  // Persist the requested scheme on EVERY render (idempotent), synchronously,
  // before the child `ThemeProvider` reads it. This lives in the render body on
  // purpose: `ThemeProvider` is keyed by `theme`, so a toolbar toggle re-renders
  // this decorator (same instance, new prop) and remounts `ThemeProvider`, whose
  // state initializer calls `getThemePreference()` again — the write must have
  // already happened. A `useState` lazy initializer or an effect would run only
  // on mount (not on the re-render a toggle triggers), leaving the remounted
  // ThemeProvider reading the STALE previous scheme. Preview/test infra only;
  // React Compiler is not enabled for this project (see babel.config.js).
  setThemePreference(theme);

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics ?? FALLBACK_METRICS}>
      <I18nextProvider i18n={i18n}>
        <ThemeProvider key={theme}>
          <ThemedCanvas>{children}</ThemedCanvas>
        </ThemeProvider>
      </I18nextProvider>
    </SafeAreaProvider>
  );
};
