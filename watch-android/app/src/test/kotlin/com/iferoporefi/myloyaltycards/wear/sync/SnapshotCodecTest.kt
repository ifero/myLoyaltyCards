package com.iferoporefi.myloyaltycards.wear.sync

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

/**
 * Decoding the phone → watch snapshot envelope (Story 10-6, AC11/AC12).
 *
 * Runs under Robolectric only because `org.json` is an Android platform library: the JVM stubs in
 * `android.jar` throw. Nothing here needs a Context, a database or a device.
 */
@RunWith(RobolectricTestRunner::class)
class SnapshotCodecTest {

    private fun cardJson(overrides: Map<String, Any?> = emptyMap()): JSONObject {
        val base = mutableMapOf<String, Any?>(
            "id" to "c1",
            "name" to "Esselunga",
            "colorHex" to "#1A73E8",
            "barcodeValue" to "5901234123457",
            "barcodeFormat" to "EAN13",
            "usageCount" to 12,
            "createdAt" to "2026-01-10T09:00:00.000Z",
            "isFavorite" to true,
        )
        base.putAll(overrides)

        val json = JSONObject()
        for ((key, value) in base) {
            if (value == null) json.put(key, JSONObject.NULL) else json.put(key, value)
        }
        return json
    }

    private fun envelope(vararg cards: JSONObject, version: Int? = 1, type: String? = "cards"): String {
        val json = JSONObject()
        version?.let { json.put("version", it) }
        type?.let { json.put("type", it) }
        json.put("payload", cards.fold(org.json.JSONArray()) { acc, card -> acc.put(card) })
        return json.toString()
    }

    private fun decodeSuccess(json: String): SnapshotDecodeResult.Success {
        val result = SnapshotCodec.decode(json)
        assertTrue("expected Success but got $result", result is SnapshotDecodeResult.Success)
        return result as SnapshotDecodeResult.Success
    }

    private fun assertRejected(json: String, reason: String) {
        val result = SnapshotCodec.decode(json)
        assertTrue("expected Rejected but got $result", result is SnapshotDecodeResult.Rejected)
        assertEquals(reason, (result as SnapshotDecodeResult.Rejected).reason)
    }

    // --- Happy path ---------------------------------------------------------------------

    @Test
    fun `decodes a well-formed snapshot`() {
        val cards = decodeSuccess(envelope(cardJson())).cards
        assertEquals(1, cards.size)

        val payload = cards.single().payload
        assertEquals("c1", payload.id)
        assertEquals("Esselunga", payload.name)
        // The wire→entity rename lives in the mapper, so the payload keeps WIRE names.
        assertEquals("5901234123457", payload.barcodeValue)
        assertEquals("#1A73E8", payload.colorHex)
        assertEquals(12, payload.usageCount)
        assertTrue(payload.isFavorite)
    }

    /** "All cards deleted" arrives as an empty list, not as a missing payload (AC7). */
    @Test
    fun `an empty payload is a valid snapshot, not an error`() {
        assertEquals(0, decodeSuccess(envelope()).cards.size)
    }

    /**
     * The phone's sanitiser omits null fields entirely, so an absent optional and an explicit
     * null must decode identically (Story 10-5's "absent field → default, never a crash").
     */
    @Test
    fun `absent and explicitly null optionals decode the same way`() {
        val absent = cardJson().also {
            it.remove("usageCount")
            it.remove("isFavorite")
        }
        val explicitNull = cardJson(mapOf("brandId" to null, "lastUsedAt" to null))

        val fromAbsent = decodeSuccess(envelope(absent)).cards.single().payload
        assertEquals(0, fromAbsent.usageCount)
        assertFalse(fromAbsent.isFavorite)
        assertNull(fromAbsent.brandId)

        val fromNull = decodeSuccess(envelope(explicitNull)).cards.single().payload
        assertNull(fromNull.brandId)
        assertNull(fromNull.lastUsedAt)
    }

    /** An envelope predating the versioned wrapper still syncs. */
    @Test
    fun `a missing version is treated as version 1`() {
        assertEquals(1, decodeSuccess(envelope(cardJson(), version = null)).cards.size)
    }

    // --- rawPayload (Story 10-5 AC8 + Open Decision 4) ----------------------------------

    @Test
    fun `rawPayload preserves unknown fields for forward compatibility`() {
        val card = cardJson(mapOf("someFutureField" to "keep-me"))
        val raw = JSONObject(decodeSuccess(envelope(card)).cards.single().rawPayload)
        assertEquals("keep-me", raw.getString("someFutureField"))
    }

    @Test
    fun `rawPayload strips barcodeImageBase64`() {
        val card = cardJson(mapOf("barcodeImageBase64" to "AAAA".repeat(500)))
        val decoded = decodeSuccess(envelope(card)).cards.single()

        assertFalse(decoded.rawPayload.contains("barcodeImageBase64"))
        // Every other field survives the strip.
        assertEquals("Esselunga", JSONObject(decoded.rawPayload).getString("name"))
    }

    @Test
    fun `rawPayload is untouched when no image field is present`() {
        val raw = JSONObject(decodeSuccess(envelope(cardJson())).cards.single().rawPayload)
        assertEquals("c1", raw.getString("id"))
        assertFalse(raw.has("barcodeImageBase64"))
    }

    // --- AC11: rejection, always whole-snapshot ------------------------------------------

    @Test
    fun `rejects unparseable JSON`() {
        assertRejected("{{{not json", "unparseable-envelope")
    }

    @Test
    fun `rejects an unknown envelope version`() {
        assertRejected(envelope(cardJson(), version = 2), "unknown-version")
    }

    @Test
    fun `rejects an unknown envelope type`() {
        assertRejected(envelope(cardJson(), type = "cardsV2"), "unknown-type")
    }

    @Test
    fun `rejects an envelope with no payload array`() {
        assertRejected(JSONObject().put("version", 1).put("type", "cards").toString(), "missing-payload")
    }

    @Test
    fun `rejects a payload entry that is not an object`() {
        val json = JSONObject()
            .put("version", 1)
            .put("type", "cards")
            .put("payload", org.json.JSONArray().put("not-a-card"))
            .toString()
        assertRejected(json, "non-object-card")
    }

    /**
     * The load-bearing case. Because the apply is a FULL REPLACE (AC7), skipping an unparseable
     * card would delete it from the watch — a silent data loss caused by a decoding bug. So one
     * bad card rejects the whole envelope and the watch keeps its last good list. This is what
     * AC11's "without partial application" means on a replace-based receiver.
     */
    @Test
    fun `one malformed card rejects the entire snapshot`() {
        val good = cardJson(mapOf("id" to "good"))
        val bad = cardJson(mapOf("id" to "bad")).also { it.remove("barcodeValue") }
        assertRejected(envelope(good, bad), "malformed-card")
    }

    @Test
    fun `rejects a card missing any required field`() {
        for (field in listOf("id", "name", "colorHex", "barcodeValue", "barcodeFormat", "createdAt")) {
            val card = cardJson().also { it.remove(field) }
            assertRejected(envelope(card), "malformed-card")
        }
    }

    /**
     * `optString` returns the literal `"null"` for a JSON null, so without an explicit check a
     * card would be stored with the name `"null"` rather than being refused.
     */
    @Test
    fun `rejects a required field explicitly set to JSON null`() {
        assertRejected(envelope(cardJson(mapOf("name" to null))), "malformed-card")
    }

    @Test
    fun `rejects a required field of the wrong type`() {
        assertRejected(envelope(cardJson(mapOf("id" to 42))), "malformed-card")
    }

    @Test
    fun `rejects a required field that is an empty string`() {
        assertRejected(envelope(cardJson(mapOf("id" to ""))), "malformed-card")
    }

    /**
     * Two rows with one id would collapse on upsert, leaving the watch holding fewer cards than
     * the phone sent — a silent, size-changing corruption. Refuse instead of guessing a winner.
     */
    @Test
    fun `rejects duplicate card ids`() {
        assertRejected(envelope(cardJson(), cardJson()), "duplicate-card-id")
    }
}
