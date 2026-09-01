import SwiftUI

#if canImport(CoreImage)
  import CoreImage
#endif

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
struct BarcodeGenerator {
  // v3: EAN-8, UPC-A and Code39 stopped rendering as Code128 (Story 16.28), so any
  // image cached under v2 for those formats is the wrong symbology and must not be served.
  private static let cacheVersion = "watch-barcode-v3"

  private static let uiImageCache: NSCache<NSString, UIImage> = {
    let c = NSCache<NSString, UIImage>()
    c.countLimit = 64  // keep a reasonable number of cached barcode images
    c.totalCostLimit = 4 * 1024 * 1024  // ~4 MB budget
    c.name = "BarcodeGenerator.uiImageCache"
    return c
  }()

  /// Generates a barcode image for `value` using a watchOS-friendly renderer.
  /// Supports every case of `WatchBarcodeFormat`, each in its own symbology.
  /// Returns `nil` when `value` cannot be encoded in the requested format, so the
  /// caller can fall back to the human-readable placeholder. Rendering is cached.
  static func generateImage(value: String, formatString: String?, targetSize: CGSize) async
    -> Image?
  {
    let fmtKey = (formatString ?? "").trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
    guard !fmtKey.isEmpty, let fmt = WatchBarcodeFormat(rawValue: fmtKey) else { return nil }

    let key = "\(cacheVersion)|\(value)|\(fmtKey)|\(Int(targetSize.width))x\(Int(targetSize.height))" as NSString
    if let cached = uiImageCache.object(forKey: key) {
      return Image(uiImage: cached)
    }

    // QR is drawn by Core Image; every other format goes through the module renderer.
    if fmt == .QR {
      if let uiImage = renderQRCodeImage(text: value, size: targetSize) {
        cacheImage(uiImage, forKey: key, targetSize: targetSize)
        return Image(uiImage: uiImage)
      }

      return nil
    }

    guard let mod = modules(for: fmt, value: value) else { return nil }

    // Render CGImage off the main thread for performance
    let cgImage: CGImage? = await withCheckedContinuation { cont in
      DispatchQueue.global(qos: .userInitiated).async {
        let cg = renderCGImage(
          fromModules: mod, targetSize: targetSize,
          quietZoneModules: quietZone(for: fmt))
        cont.resume(returning: cg)
      }
    }
    guard let safeCG = cgImage else { return nil }

    if Task.isCancelled { return nil }

    let uiImage = await MainActor.run {
      UIImage(cgImage: safeCG, scale: deviceScale, orientation: .up)
    }

    // Cache and return
    cacheImage(uiImage, forKey: key, targetSize: targetSize)
    return Image(uiImage: uiImage)
  }

  // MARK: - Encoders & renderer (watchOS-friendly)

  /// The module widths for `value` in `format`, or `nil` when it cannot be encoded.
  ///
  /// This is the *only* place a format chooses an encoder. Keeping it single means a
  /// format can never quietly borrow another's symbology — the defect Story 16.28
  /// removed, where EAN-8, UPC-A and Code39 all resolved to `encodeCode128`.
  private static func modules(for format: WatchBarcodeFormat, value: String) -> [Int]? {
    switch format {
    case .EAN13: return encodeEAN13(value: value)
    case .CODE128: return encodeCode128(value: value)
    case .EAN8: return encodeEAN8(value: value)
    case .UPCA: return encodeUPCA(value: value)
    case .CODE39: return encodeCode39(value: value)
    case .QR: return nil  // drawn by Core Image, never by the module renderer
    }
  }

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

  // MARK: EAN-8 / UPC-A

  /// Left-hand "odd parity" (A) digit patterns, shared by EAN-8 and UPC-A, which
  /// encode *every* left digit with this set. `encodeEAN13` keeps its own copies
  /// because it also needs the B set for its first-digit parity table, and it is
  /// deliberately left untouched.
  private static let eanLeftOddPatterns: [String] = [
    "0001101", "0011001", "0010011", "0111101", "0100011",
    "0110001", "0101111", "0111011", "0110111", "0001011",
  ]

  /// Right-hand digit patterns — the bitwise complement of `eanLeftOddPatterns`.
  private static let eanRightPatterns: [String] = [
    "1110010", "1100110", "1101100", "1000010", "1011100",
    "1001110", "1010000", "1000100", "1001000", "1110100",
  ]

  /// The ASCII digits of `value`, or `nil` when it holds a numeral these encoders
  /// cannot represent.
  ///
  /// Non-numeric characters are ignored, matching `encodeEAN13`'s tolerance for a
  /// value stored as `"5901234-123457"`. A **non-ASCII numeral** is a different case
  /// and is refused outright, because every way of handling it is wrong: `٣`, `Ⅷ` and
  /// `㉈` all satisfy `Character.isWholeNumber`, yet `Int(String("٣"))` is `nil` so a
  /// force-unwrap traps, `"Ⅷ".wholeNumberValue` is `8` so it would encode a digit the
  /// card does not contain, and `"㉈"` is `10` so it would index past the ten-entry
  /// pattern tables. Dropping it silently is no better — that encodes a shorter number
  /// than the one stored. Returning `nil` sends the caller to the human-readable
  /// placeholder, which is the AC3 contract.
  private static func asciiDigits(of value: String) -> [Int]? {
    var digits: [Int] = []

    for character in value {
      guard let digit = character.wholeNumberValue else { continue }
      guard character.isASCII, (0...9).contains(digit) else { return nil }
      digits.append(digit)
    }

    return digits
  }

  /// Check digit for the UPC/EAN members whose data section has an odd length —
  /// EAN-8's 7 digits and UPC-A's 11 — where the weights alternate 3,1,… starting
  /// at 3.
  ///
  /// Deliberately *not* `ean13CheckDigit`: that one starts at weight 1 because its
  /// data section is 12 digits long. Reusing it here yields a well-formed but wrong
  /// check digit, which is exactly the kind of plausible-looking failure this story
  /// removes.
  private static func upcEANCheckDigit(for digits: [Int]) -> Int {
    var sum = 0
    for (i, d) in digits.enumerated() {
      sum += d * ((i % 2 == 0) ? 3 : 1)
    }
    return (10 - (sum % 10)) % 10
  }

  /// Encode numeric `value` into EAN-8 module widths (alternating bars/spaces).
  /// Accepts 7 digits (computes the check digit) or 8 (validates it), mirroring
  /// `encodeEAN13`'s contract. Returns `nil` on a checksum mismatch so a corrupt
  /// payload fails visibly rather than rendering a wrong-but-plausible symbol.
  private static func encodeEAN8(value: String) -> [Int]? {
    guard let digits = asciiDigits(of: value), digits.count == 7 || digits.count == 8 else {
      return nil
    }

    var d = digits
    if d.count == 7 {
      d.append(upcEANCheckDigit(for: d))
    } else {
      guard upcEANCheckDigit(for: Array(d[0..<7])) == d[7] else { return nil }
    }

    var bits = "101"  // left guard
    for digit in d[0..<4] { bits += eanLeftOddPatterns[digit] }
    bits += "01010"  // centre guard
    for digit in d[4..<8] { bits += eanRightPatterns[digit] }
    bits += "101"  // right guard

    return compressBitStringToModuleWidths(bits)
  }

  /// Encode numeric `value` into UPC-A module widths (alternating bars/spaces).
  /// Accepts 11 digits (computes the check digit) or 12 (validates it).
  ///
  /// A UPC-A symbol is module-identical to the EAN-13 symbol of the same digits
  /// prefixed with `0`, but it is **not** implemented that way: `encodeEAN13`
  /// reads a 12-digit argument as EAN-13 data awaiting a check digit, so handing
  /// it a complete 12-digit UPC-A produces a different — and wrong — symbol. UPC-A
  /// also has its own 11-digit check-digit contract, which `encodeEAN13` cannot
  /// express.
  private static func encodeUPCA(value: String) -> [Int]? {
    guard let digits = asciiDigits(of: value), digits.count == 11 || digits.count == 12 else {
      return nil
    }

    var d = digits
    if d.count == 11 {
      d.append(upcEANCheckDigit(for: d))
    } else {
      guard upcEANCheckDigit(for: Array(d[0..<11])) == d[11] else { return nil }
    }

    var bits = "101"  // left guard
    for digit in d[0..<6] { bits += eanLeftOddPatterns[digit] }
    bits += "01010"  // centre guard
    for digit in d[6..<12] { bits += eanRightPatterns[digit] }
    bits += "101"  // right guard

    return compressBitStringToModuleWidths(bits)
  }

  // MARK: Code 39

  /// The `*` start/stop delimiter, in the same nine-element form as `code39Patterns`.
  private static let code39Delimiter = "131131311"

  /// The 43 encodable Code 39 characters, each as nine element widths — five bars
  /// and four spaces, alternating and starting with a bar, three of them wide.
  /// Widths are narrow `1` : wide `3`, the ratio ISO/IEC 16388 recommends.
  private static let code39Patterns: [Character: String] = [
    "0": "111331311", "1": "311311113", "2": "113311113", "3": "313311111",
    "4": "111331113", "5": "311331111", "6": "113331111", "7": "111311313",
    "8": "311311311", "9": "113311311", "A": "311113113", "B": "113113113",
    "C": "313113111", "D": "111133113", "E": "311133111", "F": "113133111",
    "G": "111113313", "H": "311113311", "I": "113113311", "J": "111133311",
    "K": "311111133", "L": "113111133", "M": "313111131", "N": "111131133",
    "O": "311131131", "P": "113131131", "Q": "111111333", "R": "311111331",
    "S": "113111331", "T": "111131331", "U": "331111113", "V": "133111113",
    "W": "333111111", "X": "131131113", "Y": "331131111", "Z": "133131111",
    "-": "131111313", ".": "331111311", " ": "133111311", "$": "131313111",
    "/": "131311131", "+": "131113131", "%": "111313131",
  ]

  /// Encode `value` into Code 39 module widths (alternating bars/spaces), wrapped
  /// in the `*` start/stop delimiters and separated by a narrow inter-character gap.
  ///
  /// Returns `nil` for an empty value or any character outside the 43-character set.
  /// Lower-case is rejected rather than upper-cased: Code 39 has no lower-case, and
  /// silently changing the payload would make the watch encode a different string
  /// from the one on the card — the same class of substitution this story removes.
  ///
  /// No mod-43 check digit is appended. It is optional in the symbology, and the
  /// phone renders these cards without one; adding it only on the watch would make
  /// the wrist symbol decode to a different string than the plastic.
  private static func encodeCode39(value: String) -> [Int]? {
    guard !value.isEmpty else { return nil }

    var modules: [Int] = []
    func appendPattern(_ pattern: String) {
      for ch in pattern { modules.append(ch.wholeNumberValue ?? 0) }
    }

    appendPattern(code39Delimiter)
    for ch in value {
      guard let pattern = code39Patterns[ch] else { return nil }
      modules.append(1)  // narrow inter-character gap
      appendPattern(pattern)
    }
    modules.append(1)
    appendPattern(code39Delimiter)

    return modules
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

  /// Minimum quiet zone, in modules, for each side of `format`'s symbol.
  ///
  /// Per-symbology rather than one flat value: on a wrist-sized symbol an
  /// over-wide margin buys nothing and narrows every bar, which is the opposite of
  /// what scannability needs. The figures are the published minima — 7X for EAN-8
  /// and 9X for UPC-A (GS1 General Specifications), 10 narrow elements for Code 39
  /// (ISO/IEC 16388). EAN-13 and Code128 keep the 10 they already ship with;
  /// revisiting those belongs to the geometry story, not this one.
  private static func quietZone(for format: WatchBarcodeFormat) -> Int {
    switch format {
    case .EAN8: return 7
    case .UPCA: return 9
    // QR never reaches the module renderer, but naming it keeps this switch
    // exhaustive so a seventh format cannot be added without deciding here.
    case .CODE39, .CODE128, .EAN13, .QR: return 10
    }
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

  private static func cacheImage(
    _ image: UIImage,
    forKey key: NSString,
    targetSize: CGSize
  ) {
    let cost = Int(targetSize.width * targetSize.height * deviceScale * 4)
    uiImageCache.setObject(image, forKey: key, cost: cost)
  }

  private static func renderQRCodeImage(text: String, size: CGSize) -> UIImage? {
    #if canImport(CoreImage)
      guard let data = text.data(using: .utf8) else { return nil }
      guard let filter = CIFilter(name: "CIQRCodeGenerator") else { return nil }

      filter.setValue(data, forKey: "inputMessage")
      filter.setValue("Q", forKey: "inputCorrectionLevel")

      guard let outputImage = filter.outputImage else { return nil }

      let qrExtent = outputImage.extent.integral
      guard !qrExtent.isEmpty else { return nil }

      let widthPx = max(1, Int(round(size.width * deviceScale)))
      let heightPx = max(1, Int(round(size.height * deviceScale)))
      let scale = max(
        floor(min(CGFloat(widthPx) / qrExtent.width, CGFloat(heightPx) / qrExtent.height)),
        1
      )

      let transformedImage = outputImage.transformed(
        by: CGAffineTransform(scaleX: scale, y: scale)
      )
      let transformedExtent = transformedImage.extent.integral

      let ciContext = CIContext(options: nil)
      guard let qrImage = ciContext.createCGImage(transformedImage, from: transformedExtent) else {
        return nil
      }

      let colorSpace = CGColorSpaceCreateDeviceRGB()
      guard
        let context = CGContext(
          data: nil,
          width: widthPx,
          height: heightPx,
          bitsPerComponent: 8,
          bytesPerRow: 0,
          space: colorSpace,
          bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
        )
      else { return nil }

      context.interpolationQuality = .none
      context.setShouldAntialias(false)
      context.setFillColor(UIColor.white.cgColor)
      context.fill(CGRect(x: 0, y: 0, width: widthPx, height: heightPx))

      let drawRect = CGRect(
        x: max((widthPx - Int(transformedExtent.width)) / 2, 0),
        y: max((heightPx - Int(transformedExtent.height)) / 2, 0),
        width: Int(transformedExtent.width),
        height: Int(transformedExtent.height)
      )
      context.draw(qrImage, in: drawRect)

      guard let finalImage = context.makeImage() else { return nil }

      return UIImage(cgImage: finalImage, scale: deviceScale, orientation: .up)
    #else
      return nil
    #endif
  }

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
    /// Test helper: the module widths `generateImage` would render for this
    /// value and format, or `nil` when the value cannot be encoded. Routes through
    /// the same `modules(for:value:)` the renderer uses, so a vector test exercises
    /// the shipped path rather than a copy of it.
    static func modulesForTesting(value: String, formatString: String?) -> [Int]? {
      let fmtKey = (formatString ?? "").trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
      guard !fmtKey.isEmpty, let fmt = WatchBarcodeFormat(rawValue: fmtKey) else { return nil }
      return modules(for: fmt, value: value)
    }

    /// Test helper: the quiet zone, in modules, `generateImage` applies to `format`.
    static func quietZoneForTesting(formatString: String) -> Int? {
      let fmtKey = formatString.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
      guard let fmt = WatchBarcodeFormat(rawValue: fmtKey) else { return nil }
      return quietZone(for: fmt)
    }

    /// Test helper: check whether a generated image is present in the cache.
    static func isImageCached(value: String, formatString: String?, targetSize: CGSize) -> Bool {
      let fmtKey = (formatString ?? "").trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
      let key = "\(cacheVersion)|\(value)|\(fmtKey)|\(Int(targetSize.width))x\(Int(targetSize.height))" as NSString
      return uiImageCache.object(forKey: key) != nil
    }
  #endif
}
