package com.iferoporefi.myloyaltycards.wear.data

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * The one persisted row shape for a loyalty card on Wear OS (Story 10.5).
 *
 * Mirrors watchOS's `WatchCardEntity` (`targets/watch/WatchCardEntity.swift`) and the phone's
 * `WatchCardPayload` wire contract (`core/watch-connectivity.ts`), so the three platforms share
 * one vocabulary. **This is the only card-storage surface on the watch.** There is no
 * `SharedPreferences`/JSON/in-memory cache alongside it — Story 5-9 existed solely to delete a
 * second surface on watchOS before public release, and Wear OS starts clean, so it stays clean.
 *
 * Two deliberate divergences from the watchOS mirror, each documented at [rawPayload] and on the
 * date fields:
 *
 * 1. **Dates are `String`, not a date/instant column type.** This is the documented project rule
 *    ("store dates as strings, parse only for display"), which the watchOS entity does *not*
 *    follow (it uses `Date`). It is load-bearing here: Story 10-6's usage-event dedup key is
 *    `"<cardId>:<usedAt>"` at millisecond precision (ADR-2026-06-09-001), and round-tripping
 *    through a date type is exactly how milliseconds are silently dropped. ISO-8601 UTC strings
 *    also sort lexicographically in chronological order, so the sort in
 *    [com.iferoporefi.myloyaltycards.wear.sort.CardSorter] needs no parsing.
 * 2. **`rawPayload` is TEXT (`String?`), not a `Data?`/BLOB.** See [rawPayload].
 *
 * Column names are the Kotlin property names (Room's default), i.e. camelCase, mirroring the
 * watchOS `@Model` — this is a platform-native store, deliberately **not** the phone's shared
 * `snake_case` SQLite schema (which is never shared with the watch; see the story's
 * "Relationship to the phone's database").
 *
 * @property id The phone-generated UUID. Primary key; upserts key on it, which is what makes
 *   Story 10-6's full-snapshot re-application idempotent (AC5).
 * @property barcode The barcode payload. The wire field is `barcodeValue`; the rename is done in
 *   exactly one place ([WatchCardPayload.toEntity]).
 * @property color The card colour as sent by the phone (`#RRGGBB` or a virtual-logo palette key).
 *   The wire field is `colorHex`; renamed at the same one boundary.
 * @property isFavorite Defaults to `false` when a payload omits it (Story 9-4's backward-compatible
 *   requirement — "no crash, no data loss"). The default lives on [WatchCardPayload].
 * @property lastUsedAt ISO-8601 UTC millisecond string, or `null` if never used.
 * @property createdAt ISO-8601 UTC millisecond string.
 * @property updatedAt Nullable and **currently always `null`**: the wire payload carries no
 *   `updatedAt` (Open Decision 3), so there is nothing to populate it with. The column exists so
 *   that if the phone ever starts sending one, it can be stored without a migration — but it is
 *   never synthesised locally, because a locally-stamped `updatedAt` reads as phone-authoritative
 *   when it is not (the trap watchOS fell into).
 * @property rawPayload The original decoded payload as JSON **text**, for forward compatibility
 *   (AC8): a field added by a newer phone build is preserved here rather than lost. Stored as
 *   `String?` rather than watchOS's `Data?`/BLOB because the payload is JSON to begin with, so the
 *   text is lossless, inspectable and needs no `TypeConverter`. Story 10-6 is responsible for
 *   stripping `barcodeImageBase64` (the largest field, never read since 10-4 renders locally —
 *   Open Decision 4) before handing the raw text here.
 */
@Entity(tableName = "cards")
data class CardEntity(
    @PrimaryKey val id: String,
    val name: String,
    val barcode: String,
    val barcodeFormat: String,
    val brandId: String? = null,
    val color: String,
    val isFavorite: Boolean = false,
    val lastUsedAt: String? = null,
    val usageCount: Int = 0,
    val createdAt: String,
    val updatedAt: String? = null,
    val rawPayload: String? = null,
)
