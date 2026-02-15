import SwiftData
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

  func test_watchCardEntity_persistence_inModelContext() throws {
    let container = try ModelContainer(for: [WatchCardEntity.self])
    let context = ModelContext(container: container)

    let entity = WatchCardEntity(
      id: "persist-1",
      name: "Persisted Card",
      barcode: "5901234123457",
      barcodeFormat: "EAN13",
      brandId: nil,
      color: "#1e90ff",
      isFavorite: false,
      lastUsedAt: nil,
      usageCount: 0,
      createdAt: Date(),
      updatedAt: Date(),
      rawPayload: nil
    )

    context.insert(entity)
    try context.save()

    let results = try context.fetch(FetchDescriptor<WatchCardEntity>())
    XCTAssertEqual(results.count, 1)
    XCTAssertEqual(results.first?.name, "Persisted Card")
  }

  func test_migration_fromUserDefaults_to_SwiftData() throws {
    // Arrange: seed UserDefaults with old JSON payload
    let cards = [
      WatchCard(
        id: "m1", name: "Migrated", brandId: nil, colorHex: "#ff6b6b", barcodeValue: "12345",
        barcodeFormat: "QR")
    ]
    let data = try JSONEncoder().encode(cards)
    UserDefaults.standard.set(data, forKey: "watch.cards")

    // Prepare an in-memory SwiftData container
    let container = try ModelContainer(for: [WatchCardEntity.self])
    let context = ModelContext(container: container)

    // Act: run migration helper
    let store = CardStore()
    store.migrateUserDefaults(to: context)

    // Assert: entity exists and UserDefaults cleared
    let results = try context.fetch(FetchDescriptor<WatchCardEntity>())
    XCTAssertEqual(results.count, 1)
    XCTAssertEqual(results.first?.name, "Migrated")
    XCTAssertNil(UserDefaults.standard.data(forKey: "watch.cards"))
  }

  func test_applySyncPayload_upsertsAndDeletes_and_notifiesStore() throws {
    // Start with empty persisted cards
    UserDefaults.standard.removeObject(forKey: "watch.cards")

    // Prepare an upsert payload
    let payload: [String: Any] = [
      "version": "1.0.0",
      "upserts": [
        [
          "id": "s1",
          "name": "Synced Card",
          "brandId": NSNull(),
          "color": "#1e90ff",
          "barcode": "5901234123457",
          "barcodeFormat": "EAN13"
        ]
      ],
      "deletes": ["to-delete"]
    ]

    // Apply payload
    CardStore.applySyncPayload(payload)

    // Verify UserDefaults contains the new card
    let data = UserDefaults.standard.data(forKey: "watch.cards")
    XCTAssertNotNil(data)
    let decoded = try JSONDecoder().decode([WatchCard].self, from: data!)
    XCTAssertEqual(decoded.count, 1)
    XCTAssertEqual(decoded.first?.id, "s1")
    XCTAssertEqual(decoded.first?.name, "Synced Card")

    // Verify CardStore observes the change
    let store = CardStore()
    // CardStore should load persisted cards on init
    XCTAssertEqual(store.cards.first?.id, "s1")
  }
}
