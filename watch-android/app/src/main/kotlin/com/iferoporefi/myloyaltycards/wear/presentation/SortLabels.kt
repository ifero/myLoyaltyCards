package com.iferoporefi.myloyaltycards.wear.presentation

import androidx.annotation.StringRes
import com.iferoporefi.myloyaltycards.wear.R
import com.iferoporefi.myloyaltycards.wear.sort.WatchSortMode

/** The localized label resource for a sort mode. Kept out of the (pure) enum so the enum has no
 *  dependency on Android resources. */
@StringRes
fun WatchSortMode.labelRes(): Int = when (this) {
    WatchSortMode.FREQUENT -> R.string.sort_frequent
    WatchSortMode.RECENT -> R.string.sort_recent
    WatchSortMode.AZ -> R.string.sort_az
}
