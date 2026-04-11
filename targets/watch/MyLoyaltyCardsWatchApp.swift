import SwiftData
import SwiftUI

@main
struct MyLoyaltyCardsWatchApp: App {
  var body: some Scene {
    WindowGroup {
      ContentView()
        .modelContainer(try! ModelContainer(for: WatchCardEntity.self))
    }
  }
}
