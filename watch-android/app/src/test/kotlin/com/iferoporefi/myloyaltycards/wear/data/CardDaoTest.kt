package com.iferoporefi.myloyaltycards.wear.data

import androidx.room.Room
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.withTimeout
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment

/**
 * DAO/storage behaviour of the Room card store (Story 10.5, AC13). Runs under Robolectric — an
 * Android runtime on the JVM — because Room's Android database builder needs a Context. These are
 * ordinary `testDebugUnitTest` tests, so they run in CI with no emulator.
 *
 * Most tests use an in-memory database (mirroring Story 5-9's in-memory-container approach). The
 * one that must prove data survives a restart ([cardsSurviveAStoreReopen]) uses a file-backed
 * database and reopens it — an in-memory store cannot demonstrate persistence by construction.
 */
@RunWith(RobolectricTestRunner::class)
class CardDaoTest {
    private val context = RuntimeEnvironment.getApplication()

    private fun inMemoryDb(): WearDatabase =
        Room.inMemoryDatabaseBuilder(context, WearDatabase::class.java).build()

    private fun sample(
        id: String = "id-1",
        name: String = "Esselunga",
        brandId: String? = "esselunga",
        lastUsedAt: String? = "2026-08-01T09:00:00.123Z",
        isFavorite: Boolean = true,
        usageCount: Int = 12,
        rawPayload: String? = null,
    ) = CardEntity(
        id = id,
        name = name,
        barcode = "5901234123457",
        barcodeFormat = "EAN13",
        brandId = brandId,
        color = "#1A73E8",
        isFavorite = isFavorite,
        lastUsedAt = lastUsedAt,
        usageCount = usageCount,
        createdAt = "2026-01-10T09:00:00.000Z",
        rawPayload = rawPayload,
    )

    @Before
    fun setUp() {
        context.deleteDatabase(FILE_DB)
    }

    @After
    fun tearDown() {
        context.deleteDatabase(FILE_DB)
    }

    @Test
    fun cardsSurviveAStoreReopen() =
        runTest {
            // AC1/AC3: a file-backed store written, closed, and reopened still has the card.
            val first = Room.databaseBuilder(context, WearDatabase::class.java, FILE_DB).build()
            try {
                first.cardDao().upsert(sample())
            } finally {
                first.close()
            }

            val reopened = Room.databaseBuilder(context, WearDatabase::class.java, FILE_DB).build()
            try {
                assertEquals(1, reopened.cardDao().count())
                assertEquals(sample(), reopened.cardDao().getById("id-1"))
            } finally {
                reopened.close()
            }
        }

    @Test
    fun upsertIsIdempotentByPrimaryKey() =
        runTest {
            // AC5: applying the same payload twice leaves one row with identical contents — this is
            // what makes Story 10-6's full-snapshot re-application safe to repeat.
            val db = inMemoryDb()
            try {
                val dao = db.cardDao()
                dao.upsert(sample())
                dao.upsert(sample())
                assertEquals(1, dao.count())
                assertEquals(sample(), dao.getById("id-1"))

                // A changed payload for the same id replaces in place (still one row).
                dao.upsert(sample(name = "Esselunga Updated"))
                assertEquals(1, dao.count())
                assertEquals("Esselunga Updated", dao.getById("id-1")?.name)
            } finally {
                db.close()
            }
        }

    @Test
    fun millisecondTimestampsRoundTripExactly() =
        runTest {
            // AC6: dates are stored as strings, so millisecond precision is preserved exactly — the
            // precision Story 10-6's "<cardId>:<usedAt>" dedup key depends on (ADR-2026-06-09-001).
            val db = inMemoryDb()
            try {
                val dao = db.cardDao()
                dao.upsert(sample(lastUsedAt = "2026-08-01T09:00:00.123Z"))
                assertEquals("2026-08-01T09:00:00.123Z", dao.getById("id-1")?.lastUsedAt)
                assertEquals("2026-01-10T09:00:00.000Z", dao.getById("id-1")?.createdAt)
            } finally {
                db.close()
            }
        }

    @Test
    fun nullableFieldsRoundTripAsNull() =
        runTest {
            // AC7: brandId and lastUsedAt are nullable; updatedAt has no wire source (Open Decision
            // 3). All three must round-trip as null, not as "" or a synthesised value.
            val db = inMemoryDb()
            try {
                val dao = db.cardDao()
                dao.upsert(sample(brandId = null, lastUsedAt = null))
                val stored = dao.getById("id-1")
                assertNull(stored?.brandId)
                assertNull(stored?.lastUsedAt)
                assertNull(stored?.updatedAt)
            } finally {
                db.close()
            }
        }

    @Test
    fun favouriteAndUsageDefaultsPersist() =
        runTest {
            // AC7: a payload that omitted isFavorite/usageCount defaults to false/0 at the mapper
            // and those defaults persist unchanged.
            val db = inMemoryDb()
            try {
                val dao = db.cardDao()
                val entity =
                    WatchCardPayload(
                        id = "id-9",
                        name = "Defaults",
                        colorHex = "grey",
                        barcodeValue = "CODE-39",
                        barcodeFormat = "CODE39",
                        createdAt = "2026-04-06T09:00:00.000Z",
                    ).toEntity()
                dao.upsert(entity)
                val stored = dao.getById("id-9")
                assertEquals(false, stored?.isFavorite)
                assertEquals(0, stored?.usageCount)
            } finally {
                db.close()
            }
        }

    @Test
    fun rawPayloadRoundTripsExactly() =
        runTest {
            // AC8: a non-null raw payload (the original JSON, kept for forward compatibility) must
            // survive the round trip through the TEXT column byte-for-byte — including escaped
            // quotes and unicode from an unknown field a newer phone build might send.
            val db = inMemoryDb()
            try {
                val dao = db.cardDao()
                val raw = """{"id":"id-1","futureField":"caffè \"extra\"","emoji":"★"}"""
                dao.upsert(sample(rawPayload = raw))
                assertEquals(raw, dao.getById("id-1")?.rawPayload)
            } finally {
                db.close()
            }
        }

    @Test
    fun getByIdReturnsNullForUnknownId() =
        runTest {
            val db = inMemoryDb()
            try {
                assertNull(db.cardDao().getById("does-not-exist"))
            } finally {
                db.close()
            }
        }

    @Test
    fun emptySnapshotPrimitivesAreNoOps() =
        runTest {
            // Story 10-6 drives upsertAll/deleteAll as its snapshot primitives; an empty snapshot
            // (the phone has zero cards) is a real input and must not error.
            val db = inMemoryDb()
            try {
                val dao = db.cardDao()
                dao.deleteAll() // delete-all on an already-empty table
                dao.upsertAll(emptyList()) // upsert an empty list
                assertEquals(0, dao.count())

                dao.upsert(sample())
                dao.deleteAll() // delete-all clears the one row
                assertEquals(0, dao.count())
            } finally {
                db.close()
            }
        }

    @Test
    fun observeAllReEmitsOnWrite() {
        // AC11: a single subscription to the DAO Flow re-emits when the table changes, so Story
        // 10-6's writes reach the list with no manual refresh and no polling. Uses real
        // dispatchers (not virtual time) because Room's invalidation runs on its own executor.
        val db = inMemoryDb()
        try {
            runBlocking {
                val emissions = Channel<List<CardEntity>>(Channel.UNLIMITED)
                val collector = launch(Dispatchers.IO) { db.cardDao().observeAll().collect(emissions::send) }

                assertTrue("first emission is the empty store", withTimeout(TIMEOUT_MS) { emissions.receive() }.isEmpty())
                db.cardDao().upsert(sample())
                val afterWrite = withTimeout(TIMEOUT_MS) { emissions.receive() }
                assertEquals(1, afterWrite.size)
                assertEquals("id-1", afterWrite.first().id)

                collector.cancel()
            }
        } finally {
            db.close()
        }
    }

    private companion object {
        const val FILE_DB = "cards-reopen-test.db"
        const val TIMEOUT_MS = 5_000L
    }
}
