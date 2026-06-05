import CoreGraphics
import CryptoKit
import Foundation
import ImageIO

struct CatalogueData: Decodable {
  let brands: [CatalogueBrand]
}

struct CatalogueBrand: Decodable {
  let id: String
  let logo: String
  let name: String?
  let aliases: [String]?
}

enum GeneratorError: Error, LocalizedError {
  case missingScriptPath
  case invalidRepositoryStructure
  case missingCommittedOutput
  case missingCommittedWidgetOutput
  case missingAssetCatalogue

  var errorDescription: String? {
    switch self {
    case .missingScriptPath:
      return "Unable to resolve script path from command line arguments."
    case .invalidRepositoryStructure:
      return "Unable to infer repository root from script location. Expected path structure: watch-ios/Scripts/<script>."
    case .missingCommittedOutput:
      return "Committed Brands.swift is missing. Run the generator without --check to create it."
    case .missingCommittedWidgetOutput:
      return "Committed BrandLogoCatalog.generated.swift is missing. Run the generator without --check to create it."
    case .missingAssetCatalogue:
      return "Unable to locate the widget asset catalogue (targets/watch-widget/Assets.xcassets)."
    }
  }
}

/// A brand logo whose mean luminance over opaque pixels exceeds this value is
/// treated as "light" and gets a dark chip behind it in the complication. The
/// rendered logos split cleanly into two clusters — the lightest non-light logo
/// sits well under 200 and the darkest light logo well over — so the exact
/// cutoff is not sensitive.
let lightLuminanceThreshold = 200.0

/// Minimum alpha (0–255) for a pixel to count as "opaque" when averaging
/// luminance. Kept high so anti-aliased edges / faint halos do not skew the
/// average and so un-premultiplying stays accurate (dividing by a tiny alpha
/// amplifies noise).
let opaqueAlphaThreshold = 200

struct GeneratorPaths {
  let catalogueURL: URL
  let assetsDirectory: URL
  let outputURL: URL
  let widgetOutputURL: URL
  let hashURL: URL
  let scriptURL: URL
  let repoRoot: URL
}

func swiftStringLiteral(_ value: String) -> String {
  value
    .replacingOccurrences(of: "\\", with: "\\\\")
    .replacingOccurrences(of: "\n", with: "\\n")
    .replacingOccurrences(of: "\r", with: "\\r")
    .replacingOccurrences(of: "\t", with: "\\t")
    .replacingOccurrences(of: "\"", with: "\\\"")
}

func aliasesLiteral(_ aliases: [String]?) -> String {
  guard let aliases, aliases.isEmpty == false else {
    return "[]"
  }

  let values = aliases.map { "\"\(swiftStringLiteral($0))\"" }.joined(separator: ", ")
  return "[\(values)]"
}

func optionalLiteral(_ value: String?) -> String {
  guard let value else {
    return "nil"
  }
  return "\"\(swiftStringLiteral(value))\""
}

/// Renders a sorted list of brand-id slugs as a multi-line Swift `Set<String>`
/// literal, indented to follow `static let … = ` inside a two-space-indented
/// enum.
func brandIdSetLiteral(_ ids: [String]) -> String {
  guard ids.isEmpty == false else {
    return "[]"
  }

  let elements = ids
    .map { "    \"\(swiftStringLiteral($0))\"" }
    .joined(separator: ",\n")
  return "[\n\(elements),\n  ]"
}

func resolveEnvPath(_ value: String, relativeTo repoRoot: URL) -> URL {
  if value.hasPrefix("/") {
    return URL(fileURLWithPath: value)
  }
  return repoRoot.appendingPathComponent(value)
}

/// Expresses `url` relative to `repoRoot` when it lives inside the repo, otherwise returns
/// the absolute path. Keeps the generated `Source:` comment reproducible across checkout
/// locations instead of baking in a machine-specific absolute path.
func repoRelativePath(for url: URL, repoRoot: URL) -> String {
  let target = url.standardizedFileURL.path
  let root = repoRoot.standardizedFileURL.path
  let prefix = root.hasSuffix("/") ? root : root + "/"
  if target.hasPrefix(prefix) {
    return String(target.dropFirst(prefix.count))
  }
  return target
}

func resolvePaths() throws -> GeneratorPaths {
  guard let scriptPath = CommandLine.arguments.first else {
    throw GeneratorError.missingScriptPath
  }

  let scriptURL = URL(fileURLWithPath: scriptPath).standardizedFileURL
  let scriptsDirectory = scriptURL.deletingLastPathComponent()
  let watchIosDirectory = scriptsDirectory.deletingLastPathComponent()
  let repoRoot = watchIosDirectory.deletingLastPathComponent()

  guard watchIosDirectory.lastPathComponent == "watch-ios" else {
    throw GeneratorError.invalidRepositoryStructure
  }

  let environment = ProcessInfo.processInfo.environment

  let catalogueURL: URL
  if let overridePath = environment["CATALOGUE_JSON_PATH"], overridePath.isEmpty == false {
    catalogueURL = resolveEnvPath(overridePath, relativeTo: repoRoot)
  } else {
    catalogueURL = repoRoot.appendingPathComponent("catalogue/italy.json")
  }

  // WIDGET_ASSETS_PATH lets tests point luminance analysis at a fixture catalogue.
  let assetsDirectory: URL
  if let overridePath = environment["WIDGET_ASSETS_PATH"], overridePath.isEmpty == false {
    assetsDirectory = resolveEnvPath(overridePath, relativeTo: repoRoot)
  } else {
    assetsDirectory = repoRoot.appendingPathComponent("targets/watch-widget/Assets.xcassets")
  }

  // CATALOGUE_OUTPUT_PATH lets callers (notably the Jest test suite) redirect generation to a
  // throwaway path so the tracked targets/watch/Generated/Brands.swift is never mutated.
  let outputURL: URL
  if let overridePath = environment["CATALOGUE_OUTPUT_PATH"], overridePath.isEmpty == false {
    outputURL = resolveEnvPath(overridePath, relativeTo: repoRoot)
  } else {
    outputURL = repoRoot.appendingPathComponent("targets/watch/Generated/Brands.swift")
  }

  // WIDGET_CATALOG_OUTPUT_PATH does the same for the generated widget catalog, keeping the
  // tracked targets/watch-widget/Generated/BrandLogoCatalog.generated.swift pristine under test.
  let widgetOutputURL: URL
  if let overridePath = environment["WIDGET_CATALOG_OUTPUT_PATH"], overridePath.isEmpty == false {
    widgetOutputURL = resolveEnvPath(overridePath, relativeTo: repoRoot)
  } else {
    widgetOutputURL = repoRoot.appendingPathComponent("targets/watch-widget/Generated/BrandLogoCatalog.generated.swift")
  }

  let hashURL = outputURL.deletingLastPathComponent().appendingPathComponent(".catalogue-inputs.sha256")
  return GeneratorPaths(
    catalogueURL: catalogueURL,
    assetsDirectory: assetsDirectory,
    outputURL: outputURL,
    widgetOutputURL: widgetOutputURL,
    hashURL: hashURL,
    scriptURL: scriptURL,
    repoRoot: repoRoot
  )
}

func computeSHA256(for urls: [URL]) throws -> String {
  var hasher = SHA256()
  for url in urls {
    let data = try Data(contentsOf: url)
    hasher.update(data: data)
    hasher.update(data: Data(url.path.utf8))
  }
  let digest = hasher.finalize()
  return digest.map { String(format: "%02x", $0) }.joined()
}

func readStoredHash(at url: URL) -> String? {
  guard let data = try? Data(contentsOf: url), let value = String(data: data, encoding: .utf8) else {
    return nil
  }
  return value.trimmingCharacters(in: .whitespacesAndNewlines)
}

func writeStoredHash(_ hash: String, to url: URL) throws {
  try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
  try hash.write(to: url, atomically: true, encoding: .utf8)
}

func writeSource(_ source: String, to url: URL) throws {
  try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
  try source.write(to: url, atomically: true, encoding: .utf8)
}

// MARK: - Brands.swift (watch app target)

func generateSource(from catalogue: CatalogueData, sourcePath: String) -> String {
  let brands = catalogue.brands
    .map { brand in
      let logoUrl = "assets/images/brands/\(brand.logo).svg"
      return "    .init(id: \"\(swiftStringLiteral(brand.id))\", logoUrl: \"\(swiftStringLiteral(logoUrl))\", name: \(optionalLiteral(brand.name)), aliases: \(aliasesLiteral(brand.aliases)))"
    }
    .joined(separator: ",\n")

  return """
    // DO NOT EDIT — This file is auto-generated.
    // Generated by watch-ios/Scripts/generate-catalogue.swift
    // Source: \(sourcePath)

    import Foundation

    struct WatchBrand: Sendable {
      let id: String
      let logoUrl: String
      let name: String?
      let aliases: [String]
    }

    enum WatchBrands {
      static let all: [WatchBrand] = [
    \(brands)
      ]
    }
    """
}

// MARK: - BrandLogoCatalog.generated.swift (watch-widget target)

/// Mean luminance (0–255, Rec. 709) over the sufficiently-opaque pixels of a
/// rendered logo PNG, or `nil` when the image cannot be decoded or has no such
/// pixels. Used to decide which logos are near-white and need a dark chip.
func averageLuminanceOverOpaquePixels(at url: URL) -> Double? {
  guard
    let source = CGImageSourceCreateWithURL(url as CFURL, nil),
    let image = CGImageSourceCreateImageAtIndex(source, 0, nil)
  else {
    return nil
  }

  let width = image.width
  let height = image.height
  guard width > 0, height > 0 else {
    return nil
  }

  let bytesPerRow = width * 4
  var pixels = [UInt8](repeating: 0, count: bytesPerRow * height)
  guard
    let context = CGContext(
      data: &pixels,
      width: width,
      height: height,
      bitsPerComponent: 8,
      bytesPerRow: bytesPerRow,
      space: CGColorSpaceCreateDeviceRGB(),
      bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
    )
  else {
    return nil
  }

  context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))

  var luminanceSum = 0.0
  var opaquePixels = 0
  for index in stride(from: 0, to: pixels.count, by: 4) {
    let alpha = Int(pixels[index + 3])
    guard alpha > opaqueAlphaThreshold else { continue }

    // Un-premultiply so the colors reflect the artwork, not the blend against
    // the (transparent → black) backdrop CoreGraphics composites onto.
    let alphaFraction = Double(alpha) / 255.0
    let red = Double(pixels[index]) / alphaFraction
    let green = Double(pixels[index + 1]) / alphaFraction
    let blue = Double(pixels[index + 2]) / alphaFraction

    luminanceSum += 0.2126 * red + 0.7152 * green + 0.0722 * blue
    opaquePixels += 1
  }

  guard opaquePixels > 0 else {
    return nil
  }

  return luminanceSum / Double(opaquePixels)
}

struct BrandLogoAssetAnalysis {
  /// Slugs of every `BrandLogo-<slug>.imageset` that ships a usable PNG, sorted.
  let knownBrandIds: [String]
  /// Subset of `knownBrandIds` whose artwork is predominantly light, sorted.
  let lightLogoBrandIds: [String]
  /// The PNG files inspected, included in the regeneration input hash so an
  /// asset change (or addition/removal) triggers regeneration and is caught by
  /// the --check gate.
  let inputURLs: [URL]
}

/// Walks the widget asset catalogue and classifies each brand logo.
/// `knownBrandIds` comes from the imageset folders that actually ship a PNG (the
/// precise condition for `Image("BrandLogo-<slug>")` resolving), and
/// `lightLogoBrandIds` from the rendered luminance of each logo.
func analyzeBrandLogoAssets(assetsDirectory: URL) throws -> BrandLogoAssetAnalysis {
  let fileManager = FileManager.default
  var isDirectory: ObjCBool = false
  guard
    fileManager.fileExists(atPath: assetsDirectory.path, isDirectory: &isDirectory),
    isDirectory.boolValue
  else {
    throw GeneratorError.missingAssetCatalogue
  }

  let prefix = "BrandLogo-"
  let suffix = ".imageset"
  let entries = try fileManager.contentsOfDirectory(atPath: assetsDirectory.path).sorted()

  var knownBrandIds: [String] = []
  var lightLogoBrandIds: [String] = []
  var inputURLs: [URL] = []

  for entry in entries {
    guard entry.hasPrefix(prefix), entry.hasSuffix(suffix) else { continue }
    let slug = String(entry.dropFirst(prefix.count).dropLast(suffix.count))
    let imagesetURL = assetsDirectory.appendingPathComponent(entry)

    let pngs = ((try? fileManager.contentsOfDirectory(atPath: imagesetURL.path)) ?? [])
      .filter { $0.lowercased().hasSuffix(".png") }
      .sorted()

    // Prefer the highest-resolution rendition for the most accurate analysis.
    guard
      let chosenPng = pngs.first(where: { $0.contains("@3x") })
        ?? pngs.first(where: { $0.contains("@2x") })
        ?? pngs.first(where: { $0.contains("@1x") })
        ?? pngs.first
    else {
      // An imageset with no PNG can never render a logo, so it is not "known".
      continue
    }

    let pngURL = imagesetURL.appendingPathComponent(chosenPng)
    knownBrandIds.append(slug)
    inputURLs.append(pngURL)

    if let luminance = averageLuminanceOverOpaquePixels(at: pngURL), luminance > lightLuminanceThreshold {
      lightLogoBrandIds.append(slug)
    }
  }

  return BrandLogoAssetAnalysis(
    knownBrandIds: knownBrandIds.sorted(),
    lightLogoBrandIds: lightLogoBrandIds.sorted(),
    inputURLs: inputURLs.sorted { $0.path < $1.path }
  )
}

func generateWidgetCatalogSource(from analysis: BrandLogoAssetAnalysis) -> String {
  return """
    // DO NOT EDIT — This file is auto-generated.
    // Generated by watch-ios/Scripts/generate-catalogue.swift
    // Source: catalogue/italy.json + targets/watch-widget/Assets.xcassets/BrandLogo-*.imageset

    import Foundation

    /// Brand-logo data for the watch complication, kept in lockstep with the
    /// catalogue and the bundled `BrandLogo-*` imagesets by the generator.
    enum BrandLogoCatalogData {
      /// Brand slugs that ship a `BrandLogo-<slug>` imageset, so the complication
      /// can render the real logo instead of falling back to initials.
      static let knownBrandIds: Set<String> = \(brandIdSetLiteral(analysis.knownBrandIds))

      /// Brand logos whose rendered artwork is predominantly white / very light
      /// (mean Rec. 709 luminance > \(Int(lightLuminanceThreshold)) over opaque pixels). On the default
      /// white chip they would disappear, so the widget gives them a dark backing.
      static let lightLogoBrandIds: Set<String> = \(brandIdSetLiteral(analysis.lightLogoBrandIds))
    }
    """
}

// MARK: - Drift warnings

/// Surfaces (non-fatally) mismatches between the catalogue and the bundled logo
/// assets — the two inputs this generator keeps in sync.
func warnOnCatalogueAssetDrift(catalogue: CatalogueData, analysis: BrandLogoAssetAnalysis) {
  let catalogueIds = catalogue.brands.map { $0.id }
  let catalogueIdSet = Set(catalogueIds)
  let assetIdSet = Set(analysis.knownBrandIds)

  for id in analysis.knownBrandIds where catalogueIdSet.contains(id) == false {
    fputs("warning: BrandLogo-\(id).imageset has no matching brand in the catalogue.\n", stderr)
  }

  for id in catalogueIds where assetIdSet.contains(id) == false {
    fputs(
      "warning: Catalogue brand \"\(id)\" has no BrandLogo-\(id).imageset; the watch complication will fall back to initials.\n",
      stderr
    )
  }
}

// MARK: - Driver

func runCheck(brandsSource: String, widgetSource: String, paths: GeneratorPaths) throws {
  let fileManager = FileManager.default

  guard fileManager.fileExists(atPath: paths.outputURL.path) else {
    throw GeneratorError.missingCommittedOutput
  }
  let existingBrands = try String(contentsOf: paths.outputURL, encoding: .utf8)
  if existingBrands != brandsSource {
    fputs("error: Generated catalogue differs from committed Brands.swift\n", stderr)
    exit(1)
  }

  guard fileManager.fileExists(atPath: paths.widgetOutputURL.path) else {
    throw GeneratorError.missingCommittedWidgetOutput
  }
  let existingWidget = try String(contentsOf: paths.widgetOutputURL, encoding: .utf8)
  if existingWidget != widgetSource {
    fputs("error: Generated widget catalog differs from committed BrandLogoCatalog.generated.swift\n", stderr)
    exit(1)
  }

  print("Generated catalogue is up to date.")
}

func runGenerator(paths: GeneratorPaths, checkMode: Bool) throws {
  let catalogueData = try Data(contentsOf: paths.catalogueURL)
  let catalogue = try JSONDecoder().decode(CatalogueData.self, from: catalogueData)

  let analysis = try analyzeBrandLogoAssets(assetsDirectory: paths.assetsDirectory)
  warnOnCatalogueAssetDrift(catalogue: catalogue, analysis: analysis)

  let sourcePath = repoRelativePath(for: paths.catalogueURL, repoRoot: paths.repoRoot)
  let brandsSource = generateSource(from: catalogue, sourcePath: sourcePath)
  let widgetSource = generateWidgetCatalogSource(from: analysis)

  if checkMode {
    try runCheck(brandsSource: brandsSource, widgetSource: widgetSource, paths: paths)
    return
  }

  let inputHash = try computeSHA256(for: [paths.catalogueURL, paths.scriptURL] + analysis.inputURLs)
  let storedHash = readStoredHash(at: paths.hashURL)
  let fileManager = FileManager.default
  let upToDate = storedHash == inputHash
    && fileManager.fileExists(atPath: paths.outputURL.path)
    && fileManager.fileExists(atPath: paths.widgetOutputURL.path)

  if upToDate {
    print("Inputs unchanged; skipping catalogue generation.")
    return
  }

  try writeSource(brandsSource, to: paths.outputURL)
  try writeSource(widgetSource, to: paths.widgetOutputURL)
  try writeStoredHash(inputHash, to: paths.hashURL)
  print("Generated \(paths.outputURL.path)")
  print("Generated \(paths.widgetOutputURL.path)")
}

do {
  let paths = try resolvePaths()
  let environment = ProcessInfo.processInfo.environment
  let checkMode = environment["CATALOGUE_GENERATOR_CHECK"] == "1" || CommandLine.arguments.contains("--check")
  try runGenerator(paths: paths, checkMode: checkMode)
} catch {
  fputs("error: \(error.localizedDescription)\n", stderr)
  exit(1)
}
