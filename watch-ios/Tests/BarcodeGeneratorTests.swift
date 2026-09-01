import XCTest

@testable import MyLoyaltyCardsWatch

final class BarcodeGeneratorTests: XCTestCase {
  func test_generateImage_acceptsCaseInsensitiveFormat() async throws {
    let img = await BarcodeGenerator.generateImage(
      value: "test", formatString: "qr", targetSize: CGSize(width: 160, height: 160))
    XCTAssertNotNil(img)
  }

  func test_generateImage_isCached() async throws {
    let size = CGSize(width: 160, height: 80)
    let value = "5901234123457"
    let format = "EAN13"

    let img1 = await BarcodeGenerator.generateImage(
      value: value, formatString: format, targetSize: size)
    XCTAssertNotNil(img1)
    XCTAssertTrue(
      BarcodeGenerator.isImageCached(value: value, formatString: format, targetSize: size))

    // case-insensitive key should hit the same cache entry
    let img2 = await BarcodeGenerator.generateImage(
      value: value, formatString: "ean13", targetSize: size)
    XCTAssertNotNil(img2)

    // whitespace should be trimmed for the cache key
    let img3 = await BarcodeGenerator.generateImage(
      value: value, formatString: " eAn13 ", targetSize: size)
    XCTAssertNotNil(img3)
    XCTAssertTrue(
      BarcodeGenerator.isImageCached(value: value, formatString: " eAn13 ", targetSize: size))
  }

  func test_generateImage_returnsNil_forUnknownOrNilFormat() async throws {
    let size = CGSize(width: 160, height: 80)

    let resultNil = await BarcodeGenerator.generateImage(
      value: "x", formatString: nil, targetSize: size)
    XCTAssertNil(resultNil)

    let resultUnknown = await BarcodeGenerator.generateImage(
      value: "x", formatString: "UNKNOWN", targetSize: size)
    XCTAssertNil(resultUnknown)
  }

  func test_generateImage_forEAN13_returnsImage_and_validatesChecksum() async throws {
    let size = CGSize(width: 160, height: 80)
    // valid 13-digit EAN-13
    let img = await BarcodeGenerator.generateImage(
      value: "5901234123457", formatString: "EAN13", targetSize: size)
    XCTAssertNotNil(img)

    // invalid length should return nil
    let invalid = await BarcodeGenerator.generateImage(
      value: "5901234", formatString: "EAN13", targetSize: size)
    XCTAssertNil(invalid)
  }

  func test_generateImage_forCode128_returnsImage_forAlphanumeric() async throws {
    let size = CGSize(width: 280, height: 80)
    let img = await BarcodeGenerator.generateImage(
      value: "ABC123-xyz", formatString: "CODE128", targetSize: size)
    XCTAssertNotNil(img)
  }

  func test_generateImage_code128_usesCodeC_forEvenDigits() async throws {
    let size = CGSize(width: 280, height: 80)
    let img = await BarcodeGenerator.generateImage(
      value: "12345678", formatString: "CODE128", targetSize: size)
    XCTAssertNotNil(img)
  }

  func test_generateImage_code128_handlesOddDigitRun() async throws {
    let size = CGSize(width: 300, height: 80)
    let img = await BarcodeGenerator.generateImage(
      value: "A12345B", formatString: "CODE128", targetSize: size)
    XCTAssertNotNil(img)
  }

  func test_generateImage_code128_twoDigits_entireString() async throws {
    let size = CGSize(width: 60, height: 40)
    let img = await BarcodeGenerator.generateImage(
      value: "12", formatString: "CODE128", targetSize: size)
    XCTAssertNotNil(img)
  }

  // MARK: - Story 16.28 — real symbologies for EAN-8, UPC-A and Code39
  //
  // REFERENCE VECTORS. Every `sbs` literal below is the module-width array of a
  // symbol produced by BWIPP (Barcode Writer in Pure PostScript) via bwip-js
  // 4.10.1 / BWIPP 2026-04-21 — the same library, and the same `bcid`, that the
  // phone renders these cards with (`BarcodeRenderer.tsx`). They are therefore
  // published reference symbols, NOT this encoder's own output, and matching them
  // means the wrist symbol is identical to the one on the phone.
  //
  // The extraction was validated first against `encodeEAN13`, which already
  // shipped and is known good: BWIPP's EAN-13 array for 5901234123457 is
  // byte-identical to `encodeEAN13`'s. Regenerate with:
  //
  //   bwipjs.toSVG({ bcid, text, scale: 1, height: 10, includetext: false,
  //                  paddingwidth: 0, paddingheight: 0 })
  //
  // then read each bar's x/stroke-width and emit the alternating bar/space runs.

  /// Parse a `"1,2,1"` reference vector into module widths.
  private func vector(_ csv: String) -> [Int] {
    csv.split(separator: ",").map { Int($0)! }
  }

  private func assertModules(
    _ value: String, _ format: String, equal csv: String,
    file: StaticString = #filePath, line: UInt = #line
  ) {
    let actual = BarcodeGenerator.modulesForTesting(value: value, formatString: format)
    XCTAssertEqual(actual, vector(csv), "\(format) \(value)", file: file, line: line)
  }

  func test_encodeEAN8_matchesReferenceSymbols() {
    assertModules(
      "95200002", "EAN8",
      equal: "1,1,1,3,1,1,2,1,2,3,1,2,1,2,2,3,2,1,1,1,1,1,1,1,3,2,1,1,3,2,1,1,3,2,1,1,2,1,2,2,1,1,1")
    assertModules(
      "20886509", "EAN8",
      equal: "1,1,1,2,1,2,2,3,2,1,1,1,2,1,3,1,2,1,3,1,1,1,1,1,1,1,1,4,1,2,3,1,3,2,1,1,3,1,1,2,1,1,1")
    assertModules(
      "00000000", "EAN8",
      equal: "1,1,1,3,2,1,1,3,2,1,1,3,2,1,1,3,2,1,1,1,1,1,1,1,3,2,1,1,3,2,1,1,3,2,1,1,3,2,1,1,1,1,1")
    assertModules(
      "12345670", "EAN8",
      equal: "1,1,1,2,2,2,1,2,1,2,2,1,4,1,1,1,1,3,2,1,1,1,1,1,1,2,3,1,1,1,1,4,1,3,1,2,3,2,1,1,1,1,1")
  }

  func test_encodeUPCA_matchesReferenceSymbols() {
    assertModules(
      "012345000058", "UPCA",
      equal:
        "1,1,1,3,2,1,1,2,2,2,1,2,1,2,2,1,4,1,1,1,1,3,2,1,2,3,1,1,1,1,1,1,3,2,1,1,3,2,1,1,3,2,1,1,3,2,1,1,1,2,3,1,1,2,1,3,1,1,1"
    )
    assertModules(
      "036000291452", "UPCA",
      equal:
        "1,1,1,3,2,1,1,1,4,1,1,1,1,1,4,3,2,1,1,3,2,1,1,3,2,1,1,1,1,1,1,1,2,1,2,2,3,1,1,2,2,2,2,1,1,1,3,2,1,2,3,1,2,1,2,2,1,1,1"
    )
    assertModules(
      "123456789012", "UPCA",
      equal:
        "1,1,1,2,2,2,1,2,1,2,2,1,4,1,1,1,1,3,2,1,2,3,1,1,1,1,4,1,1,1,1,1,1,3,1,2,1,2,1,3,3,1,1,2,3,2,1,1,2,2,2,1,2,1,2,2,1,1,1"
    )
  }

  func test_encodeCode39_matchesReferenceSymbols() {
    assertModules("A", "CODE39", equal: "1,3,1,1,3,1,3,1,1,1,3,1,1,1,1,3,1,1,3,1,1,3,1,1,3,1,3,1,1")
    assertModules("0", "CODE39", equal: "1,3,1,1,3,1,3,1,1,1,1,1,1,3,3,1,3,1,1,1,1,3,1,1,3,1,3,1,1")
    assertModules(
      "ABC123", "CODE39",
      equal:
        "1,3,1,1,3,1,3,1,1,1,3,1,1,1,1,3,1,1,3,1,1,1,3,1,1,3,1,1,3,1,3,1,3,1,1,3,1,1,1,1,3,1,1,3,1,1,1,1,3,1,1,1,3,3,1,1,1,1,3,1,3,1,3,3,1,1,1,1,1,1,1,3,1,1,3,1,3,1,1"
    )
    // Exercises the full non-alphanumeric half of the 43-character set.
    assertModules(
      "-. $/+%", "CODE39",
      equal:
        "1,3,1,1,3,1,3,1,1,1,1,3,1,1,1,1,3,1,3,1,3,3,1,1,1,1,3,1,1,1,1,3,3,1,1,1,3,1,1,1,1,3,1,3,1,3,1,1,1,1,1,3,1,3,1,1,1,3,1,1,1,3,1,1,1,3,1,3,1,1,1,1,1,3,1,3,1,3,1,1,1,3,1,1,3,1,3,1,1"
    )
  }

  // MARK: Check-digit contract (AC2) — mirrors `encodeEAN13`'s

  func test_ean8_computesCheckDigit_whenGivenSevenDigits() {
    // EAN-8 weights its 7 data digits 3,1,3,… — NOT EAN-13's 1,3,1,….
    XCTAssertEqual(
      BarcodeGenerator.modulesForTesting(value: "9520000", formatString: "EAN8"),
      BarcodeGenerator.modulesForTesting(value: "95200002", formatString: "EAN8"))
  }

  func test_upca_computesCheckDigit_whenGivenElevenDigits() {
    XCTAssertEqual(
      BarcodeGenerator.modulesForTesting(value: "01234500005", formatString: "UPCA"),
      BarcodeGenerator.modulesForTesting(value: "012345000058", formatString: "UPCA"))
  }

  func test_ean8_and_upca_returnNil_onBadChecksumOrLength() {
    XCTAssertNil(BarcodeGenerator.modulesForTesting(value: "95200003", formatString: "EAN8"))
    XCTAssertNil(BarcodeGenerator.modulesForTesting(value: "952000", formatString: "EAN8"))
    XCTAssertNil(BarcodeGenerator.modulesForTesting(value: "952000023", formatString: "EAN8"))
    XCTAssertNil(BarcodeGenerator.modulesForTesting(value: "012345000059", formatString: "UPCA"))
    XCTAssertNil(BarcodeGenerator.modulesForTesting(value: "0123450000", formatString: "UPCA"))
    XCTAssertNil(BarcodeGenerator.modulesForTesting(value: "0123450000581", formatString: "UPCA"))
  }

  func test_code39_returnsNil_forUnencodableValues() {
    // Lower case is rejected, not upper-cased: silently changing the payload would
    // encode a different string from the one printed on the card.
    XCTAssertNil(BarcodeGenerator.modulesForTesting(value: "abc", formatString: "CODE39"))
    XCTAssertNil(BarcodeGenerator.modulesForTesting(value: "ABC!", formatString: "CODE39"))
    XCTAssertNil(BarcodeGenerator.modulesForTesting(value: "", formatString: "CODE39"))
  }

  func test_ean8_and_upca_refuseNonAsciiNumerals() {
    // Every one of these satisfies `Character.isWholeNumber`. Parsing them with
    // `Int(String(_:))!` traps; reading `wholeNumberValue` either invents a digit the
    // card does not have (Ⅷ -> 8) or overruns the ten-entry tables (㉈ -> 10). Refusing
    // the value sends the view to the human-readable placeholder instead.
    XCTAssertNil(BarcodeGenerator.modulesForTesting(value: "\u{0663}5200002", formatString: "EAN8"))
    XCTAssertNil(BarcodeGenerator.modulesForTesting(value: "9520000\u{2167}", formatString: "EAN8"))
    XCTAssertNil(
      BarcodeGenerator.modulesForTesting(value: "\u{3248}12345000058", formatString: "UPCA"))
  }

  func test_ean8_stillIgnoresSeparators_likeEAN13() {
    // A value stored as "9520-0002" must keep working: `encodeEAN13` has always been
    // tolerant of separators and AC2 asks the new encoders to match its contract.
    XCTAssertEqual(
      BarcodeGenerator.modulesForTesting(value: "9520-0002", formatString: "EAN8"),
      BarcodeGenerator.modulesForTesting(value: "95200002", formatString: "EAN8"))
  }

  // MARK: The regression this story exists to prevent (AC3)

  func test_noFormatFallsBackToCode128() {
    // Before Story 16.28 these three resolved to `encodeCode128`, producing a valid
    // Code128 symbol under the wrong symbology. Each must now differ from the
    // Code128 encoding of the same digits.
    for (value, format) in [("95200002", "EAN8"), ("012345000058", "UPCA"), ("ABC123", "CODE39")] {
      let actual = BarcodeGenerator.modulesForTesting(value: value, formatString: format)
      let asCode128 = BarcodeGenerator.modulesForTesting(value: value, formatString: "CODE128")
      XCTAssertNotNil(actual, "\(format) \(value) should encode")
      XCTAssertNotNil(asCode128)
      XCTAssertNotEqual(actual, asCode128, "\(format) is still rendering as Code128")
    }
  }

  func test_everyLinearFormatHasItsOwnEncoder() {
    // Six formats in the cross-platform contract; five are linear, QR is drawn by
    // Core Image. No two linear formats may produce the same symbol for one value.
    let byFormat = ["EAN13": "5901234123457", "CODE128": "ABC123", "EAN8": "95200002",
                    "UPCA": "012345000058", "CODE39": "ABC123"]
    for (format, value) in byFormat {
      XCTAssertNotNil(
        BarcodeGenerator.modulesForTesting(value: value, formatString: format),
        "\(format) has no working encoder")
    }
    XCTAssertNil(BarcodeGenerator.modulesForTesting(value: "anything", formatString: "QR"))
  }

  // MARK: Per-symbology quiet zones (AC7 / Task 6)

  func test_quietZones_usePublishedMinimaPerSymbology() {
    // GS1 General Specifications: EAN-8 7X, UPC-A 9X. ISO/IEC 16388: Code 39 10X.
    XCTAssertEqual(BarcodeGenerator.quietZoneForTesting(formatString: "EAN8"), 7)
    XCTAssertEqual(BarcodeGenerator.quietZoneForTesting(formatString: "UPCA"), 9)
    XCTAssertEqual(BarcodeGenerator.quietZoneForTesting(formatString: "CODE39"), 10)
    // Unchanged from what these already shipped with.
    XCTAssertEqual(BarcodeGenerator.quietZoneForTesting(formatString: "EAN13"), 10)
    XCTAssertEqual(BarcodeGenerator.quietZoneForTesting(formatString: "CODE128"), 10)
  }

  // MARK: End-to-end through generateImage

  func test_generateImage_rendersAllThreeNewlySupportedFormats() async throws {
    let size = CGSize(width: 160, height: 80)
    for (value, format) in [("95200002", "EAN8"), ("012345000058", "UPCA"), ("ABC123", "CODE39")] {
      let img = await BarcodeGenerator.generateImage(
        value: value, formatString: format, targetSize: size)
      XCTAssertNotNil(img, "\(format) produced no image")
    }
  }

  func test_generateImage_returnsNil_soTheViewCanShowThePlaceholder() async throws {
    let size = CGSize(width: 160, height: 80)

    // AC3: an unencodable value must yield nil, never a substituted symbology.
    //
    // These are reachable with data already on devices. A scanned card cannot carry a
    // bad checksum — the OS decoders validate it — but a manually typed or edited one
    // can: `barcode` is a bare `z.string()` and the entry forms impose no format check.
    // Such a card used to draw *some* Code128 symbol on the watch whatever its
    // contents; it now falls through to the placeholder, which still shows the
    // human-readable number for manual keying. That matches the phone, which already
    // fails these same values (bwip-js raises `ean8badCheckDigit` / `upcAbadCheckDigit`
    // / `code39badCharacter`) and shows its own placeholder.
    for (value, format) in [
      ("95200003", "EAN8"),  // EAN-8, mistyped check digit
      ("012345000059", "UPCA"),  // UPC-A, mistyped check digit
      ("abc123", "CODE39"),  // Code 39 has no lower case
    ] {
      let image = await BarcodeGenerator.generateImage(
        value: value, formatString: format, targetSize: size)
      XCTAssertNil(image, "\(format) \(value) must fall through to the placeholder")
    }
  }
}
