/**
 * AppLaunchScreen — the launch surface (Story 16.17).
 *
 * ⚠️ Reanimated is mocked LOCALLY here, replacing `jest.setup.js`'s global mock
 * outright rather than spreading over it. That is deliberate and the trade is
 * explicit: the global mock hardcodes `useReducedMotion: () => false` and exposes
 * `withRepeat`/`withTiming` as plain functions, so neither AC9 (reduced motion)
 * nor AC7 (nothing moves before `BREATH_DELAY_MS`) is observable through it.
 *
 * Because this is a full replacement, EVERY member the component touches is
 * listed below — the trap the story flagged is copying one of the repo's three
 * existing local Reanimated overrides wholesale and silently losing
 * `useSharedValue`/`cancelAnimation`, which fails in a way that looks unrelated.
 *
 * One upgrade over the global mock: `useAnimatedStyle` here actually INVOKES the
 * worklet instead of returning `{}`, so the composed opacity is assertable. The
 * animation *drivers* are still asserted as calls, never as computed values —
 * there is no real Reanimated clock in this environment.
 */
import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { DARK_THEME, LIGHT_THEME } from '@/shared/theme/colors';

import { AppLaunchScreen } from './AppLaunchScreen';
import {
  BREATH_DELAY_MS,
  BREATH_DURATION_MS,
  BREATH_FADE_IN_MS,
  BREATH_MIN_OPACITY,
  LAUNCH_FIELD_COLOR,
  SPLASH_LOGO_WIDTH
} from './constants';

// Mocked only so the component's NON-use of it is assertable — see the
// 'never reads the system colour scheme' test. Nothing in the component imports it.
const mockUseColorScheme = jest.fn<'light' | 'dark' | null, []>(() => 'light');
const mockUseReducedMotion = jest.fn<boolean, []>(() => false);
const mockWithTiming = jest.fn((value: unknown) => value);
const mockWithRepeat = jest.fn((value: unknown) => value);
const mockCancelAnimation = jest.fn();

// Recorded rather than stubbed to `() => null` like the root-layout suites do:
// the point of rendering a StatusBar here is the STYLE, so it has to be
// observable. The launch field is near-black ink and the surface returns EARLY
// from `app/_layout.tsx`, above the app's own <StatusBar> — without an explicit
// `light` the OS default paints dark glyphs at 1.19:1 on every light-mode cold
// start.
jest.mock('expo-status-bar', () => {
  const { View } = jest.requireActual('react-native');
  return {
    StatusBar: ({ style }: { style?: string }) => (
      <View testID="launch-status-bar" accessibilityLabel={style} />
    )
  };
});

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: () => mockUseColorScheme()
}));

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
    useSharedValue: (initial: unknown) => ({ value: initial }),
    // Runs the worklet rather than returning `{}` — see the file header.
    useAnimatedStyle: (worklet: () => unknown) => worklet(),
    withTiming: (...args: unknown[]) => mockWithTiming(...(args as [unknown])),
    withRepeat: (...args: unknown[]) => mockWithRepeat(...(args as [unknown])),
    cancelAnimation: (...args: unknown[]) => mockCancelAnimation(...args),
    useReducedMotion: () => mockUseReducedMotion(),
    Easing: { inOut: (easing: unknown) => easing, ease: 'ease', linear: (v: unknown) => v }
  };
});

/**
 * The mark is deliberately hidden from assistive technology, and RNTL honours
 * that: with `includeHiddenElements` at its v13 default of `false`, an
 * `accessibilityElementsHidden` subtree is not queryable at all. So every query
 * that reaches inside the mark must opt back in — and the fact that it has to is
 * itself the proof that the a11y hiding is real rather than merely declared (see
 * the dedicated test below).
 */
const HIDDEN = { includeHiddenElements: true } as const;

beforeEach(() => {
  jest.clearAllMocks();
  mockUseColorScheme.mockReturnValue('light');
  mockUseReducedMotion.mockReturnValue(false);
  mockWithTiming.mockImplementation((value: unknown) => value);
  mockWithRepeat.mockImplementation((value: unknown) => value);
});

describe('AppLaunchScreen', () => {
  describe('rendering (AC3, AC4, AC6)', () => {
    it('paints a light status bar, because the field is ink in both schemes', () => {
      render(<AppLaunchScreen />);

      // Not theme-derived, deliberately: this surface is scheme-independent by
      // design (see LAUNCH_FIELD_COLOR), so the glyphs over it must be too.
      expect(screen.getByTestId('launch-status-bar')).toHaveProp('accessibilityLabel', 'light');
    });

    it('renders the Cardì mark square at SPLASH_LOGO_WIDTH on both axes', () => {
      render(<AppLaunchScreen />);

      // Both axes, not just width: the mark's viewBox is square, and a
      // flex-driven height would break the pixel-identity that conceals the
      // native→JS handoff on Android (where there is no fade).
      const logo = screen.getByTestId('app-launch-mark-logo', HIDDEN);
      expect(logo).toHaveProp('width', SPLASH_LOGO_WIDTH);
      expect(logo).toHaveProp('height', SPLASH_LOGO_WIDTH);
    });

    it('paints the brand field', () => {
      render(<AppLaunchScreen testID="boot-loading" />);

      expect(screen.getByTestId('boot-loading')).toHaveStyle({
        backgroundColor: LAUNCH_FIELD_COLOR
      });
    });

    it('uses a field that is neither of the theme backgrounds', () => {
      // The regression guard for the defect that made this design necessary. A
      // theme-aware field cannot match the NATIVE splash, whose background is baked
      // at build time from `userInterfaceStyle: "automatic"` and so cannot read the
      // user's runtime preference. On device that produced ~1.75 s of white
      // followed by black content on every cold start. If this ever equals a theme
      // background again, that inversion is back.
      expect(LAUNCH_FIELD_COLOR).not.toBe(LIGHT_THEME.background);
      expect(LAUNCH_FIELD_COLOR).not.toBe(DARK_THEME.background);
    });

    it('never reads the system colour scheme, and paints the same field either way', () => {
      // Asserts the ABSENCE of a dependency, which needs the dependency to be
      // observable: `useColorScheme` is mocked, driven to BOTH values, and then
      // asserted never to have been called at all. An earlier version of this test
      // rendered twice under identical conditions and asserted one constant colour —
      // trivially true for any pure component, and a code review rightly called it
      // vacuous.
      //
      // This is the retired AD-16-17-05 mechanism. A theme-aware field cannot match
      // the native splash, whose background is baked at build time from
      // `userInterfaceStyle: "automatic"`; on device that produced ~1.75 s of white
      // followed by black content on every cold start.
      mockUseColorScheme.mockReturnValue('light');
      const light = render(<AppLaunchScreen testID="boot-loading" />);
      expect(screen.getByTestId('boot-loading')).toHaveStyle({
        backgroundColor: LAUNCH_FIELD_COLOR
      });
      light.unmount();

      mockUseColorScheme.mockReturnValue('dark');
      render(<AppLaunchScreen testID="boot-loading" />);
      expect(screen.getByTestId('boot-loading')).toHaveStyle({
        backgroundColor: LAUNCH_FIELD_COLOR
      });

      expect(mockUseColorScheme).not.toHaveBeenCalled();
    });

    it('passes the caller-supplied testID through to the root', () => {
      render(<AppLaunchScreen testID="boot-loading" />);

      expect(screen.getByTestId('boot-loading')).toBeTruthy();
    });

    it('reports the surface to a screen reader with one translated label', () => {
      render(<AppLaunchScreen testID="boot-loading" />);

      const root = screen.getByTestId('boot-loading');
      expect(root).toHaveProp('accessible', true);
      expect(root).toHaveProp('accessibilityLabel', 'myLoyaltyCards, starting up');
    });

    it('hides the decorative mark from assistive technology on both platforms', () => {
      render(<AppLaunchScreen />);

      // Both props, per FannedCardIllustration: `accessibilityElementsHidden` is
      // the iOS mechanism, `importantForAccessibility` the Android one.
      const mark = screen.getByTestId('app-launch-mark', HIDDEN);
      expect(mark).toHaveProp('accessibilityElementsHidden', true);
      expect(mark).toHaveProp('importantForAccessibility', 'no-hide-descendants');

      // …and the hiding actually takes effect: an accessibility-respecting query
      // cannot reach the mark at all, so a screen reader hears only the root's
      // single label and never the decorative artwork.
      expect(screen.queryByTestId('app-launch-mark')).toBeNull();
    });

    it('calls back on first paint so the caller can hand off the native splash', () => {
      const onLayout = jest.fn();

      render(<AppLaunchScreen onLayout={onLayout} testID="boot-loading" />);

      expect(screen.getByTestId('boot-loading')).toHaveProp('onLayout', onLayout);
    });
  });

  describe('progressive disclosure (AC7)', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('is completely static one millisecond before BREATH_DELAY_MS', () => {
      render(<AppLaunchScreen />);

      jest.advanceTimersByTime(BREATH_DELAY_MS - 1);

      expect(mockWithRepeat).not.toHaveBeenCalled();
      expect(mockWithTiming).not.toHaveBeenCalled();
    });

    it('holds the mark at full opacity during the quiet phase', () => {
      render(<AppLaunchScreen />);

      jest.advanceTimersByTime(BREATH_DELAY_MS - 1);

      // reveal = 0 scales the oscillation to nothing, so the composed opacity is
      // exactly 1 — the quiet phase is genuinely motionless, not merely subtle.
      expect(screen.getByTestId('app-launch-mark', HIDDEN)).toHaveStyle({ opacity: 1 });
    });

    it('starts the breath at BREATH_DELAY_MS and loops it indefinitely, reversing', () => {
      render(<AppLaunchScreen />);

      jest.advanceTimersByTime(BREATH_DELAY_MS);

      expect(mockWithTiming).toHaveBeenCalledWith(BREATH_MIN_OPACITY, {
        duration: BREATH_DURATION_MS,
        easing: 'ease'
      });
      // -1 iterations = never stops before the surface unmounts; `true` =
      // reverses, so it breathes rather than sawtoothing back to full.
      expect(mockWithRepeat).toHaveBeenCalledWith(BREATH_MIN_OPACITY, -1, true);
    });

    it('fades the breath in over BREATH_FADE_IN_MS rather than popping it', () => {
      render(<AppLaunchScreen />);

      jest.advanceTimersByTime(BREATH_DELAY_MS);

      expect(mockWithTiming).toHaveBeenCalledWith(1, { duration: BREATH_FADE_IN_MS });
    });

    it('cancels both animations on unmount so nothing outlives the surface', () => {
      const view = render(<AppLaunchScreen />);
      jest.advanceTimersByTime(BREATH_DELAY_MS);

      view.unmount();

      expect(mockCancelAnimation).toHaveBeenCalledTimes(2);
    });

    it('does not start the breath if the surface unmounts during the quiet phase', () => {
      const view = render(<AppLaunchScreen />);

      view.unmount();
      jest.advanceTimersByTime(BREATH_DELAY_MS * 10);

      expect(mockWithRepeat).not.toHaveBeenCalled();
    });
  });

  describe('reduced motion (AC9)', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      mockUseReducedMotion.mockReturnValue(true);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('never breathes, however long the slow path lasts', () => {
      render(<AppLaunchScreen />);

      // Well past the ~35 s worst case the bounded OTA budgets allow.
      jest.advanceTimersByTime(60_000);

      expect(mockWithRepeat).not.toHaveBeenCalled();
      expect(mockWithTiming).not.toHaveBeenCalled();
    });

    it('leaves the mark static at full opacity', () => {
      render(<AppLaunchScreen />);

      jest.advanceTimersByTime(60_000);

      expect(screen.getByTestId('app-launch-mark', HIDDEN)).toHaveStyle({ opacity: 1 });
    });

    it('still renders the mark and the accessibility label', () => {
      render(<AppLaunchScreen testID="boot-loading" />);

      expect(screen.getByTestId('app-launch-mark-logo', HIDDEN)).toBeTruthy();
      expect(screen.getByTestId('boot-loading')).toHaveProp(
        'accessibilityLabel',
        'myLoyaltyCards, starting up'
      );
    });

    it('is load-bearing — flipping the guard off does start the breath', () => {
      // Guards the guard: without this, a regression that dropped the
      // `reducedMotion` early-return would leave every assertion above passing
      // for the wrong reason (e.g. a broken timer).
      mockUseReducedMotion.mockReturnValue(false);

      render(<AppLaunchScreen />);
      jest.advanceTimersByTime(BREATH_DELAY_MS);

      expect(mockWithRepeat).toHaveBeenCalled();
    });
  });
});
