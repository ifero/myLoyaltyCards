package com.iferoporefi.myloyaltycards.wear.prefs

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import androidx.datastore.preferences.core.Preferences
import com.iferoporefi.myloyaltycards.wear.sort.WatchSortMode
import java.io.File
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder

/**
 * Verifies the sort preference round-trips through DataStore and defaults to A-Z (AC6). Uses a
 * temp-file-backed [PreferenceDataStoreFactory] store on the test coroutine scope — a real
 * round-trip, runnable as a plain JVM unit test (no Android Context).
 */
class SortPreferenceRepositoryTest {
    @get:Rule
    val temporaryFolder = TemporaryFolder()

    private fun TestScope.newRepository(): DataStoreSortPreferenceRepository {
        val dataStore: DataStore<Preferences> =
            PreferenceDataStoreFactory.create(scope = backgroundScope) {
                File(temporaryFolder.root, "watch.preferences_pb")
            }
        return DataStoreSortPreferenceRepository(dataStore)
    }

    @Test
    fun defaultsToAzBeforeAnythingIsSaved() = runTest {
        assertEquals(WatchSortMode.AZ, newRepository().sortMode.first())
    }

    @Test
    fun persistsAndReadsBackTheSelectedMode() = runTest {
        val repository = newRepository()

        repository.setSortMode(WatchSortMode.FREQUENT)
        assertEquals(WatchSortMode.FREQUENT, repository.sortMode.first())

        repository.setSortMode(WatchSortMode.RECENT)
        assertEquals(WatchSortMode.RECENT, repository.sortMode.first())
    }
}
