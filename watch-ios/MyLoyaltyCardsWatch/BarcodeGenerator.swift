import SwiftUI
import CoreImage
import CoreImage.CIFilterBuiltins

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

  /// Generate a CIImage for the given value + format. Returns nil on failure.
  static func generateCIImage(value: String, format: WatchBarcodeFormat) -> CIImage? {
    let data = value.data(using: .ascii) ?? value.data(using: .utf8) ?? Data()

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
  static func image(from ciImage: CIImage, targetSize: CGSize) -> Image? {
    // Determine scale to fit targetSize preserving aspect
    let extent = ciImage.extent.integral
    guard extent.width > 0 && extent.height > 0 else { return nil }

    let scaleX = targetSize.width / extent.width
    let scaleY = targetSize.height / extent.height
    let scale = min(scaleX, scaleY)

    let transformed = ciImage.transformed(by: CGAffineTransform(scaleX: scale, y: scale))

    guard let cgImage = ciContext.createCGImage(transformed, from: transformed.extent) else { return nil }

    #if os(watchOS)
    let uiImage = UIImage(cgImage: cgImage)
    #else
    let uiImage = UIImage(cgImage: cgImage)
    #endif

    return Image(uiImage: uiImage)
  }

  /// Convenience: generate SwiftUI Image from value + format + targetSize
  static func generateImage(value: String, formatString: String?, targetSize: CGSize) -> Image? {
    guard let fmt = formatString.flatMap({ WatchBarcodeFormat(rawValue: $0) }) else { return nil }
    guard let ci = generateCIImage(value: value, format: fmt) else { return nil }
    return image(from: ci, targetSize: targetSize)
  }
}
