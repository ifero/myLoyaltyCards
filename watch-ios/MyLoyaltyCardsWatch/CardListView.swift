import SwiftData
import SwiftUI
import Foundation

// Notification for when watch card payloads have been applied
extension Notification.Name {
  static let watchCardsDidChange = Notification.Name("watch.cards.didChange")
}

// Simple watch-side card model (read-only snapshot for display)
struct WatchCard: Identifiable, Codable {
  let id: String
  let name: String
  let brandId: String?
  let colorHex: String?  // optional color hex (e.g. "#FF6B6B")
  // Optional barcode fields (may be absent for older persisted payloads)
  let barcodeValue: String?
  let barcodeFormat: String?  // values like "CODE128", "EAN13", "QR" etc.
}

final class CardStore: ObservableObject {
  @Published var cards: [WatchCard] = []

  init() {
    loadPersistedCards()

    // Listen for incoming sync updates applied by the WatchConnectivity receiver
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(handleWatchCardsChangedNotification),
      name: .watchCardsDidChange,
      object: nil
    )
  }

  deinit {
    NotificationCenter.default.removeObserver(self, name: .watchCardsDidChange, object: nil)
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

  @objc
  private func handleWatchCardsChangedNotification() {
    // Reload persisted cards from UserDefaults when a sync payload is applied
    loadPersistedCards()
  }

  /// Apply an incoming sync payload (used by WatchConnectivity receiver).
  /// - Payload format: { "version": String, "upserts": [Card], "deletes": [String] }
  static func applySyncPayload(_ payload: [String: Any]) {
    // Load current persisted watch cards
    var current: [WatchCard] = []
    if let data = UserDefaults.standard.data(forKey: "watch.cards"),
      let decoded = try? JSONDecoder().decode([WatchCard].self, from: data)
    {
      current = decoded
    }

    // Handle upserts (replace or append)
    if let upserts = payload["upserts"] as? [[String: Any]] {
      for c in upserts {
        guard let id = c["id"] as? String else { continue }
        let name = c["name"] as? String ?? ""
        let brandId = c["brandId"] as? String
        // Accept either `color` (key) or `colorHex` from sender
        let colorHex = (c["colorHex"] as? String) ?? (c["color"] as? String)
        let barcodeValue = c["barcode"] as? String
        let barcodeFormat = c["barcodeFormat"] as? String

        let watchCard = WatchCard(
          id: id,
          name: name,
          brandId: brandId,
          colorHex: colorHex,
          barcodeValue: barcodeValue,
          barcodeFormat: barcodeFormat
        )

        if let idx = current.firstIndex(where: { $0.id == id }) {
          current[idx] = watchCard
        } else {
          current.append(watchCard)
        }
      }
    }

    // Handle deletes
    if let deletes = payload["deletes"] as? [String], !deletes.isEmpty {
      current.removeAll { deletes.contains($0.id) }
    }

    // Persist updated list and notify observers
    if let out = try? JSONEncoder().encode(current) {
      UserDefaults.standard.set(out, forKey: "watch.cards")
      NotificationCenter.default.post(name: .watchCardsDidChange, object: nil)
    }
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

// MARK: - Helpers (file-level, testable)

func initials(from name: String) -> String {
  let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
  guard !trimmed.isEmpty else { return "" }
  let parts = trimmed.split(separator: " ")
  if parts.count >= 2 {
    let first = parts[0].first.map(String.init) ?? ""
    let second = parts[1].first.map(String.init) ?? ""
    return (first + second).uppercased()
  }
  return String(trimmed.prefix(2)).uppercased()
}

func mapColor(hex: String?) -> Color? {
  guard let hex = hex?.trimmingCharacters(in: .whitespacesAndNewlines), !hex.isEmpty else {
    return nil
  }
  switch hex.lowercased() {
  case "#1e90ff", "blue": return Color.blue
  case "#ff6b6b", "red": return Color.red
  case "#2ecc71", "green": return Color.green
  case "#ffa500", "orange": return Color.orange
  case "#9ca3af", "gray", "grey":
    return Color(red: 156 / 255, green: 163 / 255, blue: 175 / 255)
  default:
    return Color.gray
  }
}

struct CardRowView: View {
  let card: WatchCard

  var body: some View {
    HStack(spacing: 12) {
      visualIdentifier
        .frame(width: 44, height: 28)
        .cornerRadius(6)

      Text(card.name)
        .font(.system(size: 16, weight: .semibold))
        .foregroundColor(.white)
        .lineLimit(1)

      Spacer()
    }
    .padding(.vertical, 6)
    .accessibilityElement(children: .combine)
    .accessibilityLabel("Card, \(card.name)")
  }

  @ViewBuilder
  private var visualIdentifier: some View {
    if let brandId = card.brandId,
      let brand = WatchBrands.all.first(where: { $0.id == brandId })
    {
      // For now show brand initials from generated catalogue (watch-side asset mapping is handled elsewhere)
      ZStack {
        Color.gray.opacity(0.15)
        Text(brandInitials(name: brand.name ?? brand.id))
          .font(.system(size: 12, weight: .bold))
          .foregroundColor(.white)
      }
    } else {
      ZStack {
        mapColor(hex: card.colorHex) ?? Color.gray
        Text(initials(from: card.name))
          .font(.system(size: 12, weight: .bold))
          .foregroundColor(.black)
      }
    }
  }

  private func brandInitials(name: String) -> String {
    return String(name.trimmingCharacters(in: .whitespacesAndNewlines).prefix(2)).uppercased()
  }
}

struct CardListView: View {
  @Environment(\.modelContext) private var modelContext
  @Query(sort: \WatchCardEntity.createdAt, order: .reverse) private var persistedEntities:
    [WatchCardEntity]
  @StateObject private var store: CardStore

  init(store: CardStore = CardStore()) {
    _store = StateObject(wrappedValue: store)
  }

  private var displayCards: [WatchCard] {
    if !persistedEntities.isEmpty {
      return persistedEntities.map { e in
        WatchCard(
          id: e.id,
          name: e.name,
          brandId: e.brandId,
          colorHex: e.color,
          barcodeValue: e.barcode,
          barcodeFormat: e.barcodeFormat
        )
      }
    }
    return store.cards
  }

  var body: some View {
    NavigationStack {
      Group {
        if displayCards.isEmpty {
          emptyState
        } else {
          List(displayCards) { card in
            NavigationLink(destination: BarcodeFlashView(card: card)) {
              CardRowView(card: card)
                .listRowBackground(Color.clear)
            }
            .accessibilityIdentifier("card-row-\(card.id)")
          }
          .listStyle(.plain)
        }
      }
    }
    #if DEBUG
      .toolbar {
        ToolbarItem(placement: .navigationBarTrailing) {
          Button(action: importSampleCards) {
            Text("Import sample cards")
          }
          .accessibilityIdentifier("import-sample-cards")
        }
      }
    #endif
    .navigationTitle("")
    .navigationBarHidden(true)
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

  private func openCard(_ card: WatchCard) {
    // Post-MVP: navigate to barcode view. For now no-op (watch is read-only).
    WKInterfaceDevice.current().play(.click)
  }
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
