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

    let img1 = await BarcodeGenerator.generateImage(value: value, formatString: format, targetSize: size)
    XCTAssertNotNil(img1)
    XCTAssertTrue(BarcodeGenerator.isImageCached(value: value, formatString: format, targetSize: size))

    // case-insensitive key should hit the same cache entry
    let img2 = await BarcodeGenerator.generateImage(value: value, formatString: "ean13", targetSize: size)
    XCTAssertNotNil(img2)
  }

  func test_generateCIImage_supportsUTF8_forQR() throws {
    let ci = BarcodeGenerator.generateCIImage(value: "テスト", format: .QR)
    XCTAssertNotNil(ci)
  }
}
