package com.iferoporefi.myloyaltycards.wear.presentation

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.wear.compose.foundation.lazy.TransformingLazyColumn
import androidx.wear.compose.foundation.lazy.items
import androidx.wear.compose.foundation.lazy.rememberTransformingLazyColumnState
import androidx.wear.compose.material3.ListHeader
import androidx.wear.compose.material3.RadioButton
import androidx.wear.compose.material3.ScreenScaffold
import androidx.wear.compose.material3.SurfaceTransformation
import androidx.wear.compose.material3.Text
import androidx.wear.compose.material3.lazy.rememberTransformationSpec
import com.iferoporefi.myloyaltycards.wear.R
import com.iferoporefi.myloyaltycards.wear.sort.WatchSortMode

/**
 * Full-screen sort picker (AC5): the three [WatchSortMode]s as single-select [RadioButton] rows,
 * reached from the list's sort control (Open Decision 4). Selection is **double-encoded** — the
 * radio control plus the label, never colour alone — for accessibility parity with watchOS.
 *
 * Rows appear in enum declaration order (frequent → recent → A-Z). Tapping a row invokes
 * [onSelect]; the caller persists the choice and pops back so the list re-orders immediately.
 */
@Composable
fun SortPickerScreen(
    selected: WatchSortMode,
    onModeSelected: (WatchSortMode) -> Unit,
    modifier: Modifier = Modifier,
) {
    val listState = rememberTransformingLazyColumnState()
    val transformationSpec = rememberTransformationSpec()

    ScreenScaffold(scrollState = listState, modifier = modifier) { contentPadding ->
        TransformingLazyColumn(
            state = listState,
            contentPadding = contentPadding,
            modifier = Modifier.fillMaxSize(),
        ) {
            item(key = "sort-picker-title") {
                ListHeader { Text(text = stringResource(R.string.sort_title)) }
            }
            items(WatchSortMode.entries, key = { it.rawValue }) { mode ->
                RadioButton(
                    selected = mode == selected,
                    onSelect = { onModeSelected(mode) },
                    transformation = SurfaceTransformation(transformationSpec),
                    modifier = Modifier.fillMaxWidth(),
                    // Up to 2 lines: "Frequently used" would otherwise truncate beside the radio
                    // control on a narrow round screen.
                    label = { Text(text = stringResource(mode.labelRes()), maxLines = 2) },
                )
            }
        }
    }
}
