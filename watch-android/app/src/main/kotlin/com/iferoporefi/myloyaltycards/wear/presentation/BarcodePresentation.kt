package com.iferoporefi.myloyaltycards.wear.presentation

/**
 * The title shown above the barcode as title-level context (AC1, mirroring Story 5-10 AC2 and
 * watchOS's `WatchBarcodePresentation.title`): the card's trimmed name, or a localised fallback when
 * the name is blank or absent. Pure so the fallback branch is unit-tested without a blank-named card
 * on screen; the composable passes the resolved `R.string.barcode_untitled_card`.
 */
internal fun barcodeScreenTitle(cardName: String?, fallback: String): String =
    cardName?.trim().orEmpty().ifEmpty { fallback }
