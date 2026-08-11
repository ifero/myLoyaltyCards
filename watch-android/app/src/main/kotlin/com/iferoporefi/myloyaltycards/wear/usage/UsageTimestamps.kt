package com.iferoporefi.myloyaltycards.wear.usage

import java.time.Instant
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter

/**
 * Produces the millisecond-precision ISO-8601 UTC timestamps the `CARD_USED` seam requires
 * (ADR-2026-06-09-001, and the project-wide date rule "`2025-12-24T10:30:00.123Z`").
 *
 * `Instant.toString()` is **not** used because it trims trailing zeros — an open exactly on a second
 * boundary would serialise without milliseconds (`…:30Z`), which the phone's dedup regex rejects.
 * This formatter always emits exactly three fractional digits. `java.time` is available natively on
 * our minSdk 30 (added in API 26), so no desugaring is needed.
 */
object UsageTimestamps {
    private val FORMATTER: DateTimeFormatter =
        DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'").withZone(ZoneOffset.UTC)

    /** Formats [instant] as `yyyy-MM-ddTHH:mm:ss.SSSZ` in UTC. */
    fun format(instant: Instant): String = FORMATTER.format(instant)

    /** The current instant as a millisecond-precision ISO-8601 UTC string. */
    fun now(): String = format(Instant.now())
}
