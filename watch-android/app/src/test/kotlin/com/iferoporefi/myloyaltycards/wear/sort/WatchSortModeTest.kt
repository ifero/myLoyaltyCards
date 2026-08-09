package com.iferoporefi.myloyaltycards.wear.sort

import org.junit.Assert.assertEquals
import org.junit.Test

/** Verifies the sort-mode serialization contract and the A-Z default (AC6). */
class WatchSortModeTest {
    @Test
    fun defaultIsAz() {
        // The watch default is A-Z, deliberately NOT the phone's `frequent` (decision 2026-06-09).
        assertEquals(WatchSortMode.AZ, WatchSortMode.DEFAULT)
    }

    @Test
    fun rawValuesRoundTrip() {
        WatchSortMode.entries.forEach { mode ->
            assertEquals(mode, WatchSortMode.fromRawValue(mode.rawValue))
        }
    }

    @Test
    fun rawValuesAreTheStableStrings() {
        assertEquals("frequent", WatchSortMode.FREQUENT.rawValue)
        assertEquals("recent", WatchSortMode.RECENT.rawValue)
        assertEquals("az", WatchSortMode.AZ.rawValue)
    }

    @Test
    fun unknownOrMissingValueFallsBackToDefault() {
        assertEquals(WatchSortMode.AZ, WatchSortMode.fromRawValue(null))
        assertEquals(WatchSortMode.AZ, WatchSortMode.fromRawValue(""))
        assertEquals(WatchSortMode.AZ, WatchSortMode.fromRawValue("not-a-mode"))
    }

    @Test
    fun declarationOrderIsPickerOrder() {
        assertEquals(
            listOf(WatchSortMode.FREQUENT, WatchSortMode.RECENT, WatchSortMode.AZ),
            WatchSortMode.entries.toList(),
        )
    }
}
