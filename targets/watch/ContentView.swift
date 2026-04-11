import SwiftUI

struct ContentView: View {
  var body: some View {
    CardListView()
      .background(Color.black)
      .ignoresSafeArea()
  }
}

#Preview {
  ContentView()
}