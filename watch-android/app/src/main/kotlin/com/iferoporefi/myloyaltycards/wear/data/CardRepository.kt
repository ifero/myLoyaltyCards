package com.iferoporefi.myloyaltycards.wear.data

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Read-only view of the locally-stored cards.
 *
 * This is the seam Story 10-5 implements against Room. It deliberately exposes **no** way to
 * mutate card data: the watch is read-only for card data (ADR-2026-06-09-001), and keeping the
 * contract read-only is what makes that invariant a compile-time fact rather than a convention.
 *
 * A [StateFlow] (not a one-shot read) so the UI recomposes when Story 10-5/10-6 push new cards.
 */
interface CardRepository {
    val cards: StateFlow<List<WearCard>>
}

/**
 * In-memory [CardRepository] used until Story 10-5 lands Room.
 *
 * It holds cards for the lifetime of the process only — nothing is written to disk — so card
 * data can never survive a reload. That is the read-only invariant (AC13), and it is structural
 * here, not asserted. Do **not** grow this into a persistence layer: Story 5-9 removed a second
 * `UserDefaults` store on watchOS for exactly that reason, and Story 10-5 owns the real schema.
 */
class InMemoryCardRepository(initial: List<WearCard> = emptyList()) : CardRepository {
    private val mutableCards = MutableStateFlow(initial)
    override val cards: StateFlow<List<WearCard>> = mutableCards.asStateFlow()

    /**
     * Replaces the in-memory cards. Used ONLY by the DEBUG sample-card seeder and by unit tests
     * — never by production UI, which sees the read-only [CardRepository] interface. It lives on
     * the concrete class, off the interface, precisely so the read-only contract stays honest.
     */
    fun seed(cards: List<WearCard>) {
        mutableCards.value = cards
    }
}
