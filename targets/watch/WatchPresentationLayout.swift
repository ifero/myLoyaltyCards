import CoreGraphics
import Foundation

enum WatchBarcodePresentation {
  static func title(for card: WatchCard) -> String {
    let trimmedName = card.name.trimmingCharacters(in: .whitespacesAndNewlines)
    return trimmedName.isEmpty ? WatchL10n.string("watch.cards.fallback_name") : trimmedName
  }
}

struct WatchCardRowLayoutMetrics {
  let rowSpacing: CGFloat
  let horizontalPadding: CGFloat
  let verticalPadding: CGFloat
  let accentWidth: CGFloat
  let accentHeight: CGFloat
  let avatarSize: CGFloat
  let cornerRadius: CGFloat
  let minimumTapHeight: CGFloat

  var estimatedHeight: CGFloat {
    max(max(accentHeight, avatarSize) + (verticalPadding * 2), minimumTapHeight)
  }

  static let compact = WatchCardRowLayoutMetrics(
    rowSpacing: 10,
    horizontalPadding: 10,
    verticalPadding: 9,
    accentWidth: 5,
    accentHeight: 28,
    avatarSize: 30,
    cornerRadius: 14,
    minimumTapHeight: 44
  )
}

struct WatchBarcodeLayoutMetrics {
  let outerHorizontalPadding: CGFloat
  let outerVerticalPadding: CGFloat
  let boxInnerPadding: CGFloat
  let cornerRadius: CGFloat
  let contentSpacing: CGFloat
  let footerReservedHeight: CGFloat
  let barcodeSize: CGSize
  let widthFillRatio: CGFloat
  let valueFontSize: CGFloat
  let valueHorizontalPadding: CGFloat

  static func make(containerSize: CGSize, formatString: String?, showsValueLabel: Bool) -> Self {
    let normalizedFormat = (formatString ?? "")
      .trimmingCharacters(in: .whitespacesAndNewlines)
      .uppercased()
    let isQR = normalizedFormat == WatchBarcodeFormat.QR.rawValue

    let safeWidth = max(containerSize.width, 1)
    let safeHeight = max(containerSize.height, 1)
    let outerHorizontalPadding: CGFloat = 0
    let outerVerticalPadding: CGFloat = 0
    let boxInnerPadding: CGFloat = 2
    let contentSpacing: CGFloat = 4
    let valueLabelReservedHeight: CGFloat = showsValueLabel ? 12 : 0
    let footerReservedHeight = valueLabelReservedHeight + (showsValueLabel ? contentSpacing : 0)
    let contentWidth = max(safeWidth - (boxInnerPadding * 2), 1)
    let barcodeSize: CGSize

    if isQR {
      let squareSide = min(
        contentWidth,
        max(safeHeight - ((boxInnerPadding * 2) + footerReservedHeight), 112)
      )
      barcodeSize = CGSize(width: squareSide, height: squareSide)
    } else {
      let barcodeHeight = min(max(safeHeight * 0.52, 88), 110)
      barcodeSize = CGSize(width: contentWidth, height: barcodeHeight)
    }

    return WatchBarcodeLayoutMetrics(
      outerHorizontalPadding: outerHorizontalPadding,
      outerVerticalPadding: outerVerticalPadding,
      boxInnerPadding: boxInnerPadding,
      cornerRadius: 8,
      contentSpacing: contentSpacing,
      footerReservedHeight: footerReservedHeight,
      barcodeSize: barcodeSize,
      widthFillRatio: min(barcodeSize.width / safeWidth, 1),
      valueFontSize: 10,
      valueHorizontalPadding: 2
    )
  }
}