import SwiftUI
import WatchKit

// Full-screen barcode flash view (Task 1 - UI only)
struct BarcodeFlashView: View {
  let card: WatchCard

  @Environment(\.dismiss) private var dismiss
  @State private var barcodeImage: Image? = nil
  @State private var isLoading: Bool = false
  @State private var crownRotation: Double = 0.0
  @State private var crownTriggered: Bool = false

  var body: some View {
    ZStack {
      // White background per story
      Color.white
        .ignoresSafeArea()

      VStack(spacing: 12) {
        Spacer()

        // Async-generated barcode image (cached)
        if let barcodeImage = barcodeImage {
          barcodeImage
            .resizable()
            .interpolation(.none)
            .scaledToFit()
            .frame(maxHeight: 80)
            .accessibilityIdentifier("barcode-image")
            .accessibilityLabel("Barcode for \(card.name)")
            .onTapGesture { dismiss() }
        } else {
          // Placeholder while generating (still dismissible)
          Image(systemName: "barcode")
            .resizable()
            .scaledToFit()
            .foregroundColor(.black)
            .frame(maxHeight: 80)
            .accessibilityIdentifier("barcode-image")
            .onTapGesture { dismiss() }
        }

        // Card name (visible on barcode screen)
        Text(card.name)
          .font(.system(size: 13, weight: .semibold))
          .foregroundColor(.black)
          .accessibilityIdentifier("barcode-card-name")
          .padding(.top, 6)

        Spacer()
      }
      .padding(.horizontal, 6)
      .focusable(true)
      .digitalCrownRotation($crownRotation, from: -1.0, through: 1.0, by: 0.1, sensitivity: .low, isContinuous: true, isHapticFeedbackEnabled: true)
      .onChange(of: crownRotation) { newValue in
        // Dismiss on any crown movement (single-shot)
        guard !crownTriggered else { return }
        if abs(newValue) > 0.0001 {
          crownTriggered = true
          dismiss()
        }
      }
    }
    .navigationTitle("")
    .accessibilityIdentifier("barcode-view")
    .onAppear {
      // Immediate haptic
      WKInterfaceDevice.current().play(.success)

      // Async generate barcode image off the main thread to avoid UI jank
      guard let value = card.barcodeValue, let format = card.barcodeFormat else { return }
      guard barcodeImage == nil && !isLoading else { return }
      isLoading = true

      Task.detached {
        let img = BarcodeGenerator.generateImage(
          value: value, formatString: format, targetSize: CGSize(width: 160, height: 80))
        await MainActor.run {
          self.barcodeImage = img
          self.isLoading = false
        }
      }
    }
  }
}

struct BarcodeFlashView_Previews: PreviewProvider {
  static var previews: some View {
    BarcodeFlashView(
      card: WatchCard(id: "1", name: "Esselunga", brandId: "brand-special", colorHex: "#1e90ff")
    )
    .previewDisplayName("Barcode flash")
    .previewDevice(PreviewDevice(rawValue: "Apple Watch Series 9 - 44mm"))
  }
}
