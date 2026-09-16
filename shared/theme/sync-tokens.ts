/**
 * Sync UI design tokens — the sync/status surfaces
 * Story 13.8: Restyle Sync & Status Indicators
 * Story 21.2: Migrate the colour tokens to Ink & Beam (AC11)
 *
 * ## Why this file still exists, and what it is allowed to hold
 *
 * These were thirteen hand-authored `{ light, dark }` hex pairs lifted straight
 * from the Figma "Sync & Status" frames — a THIRD palette, outside `tokens/` and
 * outside every drift gate, which is how it kept `errorAccent #FF5B30` (coral)
 * and `offlineText #EF9500` (orange) shipping and user-visible long after the
 * design system banned coral and orange by name. "Keep it" was never an option
 * for those: they were not obscure, they were rendered by `SyncErrorBanner`,
 * `ConflictComparisonCard` and `OfflineIndicator` on every sync failure.
 *
 * Story 21.2's decision: **this file stops being a palette and becomes a
 * mapping.** Every pair below now resolves to a generated theme token, so a
 * future palette edit reaches these surfaces automatically and no value here can
 * drift from the system again. The `{ light, dark }` SHAPE stays, because
 * `unistyles.ts` flattens it per scheme and `ThemeProvider` has no notion of
 * these roles — folding them into `tokens/color.json` would mean inventing
 * thirteen theme keys for six components.
 *
 * Two values are deliberately NOT theme tokens, and both are recorded rather
 * than silent:
 * - `errorBg.light` is the design system's `error-container` (`#FBDDDD`). It is
 *   a pale red, not a banned hue, and the theme has no container ramp to take
 *   it from.
 * - `modalOverlay` is a scrim, not a colour: it must be black at 50% whatever
 *   the ground is, or the modal stops reading as modal.
 */
import { DARK_THEME_COLORS, LIGHT_THEME_COLORS } from './tokens.generated';

/** Design system `error-container` — see the note above. */
const ERROR_CONTAINER_LIGHT = '#FBDDDD';

export const SYNC_TOKENS = {
  /** SyncIndicator — syncing state. Beam in dark: syncing is an active state. */
  syncingBg: {
    light: LIGHT_THEME_COLORS.backgroundSubtle,
    dark: DARK_THEME_COLORS.surfaceElevated
  },
  syncingText: { light: LIGHT_THEME_COLORS.primary, dark: DARK_THEME_COLORS.primary },

  /** SyncIndicator — success state. Cardì has no green; success reads quiet. */
  successBg: {
    light: LIGHT_THEME_COLORS.backgroundSubtle,
    dark: DARK_THEME_COLORS.surfaceElevated
  },
  successText: { light: LIGHT_THEME_COLORS.success, dark: DARK_THEME_COLORS.success },

  /** SyncErrorBanner — was coral `#FF5B30` on the light side. */
  errorBg: { light: ERROR_CONTAINER_LIGHT, dark: DARK_THEME_COLORS.surfaceElevated },
  errorAccent: { light: LIGHT_THEME_COLORS.error, dark: DARK_THEME_COLORS.error },
  errorDismiss: {
    light: LIGHT_THEME_COLORS.textSecondary,
    dark: DARK_THEME_COLORS.textSecondary
  },

  /**
   * OfflineIndicator — neutral/muted, and NOT a warning.
   *
   * Was an orange `#EF9500` on an amber wash, which said "something is wrong".
   * Offline with pending changes is not a fault, it is a state, so it now reads
   * as secondary text on a subtle container — which is also the only reading the
   * system permits, orange being banned outright.
   */
  offlineBg: {
    light: LIGHT_THEME_COLORS.backgroundSubtle,
    dark: DARK_THEME_COLORS.surfaceElevated
  },
  offlineText: { light: LIGHT_THEME_COLORS.textSecondary, dark: DARK_THEME_COLORS.textSecondary },

  /** ConflictComparisonCard — the accent marks CHANGED fields, so it is the error role. */
  conflictCardBg: {
    light: LIGHT_THEME_COLORS.surfaceElevated,
    dark: DARK_THEME_COLORS.surfaceElevated
  },
  conflictAccent: { light: LIGHT_THEME_COLORS.error, dark: DARK_THEME_COLORS.error },

  /** ConflictResolutionModal. `keepBothTint` tints the recommended option's icon. */
  modalBg: { light: LIGHT_THEME_COLORS.surface, dark: DARK_THEME_COLORS.surface },
  modalOverlay: 'rgba(0, 0, 0, 0.5)',
  keepBothTint: { light: LIGHT_THEME_COLORS.primary, dark: DARK_THEME_COLORS.primary }
} as const;
