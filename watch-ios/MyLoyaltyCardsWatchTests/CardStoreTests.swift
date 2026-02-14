import XCTest
@testable import MyLoyaltyCardsWatch

final class CardStoreTests: XCTestCase {
  override func setUp() {
    super.setUp()
    UserDefaults.standard.removeObject(forKey: "watch.cards")
  }

  func test_loadPersistedCards_readsFromUserDefaults() throws {
    let cards = [
      WatchCard(id: "1", name: "Test Card", brandId: nil, colorHex: "#1e90ff")
    ]
    let data = try JSONEncoder().encode(cards)
    UserDefaults.standard.set(data, forKey: "watch.cards")

    let store = CardStore()
    XCTAssertEqual(store.cards.count, 1)
    XCTAssertEqual(store.cards.first?.name, "Test Card")
  }

  func test_loadPersistedCards_prefersUITestEnvironment() throws {
    // Provide JSON via environment variable (used by UI tests)
    let cards = [WatchCard(id: "2", name: "Env Card", brandId: nil, colorHex: "#ff6b6b")]
    let data = try JSONEncoder().encode(cards)
    let json = String(data: data, encoding: .utf8)!

    // Temporarily inject into environment for this process
    setenv("UITEST_CARDS", json, 1)
    defer { unsetenv("UITEST_CARDS") }

    let store = CardStore()
    XCTAssertEqual(store.cards.count, 1)
    XCTAssertEqual(store.cards.first?.name, "Env Card")
  }
}
