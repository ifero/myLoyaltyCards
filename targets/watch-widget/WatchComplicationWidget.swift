import AppIntents
import Foundation
import SwiftUI
import WidgetKit

private struct WatchWidgetCardSnapshot: Codable, Hashable, Sendable {
  let id: String
  let name: String
  let brandId: String?
}

private enum WatchWidgetSharedState {
  static let suiteName = "group.com.iferoporefi.myloyaltycards.watch-complication"
  static let topCardNameKey = "watch.complication.topCardName"
  static let hasCardsKey = "watch.complication.hasCards"
  static let cardsKey = "watch.complication.cards"

  struct State {
    let topCardName: String?
    let hasCards: Bool
    let cards: [WatchWidgetCardSnapshot]
  }

  static func load() -> State {
    let defaults = UserDefaults(suiteName: suiteName) ?? .standard
    let cards = loadCards(from: defaults)
    let topCardName = defaults.string(forKey: topCardNameKey)?.trimmingCharacters(in: .whitespacesAndNewlines)
    let hasCards = defaults.bool(forKey: hasCardsKey)

    return State(topCardName: topCardName, hasCards: hasCards, cards: cards)
  }

  private static func loadCards(from defaults: UserDefaults) -> [WatchWidgetCardSnapshot] {
    guard
      let data = defaults.data(forKey: cardsKey),
      let cards = try? JSONDecoder().decode([WatchWidgetCardSnapshot].self, from: data)
    else {
      return []
    }

    return cards
  }
}

struct WatchCardChoiceEntity: AppEntity, Identifiable, Hashable, Sendable {
  static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Card")
  static var defaultQuery = WatchCardChoiceEntityQuery()

  let id: String
  let name: String

  var displayRepresentation: DisplayRepresentation {
    DisplayRepresentation(title: "\(name)")
  }
}

struct WatchCardChoiceEntityQuery: EntityQuery {
  func entities(for identifiers: [WatchCardChoiceEntity.ID]) async throws -> [WatchCardChoiceEntity] {
    let cardsById = Dictionary(uniqueKeysWithValues: WatchWidgetSharedState.load().cards.map { ($0.id, $0) })
    return identifiers.compactMap { identifier in
      guard let card = cardsById[identifier] else {
        return nil
      }

      return WatchCardChoiceEntity(id: card.id, name: card.name)
    }
  }

  func suggestedEntities() async throws -> [WatchCardChoiceEntity] {
    WatchWidgetSharedState.load().cards
      .map { WatchCardChoiceEntity(id: $0.id, name: $0.name) }
      .sorted { lhs, rhs in
        lhs.name.localizedCaseInsensitiveCompare(rhs.name) == .orderedAscending
      }
  }
}

enum WatchComplicationMode: String, AppEnum {
  case openApp
  case selectedCard

  static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Complication Mode")
  static var caseDisplayRepresentations: [WatchComplicationMode: DisplayRepresentation] = [
    .openApp: DisplayRepresentation(title: "Open App"),
    .selectedCard: DisplayRepresentation(title: "Selected Card"),
  ]
}

struct WatchCardOptionsProvider: DynamicOptionsProvider {
  func results() async throws -> [WatchCardChoiceEntity] {
    try await WatchCardChoiceEntityQuery().suggestedEntities()
  }
}

struct WatchComplicationEntry: TimelineEntry {
  let date: Date
  let mode: WatchComplicationMode
  let title: String
  let subtitle: String
  let shortLabel: String
  let hasCards: Bool
  let selectedCardId: String?
  let brandId: String?

  var deepLinkURL: URL? {
    if mode == .selectedCard, let selectedCardId, !selectedCardId.isEmpty {
      var components = URLComponents()
      components.scheme = "myloyaltycards"
      components.host = "watch-card"
      components.queryItems = [URLQueryItem(name: "id", value: selectedCardId)]
      return components.url
    }

    return URL(string: "myloyaltycards://watch")
  }
}

struct WatchComplicationConfigurationIntent: WidgetConfigurationIntent {
  static var title: LocalizedStringResource { "Loyalty Card" }
  static var description: IntentDescription {
    IntentDescription("Choose whether the complication opens the app or shows a specific card.")
  }

  @Parameter(title: "Action", default: .openApp)
  var mode: WatchComplicationMode

  @Parameter(title: "Card", optionsProvider: WatchCardOptionsProvider())
  var selectedCard: WatchCardChoiceEntity?
}

struct WatchComplicationTimelineProvider: AppIntentTimelineProvider {
  func placeholder(in context: Context) -> WatchComplicationEntry {
    WatchComplicationEntry(
      date: Date(),
      mode: .selectedCard,
      title: "Esselunga",
      subtitle: WatchWidgetL10n.string("watch.widget.complication.entry.selected.subtitle"),
      shortLabel: "ES",
        hasCards: true,
        selectedCardId: "preview-card",
        brandId: "esselunga"
    )
  }

  func snapshot(
    for configuration: WatchComplicationConfigurationIntent,
    in context: Context
  ) async -> WatchComplicationEntry {
    makeEntry(for: configuration, at: Date())
  }

  func timeline(
    for configuration: WatchComplicationConfigurationIntent,
    in context: Context
  ) async -> Timeline<WatchComplicationEntry> {
    let current = makeEntry(for: configuration, at: Date())
    let refreshDate = Calendar.current.date(byAdding: .hour, value: 1, to: current.date) ?? current.date
    return Timeline(entries: [current], policy: .after(refreshDate))
  }

  func recommendations() -> [AppIntentRecommendation<WatchComplicationConfigurationIntent>] {
    []
  }

  private func makeEntry(
    for configuration: WatchComplicationConfigurationIntent,
    at date: Date
  ) -> WatchComplicationEntry {
    let state = WatchWidgetSharedState.load()

    if configuration.mode == .openApp {
      return WatchComplicationEntry(
        date: date,
        mode: .openApp,
        title: WatchWidgetL10n.string("watch.widget.complication.entry.open_app.title"),
        subtitle: WatchWidgetL10n.string("watch.widget.complication.entry.open_app.subtitle"),
        shortLabel: "APP",
        hasCards: state.hasCards,
        selectedCardId: nil,
        brandId: nil
      )
    }

    guard let configuredCard = configuration.selectedCard else {
      return WatchComplicationEntry(
        date: date,
        mode: .selectedCard,
        title: WatchWidgetL10n.string("watch.widget.complication.entry.choose_card.title"),
        subtitle: state.hasCards
          ? WatchWidgetL10n.string("watch.widget.complication.entry.choose_card.subtitle")
          : WatchWidgetL10n.string("watch.widget.complication.entry.sync.subtitle"),
        shortLabel: "??",
        hasCards: state.hasCards,
        selectedCardId: nil,
        brandId: nil
      )
    }

    let selectedCard = state.cards.first(where: { $0.id == configuredCard.id })

    guard let selectedCard else {
      return WatchComplicationEntry(
        date: date,
        mode: .selectedCard,
        title: WatchWidgetL10n.string("watch.widget.complication.entry.unavailable.title"),
        subtitle: state.hasCards
          ? WatchWidgetL10n.string("watch.widget.complication.entry.unavailable.subtitle")
          : WatchWidgetL10n.string("watch.widget.complication.entry.sync.subtitle"),
        shortLabel: "--",
        hasCards: state.hasCards,
        selectedCardId: nil,
        brandId: nil
      )
    }

    return WatchComplicationEntry(
      date: date,
      mode: .selectedCard,
      title: selectedCard.name,
      subtitle: WatchWidgetL10n.string("watch.widget.complication.entry.selected.subtitle"),
      shortLabel: shortLabel(from: selectedCard.name),
        hasCards: true,
        selectedCardId: selectedCard.id,
        brandId: selectedCard.brandId
    )
  }

  private func shortLabel(from value: String) -> String {
    let cleaned = value
      .trimmingCharacters(in: .whitespacesAndNewlines)
      .uppercased()

    let words = cleaned.split(whereSeparator: { $0.isWhitespace || $0 == "-" })
    if words.count >= 2 {
      let first = words[0].prefix(1)
      let second = words[1].prefix(1)
      return String(first + second)
    }

    return String(cleaned.prefix(2))
  }
}

struct WatchComplicationEntryView: View {
  @Environment(\.widgetFamily) private var family
  let entry: WatchComplicationEntry

  var body: some View {
    Group {
      switch family {
      case .accessoryCircular:
        circularContent
      case .accessoryInline:
        inlineContent
      case .accessoryRectangular, .accessoryCorner:
        rectangularContent
      default:
        rectangularContent
      }
    }
    .modifier(WatchComplicationBackground())
    .widgetURL(entry.deepLinkURL)
  }

  private var circularContent: some View {
    Group {
      if entry.mode == .openApp {
        openAppIcon
          .padding(3)
      } else {
        circularSelectedCardIcon
      }
    }
  }

  private var inlineContent: some View {
    Text(
      entry.mode == .openApp
        ? WatchWidgetL10n.string("watch.widget.complication.inline.open")
        : WatchWidgetL10n.format("watch.widget.complication.inline.card_format", entry.title)
    )
  }

  private var rectangularContent: some View {
    HStack(spacing: 6) {
      if entry.mode == .openApp {
        openAppIcon
          .frame(width: 20, height: 20)
      } else {
        rectangularSelectedCardIcon
      }

      VStack(alignment: .leading, spacing: 2) {
        Text(entry.subtitle)
          .font(.caption2)
          .lineLimit(1)
        Text(entry.title)
          .font(.caption)
          .lineLimit(1)
      }
      Spacer(minLength: 0)
    }
  }

  @ViewBuilder
  private var circularSelectedCardIcon: some View {
    if let brandLogoAssetName = BrandLogoCatalog.assetName(for: entry.brandId) {
      ZStack {
        Circle()
          .fill(Color.white.opacity(0.92))
        Image(brandLogoAssetName)
          .resizable()
          .renderingMode(.original)
          .scaledToFit()
          .padding(3)
      }
    } else {
      ZStack {
        Circle()
          .fill(circularBadgeColor)
        appIconFallback
      }
    }
  }

  @ViewBuilder
  private var rectangularSelectedCardIcon: some View {
    if let brandLogoAssetName = BrandLogoCatalog.assetName(for: entry.brandId) {
      ZStack {
        RoundedRectangle(cornerRadius: 4, style: .continuous)
          .fill(Color.white.opacity(0.92))
        Image(brandLogoAssetName)
          .resizable()
          .renderingMode(.original)
          .scaledToFit()
          .padding(2)
      }
      .frame(width: 20, height: 20)
    } else {
      ZStack {
        RoundedRectangle(cornerRadius: 4, style: .continuous)
          .fill(Color.white.opacity(0.92))
          .frame(width: 20, height: 20)
        Image("AppIcon")
          .resizable()
          .renderingMode(.original)
          .scaledToFit()
          .padding(2)
      }
    }
  }

  private var circularBadgeColor: Color {
    let hash = abs(entry.title.hashValue)
    let hue = Double(hash % 360) / 360.0
    return Color(hue: hue, saturation: 0.65, brightness: 0.85)
  }

  private var openAppIcon: some View {
    Image("AppIcon")
      .resizable()
      .renderingMode(.original)
      .scaledToFit()
      .clipShape(RoundedRectangle(cornerRadius: 4, style: .continuous))
  }

  private var appIconFallback: some View {
    Image("AppIcon")
      .resizable()
      .renderingMode(.original)
      .scaledToFit()
      .padding(3)
  }
}

private struct WatchComplicationBackground: ViewModifier {
  func body(content: Content) -> some View {
    if #available(watchOS 10.0, *) {
      content.containerBackground(.fill.tertiary, for: .widget)
    } else {
      content.padding().background()
    }
  }
}

private extension WidgetFamily {
  var isCorner: Bool {
    if #available(watchOS 10.0, *) {
      return self == .accessoryCorner
    }
    return false
  }
}

struct MyLoyaltyCardsWatchComplicationWidget: Widget {
  let kind: String = "MyLoyaltyCardsWatchComplication"

  var body: some WidgetConfiguration {
    AppIntentConfiguration(
      kind: kind,
      intent: WatchComplicationConfigurationIntent.self,
      provider: WatchComplicationTimelineProvider()
    ) { entry in
      WatchComplicationEntryView(entry: entry)
    }
    .configurationDisplayName("Loyalty Card")
    .description("Choose open-app mode or a specific loyalty card.")
    .supportedFamilies([
      .accessoryCircular,
      .accessoryRectangular,
      .accessoryInline,
      .accessoryCorner,
    ])
  }
}

@main
struct MyLoyaltyCardsWatchComplicationBundle: WidgetBundle {
  var body: some Widget {
    MyLoyaltyCardsWatchComplicationWidget()
  }
}
