package com.iferoporefi.myloyaltycards.wear

import org.junit.Assert.assertEquals
import org.junit.Assert.assertSame
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment

/**
 * Guards the process-singleton guarantees in [WearGraph]. Both exist because `MainActivity` is
 * recreated on every configuration change, and a per-`onCreate` instance would leak scopes and
 * re-register listeners; if a future refactor "simplifies" away a double-checked lock, one of these
 * fails.
 */
@RunWith(RobolectricTestRunner::class)
class WearGraphTest {
    private val context = RuntimeEnvironment.getApplication()

    @Test
    fun cardRepositoryIsAProcessSingleton() {
        assertSame(WearGraph.cardRepository(context), WearGraph.cardRepository(context))
    }

    /**
     * [WearGraph.startSync] must fire its side effect **at most once**, however many times it is
     * called. Without the `syncStarted` latch, every Activity recreation would open a second
     * [WearSyncCoordinator] — doubling the `DataClient`/`CapabilityClient` listener registrations
     * and the `requestCards` pings on a platform with no telemetry to ever reveal it. Only visible
     * battery drain would betray the regression, so it is pinned here instead.
     */
    @Test
    fun startSyncRunsItsSideEffectAtMostOnce() {
        WearGraph.resetSyncStateForTests()
        try {
            var starts = 0
            WearGraph.startSync(context) { starts++ }
            WearGraph.startSync(context) { starts++ }
            WearGraph.startSync(context) { starts++ }
            assertEquals(1, starts)
        } finally {
            // Leave the latch clear so a later test (or MainActivity in an instrumentation run)
            // is not blocked by state this test set.
            WearGraph.resetSyncStateForTests()
        }
    }
}
