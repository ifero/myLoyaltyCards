package com.iferoporefi.myloyaltycards.wear.usage

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query

/**
 * Data-access object for the `CARD_USED` outbox (Story 10-6, AC9).
 *
 * Four operations, matching the four things a durable queue must do: enqueue without
 * duplicating, read the oldest batch, delete only what was confirmed sent, and report depth.
 * There is deliberately no "mark as sending" state — an in-flight marker would need its own
 * crash recovery, whereas "still present means still owed" needs none.
 */
@Dao
interface UsageOutboxDao {
    /**
     * Enqueue [event], ignoring it if its id is already queued.
     *
     * [OnConflictStrategy.IGNORE] — never `REPLACE`. The row is immutable once written, and a
     * replace would reset [UsageEventEntity.enqueuedAt] and so reorder the queue on a duplicate.
     */
    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun enqueue(event: UsageEventEntity): Long

    /**
     * The oldest [limit] queued events.
     *
     * Ordered by `usedAt` then `eventId`: `usedAt` is an ISO-8601 UTC millisecond string, so it
     * sorts chronologically without parsing, and `eventId` makes the order total when two opens
     * land in the same millisecond. A total order is what stops a persistently failing head from
     * being reshuffled out of view on each attempt.
     */
    @Query("SELECT * FROM usage_outbox ORDER BY usedAt ASC, eventId ASC LIMIT :limit")
    suspend fun peek(limit: Int): List<UsageEventEntity>

    /** Remove the events in [eventIds]. Called **only** after a confirmed send. */
    @Query("DELETE FROM usage_outbox WHERE eventId IN (:eventIds)")
    suspend fun delete(eventIds: List<String>)

    /** Number of events still owed to the phone. */
    @Query("SELECT COUNT(*) FROM usage_outbox")
    suspend fun count(): Int
}
