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

  static func assetName(for brandId: String?) -> String? {
    guard
      let normalizedBrandId = brandId?
        .trimmingCharacters(in: .whitespacesAndNewlines)
        .lowercased(),
      !normalizedBrandId.isEmpty,
      knownBrandIds.contains(normalizedBrandId)
    else {
      return nil
    }

    return "BrandLogo-\(normalizedBrandId)"
  }
}
