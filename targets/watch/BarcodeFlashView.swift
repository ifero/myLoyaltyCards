import OSLog
import SwiftUI
import WatchKit

#if DEBUG
  /// The geometry a barcode actually resolved to on this device.
  ///
  /// Records the module width achieved — in pixels and in millimetres — rather than
  /// asserting a magnification floor: six of the seven supported watches cannot reach
  /// ISO 15420's 80 % print floor on their short axis, so enforcing it would blank the
  /// barcode on them (see `WatchBarcodeModulePlan.pixelsPerMillimetre`).
  /// DEBUG-only: it is a development instrument for re-measuring the geometry on real
  /// hardware, not telemetry.
  private let barcodeGeometryLog = Logger(
    subsystem: "com.iferoporefi.myloyaltycards.watch", category: "BarcodeGeometry")
#endif

// Full-screen barcode flash view — restyled to match Figma Apple Watch barcode design
struct BarcodeFlashView: View {
  let card: WatchCard

  @Environment(\.dismiss) private var dismiss
  @State private var barcodeImage: Image? = nil
  @FocusState private var isFocused: Bool
  @State private var crownRotation: Double = 0.0
  @State private var crownTriggered: Bool = false
  // `.zero` until the `GeometryReader` reports a size. It used to default to 156 x 88,
  // which rendered one image against a guess and a second against the real geometry —
  // and with an orientation to resolve, that first guess would be a visible flip on
  // appear. The render task is gated on a non-zero size instead.
  @State private var barcodePixelSize: CGSize = .zero
  @State private var barcodeOrientation: WatchBarcodeOrientation? = nil
  // What is actually ON SCREEN, as opposed to what was last planned.
  //
  // `renderedOrientation` — not `barcodeOrientation` — is the incumbent the rotation
  // hysteresis protects: the first `GeometryReader` pass reports the full screen and
  // is superseded ~60 ms later, so latching on a plan would let a measurement that
  // never reached the renderer pin an orientation the settled geometry would not have
  // chosen.
  //
  // `renderedTaskID` is the render guard's memory, and it is deliberately the WHOLE
  // task id rather than the pieces of geometry it used to compare. Comparing a subset
  // silently skipped a re-render whenever an input outside that subset changed — a
  // card whose payload was edited in place keeps its size and orientation, so the
  // guard would return early and leave the old symbol beside the new number.
  @State private var renderedTaskID: String = ""
  @State private var renderedOrientation: WatchBarcodeOrientation? = nil

  private var titleText: String {
    WatchBarcodePresentation.title(for: card)
  }

  /// The symbol's width in module units, quiet zones EXCLUDED — `nil` for QR and for
  /// a value no encoder accepts.
  ///
  /// Recomputed with the body rather than held in `@State`: it is one encoder pass
  /// over a short string, and as state the first frame would plan the layout without
  /// it and then visibly resize once it arrived.
  private var symbolUnits: Int? {
    guard let value = card.barcodeValue, !value.isEmpty else { return nil }

    return BarcodeGenerator.symbolModuleUnits(value: value, formatString: card.barcodeFormat)
  }

  /// Accessibility label for the drawn symbol.
  ///
  /// A rotated barcode has to be presented to the scanner sideways. A sighted user
  /// reads that off the shape — the symbol is visibly taller than it is wide — but a
  /// VoiceOver user gets nothing from the geometry, so the orientation has to be said
  /// out loud. Rotation is new in Story 16.27; before it, a barcode was always
  /// horizontal and one label was enough.
  private var barcodeAccessibilityLabel: String {
    let key =
      renderedOrientation?.isRotated == true
      ? "watch.barcode.accessibility.image_rotated_format"
      : "watch.barcode.accessibility.image_format"

    return WatchL10n.format(key, titleText)
  }

  /// Identity for the render task: everything the drawn bitmap depends on — the
  /// payload, its symbology, the pixel target and the orientation.
  ///
  /// The value and format are keyed even though they are usually fixed for a card id,
  /// because the alternative failure is silent and wrong rather than merely stale: the
  /// human-readable `Text(value)` under the image reads `card` live from the body, so
  /// a payload edited in place would print one number beside a barcode encoding
  /// another. Keying `card.id` alone would not notice.
  private var renderTaskID: String {
    let width = Int(barcodePixelSize.width)
    let height = Int(barcodePixelSize.height)
    let payload = "\(card.barcodeValue ?? "")|\(card.barcodeFormat ?? "")"

    return "\(card.id)-\(payload)-\(width)x\(height)-\(barcodeOrientation?.rawValue ?? "none")"
  }

  var body: some View {
    ZStack {
      Color.black.ignoresSafeArea()

      // Take every edge the system does not draw into, and keep the one it does.
      //
      // Left wholly inside the safe area this `GeometryReader` was handed 158 x 130.5 pt
      // of a 162 x 197 pt watch — a third of the display black and unused. Ignoring the
      // horizontal and bottom edges reclaims all of it except the top strip, taking the
      // 40 mm to 162 x 149.5 pt and the 46 mm from 204 x 150 to 208 x 186.
      //
      // The TOP edge is deliberately kept, and it is not free: at 40 mm it costs the
      // rotated length axis 95 px, which is most of a module step (3 px/module needs
      // 3 × 103 = 309 px along that axis). Two things live in that strip and both are
      // worth more. The navigation bar carries the back chevron and
      // the card's name. The system clock is drawn there by watchOS with no API to
      // suppress it — and measured on a 46 mm with the safe area fully ignored, it
      // renders white glyphs straight THROUGH the black bars, breaking them in the
      // top-right. A wider module bought by corrupting the symbol is not a wider module.
      //
      // Clearing the clock needs roughly 33 pt; the module step has 6 pt (46 mm) to
      // 11.5 pt (40 mm) of slack. There is no arrangement that buys both, so the symbol
      // stays intact and the reclaim is width plus bar height.
      GeometryReader { geometry in
        let showsValueLabel = !(card.barcodeValue?.isEmpty ?? true)
        let layout = WatchBarcodeLayoutMetrics.make(
          containerSize: geometry.size,
          formatString: card.barcodeFormat,
          symbolUnits: symbolUnits,
          showsValueLabel: showsValueLabel,
          currentOrientation: renderedOrientation
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
              .accessibilityLabel(barcodeAccessibilityLabel)
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
          updateBarcodeGeometry(layout, container: geometry.size)
        }
        .onChange(of: geometry.size) { _, newSize in
          let updatedLayout = WatchBarcodeLayoutMetrics.make(
            containerSize: newSize,
            formatString: card.barcodeFormat,
            symbolUnits: symbolUnits,
            showsValueLabel: showsValueLabel,
            currentOrientation: renderedOrientation
          )
          updateBarcodeGeometry(updatedLayout, container: newSize)
        }
        .padding(.horizontal, layout.outerHorizontalPadding)
        .padding(.vertical, layout.outerVerticalPadding)
      }
      .ignoresSafeArea(edges: [.horizontal, .bottom])
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
    // The navigation bar and the card's name STAY (ifero's call, 2026-09-04): the back
    // chevron and the title are what make this screen navigable rather than a slab of
    // stripes, and the top inset they live in is the same inset that keeps the system
    // clock off the symbol — see the `.ignoresSafeArea` above for what that costs.
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

    .task(id: renderTaskID) {
      guard let value = card.barcodeValue, let format = card.barcodeFormat else { return }
      guard barcodePixelSize.width > 0, barcodePixelSize.height > 0 else { return }
      guard barcodeImage == nil || renderedTaskID != renderTaskID else { return }

      // Let the container settle before drawing anything.
      //
      // `GeometryReader` reports the FULL SCREEN on its first pass and the
      // safe-area-inset container about 60 ms later — measured on watchOS 26.4
      // simulators as 162x197 -> 158x130.5 pt (40 mm) and 208x248 -> 204x150 pt
      // (46 mm). Those two resolve to DIFFERENT geometry: on the 46 mm the first
      // says rotated at 4 px/module and the settled one says horizontal at 3, so
      // rendering the first paints a symbol that then visibly flips on appear.
      //
      // `.task(id:)` cancels and restarts whenever the target changes, so sleeping
      // first means a superseded geometry never reaches the renderer at all. 120 ms
      // is twice the observed settling gap; the cost is a barely perceptible delay
      // before the barcode appears, against a flip the user would certainly see.
      try? await Task.sleep(for: .milliseconds(120))
      if Task.isCancelled { return }

      if format.trimmingCharacters(in: .whitespacesAndNewlines).uppercased() == WatchBarcodeFormat.QR.rawValue,
        let syncedImage = syncedQRImage()
      {
        barcodeImage = syncedImage
        renderedTaskID = renderTaskID
        renderedOrientation = barcodeOrientation
        return
      }

      let img = await BarcodeGenerator.generateImage(
        value: value, formatString: format, pixelSize: barcodePixelSize,
        orientation: barcodeOrientation ?? .horizontal)
      if Task.isCancelled {
        return
      }
      if let img = img {
        barcodeImage = img
        renderedTaskID = renderTaskID
        renderedOrientation = barcodeOrientation
      } else {
        barcodeImage = nil
        renderedTaskID = ""
        renderedOrientation = nil
      }

      #if DEBUG
        // Paired with the `container=` line from `updateBarcodeGeometry`: that one
        // says what was PLANNED, this says what was DRAWN. Exactly one `drawn=` line
        // per presentation means the settle above did its job — two means a
        // superseded geometry reached the renderer and the symbol flipped on screen.
        barcodeGeometryLog.debug(
          """
          drawn=\(Int(barcodePixelSize.width), privacy: .public)x\
          \(Int(barcodePixelSize.height), privacy: .public)px \
          orientation=\(barcodeOrientation?.rawValue ?? "none", privacy: .public) \
          image=\(img == nil ? "placeholder" : "barcode", privacy: .public)
          """
        )
      #endif
    }
    .onDisappear {
      // reset focus so crown events don't leak to other screens
      isFocused = false
    }
  }

  /// Adopt `layout`'s resolved geometry as the render target.
  ///
  /// Nothing is rounded here. The layout already produced whole device pixels, and
  /// rounding a second time is what used to break the frame/image agreement: this
  /// rounded the target DOWN while `.frame()` used the unrounded size, so SwiftUI
  /// rescaled the bitmap by a fraction of a pixel and `.interpolation(.none)`
  /// resolved that by duplicating a pixel column — putting back the ±1 px bar-width
  /// jitter the integer module exists to remove.
  private func updateBarcodeGeometry(_ layout: WatchBarcodeLayoutMetrics, container: CGSize) {
    if barcodePixelSize != layout.barcodePixelSize {
      barcodePixelSize = layout.barcodePixelSize
    }

    if let plan = layout.modulePlan {
      if barcodeOrientation != plan.orientation {
        barcodeOrientation = plan.orientation
      }

      #if DEBUG
        // Read with: `xcrun simctl spawn booted log stream --predicate
        // 'category == "BarcodeGeometry"'`. This is how the geometry gets re-measured
        // on real hardware instead of being derived from the screen dimensions —
        // `container` is what the safe area actually leaves the GeometryReader once
        // the horizontal and bottom edges are reclaimed, which no table can predict.
        barcodeGeometryLog.debug(
          """
          container=\(Double(container.width), privacy: .public)x\
          \(Double(container.height), privacy: .public)pt \
          image=\(Int(layout.barcodePixelSize.width), privacy: .public)x\
          \(Int(layout.barcodePixelSize.height), privacy: .public)px \
          orientation=\(plan.orientation.rawValue, privacy: .public) \
          units=\(plan.symbolUnits, privacy: .public) \
          module=\(plan.modulePixelWidth, privacy: .public)px \
          drawable=\(plan.canRender, privacy: .public) \
          (\(plan.moduleMillimetres, privacy: .public)mm) \
          lengthFill=\(plan.lengthFillRatio, privacy: .public)
          """
        )
      #endif
    } else if barcodeOrientation != nil {
      barcodeOrientation = nil
    }
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
