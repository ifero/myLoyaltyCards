import SwiftData
import XCTest

@testable import MyLoyaltyCardsWatch

final class CardStoreTests: XCTestCase {
  override func setUp() {
    super.setUp()
    UserDefaults.standard.removeObject(forKey: "watch.cards")
    // Guard against a prior test's UITEST_CARDS env override leaking into UserDefaults-backed
    // tests (setenv is process-global); every test starts from a clean slate regardless of order.
    unsetenv("UITEST_CARDS")
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

  // MARK: - Story 9.5: selectable watch sort (WatchSortMode)

  func test_sorted_byFrequent_matchesSortedForDisplay() throws {
    // `.frequent` must stay identical to the shared ordering the complication relies on.
    let formatter = makeISO8601Formatter()
    let created = try XCTUnwrap(formatter.date(from: "2026-01-01T00:00:00.000Z"))
    let cards = [
      WatchCard(
        id: "a", name: "Beta", brandId: nil, colorHex: "#1", barcodeValue: "1",
        barcodeFormat: "CODE128", usageCount: 2, lastUsedAt: nil, createdAt: created,
        isFavorite: false),
      WatchCard(
        id: "b", name: "Alpha", brandId: nil, colorHex: "#2", barcodeValue: "2",
        barcodeFormat: "CODE128", usageCount: 9, lastUsedAt: nil, createdAt: created,
        isFavorite: false),
      WatchCard(
        id: "c", name: "Gamma", brandId: nil, colorHex: "#3", barcodeValue: "3",
        barcodeFormat: "CODE128", usageCount: 0, lastUsedAt: nil, createdAt: created,
        isFavorite: true),
    ]

    XCTAssertEqual(
      WatchCard.sorted(cards, by: .frequent).map(\.id),
      WatchCard.sortedForDisplay(cards).map(\.id))
  }

  func test_sorted_byFrequent_usedCardOutranksNeverUsed_atSameUsageCount() throws {
    // Mixed-nil lastUsedAt at equal usageCount: a card that has been used must outrank one
    // that never has, regardless of createdAt — mirrors phone `sortByFrequent` (AC2).
    let formatter = makeISO8601Formatter()
    let jan = try XCTUnwrap(formatter.date(from: "2026-01-01T00:00:00.000Z"))
    let jun = try XCTUnwrap(formatter.date(from: "2026-06-01T00:00:00.000Z"))
    let cards = [
      WatchCard(
        id: "never-used", name: "B", brandId: nil, colorHex: "#1", barcodeValue: "1",
        barcodeFormat: "CODE128", usageCount: 5, lastUsedAt: nil, createdAt: jun,
        isFavorite: false),
      WatchCard(
        id: "was-used", name: "A", brandId: nil, colorHex: "#2", barcodeValue: "2",
        barcodeFormat: "CODE128", usageCount: 5, lastUsedAt: jun, createdAt: jan,
        isFavorite: false),
    ]

    XCTAssertEqual(WatchCard.sorted(cards, by: .frequent).map(\.id), ["was-used", "never-used"])
  }

  func test_sorted_byRecent_ordersByCreatedAtDescending_withoutFavouritePin() throws {
    let formatter = makeISO8601Formatter()
    let jan = try XCTUnwrap(formatter.date(from: "2026-01-01T00:00:00.000Z"))
    let feb = try XCTUnwrap(formatter.date(from: "2026-02-01T00:00:00.000Z"))
    let mar = try XCTUnwrap(formatter.date(from: "2026-03-01T00:00:00.000Z"))

    // A high-usage favourite created earliest must NOT be pinned in `.recent` —
    // recency is pure createdAt-descending chronology (matches phone `sortByRecent`).
    let cards = [
      WatchCard(
        id: "old-fav", name: "OldFav", brandId: nil, colorHex: "#1", barcodeValue: "1",
        barcodeFormat: "CODE128", usageCount: 99, lastUsedAt: nil, createdAt: jan,
        isFavorite: true),
      WatchCard(
        id: "mid", name: "Mid", brandId: nil, colorHex: "#2", barcodeValue: "2",
        barcodeFormat: "CODE128", usageCount: 0, lastUsedAt: nil, createdAt: feb,
        isFavorite: false),
      WatchCard(
        id: "new", name: "New", brandId: nil, colorHex: "#3", barcodeValue: "3",
        barcodeFormat: "CODE128", usageCount: 0, lastUsedAt: nil, createdAt: mar,
        isFavorite: false),
    ]

    XCTAssertEqual(WatchCard.sorted(cards, by: .recent).map(\.id), ["new", "mid", "old-fav"])
  }

  func test_sorted_byAZ_ordersByNameCaseInsensitive_withFavouritesFirst() throws {
    let cards = [
      WatchCard(
        id: "banana", name: "banana", brandId: nil, colorHex: "#1", barcodeValue: "1",
        barcodeFormat: "CODE128", isFavorite: false),
      WatchCard(
        id: "Apple", name: "Apple", brandId: nil, colorHex: "#2", barcodeValue: "2",
        barcodeFormat: "CODE128", isFavorite: false),
      WatchCard(
        id: "cherry-fav", name: "cherry", brandId: nil, colorHex: "#3", barcodeValue: "3",
        barcodeFormat: "CODE128", isFavorite: true),
    ]

    // Favourite "cherry" pins first; remaining names sort case-insensitively (Apple < banana).
    XCTAssertEqual(WatchCard.sorted(cards, by: .az).map(\.id), ["cherry-fav", "Apple", "banana"])
  }

  func test_sorted_byAZ_isDiacriticInsensitive_mirroringPhone() throws {
    // Phone uses localeCompare(sensitivity:'base'): accents do not change ordering.
    // "Èlite" must sort as if "Elite" — between "Acme" (A) and "Zeta" (Z).
    let cards = [
      WatchCard(
        id: "zeta", name: "Zeta", brandId: nil, colorHex: "#1", barcodeValue: "1",
        barcodeFormat: "CODE128", isFavorite: false),
      WatchCard(
        id: "elite-accent", name: "Èlite", brandId: nil, colorHex: "#2", barcodeValue: "2",
        barcodeFormat: "CODE128", isFavorite: false),
      WatchCard(
        id: "acme", name: "Acme", brandId: nil, colorHex: "#3", barcodeValue: "3",
        barcodeFormat: "CODE128", isFavorite: false),
    ]

    XCTAssertEqual(WatchCard.sorted(cards, by: .az).map(\.id), ["acme", "elite-accent", "zeta"])
  }

  func test_watchSortMode_defaultIsAZ() {
    // Fresh install with no saved preference → A-Z (AC3).
    XCTAssertEqual(WatchSortMode.defaultMode, .az)
  }

  func test_watchSortMode_allCases_matchPickerRowOrder() {
    // Declaration order is the picker row order (UX spec §5): Frequently used → Recently added → A-Z.
    XCTAssertEqual(WatchSortMode.allCases, [.frequent, .recent, .az])
  }

  func test_watchSortMode_persistsRawValueThroughUserDefaults() throws {
    // Mirrors how @AppStorage(WatchSortMode.storageKey) reads/writes the watch-local
    // preference (AC4): absent → caller default; a stored rawValue round-trips back.
    let defaults = UserDefaults.standard
    defaults.removeObject(forKey: WatchSortMode.storageKey)
    defer { defaults.removeObject(forKey: WatchSortMode.storageKey) }

    XCTAssertNil(defaults.string(forKey: WatchSortMode.storageKey))

    defaults.set(WatchSortMode.recent.rawValue, forKey: WatchSortMode.storageKey)
    let restored = defaults.string(forKey: WatchSortMode.storageKey)
      .flatMap(WatchSortMode.init(rawValue:))
    XCTAssertEqual(restored, .recent)
  }

  func test_readOnly_localCardEdits_doNotPersistAcrossReload() throws {
    // Apple Watch is read-only for card data (ADR-2026-06-09-001): the in-memory store is a
    // display snapshot of phone-synced data. The store has no write-back path, so a local edit
    // must not persist — a freshly loaded store still reflects only the synced snapshot.
    let synced = [
      WatchCard(
        id: "r1", name: "Synced", brandId: nil, colorHex: "#1e90ff", barcodeValue: nil,
        barcodeFormat: nil)
    ]
    UserDefaults.standard.set(try JSONEncoder().encode(synced), forKey: "watch.cards")
    defer { UserDefaults.standard.removeObject(forKey: "watch.cards") }

    let store = CardStore()
    XCTAssertEqual(store.cards.map(\.name), ["Synced"])

    // Simulate a local mutation attempt. The watch UI exposes no edit path; poking the in-memory
    // array directly proves even that cannot leak into the persistent store.
    store.cards = [
      WatchCard(
        id: "r1", name: "Edited locally", brandId: nil, colorHex: "#1e90ff", barcodeValue: nil,
        barcodeFormat: nil)
    ]

    // A brand-new store re-reads persistence: the edit never wrote back, so the snapshot is
    // unchanged. Were a card-data write-back path ever introduced, this assertion would fail.
    let reloaded = CardStore()
    XCTAssertEqual(reloaded.cards.map(\.name), ["Synced"])
  }
}
