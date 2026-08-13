package com.iferoporefi.myloyaltycards.wear.sync

import androidx.room.withTransaction
import com.iferoporefi.myloyaltycards.wear.data.WearDatabase
import com.iferoporefi.myloyaltycards.wear.data.toEntity

/** What an apply attempt did. Deliberately observable so tests and callers can assert on it. */
internal sealed interface SnapshotApplyResult {
    /** The snapshot replaced the stored list. [cardCount] is the new size (`0` is legitimate). */
    data class Applied(val cardCount: Int) : SnapshotApplyResult

    /** Nothing was written. [reason] comes from [SnapshotDecodeResult.Rejected]. */
    data class Rejected(val reason: String) : SnapshotApplyResult
}

/**
 * Writes a decoded phone snapshot into the Wear OS card store (Story 10-6, AC3/AC6/AC7).
 *
 * ### Full replace, in one transaction
 *
 * The snapshot is the phone's **complete** card list, so the apply is `deleteAll` + `upsertAll`
 * inside a single Room transaction. That is Open Decision 3, and the reason is Story 16-11: the
 * phone's cloud sync shipped a deletion-blind full-fetch merge, deleted cards resurrected, and a
 * purpose-built deletion-aware merge sat dead for months. A replace cannot have that bug — a card
 * missing from the snapshot is a card that no longer exists.
 *
 * A merge would also be *more* code here, not less, which is why "simpler" and "correct" point
 * the same way for once.
 *
 * ### Why one transaction matters
 *
 * Between the delete and the insert the table is empty. Room's reactive query would happily
 * publish that empty list to the UI as a visible flash — and a crash in the window would leave
 * the watch with no cards at all. `withTransaction` makes the swap atomic and defers the
 * invalidation until commit, so observers see exactly one transition, from the old list to the
 * new one.
 *
 * ### Idempotency (AC6)
 *
 * Re-applying the same snapshot yields a byte-identical table: rows are keyed by the phone's
 * UUID and every column is taken from the payload, so nothing is derived from the current row or
 * from the clock. Out-of-order snapshots are safe for the same reason — the last one applied
 * wins in full, and there is no field whose value depends on what was there before.
 */
internal class SnapshotApplier(private val database: WearDatabase) {

    private val dao = database.cardDao()

    /** Decode [json] and, if it is well-formed, replace the stored card list with it. */
    suspend fun apply(json: String): SnapshotApplyResult =
        when (val decoded = SnapshotCodec.decode(json)) {
            is SnapshotDecodeResult.Rejected -> SnapshotApplyResult.Rejected(decoded.reason)
            is SnapshotDecodeResult.Success -> {
                val entities = decoded.cards.map { it.payload.toEntity(rawPayload = it.rawPayload) }
                database.withTransaction {
                    dao.deleteAll()
                    dao.upsertAll(entities)
                }
                SnapshotApplyResult.Applied(entities.size)
            }
        }
}
