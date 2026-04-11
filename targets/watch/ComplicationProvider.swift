import SwiftData
import SwiftUI
import WidgetKit

// MARK: - Timeline Entry

struct CardComplicationEntry: TimelineEntry {
  let date: Date
  let cardName: String?
}

// MARK: - Timeline Provider

struct CardComplicationProvider: TimelineProvider {
  func placeholder(in context: Context) -> CardComplicationEntry {
    CardComplicationEntry(date: Date(), cardName: "Esselunga")
  }

  func getSnapshot(in context: Context, completion: @escaping (CardComplicationEntry) -> Void) {
    let entry = CardComplicationEntry(date: Date(), cardName: mostUsedCardName())
    completion(entry)
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<CardComplicationEntry>) -> Void) {
    let cardName = mostUsedCardName()
    let entry = CardComplicationEntry(date: Date(), cardName: cardName)
    // Refresh in 1 hour or when explicitly triggered via WidgetCenter.shared.reloadAllTimelines()
    let nextUpdate = Calendar.current.date(byAdding: .hour, value: 1, to: Date()) ?? Date()
    let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
    completion(timeline)
  }

  /// Query the most-used card from SwiftData (sorted by usageCount descending).
  private func mostUsedCardName() -> String? {
    guard
      let container = try? ModelContainer(for: WatchCardEntity.self),
      let cards = try? ModelContext(container).fetch(
        FetchDescriptor<WatchCardEntity>(
          sortBy: [SortDescriptor(\WatchCardEntity.usageCount, order: .reverse)]
        )
      ),
      let topCard = cards.first
    else {
      return nil
    }
    return topCard.name
  }
}

// MARK: - Complication Views

struct CardComplicationSmallView: View {
  var body: some View {
    Image(systemName: "creditcard.fill")
      .font(.title3)
      .foregroundColor(.white)
      .accessibilityLabel("myLoyaltyCards")
  }
}

struct CardComplicationMediumView: View {
  let entry: CardComplicationEntry

  var body: some View {
    if let name = entry.cardName {
      HStack(spacing: 4) {
        Image(systemName: "creditcard.fill")
          .font(.caption)
          .foregroundColor(.white)
        Text(name)
          .font(.system(size: 14, weight: .medium))
          .foregroundColor(.white)
          .lineLimit(1)
      }
      .accessibilityLabel("Loyalty card: \(name)")
    } else {
      Image(systemName: "creditcard.fill")
        .font(.title3)
        .foregroundColor(.white)
        .accessibilityLabel("myLoyaltyCards")
    }
  }
}

/// Dispatches the correct complication view based on the widget family.
struct CardComplicationEntryView: View {
  @Environment(\.widgetFamily) var family
  let entry: CardComplicationEntry

  var body: some View {
    switch family {
    case .accessoryCircular:
      CardComplicationSmallView()
    case .accessoryRectangular, .accessoryInline:
      CardComplicationMediumView(entry: entry)
    default:
      CardComplicationMediumView(entry: entry)
    }
  }
}

// MARK: - Widget Definition

struct MyLoyaltyCardsComplication: Widget {
  let kind: String = "MyLoyaltyCardsComplication"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: CardComplicationProvider()) { entry in
      CardComplicationEntryView(entry: entry)
        .containerBackground(.black, for: .widget)
    }
    .configurationDisplayName("Loyalty Card")
    .description("Shows your most-used loyalty card.")
    .supportedFamilies([
      .accessoryCircular,
      .accessoryRectangular,
      .accessoryInline,
    ])
  }
}

// MARK: - Widget Bundle
// ⚠️ KNOWN LIMITATION: This complication requires a separate Widget Extension target
// to appear on watch faces. The @main annotation is commented out because including
// it in the main app target conflicts with MyLoyaltyCardsWatchApp.swift's @main.
// To activate: create a Widget Extension target in Xcode, move this file there,
// and uncomment @main below. Tracked for follow-up implementation.
// @main
struct MyLoyaltyCardsWidgetBundle: WidgetBundle {
  var body: some Widget {
    MyLoyaltyCardsComplication()
  }
}

// MARK: - Previews

#Preview("Circular", as: .accessoryCircular) {
  MyLoyaltyCardsComplication()
} timeline: {
  CardComplicationEntry(date: Date(), cardName: "Esselunga")
  CardComplicationEntry(date: Date(), cardName: nil)
}

#Preview("Rectangular", as: .accessoryRectangular) {
  MyLoyaltyCardsComplication()
} timeline: {
  CardComplicationEntry(date: Date(), cardName: "Esselunga")
  CardComplicationEntry(date: Date(), cardName: nil)
}
