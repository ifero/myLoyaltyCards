import CoreImage
import CoreImage.CIFilterBuiltins
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

/// Helper to generate barcode CIImage/UIImage on watchOS.
struct BarcodeGenerator {
  private static let ciContext = CIContext()
  private static let uiImageCache: NSCache<NSString, UIImage> = {
    let c = NSCache<NSString, UIImage>()
    c.countLimit = 64  // keep a reasonable number of cached barcode images
    c.totalCostLimit = 4 * 1024 * 1024  // ~4 MB budget
    c.name = "BarcodeGenerator.uiImageCache"
    return c
  }()

  /// Generate a CIImage for the given value + format. Returns nil on failure.
  static func generateCIImage(value: String, format: WatchBarcodeFormat) -> CIImage? {
    // Prefer UTF-8 to support QR payloads with non-ASCII characters
    let data = value.data(using: .utf8) ?? value.data(using: .ascii) ?? Data()

    switch format {
    case .QR:
      let filter = CIFilter.qrCodeGenerator()
      filter.setValue(data, forKey: "inputMessage")
      // Default correction level M
      filter.setValue("M", forKey: "inputCorrectionLevel")
      return filter.outputImage

    case .CODE128:
      if let filter = CIFilter(name: "CICode128BarcodeGenerator") {
        filter.setValue(data, forKey: "inputMessage")
        // quiet space (optional)
        filter.setValue(7.0, forKey: "inputQuietSpace")
        return filter.outputImage
      }
      return nil

    case .EAN13, .EAN8, .UPCA, .CODE39:
      // CoreImage does not provide built-in EAN/UPC/CODE39 generators on watchOS.
      // Fallback: encode as CODE128 so the barcode is scannable by most scanners.
      // NOTE: This is an intentional pragmatic fallback for MVP — replace with
      // proper format-specific renderer if/when a library or implementation is added.
      if let filter = CIFilter(name: "CICode128BarcodeGenerator") {
        filter.setValue(data, forKey: "inputMessage")
        filter.setValue(7.0, forKey: "inputQuietSpace")
        return filter.outputImage
      }
      return nil
    }
  }

  /// Produce a SwiftUI Image sized at `targetSize` from CIImage (scaled with nearest sampling for crisp bars).
  @MainActor
  static func image(from ciImage: CIImage, targetSize: CGSize) -> Image? {
    // Determine scale to fit targetSize preserving aspect
    let extent = ciImage.extent.integral
    guard extent.width > 0 && extent.height > 0 else { return nil }

    let scaleX = targetSize.width / extent.width
    let scaleY = targetSize.height / extent.height
    let scale = min(scaleX, scaleY)

    let transformed = ciImage.transformed(by: CGAffineTransform(scaleX: scale, y: scale))

    guard let cgImage = ciContext.createCGImage(transformed, from: transformed.extent) else {
      return nil
    }

    #if os(watchOS)
      let uiImage = UIImage(cgImage: cgImage)
    #else
      let uiImage = UIImage(cgImage: cgImage)
    #endif

    return Image(uiImage: uiImage)
  }

  /// Convenience: asynchronously generate SwiftUI Image from value + format + targetSize (with caching)
  static func generateImage(value: String, formatString: String?, targetSize: CGSize) async
    -> Image?
  {
    // Normalize format string for key (avoid duplicate cache entries)
    let fmtKey = (formatString ?? "").trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
    let key = "\(value)|\(fmtKey)|\(Int(targetSize.width))x\(Int(targetSize.height))" as NSString

    if let cached = uiImageCache.object(forKey: key) {
      return Image(uiImage: cached)
    }

    // Validate format and CI generation
    guard let fmt = WatchBarcodeFormat(rawValue: fmtKey) else { return nil }
    guard let ci = generateCIImage(value: value, format: fmt) else { return nil }

    // Scale CIImage to requested target size
    let extent = ci.extent.integral
    guard extent.width > 0 && extent.height > 0 else { return nil }
    let scaleX = targetSize.width / extent.width
    let scaleY = targetSize.height / extent.height
    let scale = min(scaleX, scaleY)
    let transformed = ci.transformed(by: CGAffineTransform(scaleX: scale, y: scale))

    // Create CGImage off the main thread
    let cgImage: CGImage? = await withCheckedContinuation { cont in
      DispatchQueue.global(qos: .userInitiated).async {
        #if DEBUG
          if debugDelayForTests > 0 {
            Thread.sleep(forTimeInterval: debugDelayForTests)
          }
        #endif
        let cg = ciContext.createCGImage(transformed, from: transformed.extent)
        cont.resume(returning: cg)
      }
    }
    guard let safeCG = cgImage else { return nil }

    // Respect cancellation before touching UI
    if Task.isCancelled { return nil }

    // Construct UIImage on the MainActor (UIKit is main-thread-only) and capture scale for cost
    let (uiImage, screenScale) = await MainActor.run {
      (UIImage(cgImage: safeCG), UIScreen.main.scale)
    }

    // approximate memory cost (bytes) and cache
    let cost = Int(targetSize.width * targetSize.height * screenScale * 4)
    uiImageCache.setObject(uiImage, forKey: key, cost: cost)

    return Image(uiImage: uiImage)
  }

  #if DEBUG
    /// Optional delay (seconds) to make cancellation tests deterministic.
    static var debugDelayForTests: TimeInterval = 0

    /// Test helper: check whether a generated image is present in the cache.
    static func isImageCached(value: String, formatString: String?, targetSize: CGSize) -> Bool {
      let fmtKey = (formatString ?? "").trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
      let key = "\(value)|\(fmtKey)|\(Int(targetSize.width))x\(Int(targetSize.height))" as NSString
      return uiImageCache.object(forKey: key) != nil
    }
  #endif
}
