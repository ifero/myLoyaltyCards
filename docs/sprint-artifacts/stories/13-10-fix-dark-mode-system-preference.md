# Story 13.10: Fix Dark Mode System Preference

**Epic:** 13 - UI Implementation
**Type:** Bug Fix
**Status:** backlog

## Story

As a user who has configured my phone to use dark mode,
I want the app to honour my system preference automatically,
so that the app looks and feels native to my device instead of always showing a bright white interface.

## Context

Real-device testing on TestFlight revealed that the app always renders in light mode regardless of the iOS system appearance setting. The root cause is two-fold:

1. **NativeWind `dark:` classes are never activated** — `tailwind.config.js` is missing the `darkMode` directive. Without it, NativeWind never applies `dark:bg-*`, `dark:text-*`, etc., even when the device is in dark mode.

2. **Loading screen hardcodes `LIGHT_THEME.primary`** — in `app/_layout.tsx` the initial loading spinner renders outside `ThemeProvider` and uses the light theme colour unconditionally.

The `ThemeProvider` itself is logically correct — it reads `useColorScheme()` from React Native and resolves dark/light. The JS theme tokens (`theme.background`, `theme.textPrimary`, etc.) applied via `style={}` props work correctly once `ThemeProvider` mounts. The gap is specifically the Tailwind/NativeWind `dark:` class pathway.

**Files affected:**
- `tailwind.config.js`
- `app/_layout.tsx`
- `shared/theme/ThemeProvider.tsx` (verify NativeWind colour scheme context wiring)

## Acceptance Criteria

### AC1: NativeWind dark mode classes activate with system preference

- [ ] `tailwind.config.js` includes `darkMode: 'media'`
- [ ] All existing `dark:` Tailwind classes on auth screens, home screen, settings screen, and card detail activate when device is in dark mode
- [ ] No visual regressions in light mode

### AC2: Loading screen respects dark mode

- [ ] The loading `ActivityIndicator` in `app/_layout.tsx` (rendered before `ThemeProvider` mounts) no longer hardcodes `LIGHT_THEME.primary`
- [ ] Loading screen background uses a neutral colour that works for both modes (e.g., `#1C1C1E` dark / `#FFFFFF` light) or a stable constant that is mode-independent

### AC3: ThemeProvider colour scheme is the single source of truth

- [ ] `ThemeProvider` `themePreference` of `'system'` correctly resolves to the device colour scheme at mount time and reacts to OS appearance changes at runtime
- [ ] Switching system appearance (Settings → Display & Brightness) while the app is backgrounded and then foregrounded updates the app theme without requiring a restart

### AC4: No regression on user-set theme preference

- [ ] When `themePreference` is explicitly `'light'` or `'dark'` (via Settings screen), the system OS preference is correctly overridden
- [ ] NativeWind `dark:` classes match the resolved preference (not the OS preference) when a manual override is set

### AC5: Tests updated

- [ ] `ThemeProvider.test.tsx` — existing tests still pass
- [ ] New test: `dark:` class activation for a sample component when `useColorScheme` returns `'dark'`

## Technical Notes

- NativeWind v4 with `darkMode: 'media'` reads from the OS colour scheme automatically via `useColorScheme` internals — this aligns with what `ThemeProvider` uses
- The loading screen fix: replace `LIGHT_THEME.primary` with `Colors.primary[500]` (or equivalent stable token) since the primary brand colour (`#1A73E8`) is the same in both themes
- Confirm NativeWind colour scheme provider is not needed separately (NativeWind v4 handles `media` mode natively without a wrapper)

## Definition of Done

- [ ] `darkMode: 'media'` added to `tailwind.config.js`
- [ ] Loading screen colour fixed in `app/_layout.tsx`
- [ ] Manual dark/light/system toggle in Settings still works correctly
- [ ] Tested on real device (iPhone, iOS dark mode) or simulator with Appearance override
- [ ] All existing tests pass
- [ ] PR reviewed and approved
