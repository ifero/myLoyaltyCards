package com.iferoporefi.myloyaltycards.wear.presentation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.navigation.NavType
import androidx.navigation.navArgument
import androidx.wear.compose.material3.AppScaffold
import androidx.wear.compose.navigation.SwipeDismissableNavHost
import androidx.wear.compose.navigation.composable
import androidx.wear.compose.navigation.rememberSwipeDismissableNavController
import com.iferoporefi.myloyaltycards.wear.data.CardRepository
import com.iferoporefi.myloyaltycards.wear.prefs.SortPreferenceRepository
import com.iferoporefi.myloyaltycards.wear.presentation.theme.MyLoyaltyCardsWearTheme
import com.iferoporefi.myloyaltycards.wear.sort.WatchSortMode
import kotlinx.coroutines.launch

private const val ROUTE_CARDS = "cards"
private const val ROUTE_SORT = "sort"
private const val ROUTE_BARCODE = "barcode"
private const val ARG_CARD_ID = "cardId"

/**
 * Root of the Wear OS app. [AppScaffold] owns the time text across destinations; the
 * [SwipeDismissableNavHost] gives each screen the swipe-to-dismiss back gesture Wear users expect.
 *
 * State is hoisted here and read from the repositories: the cards ([CardRepository], read-only) and
 * the watch-local sort mode ([SortPreferenceRepository]). Three destinations: the list, the
 * full-screen sort picker, and the inert barcode seam Story 10-4 fills (AC11).
 *
 * @param onImportSampleCards DEBUG-only seeder passed through to the empty state; `null` in release.
 */
@Composable
fun WearApp(
    cardRepository: CardRepository,
    sortPreferenceRepository: SortPreferenceRepository,
    onImportSampleCards: (() -> Unit)? = null,
) {
    MyLoyaltyCardsWearTheme {
        val navController = rememberSwipeDismissableNavController()
        val scope = rememberCoroutineScope()
        val cards by cardRepository.cards.collectAsState()
        val sortMode by sortPreferenceRepository.sortMode.collectAsState(initial = WatchSortMode.DEFAULT)

        AppScaffold {
            SwipeDismissableNavHost(
                navController = navController,
                startDestination = ROUTE_CARDS,
            ) {
                composable(ROUTE_CARDS) {
                    CardListScreen(
                        cards = cards,
                        sortMode = sortMode,
                        onCardClick = { cardId -> navController.navigate("$ROUTE_BARCODE/$cardId") },
                        onOpenSort = { navController.navigate(ROUTE_SORT) },
                        onImportSampleCards = onImportSampleCards,
                    )
                }
                composable(ROUTE_SORT) {
                    SortPickerScreen(
                        selected = sortMode,
                        onModeSelected = { mode ->
                            // Persist watch-locally (never transmitted to the phone — AC6), then pop
                            // once the write is applied so the list is already re-ordered on return.
                            scope.launch {
                                sortPreferenceRepository.setSortMode(mode)
                                navController.popBackStack()
                            }
                        },
                    )
                }
                composable(
                    route = "$ROUTE_BARCODE/{$ARG_CARD_ID}",
                    arguments = listOf(navArgument(ARG_CARD_ID) { type = NavType.StringType }),
                ) { backStackEntry ->
                    val cardId = backStackEntry.arguments?.getString(ARG_CARD_ID)
                    val cardName = cards.firstOrNull { it.id == cardId }?.name
                    BarcodePlaceholderScreen(cardName = cardName)
                }
            }
        }
    }
}
