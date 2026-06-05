import Foundation
import WidgetKit

struct ComplicationCardSnapshot: Codable, Sendable {
  let id: String
  let name: String
  let brandId: String?
  /// Per-card color: a palette key ("red"/"blue"/"green"/"orange"/"grey")
  /// or a "#RRGGBB" hex string. The widget resolves it into a background tint.
  let colorHex: String?
}

enum ComplicationSharedState {
  static let suiteName = "group.com.iferoporefi.myloyaltycards.watch-complication"
  static let topCardNameKey = "watch.complication.topCardName"
  static let hasCardsKey = "watch.complication.hasCards"
  static let updatedAtKey = "watch.complication.updatedAt"
  static let cardsKey = "watch.complication.cards"

  static func persistTopCardName(_ topCardName: String?) {
    let defaults = UserDefaults(suiteName: suiteName) ?? .standard
    let normalizedName = topCardName?.trimmingCharacters(in: .whitespacesAndNewlines)
    let hasCards = (normalizedName?.isEmpty == false)

    defaults.set(hasCards, forKey: hasCardsKey)
    defaults.set(Date().timeIntervalSince1970, forKey: updatedAtKey)

    if let normalizedName, !normalizedName.isEmpty {
      defaults.set(normalizedName, forKey: topCardNameKey)
    } else {
      defaults.removeObject(forKey: topCardNameKey)
    }
  }

  static func persistCards(_ cards: [WatchCard]) {
    let defaults = UserDefaults(suiteName: suiteName) ?? .standard

    if cards.isEmpty {
      defaults.removeObject(forKey: cardsKey)
      return
    }

    let snapshots = cards.map {
      ComplicationCardSnapshot(id: $0.id, name: $0.name, brandId: $0.brandId, colorHex: $0.colorHex)
    }

    guard let encoded = try? JSONEncoder().encode(snapshots) else {
      return
    }

    defaults.set(encoded, forKey: cardsKey)
  }
}

enum ComplicationReloader {
  static let widgetKind = "MyLoyaltyCardsWatchComplication"

  static func reloadAllActiveComplications() {
    WidgetCenter.shared.reloadTimelines(ofKind: widgetKind)
  }
}
