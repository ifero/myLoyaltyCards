import XCTest

final class CardListUITests: XCTestCase {
  let app = XCUIApplication()

  override func setUpWithError() throws {
    continueAfterFailure = false
  }

  func test_emptyState_showsMessage() throws {
    app.launchEnvironment["UITEST_CARDS"] = "[]"
    app.launch()

    let emptyText = app.staticTexts["No cards on this watch yet"]
    XCTAssertTrue(emptyText.waitForExistence(timeout: 2), "Empty state message should appear")
  }

  func test_list_showsCards_and_supportsScrolling() throws {
    let cards = [
      ["id": "1", "name": "Card A", "brandId": NSNull(), "colorHex": "#1e90ff"],
      ["id": "2", "name": "Card B", "brandId": NSNull(), "colorHex": "#ff6b6b"],
      ["id": "3", "name": "Card C", "brandId": NSNull(), "colorHex": "green"]
    ]
    let jsonData = try JSONSerialization.data(withJSONObject: cards, options: [])
    let json = String(data: jsonData, encoding: .utf8)!

    app.launchEnvironment["UITEST_CARDS"] = json
    app.launch()

    // Verify first card visible
    let first = app.staticTexts["Card A"]
    XCTAssertTrue(first.waitForExistence(timeout: 2))

    // Attempt to scroll: simulate a crown rotation or swipe
    if #available(watchOS 10.0, *) {
      // XCUIRemote rotate may be available on watchOS simulators; fallback to swipe
      XCUIRemote.shared().rotate(.clockwise, withVelocity: 4)
    } else {
      app.swipeUp()
    }

    // After scrolling, ensure another card is reachable
    let third = app.staticTexts["Card C"]
    XCTAssertTrue(third.waitForExistence(timeout: 2))
  }
}
