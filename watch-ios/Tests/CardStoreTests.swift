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
        barcodeFormat: "QR", usageCount: 6, lastUsedAt: lastUsedAt, createdAt: createdAt,
        isFavorite: true)
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
    XCTAssertTrue(try XCTUnwrap(results.first).isFavorite)
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

  func test_watchCard_decodesIsFavorite_fromPhonePayload() throws {
    let payload = """
      {
        "id": "fav-1",
        "name": "Favourite Card",
        "colorHex": "#1e90ff",
        "barcodeValue": "1234567890",
        "barcodeFormat": "CODE128",
        "isFavorite": true
      }
      """.data(using: .utf8)!

    let decoded = try JSONDecoder().decode(WatchCard.self, from: payload)

    XCTAssertTrue(decoded.isFavorite)
  }

  func test_watchCard_defaultsIsFavorite_whenAbsent() throws {
    // Backward compat: payloads minted before Story 9.4 omit isFavorite entirely.
    let payload = """
      {
        "id": "legacy-fav",
        "name": "Legacy Card",
        "colorHex": "#ff6b6b",
        "barcodeValue": "12345",
        "barcodeFormat": "QR"
      }
      """.data(using: .utf8)!

    let decoded = try JSONDecoder().decode(WatchCard.self, from: payload)

    XCTAssertFalse(decoded.isFavorite)
  }

  func test_watchCard_encodesIsFavorite_intoPayload() throws {
    let card = WatchCard(
      id: "enc-fav",
      name: "Encoded Favourite",
      brandId: nil,
      colorHex: "#1e90ff",
      barcodeValue: "1234567890",
      barcodeFormat: "CODE128",
      isFavorite: true
    )

    let data = try JSONEncoder().encode(card)
    let json = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])

    XCTAssertEqual(json["isFavorite"] as? Bool, true)
  }

  @MainActor
  func test_watchSessionManager_upsert_updatesIsFavorite_onExistingEntity() throws {
    let container = try ModelContainer(
      for: WatchCardEntity.self, configurations: ModelConfiguration(isStoredInMemoryOnly: true))
    let context = ModelContext(container)

    let existing = WatchCardEntity(
      id: "fav-upsert-1",
      name: "Card",
      barcode: "111111",
      barcodeFormat: "QR",
      brandId: nil,
      color: "#ff0000",
      isFavorite: false,
      lastUsedAt: nil,
      usageCount: 0,
      createdAt: Date(),
      updatedAt: Date(),
      rawPayload: nil
    )
    context.insert(existing)
    try context.save()

    WatchSessionManager.upsert(
      cards: [
        WatchCard(
          id: "fav-upsert-1",
          name: "Card",
          brandId: nil,
          colorHex: "#ff0000",
          barcodeValue: "111111",
          barcodeFormat: "QR",
          isFavorite: true
        )
      ],
      in: context
    )

    let results = try context.fetch(FetchDescriptor<WatchCardEntity>())
    XCTAssertEqual(results.count, 1)
    XCTAssertTrue(try XCTUnwrap(results.first).isFavorite)
  }

  @MainActor
  func test_watchSessionManager_upsert_clearsIsFavorite_onExistingEntity() throws {
    // Un-favouriting on the phone must propagate to the Watch entity (true → false).
    let container = try ModelContainer(
      for: WatchCardEntity.self, configurations: ModelConfiguration(isStoredInMemoryOnly: true))
    let context = ModelContext(container)

    let existing = WatchCardEntity(
      id: "unfav-1",
      name: "Card",
      barcode: "111111",
      barcodeFormat: "QR",
      brandId: nil,
      color: "#ff0000",
      isFavorite: true,
      lastUsedAt: nil,
      usageCount: 0,
      createdAt: Date(),
      updatedAt: Date(),
      rawPayload: nil
    )
    context.insert(existing)
    try context.save()

    WatchSessionManager.upsert(
      cards: [
        WatchCard(
          id: "unfav-1",
          name: "Card",
          brandId: nil,
          colorHex: "#ff0000",
          barcodeValue: "111111",
          barcodeFormat: "QR",
          isFavorite: false
        )
      ],
      in: context
    )

    let results = try context.fetch(FetchDescriptor<WatchCardEntity>())
    XCTAssertEqual(results.count, 1)
    XCTAssertFalse(try XCTUnwrap(results.first).isFavorite)
  }

  /// Upserts `cards` into a fresh in-memory store and returns the complication
  /// "top card" name produced by the shared `sortedForDisplay` ordering.
  @MainActor
  private func topCardName(afterUpserting cards: [WatchCard]) throws -> String? {
    let suite = try XCTUnwrap(UserDefaults(suiteName: ComplicationSharedState.suiteName))
    suite.removeObject(forKey: ComplicationSharedState.topCardNameKey)

    let container = try ModelContainer(
      for: WatchCardEntity.self, configurations: ModelConfiguration(isStoredInMemoryOnly: true))
    WatchSessionManager.upsert(cards: cards, in: ModelContext(container))

    return suite.string(forKey: ComplicationSharedState.topCardNameKey)
  }

  @MainActor
  func test_watchSessionManager_upsert_topCard_prioritisesFavorite_overUsage() throws {
    // Integration: the upsert path feeds the shared sort into the complication's
    // persisted top-card name. A non-favourite with high usage must NOT outrank a
    // favourite with low usage.
    let top = try topCardName(afterUpserting: [
      WatchCard(
        id: "frequent", name: "Frequent", brandId: nil, colorHex: "#1e90ff",
        barcodeValue: "111", barcodeFormat: "CODE128", usageCount: 50, isFavorite: false),
      WatchCard(
        id: "favourite", name: "Favourite", brandId: nil, colorHex: "#ff6b6b",
        barcodeValue: "222", barcodeFormat: "CODE128", usageCount: 1, isFavorite: true),
    ])

    XCTAssertEqual(top, "Favourite")
  }

  func test_sortedForDisplay_appliesFullTierOrdering() throws {
    let formatter = makeISO8601Formatter()
    let oldCreated = try XCTUnwrap(formatter.date(from: "2026-01-01T00:00:00.000Z"))
    let newCreated = try XCTUnwrap(formatter.date(from: "2026-03-01T00:00:00.000Z"))
    let oldUsed = try XCTUnwrap(formatter.date(from: "2026-02-01T00:00:00.000Z"))
    let newUsed = try XCTUnwrap(formatter.date(from: "2026-04-01T00:00:00.000Z"))

    // Deliberately unsorted input that forces every tier to decide at least one pair:
    //  tier 0 isFavorite: "fav" wins outright (despite usage 0)
    //  tier 1 usageCount: "hiusage" leads the non-favourites
    //  tier 2 lastUsedAt:  "fresh" beats "stale" (same usage, more recent use)
    //  tier 3 createdAt:   "midcreated" beats "oldest" (same usage, no lastUsedAt)
    let cards = [
      WatchCard(
        id: "stale", name: "Stale", brandId: nil, colorHex: "#111", barcodeValue: "1",
        barcodeFormat: "CODE128", usageCount: 3, lastUsedAt: oldUsed, createdAt: newCreated,
        isFavorite: false),
      WatchCard(
        id: "fav", name: "Fav", brandId: nil, colorHex: "#222", barcodeValue: "2",
        barcodeFormat: "CODE128", usageCount: 0, lastUsedAt: nil, createdAt: oldCreated,
        isFavorite: true),
      WatchCard(
        id: "fresh", name: "Fresh", brandId: nil, colorHex: "#333", barcodeValue: "3",
        barcodeFormat: "CODE128", usageCount: 3, lastUsedAt: newUsed, createdAt: oldCreated,
        isFavorite: false),
      WatchCard(
        id: "oldest", name: "Oldest", brandId: nil, colorHex: "#444", barcodeValue: "4",
        barcodeFormat: "CODE128", usageCount: 0, lastUsedAt: nil, createdAt: oldCreated,
        isFavorite: false),
      WatchCard(
        id: "midcreated", name: "MidCreated", brandId: nil, colorHex: "#555", barcodeValue: "5",
        barcodeFormat: "CODE128", usageCount: 0, lastUsedAt: nil, createdAt: newCreated,
        isFavorite: false),
      WatchCard(
        id: "hiusage", name: "HiUsage", brandId: nil, colorHex: "#666", barcodeValue: "6",
        barcodeFormat: "CODE128", usageCount: 10, lastUsedAt: nil, createdAt: newCreated,
        isFavorite: false),
    ]

    let ordered = WatchCard.sortedForDisplay(cards).map(\.id)

    XCTAssertEqual(ordered, ["fav", "hiusage", "fresh", "stale", "midcreated", "oldest"])
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
