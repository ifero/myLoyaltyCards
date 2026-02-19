import SwiftUI

#if canImport(UIKit)
  import UIKit
#endif

#if canImport(WatchKit)
  import WatchKit
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

  /// Generates a barcode image for `value` using a watchOS-friendly
  /// renderer. Supports EAN-13 and Code128 (Code Set B). Other formats fall
  /// back to a textual placeholder. Image rendering is cached.
  static func generateImage(value: String, formatString: String?, targetSize: CGSize) async
    -> Image?
  {
    let fmtKey = (formatString ?? "").trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
    guard !fmtKey.isEmpty, let fmt = WatchBarcodeFormat(rawValue: fmtKey) else { return nil }

    let key = "\(value)|\(fmtKey)|\(Int(targetSize.width))x\(Int(targetSize.height))" as NSString
    if let cached = uiImageCache.object(forKey: key) {
      return Image(uiImage: cached)
    }

    // Choose encoder depending on requested format
    var modules: [Int]? = nil
    switch fmt {
    case .EAN13:
      modules = encodeEAN13(value: value)
    case .CODE128:
      modules = encodeCode128(value: value)
    case .EAN8, .UPCA, .CODE39:
      // pragmatic fallback: render as Code128 so scanners can still read it
      modules = encodeCode128(value: value)
    case .QR:
      // QR is not implemented on-watch; keep textual placeholder for now.
      let uiImage = renderPlaceholderImage(text: value, size: targetSize)
      let cost = Int(targetSize.width * targetSize.height * deviceScale * 4)
      uiImageCache.setObject(uiImage, forKey: key, cost: cost)
      return Image(uiImage: uiImage)
    }

    guard let mod = modules else { return nil }

    // Render CGImage off the main thread for performance
    let cgImage: CGImage? = await withCheckedContinuation { cont in
      DispatchQueue.global(qos: .userInitiated).async {
        let cg = renderCGImage(fromModules: mod, targetSize: targetSize, quietZoneModules: 10)
        cont.resume(returning: cg)
      }
    }
    guard let safeCG = cgImage else { return nil }

    if Task.isCancelled { return nil }

    let uiImage = await MainActor.run {
      UIImage(cgImage: safeCG, scale: deviceScale, orientation: .up)
    }

    // Cache and return
    let cost = Int(targetSize.width * targetSize.height * deviceScale * 4)
    uiImageCache.setObject(uiImage, forKey: key, cost: cost)
    return Image(uiImage: uiImage)
  }

  // MARK: - Encoders & renderer (watchOS-friendly)

  /// Encode numeric `value` into EAN-13 module widths (alternating bars/spaces).
  /// Accepts 12 digits (computes check digit) or 13 digits (validates checksum).
  private static func encodeEAN13(value: String) -> [Int]? {
    let digits = value.filter { $0.isWholeNumber }.map { Int(String($0))! }
    guard digits.count == 12 || digits.count == 13 else { return nil }

    var d = digits
    if d.count == 12 {
      d.append(ean13CheckDigit(for: d))
    } else {
      // validate
      let check = ean13CheckDigit(for: Array(d[0..<12]))
      guard check == d[12] else { return nil }
    }

    // Encoding tables (A/B/R as bit-strings)
    let A: [String] = [
      "0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011",
      "0110111", "0001011",
    ]
    let B: [String] = [
      "0100111", "0110011", "0011011", "0100001", "0011101", "0111001", "0000101", "0010001",
      "0001001", "0010111",
    ]
    let R: [String] = [
      "1110010", "1100110", "1101100", "1000010", "1011100", "1001110", "1010000", "1000100",
      "1001000", "1110100",
    ]

    let parityTable: [[Character]] = [
      Array("AAAAAA"), Array("AABABB"), Array("AABBAB"), Array("AABBBA"),
      Array("ABAABB"), Array("ABBAAB"), Array("ABBBAA"), Array("ABABAB"),
      Array("ABABBA"), Array("ABBABA"),
    ]

    let first = d[0]
    let leftDigits = d[1...6].map { $0 }
    let rightDigits = d[7...12].map { $0 }

    var bits = ""
    bits += "101"  // left guard

    let parity = parityTable[first]
    for (i, digit) in leftDigits.enumerated() {
      let p = parity[i]
      bits += (p == "A" ? A[digit] : B[digit])
    }

    bits += "01010"  // center guard

    for digit in rightDigits {
      bits += R[digit]
    }

    bits += "101"  // right guard

    // compress bits into module widths (alternating bar/space) and return as ints
    return compressBitStringToModuleWidths(bits)
  }

  /// Compute EAN-13 check digit for first 12 digits
  private static func ean13CheckDigit(for digits: [Int]) -> Int {
    var sum = 0
    for (i, d) in digits.enumerated() {
      sum += d * ((i % 2 == 0) ? 1 : 3)
    }
    return (10 - (sum % 10)) % 10
  }

  /// Encode using Code128 with automatic Code Set C optimization.
  /// Returns module widths sequence for rendering.
  private static func encodeCode128(value: String) -> [Int]? {
    // Validate that characters are in the supported ASCII range (32..126).
    // Numeric digits (48..57) are additionally used for Code Set C pairs.
    let chars = Array(value)
    for ch in chars {
      guard let ascii = ch.asciiValue, ascii >= 32 && ascii <= 126 else { return nil }
    }

    // Helper: count consecutive digits starting at index
    func digitRunLength(from idx: Int) -> Int {
      var j = idx
      while j < chars.count, let a = chars[j].asciiValue, a >= 48 && a <= 57 {
        j += 1
      }
      return j - idx
    }

    // Decide whether to start in Code C:
    // - if the entire string is digits and length is even (>=2) -> start C
    // - or if a digit run of length >= 4 starts at 0 -> start C
    let entireDigits = digitRunLength(from: 0) == chars.count
    let startDigitRun = digitRunLength(from: 0)
    var usingC = false
    if entireDigits && chars.count % 2 == 0 && chars.count >= 2 {
      usingC = true
    } else if startDigitRun >= 4 {
      usingC = true
    }

    // Start code: Start B = 104, Start C = 105
    var codes: [Int] = [usingC ? 105 : 104]

    var i = 0
    while i < chars.count {
      if usingC {
        // Encode pairs of digits while possible
        let run = digitRunLength(from: i)
        if run >= 2 {
          // take as many pairs as possible
          let pairs = run / 2
          for _ in 0..<pairs {
            let a = Int(chars[i].asciiValue! - 48)
            let b = Int(chars[i + 1].asciiValue! - 48)
            let val = a * 10 + b
            codes.append(val)
            i += 2
          }
          // if an odd digit remains, switch to Code B for the last digit
          if i < chars.count && (chars[i].asciiValue! >= 48 && chars[i].asciiValue! <= 57) {
            // switch to Code B (100)
            codes.append(100)
            usingC = false
            // fallthrough to encode the single digit in Code B loop
          }
        } else {
          // cannot encode in C, switch to B
          codes.append(100)
          usingC = false
        }
      } else {
        // In Code B: check upcoming digit run to decide to switch to C
        let run = digitRunLength(from: i)
        // Use Code C if beneficial: at least 4 digits in the middle/start
        if run >= 4 {
          codes.append(99)  // Code C
          usingC = true
          continue  // next loop will encode in C
        }

        // Encode single character in Code B
        let ascii = Int(chars[i].asciiValue!)
        codes.append(ascii - 32)
        i += 1
      }
    }

    // checksum
    var sum = codes[0]
    for (idx, c) in codes.dropFirst().enumerated() {
      sum += c * (idx + 1)
    }
    let check = sum % 103
    codes.append(check)
    codes.append(106)  // STOP

    // Code128 widths table (6-run widths strings for codes 0..106; stop is 7 runs)
    let widthsTable: [String] = [
      "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212",
      "221213",
      "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211",
      "221132",
      "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112",
      "322211",
      "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311",
      "211313",
      "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121",
      "211331",
      "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311",
      "332111",
      "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221",
      "112214",
      "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112",
      "134111",
      "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211",
      "212141",
      "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311",
      "113141",
      "114131", "311141", "411131", "211412", "211214", "211232", "233111", "211214", "233111",
      "211214",
    ]

    // convert codes -> module widths
    var modules: [Int] = []
    for c in codes {
      guard c >= 0 && c < widthsTable.count else { return nil }
      let s = widthsTable[c]
      for ch in s { modules.append(Int(String(ch)) ?? 0) }
    }

    return modules
  }

  /// Compress a bitstring like "1010011" into alternating module widths
  /// starting with a bar run (first char should be '1').
  private static func compressBitStringToModuleWidths(_ bits: String) -> [Int] {
    var result: [Int] = []
    var currentChar: Character? = nil
    var count = 0
    for ch in bits {
      if currentChar == nil {
        currentChar = ch
        count = 1
        continue
      }
      if ch == currentChar {
        count += 1
      } else {
        result.append(count)
        currentChar = ch
        count = 1
      }
    }
    if currentChar != nil { result.append(count) }
    return result
  }

  /// Render a CGImage from alternating module widths (bars/spaces) where the
  /// first entry is a bar. `quietZoneModules` are added as margins on both
  /// sides (measured in module units).
  private static func renderCGImage(
    fromModules modules: [Int], targetSize: CGSize, quietZoneModules: Int
  ) -> CGImage? {
    let scale = deviceScale
    let widthPx = max(1, Int(round(targetSize.width * scale)))
    let heightPx = max(1, Int(round(targetSize.height * scale)))

    let totalUnits = modules.reduce(0, +) + quietZoneModules * 2
    guard totalUnits > 0 else { return nil }

    // Prepare bitmap context (ARGB)
    let colorSpace = CGColorSpaceCreateDeviceRGB()
    guard
      let ctx = CGContext(
        data: nil, width: widthPx, height: heightPx, bitsPerComponent: 8, bytesPerRow: 0,
        space: colorSpace, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)
    else { return nil }

    // White background
    ctx.setFillColor(UIColor.white.cgColor)
    ctx.fill(CGRect(x: 0, y: 0, width: CGFloat(widthPx), height: CGFloat(heightPx)))

    ctx.setAllowsAntialiasing(false)
    ctx.interpolationQuality = .none

    // Accumulate pixel widths using rounding to ensure total fills exactly
    var acc: Double = Double(quietZoneModules) * Double(widthPx) / Double(totalUnits)
    var consumed = 0

    var x = Int(round(acc))
    consumed += x

    // Draw modules (first module corresponds to a bar)
    var isBar = true
    for u in modules {
      acc += Double(u) * Double(widthPx) / Double(totalUnits)
      let toX = Int(round(acc))
      let w = toX - consumed
      if w > 0 {
        if isBar {
          ctx.setFillColor(UIColor.black.cgColor)
          ctx.fill(CGRect(x: x, y: 0, width: w, height: heightPx))
        }
        x += w
        consumed += w
      }
      isBar.toggle()
    }

    // If there is remaining width (due to rounding), leave it white (quiet zone)
    return ctx.makeImage()
  }

  // MARK: - Helpers
  private static func renderPlaceholderImage(text: String, size: CGSize) -> UIImage {
    let scale = deviceScale
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
      .paragraphStyle: paragraph,
    ]

    let insetRect = CGRect(
      x: 6, y: (scaledSize.height - font.lineHeight) / 2, width: scaledSize.width - 12,
      height: font.lineHeight)
    (text as NSString).draw(in: insetRect, withAttributes: attrs)

    // subtle border to suggest a placeholder barcode area
    let borderRect = CGRect(
      x: 1 / scale, y: 1 / scale, width: scaledSize.width - 2 / scale,
      height: scaledSize.height - 2 / scale)
    let borderPath = UIBezierPath(roundedRect: borderRect, cornerRadius: 6 / scale)
    UIColor.black.setStroke()
    borderPath.lineWidth = 1 / scale
    borderPath.stroke()

    return UIGraphicsGetImageFromCurrentImageContext() ?? UIImage()
  }

  // Platform-safe scale accessor
  private static var deviceScale: CGFloat {
    #if os(watchOS)
      return WKInterfaceDevice.current().screenScale
    #elseif canImport(UIKit)
      return UIScreen.main.scale
    #else
      return 1.0
    #endif
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
