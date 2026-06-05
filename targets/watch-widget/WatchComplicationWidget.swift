import SwiftUI
import WidgetKit

// A simple "open the app" complication: it shows the myLoyaltyCards app icon and
// launches the app when tapped. There is intentionally NO configuration / card
// selection — it's a static complication so there's nothing to misconfigure.
//
// The card-specific infrastructure (App Group snapshot, BrandLogoCatalog,
// WidgetCardPalette) is retained but dormant, so a per-card complication can be
// reintroduced later without rebuilding it from scratch.

struct WatchComplicationEntry: TimelineEntry {
  let date: Date
}

struct WatchComplicationTimelineProvider: TimelineProvider {
  func placeholder(in context: Context) -> WatchComplicationEntry {
    WatchComplicationEntry(date: Date())
  }

  func getSnapshot(in context: Context, completion: @escaping (WatchComplicationEntry) -> Void) {
    completion(WatchComplicationEntry(date: Date()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<WatchComplicationEntry>) -> Void) {
    // Static content; no time-based updates needed.
    completion(Timeline(entries: [WatchComplicationEntry(date: Date())], policy: .never))
  }
}

struct WatchComplicationEntryView: View {
  @Environment(\.widgetFamily) private var family
  let entry: WatchComplicationEntry

  var body: some View {
    Group {
      switch family {
      case .accessoryInline:
        Text(WatchWidgetL10n.string("watch.widget.complication.inline.open"))
      case .accessoryRectangular:
        HStack(spacing: 6) {
          appIcon.frame(width: 24, height: 24)
          Text(WatchWidgetL10n.string("watch.widget.complication.entry.open_app.title"))
            .font(.caption)
            .fontWeight(.semibold)
            .lineLimit(1)
          Spacer(minLength: 0)
        }
      default:
        appIcon.padding(2)
      }
    }
    .containerBackground(.fill.tertiary, for: .widget)
    .widgetURL(URL(string: "myloyaltycards://watch"))
  }

  /// The watch app icon, downsampled so WidgetKit can archive it (a full-size
  /// bitmap fails with `imageTooLarge` and the slot renders grey). Falls back to
  /// a card SF Symbol if the asset can't be loaded.
  @ViewBuilder
  private var appIcon: some View {
    if let icon = ComplicationImage.make("OpenAppIcon") {
      icon
        .resizable()
        .renderingMode(.original)
        .scaledToFit()
        .clipShape(RoundedRectangle(cornerRadius: 5, style: .continuous))
    } else {
      Image(systemName: "creditcard.fill")
        .resizable()
        .scaledToFit()
        .foregroundStyle(Color(hex: "#1A73E8"))
    }
  }
}

struct MyLoyaltyCardsWatchComplicationWidget: Widget {
  let kind: String = "MyLoyaltyCardsWatchComplication"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: WatchComplicationTimelineProvider()) { entry in
      WatchComplicationEntryView(entry: entry)
    }
    .configurationDisplayName("myLoyaltyCards")
    .description(Text(verbatim: WatchWidgetL10n.string("watch.widget.complication.entry.open_app.subtitle")))
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
