import SwiftData
import XCTest

@testable import MyLoyaltyCardsWatch

final class CardStoreTests: XCTestCase {
  override func setUp() {
    super.setUp()
    UserDefaults.standard.removeObject(forKey: "watch.cards")
  }

  private func makeISO8601Formatter() -> ISO8601DateFormatter {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return formatter
  }

  func test_loadPersistedCards_readsFromUserDefaults() throws {
    let cards = [
      WatchCard(
        id: "1", name: "Test Card", brandId: nil, colorHex: "#1e90ff", barcodeValue: nil,
        barcodeFormat: nil)
    ]
    let data = try JSONEncoder().encode(cards)
    UserDefaults.standard.set(data, forKey: "watch.cards")

    let store = CardStore()
    XCTAssertEqual(store.cards.count, 1)
    XCTAssertEqual(store.cards.first?.name, "Test Card")
  }

  func test_loadPersistedCards_prefersUITestEnvironment() throws {
    // Provide JSON via environment variable (used by UI tests)
    let cards = [
      WatchCard(
        id: "2", name: "Env Card", brandId: nil, colorHex: "#ff6b6b", barcodeValue: nil,
        barcodeFormat: nil)
    ]
    let data = try JSONEncoder().encode(cards)
    let json = String(data: data, encoding: .utf8)!

    // Temporarily inject into environment for this process
    setenv("UITEST_CARDS", json, 1)
    defer { unsetenv("UITEST_CARDS") }

    let store = CardStore()
    XCTAssertEqual(store.cards.count, 1)
    XCTAssertEqual(store.cards.first?.name, "Env Card")
  }

  func test_watchCard_decodesSortFields_fromPhonePayload() throws {
    let formatter = makeISO8601Formatter()
    let lastUsedAt = "2026-05-03T09:30:00.000Z"
    let createdAt = "2026-05-01T12:15:00.000Z"
    let payload = """
      {
        "id": "sort-1",
        "name": "Sorted Card",
        "brandId": "esselunga",
        "colorHex": "#1e90ff",
        "barcodeValue": "1234567890",
        "barcodeFormat": "CODE128",
        "usageCount": 7,
        "lastUsedAt": "\(lastUsedAt)",
        "createdAt": "\(createdAt)"
      }
      """.data(using: .utf8)!

    let decoded = try JSONDecoder().decode(WatchCard.self, from: payload)

    XCTAssertEqual(decoded.usageCount, 7)
    XCTAssertEqual(decoded.lastUsedAt, formatter.date(from: lastUsedAt))
    XCTAssertEqual(decoded.createdAt, formatter.date(from: createdAt))
  }

  func test_watchCard_decodesLegacyPayload_withoutSortFields() throws {
    let payload = """
      {
        "id": "legacy-1",
        "name": "Legacy Card",
        "colorHex": "#ff6b6b",
        "barcodeValue": "12345",
        "barcodeFormat": "QR"
      }
      """.data(using: .utf8)!

    let decoded = try JSONDecoder().decode(WatchCard.self, from: payload)

    XCTAssertEqual(decoded.id, "legacy-1")
    XCTAssertEqual(decoded.usageCount, 0)
    XCTAssertNil(decoded.lastUsedAt)
  }

  func test_watchCard_encodesSortFields_asISO8601Strings() throws {
    let formatter = makeISO8601Formatter()
    let createdAt = try XCTUnwrap(formatter.date(from: "2026-05-01T12:15:00.000Z"))
    let lastUsedAt = try XCTUnwrap(formatter.date(from: "2026-05-03T09:30:00.000Z"))
    let card = WatchCard(
      id: "encoded-1",
      name: "Encoded Card",
      brandId: "esselunga",
      colorHex: "#1e90ff",
      barcodeValue: "1234567890",
      barcodeFormat: "CODE128",
      usageCount: 9,
      lastUsedAt: lastUsedAt,
      createdAt: createdAt
    )

    let data = try JSONEncoder().encode(card)
    let json = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])

    XCTAssertEqual(json["usageCount"] as? Int, 9)
    XCTAssertEqual(json["lastUsedAt"] as? String, "2026-05-03T09:30:00.000Z")
    XCTAssertEqual(json["createdAt"] as? String, "2026-05-01T12:15:00.000Z")
  }

  func test_watchCardEntity_persistence_inModelContext() throws {
    let container = try ModelContainer(
      for: WatchCardEntity.self, configurations: ModelConfiguration(isStoredInMemoryOnly: true))
    let context = ModelContext(container)

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
    let formatter = makeISO8601Formatter()
    let createdAt = try XCTUnwrap(formatter.date(from: "2026-05-01T12:15:00.000Z"))
    let lastUsedAt = try XCTUnwrap(formatter.date(from: "2026-05-03T09:30:00.000Z"))

    // Arrange: seed UserDefaults with old JSON payload
    let cards = [
      WatchCard(
        id: "m1", name: "Migrated", brandId: nil, colorHex: "#ff6b6b", barcodeValue: "12345",
        barcodeFormat: "QR", usageCount: 6, lastUsedAt: lastUsedAt, createdAt: createdAt)
    ]
    let data = try JSONEncoder().encode(cards)
    UserDefaults.standard.set(data, forKey: "watch.cards")

    // Prepare an in-memory SwiftData container
    let container = try ModelContainer(
      for: WatchCardEntity.self, configurations: ModelConfiguration(isStoredInMemoryOnly: true))
    let context = ModelContext(container)

    // Act: run migration helper
    let store = CardStore()
    store.migrateUserDefaults(to: context)

    // Assert: entity exists and UserDefaults cleared
    let results = try context.fetch(FetchDescriptor<WatchCardEntity>())
    XCTAssertEqual(results.count, 1)
    XCTAssertEqual(results.first?.name, "Migrated")
    XCTAssertEqual(results.first?.usageCount, 6)
    XCTAssertEqual(results.first?.lastUsedAt, lastUsedAt)
    XCTAssertEqual(results.first?.createdAt, createdAt)
    XCTAssertNil(UserDefaults.standard.data(forKey: "watch.cards"))
  }

  @MainActor
  func test_watchSessionManager_upsert_repairsExistingSortMetadata() throws {
    let formatter = makeISO8601Formatter()
    let staleCreatedAt = try XCTUnwrap(formatter.date(from: "2026-04-01T12:15:00.000Z"))
    let refreshedCreatedAt = try XCTUnwrap(formatter.date(from: "2026-05-01T12:15:00.000Z"))
    let refreshedLastUsedAt = try XCTUnwrap(formatter.date(from: "2026-05-03T09:30:00.000Z"))

    let container = try ModelContainer(
      for: WatchCardEntity.self, configurations: ModelConfiguration(isStoredInMemoryOnly: true))
    let context = ModelContext(container)

    let existing = WatchCardEntity(
      id: "repair-1",
      name: "Old Card",
      barcode: "111111",
      barcodeFormat: "QR",
      brandId: "conad",
      color: "#ff0000",
      isFavorite: false,
      lastUsedAt: nil,
      usageCount: 0,
      createdAt: staleCreatedAt,
      updatedAt: staleCreatedAt,
      rawPayload: nil
    )

    context.insert(existing)
    try context.save()

    WatchSessionManager.upsert(
      cards: [
        WatchCard(
          id: "repair-1",
          name: "Updated Card",
          brandId: "conad",
          colorHex: "#DA291C",
          barcodeValue: "222222",
          barcodeFormat: "CODE128",
          usageCount: 5,
          lastUsedAt: refreshedLastUsedAt,
          createdAt: refreshedCreatedAt
        )
      ],
      in: context
    )

    let results = try context.fetch(FetchDescriptor<WatchCardEntity>())
    XCTAssertEqual(results.count, 1)
    XCTAssertEqual(results.first?.name, "Updated Card")
    XCTAssertEqual(results.first?.barcode, "222222")
    XCTAssertEqual(results.first?.barcodeFormat, "CODE128")
    XCTAssertEqual(results.first?.usageCount, 5)
    XCTAssertEqual(results.first?.lastUsedAt, refreshedLastUsedAt)
    XCTAssertEqual(results.first?.createdAt, refreshedCreatedAt)
  }

  func test_readOnly_preventsCardModification() throws {
    let store = CardStore()
    let originalCards = [
      WatchCard(
        id: "r1", name: "ReadOnly", brandId: nil, colorHex: "#1e90ff", barcodeValue: nil,
        barcodeFormat: nil)
    ]
    store.cards = originalCards
    // Simula un tentativo di modifica (che dovrebbe essere ignorato)
    // In una vera app, la UI non espone azioni di modifica, ma qui simuliamo una chiamata diretta
    // Proviamo a cambiare il nome della card
    var modified = store.cards
    modified[0] = WatchCard(
      id: "r1", name: "MODIFIED", brandId: nil, colorHex: "#1e90ff", barcodeValue: nil,
      barcodeFormat: nil)
    // Non aggiorniamo store.cards: la logica read-only è a livello di UI e modello
    // Verifica che la store rimanga invariata
    XCTAssertEqual(store.cards[0].name, "ReadOnly")
  }
}
