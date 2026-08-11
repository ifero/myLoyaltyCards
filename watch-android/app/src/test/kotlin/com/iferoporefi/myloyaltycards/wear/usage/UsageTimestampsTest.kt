package com.iferoporefi.myloyaltycards.wear.usage

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant

/**
 * The `CARD_USED` open time must be ISO-8601 UTC with **millisecond** precision — the phone's dedup
 * key rejects anything coarser (ADR-2026-06-09-001).
 */
class UsageTimestampsTest {
    @Test
    fun formatsWithMillisecondPrecision() {
        assertEquals("2026-08-11T10:15:30.123Z", UsageTimestamps.format(Instant.parse("2026-08-11T10:15:30.123Z")))
    }

    @Test
    fun alwaysEmitsThreeFractionalDigits_evenOnASecondBoundary() {
        // Instant.toString() would drop the milliseconds here ("…:30Z"); the formatter must not.
        assertEquals("2026-08-11T10:15:30.000Z", UsageTimestamps.format(Instant.parse("2026-08-11T10:15:30Z")))
    }

    @Test
    fun truncatesSubMillisecondsToMilliseconds() {
        assertEquals("2026-08-11T10:15:30.123Z", UsageTimestamps.format(Instant.parse("2026-08-11T10:15:30.123999Z")))
    }

    @Test
    fun now_hasTheMillisecondIsoShape() {
        assertTrue(UsageTimestamps.now().matches(Regex("""\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z""")))
    }
}
