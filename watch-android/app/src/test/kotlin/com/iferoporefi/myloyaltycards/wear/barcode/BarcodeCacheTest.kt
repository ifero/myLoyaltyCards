package com.iferoporefi.myloyaltycards.wear.barcode

import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test

/** LRU + memoisation semantics — the mechanism behind AC10's "re-opening must not re-encode". */
class BarcodeCacheTest {
    private fun key(value: String) = BarcodeCacheKey(value, "EAN_13", 100, 40)

    @Test
    fun getOrPut_computesOncePerKey() {
        val cache = BarcodeCache<Int>(maxEntries = 4)
        var produced = 0
        val first = cache.getOrPut(key("a")) { produced++; 42 }
        val second = cache.getOrPut(key("a")) { produced++; 99 }
        assertEquals(42, first)
        assertEquals("second call is a hit, so produce is not re-run", 42, second)
        assertEquals(1, produced)
        assertEquals(1, cache.size)
    }

    @Test
    fun distinctKeys_areDistinctEntries() {
        val cache = BarcodeCache<Int>(maxEntries = 4)
        cache.getOrPut(key("a")) { 1 }
        cache.getOrPut(key("b")) { 2 }
        assertEquals(2, cache.size)
    }

    @Test
    fun evictsLeastRecentlyUsedPastTheCap() {
        val cache = BarcodeCache<Int>(maxEntries = 2)
        cache.getOrPut(key("a")) { 1 }
        cache.getOrPut(key("b")) { 2 }
        // Touch "a" so "b" becomes least-recently-used, then overflow with "c".
        cache.getOrPut(key("a")) { error("should be cached") }
        cache.getOrPut(key("c")) { 3 }
        assertEquals(2, cache.size)
        // "b" was evicted → its producer runs again; "a" and "c" are still cached.
        var bRecomputed = false
        cache.getOrPut(key("b")) { bRecomputed = true; 2 }
        assertEquals(true, bRecomputed)
    }

    @Test
    fun rejectsNonPositiveCapacity() {
        assertThrows(IllegalArgumentException::class.java) { BarcodeCache<Int>(0) }
        assertThrows(IllegalArgumentException::class.java) { BarcodeCache<Int>(-1) }
    }
}
