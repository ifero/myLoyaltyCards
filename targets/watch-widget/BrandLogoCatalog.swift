import Foundation

enum BrandLogoCatalog {
  private static let knownBrandIds: Set<String> = [
    "acqua-e-sapone",
    "bennet",
    "blukids",
    "burger-king",
    "calliope",
    "calzedonia",
    "camaieu",
    "carrefour",
    "coin",
    "conad",
    "coop",
    "crai",
    "decathlon",
    "deco",
    "demma",
    "desigual",
    "despar",
    "douglas",
    "esselunga",
    "euronics",
    "eurospin",
    "hm",
    "ido",
    "ikea",
    "il-gigante",
    "intimissimi",
    "jysk",
    "lidl",
    "lotteria-degli-scontrini",
    "md",
    "mediaworld",
    "motivi",
    "old-wild-west",
    "oltre",
    "original-marines",
    "ovs",
    "pam",
    "pandora",
    "penny-market",
    "piazza-italia",
    "pitta-rosso",
    "prenatal",
    "rinascente",
    "sephora",
    "stroili",
    "tigota",
    "tommy-hilfiger",
    "toys-center",
    "uniclub",
    "unieuro",
    "zara",
  ]

  /// Brand logos whose artwork is predominantly white / very light. On the
  /// default white chip they would disappear, so the widget gives them a dark
  /// backing instead. Derived from the rendered logo luminance.
  private static let lightLogoBrandIds: Set<String> = [
    "conad",
    "coop",
    "intimissimi",
    "stroili",
    "tigota",
  ]

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

    return lightLogoBrandIds.contains(normalizedBrandId)
  }

  private static func normalized(_ brandId: String?) -> String? {
    guard
      let normalizedBrandId = brandId?
        .trimmingCharacters(in: .whitespacesAndNewlines)
        .lowercased(),
      !normalizedBrandId.isEmpty,
      knownBrandIds.contains(normalizedBrandId)
    else {
      return nil
    }

    return normalizedBrandId
  }
}
