import XCTest

@testable import MyLoyaltyCardsWatch

final class BarcodeGeneratorTests: XCTestCase {
  func test_generateImage_acceptsCaseInsensitiveFormat() async throws {
    let img = await BarcodeGenerator.generateImage(
      value: "test", formatString: "qr", pixelSize: CGSize(width: 320, height: 320))
    XCTAssertNotNil(img)
  }

  func test_generateImage_isCached() async throws {
    let size = CGSize(width: 320, height: 160)
    let value = "5901234123457"
    let format = "EAN13"

    let img1 = await BarcodeGenerator.generateImage(
      value: value, formatString: format, pixelSize: size)
    XCTAssertNotNil(img1)
    XCTAssertTrue(
      BarcodeGenerator.isImageCached(value: value, formatString: format, pixelSize: size))

    // case-insensitive key should hit the same cache entry
    let img2 = await BarcodeGenerator.generateImage(
      value: value, formatString: "ean13", pixelSize: size)
    XCTAssertNotNil(img2)

    // whitespace should be trimmed for the cache key
    let img3 = await BarcodeGenerator.generateImage(
      value: value, formatString: " eAn13 ", pixelSize: size)
    XCTAssertNotNil(img3)
    XCTAssertTrue(
      BarcodeGenerator.isImageCached(value: value, formatString: " eAn13 ", pixelSize: size))
  }

  func test_generateImage_returnsNil_forUnknownOrNilFormat() async throws {
    let size = CGSize(width: 320, height: 160)

    let resultNil = await BarcodeGenerator.generateImage(
      value: "x", formatString: nil, pixelSize: size)
    XCTAssertNil(resultNil)

    let resultUnknown = await BarcodeGenerator.generateImage(
      value: "x", formatString: "UNKNOWN", pixelSize: size)
    XCTAssertNil(resultUnknown)
  }

  func test_generateImage_forEAN13_returnsImage_and_validatesChecksum() async throws {
    let size = CGSize(width: 320, height: 160)
    // valid 13-digit EAN-13
    let img = await BarcodeGenerator.generateImage(
      value: "5901234123457", formatString: "EAN13", pixelSize: size)
    XCTAssertNotNil(img)

    // invalid length should return nil
    let invalid = await BarcodeGenerator.generateImage(
      value: "5901234", formatString: "EAN13", pixelSize: size)
    XCTAssertNil(invalid)
  }

  func test_generateImage_forCode128_returnsImage_forAlphanumeric() async throws {
    let size = CGSize(width: 560, height: 160)
    let img = await BarcodeGenerator.generateImage(
      value: "ABC123-xyz", formatString: "CODE128", pixelSize: size)
    XCTAssertNotNil(img)
  }

  func test_generateImage_code128_usesCodeC_forEvenDigits() async throws {
    let size = CGSize(width: 560, height: 160)
    let img = await BarcodeGenerator.generateImage(
      value: "12345678", formatString: "CODE128", pixelSize: size)
    XCTAssertNotNil(img)
  }

  func test_generateImage_code128_handlesOddDigitRun() async throws {
    let size = CGSize(width: 600, height: 160)
    let img = await BarcodeGenerator.generateImage(
      value: "A12345B", formatString: "CODE128", pixelSize: size)
    XCTAssertNotNil(img)
  }

  func test_generateImage_code128_twoDigits_entireString() async throws {
    let size = CGSize(width: 120, height: 80)
    let img = await BarcodeGenerator.generateImage(
      value: "12", formatString: "CODE128", pixelSize: size)
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

  // MARK: Story 16.34 — EAN-13 must refuse what it cannot represent, never trap

  func test_encodeEAN13_matchesReferenceSymbol() {
    // Unchanged by 16.34's digit-parsing fix; here so a regression is visible.
    assertModules(
      "5901234123457", "EAN13",
      equal:
        "1,1,1,3,1,1,2,1,1,2,3,1,2,2,2,2,1,2,2,1,4,1,1,2,3,1,1,1,1,1,1,1,2,2,2,1,2,1,2,2,1,4,1,1,1,1,3,2,1,2,3,1,1,3,1,2,1,1,1"
    )
  }

  func test_ean13_refusesNonAsciiNumerals_insteadOfTrapping() {
    // Before 16.34 each of these exited 133 (SIGTRAP) rather than returning nil:
    // U+0663 parses to nil under Int(String(_:)); U+2167 reads as the digit 8 the card
    // does not contain; U+3248 reads as 10, past the ten-entry pattern tables.
    XCTAssertNil(
      BarcodeGenerator.modulesForTesting(value: "\u{0663}901234123457", formatString: "EAN13"))
    XCTAssertNil(
      BarcodeGenerator.modulesForTesting(value: "590123412345\u{2167}", formatString: "EAN13"))
    XCTAssertNil(
      BarcodeGenerator.modulesForTesting(value: "\u{3248}901234123457", formatString: "EAN13"))
  }

  func test_ean13_contractIsOtherwiseUnchanged() {
    let canonical = BarcodeGenerator.modulesForTesting(
      value: "5901234123457", formatString: "EAN13")

    // 12 digits still computes the check digit.
    XCTAssertEqual(
      BarcodeGenerator.modulesForTesting(value: "590123412345", formatString: "EAN13"), canonical)
    // Separators are still ignored, as they always were.
    XCTAssertEqual(
      BarcodeGenerator.modulesForTesting(value: "5901234-123457", formatString: "EAN13"), canonical)
    // A bad check digit still fails, and so does a wrong length.
    XCTAssertNil(BarcodeGenerator.modulesForTesting(value: "5901234123458", formatString: "EAN13"))
    XCTAssertNil(BarcodeGenerator.modulesForTesting(value: "59012341234", formatString: "EAN13"))
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
    // GS1 General Specifications: EAN-8 7X, UPC-A 9X. ISO/IEC 16388: Code 39 10X,
    // ISO/IEC 15417: Code 128 10X. EAN-13 is the asymmetric one — 11X leading, 7X
    // trailing (Story 16.27); it used to ship the flat 10 + 10.
    XCTAssertEqual(
      BarcodeGenerator.quietZoneForTesting(formatString: "EAN13"),
      WatchBarcodeQuietZone(leading: 11, trailing: 7))
    XCTAssertEqual(
      BarcodeGenerator.quietZoneForTesting(formatString: "EAN8"),
      WatchBarcodeQuietZone(leading: 7, trailing: 7))
    XCTAssertEqual(
      BarcodeGenerator.quietZoneForTesting(formatString: "UPCA"),
      WatchBarcodeQuietZone(leading: 9, trailing: 9))
    XCTAssertEqual(
      BarcodeGenerator.quietZoneForTesting(formatString: "CODE39"),
      WatchBarcodeQuietZone(leading: 10, trailing: 10))
    XCTAssertEqual(
      BarcodeGenerator.quietZoneForTesting(formatString: "CODE128"),
      WatchBarcodeQuietZone(leading: 10, trailing: 10))
  }

  // MARK: - Story 16.27 — symbol units and the render boundary

  func test_symbolModuleUnits_areComputedPerSymbol_notAssumedFromEAN13() throws {
    // Bars and spaces only — the quiet zone is white space and is NOT part of what the
    // module divides, which is what lets a 40 mm reach 3 px/module instead of 2.
    XCTAssertEqual(
      BarcodeGenerator.symbolModuleUnits(value: "5901234123457", formatString: "EAN13"), 95)
    // EAN-8 is narrower than EAN-13, so its module GROWS on the same screen.
    XCTAssertEqual(BarcodeGenerator.symbolModuleUnits(value: "95200002", formatString: "EAN8"), 67)
    // UPC-A is the same symbol width as EAN-13 but a different quiet zone.
    XCTAssertEqual(
      BarcodeGenerator.symbolModuleUnits(value: "012345000058", formatString: "UPCA"), 95)

    // A 13-digit Code128 is materially wider than EAN-13 at the same digit count,
    // which is why nothing may assume EAN-13's geometry.
    let code128 = try XCTUnwrap(
      BarcodeGenerator.symbolModuleUnits(value: "5901234123457", formatString: "CODE128"))
    XCTAssertGreaterThan(code128, 95)

    // QR is 2D and never reaches the module renderer; an unencodable value has no
    // symbol to measure.
    XCTAssertNil(BarcodeGenerator.symbolModuleUnits(value: "anything", formatString: "QR"))
    XCTAssertNil(
      BarcodeGenerator.symbolModuleUnits(value: "5901234123458", formatString: "EAN13"))
    XCTAssertNil(BarcodeGenerator.symbolModuleUnits(value: "x", formatString: nil))
  }

  func test_generateImage_refusesOnlyWhenAModuleCannotBeOnePixel() async throws {
    let symbolUnits = try XCTUnwrap(
      BarcodeGenerator.symbolModuleUnits(value: "5901234123457", formatString: "EAN13"))
    // The renderer reserves a guaranteed quiet zone on each side before dividing.
    let divisor = symbolUnits + (WatchBarcodeModulePlan.minimumQuietZoneUnitsPerSide * 2)

    // Exactly one pixel per module still draws: AC2 says maximise the module, never
    // refuse on magnification. One pixel is small, but it is UNIFORM, and the
    // human-readable number is on screen beside it either way.
    let atFloor = await BarcodeGenerator.generateImage(
      value: "5901234123457", formatString: "EAN13",
      pixelSize: CGSize(width: divisor, height: 80))
    XCTAssertNotNil(atFloor)

    // One pixel short of that, no uniform symbol exists, so the view must fall back
    // to the placeholder rather than draw an unreadable smear.
    let belowFloor = await BarcodeGenerator.generateImage(
      value: "5901234123457", formatString: "EAN13",
      pixelSize: CGSize(width: divisor - 1, height: 80))
    XCTAssertNil(belowFloor)
  }

  func test_generateImage_cachesOrientationsSeparately() async throws {
    let value = "5901234123457"
    let size = CGSize(width: 240, height: 400)

    let horizontal = await BarcodeGenerator.generateImage(
      value: value, formatString: "EAN13", pixelSize: size, orientation: .horizontal)
    XCTAssertNotNil(horizontal)

    // The two orientations are different bitmaps at the same pixel size, so the key
    // must separate them or a rotation would serve the horizontal image.
    XCTAssertTrue(
      BarcodeGenerator.isImageCached(
        value: value, formatString: "EAN13", pixelSize: size, orientation: .horizontal))
    XCTAssertFalse(
      BarcodeGenerator.isImageCached(
        value: value, formatString: "EAN13", pixelSize: size, orientation: .rotated))

    let rotated = await BarcodeGenerator.generateImage(
      value: value, formatString: "EAN13", pixelSize: size, orientation: .rotated)
    XCTAssertNotNil(rotated)
    XCTAssertTrue(
      BarcodeGenerator.isImageCached(
        value: value, formatString: "EAN13", pixelSize: size, orientation: .rotated))
  }

  // MARK: End-to-end through generateImage

  func test_generateImage_rendersAllThreeNewlySupportedFormats() async throws {
    let size = CGSize(width: 320, height: 160)
    for (value, format) in [("95200002", "EAN8"), ("012345000058", "UPCA"), ("ABC123", "CODE39")] {
      let img = await BarcodeGenerator.generateImage(
        value: value, formatString: format, pixelSize: size)
      XCTAssertNotNil(img, "\(format) produced no image")
    }
  }

  func test_generateImage_returnsNil_soTheViewCanShowThePlaceholder() async throws {
    let size = CGSize(width: 320, height: 160)

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
        value: value, formatString: format, pixelSize: size)
      XCTAssertNil(image, "\(format) \(value) must fall through to the placeholder")
    }
  }
  // MARK: Story 16.37 — the Code 128 STOP pattern must carry its final bar

  func test_encodeCode128_matchesReferenceSymbols() {
    // Before 16.37 every one of these came back two modules short: `widthsTable[106]`
    // held "233111" where Code 128 specifies "2331112". The values span the encoder's
    // code-set branches — Start C, pure C, Start B, the C→B→C round trip, and the
    // ASCII 32/126 boundaries.
    assertModules(
      "5901234123457", "CODE128",
      equal:
        "2,1,1,2,3,2,3,3,2,1,1,1,2,2,2,1,2,2,3,1,2,1,3,1,2,3,1,3,1,1,3,1,2,1,3,1,1,1,3,1,2,3,1,1,4,1,3,1,3,1,2,1,3,1,2,2,1,2,3,1,2,3,3,1,1,1,2"
    )
    assertModules(
      "12345678", "CODE128",
      equal:
        "2,1,1,2,3,2,1,1,2,2,3,2,1,3,1,1,2,3,3,3,1,1,2,1,2,4,1,1,1,2,1,3,3,1,2,1,2,3,3,1,1,1,2"
    )
    assertModules(
      "ABC-123", "CODE128",
      equal:
        "2,1,1,2,1,4,1,1,1,3,2,3,1,3,1,1,2,3,1,3,1,3,2,1,1,2,2,1,3,2,1,2,3,2,2,1,2,2,3,2,1,1,2,2,1,1,3,2,1,1,2,4,1,2,2,3,3,1,1,1,2"
    )
    assertModules(
      "1234ABCD5678", "CODE128",
      equal:
        "2,1,1,2,3,2,1,1,2,2,3,2,1,3,1,1,2,3,1,1,4,1,3,1,1,1,1,3,2,3,1,3,1,1,2,3,1,3,1,3,2,1,1,1,2,3,1,3,1,1,3,1,4,1,3,3,1,1,2,1,2,4,1,1,1,2,3,2,2,2,1,1,2,3,3,1,1,1,2"
    )
    assertModules(
      " ~", "CODE128",
      equal:
        "2,1,1,2,1,4,2,1,2,2,2,2,1,3,1,1,4,1,4,1,1,2,1,2,2,3,3,1,1,1,2"
    )
  }

  func test_code128_stopPatternEndsOnABar() {
    // Elements alternate bar/space from a leading bar, so an odd count ends on a bar.
    // A decoder terminates the symbol by matching the 13-module STOP; ending on a space
    // leaves the symbol indistinguishable from a scan that was cut short.
    for value in ["5901234123457", "12345678", "ABC-123"] {
      guard
        let actual = BarcodeGenerator.modulesForTesting(value: value, formatString: "CODE128")
      else {
        XCTFail("CODE128 \(value) must encode")
        continue
      }

      XCTAssertEqual(actual.count % 2, 1, "\(value) must end on a bar")
      XCTAssertEqual(Array(actual.suffix(7)), [2, 3, 3, 1, 1, 1, 2], "\(value) STOP pattern")
      // 11 modules per code word, 13 for the STOP.
      XCTAssertEqual(actual.reduce(0, +) % 11, 2, "\(value) total width")
    }
  }

  func test_code128_refusesCharactersOutsideItsAsciiRange() {
    // The 32...126 gate is what makes the encoder's later `asciiValue!` uses unreachable
    // (Story 16.34 verified this). Refusing falls through to the readable-number
    // placeholder; encoding a substitute would be the silent wrongness 16.28 removed.
    for value in ["CAF\u{00c9}", "\u{0663}5901234", "5901234\u{0009}123"] {
      XCTAssertNil(
        BarcodeGenerator.modulesForTesting(value: value, formatString: "CODE128"),
        "CODE128 must refuse \(value)")
    }
  }
}
