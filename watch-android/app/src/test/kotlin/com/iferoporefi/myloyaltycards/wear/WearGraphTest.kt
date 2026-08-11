package com.iferoporefi.myloyaltycards.wear

import org.junit.Assert.assertSame
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment

/**
 * Guards the process-singleton guarantee behind the scope-leak fix: [WearGraph.cardRepository] must
 * return the **same** instance across calls. If a future refactor breaks the memoization (e.g.
 * "simplifies" away the double-checked lock), the `Activity`-recreation scope leak this indirection
 * exists to prevent would silently return — and this test would fail.
 */
@RunWith(RobolectricTestRunner::class)
class WearGraphTest {
    @Test
    fun cardRepositoryIsAProcessSingleton() {
        val context = RuntimeEnvironment.getApplication()
        assertSame(WearGraph.cardRepository(context), WearGraph.cardRepository(context))
    }
}
