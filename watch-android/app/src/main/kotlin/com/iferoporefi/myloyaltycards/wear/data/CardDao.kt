package com.iferoporefi.myloyaltycards.wear.data

import androidx.room.Dao
import androidx.room.Query
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

/**
 * Data-access object for the single [CardEntity] table (Story 10.5).
 *
 * The surface is deliberately narrow: a reactive read, a point read, idempotent upserts, and the
 * two primitives Story 10-6 needs to apply a snapshot ([deleteAll] + [upsertAll]). It exposes **no
 * content-mutation query** (no "update name", no "set favourite") — the watch is read-only for
 * card data (ADR-2026-06-09-001), and the DAO is where that would leak in if it were going to.
 *
 * **Deletion semantics are not decided here.** This DAO offers `delete-all` and `upsert` as
 * separate primitives on purpose; whether a phone snapshot *replaces* or *merges* — and therefore
 * how a card deleted on the phone disappears from the watch — is Story 10-6's call. Story 16-11
 * shipped a deletion-blind merge on the phone that resurrected deleted cards, so this boundary is
 * left explicit rather than baked into a convenience method here.
 */
@Dao
interface CardDao {
    /**
     * Observes every stored card, re-emitting whenever the table changes (AC11). Room runs the
     * query on its own executor, so the list is never gathered on the main thread, and Story
     * 10-6's writes surface without any manual refresh or polling.
     */
    @Query("SELECT * FROM cards")
    fun observeAll(): Flow<List<CardEntity>>

    /** One-shot read of a single card by [id], or `null` if it is not stored. */
    @Query("SELECT * FROM cards WHERE id = :id")
    suspend fun getById(id: String): CardEntity?

    /**
     * Inserts [card], or replaces the existing row with the same [CardEntity.id]. Keying on the
     * primary key is what makes re-applying the same payload idempotent (AC5): applying it twice
     * leaves exactly one row with identical contents.
     */
    @Upsert
    suspend fun upsert(card: CardEntity)

    /** Batch [upsert]. Used by Story 10-6's snapshot apply and the DEBUG seeder. */
    @Upsert
    suspend fun upsertAll(cards: List<CardEntity>)

    /** Removes every card. A primitive for Story 10-6; not a full-snapshot policy in itself. */
    @Query("DELETE FROM cards")
    suspend fun deleteAll()

    /** Number of stored cards. Backs the DEBUG seeder's empty-state gate (AC12). */
    @Query("SELECT COUNT(*) FROM cards")
    suspend fun count(): Int
}
