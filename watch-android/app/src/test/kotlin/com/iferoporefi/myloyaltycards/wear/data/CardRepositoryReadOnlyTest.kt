package com.iferoporefi.myloyaltycards.wear.data

import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * AC9, the **hardened** Story 9-5 form — deliberately not the vacuous version 9-5 replaced.
 *
 * The watch is read-only for card data (ADR-2026-06-09-001). The UI is handed the [CardRepository]
 * interface (see `WearApp(cardRepository: CardRepository, …)`), so the invariant is structural: the
 * interface must expose only the read-only [CardRepository.cards] stream and no card-mutation
 * method. Asserting the interface's method set proves exactly that — if anyone later adds a writer
 * (`upsert`/`delete`/`update`/`set…`) to [CardRepository], the UI could mutate card data and **this
 * test fails**.
 *
 * A `.copy()` on the immutable [WearCard] value cannot test this — it touches nothing and can never
 * fail — which is precisely why the value-copy form is vacuous. The concrete
 * [RoomCardRepository]'s write methods are intentionally off this interface and so are invisible to
 * the UI; they are not part of this contract.
 */
class CardRepositoryReadOnlyTest {
    @Test
    fun interfaceExposesOnlyTheReadOnlyCardsStream() {
        val methodNames = CardRepository::class.java.declaredMethods.map { it.name }.toSet()
        // A read-only `val cards` compiles to exactly one accessor: `getCards`. Any mutator added to
        // the interface would add a method to this set and fail the assertion.
        assertEquals(setOf("getCards"), methodNames)
    }
}
