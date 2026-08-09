package com.iferoporefi.myloyaltycards.wear.sort

import com.iferoporefi.myloyaltycards.wear.data.WearCard
import java.text.Collator
import java.time.Instant
import java.time.OffsetDateTime
import java.time.format.DateTimeParseException
import java.util.Locale

/**
 * Orders cards for display, mirroring the phone's `features/cards/hooks/useCardSort.ts`
 * **exactly** so the watch and phone never drift. Story 9-5 settled these rules over three
 * review rounds; this ports the fixes, not the bugs it started from:
 *
 * - **`frequent`**: favourites first → `usageCount` desc → `lastUsedAt` desc → `createdAt` desc.
 *   At equal `usageCount`, a card that *has* a `lastUsedAt` outranks one that never has (the
 *   mixed-`null` tier — 9-5 review finding #1; a plain "both present?" check wrongly fell through
 *   to `createdAt`).
 * - **`recent`**: `createdAt` desc, and favourites are **NOT** pinned — matching `sortByRecent`
 *   and watchOS. (10-3 confirmed with @ifero: AC4's "every mode" wording yields to the canonical
 *   source it says to mirror.)
 * - **`az`**: favourites first → name compared with a locale-aware [Collator] at PRIMARY strength,
 *   which ignores BOTH case and diacritics — mirroring the phone's
 *   `localeCompare(…, { sensitivity: 'base' })` (9-5 review finding #5; matters for the
 *   Italian-first audience, e.g. `Èsselunga`/`esselunga`/`Esselunga` must order together).
 *
 * Dates arrive as ISO-8601 strings and are parsed only here, for comparison
 * (`docs/project-context.md`). [kotlin.collections.sortedWith] is a stable sort, matching the
 * phone's stable `Array.sort` and watchOS's stable `sorted(by:)`, so equal elements keep input
 * order across all three surfaces.
 *
 * @param collator injectable so tests can pin a locale; defaults to the device locale at PRIMARY
 *   strength. PRIMARY is what makes the A-Z comparison accent- and case-insensitive.
 */
class CardSorter(
    private val collator: Collator =
        Collator.getInstance(Locale.getDefault()).apply { strength = Collator.PRIMARY },
) {
    fun sort(cards: List<WearCard>, mode: WatchSortMode): List<WearCard> =
        cards.sortedWith(comparatorFor(mode))

    fun comparatorFor(mode: WatchSortMode): Comparator<WearCard> =
        when (mode) {
            WatchSortMode.FREQUENT -> frequentComparator
            WatchSortMode.RECENT -> recentComparator
            WatchSortMode.AZ -> azComparator
        }

    private val frequentComparator = Comparator<WearCard> { a, b ->
        val favorite = compareFavoriteFirst(a, b)
        if (favorite != 0) return@Comparator favorite

        // usageCount desc.
        if (a.usageCount != b.usageCount) return@Comparator b.usageCount.compareTo(a.usageCount)

        // lastUsedAt desc, with the mixed-null tier: a used card outranks a never-used one.
        val aLast = parseInstantOrNull(a.lastUsedAt)
        val bLast = parseInstantOrNull(b.lastUsedAt)
        when {
            // Both used: order by recency and STOP — mirrors useCardSort.ts, which returns the
            // comparison here (0 on a tie, leaving stable order) and never falls through to createdAt.
            aLast != null && bLast != null -> return@Comparator bLast.compareTo(aLast)
            aLast != null -> return@Comparator -1
            bLast != null -> return@Comparator 1
        }

        // createdAt desc — reached only when NEITHER card has ever been used.
        createdInstant(b).compareTo(createdInstant(a))
    }

    private val recentComparator = Comparator<WearCard> { a, b ->
        // createdAt desc; favourites are intentionally NOT pinned here.
        createdInstant(b).compareTo(createdInstant(a))
    }

    private val azComparator = Comparator<WearCard> { a, b ->
        val favorite = compareFavoriteFirst(a, b)
        if (favorite != 0) return@Comparator favorite
        collator.compare(a.name, b.name)
    }

    /** Mirrors `useCardSort.ts`'s `compareFavoriteFirst`: favourites sort ahead; equal → 0. */
    private fun compareFavoriteFirst(a: WearCard, b: WearCard): Int =
        if (a.isFavorite == b.isFavorite) 0 else if (a.isFavorite) -1 else 1

    /** A malformed/absent `createdAt` sorts as the epoch (oldest) so ordering stays deterministic. */
    private fun createdInstant(card: WearCard): Instant =
        parseInstantOrNull(card.createdAt) ?: Instant.EPOCH

    private fun parseInstantOrNull(value: String?): Instant? {
        if (value.isNullOrBlank()) return null
        return try {
            // The phone always emits UTC ISO-8601 with a 'Z' designator (docs/project-context.md),
            // which Instant.parse handles including optional fractional seconds.
            Instant.parse(value)
        } catch (_: DateTimeParseException) {
            // Defensive: tolerate an explicit-offset form rather than treating it as never-used.
            try {
                OffsetDateTime.parse(value).toInstant()
            } catch (_: DateTimeParseException) {
                null
            }
        }
    }
}
