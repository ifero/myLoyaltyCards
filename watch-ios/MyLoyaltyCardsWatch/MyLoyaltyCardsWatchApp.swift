import SwiftUI
import SwiftData

@main
struct MyLoyaltyCardsWatchApp: App {
  var body: some Scene {
    WindowGroup {
      ContentView()
        .modelContainer(ModelContainer(for: [WatchCardEntity.self]))
    }
  }
}
