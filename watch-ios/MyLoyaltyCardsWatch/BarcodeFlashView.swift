import SwiftUI
import WatchKit

// Full-screen barcode flash view (Task 1 - UI only)
struct BarcodeFlashView: View {
  let card: WatchCard

  var body: some View {
    ZStack {
      // White background per story
      Color.white
        .edgesIgnoringSafeArea(.all)

      VStack(spacing: 12) {
        Spacer()

        // Barcode image (generated from card data when available)
        if let value = card.barcodeValue, let format = card.barcodeFormat,
           let barcodeImage = BarcodeGenerator.generateImage(value: value, formatString: format, targetSize: CGSize(width: 160, height: 80)) {
          barcodeImage
            .resizable()
            .scaledToFit()
            .frame(maxHeight: 80)
            .accessibilityIdentifier("barcode-image")
        } else {
          // Fallback placeholder (SF Symbol)
          Image(systemName: "barcode")
            .resizable()
            .scaledToFit()
            .foregroundColor(.black)
            .frame(maxHeight: 80)
            .accessibilityIdentifier("barcode-image")
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
    }
    .navigationTitle("")
    .accessibilityIdentifier("barcode-view")
    .onAppear {
      // Provide immediate haptic feedback when the barcode is shown (AC1)
      WKInterfaceDevice.current().play(.success)
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
