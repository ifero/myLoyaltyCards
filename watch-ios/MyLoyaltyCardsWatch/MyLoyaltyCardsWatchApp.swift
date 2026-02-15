import SwiftData
import SwiftUI

@main
struct MyLoyaltyCardsWatchApp: App {
  var body: some Scene {
    WindowGroup {
      ContentView()
        .modelContainer(ModelContainer(for: [WatchCardEntity.self]))
    }
  }
}
