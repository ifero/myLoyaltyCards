package com.iferoporefi.myloyaltycards.wear.data

import kotlinx.coroutines.flow.StateFlow

/**
 * Read-only view of the locally-stored cards.
 *
 * This is the seam Story 10-3 defined and Story 10-5 implements against Room ([RoomCardRepository]).
 * It deliberately exposes **no** way to mutate card data: the watch is read-only for card data
 * (ADR-2026-06-09-001), and keeping the contract read-only is what makes that invariant a
 * compile-time fact rather than a convention — the UI is handed this interface, which has no
 * writers, so there is nothing for it to call. Any write path (Story 10-6's snapshot apply, the
 * DEBUG seeder) lives on the concrete [RoomCardRepository], off this interface.
 *
 * A [StateFlow] (not a one-shot read) so the UI recomposes when Story 10-6 pushes new cards.
 */
interface CardRepository {
    val cards: StateFlow<List<WearCard>>
}
