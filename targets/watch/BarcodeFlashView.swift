import SwiftUI
import WatchKit

// Full-screen barcode flash view — restyled to match Figma Apple Watch barcode design
struct BarcodeFlashView: View {
  let card: WatchCard

  @Environment(\.dismiss) private var dismiss
  @State private var barcodeImage: Image? = nil
  @FocusState private var isFocused: Bool
  @State private var crownRotation: Double = 0.0
  @State private var crownTriggered: Bool = false
  @State private var barcodeTargetSize: CGSize = CGSize(width: 156, height: 88)
  @State private var renderedTargetSize: CGSize = .zero

  private var titleText: String {
    WatchBarcodePresentation.title(for: card)
  }

  var body: some View {
    ZStack {
      Color.black.ignoresSafeArea()

      GeometryReader { geometry in
        let showsValueLabel = !(card.barcodeValue?.isEmpty ?? true)
        let layout = WatchBarcodeLayoutMetrics.make(
          containerSize: geometry.size,
          formatString: card.barcodeFormat,
          showsValueLabel: showsValueLabel
        )

        VStack(spacing: 0) {
          Spacer(minLength: 0)

          if let barcodeImage = barcodeImage {
            barcodeImage
              .resizable()
              .interpolation(.none)
              .scaledToFit()
              .frame(width: layout.barcodeSize.width, height: layout.barcodeSize.height)
              .accessibilityIdentifier("barcode-image")
              .accessibilityLabel(WatchL10n.format("watch.barcode.accessibility.image_format", titleText))
              .onTapGesture { dismiss() }
          } else {
            barcodePlaceholder(layout: layout)
          }

          if let value = card.barcodeValue, !value.isEmpty {
            Text(value)
              .font(
                .system(
                  size: layout.valueFontSize,
                  weight: .medium,
                  design: .monospaced
                )
              )
              .foregroundColor(.black)
              .lineLimit(1)
              .minimumScaleFactor(0.5)
              .padding(.top, layout.contentSpacing)
              .padding(.horizontal, layout.valueHorizontalPadding)
              .accessibilityIdentifier("barcode-number")
          }

          Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(layout.boxInnerPadding)
        .background(
          RoundedRectangle(cornerRadius: layout.cornerRadius)
            .fill(Color.white)
        )
        .onAppear {
          updateBarcodeTargetSize(layout.barcodeSize)
        }
        .onChange(of: geometry.size) { _, newSize in
          let updatedLayout = WatchBarcodeLayoutMetrics.make(
            containerSize: newSize,
            formatString: card.barcodeFormat,
            showsValueLabel: showsValueLabel
          )
          updateBarcodeTargetSize(updatedLayout.barcodeSize)
        }
        .padding(.horizontal, layout.outerHorizontalPadding)
        .padding(.vertical, layout.outerVerticalPadding)
      }
      .focusable(true)
      .focused($isFocused)
      .digitalCrownRotation(
        $crownRotation, from: -1.0, through: 1.0, by: 0.1, sensitivity: .low, isContinuous: true,
        isHapticFeedbackEnabled: true
      )
      .onChange(of: crownRotation) { _, newValue in
        // Dismiss on any crown movement (single-shot)
        guard !crownTriggered else { return }
        if abs(newValue) > 0.01 {
          crownTriggered = true
          dismiss()
        }
      }
    }
    .navigationTitle(titleText)
    .accessibilityIdentifier("barcode-view")
    .task(id: card.id) {
      // focus the view for crown events and play haptic
      isFocused = true
      WKInterfaceDevice.current().play(.success)
      // Story 9.6 (ADR-2026-06-09-001): a displayed barcode is a card "open" —
      // emit the usage event so the phone counts it toward shared sorting.
      WatchSessionManager.shared.recordCardUsed(cardId: card.id)
    }

    .task(id: "\(card.id)-\(Int(barcodeTargetSize.width))x\(Int(barcodeTargetSize.height))") {
      guard let value = card.barcodeValue, let format = card.barcodeFormat else { return }
      guard barcodeTargetSize.width > 0, barcodeTargetSize.height > 0 else { return }
      guard barcodeImage == nil || renderedTargetSize != barcodeTargetSize else { return }

      if format.trimmingCharacters(in: .whitespacesAndNewlines).uppercased() == WatchBarcodeFormat.QR.rawValue,
        let syncedImage = syncedQRImage()
      {
        barcodeImage = syncedImage
        renderedTargetSize = barcodeTargetSize
        return
      }

      let img = await BarcodeGenerator.generateImage(
        value: value, formatString: format, targetSize: barcodeTargetSize)
      if Task.isCancelled {
        return
      }
      if let img = img {
        barcodeImage = img
        renderedTargetSize = barcodeTargetSize
      } else {
        barcodeImage = nil
        renderedTargetSize = .zero
      }
    }
    .onDisappear {
      // reset focus so crown events don't leak to other screens
      isFocused = false
    }
  }

  private func updateBarcodeTargetSize(_ newSize: CGSize) {
    let normalizedSize = CGSize(
      width: max(newSize.width.rounded(.down), 1),
      height: max(newSize.height.rounded(.down), 1)
    )

    guard normalizedSize != barcodeTargetSize else { return }
    barcodeTargetSize = normalizedSize
  }

  private func syncedQRImage() -> Image? {
    guard let base64 = card.barcodeImageBase64,
      let data = Data(base64Encoded: base64),
      let uiImage = UIImage(data: data)
    else {
      return nil
    }

    return Image(uiImage: uiImage)
  }

  @ViewBuilder
  private func barcodePlaceholder(layout: WatchBarcodeLayoutMetrics) -> some View {
    if let value = card.barcodeValue, !value.isEmpty {
      ZStack {
        RoundedRectangle(cornerRadius: 6)
          .stroke(Color.black.opacity(0.3), lineWidth: 1)

        Text(value)
          .font(.system(size: 14, weight: .semibold, design: .monospaced))
          .foregroundColor(.black)
          .lineLimit(1)
          .minimumScaleFactor(0.5)
          .padding(.horizontal, layout.valueHorizontalPadding)
      }
      .frame(width: layout.barcodeSize.width, height: layout.barcodeSize.height)
      .accessibilityIdentifier("barcode-image")
      .accessibilityLabel(WatchL10n.format("watch.barcode.accessibility.value_format", titleText))
      .onTapGesture { dismiss() }
    } else {
      Image(systemName: "barcode")
        .resizable()
        .scaledToFit()
        .foregroundColor(.black)
        .frame(width: layout.barcodeSize.width, height: layout.barcodeSize.height)
        .accessibilityIdentifier("barcode-image")
        .accessibilityLabel(WatchL10n.format("watch.barcode.accessibility.image_format", titleText))
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
