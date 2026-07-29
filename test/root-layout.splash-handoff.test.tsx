/**
 * RootLayout native-splash handoff (integration) — Story 16.17, AD-16-17-01.
 *
 * The launch surface is only an improvement if it cannot make boot WORSE. Holding
 * the native splash introduces exactly one new failure mode: if `hideAsync()`
 * never runs, the user is left staring at a permanent white or black screen — a
 * hang, not a flash, and a regression of the "boot never hangs" guarantee Stories
 * 16.10 and 16.12 established. This suite pins the three things that prevent it:
 *
 *  1. The handoff happens on FIRST PAINT (`onLayout`), not on `isReady` — the
 *     native layer cannot animate, so the wait has to move to a surface that can.
 *  2. A missing `onLayout` (it never fires for a zero-size layout) still hides the
 *     splash, via the `SPLASH_HIDE_FALLBACK_MS` deadline.
 *  3. A rejected `hideAsync()` or `preventAutoHideAsync()` is swallowed and boot
 *     completes regardless.
 *
 * ⚠️ `preventAutoHideAsync` is mocked to REJECT for this entire suite, on purpose.
 * It is called at module scope, so the only way to exercise its rejection path is
 * to have it already rejected by the time `app/_layout` is imported. Every test
 * below therefore runs in that hostile condition — if the `.catch()` on it were
 * ever dropped, this file is where it shows up.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { EXIT_FADE_MS, SPLASH_HIDE_FALLBACK_MS } from '@/shared/components/launch/constants';
import { changeAppLanguage } from '@/shared/i18n';
// Imported from `@/shared/theme/colors`, NOT the `@/shared/theme` barrel this file
// replaces wholesale below — different module ids, so the mock does not intercept it.
import { LIGHT_THEME } from '@/shared/theme/colors';

import RootLayout from '@/app/_layout';

// Snapshotted immediately after the import above, i.e. before `beforeEach` can
// clear the mocks. `preventAutoHideAsync` and `setOptions` are module-scope calls
// (Expo's docs require it — inside a component they can run after the splash has
// already auto-hidden), so their only observable record is made at import time.
const splashScreen = jest.requireMock('expo-splash-screen') as {
  preventAutoHideAsync: jest.Mock;
  hideAsync: jest.Mock;
  setOptions: jest.Mock;
};
const moduleScopeCalls = {
  preventAutoHideAsync: splashScreen.preventAutoHideAsync.mock.calls.length,
  setOptions: [...splashScreen.setOptions.mock.calls]
};

const mockRouter = { replace: jest.fn(), back: jest.fn(), push: jest.fn() };
const mockGetAllCards = jest.fn().mockResolvedValue([]);
const mockCheckForUpdateAsync = jest.fn();
const mockFetchUpdateAsync = jest.fn();
const mockReloadAsync = jest.fn();
const mockOnAuthStateChange = jest.fn();
const mockHasPersistedSession = jest.fn();
const mockIsFirstLaunch = jest.fn();
const mockLoggerError = jest.fn();
const mockUseReducedMotion = jest.fn<boolean, []>(() => false);
const mockFadeInDuration = jest.fn((duration: number) => ({ entering: 'FadeIn', duration }));

/**
 * Reanimated is overridden locally so `useReducedMotion` is controllable — the
 * global mock in `jest.setup.js` hardcodes it to `false`, which leaves the
 * reduced-motion arm of the exit cross-fade unobservable.
 *
 * Full replacement, so every member BOTH `app/_layout.tsx` and the
 * `AppLaunchScreen` it renders touch has to be listed: dropping one fails in a
 * way that looks unrelated to animation.
 */
jest.mock('react-native-reanimated', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mockReact = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mockRN = require('react-native');

  const AnimatedView = mockReact.forwardRef(
    (props: Record<string, unknown>, ref: React.Ref<unknown>) =>
      mockReact.createElement(mockRN.View, { ...props, ref })
  );
  AnimatedView.displayName = 'Animated.View';

  return {
    __esModule: true,
    default: { View: AnimatedView },
    FadeIn: { duration: (duration: number) => mockFadeInDuration(duration) },
    useReducedMotion: () => mockUseReducedMotion(),
    // Used by AppLaunchScreen, which renders inside every test here.
    useSharedValue: (initial: unknown) => ({ value: initial }),
    useAnimatedStyle: () => ({}),
    withTiming: (value: unknown) => value,
    withRepeat: (value: unknown) => value,
    cancelAnimation: jest.fn(),
    Easing: { inOut: (easing: unknown) => easing, ease: 'ease', linear: (v: unknown) => v }
  };
});

jest.mock('expo-splash-screen', () => ({
  // Rejects deliberately — see the file header.
  preventAutoHideAsync: jest.fn(() => Promise.reject(new Error('splash lock unavailable'))),
  hideAsync: jest.fn(() => Promise.resolve()),
  setOptions: jest.fn()
}));

jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));

jest.mock('expo-updates', () => ({
  isEnabled: true,
  checkForUpdateAsync: (...args: unknown[]) => mockCheckForUpdateAsync(...args),
  fetchUpdateAsync: (...args: unknown[]) => mockFetchUpdateAsync(...args),
  reloadAsync: (...args: unknown[]) => mockReloadAsync(...args)
}));

jest.mock('expo-router', () => {
  const Stack = ({ children }: { children: React.ReactNode }) => <>{children}</>;
  (Stack as { Screen?: () => null }).Screen = () => null;
  return { Stack, useRouter: () => mockRouter };
});

jest.mock('@/core/database', () => ({
  initializeDatabase: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('@/core/database/card-repository', () => ({
  getAllCards: (...args: unknown[]) => mockGetAllCards(...args)
}));

jest.mock('@/core/watch-connectivity', () => ({
  pushCardsToWatch: jest.fn().mockResolvedValue(undefined),
  subscribeToWatchMessages: jest.fn(() => jest.fn()),
  subscribeToWatchUserInfo: jest.fn(() => jest.fn())
}));

jest.mock('@/core/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    notify: jest.fn(),
    error: (...args: unknown[]) => mockLoggerError(...args)
  }
}));

jest.mock('@/core/auth/guest-session-repository', () => ({
  getOrCreateGuestSessionId: jest.fn().mockResolvedValue('guest-1')
}));

jest.mock('@/features/settings', () => ({
  isFirstLaunch: () => mockIsFirstLaunch(),
  completeFirstLaunch: jest.fn()
}));

jest.mock('@/shared/supabase/client', () => ({
  getSupabaseClient: jest.fn(() => ({
    auth: {
      onAuthStateChange: (callback: (event: string, session: unknown) => void) =>
        mockOnAuthStateChange(callback)
    }
  })),
  hasPersistedSession: () => mockHasPersistedSession()
}));

jest.mock('@/shared/theme', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useTheme: () => ({
    isDark: false,
    theme: { primary: '#1A73E8', surface: '#FFFFFF', textPrimary: '#1F1F24', background: '#FFFFFF' }
  })
}));

/** Fire INITIAL_SESSION synchronously so auth readiness never gates the test. */
const emitInitialSession = (session: unknown) => {
  mockOnAuthStateChange.mockImplementation(
    (callback: (event: string, session: unknown) => void) => {
      callback('INITIAL_SESSION', session);
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    }
  );
};

/**
 * Settle the mount-time async work (the SecureStore session probe in
 * `useBootAuthGate` resolves on a microtask) so state updates land inside `act`.
 * Advances no meaningful time, so a gated boot stays gated.
 */
const flushBootEffects = async () => {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(0);
  });
};

/** Simulate the launch surface actually painting. */
const paintLaunchSurface = () => {
  fireEvent(screen.getByTestId('boot-loading'), 'layout', {
    nativeEvent: { layout: { width: 390, height: 844, x: 0, y: 0 } }
  });
};

describe('RootLayout native-splash handoff (Story 16.17)', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await act(async () => {
      await changeAppLanguage('en');
    });
    jest.useFakeTimers();
    mockCheckForUpdateAsync.mockResolvedValue({ isAvailable: false });
    mockFetchUpdateAsync.mockResolvedValue(undefined);
    mockReloadAsync.mockResolvedValue(undefined);
    mockHasPersistedSession.mockResolvedValue(false);
    mockIsFirstLaunch.mockReturnValue(false);
    splashScreen.hideAsync.mockResolvedValue(undefined);
    mockUseReducedMotion.mockReturnValue(false);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('module-scope setup (AC5)', () => {
    it('claims the native splash before any component can render', () => {
      // Expo's docs are explicit that this must NOT live inside a component or
      // hook, where it can run after the splash has already auto-hidden.
      expect(moduleScopeCalls.preventAutoHideAsync).toBe(1);
    });

    it('configures the native fade to match the JS cross-fade', () => {
      expect(moduleScopeCalls.setOptions).toEqual([[{ duration: EXIT_FADE_MS, fade: true }]]);
    });
  });

  describe('handoff on first paint (AC5)', () => {
    it('hides the native splash as soon as the launch surface paints', async () => {
      mockCheckForUpdateAsync.mockReturnValue(new Promise(() => {})); // boot stays gated
      emitInitialSession(null);

      render(<RootLayout />);
      await flushBootEffects();
      expect(splashScreen.hideAsync).not.toHaveBeenCalled();

      paintLaunchSurface();

      expect(splashScreen.hideAsync).toHaveBeenCalledTimes(1);
    });

    it('does not wait for isReady — the surface it hands off to is still gating', async () => {
      mockCheckForUpdateAsync.mockReturnValue(new Promise(() => {})); // never settles
      emitInitialSession(null);

      render(<RootLayout />);
      await flushBootEffects();
      paintLaunchSurface();

      // Still on the launch surface, yet the native layer is already gone. This
      // is the whole point: the wait moves onto a surface that CAN animate, and
      // the transfer is invisible because the two are pixel-identical.
      expect(screen.getByTestId('boot-loading')).toBeTruthy();
      expect(splashScreen.hideAsync).toHaveBeenCalledTimes(1);
    });

    it('hides once, not twice, when the fallback deadline also passes', async () => {
      mockCheckForUpdateAsync.mockReturnValue(new Promise(() => {}));
      emitInitialSession(null);

      render(<RootLayout />);
      paintLaunchSurface();
      await act(async () => {
        await jest.advanceTimersByTimeAsync(SPLASH_HIDE_FALLBACK_MS * 2);
      });

      expect(splashScreen.hideAsync).toHaveBeenCalledTimes(1);
    });
  });

  describe('cannot strand the splash (AC5)', () => {
    it('hides it anyway when onLayout never fires', async () => {
      mockCheckForUpdateAsync.mockReturnValue(new Promise(() => {})); // boot stays gated
      emitInitialSession(null);

      render(<RootLayout />);

      // A zero-size layout never fires onLayout. Without the deadline below, the
      // native splash would stay up forever.
      await act(async () => {
        await jest.advanceTimersByTimeAsync(SPLASH_HIDE_FALLBACK_MS - 1);
      });
      expect(splashScreen.hideAsync).not.toHaveBeenCalled();

      await act(async () => {
        await jest.advanceTimersByTimeAsync(1);
      });
      expect(splashScreen.hideAsync).toHaveBeenCalledTimes(1);
    });

    it('completes boot even when hideAsync rejects', async () => {
      splashScreen.hideAsync.mockRejectedValue(new Error('native splash already gone'));
      emitInitialSession(null);

      render(<RootLayout />);
      paintLaunchSurface();
      await act(async () => {
        await jest.advanceTimersByTimeAsync(100);
      });

      // The rejection is swallowed: the gate still flipped, the post-boot work
      // still ran, and nothing reached the fatal `logger.error` channel that
      // renders the boot-error screen.
      expect(screen.queryByTestId('boot-loading')).toBeNull();
      expect(mockGetAllCards).toHaveBeenCalled();
      expect(mockLoggerError).not.toHaveBeenCalled();
    });

    it('completes boot even though preventAutoHideAsync rejected at module scope', async () => {
      emitInitialSession(null);

      render(<RootLayout />);
      await act(async () => {
        await jest.advanceTimersByTimeAsync(100);
      });

      expect(screen.queryByTestId('boot-loading')).toBeNull();
      expect(mockGetAllCards).toHaveBeenCalled();
      expect(mockLoggerError).not.toHaveBeenCalled();
    });

    it('clears the fallback timer on unmount so it cannot fire into a dead tree', async () => {
      mockCheckForUpdateAsync.mockReturnValue(new Promise(() => {}));
      emitInitialSession(null);

      const view = render(<RootLayout />);
      view.unmount();
      await act(async () => {
        await jest.advanceTimersByTimeAsync(SPLASH_HIDE_FALLBACK_MS * 2);
      });

      expect(splashScreen.hideAsync).not.toHaveBeenCalled();
    });
  });

  describe('exit cross-fade into content (AC7, AC9)', () => {
    it('cross-fades into content once boot completes', async () => {
      emitInitialSession(null);

      render(<RootLayout />);
      await act(async () => {
        await jest.advanceTimersByTimeAsync(100);
      });

      // The launch surface is gone and content is mounted behind a fade of the
      // same duration as the native handoff, so the two halves of the launch feel
      // like one movement rather than two.
      expect(screen.queryByTestId('boot-loading')).toBeNull();
      expect(mockIsFirstLaunch).toHaveBeenCalled();
      expect(mockFadeInDuration).toHaveBeenCalledWith(EXIT_FADE_MS);
    });

    it('fades in over the theme background, not through to the native window', async () => {
      emitInitialSession(null);

      render(<RootLayout />);
      await act(async () => {
        await jest.advanceTimersByTimeAsync(100);
      });

      // A partially-transparent view composites whatever is behind it, and by the
      // time this fade runs the launch surface has unmounted — so without an
      // explicit background the cross-fade would show the raw native window
      // through it. That would be a THIRD background mid-launch: the same defect
      // this story removes from the entrance, reappearing in the exit.
      expect(screen.getByTestId('app-content-root')).toHaveStyle({
        backgroundColor: LIGHT_THEME.background
      });
    });

    it('swaps instantly instead of cross-fading under reduced motion (AC9)', async () => {
      mockUseReducedMotion.mockReturnValue(true);
      emitInitialSession(null);

      render(<RootLayout />);
      await act(async () => {
        await jest.advanceTimersByTimeAsync(100);
      });

      // Content still arrives — it simply arrives without a transition. The
      // middle assertion is what makes that claim real: `isFirstLaunch` is only
      // called from `RootLayoutContent`'s mount effect, so it is a positive proxy
      // for "content actually rendered". Without it, a regression that skipped
      // the fade by rendering `null` on the reduced-motion path would satisfy
      // both of the other two assertions and look like a pass.
      expect(screen.queryByTestId('boot-loading')).toBeNull();
      expect(mockIsFirstLaunch).toHaveBeenCalled();
      expect(mockFadeInDuration).not.toHaveBeenCalled();
    });
  });
});
