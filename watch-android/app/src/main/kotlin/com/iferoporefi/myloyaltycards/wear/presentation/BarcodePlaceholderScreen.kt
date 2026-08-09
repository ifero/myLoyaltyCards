package com.iferoporefi.myloyaltycards.wear.presentation

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.wear.compose.material3.MaterialTheme
import androidx.wear.compose.material3.ScreenScaffold
import androidx.wear.compose.material3.Text

/**
 * Inert destination for a row tap (AC11). Story 10-4 replaces this with the real barcode screen;
 * it deliberately renders **no** barcode — half-implementing barcode display here is explicitly
 * out of scope. It shows the tapped card's name only so the destination is not blank in dev.
 */
@Composable
fun BarcodePlaceholderScreen(cardName: String?, modifier: Modifier = Modifier) {
    ScreenScaffold(modifier = modifier) { contentPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(contentPadding)
                .padding(horizontal = 12.dp),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = cardName.orEmpty(),
                textAlign = TextAlign.Center,
                color = Color.White,
                style = MaterialTheme.typography.titleMedium,
            )
        }
    }
}
