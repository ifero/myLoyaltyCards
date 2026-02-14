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
      ["id": "3", "name": "Card C", "brandId": NSNull(), "colorHex": "green"],
    ]
    let jsonData = try JSONSerialization.data(withJSONObject: cards, options: [])
    let json = String(data: jsonData, encoding: .utf8)!

    app.launchEnvironment["UITEST_CARDS"] = json
    app.launch()

    // Verify first card visible (by text and accessibility identifier)
    let first = app.staticTexts["Card A"]
    XCTAssertTrue(first.waitForExistence(timeout: 2))

    let firstRow = app.buttons["card-row-1"]
    XCTAssertTrue(firstRow.waitForExistence(timeout: 2), "Row identifier should be present")

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

  func test_importSampleCards_buttonAddsCards() throws {
    // Start with empty state so the debug import is visible
    app.launchEnvironment["UITEST_CARDS"] = "[]"
    app.launch()

    let importButton = app.buttons["import-sample-cards"]
    XCTAssertTrue(
      importButton.waitForExistence(timeout: 2), "Import button should be visible in DEBUG")

    importButton.tap()

    // Imported sample should appear
    let first = app.staticTexts["Esselunga"]
    XCTAssertTrue(first.waitForExistence(timeout: 2))
  }

  func test_tapCard_displaysBarcode() throws {
    let cards = [
      ["id": "1", "name": "Esselunga", "brandId": NSNull(), "colorHex": "#1e90ff"]
    ]
    let jsonData = try JSONSerialization.data(withJSONObject: cards, options: [])
    let json = String(data: jsonData, encoding: .utf8)!

    app.launchEnvironment["UITEST_CARDS"] = json
    app.launch()

    let firstRow = app.buttons["card-row-1"]
    XCTAssertTrue(firstRow.waitForExistence(timeout: 2))
    firstRow.tap()

    let barcodeView = app.otherElements["barcode-view"]
    XCTAssertTrue(barcodeView.waitForExistence(timeout: 2))
    let cardName = app.staticTexts["barcode-card-name"]
    XCTAssertTrue(cardName.waitForExistence(timeout: 2))
  }
}
