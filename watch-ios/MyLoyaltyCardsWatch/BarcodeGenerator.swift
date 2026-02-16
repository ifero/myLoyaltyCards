import SwiftUI

#if canImport(UIKit)
import UIKit
#endif

enum WatchBarcodeFormat: String {
  case CODE128
  case EAN13
  case EAN8
  case CODE39
  case UPCA
  case QR
}

/// Helper to generate barcode images on the watch.
///
/// NOTE: CoreImage-based barcode generation is not available on watchOS in this
/// build — the CI-based renderer was removed.  This file currently returns a
/// simple textual placeholder (barcode value) and logs a TODO for future work
/// (implement a CoreGraphics renderer or fetch from phone/server).
struct BarcodeGenerator {
  private static let uiImageCache: NSCache<NSString, UIImage> = {
    let c = NSCache<NSString, UIImage>()
    c.countLimit = 64  // keep a reasonable number of cached barcode images
    c.totalCostLimit = 4 * 1024 * 1024  // ~4 MB budget
    c.name = "BarcodeGenerator.uiImageCache"
    return c
  }()

  /// Placeholder renderer + TODO log for missing CoreImage implementation.
  /// Returns a textual image of the barcode `value` for known formats; returns
  /// nil for unknown / missing format so callers can gracefully degrade.
  static func generateImage(value: String, formatString: String?, targetSize: CGSize) async -> Image? {
    // Log developer TODO once (debug builds)
    #if DEBUG
      print("TODO: CoreImage renderer removed on watchOS — returning textual placeholder. Implement CoreGraphics renderer or phone-side generation.")
    #endif

    // Normalize/validate format string (maintain previous behavior)
    let fmtKey = (formatString ?? "").trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
    guard !fmtKey.isEmpty, WatchBarcodeFormat(rawValue: fmtKey) != nil else { return nil }

    // Build cache key
    let key = "\(value)|\(fmtKey)|\(Int(targetSize.width))x\(Int(targetSize.height))" as NSString
    if let cached = uiImageCache.object(forKey: key) {
      return Image(uiImage: cached)
    }

    // Create a simple text-based placeholder UIImage showing the barcode value.
    let uiImage = renderPlaceholderImage(text: value, size: targetSize)

    // Cache and return as SwiftUI Image
    let cost = Int(targetSize.width * targetSize.height * UIScreen.main.scale * 4)
    uiImageCache.setObject(uiImage, forKey: key, cost: cost)

    return Image(uiImage: uiImage)
  }

  // MARK: - Helpers
  private static func renderPlaceholderImage(text: String, size: CGSize) -> UIImage {
    let scale = UIScreen.main.scale
    let scaledSize = CGSize(width: max(1, size.width), height: max(1, size.height))

    UIGraphicsBeginImageContextWithOptions(scaledSize, true, scale)
    defer { UIGraphicsEndImageContext() }

    // white background (matches barcode flash screen)
    UIColor.white.setFill()
    UIRectFill(CGRect(origin: .zero, size: scaledSize))

    // draw monospaced text centered
    let fontSize = max(10, min(scaledSize.height * 0.35, 26))
    let font = UIFont.monospacedDigitSystemFont(ofSize: fontSize, weight: .semibold)
    let paragraph = NSMutableParagraphStyle()
    paragraph.alignment = .center

    let attrs: [NSAttributedString.Key: Any] = [
      .font: font,
      .foregroundColor: UIColor.black,
      .paragraphStyle: paragraph
    ]

    let insetRect = CGRect(x: 6, y: (scaledSize.height - font.lineHeight) / 2, width: scaledSize.width - 12, height: font.lineHeight)
    (text as NSString).draw(in: insetRect, withAttributes: attrs)

    // subtle border to suggest a placeholder barcode area
    let borderRect = CGRect(x: 1 / scale, y: 1 / scale, width: scaledSize.width - 2 / scale, height: scaledSize.height - 2 / scale)
    let borderPath = UIBezierPath(roundedRect: borderRect, cornerRadius: 6 / scale)
    UIColor.black.setStroke()
    borderPath.lineWidth = 1 / scale
    borderPath.stroke()

    return UIGraphicsGetImageFromCurrentImageContext() ?? UIImage()
  }

  #if DEBUG
    /// Test helper: check whether a generated image is present in the cache.
    static func isImageCached(value: String, formatString: String?, targetSize: CGSize) -> Bool {
      let fmtKey = (formatString ?? "").trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
      let key = "\(value)|\(fmtKey)|\(Int(targetSize.width))x\(Int(targetSize.height))" as NSString
      return uiImageCache.object(forKey: key) != nil
    }
  #endif
}
