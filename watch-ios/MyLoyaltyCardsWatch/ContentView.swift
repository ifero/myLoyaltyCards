import SwiftUI

struct ContentView: View {
  var body: some View {
    VStack(spacing: 6) {
      Text("MyLoyaltyCards")
        .font(.headline)
      Text("Read-only companion")
        .font(.caption)
        .foregroundStyle(.secondary)
    }
    .multilineTextAlignment(.center)
    .padding()
  }
}

#Preview {
  ContentView()
}
