package com.iferoporefi.myloyaltycards.wear.usage

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * One `CARD_USED` event waiting to reach the phone (Story 10-6, AC9).
 *
 * ### Why this table exists at all
 *
 * watchOS gets this for free: `transferUserInfo` is an OS-level FIFO that survives
 * disconnection. **The Wearable Data Layer has no equivalent.** `MessageClient` is
 * fire-and-forget and needs a live connection, and a card open happens in the two seconds after
 * a wrist raise — exactly when the transport is least likely to be ready. So the queue has to be
 * ours, and it has to be on disk: the watch app is killed aggressively between glances, and an
 * in-memory buffer would lose every event the moment the user drops their wrist.
 *
 * It lives in Story 10-5's Room database as its **own table**, never mixed into `cards`
 * (Open Decision 2). The cards table is a replica of the phone's state; this one is local,
 * mutable, outbound work.
 *
 * ### The primary key is the dedup key
 *
 * [eventId] is `"<cardId>:<usedAt>"` — the exact id the phone dedups on
 * (ADR-2026-06-09-001). Making it the primary key means an `INSERT OR IGNORE` collapses a
 * double-enqueue at the storage layer, so "never duplicated" (AC9) holds without a single line
 * of comparison logic. It also means the watch and the phone agree on what "the same event"
 * means, rather than each having its own opinion.
 *
 * @property eventId `"<cardId>:<usedAt>"`. Primary key, and the phone's dedup id.
 * @property cardId The phone-generated card UUID.
 * @property usedAt ISO-8601 UTC at **millisecond** precision. Second precision is non-conformant
 *   — the phone's validator rejects it with a regex and the event is dropped in silence, which
 *   is why [com.iferoporefi.myloyaltycards.wear.usage.UsageTimestamps] never uses
 *   `Instant.toString()`.
 * @property enqueuedAt When the watch recorded it. Never transmitted; it exists so a stuck queue
 *   is diagnosable and so ordering is stable when two events share a `usedAt`.
 */
@Entity(tableName = "usage_outbox")
data class UsageEventEntity(
    @PrimaryKey val eventId: String,
    val cardId: String,
    val usedAt: String,
    val enqueuedAt: String,
)
