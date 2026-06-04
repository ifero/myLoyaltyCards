import Foundation

/// Resolves a card's brand id to its widget logo asset and decides whether that
/// logo needs a dark chip to stay legible. The underlying brand-id sets
/// (`knownBrandIds`, `lightLogoBrandIds`) are generated from the catalogue and
/// the bundled `BrandLogo-*` imagesets — see `BrandLogoCatalog.generated.swift`
/// and `watch-ios/Scripts/generate-catalogue.swift` — so they cannot silently
/// drift from the assets that actually ship.
enum BrandLogoCatalog {
  static func assetName(for brandId: String?) -> String? {
    guard let normalizedBrandId = normalized(brandId) else {
      return nil
    }

    return "BrandLogo-\(normalizedBrandId)"
  }

  /// True when the brand logo needs a dark chip behind it to stay visible
  /// (its artwork is light/white). Defaults to false for unknown brands.
  static func prefersDarkBacking(for brandId: String?) -> Bool {
    guard let normalizedBrandId = normalized(brandId) else {
      return false
    }

    return BrandLogoCatalogData.lightLogoBrandIds.contains(normalizedBrandId)
  }

  private static func normalized(_ brandId: String?) -> String? {
    guard
      let normalizedBrandId = brandId?
        .trimmingCharacters(in: .whitespacesAndNewlines)
        .lowercased(),
      !normalizedBrandId.isEmpty,
      BrandLogoCatalogData.knownBrandIds.contains(normalizedBrandId)
    else {
      return nil
    }

    return normalizedBrandId
  }
}
