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
  // Sorting fields (non-coded for backward compat with older JSON payloads)
  var usageCount: Int = 0
  var lastUsedAt: Date? = nil
  var createdAt: Date = Date()

  enum CodingKeys: String, CodingKey {
    case id, name, brandId, colorHex, barcodeValue, barcodeFormat
  }
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
        lastUsedAt: nil,
        usageCount: 0,
        createdAt: Date(),
        updatedAt: Date(),
        rawPayload: raw
      )
      modelContext.insert(entity)
    }

    try? modelContext.save()
    UserDefaults.standard.removeObject(forKey: "watch.cards")
  }
}

// MARK: - Helpers moved to ColorHelpers.swift
// initials(from:), mapColor(hex:), parseHexColor(_:), contrast helpers
// are now in ColorHelpers.swift for reusability and testability.

struct CardRowView: View {
  let card: WatchCard

  /// Resolved brand color hex string (from catalogue or user-selected).
  private var resolvedColorHex: String {
    if let brandId = card.brandId,
      let brand = WatchBrands.all.first(where: { $0.id == brandId })
    {
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
    HStack(spacing: 12) {
      // Vertical accent bar — brand color indicator (Figma: 6×32, 3px rounded)
      RoundedRectangle(cornerRadius: 3)
        .fill(accentColor)
        .frame(width: 6, height: 32)

      // Circular logo/avatar area (Figma: 36×36)
      logoView
        .frame(width: 36, height: 36)
        .clipShape(Circle())

      // Card name (Figma: 20px medium, white, single line)
      Text(card.name)
        .font(.system(size: 16, weight: .semibold))
        .foregroundColor(.white)
        .lineLimit(1)
        .truncationMode(.tail)

      Spacer()
    }
    .padding(.horizontal, 12)
    .padding(.vertical, 16)
    .background(
      RoundedRectangle(cornerRadius: 16)
        .fill(Color(red: 28 / 255, green: 28 / 255, blue: 31 / 255)) // #1C1C1F
    )
    .accessibilityElement(children: .combine)
    .accessibilityLabel("Card, \(card.name)")
  }

  @ViewBuilder
  private var logoView: some View {
    if let brandId = card.brandId,
      let brand = WatchBrands.all.first(where: { $0.id == brandId })
    {
      // Catalogue brand — initials on brand-colored circle
      let bgColor = accentColor
      let useWhite = shouldUseWhiteText(onBackgroundHex: resolvedColorHex)
      ZStack {
        bgColor
        Text(initials(from: brand.name ?? brand.id))
          .font(.system(size: 14, weight: .bold))
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
          .font(.system(size: 14, weight: .bold))
          .foregroundColor(useWhite ? .white : .black)
      }
    }
  }
}

struct CardListView: View {
  @Environment(\.modelContext) private var modelContext
  @Query private var persistedEntities: [WatchCardEntity]
  @StateObject private var store: CardStore

  init(store: CardStore = CardStore()) {
    _store = StateObject(wrappedValue: store)
  }

  /// Cards sorted by usageCount desc → lastUsedAt desc → createdAt desc.
  private var displayCards: [WatchCard] {
    let entities: [WatchCard]
    if !persistedEntities.isEmpty {
      entities = persistedEntities.map { e in
        WatchCard(
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
    NavigationStack {
      Group {
        if displayCards.isEmpty {
          emptyState
        } else {
          ScrollView {
            LazyVStack(spacing: 8) {
              ForEach(displayCards) { card in
                NavigationLink(destination: BarcodeFlashView(card: card)) {
                  CardRowView(card: card)
                }
                .buttonStyle(.plain)
                .accessibilityIdentifier("card-row-\(card.id)")
              }
            }
            .padding(.horizontal, 4)
          }
        }
      }
      .navigationTitle("Cards")
    }
    #if DEBUG
      .toolbar {
        // use a watch-safe placement for the debug import button
        ToolbarItem(placement: .automatic) {
          Button(action: importSampleCards) {
            Text("Import sample cards")
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
  }

  private var emptyState: some View {
    VStack(spacing: 6) {
      Text("No cards on this watch yet")
        .font(.system(size: 14, weight: .semibold))
        .foregroundColor(.white)
      Text("Add cards from the phone app; they’ll appear here automatically when synced.")
        .font(.system(size: 11))
        .foregroundColor(.white.opacity(0.7))
        .multilineTextAlignment(.center)
        .padding(.horizontal, 6)
    }
    .padding()
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
