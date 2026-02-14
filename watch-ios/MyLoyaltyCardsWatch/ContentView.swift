import SwiftUI

struct ContentView: View {
  var body: some View {
    // Carbon-style watch card list — delegates to CardListView
    CardListView()
      .background(Color.black)
      .ignoresSafeArea()
  }
}

#Preview {
  ContentView()
}