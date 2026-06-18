/**
 * Unit tests for the Unistyles theme registry derivation (Story 16.1).
 * Covers the pure helpers that the engine config depends on — these run at
 * cold-start (initial theme) and theme registration, paths the component
 * suite + the Unistyles mock do not otherwise exercise.
 */
import { Appearance } from 'react-native';

import { setThemePreference } from '@/core/settings/settings-repository';

import { DARK_THEME, LIGHT_THEME } from './colors';
import { SPACING, LAYOUT, TOUCH_TARGET } from './spacing';
import { SYNC_TOKENS } from './sync-tokens';
import { TYPOGRAPHY } from './typography';
import { flattenSyncTokens, resolveInitialTheme, lightTheme, darkTheme } from './unistyles';

describe('flattenSyncTokens', () => {
  it('picks the light value from { light, dark } pairs', () => {
    const light = flattenSyncTokens('light');
    expect(light.syncingBg).toBe(SYNC_TOKENS.syncingBg.light);
    expect(light.errorAccent).toBe(SYNC_TOKENS.errorAccent.light);
    expect(light.keepBothTint).toBe(SYNC_TOKENS.keepBothTint.light);
  });

  it('picks the dark value from { light, dark } pairs', () => {
    const dark = flattenSyncTokens('dark');
    expect(dark.syncingBg).toBe(SYNC_TOKENS.syncingBg.dark);
    expect(dark.errorAccent).toBe(SYNC_TOKENS.errorAccent.dark);
    expect(dark.keepBothTint).toBe(SYNC_TOKENS.keepBothTint.dark);
  });

  it('passes through scheme-independent string tokens unchanged', () => {
    expect(flattenSyncTokens('light').modalOverlay).toBe(SYNC_TOKENS.modalOverlay);
    expect(flattenSyncTokens('dark').modalOverlay).toBe(SYNC_TOKENS.modalOverlay);
  });
});

describe('derived themes (AC2: single source of truth)', () => {
  it('derives colours and shared tokens from shared/theme — no duplication', () => {
    expect(lightTheme.colors).toBe(LIGHT_THEME);
    expect(darkTheme.colors).toBe(DARK_THEME);
    expect(lightTheme.spacing).toBe(SPACING);
    expect(lightTheme.layout).toBe(LAYOUT);
    expect(lightTheme.touchTarget).toBe(TOUCH_TARGET);
    expect(lightTheme.typography).toBe(TYPOGRAPHY);
  });

  it('attaches per-scheme flattened sync tokens', () => {
    expect(lightTheme.sync.syncingBg).toBe(SYNC_TOKENS.syncingBg.light);
    expect(darkTheme.sync.syncingBg).toBe(SYNC_TOKENS.syncingBg.dark);
  });
});

describe('resolveInitialTheme', () => {
  // Uses the real settings repository (its kv-store is mocked in jest.setup).
  afterEach(() => {
    jest.restoreAllMocks();
    setThemePreference('system');
  });

  it('returns the explicit preference when not "system"', () => {
    setThemePreference('dark');
    expect(resolveInitialTheme()).toBe('dark');

    setThemePreference('light');
    expect(resolveInitialTheme()).toBe('light');
  });

  it('follows the system appearance when preference is "system"', () => {
    setThemePreference('system');

    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('dark');
    expect(resolveInitialTheme()).toBe('dark');

    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('light');
    expect(resolveInitialTheme()).toBe('light');
  });

  it('defaults to light when system appearance is null', () => {
    setThemePreference('system');
    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue(null);
    expect(resolveInitialTheme()).toBe('light');
  });
});
