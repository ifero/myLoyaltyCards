package com.iferoporefi.myloyaltycards.wear

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.iferoporefi.myloyaltycards.wear.presentation.WearApp

/**
 * Sole entry point of the Wear OS companion app.
 *
 * Story 10-3 replaces the placeholder content with the real card list; this
 * class is expected to stay a thin `setContent` host.
 */
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { WearApp() }
    }
}
