import XCTest

@testable import MyLoyaltyCardsWatch

final class BarcodeGeneratorTests: XCTestCase {
  func test_generateQRCode_returnsCIImage() throws {
    let ci = BarcodeGenerator.generateCIImage(value: "https://example.com", format: .QR)
    XCTAssertNotNil(ci)
  }

  func test_generateCode128_returnsCIImage() throws {
    let ci = BarcodeGenerator.generateCIImage(value: "ABC123", format: .CODE128)
    XCTAssertNotNil(ci)
  }

  func test_generateFallbackForEAN13_returnsCIImage() throws {
    // EAN13 currently falls back to Code128 renderer on watch
    let ci = BarcodeGenerator.generateCIImage(value: "5901234123457", format: .EAN13)
    XCTAssertNotNil(ci)
  }

  func test_generateImage_acceptsCaseInsensitiveFormat() async throws {
    let img = await BarcodeGenerator.generateImage(
      value: "test", formatString: "qr", targetSize: CGSize(width: 160, height: 160))
    XCTAssertNotNil(img)
  }

  func test_generateImage_isCached() async throws {
    let size = CGSize(width: 160, height: 80)
    let value = "5901234123457"
    let format = "EAN13"

    let img1 = await BarcodeGenerator.generateImage(
      value: value, formatString: format, targetSize: size)
    XCTAssertNotNil(img1)
    XCTAssertTrue(
      BarcodeGenerator.isImageCached(value: value, formatString: format, targetSize: size))

    // case-insensitive key should hit the same cache entry
    let img2 = await BarcodeGenerator.generateImage(
      value: value, formatString: "ean13", targetSize: size)
    XCTAssertNotNil(img2)

    // whitespace should be trimmed for the cache key
    let img3 = await BarcodeGenerator.generateImage(
      value: value, formatString: " eAn13 ", targetSize: size)
    XCTAssertNotNil(img3)
    XCTAssertTrue(
      BarcodeGenerator.isImageCached(value: value, formatString: " eAn13 ", targetSize: size))
  }

  func test_generateImage_returnsNil_forUnknownOrNilFormat() async throws {
    let size = CGSize(width: 160, height: 80)

    let resultNil = await BarcodeGenerator.generateImage(value: "x", formatString: nil, targetSize: size)
    XCTAssertNil(resultNil)

    let resultUnknown = await BarcodeGenerator.generateImage(value: "x", formatString: "UNKNOWN", targetSize: size)
    XCTAssertNil(resultUnknown)
  }

  #if DEBUG
    func test_generateImage_respectsCancellation() async throws {
      // make CGImage creation take a small amount of time so cancellation is reliable
      BarcodeGenerator.debugDelayForTests = 0.25
      defer { BarcodeGenerator.debugDelayForTests = 0 }

      let size = CGSize(width: 200, height: 80)
      let task = Task {
        await BarcodeGenerator.generateImage(
          value: "test-cancel", formatString: "QR", targetSize: size)
      }
      // cancel immediately
      task.cancel()

      let result = await task.value
      XCTAssertNil(result, "generateImage should return nil when the calling task is cancelled")
    }
  #endif

  func test_generateCIImage_supportsUTF8_forQR() throws {
    let ci = BarcodeGenerator.generateCIImage(value: "テスト", format: .QR)
    XCTAssertNotNil(ci)
  }
}
