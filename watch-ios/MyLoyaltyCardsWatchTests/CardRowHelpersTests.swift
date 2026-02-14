import XCTest
@testable import MyLoyaltyCardsWatch

final class CardRowHelpersTests: XCTestCase {
  func test_initials_twoWords() throws {
    XCTAssertEqual(initials(from: "Local Bakery"), "LB")
  }

  func test_initials_singleWord() throws {
    XCTAssertEqual(initials(from: "Esselunga"), "ES")
  }

  func test_initials_empty() throws {
    XCTAssertEqual(initials(from: ""), "")
  }

  func test_mapColor_knownHex_returnsColor() throws {
    XCTAssertNotNil(mapColor(hex: "#1e90ff"))
    XCTAssertNotNil(mapColor(hex: "green"))
  }

  func test_mapColor_nil_returnsNil() throws {
    XCTAssertNil(mapColor(hex: nil))
  }

  func test_mapColor_unknown_returnsFallback() throws {
    // Unknown hex should return a fallback Color (non-nil)
    XCTAssertNotNil(mapColor(hex: "#badhex"))
  }
}
