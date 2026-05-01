import SwiftData
import SwiftUI

@main
struct MyLoyaltyCardsWatchApp: App {
  let container: ModelContainer

  init() {
    let container = try! ModelContainer(for: WatchCardEntity.self)
    self.container = container
    WatchSessionManager.shared.bind(container: container)
  }

  var body: some Scene {
    WindowGroup {
      ContentView()
    }
    .modelContainer(container)
  }
}
