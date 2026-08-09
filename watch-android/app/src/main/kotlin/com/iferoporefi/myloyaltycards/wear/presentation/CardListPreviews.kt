package com.iferoporefi.myloyaltycards.wear.presentation

import androidx.compose.runtime.Composable
import androidx.wear.compose.material3.AppScaffold
import androidx.wear.compose.ui.tooling.preview.WearPreviewDevices
import com.iferoporefi.myloyaltycards.wear.data.DebugSampleCards
import com.iferoporefi.myloyaltycards.wear.presentation.theme.MyLoyaltyCardsWearTheme
import com.iferoporefi.myloyaltycards.wear.sort.WatchSortMode

/*
 * Compose previews for the card list and sort picker.
 *
 * `@WearPreviewDevices` renders each on the standard Wear device set — **round and square** — which
 * is the fastest way to eyeball the round-screen behaviour AC8 cares about (no row clipped at the
 * top/bottom, controls reachable) without booting an emulator. They reuse [DebugSampleCards]; being
 * unused `private` functions, R8 removes them — and with them that reference — from the release APK.
 */

@WearPreviewDevices
@Composable
private fun CardListPopulatedPreview() {
    MyLoyaltyCardsWearTheme {
        AppScaffold {
            CardListScreen(
                cards = DebugSampleCards.CARDS,
                sortMode = WatchSortMode.AZ,
                onCardClick = {},
                onOpenSort = {},
                onImportSampleCards = null,
            )
        }
    }
}

@WearPreviewDevices
@Composable
private fun CardListEmptyPreview() {
    MyLoyaltyCardsWearTheme {
        AppScaffold {
            CardListScreen(
                cards = emptyList(),
                sortMode = WatchSortMode.AZ,
                onCardClick = {},
                onOpenSort = {},
                onImportSampleCards = null,
            )
        }
    }
}

@WearPreviewDevices
@Composable
private fun SortPickerPreview() {
    MyLoyaltyCardsWearTheme {
        AppScaffold {
            SortPickerScreen(selected = WatchSortMode.AZ, onModeSelected = {})
        }
    }
}
