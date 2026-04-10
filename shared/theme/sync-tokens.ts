/**
 * Sync UI design tokens — Figma "Sync & Status" frames
 * Story 13.8: Restyle Sync & Status Indicators
 *
 * All tint values are sourced directly from Figma frames
 * (Syncing / Success / Error / Offline / Conflict).
 * Each token pair: { light, dark }.
 */

export const SYNC_TOKENS = {
  /** SyncIndicator — syncing state */
  syncingBg: { light: '#E5F5FA', dark: '#2C2C2E' }, // surfaceElevated dark
  syncingText: { light: '#1A73E8', dark: '#4DA3FF' }, // primary

  /** SyncIndicator — success state */
  successBg: { light: '#E9F4EB', dark: '#1E3A27' },
  successText: { light: '#16A34A', dark: '#22C55E' }, // success

  /** SyncErrorBanner */
  errorBg: { light: '#FFECEC', dark: '#461E22' },
  errorAccent: { light: '#FF5B30', dark: '#FF453A' },
  errorDismiss: { light: '#636366', dark: '#BEBFC5' },

  /** OfflineIndicator — neutral/muted (not warning) */
  offlineBg: { light: '#FFF3D6', dark: '#4A3A1A' },
  offlineText: { light: '#EF9500', dark: '#FFD60A' },

  /** ConflictComparisonCard */
  conflictCardBg: { light: '#F5F5F7', dark: '#2C2C2E' }, // surfaceElevated
  conflictAccent: { light: '#FF5B30', dark: '#FF453A' }, // same as errorAccent

  /** ConflictResolutionModal */
  modalBg: { light: '#FFFFFF', dark: '#1C1C1E' }, // surface
  modalOverlay: 'rgba(0, 0, 0, 0.5)',
  keepBothTint: { light: '#34C759', dark: '#30D158' }
} as const;
