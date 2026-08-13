package com.iferoporefi.myloyaltycards.wear.sync

import androidx.room.Room
import com.iferoporefi.myloyaltycards.wear.data.WearDatabase
import com.iferoporefi.myloyaltycards.wear.usage.UsageOutbox
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.emptyFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.json.JSONObject
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import java.io.File

/**
 * Wear OS's half of the cross-platform sync contract (Story 10-6, AC16).
 *
 * `test-fixtures/sync-message-v1.json` is the canonical v1 wire format that "all platforms must
 * parse" (`docs/project-context.md`). Its phone-side counterpart is in
 * `core/wear-connectivity.test.ts`; between them, a unilateral change to the wire format on
 * either side fails a test instead of a customer's watch.
 *
 * Reading a repo file from a unit test is unusual here, and deliberate: a fixture nobody loads is
 * documentation, not a contract. The sibling `card-valid.json` has been in the tree since
 * February and is read by no test on any platform, which is precisely the failure this avoids.
 */
@RunWith(RobolectricTestRunner::class)
class SyncFixtureContractTest {

    /** A transport that records what the outbox tried to send and always succeeds. */
    private class RecordingTransport : WearSyncTransport {
        val sent = mutableListOf<String>()
        override suspend fun readSnapshot(): String? = null
        override fun snapshots(): Flow<String> = emptyFlow()
        override fun phoneReachable(): Flow<Boolean> = emptyFlow()
        override suspend fun sendMessage(json: String): Boolean {
            sent += json
            return true
        }
    }

    private lateinit var database: WearDatabase
    private lateinit var fixture: JSONObject

    @Before
    fun setUp() {
        database = Room
            .inMemoryDatabaseBuilder(RuntimeEnvironment.getApplication(), WearDatabase::class.java)
            .build()
        fixture = JSONObject(readFixture())
    }

    @After
    fun tearDown() {
        database.close()
    }

    /**
     * Locate the fixture by walking up from the Gradle test working directory (the module dir,
     * `watch-android/app`) until `test-fixtures/` appears. Walking beats a hard-coded `../../`
     * because it fails with a message that says what was missing rather than "file not found".
     */
    private fun readFixture(): String {
        var dir: File? = File(System.getProperty("user.dir") ?: ".").absoluteFile
        while (dir != null) {
            val candidate = File(dir, "test-fixtures/$FIXTURE_NAME")
            if (candidate.isFile) return candidate.readText()
            dir = dir.parentFile
        }
        throw AssertionError(
            "Could not find test-fixtures/$FIXTURE_NAME above ${System.getProperty("user.dir")}. " +
                "It is the cross-platform sync contract and both platforms must parse it.",
        )
    }

    @Test
    fun `the canonical snapshot decodes`() {
        val result = SnapshotCodec.decode(fixture.getJSONObject("cardsSnapshot").toString())

        assertTrue("fixture must decode, got $result", result is SnapshotDecodeResult.Success)
        assertEquals(2, (result as SnapshotDecodeResult.Success).cards.size)
    }

    @Test
    fun `the canonical snapshot maps onto Wear entities without loss`() = runTest {
        SnapshotApplier(database).apply(fixture.getJSONObject("cardsSnapshot").toString())

        val stored = database.cardDao().observeAll().first().associateBy { it.id }
        assertEquals(2, stored.size)

        val conad = stored.getValue("550e8400-e29b-41d4-a716-446655440000")
        assertEquals("Conad Card", conad.name)
        assertEquals("conad", conad.brandId)
        // Wire `barcodeValue`/`colorHex` become entity `barcode`/`color` at the one mapper.
        assertEquals("1234567890123", conad.barcode)
        assertEquals("green", conad.color)
        assertEquals("EAN13", conad.barcodeFormat)
        assertEquals(7, conad.usageCount)
        // Millisecond precision must survive storage — the dedup key depends on it.
        assertEquals("2026-02-14T18:22:05.017Z", conad.lastUsedAt)
        assertTrue(conad.isFavorite)

        // The second card omits `brandId` and `lastUsedAt` entirely: the phone's sanitiser drops
        // nulls rather than transmitting them, so absent must decode as null, never as a crash.
        val custom = stored.getValue("6ba7b810-9dad-11d1-80b4-00c04fd430c8")
        assertNull(custom.brandId)
        assertNull(custom.lastUsedAt)
        assertEquals(0, custom.usageCount)
        assertFalse(custom.isFavorite)
        // No wire source for `updatedAt`, so it stays null rather than being synthesised locally.
        assertNull(custom.updatedAt)
        assertNotNull(custom.rawPayload)
    }

    /** AC13 — the Android path never carries the phone-rendered barcode image. */
    @Test
    fun `the canonical snapshot carries no barcodeImageBase64, not even for the QR card`() {
        assertFalse(
            "the Wear OS path must not ship the pre-rendered image",
            fixture.getJSONObject("cardsSnapshot").toString().contains("barcodeImageBase64"),
        )
    }

    /**
     * The one message the watch may send must match the canonical envelope exactly — same keys,
     * same version, same millisecond-precision timestamp format. The phone validates it with a
     * regex that rejects anything coarser, silently.
     */
    @Test
    fun `the outbox emits the canonical CARD_USED envelope`() = runTest {
        val expected = fixture.getJSONObject("cardUsed")
        val expectedPayload = expected.getJSONObject("payload")

        val transport = RecordingTransport()
        val outbox = UsageOutbox(database.usageOutboxDao(), transport)
        outbox.enqueue(expectedPayload.getString("id"), expectedPayload.getString("usedAt"))
        outbox.flush()

        val actual = JSONObject(transport.sent.single())
        assertEquals(expected.keys().asSequence().toSet(), actual.keys().asSequence().toSet())
        assertEquals(expected.getInt("version"), actual.getInt("version"))
        assertEquals(expected.getString("type"), actual.getString("type"))

        val actualPayload = actual.getJSONObject("payload")
        assertEquals(expectedPayload.keys().asSequence().toSet(), actualPayload.keys().asSequence().toSet())
        assertEquals(expectedPayload.getString("id"), actualPayload.getString("id"))
        assertEquals(expectedPayload.getString("usedAt"), actualPayload.getString("usedAt"))
    }

    /** The fixture's own timestamps must satisfy the phone's ms-precision rule. */
    @Test
    fun `every timestamp in the fixture is millisecond-precision ISO-8601 UTC`() {
        val pattern = Regex("""^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$""")

        assertTrue(
            pattern.matches(fixture.getJSONObject("cardUsed").getJSONObject("payload").getString("usedAt")),
        )

        val payload = fixture.getJSONObject("cardsSnapshot").getJSONArray("payload")
        for (index in 0 until payload.length()) {
            val card = payload.getJSONObject(index)
            assertTrue("createdAt", pattern.matches(card.getString("createdAt")))
            if (card.has("lastUsedAt")) {
                assertTrue("lastUsedAt", pattern.matches(card.getString("lastUsedAt")))
            }
        }
    }

    private companion object {
        const val FIXTURE_NAME = "sync-message-v1.json"
    }
}
