/**
 * useCardBrightnessBoost Hook Tests
 * Story 16.39: Full brightness on the card detail screen — AC1, AC2, AC3, AC4, AC8
 *
 * Two independent sources can turn the boost on — a persisted Settings toggle that is
 * OFF by default, and a per-visit button — so most of what matters here is their
 * interaction rather than either one alone.
 */

import { renderHook, act } from '@testing-library/react-native';

import { getAutoBrightnessEnabled } from '@/core/settings/settings-repository';

import { useCardBrightnessBoost } from './useCardBrightnessBoost';

const mockMaximize = jest.fn();
const mockRestore = jest.fn();

jest.mock('./useBrightness', () => ({
  useBrightness: () => ({
    maximize: mockMaximize,
    restore: mockRestore
  })
}));

jest.mock('@/core/settings/settings-repository', () => ({
  getAutoBrightnessEnabled: jest.fn()
}));

const mockGetAutoBrightnessEnabled = getAutoBrightnessEnabled as jest.Mock;

// `AppState` is the second way to leave this screen, and the one `useFocusEffect`
// cannot see — the screen keeps navigation focus while the app is backgrounded.
const mockAppStateListeners: Array<(state: string) => void> = [];
const mockRemoveSubscription = jest.fn();

jest.mock('react-native', () => ({
  AppState: {
    addEventListener: (_event: string, listener: (state: string) => void) => {
      mockAppStateListeners.push(listener);
      return { remove: mockRemoveSubscription };
    }
  }
}));

// Focus-cycle mock. It captures the CLEANUP the callback returns, which is the half a
// mount-scoped `useEffect` would get wrong: Expo's docs are explicit that a
// `useFocusEffect` cleanup "executes when the screen loses focus rather than on
// unmount", and Expo Router keeps a pushed-under screen mounted.
//
// It also re-runs the callback whenever its IDENTITY changes, which is how the real
// `useFocusEffect` behaves — and modelling that faithfully is what caught the bug this
// hook was first written with: the focus callback depended on the resolved boost and
// cleared the override in its cleanup, so a tap changed the identity, fired the cleanup
// and wiped the override before it could be applied. The hook now keeps the focus
// callback's deps free of the boost, which is why a tap no longer re-runs it.
let mockLatestCallback: (() => void | (() => void)) | null = null;
let mockLatestCleanup: (() => void) | null = null;

jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void | (() => void)) => {
    if (callback === mockLatestCallback) {
      return;
    }

    if (mockLatestCleanup) {
      mockLatestCleanup();
      mockLatestCleanup = null;
    }

    mockLatestCallback = callback;
    const cleanup = callback();
    mockLatestCleanup = typeof cleanup === 'function' ? cleanup : null;
  }
}));

/** Drive an `AppState` transition through whatever listener the hook registered. */
const appState = (next: 'active' | 'background' | 'inactive') => {
  for (const listener of mockAppStateListeners) {
    listener(next);
  }
};

/** Simulate the screen losing focus — e.g. pushing `/card/[id]/edit` on top of it. */
const blur = () => {
  expect(mockLatestCleanup).not.toBeNull();
  act(() => {
    mockLatestCleanup!();
    mockLatestCleanup = null;
    mockLatestCallback = null;
  });
};

describe('useCardBrightnessBoost', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAppStateListeners.length = 0;
    mockLatestCallback = null;
    mockLatestCleanup = null;
    mockMaximize.mockResolvedValue(undefined);
    mockRestore.mockResolvedValue(undefined);
    // The shipped default. Every test that wants it on says so explicitly.
    mockGetAutoBrightnessEnabled.mockReturnValue(false);
  });

  describe('the Settings toggle (AC1)', () => {
    it('does NOT touch brightness when the setting is off, which is the default', () => {
      const { result } = renderHook(() => useCardBrightnessBoost());

      // The whole point of defaulting off: a user who never opted in has their screen
      // left alone. `restore` is a no-op here — `useBrightness` has nothing stored.
      expect(result.current.isBoosted).toBe(false);
      expect(mockMaximize).not.toHaveBeenCalled();
    });

    it('maximises on focus when the setting is on', () => {
      mockGetAutoBrightnessEnabled.mockReturnValue(true);

      const { result } = renderHook(() => useCardBrightnessBoost());

      expect(result.current.isBoosted).toBe(true);
      expect(mockMaximize).toHaveBeenCalledTimes(1);
    });
  });

  describe('the per-visit button (AC2, AC3)', () => {
    it('maximises when pressed with the setting off', () => {
      const { result } = renderHook(() => useCardBrightnessBoost());
      expect(mockMaximize).not.toHaveBeenCalled();

      act(() => result.current.toggle());

      expect(result.current.isBoosted).toBe(true);
      expect(mockMaximize).toHaveBeenCalledTimes(1);
    });

    it('restores when pressed again, without waiting for the screen to be left', () => {
      const { result } = renderHook(() => useCardBrightnessBoost());
      act(() => result.current.toggle());
      expect(mockMaximize).toHaveBeenCalledTimes(1);

      act(() => result.current.toggle());

      expect(result.current.isBoosted).toBe(false);
      expect(mockRestore).toHaveBeenCalled();
    });

    it('can turn the boost OFF for one visit even when the setting is on', () => {
      // The button is an override in both directions, not just an opt-in. A user in a
      // dark room should be able to drop the brightness without changing a setting.
      mockGetAutoBrightnessEnabled.mockReturnValue(true);
      const { result } = renderHook(() => useCardBrightnessBoost());
      expect(result.current.isBoosted).toBe(true);

      act(() => result.current.toggle());

      expect(result.current.isBoosted).toBe(false);
      expect(mockRestore).toHaveBeenCalled();
    });

    it('does not persist — the next visit starts from the setting again (AC3)', () => {
      const { result, rerender } = renderHook(() => useCardBrightnessBoost());
      act(() => result.current.toggle());
      expect(result.current.isBoosted).toBe(true);

      // Leave, then COME BACK. The reset lands on the way in rather than the way out,
      // so returning is what has to be simulated — and returning is also the only
      // moment at which it is observable.
      blur();
      act(() => rerender(undefined));

      expect(result.current.isBoosted).toBe(false);
    });

    it('does not persist in the other direction either — a tap-off is forgotten', () => {
      // The mirror case: the setting is ON, the user turns the boost off for one
      // checkout, and the next visit is boosted again because the setting still says so.
      mockGetAutoBrightnessEnabled.mockReturnValue(true);
      const { result, rerender } = renderHook(() => useCardBrightnessBoost());
      act(() => result.current.toggle());
      expect(result.current.isBoosted).toBe(false);

      blur();
      act(() => rerender(undefined));

      expect(result.current.isBoosted).toBe(true);
    });
  });

  describe('leaving the screen — focus and backgrounding (AC4)', () => {
    it('restores on blur rather than on unmount', () => {
      mockGetAutoBrightnessEnabled.mockReturnValue(true);
      renderHook(() => useCardBrightnessBoost());
      expect(mockRestore).not.toHaveBeenCalled();

      // Expo Router keeps a pushed-under screen MOUNTED, so this is the only signal
      // that the user has opened the edit form. A mount-scoped effect would leave the
      // phone at full brightness there and everywhere reachable from it.
      blur();

      expect(mockRestore).toHaveBeenCalled();
    });

    it('restores when the app is backgrounded, which focus cannot see', () => {
      mockGetAutoBrightnessEnabled.mockReturnValue(true);
      renderHook(() => useCardBrightnessBoost());
      expect(mockRestore).not.toHaveBeenCalled();

      // `expo-brightness` documents that on iOS the level "will persist until the
      // device is locked", so pressing Home without locking would otherwise take full
      // brightness across every other app.
      appState('background');

      expect(mockRestore).toHaveBeenCalledTimes(1);
    });

    it('re-maximises on returning to the foreground, but only while boosted', () => {
      mockGetAutoBrightnessEnabled.mockReturnValue(true);
      renderHook(() => useCardBrightnessBoost());
      appState('background');
      expect(mockMaximize).toHaveBeenCalledTimes(1);

      appState('active');

      expect(mockMaximize).toHaveBeenCalledTimes(2);
    });

    it('does NOT maximise on returning to the foreground when not boosted', () => {
      renderHook(() => useCardBrightnessBoost());
      appState('background');

      appState('active');

      // Coming back to an un-boosted card must not brighten the screen the user never
      // asked to brighten.
      expect(mockMaximize).not.toHaveBeenCalled();
    });

    it('ignores `inactive`, so a Control Centre pull cannot dim a barcode mid-scan', () => {
      mockGetAutoBrightnessEnabled.mockReturnValue(true);
      renderHook(() => useCardBrightnessBoost());

      // iOS fires `inactive` transiently while the app is STILL FRONTMOST — a Control
      // Centre pull, an incoming-call banner. The user may be holding the barcode up
      // to a scanner at that exact moment.
      appState('inactive');

      expect(mockRestore).not.toHaveBeenCalled();
      expect(mockMaximize).toHaveBeenCalledTimes(1);
    });

    it('removes the AppState listener on blur, so it cannot outlive the screen', () => {
      renderHook(() => useCardBrightnessBoost());
      expect(mockRemoveSubscription).not.toHaveBeenCalled();

      blur();

      // Without this, every visit to a card would leave another listener behind, each
      // still driving brightness from a screen the user is no longer on.
      expect(mockRemoveSubscription).toHaveBeenCalled();
    });
  });

  describe('failure and gating (AC8)', () => {
    it('does not throw when the device rejects the brightness call', () => {
      // `useBrightness` swallows and logs internally, so this models a future in which
      // it does not — simulators and some devices reject outright.
      mockGetAutoBrightnessEnabled.mockReturnValue(true);
      mockMaximize.mockRejectedValue(new Error('Brightness unavailable'));
      mockRestore.mockRejectedValue(new Error('Brightness unavailable'));

      expect(() => {
        const { result } = renderHook(() => useCardBrightnessBoost());
        act(() => result.current.toggle());
        blur();
      }).not.toThrow();
    });

    it('reports boosted even when the device refused, deliberately (AC8)', () => {
      // ⚠️ The control is OPTIMISTIC, and that is a decision rather than an oversight.
      // `isBoosted` is application state; it is never reconciled against whether
      // `setBrightnessAsync` actually succeeded, because `useBrightness` swallows its
      // own failures by design (AC8 — "a rejection must never surface to the user")
      // and this story may not modify that file.
      //
      // So on a device that rejects the call, the bulb shows filled and a screen reader
      // announces "on" while the screen never brightened. Pinned here so the trade-off
      // is visible in the suite: closing it would mean making `useBrightness` report
      // success, which is a change to a hook shared with two other surfaces and belongs
      // to its own story.
      mockGetAutoBrightnessEnabled.mockReturnValue(true);
      mockMaximize.mockRejectedValue(new Error('Brightness unavailable'));

      const { result } = renderHook(() => useCardBrightnessBoost());

      expect(result.current.isBoosted).toBe(true);
    });

    it('is not gated on the card loading — the ramp starts with the screen', () => {
      // Deliberate: the user opens a card in order to scan it, so waiting for the
      // database read would delay the boost for the whole of that read.
      mockGetAutoBrightnessEnabled.mockReturnValue(true);

      renderHook(() => useCardBrightnessBoost());

      expect(mockMaximize).toHaveBeenCalledTimes(1);
    });
  });
});
