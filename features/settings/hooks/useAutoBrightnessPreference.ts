/**
 * useAutoBrightnessPreference Hook
 * Story 16.39: Full brightness on the card detail screen
 *
 * The standing preference behind the card detail screen's brightness boost. Off by
 * default — see `getAutoBrightnessEnabled` for why a device-level side effect is not
 * something to opt a user into silently.
 *
 * Simpler than its siblings in this folder on purpose. `useThemePreference` and
 * `useLanguagePreference` announce their change through `AccessibilityInfo` because
 * they are driven by a picker sheet that closes, leaving nothing on screen to convey
 * what was chosen. This is a `ToggleSwitch`, which carries `accessibilityRole="switch"`
 * and an `accessibilityState.checked` of its own, so the platform announces the new
 * state already — a manual announcement here would make VoiceOver say it twice.
 */

import { useState } from 'react';

import {
  getAutoBrightnessEnabled,
  setAutoBrightnessEnabled
} from '@/core/settings/settings-repository';

export const useAutoBrightnessPreference = () => {
  // Lazy initialiser, so the synchronous store read happens once on mount rather than
  // on every render.
  const [isAutoBrightnessEnabled, setIsAutoBrightnessEnabled] = useState(getAutoBrightnessEnabled);

  const setAutoBrightness = (value: boolean) => {
    // Persist first, then mirror into state: if the write were ever to throw, the UI
    // would not be left claiming a preference that was not saved.
    setAutoBrightnessEnabled(value);
    setIsAutoBrightnessEnabled(value);
  };

  return { isAutoBrightnessEnabled, setAutoBrightness };
};
