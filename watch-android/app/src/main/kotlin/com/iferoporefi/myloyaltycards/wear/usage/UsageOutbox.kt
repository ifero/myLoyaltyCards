package com.iferoporefi.myloyaltycards.wear.usage

import com.iferoporefi.myloyaltycards.wear.sync.WearSyncContract
import com.iferoporefi.myloyaltycards.wear.sync.WearSyncTransport
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import org.json.JSONObject

/**
 * The durable `CARD_USED` queue (Story 10-6, AC8/AC9/AC15).
 *
 * ### The contract, in one line
 *
 * An event is deleted **only after** the transport confirms delivery. Everything else follows
 * from that: a crash, a kill, or a flat battery at any point leaves the event queued, and the
 * next flush re-sends it. Re-sending is free because the phone dedups on `"<cardId>:<usedAt>"`,
 * so the failure mode is a duplicate attempt, never a lost open.
 *
 * ### What may leave the watch (AC8)
 *
 * [encode] is the single place a watch → phone payload is constructed, and it emits exactly
 * three values: the envelope version, the literal type `CARD_USED`, and `{ id, usedAt }`. There
 * is no code path here that can read a card's name, barcode or brand, let alone transmit one.
 * `UsageOutboxTest` asserts this against the encoded bytes rather than trusting the reading.
 *
 * ### Ordering and batching
 *
 * Events are sent oldest-first and a flush **stops at the first failure** rather than skipping
 * ahead. Application on the phone is commutative, so order is not required for correctness — but
 * stopping means one unreachable moment costs one failed attempt instead of one per queued
 * event, which matters on a battery.
 */
internal class UsageOutbox(
    private val dao: UsageOutboxDao,
    private val transport: WearSyncTransport,
) {
    /**
     * Serialises flushes. Start-up, a capability change and a fresh card open can all trigger a
     * flush within the same second; without this, two flushes could read the same batch and send
     * every event twice. Harmless on the phone thanks to dedup, but wasteful on a radio that is
     * the watch's biggest power draw.
     */
    private val flushLock = Mutex()

    /**
     * Queue one card open. Returns `true` if it was newly queued, `false` if the same
     * `"<cardId>:<usedAt>"` was already pending.
     */
    suspend fun enqueue(cardId: String, usedAt: String): Boolean {
        val event = UsageEventEntity(
            eventId = eventId(cardId, usedAt),
            cardId = cardId,
            usedAt = usedAt,
            enqueuedAt = UsageTimestamps.now(),
        )
        // `INSERT OR IGNORE` returns -1 when the row already existed.
        return dao.enqueue(event) != -1L
    }

    /**
     * Try to deliver everything queued. Returns how many events the phone accepted.
     *
     * Safe to call at any time, including with an empty queue or no phone in range.
     */
    suspend fun flush(): Int = flushLock.withLock {
        var sent = 0

        while (true) {
            val batch = dao.peek(BATCH_SIZE)
            if (batch.isEmpty()) break

            val delivered = ArrayList<String>(batch.size)
            for (event in batch) {
                if (!transport.sendMessage(encode(event))) break
                delivered += event.eventId
            }

            if (delivered.isNotEmpty()) {
                // Delete AFTER the sends, never before. If the process dies between the send and
                // this delete the event is re-sent later and deduped — the safe direction. The
                // opposite order would lose it outright.
                dao.delete(delivered)
                sent += delivered.size
            }

            // A short batch means the transport failed part-way; retrying immediately would just
            // fail again. Stop and wait for the next connectivity signal.
            if (delivered.size < batch.size) break
        }

        sent
    }

    /** Number of events still owed to the phone. Used by tests and diagnostics. */
    suspend fun pendingCount(): Int = dao.count()

    /**
     * The wire form of a usage event: `{ version, type, payload: { id, usedAt } }`.
     *
     * Identical to the envelope watchOS sends (`core/watch-connectivity.ts:107`), so the phone
     * validates both platforms with one schema and one ms-precision regex.
     */
    private fun encode(event: UsageEventEntity): String =
        JSONObject()
            .put(WearSyncContract.KEY_VERSION, WearSyncContract.PROTOCOL_VERSION)
            .put("type", WearSyncContract.TYPE_CARD_USED)
            .put(
                "payload",
                JSONObject()
                    .put("id", event.cardId)
                    .put("usedAt", event.usedAt),
            )
            .toString()

    internal companion object {
        /**
         * Events per read. Small because each one is an independent radio round trip, so a large
         * batch buys nothing and a failure part-way through a large batch wastes more work.
         */
        const val BATCH_SIZE = 25

        /** The phone's dedup id, and this table's primary key (ADR-2026-06-09-001). */
        fun eventId(cardId: String, usedAt: String): String = "$cardId:$usedAt"
    }
}
