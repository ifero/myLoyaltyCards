/**
 * Guards for the sync/status token mapping (Story 21.2, AC11).
 *
 * `sync-tokens.ts` was a third, hand-authored palette living outside `tokens/`
 * and outside every drift gate, which is how `errorAccent #FF5B30` (coral) and
 * `offlineText #EF9500` (orange) stayed shipping and user-visible long after the
 * design system banned both by name. Story 21.2 turned the file into a mapping
 * onto generated theme tokens — but "it is a mapping now" is a property of the
 * current source, not an invariant, and every consumer test mocks `SYNC_TOKENS`
 * wholesale, so nothing here was actually proven. These tests are the gate:
 * re-introducing a literal, or letting the one deliberate hand-authored value
 * drift from the design system, goes red rather than silent.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { SYNC_TOKENS } from './sync-tokens';
import { DARK_THEME_COLORS, LIGHT_THEME_COLORS } from './tokens.generated';

const DESIGN_SYSTEM = join(__dirname, '../../docs/design/cardi/cardi-design-system.md');

/** Every `{ light, dark }` pair, flattened to the values it can resolve to. */
const tokenValues = Object.values(SYNC_TOKENS).flatMap((value) =>
  typeof value === 'string' ? [value] : [value.light, value.dark]
);

const hexToRgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return { red: n >> 16, green: (n >> 8) & 255, blue: n & 255 };
};

/** Hue in degrees, 0–360. Coral/salmon/terracotta/orange all sit in 6°–45°. */
const hue = (hex: string) => {
  const { red, green, blue } = hexToRgb(hex);
  const [r, g, b] = [red / 255, green / 255, blue / 255];
  const max = Math.max(r, g, b);
  const delta = max - Math.min(r, g, b);
  if (delta === 0) return 0;
  const raw =
    max === r
      ? 60 * (((g - b) / delta) % 6)
      : max === g
        ? 60 * ((b - r) / delta + 2)
        : 60 * ((r - g) / delta + 4);
  return raw < 0 ? raw + 360 : raw;
};

const saturation = (hex: string) => {
  const { red, green, blue } = hexToRgb(hex);
  const max = Math.max(red, green, blue);
  return max === 0 ? 0 : (max - Math.min(red, green, blue)) / max;
};

describe('SYNC_TOKENS — the banned hues cannot come back (Story 21.2, AC11)', () => {
  /**
   * Stated as a hue band rather than a denylist of the two hexes that used to be
   * here, because the failure mode is somebody adding a DIFFERENT coral, not
   * re-typing `#FF5B30`. Coral is ~16°, salmon ~6°, terracotta ~10°, orange
   * ~39°; pure red (the error role) is 0°–5°, and beam is ~48°. The band below
   * is what sits between them.
   */
  it('contains no coral, salmon, terracotta or orange', () => {
    const offenders = tokenValues
      .filter((value) => value.startsWith('#'))
      .filter((value) => saturation(value) > 0.4 && hue(value) >= 6 && hue(value) <= 45);

    expect(offenders).toEqual([]);
  });

  it('resolves every colour pair to a generated theme token, not a literal', () => {
    const generated = new Set<string>([
      ...Object.values(LIGHT_THEME_COLORS),
      ...Object.values(DARK_THEME_COLORS)
    ]);

    // The two deliberate exceptions are named here rather than skipped silently:
    // the light error container (the theme has no container ramp to take it
    // from) and the modal scrim (which must stay black at 50% whatever the
    // ground is, so it is not a colour at all).
    const exceptions = new Set<string>([SYNC_TOKENS.errorBg.light, SYNC_TOKENS.modalOverlay]);

    const unmapped = tokenValues.filter((value) => !generated.has(value) && !exceptions.has(value));

    expect(unmapped).toEqual([]);
  });

  /**
   * The one hand-authored hex left in the file duplicates the design system's
   * own `error-container`. Reading it back out of the document makes that a
   * single source of truth rather than two values that happen to agree today —
   * which is the exact shape this story spent its effort eliminating elsewhere.
   */
  it('keeps the light error container equal to the design system frontmatter', () => {
    const frontmatter = readFileSync(DESIGN_SYSTEM, 'utf8');
    const match = /^\s*error-container:\s*'(#[0-9A-Fa-f]{6})'/m.exec(frontmatter);

    expect(match).not.toBeNull();
    expect(SYNC_TOKENS.errorBg.light).toBe(match![1]);
  });

  it('keeps the scrim a scrim', () => {
    expect(SYNC_TOKENS.modalOverlay).toBe('rgba(0, 0, 0, 0.5)');
  });
});
