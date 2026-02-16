import XCTest

@testable import MyLoyaltyCardsWatch

final class BarcodeGeneratorTests: XCTestCase {
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
}
