package com.iferoporefi.myloyaltycards.wear.data

import androidx.room.withTransaction
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn

/**
 * Room-backed [CardRepository] (Story 10.5) — the real implementation of the read seam Story 10-3
 * defined, replacing the in-memory placeholder it shipped.
 *
 * The read side satisfies 10-3's interface unchanged (AC10): [cards] is a [StateFlow] fed by the
 * DAO's reactive query, so Story 10-6's writes appear in the list with no manual refresh (AC11).
 *
 * The write side is the crux of the read-only invariant (AC9). The mutators live **on this
 * concrete class, deliberately off the [CardRepository] interface** — the watch UI is handed only
 * the interface, which has no writers, so "the watch cannot edit card data" is a compile-time fact
 * rather than a convention (`CardRepositoryReadOnlyTest` guards it structurally). This mirrors how
 * Story 10-3's `InMemoryCardRepository.seed` sat off the interface. The only callers are Story
 * 10-6's snapshot apply and the DEBUG seeder.
 *
 * Instantiate **once per process** ([com.iferoporefi.myloyaltycards.wear.WearGraph]). [cards] uses
 * [SharingStarted.WhileSubscribed], so the underlying Room query runs only while the UI observes; a
 * single long-lived instance is what makes the 5s stop timeout actually bridge a configuration
 * change (a per-`Activity` instance would be discarded on recreation and the list would re-query
 * from empty).
 *
 * @param database the process-singleton [WearDatabase]; the repository reads its DAO and uses its
 *   transaction scope for the atomic seed.
 * @param scope the process-lifetime scope the [StateFlow] shares in.
 */
class RoomCardRepository(
    private val database: WearDatabase,
    scope: CoroutineScope,
) : CardRepository {

    private val dao = database.cardDao()

    override val cards: StateFlow<List<WearCard>> =
        dao.observeAll()
            .map { entities -> entities.map(CardEntity::toWearCard) }
            .stateIn(scope, SharingStarted.WhileSubscribed(STOP_TIMEOUT_MS), emptyList())

    // --- Data-layer-internal write surface. NOT on CardRepository, so UI code cannot reach it. ---

    /**
     * Inserts or replaces [entities] (idempotent by primary key, AC5). Story 10-6's snapshot apply
     * calls this; the watch UI never can.
     */
    suspend fun upsertAll(entities: List<CardEntity>) = dao.upsertAll(entities)

    /** Removes every stored card. A primitive for Story 10-6; deletion policy is 10-6's decision. */
    suspend fun deleteAll() = dao.deleteAll()

    /**
     * Seeds [entities] only if the store is empty, atomically (AC12). The empty check and the write
     * run in **one transaction**, so once Story 10-6 adds a second writer the DEBUG seeder can never
     * interleave with a real sync and leave sample cards mixed in with synced ones. Returns whether
     * it seeded.
     */
    suspend fun seedIfEmpty(entities: List<CardEntity>): Boolean =
        database.withTransaction {
            if (dao.count() > 0) {
                false
            } else {
                dao.upsertAll(entities)
                true
            }
        }

    private companion object {
        const val STOP_TIMEOUT_MS = 5_000L
    }
}
