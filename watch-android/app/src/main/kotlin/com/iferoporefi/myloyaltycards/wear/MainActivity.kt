package com.iferoporefi.myloyaltycards.wear

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.iferoporefi.myloyaltycards.wear.data.DebugSampleCards
import com.iferoporefi.myloyaltycards.wear.data.InMemoryCardRepository
import com.iferoporefi.myloyaltycards.wear.prefs.DataStoreSortPreferenceRepository
import com.iferoporefi.myloyaltycards.wear.prefs.sortPreferencesDataStore
import com.iferoporefi.myloyaltycards.wear.presentation.WearApp
import com.iferoporefi.myloyaltycards.wear.usage.NoOpCardUsageRecorder

/**
 * Sole entry point of the Wear OS companion app — a thin `setContent` host that wires the
 * repositories and hands them to [WearApp].
 *
 * Manual dependency injection keeps the module's dependency surface minimal (no Hilt). Story 10-5
 * swaps [InMemoryCardRepository] for a Room-backed implementation behind the same
 * [com.iferoporefi.myloyaltycards.wear.data.CardRepository] interface.
 */
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val cardRepository = InMemoryCardRepository()
        val sortPreferenceRepository =
            DataStoreSortPreferenceRepository(applicationContext.sortPreferencesDataStore)

        // DEBUG-only sample-card seeder. BuildConfig.DEBUG is a compile-time constant, so R8 strips
        // this branch (and DebugSampleCards) from the release APK; the empty state only renders the
        // seed button when this callback is non-null.
        val onImportSampleCards: (() -> Unit)? =
            if (BuildConfig.DEBUG) {
                { cardRepository.seed(DebugSampleCards.CARDS) }
            } else {
                null
            }

        // Usage-event seam (AC8). No-op until Story 10-6 supplies a Wearable Data Layer-backed
        // recorder here — the only line that needs to change to wire CARD_USED emission.
        val usageRecorder = NoOpCardUsageRecorder

        setContent {
            WearApp(
                cardRepository = cardRepository,
                sortPreferenceRepository = sortPreferenceRepository,
                usageRecorder = usageRecorder,
                onImportSampleCards = onImportSampleCards,
            )
        }
    }
}
