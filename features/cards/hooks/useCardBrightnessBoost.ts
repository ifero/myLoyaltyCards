/**
 * useCardBrightnessBoost Hook
 * Story 16.39: Full brightness on the card detail screen — by setting or by button
 *
 * Holds the screen at full brightness while the card detail screen is focused, and
 * gives the user their own level back the moment it is not.
 *
 * Two things can turn the boost on, and the distinction is the point:
 *
 * - **The Settings toggle** — a standing preference, persisted, and **off by default**
 *   (ifero, 2026-09-07). A fresh install therefore behaves exactly as it did before
 *   this story: nothing touches device brightness until the user asks.
 * - **The button on the card** — an in-the-moment override, deliberately **not**
 *   persisted. It lasts for this visit only; the standing choice stays the setting's.
 *
 * Composes `useBrightness` (Story 2.5) rather than reimplementing it — that hook is
 * shared with the fullscreen overlay and the barcode-flash route, and is already
 * tested. This adds the lifecycle and the two-source resolution.
 */

import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { getAutoBrightnessEnabled } from '@/core/settings/settings-repository';

import { useBrightness } from './useBrightness';

export interface UseCardBrightnessBoostReturn {
  /** Whether the screen is currently being held at full brightness. */
  isBoosted: boolean;
  /** Flip the boost for this visit only. */
  toggle: () => void;
}

/**
 * Swallow a rejected brightness call.
 *
 * Not logged, because `useBrightness` already catches and logs its own failures —
 * simulators and some devices reject outright — and a second line here would only
 * duplicate it. The handler exists so this hook does not *depend* on that: attaching
 * nothing would turn any future change in `useBrightness` into an unhandled rejection
 * surfacing on a screen that has nothing to do with brightness.
 */
const ignoreBrightnessFailure = () => undefined;

export function useCardBrightnessBoost(): UseCardBrightnessBoostReturn {
  const { maximize, restore } = useBrightness();

  // `null` means "follow the setting". Only the button ever sets it, and only for the
  // current visit — the focus cleanup clears it again.
  const [override, setOverride] = useState<boolean | null>(null);

  // Read on every render rather than held in state: the store is `expo-sqlite/kv-store`,
  // whose API is synchronous, so there is nothing to await and no loading state to
  // model. Changing the setting means leaving this screen for Settings, which blurs it
  // and re-runs the focus effect below on the way back — so the value is never stale by
  // the time it matters.
  //
  // ⚠️ Deliberately NOT the house pattern, so do not copy this into a new preference
  // hook without the same reasoning. Every sibling — `useAutoBrightnessPreference`,
  // `useLanguagePreference`, `ThemeProvider` — reads the store exactly once via a lazy
  // `useState` initialiser. They can, because they OWN the value; this hook has to
  // observe a value another component writes, and the codebase has no shared store or
  // event bus for that. The focus effect is the synchronisation point.
  const autoEnabled = getAutoBrightnessEnabled();
  const isBoosted = override ?? autoEnabled;

  // The `AppState` listener needs the CURRENT value, but must not be torn down and
  // rebuilt every time the user taps the button — so it reads through a ref.
  const isBoostedRef = useRef(isBoosted);
  isBoostedRef.current = isBoosted;

  // The button's path. Guarded on `null` so this does nothing until the user actually
  // taps: while the override is unset, the focus effect below owns the decision.
  //
  // ⚠️ These are two effects rather than one, and the split is load-bearing.
  // `useFocusEffect` runs its cleanup on blur **and** whenever its callback identity
  // changes, so an earlier revision that depended on the resolved boost and cleared the
  // override in its cleanup made the button undo itself: the tap changed the identity,
  // the cleanup fired, and the override was wiped before it could be applied. Splitting
  // them means the focus effect re-runs only on real focus changes.
  useEffect(() => {
    if (override === null) {
      return;
    }

    if (override) {
      maximize().catch(ignoreBrightnessFailure);
    } else {
      restore().catch(ignoreBrightnessFailure);
    }
  }, [override, maximize, restore]);

  useFocusEffect(
    // Deliberately does NOT depend on the resolved boost — see the note above.
    useCallback(() => {
      // A new visit does not inherit the last one's tap. Cleared on the way IN rather
      // than on the way out, and the decision below reads the setting directly rather
      // than the resolved value, so there is no window in which a stale override could
      // be applied before the reset lands.
      setOverride(null);

      if (getAutoBrightnessEnabled()) {
        maximize().catch(ignoreBrightnessFailure);
      } else {
        restore().catch(ignoreBrightnessFailure);
      }

      // ⚠️ Navigation focus is not the only way to leave this screen, and on iOS the
      // other way leaks device-wide. `expo-brightness` documents that "on iOS, this
      // setting will persist until the device is locked" — so a user who presses Home
      // without locking takes full brightness with them, across every other app and
      // the home screen, until they come back here and navigate away. `useFocusEffect`
      // never fires for that: the screen keeps navigation focus while backgrounded.
      //
      // ⚠️ `background` only, never `inactive`. iOS fires `inactive` transiently while
      // the app is still frontmost — a Control Centre pull, an incoming-call banner —
      // and restoring there would drop the brightness while the user is still holding
      // the barcode up to a scanner, which is the exact failure this story prevents.
      const subscription = AppState.addEventListener('change', (next: AppStateStatus) => {
        if (next === 'active') {
          if (isBoostedRef.current) {
            maximize().catch(ignoreBrightnessFailure);
          }
        } else if (next === 'background') {
          restore().catch(ignoreBrightnessFailure);
        }
      });

      return () => {
        subscription.remove();
        restore().catch(ignoreBrightnessFailure);
      };
    }, [maximize, restore])
  );

  const toggle = useCallback(() => {
    setOverride((current) => !(current ?? getAutoBrightnessEnabled()));
  }, []);

  return { isBoosted, toggle };
}
