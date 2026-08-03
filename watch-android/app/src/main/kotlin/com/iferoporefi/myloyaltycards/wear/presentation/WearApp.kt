package com.iferoporefi.myloyaltycards.wear.presentation

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.wear.compose.material3.AppScaffold
import androidx.wear.compose.material3.MaterialTheme
import androidx.wear.compose.material3.ScreenScaffold
import androidx.wear.compose.material3.Text
import androidx.wear.compose.ui.tooling.preview.WearPreviewDevices
import com.iferoporefi.myloyaltycards.wear.R

/**
 * Root composable of the Wear OS companion app.
 *
 * [AppScaffold] and [ScreenScaffold] are the Wear Material 3 containers that own
 * the time text and (later) the scroll indicator. They are set up now so that
 * Story 10-3 can drop a real list into [ScreenScaffold] without restructuring:
 * a Wear screen is frequently round, and these scaffolds are what keep content
 * clear of the bezel.
 *
 * The default [MaterialTheme] is used on purpose — the app's own colour scheme
 * belongs with the card UI in Story 10-3, not with the scaffold.
 */
@Composable
fun WearApp() {
    MaterialTheme {
        AppScaffold {
            ScreenScaffold { contentPadding ->
                PlaceholderScreen(modifier = Modifier.padding(contentPadding))
            }
        }
    }
}

/**
 * Temporary landing screen: the app name and an empty-state line.
 *
 * Story 10-3 replaces this with the card list (with the Epic 9 favourite
 * indicator and persisted sort). Deliberately builds no card UI, no storage and
 * no sync — those belong to 10-3, 10-5 and 10-6 respectively.
 */
@Composable
fun PlaceholderScreen(modifier: Modifier = Modifier) {
    Column(
        modifier = modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(
            text = stringResource(R.string.app_name),
            textAlign = TextAlign.Center,
            style = MaterialTheme.typography.titleMedium,
        )
        Text(
            text = stringResource(R.string.placeholder_no_cards),
            textAlign = TextAlign.Center,
            style = MaterialTheme.typography.bodySmall,
        )
    }
}

@WearPreviewDevices
@Composable
private fun WearAppPreview() {
    WearApp()
}
