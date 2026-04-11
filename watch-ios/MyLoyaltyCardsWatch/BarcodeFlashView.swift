import SwiftUI
import WatchKit

// Full-screen barcode flash view — restyled to match Figma Apple Watch barcode design
struct BarcodeFlashView: View {
  let card: WatchCard

  @Environment(\.dismiss) private var dismiss
  @State private var barcodeImage: Image? = nil
  @State private var isLoading: Bool = false
  @FocusState private var isFocused: Bool
  @State private var crownRotation: Double = 0.0
  @State private var crownTriggered: Bool = false

  /// Resolved display name: catalogue brand name or user-assigned card name
  private var displayName: String {
    if let brandId = card.brandId,
      let brand = WatchBrands.all.first(where: { $0.id == brandId })
    {
      return brand.name ?? card.name
    }
    return card.name
  }

  /// Brand logo color for the header
  private var logoColor: Color {
    mapColor(hex: card.colorHex) ?? .gray
  }

  var body: some View {
    ZStack {
      Color.black.ignoresSafeArea()

      VStack(spacing: 8) {
        // Brand info header (Figma: centered, 16px logo + brand name, 14pt medium)
        brandInfoHeader

        // White barcode box (Figma: rounded 8px, full width, centered)
        GeometryReader { geometry in
          let boxWidth = geometry.size.width
          VStack(spacing: 4) {
            Spacer(minLength: 8)

            // Barcode image — maximized width
            if let barcodeImage = barcodeImage {
              barcodeImage
                .resizable()
                .interpolation(.none)
                .scaledToFit()
                .frame(maxWidth: boxWidth - 16)
                .accessibilityIdentifier("barcode-image")
                .accessibilityLabel("Barcode for \(card.name)")
                .onTapGesture { dismiss() }
            } else {
              barcodePlaceholder
            }

            // Barcode number (Figma: 12pt monospaced, black)
            if let value = card.barcodeValue, !value.isEmpty {
              Text(value)
                .font(.system(size: 12, weight: .medium, design: .monospaced))
                .foregroundColor(.black)
                .lineLimit(1)
                .minimumScaleFactor(0.5)
                .accessibilityIdentifier("barcode-number")
            }

            Spacer(minLength: 6)
          }
          .frame(width: boxWidth)
          .background(
            RoundedRectangle(cornerRadius: 8)
              .fill(Color.white)
          )
        }
      }
      .padding(.horizontal, 8)
      .padding(.top, 4)
      .padding(.bottom, 8)
      .focusable(true)
      .focused($isFocused)
      .digitalCrownRotation(
        $crownRotation, from: -1.0, through: 1.0, by: 0.1, sensitivity: .low, isContinuous: true,
        isHapticFeedbackEnabled: true
      )
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

      let img = await BarcodeGenerator.generateImage(
        value: value, formatString: format, targetSize: CGSize(width: 200, height: 120))
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

  // MARK: - Brand Info Header

  private var brandInfoHeader: some View {
    HStack(spacing: 6) {
      // Small logo circle (Figma: 16×16)
      Circle()
        .fill(logoColor)
        .frame(width: 16, height: 16)
        .overlay(
          Text(initials(from: displayName).prefix(1))
            .font(.system(size: 8, weight: .bold))
            .foregroundColor(shouldUseWhiteText(onBackgroundHex: card.colorHex ?? "") ? .white : .black)
        )

      // Brand name (Figma: 14pt medium, white)
      Text(displayName)
        .font(.system(size: 14, weight: .medium))
        .foregroundColor(.white)
        .lineLimit(1)
        .truncationMode(.tail)
        .accessibilityIdentifier("barcode-card-name")
    }
    .padding(.top, 4)
  }

  // MARK: - Barcode Placeholder

  @ViewBuilder
  private var barcodePlaceholder: some View {
    if let value = card.barcodeValue, !value.isEmpty {
      ZStack {
        RoundedRectangle(cornerRadius: 4)
          .stroke(Color.black.opacity(0.3), lineWidth: 1)

        Text(value)
          .font(.system(size: 14, weight: .semibold, design: .monospaced))
          .foregroundColor(.black)
          .lineLimit(1)
          .minimumScaleFactor(0.5)
          .padding(.horizontal, 6)
      }
      .frame(maxHeight: 80)
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
}

struct BarcodeFlashView_Previews: PreviewProvider {
  static var previews: some View {
    Group {
      BarcodeFlashView(
        card: WatchCard(
          id: "1", name: "Esselunga", brandId: "brand-special", colorHex: "#ff4d4d",
          barcodeValue: "5901234123457", barcodeFormat: "EAN13")
      )
      .previewDisplayName("Barcode 41mm")
      .previewDevice(PreviewDevice(rawValue: "Apple Watch Series 9 - 41mm"))

      BarcodeFlashView(
        card: WatchCard(
          id: "2", name: "Supermarket Loyalty Plus Rewards", brandId: nil, colorHex: "#ffb24d",
          barcodeValue: "041234567890", barcodeFormat: "CODE128")
      )
      .previewDisplayName("Barcode 45mm - Long Name")
      .previewDevice(PreviewDevice(rawValue: "Apple Watch Series 9 - 45mm"))
    }
  }
}
