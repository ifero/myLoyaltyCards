import SwiftData
import SwiftUI

@main
struct MyLoyaltyCardsWatchApp: App {
  // Initialize WatchConnectivity handler on app launch
  init() {
    WatchConnectivityHandler.shared.start()
  }

  var body: some Scene {
    WindowGroup {
      ContentView()
        .modelContainer(ModelContainer(for: [WatchCardEntity.self]))
    }
  }
}

import WatchConnectivity

final class WatchConnectivityHandler: NSObject, WCSessionDelegate {
  static let shared = WatchConnectivityHandler()

  private override init() {
    super.init()
  }

  func start() {
    guard WCSession.isSupported() else { return }
    let session = WCSession.default
    session.delegate = self
    session.activate()
  }

  // Receive an instant message from the phone
  func session(_ session: WCSession, didReceiveMessage message: [String : Any]) {
    DispatchQueue.main.async {
      CardStore.applySyncPayload(message)
    }
  }

  // Receive userInfo (queued transfer)
  func session(_ session: WCSession, didReceiveUserInfo userInfo: [String : Any] = [:]) {
    DispatchQueue.main.async {
      CardStore.applySyncPayload(userInfo)
    }
  }

  // Required delegate stubs
  func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {}
  func sessionDidBecomeInactive(_ session: WCSession) {}
  func sessionDidDeactivate(_ session: WCSession) {}
}
