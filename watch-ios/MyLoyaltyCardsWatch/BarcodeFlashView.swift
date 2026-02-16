import SwiftUI
import WatchKit

// Full-screen barcode flash view (Task 1 - UI only)
struct BarcodeFlashView: View {
  let card: WatchCard

  @Environment(\.dismiss) private var dismiss
  @State private var barcodeImage: Image? = nil
  @State private var isLoading: Bool = false
  @FocusState private var isFocused: Bool
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
          // Show a textual placeholder (card barcode value) while renderer is not available.
          if let value = card.barcodeValue, !value.isEmpty {
            ZStack {
              RoundedRectangle(cornerRadius: 6)
                .stroke(Color.black, lineWidth: 1)
                .frame(maxHeight: 80)

              Text(value)
                .font(.system(size: 14, weight: .semibold, design: .monospaced))
                .foregroundColor(.black)
                .lineLimit(1)
                .minimumScaleFactor(0.5)
                .padding(.horizontal, 6)
            }
            .accessibilityIdentifier("barcode-image")
            .accessibilityLabel("Barcode value for \(card.name)")
            .onTapGesture { dismiss() }
          } else {
            Image(systemName: "barcode")
              .resizable()
              .scaledToFit()
              .foregroundColor(.black)
              .frame(maxHeight: 80)
              .accessibilityIdentifier("barcode-image")
              .accessibilityLabel("Barcode for \(card.name)")
              .onTapGesture { dismiss() }
          }
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
      .focused($isFocused)
      .digitalCrownRotation($crownRotation, from: -1.0, through: 1.0, by: 0.1, sensitivity: .low, isContinuous: true, isHapticFeedbackEnabled: true)
      .onChange(of: crownRotation) { newValue in
        // Dismiss on any crown movement (single-shot)
        guard !crownTriggered else { return }
        if abs(newValue) > 0.01 {
          crownTriggered = true
          dismiss()
        }
      }
    }
    .navigationTitle("")
    .accessibilityIdentifier("barcode-view")
    .task(id: card.id) {
      // focus the view for crown events and play haptic
      isFocused = true
      WKInterfaceDevice.current().play(.success)

      guard let value = card.barcodeValue, let format = card.barcodeFormat else { return }
      guard barcodeImage == nil && !isLoading else { return }
      isLoading = true

      let img = await BarcodeGenerator.generateImage(value: value, formatString: format, targetSize: CGSize(width: 160, height: 80))
      if Task.isCancelled {
        isLoading = false
        return
      }
      if let img = img {
        barcodeImage = img
      }
      isLoading = false
    }
    .onDisappear {
      // reset focus so crown events don't leak to other screens
      isFocused = false
    }
  }
}

struct BarcodeFlashView_Previews: PreviewProvider {
  static var previews: some View {
    BarcodeFlashView(
      card: WatchCard(id: "1", name: "Esselunga", brandId: "brand-special", colorHex: "#1e90ff", barcodeValue: "5901234123457", barcodeFormat: "EAN13")
    )
    .previewDisplayName("Barcode flash")
    .previewDevice(PreviewDevice(rawValue: "Apple Watch Series 9 - 44mm"))
  }
}
