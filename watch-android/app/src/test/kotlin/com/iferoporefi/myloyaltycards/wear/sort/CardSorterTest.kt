package com.iferoporefi.myloyaltycards.wear.sort

import com.iferoporefi.myloyaltycards.wear.data.WearCard
import java.text.Collator
import java.util.Locale
import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * Verifies the sort comparators mirror `features/cards/hooks/useCardSort.ts` exactly (AC4, AC5, AC7),
 * including the two fixes story 9-5's review produced: the `frequent` mixed-`null` tier (finding #1)
 * and diacritic-insensitive A-Z (finding #5). Uses an Italian collator so the accent test is
 * deterministic regardless of the host locale.
 */
class CardSorterTest {
    private val sorter = CardSorter(
        Collator.getInstance(Locale.ITALIAN).apply { strength = Collator.PRIMARY },
    )

    private fun card(
        id: String,
        name: String = id,
        usageCount: Int = 0,
        lastUsedAt: String? = null,
        createdAt: String = "2026-01-01T00:00:00.000Z",
        isFavorite: Boolean = false,
    ) = WearCard(
        id = id,
        name = name,
        usageCount = usageCount,
        lastUsedAt = lastUsedAt,
        createdAt = createdAt,
        isFavorite = isFavorite,
    )

    private fun ids(cards: List<WearCard>, mode: WatchSortMode) = sorter.sort(cards, mode).map { it.id }

    @Test
    fun frequent_favouritesFirstThenUsageDesc() {
        val fav = card("fav", usageCount = 1, isFavorite = true)
        val high = card("high", usageCount = 10, lastUsedAt = "2026-06-01T00:00:00.000Z")
        val mid = card("mid", usageCount = 5)
        assertEquals(listOf("fav", "high", "mid"), ids(listOf(mid, high, fav), WatchSortMode.FREQUENT))
    }

    @Test
    fun frequent_usedCardOutranksNeverUsedAtEqualUsage_mixedNullTier() {
        // 9-5 review finding #1: at equal usageCount, a card that HAS been used outranks one that
        // never has — not a fall-through to createdAt.
        val used = card("used", usageCount = 5, lastUsedAt = "2020-01-01T00:00:00.000Z")
        val never = card("never", usageCount = 5, lastUsedAt = null, createdAt = "2026-12-01T00:00:00.000Z")
        assertEquals(listOf("used", "never"), ids(listOf(never, used), WatchSortMode.FREQUENT))
    }

    @Test
    fun frequent_moreRecentlyUsedFirstAtEqualUsage() {
        val newer = card("newer", usageCount = 5, lastUsedAt = "2026-06-01T00:00:00.000Z")
        val older = card("older", usageCount = 5, lastUsedAt = "2026-01-01T00:00:00.000Z")
        assertEquals(listOf("newer", "older"), ids(listOf(older, newer), WatchSortMode.FREQUENT))
    }

    @Test
    fun frequent_equalLastUsedAt_keepsInputOrderAndDoesNotTieBreakOnCreatedAt() {
        // Both used at the SAME instant with equal usageCount: mirror useCardSort.ts, which returns
        // the comparison here (0 on a tie) and NEVER falls through to createdAt. Stable order wins,
        // regardless of createdAt — so input order is preserved both ways.
        val a = card("a", usageCount = 5, lastUsedAt = "2026-06-01T00:00:00.000Z", createdAt = "2020-01-01T00:00:00.000Z")
        val b = card("b", usageCount = 5, lastUsedAt = "2026-06-01T00:00:00.000Z", createdAt = "2026-01-01T00:00:00.000Z")
        assertEquals(listOf("a", "b"), ids(listOf(a, b), WatchSortMode.FREQUENT))
        assertEquals(listOf("b", "a"), ids(listOf(b, a), WatchSortMode.FREQUENT))
    }

    @Test
    fun frequent_bothNeverUsed_fallThroughToCreatedAtDesc() {
        // Symmetric both-null tier: equal usageCount, neither ever used → createdAt desc, mirroring
        // useCardSort.ts's final fallback.
        val newer = card("newer", usageCount = 3, lastUsedAt = null, createdAt = "2026-06-01T00:00:00.000Z")
        val older = card("older", usageCount = 3, lastUsedAt = null, createdAt = "2026-01-01T00:00:00.000Z")
        assertEquals(listOf("newer", "older"), ids(listOf(older, newer), WatchSortMode.FREQUENT))
    }

    @Test
    fun recent_ordersByCreatedDescAndDoesNotPinFavourites() {
        // The decision @ifero confirmed: favourites are NOT pinned in "Recently added".
        val favOld = card("favOld", createdAt = "2026-01-01T00:00:00.000Z", isFavorite = true)
        val plainNew = card("plainNew", createdAt = "2026-06-01T00:00:00.000Z")
        assertEquals(listOf("plainNew", "favOld"), ids(listOf(favOld, plainNew), WatchSortMode.RECENT))
    }

    @Test
    fun az_pinsFavouritesThenOrdersByName() {
        val zFav = card("z", name = "Zeta", isFavorite = true)
        val aPlain = card("a", name = "Alpha")
        assertEquals(listOf("z", "a"), ids(listOf(aPlain, zFav), WatchSortMode.AZ))
    }

    @Test
    fun az_isCaseAndDiacriticInsensitive_andStable() {
        // AC7: "Èsselunga", "esselunga" and "Esselunga" order together. With a PRIMARY collator they
        // compare equal, so the stable sort keeps their input order between "Alpha" and "Zeta".
        val alpha = card("alpha", name = "Alpha")
        val lower = card("lower", name = "esselunga")
        val accented = card("accented", name = "Èsselunga")
        val capital = card("capital", name = "Esselunga")
        val zeta = card("zeta", name = "Zeta")
        val result = ids(listOf(zeta, lower, accented, capital, alpha), WatchSortMode.AZ)
        assertEquals(listOf("alpha", "lower", "accented", "capital", "zeta"), result)
    }
}
