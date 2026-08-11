package com.iferoporefi.myloyaltycards.wear.barcode

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * The ported QR-vs-linear branch (AC3) and the Wear round-screen inscribing (AC4). Values are dp.
 * `SQUARE`/`ROUND` sizes mirror the emulators AC4 is verified on.
 */
class BarcodeLayoutMetricsTest {
    private fun make(
        width: Float,
        height: Float,
        isRound: Boolean,
        isQr: Boolean,
        showsTitle: Boolean = true,
        showsValueLabel: Boolean = true,
    ) = BarcodeLayoutMetrics.make(width, height, isRound, isQr, showsTitle, showsValueLabel)

    // --- QR-vs-linear branch --------------------------------------------------------------------

    @Test
    fun qrIsSquare_onBothShapes() {
        val square = make(200f, 200f, isRound = false, isQr = true)
        assertEquals(square.barcodeWidth, square.barcodeHeight, 0.01f)
        val round = make(227f, 227f, isRound = true, isQr = true)
        assertEquals(round.barcodeWidth, round.barcodeHeight, 0.01f)
    }

    @Test
    fun linearIsWiderThanTall() {
        val m = make(200f, 200f, isRound = false, isQr = false)
        assertTrue("linear barcode is wider than tall", m.barcodeWidth > m.barcodeHeight)
    }

    @Test
    fun linearHeightClamp_88to110AtHalfHeight() {
        // 0.52 * height, clamped to [88, 110].
        assertEquals(110f, make(200f, 300f, isRound = false, isQr = false).barcodeHeight, 0.01f) // 156 → 110
        // 150dp is tall enough for the 88 minimum to both bind (78 → 88) and fit within the box.
        assertEquals(88f, make(200f, 150f, isRound = false, isQr = false).barcodeHeight, 0.01f) // 78 → 88
        assertEquals(104f, make(200f, 200f, isRound = false, isQr = false).barcodeHeight, 0.01f) // 104 in range
    }

    @Test
    fun shortWideSquareScreen_qrFitsWithoutOverflowing() {
        // On a screen too short to honour the 112 floor, no-clip wins: the QR fills the available
        // square and its box never overflows the container (see the metrics' Dev Notes on the floor).
        val m = make(400f, 140f, isRound = false, isQr = true)
        assertEquals("QR stays square", m.barcodeWidth, m.barcodeHeight, 0.01f)
        assertTrue("box height ${m.boxHeight} must fit the 140dp container", m.boxHeight <= 140f + 0.01f)
        assertTrue("box width ${m.boxWidth} must fit the 400dp container", m.boxWidth <= 400f + 0.01f)
    }

    // --- AC3: ≥ 80 % of the container --------------------------------------------------------------

    @Test
    fun widthFillRatio_isAtLeast80Percent_onVerifiedWearProfiles() {
        // Real Wear hardware: round ≥ 192 dp and the square emulator at 180 dp (see the AC4 table).
        val cases = listOf(
            make(180f, 180f, isRound = false, isQr = true),
            make(180f, 180f, isRound = false, isQr = false),
            make(192f, 192f, isRound = false, isQr = true),
            make(192f, 192f, isRound = true, isQr = true),
            make(192f, 192f, isRound = true, isQr = false),
            make(227f, 227f, isRound = true, isQr = true),
            make(240f, 240f, isRound = true, isQr = true),
        )
        for (m in cases) {
            assertTrue(
                "widthFillRatio ${m.widthFillRatio} should be ≥ 0.8 (isQr=${m.isQr})",
                m.widthFillRatio >= 0.8f,
            )
        }
    }

    @Test
    fun smallRoundScreen_noClipWinsOverThe80PercentTarget() {
        // Below ≈ 181 dp diameter (smaller than any real Wear round watch), the fixed title+value
        // chrome pushes the fill ratio under 0.8. That is the accepted trade-off: a fully-visible
        // smaller symbol beats a clipped larger one, so the box must still fit the circle.
        val m = make(140f, 140f, isRound = true, isQr = true)
        assertTrue("fill ratio ${m.widthFillRatio} is expected to dip below 0.8 at 140dp", m.widthFillRatio < 0.8f)
        val diagonalSq = m.boxWidth * m.boxWidth + m.boxHeight * m.boxHeight
        assertTrue("box must still fit within Ø140 (no clip)", diagonalSq <= 140f * 140f + 1f)
    }

    // --- AC4: nothing clipped on a round screen ---------------------------------------------------

    @Test
    fun roundScreen_boxFitsInscribedCircle_qrAndLinear() {
        for (isQr in listOf(true, false)) {
            for (diameter in listOf(192f, 227f, 240f)) {
                val m = make(diameter, diameter, isRound = true, isQr = isQr)
                val diagonalSq = m.boxWidth * m.boxWidth + m.boxHeight * m.boxHeight
                assertTrue(
                    "box ${m.boxWidth}×${m.boxHeight} must fit within Ø$diameter (isQr=$isQr)",
                    // small tolerance for float rounding; the closed-form solution sits on the boundary.
                    diagonalSq <= diameter * diameter + 1f,
                )
            }
        }
    }

    @Test
    fun roundScreen_noClipWinsOverTheQrFloor() {
        // On a small round screen the inscribed square is < 112: the no-clip constraint must override
        // the floor rather than clip the corners.
        val m = make(140f, 140f, isRound = true, isQr = true)
        assertTrue("QR side ${m.barcodeWidth} should drop below the 112 floor to avoid clipping", m.barcodeWidth < 112f)
    }

    // --- Title / value reservation ----------------------------------------------------------------

    @Test
    fun hidingTitleAndValue_removesTheirReservations_andGrowsTheSymbol() {
        val withChrome = make(200f, 200f, isRound = false, isQr = true, showsTitle = true, showsValueLabel = true)
        val bare = make(200f, 200f, isRound = false, isQr = true, showsTitle = false, showsValueLabel = false)
        assertEquals(0f, bare.headerReservedHeight, 0.01f)
        assertEquals(0f, bare.footerReservedHeight, 0.01f)
        assertTrue("more vertical room ⇒ a larger QR", bare.barcodeHeight > withChrome.barcodeHeight)
    }
}
