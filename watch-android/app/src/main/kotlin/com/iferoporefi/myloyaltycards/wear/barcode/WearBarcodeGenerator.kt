package com.iferoporefi.myloyaltycards.wear.barcode

import androidx.compose.runtime.Stable
import com.google.zxing.BarcodeFormat
import com.google.zxing.EncodeHintType
import com.google.zxing.MultiFormatWriter
import com.google.zxing.WriterException
import com.google.zxing.common.BitMatrix
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel

/**
 * Outcome of a barcode-generation request.
 *
 * The two error arms are deliberately distinct because their user remedies differ (Task 4): an
 * [UnsupportedFormat] card must be re-added on the phone, whereas an [InvalidValue] means the stored
 * barcode itself is wrong. Neither is ever a blank screen or a silently-wrong symbol (AC2).
 */
sealed interface BarcodeResult {
    /** A rendered symbol as a pure-JVM [BitMatrix] — `true` = a black module, `false` = white. */
    data class Success(val matrix: BitMatrix) : BarcodeResult

    /** The format string is not one of the six known symbologies (unknown, empty, or blank). */
    data object UnsupportedFormat : BarcodeResult

    /** The value is empty or invalid for its format — e.g. a bad EAN-13 check digit, or a CODE39
     *  value containing an out-of-charset character. ZXing validates and rejects these for us. */
    data object InvalidValue : BarcodeResult
}

/**
 * Generates scannable barcodes for the app's six formats using ZXing, caching the pure-JVM
 * [BitMatrix] per (value, format, size) so re-opening a card never re-encodes (AC10).
 *
 * ZXing does the encoding maths — deliberately **not** a port of watchOS's 500-line hand-rolled
 * EAN-13/Code128 encoders (`BarcodeGenerator.swift`), which exist only because watchOS ships no
 * barcode library. ZXing computes and validates check digits, so a wrong value fails loudly here
 * rather than producing a plausible-but-unscannable symbol.
 *
 * Every method is pure JVM (no Android types), so it is unit-tested without an emulator. The caller
 * converts a [BarcodeResult.Success] matrix to an `android.graphics.Bitmap` at the Compose edge
 * (see `BarcodeBitmap`), off the main thread.
 *
 * `@Stable`: held for the app's lifetime (stable identity) with no observable mutable public state —
 * the cache is a private implementation detail — so Compose can keep skip-optimisations for
 * composables that take it as a parameter. The annotation is Compose-runtime metadata only, not an
 * Android type, so the JVM unit tests still run without an emulator.
 *
 * @param maxCacheEntries retained-barcode cap; a watch shows one barcode at a time, so a handful
 *   covers re-opens and round/square resizes.
 */
@Stable
class WearBarcodeGenerator(maxCacheEntries: Int = DEFAULT_CACHE_ENTRIES) {
    private val cache = BarcodeCache<BarcodeResult>(maxCacheEntries)
    private val writer = MultiFormatWriter()

    /**
     * Encodes [value] as [format] into a [width]×[height]-pixel [BitMatrix] with a white background,
     * black bars, and ZXing's format-correct quiet zone preserved (AC2). Returns a typed error
     * instead of throwing, so the UI always has a state to render.
     *
     * Runs the encode on the calling thread — call it from a background dispatcher (AC10). The result
     * is memoised, so a second call with the same arguments returns the cached instance without
     * re-encoding.
     */
    fun generate(value: String?, format: String?, width: Int, height: Int): BarcodeResult {
        val zxingFormat = BarcodeFormats.toZxing(format) ?: return BarcodeResult.UnsupportedFormat
        if (value.isNullOrEmpty()) return BarcodeResult.InvalidValue
        if (width <= 0 || height <= 0) return BarcodeResult.InvalidValue

        val key = BarcodeCacheKey(value, zxingFormat.name, width, height)
        return cache.getOrPut(key) { encode(value, zxingFormat, width, height) }
    }

    private fun encode(value: String, format: BarcodeFormat, width: Int, height: Int): BarcodeResult =
        try {
            BarcodeResult.Success(writer.encode(value, format, width, height, hintsFor(format)))
        } catch (_: WriterException) {
            // Content too large for the symbology, or otherwise unencodable.
            BarcodeResult.InvalidValue
        } catch (_: IllegalArgumentException) {
            // The 1D writers throw IAE for bad content (wrong length, failed checksum, out-of-charset).
            BarcodeResult.InvalidValue
        }

    /**
     * Encoding hints. The MARGIN is deliberately left unset so each writer applies its own
     * spec-correct quiet zone (QR 4 modules, the 1D writers their standard side margins) — the
     * story's "preserve the quiet zone via ZXing's margin hint, not a hand-cropped bitmap". QR adds
     * UTF-8 (loyalty QRs are often URLs) and error-correction level M, matching the phone's render
     * options and giving robustness against screen glare without bloating the symbol.
     */
    private fun hintsFor(format: BarcodeFormat): Map<EncodeHintType, Any> =
        if (format == BarcodeFormat.QR_CODE) {
            mapOf(
                EncodeHintType.CHARACTER_SET to "UTF-8",
                EncodeHintType.ERROR_CORRECTION to ErrorCorrectionLevel.M,
            )
        } else {
            emptyMap()
        }

    companion object {
        /** Default retained-barcode cap. */
        const val DEFAULT_CACHE_ENTRIES = 8
    }
}
