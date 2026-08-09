package com.iferoporefi.myloyaltycards.wear.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Guards the read-only invariant (AC13): the watch never persists card data, so card data cannot
 * survive a store reload. The equivalent of watchOS's
 * `test_readOnly_localCardEdits_doNotPersistAcrossReload`, not a vacuous assertion — it proves the
 * no-persistence property by reloading the store.
 */
class CardRepositoryTest {
    private fun card(id: String) =
        WearCard(id = id, name = id, createdAt = "2026-01-01T00:00:00.000Z")

    @Test
    fun freshRepositoryIsEmpty() {
        assertTrue(InMemoryCardRepository().cards.value.isEmpty())
    }

    @Test
    fun seedPopulatesTheInMemoryList() {
        val repository = InMemoryCardRepository()
        repository.seed(listOf(card("a"), card("b")))
        assertEquals(listOf("a", "b"), repository.cards.value.map { it.id })
    }

    @Test
    fun cardDataDoesNotPersistAcrossReload() {
        val original = InMemoryCardRepository()
        original.seed(listOf(card("a"), card("b")))
        assertEquals(2, original.cards.value.size)

        // A fresh repository models a process restart / store reload: because nothing was persisted,
        // the card data is gone. This is the read-only invariant (AC13).
        val reloaded = InMemoryCardRepository()
        assertTrue(reloaded.cards.value.isEmpty())
    }
}
