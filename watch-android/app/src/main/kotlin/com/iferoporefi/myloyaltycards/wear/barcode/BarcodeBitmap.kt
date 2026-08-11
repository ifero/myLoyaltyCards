package com.iferoporefi.myloyaltycards.wear.barcode

import android.graphics.Bitmap
import android.graphics.Color
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import com.google.zxing.common.BitMatrix

/**
 * Converts a ZXing [BitMatrix] into an opaque **black-on-white** [ImageBitmap] for display.
 *
 * White background, black bars is a hardware-scanner requirement (the UX spec's "Luminance
 * Scannability"), not an aesthetic choice — so it is fixed here, never themed. The matrix already
 * carries ZXing's quiet zone; this copies it pixel-for-pixel and crops **nothing**, because a
 * cropped quiet zone is exactly what stops a scanner from reading the symbol.
 *
 * This is the one barcode function that touches Android types, so it is validated on-device
 * (AC4/AC12) rather than in a JVM unit test. Call it off the main thread — the pixel copy for a
 * large QR is cheap but not free (AC10).
 */
fun BitMatrix.toBarcodeImageBitmap(): ImageBitmap {
    val bitmapWidth = width
    val bitmapHeight = height
    val pixels = IntArray(bitmapWidth * bitmapHeight)
    for (y in 0 until bitmapHeight) {
        val rowOffset = y * bitmapWidth
        for (x in 0 until bitmapWidth) {
            pixels[rowOffset + x] = if (this[x, y]) Color.BLACK else Color.WHITE
        }
    }
    return Bitmap.createBitmap(pixels, bitmapWidth, bitmapHeight, Bitmap.Config.ARGB_8888)
        .asImageBitmap()
}
