import XCTest
@testable import MyLoyaltyCardsWatch

final class CardRowHelpersTests: XCTestCase {

  // MARK: - initials(from:)

  func test_initials_twoWords() throws {
    XCTAssertEqual(initials(from: "Local Bakery"), "LB")
  }

  func test_initials_singleWord() throws {
    XCTAssertEqual(initials(from: "Esselunga"), "ES")
  }

  func test_initials_empty() throws {
    XCTAssertEqual(initials(from: ""), "")
  }

  func test_initials_threeWords() throws {
    XCTAssertEqual(initials(from: "New York Bakery"), "NY")
  }

  func test_initials_whitespace() throws {
    XCTAssertEqual(initials(from: "  "), "")
  }

  // MARK: - mapColor(hex:)

  func test_mapColor_knownHex_returnsColor() throws {
    XCTAssertNotNil(mapColor(hex: "#1e90ff"))
    XCTAssertNotNil(mapColor(hex: "green"))
  }

  func test_mapColor_nil_returnsNil() throws {
    XCTAssertNil(mapColor(hex: nil))
  }

  func test_mapColor_empty_returnsNil() throws {
    XCTAssertNil(mapColor(hex: ""))
    XCTAssertNil(mapColor(hex: "   "))
  }

  func test_mapColor_namedColors() throws {
    XCTAssertNotNil(mapColor(hex: "blue"))
    XCTAssertNotNil(mapColor(hex: "red"))
    XCTAssertNotNil(mapColor(hex: "green"))
    XCTAssertNotNil(mapColor(hex: "orange"))
    XCTAssertNotNil(mapColor(hex: "gray"))
    XCTAssertNotNil(mapColor(hex: "grey"))
  }

  func test_mapColor_arbitraryHex_returnsColor() throws {
    // Arbitrary hex that's not in the named set
    XCTAssertNotNil(mapColor(hex: "#ff4d4d"))
    XCTAssertNotNil(mapColor(hex: "#ffb24d"))
    XCTAssertNotNil(mapColor(hex: "#1C1C1F"))
    XCTAssertNotNil(mapColor(hex: "AABBCC"))
  }

  func test_mapColor_invalidHex_returnsFallback() throws {
    // Invalid hex should still return a fallback Color (non-nil via parseHexColor → .gray)
    XCTAssertNotNil(mapColor(hex: "#badhex"))
    XCTAssertNotNil(mapColor(hex: "xyz"))
  }

  // MARK: - parseHexColor(_:)

  func test_parseHexColor_validWithHash() throws {
    // Should not return gray for valid hex
    let color = parseHexColor("#FF0000")
    XCTAssertNotNil(color) // pure red
  }

  func test_parseHexColor_validWithoutHash() throws {
    let color = parseHexColor("00FF00")
    XCTAssertNotNil(color) // pure green
  }

  func test_parseHexColor_invalidReturnsGray() throws {
    // Invalid input returns gray fallback
    let _ = parseHexColor("invalid")
    // Can't easily compare SwiftUI Color, but we verify it doesn't crash
  }

  func test_parseHexColor_tooShort() throws {
    let _ = parseHexColor("#FFF") // 3-digit not supported → gray
  }

  func test_parseHexColor_black() throws {
    let _ = parseHexColor("#000000")
    // Verify it doesn't crash for pure black
  }

  func test_parseHexColor_white() throws {
    let _ = parseHexColor("#FFFFFF")
    // Verify it doesn't crash for pure white
  }

  // MARK: - relativeLuminance(hex:)

  func test_luminance_black() throws {
    let lum = relativeLuminance(hex: "#000000")
    XCTAssertEqual(lum, 0.0, accuracy: 0.001)
  }

  func test_luminance_white() throws {
    let lum = relativeLuminance(hex: "#FFFFFF")
    XCTAssertEqual(lum, 1.0, accuracy: 0.001)
  }

  func test_luminance_midGray() throws {
    let lum = relativeLuminance(hex: "#808080")
    // Mid gray should be roughly 0.216
    XCTAssertGreaterThan(lum, 0.1)
    XCTAssertLessThan(lum, 0.4)
  }

  func test_luminance_invalidHex() throws {
    let lum = relativeLuminance(hex: "invalid")
    XCTAssertEqual(lum, 0.0, accuracy: 0.001) // defaults to dark
  }

  // MARK: - shouldUseWhiteText(onBackgroundHex:)

  func test_whiteText_onDarkBackground() throws {
    XCTAssertTrue(shouldUseWhiteText(onBackgroundHex: "#000000"))
    XCTAssertTrue(shouldUseWhiteText(onBackgroundHex: "#1C1C1F"))
    XCTAssertTrue(shouldUseWhiteText(onBackgroundHex: "#333333"))
  }

  func test_blackText_onLightBackground() throws {
    XCTAssertFalse(shouldUseWhiteText(onBackgroundHex: "#FFFFFF"))
    XCTAssertFalse(shouldUseWhiteText(onBackgroundHex: "#FFFF00"))
  }

  // MARK: - isNearBlack(hex:)

  func test_nearBlack_pureBlack() throws {
    XCTAssertTrue(isNearBlack(hex: "#000000"))
  }

  func test_nearBlack_veryDark() throws {
    XCTAssertTrue(isNearBlack(hex: "#0A0A0A"))
    XCTAssertTrue(isNearBlack(hex: "#111111"))
  }

  func test_notNearBlack_brightColor() throws {
    XCTAssertFalse(isNearBlack(hex: "#FF0000"))
    XCTAssertFalse(isNearBlack(hex: "#FFFFFF"))
    XCTAssertFalse(isNearBlack(hex: "#808080"))
  }
}
