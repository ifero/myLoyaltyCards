package com.iferoporefi.myloyaltycards.wear.sort

/**
 * User-selectable ordering for the Wear card list. The three cases mirror the phone's
 * `useCardSort` (`features/cards/hooks/useCardSort.ts`) and watchOS's `WatchSortMode` so all
 * three surfaces share one vocabulary.
 *
 * Declaration order is the picker's row order (frequent → recent → A-Z), matching watchOS.
 *
 * The watch persists its **own** choice, independently of the phone, with an **A-Z** default
 * (decision 2026-06-09). That is allowed under the read-only rule because a sort preference is
 * UI state, not card data (ADR-2026-06-09-001) — see [prefs][com.iferoporefi.myloyaltycards.wear.prefs].
 *
 * @property rawValue Stable string persisted by DataStore. Never change these once shipped, or a
 *   saved preference would silently reset to the default on upgrade.
 */
enum class WatchSortMode(val rawValue: String) {
    FREQUENT("frequent"),
    RECENT("recent"),
    AZ("az"),
    ;

    companion object {
        /** Default on a fresh install with no saved preference (AC6). Deliberately NOT the
         *  phone's `frequent` — the watch defaults to A-Z (decision 2026-06-09). */
        val DEFAULT: WatchSortMode = AZ

        /** Resolves a persisted [rawValue] back to a mode, falling back to [DEFAULT] for a
         *  missing (first launch) or unrecognised (forward-compat) value. */
        fun fromRawValue(rawValue: String?): WatchSortMode =
            entries.firstOrNull { it.rawValue == rawValue } ?: DEFAULT
    }
}
