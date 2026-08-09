package com.iferoporefi.myloyaltycards.wear.presentation

import androidx.compose.ui.unit.dp

/**
 * Row layout metrics, ported from watchOS's `WatchCardRowLayoutMetrics.compact`
 * (`WatchPresentationLayout.swift`) — the density tuning Story 5-10 paid for to fit one more row
 * on a 41 mm screen. One deliberate change: [minimumTapHeight] is **48 dp**, the Android/Wear
 * Material minimum, not watchOS's 44 dp (Apple's guidance) (AC9).
 *
 * A single source of truth, as on watchOS, so the numbers are not scattered through composables.
 */
object CardRowMetrics {
    val rowSpacing = 10.dp
    val horizontalPadding = 10.dp
    val verticalPadding = 9.dp
    val accentWidth = 5.dp
    val accentHeight = 28.dp
    val accentCornerRadius = 3.dp
    val avatarSize = 30.dp
    val cornerRadius = 14.dp

    /** Android/Wear minimum touch target — 48 dp, not watchOS's 44 dp (documented deviation, AC9). */
    val minimumTapHeight = 48.dp
}
