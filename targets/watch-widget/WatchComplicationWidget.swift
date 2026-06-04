import AppIntents
import Foundation
import SwiftUI
import WidgetKit

private struct WatchWidgetCardSnapshot: Codable, Hashable, Sendable {
  let id: String
  let name: String
  let brandId: String?
  /// Palette key ("red"/"blue"/…) or "#RRGGBB" hex written by the watch app.
  /// Optional so snapshots persisted before this field decode cleanly.
  let colorHex: String?
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
  let colorHex: String?

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
      brandId: "esselunga",
      colorHex: "orange"
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
        brandId: nil,
        colorHex: nil
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
        brandId: nil,
        colorHex: nil
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
        brandId: nil,
        colorHex: nil
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
      brandId: selectedCard.brandId,
      colorHex: selectedCard.colorHex
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
      case .accessoryCircular, .accessoryCorner:
        circularContent
      case .accessoryInline:
        inlineContent
      case .accessoryRectangular:
        rectangularContent
      default:
        rectangularContent
      }
    }
    .containerBackground(for: .widget) {
      widgetBackground
    }
    .widgetURL(entry.deepLinkURL)
  }

  // MARK: - Colors

  /// The selected card's resolved background color, or nil for open-app /
  /// brandless-without-color states.
  private var cardColor: Color? {
    guard entry.mode == .selectedCard else { return nil }
    return WidgetCardPalette.color(for: entry.colorHex)
  }

  /// Fills the whole complication with the card's color so the brand reads on
  /// its own background; falls back to a neutral system material otherwise.
  @ViewBuilder
  private var widgetBackground: some View {
    if let cardColor {
      cardColor
    } else {
      Rectangle().fill(.fill.tertiary)
    }
  }

  /// Legible text color for labels drawn on `widgetBackground`.
  private var contentForeground: Color {
    guard cardColor != nil else { return .primary }
    return WidgetCardPalette.prefersWhiteForeground(for: entry.colorHex) ? .white : .black
  }

  // MARK: - Family layouts

  private var circularContent: some View {
    Group {
      if entry.mode == .openApp {
        openAppIcon.padding(3)
      } else {
        cardGlyphCircular.padding(2)
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
        openAppIcon.frame(width: 22, height: 22)
      } else {
        cardGlyphRectangular.frame(width: 24, height: 24)
      }

      VStack(alignment: .leading, spacing: 2) {
        Text(entry.subtitle)
          .font(.caption2)
          .lineLimit(1)
        Text(entry.title)
          .font(.caption)
          .fontWeight(.semibold)
          .lineLimit(1)
      }
      Spacer(minLength: 0)
    }
    .foregroundStyle(contentForeground)
  }

  // MARK: - Glyphs

  /// Light brand logos (e.g. Coop) are near-white and vanish on a white chip,
  /// so they get a dark chip instead. Everything else uses a white chip so
  /// multi-color and dark logos stay legible regardless of the card color.
  private var chipIsDark: Bool {
    BrandLogoCatalog.prefersDarkBacking(for: entry.brandId)
  }

  private var chipColor: Color {
    chipIsDark ? Color(hex: "#1C1C1F") : .white
  }

  /// The brand logo on a contrast-safe chip, or the card's initials when there
  /// is no catalogue logo. Always legible on the colored background behind it.
  @ViewBuilder
  private var cardGlyphRectangular: some View {
    ZStack {
      RoundedRectangle(cornerRadius: 5, style: .continuous)
        .fill(chipColor)
      brandLogoOrInitials(logoPadding: 2)
    }
  }

  @ViewBuilder
  private var cardGlyphCircular: some View {
    ZStack {
      Circle().fill(chipColor)
      brandLogoOrInitials(logoPadding: 4)
    }
  }

  @ViewBuilder
  private func brandLogoOrInitials(logoPadding: CGFloat) -> some View {
    if let brandLogoAssetName = BrandLogoCatalog.assetName(for: entry.brandId) {
      Image(brandLogoAssetName)
        .resizable()
        .renderingMode(.original)
        .scaledToFit()
        .padding(logoPadding)
    } else {
      Text(entry.shortLabel)
        .font(.system(size: 12, weight: .bold))
        .minimumScaleFactor(0.6)
        .lineLimit(1)
        .foregroundStyle(chipIsDark ? .white : (cardColor ?? .black))
        .padding(logoPadding)
    }
  }

  private var openAppIcon: some View {
    Image("OpenAppIcon")
      .resizable()
      .renderingMode(.original)
      .scaledToFit()
      .clipShape(RoundedRectangle(cornerRadius: 5, style: .continuous))
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
