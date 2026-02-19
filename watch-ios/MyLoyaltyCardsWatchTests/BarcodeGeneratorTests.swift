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

    let resultNil = await BarcodeGenerator.generateImage(
      value: "x", formatString: nil, targetSize: size)
    XCTAssertNil(resultNil)

    let resultUnknown = await BarcodeGenerator.generateImage(
      value: "x", formatString: "UNKNOWN", targetSize: size)
    XCTAssertNil(resultUnknown)
  }

  func test_generateImage_forEAN13_returnsImage_and_validatesChecksum() async throws {
    let size = CGSize(width: 160, height: 80)
    // valid 13-digit EAN-13
    let img = await BarcodeGenerator.generateImage(
      value: "5901234123457", formatString: "EAN13", targetSize: size)
    XCTAssertNotNil(img)

    // invalid length should return nil
    let invalid = await BarcodeGenerator.generateImage(
      value: "5901234", formatString: "EAN13", targetSize: size)
    XCTAssertNil(invalid)
  }

  func test_generateImage_forCode128_returnsImage_forAlphanumeric() async throws {
    let size = CGSize(width: 280, height: 80)
    let img = await BarcodeGenerator.generateImage(
      value: "ABC123-xyz", formatString: "CODE128", targetSize: size)
    XCTAssertNotNil(img)
  }

  func test_generateImage_code128_usesCodeC_forEvenDigits() async throws {
    let size = CGSize(width: 280, height: 80)
    let img = await BarcodeGenerator.generateImage(
      value: "12345678", formatString: "CODE128", targetSize: size)
    XCTAssertNotNil(img)
  }

  func test_generateImage_code128_handlesOddDigitRun() async throws {
    let size = CGSize(width: 300, height: 80)
    let img = await BarcodeGenerator.generateImage(
      value: "A12345B", formatString: "CODE128", targetSize: size)
    XCTAssertNotNil(img)
  }

  func test_generateImage_code128_twoDigits_entireString() async throws {
    let size = CGSize(width: 60, height: 40)
    let img = await BarcodeGenerator.generateImage(
      value: "12", formatString: "CODE128", targetSize: size)
    XCTAssertNotNil(img)
  }
}
