package com.iferoporefi.myloyaltycards.wear.prefs

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.emptyPreferences
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.iferoporefi.myloyaltycards.wear.sort.WatchSortMode
import java.io.IOException
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.map

/**
 * Persists the watch-local sort preference.
 *
 * The choice is stored on the watch under its **own** key and is **never** transmitted to the
 * phone (AC6). That is allowed because a sort preference is UI state, not card data, so it does
 * not violate the watch's read-only rule (ADR-2026-06-09-001).
 */
interface SortPreferenceRepository {
    /** The current mode, defaulting to [WatchSortMode.DEFAULT] (A-Z) before anything is saved. */
    val sortMode: Flow<WatchSortMode>

    /** Persists [mode]. Suspends until the write completes. */
    suspend fun setSortMode(mode: WatchSortMode)
}

/**
 * [SortPreferenceRepository] backed by Jetpack DataStore (Preferences) — async-safe and the
 * current AndroidX recommendation over `SharedPreferences` (Open Decision 3).
 *
 * @param dataStore injected so unit tests can supply a temp-file-backed store (see
 *   `SortPreferenceRepositoryTest`); production wires [sortPreferencesDataStore].
 */
class DataStoreSortPreferenceRepository(
    private val dataStore: DataStore<Preferences>,
) : SortPreferenceRepository {

    override val sortMode: Flow<WatchSortMode> =
        dataStore.data
            // A corrupt/unreadable store degrades to the A-Z default rather than crashing the
            // list — the documented DataStore read pattern.
            .catch { throwable -> if (throwable is IOException) emit(emptyPreferences()) else throw throwable }
            .map { preferences -> WatchSortMode.fromRawValue(preferences[SORT_MODE_KEY]) }

    override suspend fun setSortMode(mode: WatchSortMode) {
        dataStore.edit { preferences -> preferences[SORT_MODE_KEY] = mode.rawValue }
    }

    private companion object {
        /**
         * Mirrors watchOS's `@AppStorage("watch.sortMode")` key — the watch's own namespace.
         * Stores the stable [WatchSortMode.rawValue], never the enum ordinal, so reordering the
         * enum can never silently change what a saved preference means.
         */
        val SORT_MODE_KEY = stringPreferencesKey("watch.sortMode")
    }
}

/**
 * Process-wide DataStore for watch preferences, created lazily on first access. A single instance
 * per process is a DataStore requirement.
 */
val Context.sortPreferencesDataStore: DataStore<Preferences> by preferencesDataStore(name = "watch_preferences")
