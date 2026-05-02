import Foundation
import OSLog
import SwiftData
import WatchConnectivity
import WidgetKit

private let log = Logger(subsystem: "com.iferoporefi.myloyaltycards.watch", category: "WCSession")

/// Receives card snapshots from the paired iPhone via WatchConnectivity and
/// persists them into SwiftData so `CardListView`'s `@Query` picks them up.
///
/// Phone publishes the full card list via `updateApplicationContext` (snapshot,
/// last-write-wins). On activation we also send a `requestCards` ping so the
/// phone can immediately reply if it's reachable.
final class WatchSessionManager: NSObject, WCSessionDelegate {
  static let shared = WatchSessionManager()

  private var container: ModelContainer?

  /// Wire up the persistence container and kick off `WCSession` activation.
  /// Cached `applicationContext` is intentionally NOT read here — the iOS API
  /// only populates `WCSession.default.receivedApplicationContext` after the
  /// activation handshake completes, so we apply it from
  /// `session(_:activationDidCompleteWith:error:)` instead.
  func bind(container: ModelContainer) {
    self.container = container
    activateIfNeeded()
  }

  private func activateIfNeeded() {
    guard WCSession.isSupported() else {
      log.notice("WCSession not supported on this device")
      return
    }
    let session = WCSession.default
    if session.delegate == nil {
      session.delegate = self
    }
    if session.activationState != .activated {
      log.info("activating WCSession (state was \(session.activationState.rawValue))")
      session.activate()
    }
  }

  private func applyCachedContextIfAvailable() {
    guard WCSession.isSupported() else { return }
    let cached = WCSession.default.receivedApplicationContext
    if !cached.isEmpty {
      log.info("applying cached applicationContext (keys=\(cached.keys.sorted().joined(separator: ",")))")
      handleIncoming(payload: cached)
    }
  }

  // MARK: - WCSessionDelegate

  func session(
    _ session: WCSession,
    activationDidCompleteWith activationState: WCSessionActivationState,
    error: Error?
  ) {
    if let error {
      log.error("WCSession activation error: \(error.localizedDescription, privacy: .public)")
    }
    log.info(
      "activation complete: state=\(activationState.rawValue) reachable=\(session.isReachable)"
    )
    if activationState == .activated {
      applyCachedContextIfAvailable()
      // Best-effort ping so the phone can reply with the latest list if it's
      // foregrounded right now. The applicationContext path covers the
      // unreachable case.
      if session.isReachable {
        log.info("pinging phone with requestCards")
        session.sendMessage(["type": "requestCards"], replyHandler: nil, errorHandler: nil)
      }
    }
  }

  func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
    log.info("didReceiveApplicationContext")
    handleIncoming(payload: applicationContext)
  }

  func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
    log.info("didReceiveMessage")
    handleIncoming(payload: message)
  }

  func session(
    _ session: WCSession,
    didReceiveMessage message: [String: Any],
    replyHandler: @escaping ([String: Any]) -> Void
  ) {
    log.info("didReceiveMessage (reply expected)")
    handleIncoming(payload: message)
    replyHandler(["type": "ack"])
  }

  func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
    log.info("didReceiveUserInfo")
    handleIncoming(payload: userInfo)
  }

  // MARK: - Payload handling

  private func handleIncoming(payload: [String: Any]) {
    guard let cards = decodeCards(from: payload) else {
      log.notice("incoming payload had no decodable cards (type=\(payload["type"] as? String ?? "<nil>"))")
      return
    }
    log.info("decoded \(cards.count) card(s) from incoming payload — upserting")
    Task { @MainActor in
      self.upsert(cards: cards)
    }
  }

  /// Recognized payload shapes:
  /// - `{ "type": "cards", "payload": [WatchCard...] }` (snapshot via applicationContext)
  /// - `{ "type": "syncCards", "payload": [WatchCard...] }`
  /// - `{ "type": "syncCard", "payload": { "id": ..., "cardData": WatchCard } }`
  private func decodeCards(from payload: [String: Any]) -> [WatchCard]? {
    let type = payload["type"] as? String

    if type == "cards" || type == "syncCards" {
      if let array = payload["payload"] as? [Any], let cards = decodeArray(array) {
        return cards
      }
    }

    if type == "syncCard", let inner = payload["payload"] as? [String: Any] {
      let cardData = inner["cardData"] as? [String: Any] ?? inner
      if let card = decodeOne(cardData) {
        return [card]
      }
    }

    return nil
  }

  private func decodeArray(_ array: [Any]) -> [WatchCard]? {
    var result: [WatchCard] = []
    for item in array {
      if let dict = item as? [String: Any], let card = decodeOne(dict) {
        result.append(card)
      }
    }
    return result.isEmpty ? nil : result
  }

  private func decodeOne(_ dict: [String: Any]) -> WatchCard? {
    guard let data = try? JSONSerialization.data(withJSONObject: dict, options: []) else {
      return nil
    }
    let decoder = JSONDecoder()
    return try? decoder.decode(WatchCard.self, from: data)
  }

  // MARK: - SwiftData persistence

  @MainActor
  private func upsert(cards: [WatchCard]) {
    guard let container else { return }
    let context = container.mainContext

    let existing = (try? context.fetch(FetchDescriptor<WatchCardEntity>())) ?? []
    var byId: [String: WatchCardEntity] = [:]
    for entity in existing { byId[entity.id] = entity }

    let incomingIds = Set(cards.map { $0.id })

    for card in cards {
      let raw = try? JSONEncoder().encode(card)
      if let entity = byId[card.id] {
        entity.name = card.name
        entity.barcode = card.barcodeValue ?? entity.barcode
        entity.barcodeFormat = card.barcodeFormat ?? entity.barcodeFormat
        entity.brandId = card.brandId
        entity.color = card.colorHex ?? entity.color
        entity.usageCount = card.usageCount
        entity.lastUsedAt = card.lastUsedAt
        entity.updatedAt = Date()
        entity.rawPayload = raw
      } else {
        let entity = WatchCardEntity(
          id: card.id,
          name: card.name,
          barcode: card.barcodeValue ?? "",
          barcodeFormat: card.barcodeFormat ?? "CODE128",
          brandId: card.brandId,
          color: card.colorHex ?? "grey",
          isFavorite: false,
          lastUsedAt: card.lastUsedAt,
          usageCount: card.usageCount,
          createdAt: card.createdAt,
          updatedAt: Date(),
          rawPayload: raw
        )
        context.insert(entity)
      }
    }

    for entity in existing where !incomingIds.contains(entity.id) {
      context.delete(entity)
    }

    try? context.save()
    WidgetCenter.shared.reloadAllTimelines()
  }
}
