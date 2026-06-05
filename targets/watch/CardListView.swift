import Foundation
import SwiftData
import SwiftUI

// Simple watch-side card model (read-only snapshot for display)
struct WatchCard: Identifiable, Codable {
  let id: String
  let name: String
  let brandId: String?
  let colorHex: String?  // optional color hex (e.g. "#FF6B6B")
  // Optional barcode fields (may be absent for older persisted payloads)
  let barcodeValue: String?
  let barcodeFormat: String?  // values like "CODE128", "EAN13", "QR" etc.
  let barcodeImageBase64: String?
  // Sorting fields are decoded when present and defaulted when absent so
  // older persisted payloads remain compatible.
  var usageCount: Int = 0
  var lastUsedAt: Date? = nil
  var createdAt: Date = Date()

  init(
    id: String,
    name: String,
    brandId: String? = nil,
    colorHex: String? = nil,
    barcodeValue: String? = nil,
    barcodeFormat: String? = nil,
    barcodeImageBase64: String? = nil,
    usageCount: Int = 0,
    lastUsedAt: Date? = nil,
    createdAt: Date = Date()
  ) {
    self.id = id
    self.name = name
    self.brandId = brandId
    self.colorHex = colorHex
    self.barcodeValue = barcodeValue
    self.barcodeFormat = barcodeFormat
    self.barcodeImageBase64 = barcodeImageBase64
    self.usageCount = usageCount
    self.lastUsedAt = lastUsedAt
    self.createdAt = createdAt
  }

  enum CodingKeys: String, CodingKey {
    case id, name, brandId, colorHex, barcodeValue, barcodeFormat, barcodeImageBase64, usageCount, lastUsedAt,
      createdAt
  }

  init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: CodingKeys.self)
    id = try container.decode(String.self, forKey: .id)
    name = try container.decode(String.self, forKey: .name)
    brandId = try container.decodeIfPresent(String.self, forKey: .brandId)
    colorHex = try container.decodeIfPresent(String.self, forKey: .colorHex)
    barcodeValue = try container.decodeIfPresent(String.self, forKey: .barcodeValue)
    barcodeFormat = try container.decodeIfPresent(String.self, forKey: .barcodeFormat)
    barcodeImageBase64 = try container.decodeIfPresent(String.self, forKey: .barcodeImageBase64)
    usageCount = try container.decodeIfPresent(Int.self, forKey: .usageCount) ?? 0
    lastUsedAt = try Self.decodeDateIfPresent(from: container, forKey: .lastUsedAt)
    createdAt = try Self.decodeDateIfPresent(from: container, forKey: .createdAt) ?? Date()
  }

  func encode(to encoder: Encoder) throws {
    var container = encoder.container(keyedBy: CodingKeys.self)
    try container.encode(id, forKey: .id)
    try container.encode(name, forKey: .name)
    try container.encodeIfPresent(brandId, forKey: .brandId)
    try container.encodeIfPresent(colorHex, forKey: .colorHex)
    try container.encodeIfPresent(barcodeValue, forKey: .barcodeValue)
    try container.encodeIfPresent(barcodeFormat, forKey: .barcodeFormat)
    try container.encodeIfPresent(barcodeImageBase64, forKey: .barcodeImageBase64)
    try container.encode(usageCount, forKey: .usageCount)
    if let lastUsedAt {
      try container.encode(Self.encodeDate(lastUsedAt), forKey: .lastUsedAt)
    }
    try container.encode(Self.encodeDate(createdAt), forKey: .createdAt)
  }

  private static func decodeDateIfPresent(
    from container: KeyedDecodingContainer<CodingKeys>,
    forKey key: CodingKeys
  ) throws -> Date? {
    if let value = try container.decodeIfPresent(String.self, forKey: key) {
      return decodeDate(value)
    }

    if let value = try container.decodeIfPresent(Double.self, forKey: key) {
      return Date(timeIntervalSinceReferenceDate: value)
    }

    return nil
  }

  private static func decodeDate(_ value: String) -> Date? {
    if let date = fractionalSecondsFormatter.date(from: value) {
      return date
    }

    return internetDateTimeFormatter.date(from: value)
  }

  private static func encodeDate(_ value: Date) -> String {
    fractionalSecondsFormatter.string(from: value)
  }

  private static let fractionalSecondsFormatter: ISO8601DateFormatter = {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return formatter
  }()

  private static let internetDateTimeFormatter: ISO8601DateFormatter = {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime]
    return formatter
  }()
}

final class CardStore: ObservableObject {
  @Published var cards: [WatchCard] = []

  init() {
    loadPersistedCards()
  }

  // Minimal loader: reads from UserDefaults (sync target) or keeps empty
  private func loadPersistedCards() {
    // Test hook: allow UI tests to inject cards via environment variable
    if let env = ProcessInfo.processInfo.environment["UITEST_CARDS"],
      let envData = env.data(using: .utf8),
      let decodedFromEnv = try? JSONDecoder().decode([WatchCard].self, from: envData)
    {
      self.cards = decodedFromEnv
      return
    }

    if let data = UserDefaults.standard.data(forKey: "watch.cards") {
      if let decoded = try? JSONDecoder().decode([WatchCard].self, from: data) {
        self.cards = decoded
        return
      }
    }

    // default: empty (empty-state should be visible)
    self.cards = []
  }

  // Migration helper — extracts migration logic so it can be unit-tested.
  func migrateUserDefaults(to modelContext: ModelContext) {
    guard let data = UserDefaults.standard.data(forKey: "watch.cards"),
      let decoded = try? JSONDecoder().decode([WatchCard].self, from: data)
    else {
      return
    }

    for c in decoded {
      let raw = try? JSONEncoder().encode(c)
      let entity = WatchCardEntity(
        id: c.id,
        name: c.name,
        barcode: c.barcodeValue ?? "",
        barcodeFormat: c.barcodeFormat ?? "CODE128",
        brandId: c.brandId,
        color: c.colorHex ?? "grey",
        isFavorite: false,
        lastUsedAt: c.lastUsedAt,
        usageCount: c.usageCount,
        createdAt: c.createdAt,
        updatedAt: Date(),
        rawPayload: raw
      )
      modelContext.insert(entity)
    }

    try? modelContext.save()
    UserDefaults.standard.removeObject(forKey: "watch.cards")
    ComplicationSharedState.persistCards(decoded)

    let topCardName = decoded
      .sorted {
        if $0.usageCount != $1.usageCount { return $0.usageCount > $1.usageCount }
        if let lhsLast = $0.lastUsedAt, let rhsLast = $1.lastUsedAt, lhsLast != rhsLast {
          return lhsLast > rhsLast
        }
        return $0.createdAt > $1.createdAt
      }
      .first?
      .name

    ComplicationSharedState.persistTopCardName(topCardName)

    ComplicationReloader.reloadAllActiveComplications()
  }
}

// MARK: - Helpers moved to ColorHelpers.swift
// initials(from:), mapColor(hex:), parseHexColor(_:), contrast helpers
// are now in ColorHelpers.swift for reusability and testability.

struct CardRowView: View {
  let card: WatchCard

  private let metrics = WatchCardRowLayoutMetrics.compact

  private func normalizedBrandId(_ brandId: String?) -> String? {
    guard let brandId = brandId?
      .trimmingCharacters(in: .whitespacesAndNewlines),
      !brandId.isEmpty
    else {
      return nil
    }

    return brandId.lowercased()
  }

  private var resolvedBrand: WatchBrand? {
    guard let brandId = normalizedBrandId(card.brandId) else {
      return nil
    }

    return WatchBrands.all.first(where: { $0.id == brandId })
  }

  /// Resolved brand color hex string (from catalogue or user-selected).
  private var resolvedColorHex: String {
    if let brand = resolvedBrand {
      // Use a deterministic hex from the brand id hash when no explicit color exists
      return card.colorHex ?? "#\(String(format: "%06X", abs(brand.id.hashValue) % 0xFFFFFF))"
    }
    return card.colorHex ?? ""
  }

  /// Accent color derived from the resolved hex.
  private var accentColor: Color {
    mapColor(hex: resolvedColorHex) ?? .gray
  }

  var body: some View {
    HStack(spacing: metrics.rowSpacing) {
      RoundedRectangle(cornerRadius: 3)
        .fill(accentColor)
        .frame(width: metrics.accentWidth, height: metrics.accentHeight)

      logoView
        .frame(width: metrics.avatarSize, height: metrics.avatarSize)
        .clipShape(Circle())

      Text(card.name)
        .font(.system(size: 15, weight: .semibold))
        .foregroundColor(.white)
        .lineLimit(1)
        .minimumScaleFactor(0.85)
        .truncationMode(.tail)
        .layoutPriority(1)

      Spacer()
    }
    .padding(.horizontal, metrics.horizontalPadding)
    .padding(.vertical, metrics.verticalPadding)
    .frame(minHeight: metrics.minimumTapHeight)
    .background(
      RoundedRectangle(cornerRadius: metrics.cornerRadius)
        .fill(Color(red: 28 / 255, green: 28 / 255, blue: 31 / 255)) // #1C1C1F
    )
    .overlay(
      RoundedRectangle(cornerRadius: metrics.cornerRadius)
        .stroke(isNearBlack(hex: resolvedColorHex) ? Color.white.opacity(0.15) : Color.clear, lineWidth: 1)
    )
    .accessibilityElement(children: .combine)
    .accessibilityLabel(WatchL10n.format("watch.card_row.accessibility_format", card.name))
  }

  @ViewBuilder
  private var logoView: some View {
    if let brand = resolvedBrand {
      // Catalogue brand — initials on brand-colored circle
      let bgColor = accentColor
      let useWhite = shouldUseWhiteText(onBackgroundHex: resolvedColorHex)
      ZStack {
        bgColor
        Text(initials(from: brand.name ?? brand.id))
          .font(.system(size: 12, weight: .bold))
          .foregroundColor(useWhite ? .white : .black)
      }
    } else {
      // Custom card — user-selected color with initials
      let bgColor = accentColor
      let colorHex = card.colorHex ?? ""
      let useWhite = shouldUseWhiteText(onBackgroundHex: colorHex)
      ZStack {
        bgColor
        Text(initials(from: card.name))
          .font(.system(size: 12, weight: .bold))
          .foregroundColor(useWhite ? .white : .black)
      }
    }
  }
}

private struct WatchCardRoute: Hashable {
  let cardId: String
}

private enum WatchComplicationDeepLink {
  static let scheme = "myloyaltycards"
  static let cardHost = "watch-card"
  static let cardIdQueryItem = "id"

  static func cardId(from url: URL) -> String? {
    guard
      url.scheme?.lowercased() == scheme,
      url.host?.lowercased() == cardHost,
      let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
      let cardId = components.queryItems?.first(where: { $0.name == cardIdQueryItem })?.value?
        .trimmingCharacters(in: .whitespacesAndNewlines),
      !cardId.isEmpty
    else {
      return nil
    }

    return cardId
  }
}

struct CardListView: View {
  @Environment(\.modelContext) private var modelContext
  @Query private var persistedEntities: [WatchCardEntity]
  @StateObject private var store: CardStore
  @State private var navigationPath: [WatchCardRoute] = []
  @State private var pendingDeepLinkCardId: String?

  init(store: CardStore = CardStore()) {
    _store = StateObject(wrappedValue: store)
  }

  /// Cards sorted by usageCount desc → lastUsedAt desc → createdAt desc.
  private var displayCards: [WatchCard] {
    let entities: [WatchCard]
    if !persistedEntities.isEmpty {
      entities = persistedEntities.map { e in
        if let rawPayload = e.rawPayload,
          let decoded = try? JSONDecoder().decode(WatchCard.self, from: rawPayload)
        {
          return decoded
        }

        return WatchCard(
          id: e.id,
          name: e.name,
          brandId: e.brandId,
          colorHex: e.color,
          barcodeValue: e.barcode,
          barcodeFormat: e.barcodeFormat,
          usageCount: e.usageCount,
          lastUsedAt: e.lastUsedAt,
          createdAt: e.createdAt
        )
      }
    } else {
      entities = store.cards
    }
    return entities.sorted { a, b in
      if a.usageCount != b.usageCount { return a.usageCount > b.usageCount }
      if let aLast = a.lastUsedAt, let bLast = b.lastUsedAt, aLast != bLast {
        return aLast > bLast
      }
      return a.createdAt > b.createdAt
    }
  }

  var body: some View {
    NavigationStack(path: $navigationPath) {
      Group {
        if displayCards.isEmpty {
          emptyState
        } else {
          ScrollView {
            LazyVStack(spacing: 6) {
              ForEach(displayCards) { card in
                NavigationLink(value: WatchCardRoute(cardId: card.id)) {
                  CardRowView(card: card)
                }
                .buttonStyle(.plain)
                .accessibilityIdentifier("card-row-\(card.id)")
              }
            }
            .padding(.horizontal, 2)
            .padding(.vertical, 2)
          }
        }
      }
      .navigationTitle(WatchL10n.string("watch.cards.title"))
      .navigationDestination(for: WatchCardRoute.self) { route in
        if let card = displayCards.first(where: { $0.id == route.cardId }) {
          BarcodeFlashView(card: card)
        } else {
          Text(WatchL10n.string("watch.cards.unavailable"))
            .font(.footnote)
            .foregroundColor(.white.opacity(0.7))
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Color.black)
        }
      }
    }
    #if DEBUG
      .toolbar {
        // use a watch-safe placement for the debug import button
        ToolbarItem(placement: .automatic) {
          Button(action: importSampleCards) {
            Text(WatchL10n.string("watch.debug.import_sample_cards"))
          }
          .accessibilityIdentifier("import-sample-cards")
        }
      }
    #endif
    .background(Color.black)
    .scrollContentBackground(.hidden)
    .onAppear {
      // If SwiftData contains records we prefer them. Otherwise migrate from older UserDefaults payload.
      if persistedEntities.isEmpty {
        store.migrateUserDefaults(to: modelContext)
      }

      // existing behavior: store still used as fallback for UI tests or older builds
    }
    .onOpenURL { url in
      guard let cardId = WatchComplicationDeepLink.cardId(from: url) else {
        return
      }

      openCardRouteIfAvailable(cardId)
    }
    .onChange(of: displayCards.map(\.id)) { _ in
      guard let pendingDeepLinkCardId else {
        return
      }

      openCardRouteIfAvailable(pendingDeepLinkCardId)
    }
  }

  private func openCardRouteIfAvailable(_ cardId: String) {
    guard displayCards.contains(where: { $0.id == cardId }) else {
      pendingDeepLinkCardId = cardId
      return
    }

    pendingDeepLinkCardId = nil
    navigationPath = [WatchCardRoute(cardId: cardId)]
  }

  private var emptyState: some View {
    VStack(spacing: 16) {
      // Icon — creditcard SF Symbol, prominent per watchOS HIG empty state guidance
      Image(systemName: "creditcard")
        .font(.system(size: 48, weight: .light))
        .foregroundColor(.white.opacity(0.5))
        .accessibilityHidden(true)

      VStack(spacing: 8) {
        Text(WatchL10n.string("watch.cards.empty.title"))
          .font(.headline)
          .foregroundColor(.white)
          .accessibilityIdentifier("empty-state-title")

        Text(WatchL10n.string("watch.cards.empty.subtitle"))
          .font(.footnote)
          .foregroundColor(.white.opacity(0.6))
          .multilineTextAlignment(.center)
          .accessibilityIdentifier("empty-state-subtitle")
      }
    }
    .padding(.horizontal, 12)
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .accessibilityElement(children: .combine)
    .accessibilityLabel(WatchL10n.string("watch.cards.empty.accessibility"))
  }

  #if DEBUG
    private func importSampleCards() {
      let sample: [WatchCard] = [
        WatchCard(
          id: "1", name: "Esselunga", brandId: "brand-special", colorHex: "#1e90ff",
          barcodeValue: "5901234123457", barcodeFormat: "EAN13"),
        WatchCard(
          id: "2", name: "Local Bakery", brandId: nil, colorHex: "#ff6b6b",
          barcodeValue: "012345678905", barcodeFormat: "UPCA"),
        WatchCard(
          id: "3", name: "Healthy Market", brandId: nil, colorHex: "green",
          barcodeValue: "https://example.com", barcodeFormat: "QR"),
      ]

      if let data = try? JSONEncoder().encode(sample) {
        UserDefaults.standard.set(data, forKey: "watch.cards")
      }

      // Immediately refresh visible store
      store.cards = sample
      WKInterfaceDevice.current().play(.success)
    }
  #endif
}

struct CardListView_Previews: PreviewProvider {
  static var previews: some View {
    Group {
      CardListView()
        .previewDisplayName("Empty")

      CardListViewPreviewData()
        .previewDisplayName("With cards")
    }
    .preferredColorScheme(.dark)
  }

  struct CardListViewPreviewData: View {
    var body: some View {
      CardListViewMock(cards: [
        WatchCard(
          id: "1", name: "Esselunga", brandId: "brand-special", colorHex: "#1e90ff",
          barcodeValue: "5901234123457", barcodeFormat: "EAN13"),
        WatchCard(
          id: "2", name: "Local Bakery", brandId: nil, colorHex: "#ff6b6b",
          barcodeValue: "012345678905", barcodeFormat: "UPCA"),
        WatchCard(
          id: "3", name: "Healthy Market", brandId: nil, colorHex: "green",
          barcodeValue: "https://example.com", barcodeFormat: "QR"),
      ])
    }
  }

  struct CardListViewMock: View {
    let cards: [WatchCard]
    var body: some View {
      let s = CardStore()
      s.cards = cards
      return CardListView(store: s)
    }
  }
}
