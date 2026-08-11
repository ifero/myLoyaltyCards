package com.iferoporefi.myloyaltycards.wear.barcode

import com.google.zxing.common.BitMatrix
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotSame
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * AC11 (the JVM half): each of the six formats produces a non-empty matrix of the expected aspect;
 * invalid values are rejected with a typed error rather than a bogus symbol; the cache never
 * re-encodes. The last mile — matrix → Android `Bitmap` — is validated on-device (AC4/AC12).
 */
class WearBarcodeGeneratorTest {
    private val generator = WearBarcodeGenerator()

    /** A valid, real value for each of the six formats. */
    private val validValues = mapOf(
        "CODE128" to "ABC-1234",
        "EAN13" to "5901234123457", // valid check digit
        "EAN8" to "96385074", // valid check digit
        "QR" to "https://example.com",
        "CODE39" to "CODE-39",
        "UPCA" to "012345678905", // valid check digit
    )

    @Test
    fun everyFormatProducesANonEmptyMatrix() {
        for ((format, value) in validValues) {
            val result = generator.generate(value, format, width = 300, height = 120)
            assertTrue("$format should encode", result is BarcodeResult.Success)
            val matrix = (result as BarcodeResult.Success).matrix
            assertTrue("$format matrix should have modules", matrix.hasBlackAndWhite())
        }
    }

    @Test
    fun qrIsSquare_andLinearIsWide() {
        val qr = generator.generate("https://example.com", "QR", width = 240, height = 240)
        val qrMatrix = (qr as BarcodeResult.Success).matrix
        assertEquals("QR is square", qrMatrix.width, qrMatrix.height)

        val ean = generator.generate("5901234123457", "EAN13", width = 300, height = 120)
        val eanMatrix = (ean as BarcodeResult.Success).matrix
        assertTrue("linear barcode is wider than tall", eanMatrix.width > eanMatrix.height)
    }

    @Test
    fun unknownFormat_isUnsupportedFormatError() {
        assertEquals(BarcodeResult.UnsupportedFormat, generator.generate("123", "AZTEC", 100, 40))
        assertEquals(BarcodeResult.UnsupportedFormat, generator.generate("123", null, 100, 40))
        assertEquals(BarcodeResult.UnsupportedFormat, generator.generate("123", "", 100, 40))
    }

    @Test
    fun emptyOrNullValue_isInvalidValueError() {
        assertEquals(BarcodeResult.InvalidValue, generator.generate("", "EAN13", 100, 40))
        assertEquals(BarcodeResult.InvalidValue, generator.generate(null, "EAN13", 100, 40))
    }

    @Test
    fun badEan13CheckDigit_isInvalidValue_notABogusSymbol() {
        // 590123412345 → valid check digit is 7 ("…457"); 0 is wrong, so ZXing rejects it.
        assertEquals(BarcodeResult.InvalidValue, generator.generate("5901234123450", "EAN13", 300, 120))
    }

    @Test
    fun code39OutOfCharsetValue_isInvalidValue() {
        // ZXing's Code39Writer auto-converts to *extended* Code 39, which covers all ASCII — so the
        // genuinely out-of-charset case is a NON-ASCII character (here 'É', U+00C9), which even
        // extended mode cannot encode, so ZXing rejects it rather than drawing a wrong symbol.
        assertEquals(BarcodeResult.InvalidValue, generator.generate("CAFÉ", "CODE39", 300, 120))
    }

    @Test
    fun nonPositiveSize_isInvalidValue() {
        assertEquals(BarcodeResult.InvalidValue, generator.generate("5901234123457", "EAN13", 0, 120))
        assertEquals(BarcodeResult.InvalidValue, generator.generate("5901234123457", "EAN13", 300, 0))
    }

    @Test
    fun sameRequestIsCached_neverReEncoded() {
        val first = generator.generate("5901234123457", "EAN13", 300, 120)
        val second = generator.generate("5901234123457", "EAN13", 300, 120)
        // Identical instance ⇒ the second call returned the cached result without re-encoding (AC10).
        assertSame(first, second)
        assertSame((first as BarcodeResult.Success).matrix, (second as BarcodeResult.Success).matrix)
    }

    @Test
    fun differentSizeIsADistinctEntry() {
        val a = generator.generate("5901234123457", "EAN13", 300, 120)
        val b = generator.generate("5901234123457", "EAN13", 301, 120)
        assertNotSame(a, b)
    }

    @Test
    fun quietZoneIsPreserved_bordersAreWhite() {
        // Request a size well beyond the natural symbol so ZXing's quiet zone shows as a white margin.
        // QR carries a 4-module quiet zone on all sides; a 1D symbol is centred with white side
        // margins. Cropping the quiet zone is the story's named anti-pattern — it must survive.
        val qr = (generator.generate("https://example.com", "QR", 300, 300) as BarcodeResult.Success).matrix
        assertFalse("QR top-left corner should be quiet-zone white", qr[0, 0])
        assertFalse("QR top-right corner should be quiet-zone white", qr[qr.width - 1, 0])
        assertFalse("QR bottom-left corner should be quiet-zone white", qr[0, qr.height - 1])

        val ean = (generator.generate("5901234123457", "EAN13", 600, 160) as BarcodeResult.Success).matrix
        val midRow = ean.height / 2
        assertFalse("EAN-13 left edge should be quiet-zone white", ean[0, midRow])
        assertFalse("EAN-13 right edge should be quiet-zone white", ean[ean.width - 1, midRow])
    }

    @Test
    fun longButValidQrValue_encodesAtLeastTheRequestedSize() {
        // A long (within-capacity) QR value still encodes; at a small requested size ZXing returns a
        // matrix at least as large as requested (never below its module count), which the screen then
        // scales to fit with no interpolation. No crash, no error state.
        val value = "https://example.com/loyalty?card=" + "A".repeat(200)
        val result = generator.generate(value, "QR", 120, 120)
        assertTrue("long QR value should encode", result is BarcodeResult.Success)
        val matrix = (result as BarcodeResult.Success).matrix
        assertTrue("matrix is at least the requested size", matrix.width >= 120 && matrix.height >= 120)
    }

    @Test
    fun invalidValuesAreRejectedAcrossAllFormats() {
        // AC2: every format rejects a value that is invalid *for it* with the error state, not a bogus
        // symbol. (EAN-13 bad checksum and Code39 out-of-charset have their own tests above.)
        assertEquals("EAN-8 bad checksum", BarcodeResult.InvalidValue, generator.generate("96385070", "EAN8", 300, 120))
        assertEquals("UPC-A bad checksum", BarcodeResult.InvalidValue, generator.generate("012345678900", "UPCA", 300, 120))
        assertEquals("EAN-13 wrong length", BarcodeResult.InvalidValue, generator.generate("12345", "EAN13", 300, 120))
        // CODE128 encodes Latin-1; a char beyond it (U+2192 '→') is unencodable.
        assertEquals("CODE128 non-encodable char", BarcodeResult.InvalidValue, generator.generate("AB→", "CODE128", 300, 120))
        // A payload beyond the largest QR's capacity cannot be encoded.
        assertEquals("QR over capacity", BarcodeResult.InvalidValue, generator.generate("A".repeat(4000), "QR", 300, 300))
    }

    /** True when the matrix has at least one black and one white module — i.e. a real, non-solid symbol. */
    private fun BitMatrix.hasBlackAndWhite(): Boolean {
        var black = false
        var white = false
        for (y in 0 until height) {
            for (x in 0 until width) {
                if (this[x, y]) black = true else white = true
                if (black && white) return true
            }
        }
        return false
    }
}
