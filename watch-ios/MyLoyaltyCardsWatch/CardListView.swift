import SwiftUI

// Simple watch-side card model (read-only snapshot for display)
struct WatchCard: Identifiable, Codable {
  let id: String
  let name: String
  let brandId: String?
  let colorHex: String? // optional color hex (e.g. "#FF6B6B")
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
       let decodedFromEnv = try? JSONDecoder().decode([WatchCard].self, from: envData) {
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
  guard let hex = hex?.trimmingCharacters(in: .whitespacesAndNewlines), !hex.isEmpty else { return nil }
  switch hex.lowercased() {
  case "#1e90ff", "blue": return Color.blue
  case "#ff6b6b", "red": return Color.red
  case "#2ecc71", "green": return Color.green
  case "#ffa500", "orange": return Color.orange
  case "#9ca3af", "gray":
    return Color(red: 156/255, green: 163/255, blue: 175/255)
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
       let brand = WatchBrands.all.first(where: { $0.id == brandId }) {
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
  @StateObject private var store: CardStore

  init(store: CardStore = CardStore()) {
    _store = StateObject(wrappedValue: store)
  }

  var body: some View {
    NavigationStack {
      Group {
        if store.cards.isEmpty {
          emptyState
        } else {
          List(store.cards) { card in
            Button(action: { openCard(card) }) {
              CardRowView(card: card)
                .listRowBackground(Color.clear)
            }
            .buttonStyle(.plain)
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
      // placeholder: real sync will populate UserDefaults via WatchConnectivity
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
      WatchCard(id: "1", name: "Esselunga", brandId: "brand-special", colorHex: "#1e90ff"),
      WatchCard(id: "2", name: "Local Bakery", brandId: nil, colorHex: "#ff6b6b"),
      WatchCard(id: "3", name: "Healthy Market", brandId: nil, colorHex: "green")
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
        WatchCard(id: "1", name: "Esselunga", brandId: "brand-special", colorHex: "#1e90ff"),
        WatchCard(id: "2", name: "Local Bakery", brandId: nil, colorHex: "#ff6b6b"),
        WatchCard(id: "3", name: "Healthy Market", brandId: nil, colorHex: "green")
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
