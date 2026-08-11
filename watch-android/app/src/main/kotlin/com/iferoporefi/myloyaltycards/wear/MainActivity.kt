package com.iferoporefi.myloyaltycards.wear

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.iferoporefi.myloyaltycards.wear.prefs.DataStoreSortPreferenceRepository
import com.iferoporefi.myloyaltycards.wear.prefs.sortPreferencesDataStore
import com.iferoporefi.myloyaltycards.wear.presentation.WearApp
import com.iferoporefi.myloyaltycards.wear.usage.NoOpCardUsageRecorder

/**
 * Sole entry point of the Wear OS companion app — a thin `setContent` host that wires the
 * repositories and hands them to [WearApp].
 *
 * Manual dependency injection keeps the module's dependency surface minimal (no Hilt). The card
 * store is a **process singleton** owned by [WearGraph] — not created here per `onCreate` — so it
 * survives Activity recreation (see [WearGraph]). Story 10-5 wires the Room-backed store behind
 * Story 10-3's read-only [com.iferoporefi.myloyaltycards.wear.data.CardRepository] interface (the
 * type [WearGraph.cardRepository] returns), so this host cannot mutate card data and the UI is
 * unchanged.
 */
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val cardRepository = WearGraph.cardRepository(applicationContext)
        val sortPreferenceRepository =
            DataStoreSortPreferenceRepository(applicationContext.sortPreferencesDataStore)

        // DEBUG-only, empty-state-gated sample-card seeder (AC12). BuildConfig.DEBUG is a
        // compile-time constant, so R8 removes this branch — and, via it, WearGraph.seedSampleCardsIfEmpty
        // and DebugSampleCards — from the release APK; the empty state only renders the seed button
        // when this callback is non-null. The seed itself is atomic + empty-state-gated inside
        // WearGraph, so it can never overwrite real cards that Story 10-6 syncs in concurrently.
        val onImportSampleCards: (() -> Unit)? =
            if (BuildConfig.DEBUG) {
                { WearGraph.seedSampleCardsIfEmpty(applicationContext) }
            } else {
                null
            }

        // Usage-event seam (AC8 of Story 10-4). No-op until Story 10-6 supplies a Wearable Data
        // Layer-backed recorder here — the only line that needs to change to wire CARD_USED.
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
