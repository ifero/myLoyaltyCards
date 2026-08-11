package com.iferoporefi.myloyaltycards.wear.barcode

import kotlin.math.min
import kotlin.math.sqrt

/**
 * Barcode layout, ported from watchOS's `WatchBarcodeLayoutMetrics.make`
 * (`WatchPresentationLayout.swift`) so AC3's "≥ 80 % of the container width" is **measured**
 * ([widthFillRatio]) rather than eyeballed, and kept as one testable source of truth.
 *
 * All values are in **density-independent (dp) units**; the composable converts the barcode size to
 * pixels for [WearBarcodeGenerator] at the edge. The watchOS QR-vs-linear branch, the `112` QR floor,
 * and the linear `0.52`-of-height / 88–110 clamp are reproduced verbatim.
 *
 * Two deliberate Wear adaptations:
 * 1. **Round-screen safety** ([make]'s `isRound`): watchOS screens are always rectangular, Wear
 *    screens are frequently round, and a symbol sized against the full bounding box loses its corners
 *    (QR) or ends (linear) on a round display. The symbol (plus its title/value) is inscribed in the
 *    circle instead — `boxW² + boxH² ≤ D²` (AC4).
 * 2. **A reserved title header** ([headerReservedHeight]): watchOS shows the card name in the system
 *    nav bar, outside the barcode container. Wear has no such slot for a full-screen surface, so the
 *    name sits on the white surface above the symbol, and its height is reserved here — symmetrically
 *    with the value footer — so a tall QR can never overlap it on a square screen (AC1).
 *
 * On the [QR_FLOOR] and AC3's ≥ 80 %: **no-clip always wins.** Because the title + value chrome is a
 * fixed dp cost, the 112 dp floor can never be honoured without overflowing the box, so the
 * containment clamp (the inscribed circle on round, the container height on square) supersedes it on
 * any screen too short to fit it — the floor is the ported watchOS lower bound, binding only on the
 * tall screens watchOS targets. For the same reason, on a round screen **below ≈ 181 dp diameter**
 * the fill ratio can dip under 0.8; that is an accepted trade-off (a fully-visible smaller symbol
 * beats a clipped larger one) and is below the smallest real Wear round hardware (~192 dp), on which
 * AC3 holds — verified by [make]'s tests at 192/227/240 dp.
 *
 * @property barcodeWidth symbol width (dp). Equals [barcodeHeight] for QR.
 * @property barcodeHeight symbol height (dp).
 * @property usableWidth width of the region **allotted to the symbol** — the denominator of
 *   [widthFillRatio], and the honest reading of AC3's "container". For a linear barcode that is the
 *   full content width; for a QR it is the *square* area available (a QR is height- or circle-bound,
 *   not width-bound, so measuring it against the full bounding-box width would understate a symbol
 *   that already fills its square). On a round screen it is the circle's inscribed-square side.
 * @property headerReservedHeight height reserved above the symbol for the title, if shown.
 * @property footerReservedHeight height reserved below the symbol for the value label, if shown.
 */
data class BarcodeLayoutMetrics(
    val isQr: Boolean,
    val boxInnerPadding: Float,
    val cornerRadius: Float,
    val contentSpacing: Float,
    val headerReservedHeight: Float,
    val footerReservedHeight: Float,
    val barcodeWidth: Float,
    val barcodeHeight: Float,
    val usableWidth: Float,
    val valueFontSize: Float,
    val valueHorizontalPadding: Float,
) {
    /** Fraction of [usableWidth] the symbol spans (AC3, ≥ 0.8). Capped at 1. */
    val widthFillRatio: Float
        get() = min(barcodeWidth / usableWidth, 1f)

    /** The white box that must fit the display: symbol + inner padding on each side. */
    val boxWidth: Float
        get() = barcodeWidth + boxInnerPadding * 2

    /** Full box height: title header + symbol + value footer + inner padding top and bottom. */
    val boxHeight: Float
        get() = headerReservedHeight + barcodeHeight + footerReservedHeight + boxInnerPadding * 2

    companion object {
        const val QR_FLOOR = 112f
        const val LINEAR_HEIGHT_RATIO = 0.52f
        const val LINEAR_MIN_HEIGHT = 88f
        const val LINEAR_MAX_HEIGHT = 110f
        private const val BOX_INNER_PADDING = 2f
        private const val CORNER_RADIUS = 8f
        private const val CONTENT_SPACING = 4f

        // Title header (Wear-only; watchOS uses the nav bar). A single ellipsised titleSmall line.
        private const val TITLE_LABEL_HEIGHT = 20f

        // Value footer (watchOS's `valueLabelReservedHeight`, 10 pt label ⇒ ~12 dp line).
        private const val VALUE_LABEL_HEIGHT = 12f
        private const val VALUE_FONT_SIZE = 10f
        private const val VALUE_HORIZONTAL_PADDING = 2f

        /**
         * Computes the layout for a [containerWidth]×[containerHeight]-dp drawable area.
         *
         * @param isRound whether the display is round (`LocalConfiguration.isScreenRound`). When
         *   `true`, the title + symbol + value box is inscribed in the circle so nothing is clipped
         *   (AC4).
         * @param isQr whether the symbol is a QR code — drives the square-vs-linear branch.
         * @param showsTitle whether the card name is rendered above the symbol; reserves header space.
         * @param showsValueLabel whether the value is rendered below the symbol; reserves footer
         *   space, matching watchOS's default (Out of scope #4).
         */
        fun make(
            containerWidth: Float,
            containerHeight: Float,
            isRound: Boolean,
            isQr: Boolean,
            showsTitle: Boolean,
            showsValueLabel: Boolean,
        ): BarcodeLayoutMetrics {
            val safeWidth = maxOf(containerWidth, 1f)
            val safeHeight = maxOf(containerHeight, 1f)
            val headerReservedHeight = if (showsTitle) TITLE_LABEL_HEIGHT + CONTENT_SPACING else 0f
            val footerReservedHeight = if (showsValueLabel) VALUE_LABEL_HEIGHT + CONTENT_SPACING else 0f
            val verticalChrome = headerReservedHeight + footerReservedHeight + BOX_INNER_PADDING * 2
            val contentWidth = maxOf(safeWidth - BOX_INNER_PADDING * 2, 1f)
            // Height left for the symbol once the title, value and padding are accounted for.
            val contentHeight = maxOf(safeHeight - verticalChrome, 1f)
            // Round displays are square-bounding, so the inscribed circle's diameter is the shorter side.
            val diameter = min(safeWidth, safeHeight)

            val barcodeWidth: Float
            val barcodeHeight: Float
            val usableWidth: Float

            if (isQr) {
                // The square area a QR is allotted: bounded by width and by the height left after chrome
                // on a square screen, by the inscribed square on a round one.
                val squareRegion = if (isRound) inscribedSquareSide(diameter) else min(contentWidth, contentHeight)
                // watchOS: fill that available square, floored at 112, never wider than the content.
                var side = min(contentWidth, maxOf(contentHeight, QR_FLOOR))
                side = if (isRound) {
                    // No-clip wins over the 112 floor: inscribe the whole box in the circle. A clipped
                    // barcode fails worse than a small one, so the floor yields on a tight round screen.
                    min(side, maxSquareSideInCircle(diameter, headerReservedHeight, footerReservedHeight))
                } else {
                    // Same principle on a square screen: never let the box overflow the container
                    // height, even if that drops below the 112 floor (see Dev Notes on the floor).
                    min(side, contentHeight)
                }
                barcodeWidth = side
                barcodeHeight = side
                usableWidth = squareRegion
            } else {
                var height =
                    min(maxOf(safeHeight * LINEAR_HEIGHT_RATIO, LINEAR_MIN_HEIGHT), LINEAR_MAX_HEIGHT)
                var width = contentWidth
                if (isRound) {
                    width = min(width, maxContentWidthInCircle(diameter, height, headerReservedHeight, footerReservedHeight))
                } else {
                    // Never let the box overflow the container height on a very short square screen.
                    height = min(height, contentHeight)
                }
                barcodeWidth = width
                barcodeHeight = height
                // A linear barcode uses the full width, so it is measured against the full safe width
                // (the inscribed square on round — a short barcode can even exceed it, hence the cap).
                usableWidth = if (isRound) inscribedSquareSide(diameter) else safeWidth
            }

            return BarcodeLayoutMetrics(
                isQr = isQr,
                boxInnerPadding = BOX_INNER_PADDING,
                cornerRadius = CORNER_RADIUS,
                contentSpacing = CONTENT_SPACING,
                headerReservedHeight = headerReservedHeight,
                footerReservedHeight = footerReservedHeight,
                barcodeWidth = barcodeWidth,
                barcodeHeight = barcodeHeight,
                usableWidth = usableWidth,
                valueFontSize = VALUE_FONT_SIZE,
                valueHorizontalPadding = VALUE_HORIZONTAL_PADDING,
            )
        }

        /** The largest centered square inscribable in a circle of [diameter]: side = D / √2. */
        private fun inscribedSquareSide(diameter: Float): Float = diameter / SQRT_2

        /**
         * Largest square symbol side `s` whose white box — width `s + 2·pad`, height
         * `s + chrome` (where `chrome = header + footer + 2·pad`) — fits centred in a circle of
         * [diameter], i.e. `boxW² + boxH² ≤ D²`.
         *
         * Let `u = s + 2·pad` and `k = header + footer`; then `u² + (u + k)² = D²`, whose positive
         * root is `u = (−k + √(2·D² − k²)) / 2`. Returns `s = u − 2·pad`, floored at 1.
         */
        private fun maxSquareSideInCircle(diameter: Float, header: Float, footer: Float): Float {
            val k = header + footer
            val discriminant = 2f * diameter * diameter - k * k
            if (discriminant <= 0f) return 1f
            val u = (-k + sqrt(discriminant)) / 2f
            return maxOf(u - BOX_INNER_PADDING * 2, 1f)
        }

        /**
         * Largest content width `w` whose white box — width `w + 2·pad`, height
         * `barcodeHeight + header + footer + 2·pad` — fits centred in a circle of [diameter]:
         * `w = √(D² − boxH²) − 2·pad`. Returns 1 when the box height alone exceeds the diameter
         * (a degenerately small round screen; the caller's width clamp then dominates).
         */
        private fun maxContentWidthInCircle(
            diameter: Float,
            barcodeHeight: Float,
            header: Float,
            footer: Float,
        ): Float {
            val boxHeight = barcodeHeight + header + footer + BOX_INNER_PADDING * 2
            val available = diameter * diameter - boxHeight * boxHeight
            if (available <= 0f) return 1f
            return maxOf(sqrt(available) - BOX_INNER_PADDING * 2, 1f)
        }

        private val SQRT_2 = sqrt(2f)
    }
}
