package com.iferoporefi.myloyaltycards.wear.sync

import androidx.room.Room
import com.iferoporefi.myloyaltycards.wear.data.WearDatabase
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.json.JSONArray
import org.json.JSONObject
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment

/**
 * Applying a phone snapshot to the Wear OS store (Story 10-6, AC3/AC6/AC7/AC11).
 *
 * Robolectric supplies the Android runtime Room's builder needs, so these run as plain
 * `testDebugUnitTest` cases in CI with no emulator — the same arrangement Story 10-5 established.
 */
@RunWith(RobolectricTestRunner::class)
class SnapshotApplierTest {

    private lateinit var database: WearDatabase
    private lateinit var applier: SnapshotApplier

    @Before
    fun setUp() {
        database = Room
            .inMemoryDatabaseBuilder(RuntimeEnvironment.getApplication(), WearDatabase::class.java)
            .build()
        applier = SnapshotApplier(database)
    }

    @After
    fun tearDown() {
        database.close()
    }

    private fun snapshot(vararg ids: String): String {
        val payload = ids.fold(JSONArray()) { acc, id ->
            acc.put(
                JSONObject()
                    .put("id", id)
                    .put("name", "Card $id")
                    .put("colorHex", "#1A73E8")
                    .put("barcodeValue", "barcode-$id")
                    .put("barcodeFormat", "EAN13")
                    .put("usageCount", 1)
                    .put("createdAt", "2026-01-10T09:00:00.000Z")
                    .put("isFavorite", false),
            )
        }
        return JSONObject().put("version", 1).put("type", "cards").put("payload", payload).toString()
    }

    /**
     * Every stored card id, sorted. Read through the production DAO rather than raw SQL so the
     * assertions exercise the same query path the UI does.
     */
    private suspend fun storedIds(): List<String> =
        database.cardDao().observeAll().first().map { it.id }.sorted()

    @Test
    fun `applies a snapshot into an empty store`() = runTest {
        val result = applier.apply(snapshot("a", "b"))

        assertEquals(SnapshotApplyResult.Applied(2), result)
        assertEquals(listOf("a", "b"), storedIds())
    }

    /**
     * AC7 — the reason this is a replace and not a merge. Story 16-11 shipped a deletion-blind
     * full-fetch merge on the phone's cloud sync and deleted cards came back to life.
     */
    @Test
    fun `a card absent from the snapshot is deleted from the watch`() = runTest {
        applier.apply(snapshot("a", "b", "c"))
        assertEquals(listOf("a", "b", "c"), storedIds())

        applier.apply(snapshot("a", "c"))

        assertEquals(listOf("a", "c"), storedIds())
    }

    @Test
    fun `an empty snapshot clears the store`() = runTest {
        applier.apply(snapshot("a", "b"))

        assertEquals(SnapshotApplyResult.Applied(0), applier.apply(snapshot()))
        assertEquals(emptyList<String>(), storedIds())
    }

    /** AC6 — re-applying the same snapshot leaves an identical table, not duplicated rows. */
    @Test
    fun `applying the same snapshot repeatedly is a no-op`() = runTest {
        applier.apply(snapshot("a", "b"))
        val first = database.cardDao().getById("a")

        applier.apply(snapshot("a", "b"))
        applier.apply(snapshot("a", "b"))

        assertEquals(listOf("a", "b"), storedIds())
        assertEquals(first, database.cardDao().getById("a"))
    }

    /**
     * AC6 — out-of-order delivery must not corrupt the store. Every apply is a complete replace
     * with no field derived from the previous row or from the clock, so the last one applied wins
     * in full and the store is always exactly one of the snapshots that were sent.
     */
    @Test
    fun `an out-of-order snapshot leaves the store consistent, never merged`() = runTest {
        applier.apply(snapshot("a", "b", "c"))
        applier.apply(snapshot("a")) // "older" snapshot arriving late

        assertEquals(listOf("a"), storedIds())
    }

    /** AC11 — a rejected snapshot must leave the previous list exactly as it was. */
    @Test
    fun `a rejected snapshot does not touch the stored cards`() = runTest {
        applier.apply(snapshot("a", "b"))

        val result = applier.apply("{{{ not json")

        assertTrue(result is SnapshotApplyResult.Rejected)
        assertEquals(listOf("a", "b"), storedIds())
    }

    /**
     * The specific danger of a replace-based receiver: if a malformed card were skipped rather
     * than rejecting the envelope, applying this snapshot would DELETE card "b" from the watch.
     */
    @Test
    fun `a snapshot containing one malformed card deletes nothing`() = runTest {
        applier.apply(snapshot("a", "b"))

        val corrupted = JSONObject(snapshot("a", "b")).also { envelope ->
            envelope.getJSONArray("payload").getJSONObject(1).remove("barcodeValue")
        }.toString()

        assertEquals(SnapshotApplyResult.Rejected("malformed-card"), applier.apply(corrupted))
        assertEquals(listOf("a", "b"), storedIds())
    }

    @Test
    fun `an unknown envelope version leaves the store untouched`() = runTest {
        applier.apply(snapshot("a"))

        val future = JSONObject(snapshot("z")).put("version", 99).toString()

        assertEquals(SnapshotApplyResult.Rejected("unknown-version"), applier.apply(future))
        assertEquals(listOf("a"), storedIds())
    }

    /** The wire→entity rename happens in exactly one place; this proves it happened. */
    @Test
    fun `wire field names are mapped onto entity field names`() = runTest {
        applier.apply(snapshot("a"))

        val stored = database.cardDao().getById("a")
        assertNotNull(stored)
        assertEquals("barcode-a", stored!!.barcode) // wire `barcodeValue`
        assertEquals("#1A73E8", stored.color) // wire `colorHex`
        // No wire source for `updatedAt`, so it must stay null rather than be synthesised.
        assertNull(stored.updatedAt)
        assertNotNull(stored.rawPayload)
    }
}
