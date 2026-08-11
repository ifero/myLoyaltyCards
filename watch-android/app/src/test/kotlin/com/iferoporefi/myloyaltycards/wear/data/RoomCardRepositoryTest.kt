package com.iferoporefi.myloyaltycards.wear.data

import androidx.room.Room
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment

/**
 * [RoomCardRepository] — Story 10-3's read seam, now Room-backed (AC10, AC11). Robolectric supplies
 * the Context; real dispatchers (not virtual time) because Room's invalidation runs on its own
 * executor, so a real subscriber is what observes an emission.
 *
 * The read-only invariant (AC9) is guarded structurally in `CardRepositoryReadOnlyTest`;
 * persistence-across-reopen (AC1/AC3) is covered in `CardDaoTest.cardsSurviveAStoreReopen`.
 */
@RunWith(RobolectricTestRunner::class)
class RoomCardRepositoryTest {
    private val context = RuntimeEnvironment.getApplication()

    private fun inMemoryDb(): WearDatabase =
        Room.inMemoryDatabaseBuilder(context, WearDatabase::class.java).build()

    private fun sample(id: String = "id-1", name: String = "Esselunga") =
        CardEntity(
            id = id,
            name = name,
            barcode = "5901234123457",
            barcodeFormat = "EAN13",
            brandId = "esselunga",
            color = "#1A73E8",
            isFavorite = true,
            lastUsedAt = "2026-08-01T09:00:00.123Z",
            usageCount = 12,
            createdAt = "2026-01-10T09:00:00.000Z",
        )

    @Test
    fun cardsFlowReEmitsToAnOpenSubscriberOnWrite() {
        // AC10 + AC11: an ALREADY-OPEN subscriber to the read-only StateFlow — the UI's shape
        // (WearApp's `cardRepository.cards.collectAsState()`) — observes a LATER write with no
        // manual refresh. This proves the repository's own `.map{}.stateIn(...)` wrapper is live,
        // not a one-shot re-query (a regression there would only be caught here, not by the DAO test).
        val db = inMemoryDb()
        val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
        val repository = RoomCardRepository(db, scope)
        try {
            runBlocking {
                // Pre-seed one card so the first non-empty emission proves the upstream Room observer
                // is registered — this removes the subscribe/write registration race that a bare
                // "consume empty, then write" would have.
                repository.upsertAll(listOf(sample(id = "id-1")))

                val emissions = Channel<List<WearCard>>(Channel.UNLIMITED)
                val collector = launch(Dispatchers.IO) { repository.cards.collect(emissions::send) }

                var latest = withTimeout(TIMEOUT_MS) { emissions.receive() }
                while (latest.none { it.id == "id-1" }) latest = withTimeout(TIMEOUT_MS) { emissions.receive() }
                // WearCards are mapped from entities at the boundary (rename applied).
                assertEquals("5901234123457", latest.first { it.id == "id-1" }.barcodeValue)
                assertEquals("#1A73E8", latest.first { it.id == "id-1" }.colorHex)

                // A later write must reach the SAME open subscriber. A one-shot `stateIn` regression
                // would never deliver this and the test would time out.
                repository.upsertAll(listOf(sample(id = "id-2", name = "Coop")))
                var updated = withTimeout(TIMEOUT_MS) { emissions.receive() }
                while (updated.size < 2) updated = withTimeout(TIMEOUT_MS) { emissions.receive() }
                assertEquals(setOf("id-1", "id-2"), updated.map { it.id }.toSet())

                collector.cancel()
            }
        } finally {
            scope.cancel()
            db.close()
        }
    }

    @Test
    fun seedIfEmptyOnlyWritesIntoAnEmptyStore() {
        // AC12: the seeder writes into an empty store, and once cards exist it is a no-op (so it can
        // never clobber real synced cards). The empty-check + write are one transaction.
        val db = inMemoryDb()
        val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
        val repository = RoomCardRepository(db, scope)
        try {
            runBlocking {
                assertEquals(true, repository.seedIfEmpty(listOf(sample())))
                // A second call is a no-op: the store is no longer empty.
                assertEquals(false, repository.seedIfEmpty(listOf(sample(id = "id-2"))))
                val cards = withTimeout(TIMEOUT_MS) { repository.cards.first { it.isNotEmpty() } }
                assertEquals(listOf("id-1"), cards.map { it.id })
            }
        } finally {
            scope.cancel()
            db.close()
        }
    }

    private companion object {
        const val TIMEOUT_MS = 5_000L
    }
}
