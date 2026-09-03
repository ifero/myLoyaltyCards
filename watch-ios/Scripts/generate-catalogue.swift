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
  case missingWidgetAssetCatalogue(String)
  case missingWatchAssetCatalogue(String)
  case missingResolverSource(String)

  var errorDescription: String? {
    switch self {
    case .missingScriptPath:
      return "Unable to resolve script path from command line arguments."
    case .invalidRepositoryStructure:
      return "Unable to infer repository root from script location. Expected path structure: watch-ios/Scripts/<script>."
    // The next three print their path as resolved, which is always absolute, because
    // an error is read by a human hunting for a file. The repo-relative form is
    // reserved for `Source:` comments in generated files, where reproducibility across
    // checkout locations is what matters.
    case .missingWidgetAssetCatalogue(let path):
      return "Unable to locate the widget asset catalogue (\(path))."
    case .missingWatchAssetCatalogue(let path):
      return "Unable to locate the watch app asset catalogue directory (\(path)). The generator mirrors brand logos into an existing catalogue; it will not create one, because a catalogue it invented would lack the root Contents.json that Xcode requires."
    case .missingResolverSource(let path):
      return "Unable to read the authored BrandLogoCatalog.swift (\(path)), which is mirrored into the watch app target."
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

/// Reported when a source entry named like an imageset is not a directory. One
/// function rather than two literals, so the wording cannot drift between the
/// write-mode refusal and the `--check` report.
func malformedImagesetMessage(_ name: String) -> String {
  "\(name) in the widget asset catalogue is not a directory, so it cannot be mirrored. An imageset must be a folder of PNGs plus a Contents.json."
}

/// Folder-name shape of a bundled brand logo: `BrandLogo-<slug>.imageset`.
let brandLogoImagesetPrefix = "BrandLogo-"
let brandLogoImagesetSuffix = ".imageset"

struct GeneratorPaths {
  let catalogueURL: URL
  let assetsDirectory: URL
  let watchAssetsDirectory: URL
  let resolverSourceURL: URL
  let outputURL: URL
  let widgetOutputURL: URL
  let watchCatalogOutputURL: URL
  let watchResolverOutputURL: URL
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

/// Resolves one overridable path: the `envVar` value when set and non-empty
/// (absolute, or relative to the repo root), otherwise `defaultPath` under the repo
/// root. Every override exists so the Jest suite can redirect generation and
/// mirroring to throwaway locations and never mutate the tracked tree.
func overridablePath(_ envVar: String, default defaultPath: String, repoRoot: URL) -> URL {
  guard
    let override = ProcessInfo.processInfo.environment[envVar],
    override.isEmpty == false
  else {
    return repoRoot.appendingPathComponent(defaultPath)
  }

  return override.hasPrefix("/")
    ? URL(fileURLWithPath: override)
    : repoRoot.appendingPathComponent(override)
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

  // CATALOGUE_JSON_PATH — the brand catalogue to read.
  let catalogueURL = overridablePath("CATALOGUE_JSON_PATH", default: "catalogue/italy.json", repoRoot: repoRoot)

  // WIDGET_ASSETS_PATH — the artwork the luminance analysis reads and the mirror copies FROM.
  let assetsDirectory = overridablePath(
    "WIDGET_ASSETS_PATH", default: "targets/watch-widget/Assets.xcassets", repoRoot: repoRoot)

  // WATCH_ASSETS_PATH — the catalogue the brand logos are mirrored INTO.
  let watchAssetsDirectory = overridablePath(
    "WATCH_ASSETS_PATH", default: "targets/watch/Assets.xcassets", repoRoot: repoRoot)

  // The four generated sources.
  let outputURL = overridablePath(
    "CATALOGUE_OUTPUT_PATH", default: "targets/watch/Generated/Brands.swift", repoRoot: repoRoot)
  let widgetOutputURL = overridablePath(
    "WIDGET_CATALOG_OUTPUT_PATH",
    default: "targets/watch-widget/Generated/BrandLogoCatalog.generated.swift", repoRoot: repoRoot)
  let watchCatalogOutputURL = overridablePath(
    "WATCH_CATALOG_OUTPUT_PATH",
    default: "targets/watch/Generated/BrandLogoCatalog.generated.swift", repoRoot: repoRoot)
  let watchResolverOutputURL = overridablePath(
    "WATCH_RESOLVER_OUTPUT_PATH",
    default: "targets/watch/Generated/BrandLogoCatalog.swift", repoRoot: repoRoot)

  // RESOLVER_SOURCE_PATH — the authored resolver the watch app's mirror is generated from.
  let resolverSourceURL = overridablePath(
    "RESOLVER_SOURCE_PATH", default: "targets/watch-widget/BrandLogoCatalog.swift", repoRoot: repoRoot)

  let hashURL = outputURL.deletingLastPathComponent().appendingPathComponent(".catalogue-inputs.sha256")
  return GeneratorPaths(
    catalogueURL: catalogueURL,
    assetsDirectory: assetsDirectory,
    watchAssetsDirectory: watchAssetsDirectory,
    resolverSourceURL: resolverSourceURL,
    outputURL: outputURL,
    widgetOutputURL: widgetOutputURL,
    watchCatalogOutputURL: watchCatalogOutputURL,
    watchResolverOutputURL: watchResolverOutputURL,
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
  // No logo path is emitted: the watch app renders initials (CardListView) and the
  // widget resolves artwork through BrandLogo-<id>.imageset, so a per-brand asset
  // URL had no consumer. It also could not be derived reliably — app logos are a
  // mix of .svg and .png.
  let brands = catalogue.brands
    .map { brand in
      "    .init(id: \"\(swiftStringLiteral(brand.id))\", name: \(optionalLiteral(brand.name)), aliases: \(aliasesLiteral(brand.aliases)))"
    }
    .joined(separator: ",\n")

  return """
    // DO NOT EDIT — This file is auto-generated.
    // Generated by watch-ios/Scripts/generate-catalogue.swift
    // Source: \(sourcePath)

    import Foundation

    struct WatchBrand: Sendable {
      let id: String
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

/// What a rendered logo PNG's pixels say about it.
struct LogoPixelStats {
  /// Mean luminance (0–255, Rec. 709) over the sufficiently-opaque pixels.
  let meanLuminance: Double
  /// Standard deviation of that luminance.
  let luminanceStdDev: Double
  /// Fraction of the whole image that is sufficiently opaque.
  let opaqueFraction: Double

  /// A uniform rectangle: every pixel opaque and every pixel the same colour, so
  /// there is no letterform or mark in it at all. A logo cannot legitimately look
  /// like this — a solid single-colour wordmark has zero variance too, but only over
  /// the *part* of the image it covers, leaving the rest transparent.
  var isBlank: Bool {
    opaqueFraction > 0.999 && luminanceStdDev < 0.01
  }
}

/// Pixel statistics over the sufficiently-opaque pixels of a rendered logo PNG, or
/// `nil` when the image cannot be decoded or has no such pixels. The mean decides
/// which logos are near-white and need a dark chip; the spread and opacity together
/// detect artwork that rasterized to nothing.
func logoPixelStats(at url: URL) -> LogoPixelStats? {
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

  var luminances: [Double] = []
  luminances.reserveCapacity(width * height)
  for index in stride(from: 0, to: pixels.count, by: 4) {
    let alpha = Int(pixels[index + 3])
    guard alpha > opaqueAlphaThreshold else { continue }

    // Un-premultiply so the colors reflect the artwork, not the blend against
    // the (transparent → black) backdrop CoreGraphics composites onto.
    let alphaFraction = Double(alpha) / 255.0
    let red = Double(pixels[index]) / alphaFraction
    let green = Double(pixels[index + 1]) / alphaFraction
    let blue = Double(pixels[index + 2]) / alphaFraction

    luminances.append(0.2126 * red + 0.7152 * green + 0.0722 * blue)
  }

  guard luminances.isEmpty == false else {
    return nil
  }

  let mean = luminances.reduce(0, +) / Double(luminances.count)
  let variance = luminances.reduce(0) { $0 + ($1 - mean) * ($1 - mean) } / Double(luminances.count)

  return LogoPixelStats(
    meanLuminance: mean,
    luminanceStdDev: variance.squareRoot(),
    opaqueFraction: Double(luminances.count) / Double(width * height)
  )
}

struct BrandLogoAssetAnalysis {
  /// Slugs of every `BrandLogo-<slug>.imageset` that ships a usable PNG, sorted.
  let knownBrandIds: [String]
  /// Subset of `knownBrandIds` whose artwork is predominantly light, sorted.
  let lightLogoBrandIds: [String]
  /// Brands whose PNG rasterized to a uniform rectangle — structurally a valid
  /// imageset, but with no mark in it. Warned about rather than refused: one such
  /// asset (`stroili`, whose SVG references an undefined `cls-1` class) is already
  /// committed, and replacing artwork was out of scope for the story that added this
  /// detection. Promote to a hard failure once that asset is fixed.
  let blankArtwork: [String]
  /// The PNG files inspected, included in the regeneration input hash so an
  /// asset change (or addition/removal) triggers regeneration and is caught by
  /// the --check gate.
  let inputURLs: [URL]
}

/// An imageset that cannot be trusted to describe its own artwork, and why.
struct ImagesetInconsistency {
  let name: String
  let reason: String

  var message: String {
    "\(name) \(reason)"
  }
}

/// One read per source imageset for the malformed / unreadable / has-artwork
/// classification, shared by the luminance analysis and the mirror so the two can
/// never disagree about the same directory within a run. Re-reading was a real hazard:
/// an imageset that flipped from readable to unreadable between two scans could be
/// classified "artwork gone" by one and "fine" by the other, and the mirror would then
/// delete a valid, tracked copy. (Later steps read again to compare and copy bytes;
/// those are derived from this snapshot and fail loudly, so they cannot resurrect it.)
struct BrandLogoSourceScan {
  /// `BrandLogo-*.imageset` entries in the source catalogue, sorted.
  let names: [String]
  /// Entries that are not directories at all — a bad merge or a stray `git mv`.
  let malformed: [String]
  /// Entries whose directory could not be read (permissions, a half-synced mount).
  let unreadable: [String]
  /// Entries the generator cannot trust to describe their own artwork, with the reason
  /// for each. Two shapes, both of which ship broken while every gate stays green:
  ///
  /// - PNGs that disagree with the filenames `Contents.json` declares (a stale file
  ///   left by a manual rename, or a declared file that is gone). `actool` only warns
  ///   about a loose extra file, and the luminance analysis picks a rendition by
  ///   filename, so an unreferenced PNG sorting first would be read instead of the real
  ///   artwork and could misclassify the logo silently.
  /// - PNGs but no parseable `Contents.json` at all. `actool` emits an
  ///   "unassigned child" warning and OMITS THE IMAGE FROM `Assets.car` — verified with
  ///   `assetutil` — so `knownBrandIds` would claim a brand whose asset does not exist
  ///   in the build, and the row would render an empty circle instead of the initials
  ///   fallback AC2 guarantees.
  let inconsistent: [ImagesetInconsistency]
  /// PNG renditions per readable entry, sorted.
  let pngsByName: [String: [String]]

  /// Source entries the generator refuses to act on at all.
  var untrustworthy: Set<String> {
    Set(malformed).union(unreadable).union(inconsistent.map(\.name))
  }

  /// Entries shipping at least one PNG **and** trustworthy (see `untrustworthy`).
  /// Shipping a PNG is necessary for `Image("BrandLogo-<slug>")` to resolve but not
  /// sufficient — an imageset with no valid `Contents.json` ships PNGs that `actool`
  /// then drops — so both conditions decide what is "known" and worth mirroring.
  var withArtwork: [String] {
    let untrustworthy = self.untrustworthy
    return names.filter {
      untrustworthy.contains($0) == false && (pngsByName[$0] ?? []).isEmpty == false
    }
  }
}

func scanBrandLogoSource(assetsDirectory: URL) throws -> BrandLogoSourceScan {
  guard isDirectory(assetsDirectory) else {
    // Not collected like the other preconditions: without this catalogue the expected
    // contents of two of the four generated artifacts are unknowable, so reporting
    // them as "differing" would be a wrong diagnosis rather than a fuller one.
    throw GeneratorError.missingWidgetAssetCatalogue(assetsDirectory.path)
  }

  let names = try brandLogoImagesetNames(in: assetsDirectory)
  var malformed: [String] = []
  var unreadable: [String] = []
  var inconsistent: [ImagesetInconsistency] = []
  var pngsByName: [String: [String]] = [:]

  for name in names {
    let imagesetURL = assetsDirectory.appendingPathComponent(name)
    guard isDirectory(imagesetURL) else {
      malformed.append(name)
      continue
    }
    guard let pngs = imagesetPNGs(in: imagesetURL) else {
      unreadable.append(name)
      continue
    }
    pngsByName[name] = pngs

    guard let declared = declaredImagesetFilenames(in: imagesetURL) else {
      // Only a problem when there is artwork to describe: an empty folder is caught by
      // `withArtwork` instead, and a scaffold with neither is simply not "known".
      if pngs.isEmpty == false {
        inconsistent.append(
          ImagesetInconsistency(
            name: name,
            reason:
              "ships PNGs but has no readable, decodable Contents.json, so actool omits the image from Assets.car and the row would draw an empty circle"
          ))
      }
      continue
    }
    // Both directions are a problem, for different reasons, so they say different
    // things. Verified with `actool`: an undeclared extra is only a warning and the
    // declared renditions still compile, while a declared-but-absent file is a warning
    // too and simply never ships — so neither fails the build on its own.
    let undeclared = Set(pngs).subtracting(declared).sorted()
    let absent = declared.subtracting(pngs).sorted()
    if undeclared.isEmpty == false || absent.isEmpty == false {
      var clauses: [String] = []
      if undeclared.isEmpty == false {
        let names = undeclared.joined(separator: ", ")
        let pronoun = undeclared.count == 1 ? "it" : "them"
        clauses.append(
          "ships \(names) without declaring \(pronoun) in Contents.json, so which file is the real artwork is ambiguous"
        )
      }
      if absent.isEmpty == false {
        let names = absent.joined(separator: ", ")
        let tail =
          absent.count == 1
          ? "it, so that rendition silently never reaches the build"
          : "them, so those renditions silently never reach the build"
        clauses.append("declares \(names) in Contents.json but does not ship \(tail)")
      }
      inconsistent.append(
        ImagesetInconsistency(name: name, reason: clauses.joined(separator: "; and it ")))
    }
  }

  return BrandLogoSourceScan(
    names: names, malformed: malformed, unreadable: unreadable, inconsistent: inconsistent,
    pngsByName: pngsByName)
}

/// Classifies each brand logo from an existing scan. `knownBrandIds` is the scan's
/// `withArtwork` set; `lightLogoBrandIds` comes from the rendered luminance of each.
func analyzeBrandLogoAssets(_ scan: BrandLogoSourceScan, assetsDirectory: URL)
  -> BrandLogoAssetAnalysis
{
  var knownBrandIds: [String] = []
  var lightLogoBrandIds: [String] = []
  var blankArtwork: [String] = []
  var inputURLs: [URL] = []

  for entry in scan.withArtwork {
    let slug = brandSlug(fromImagesetName: entry)
    let imagesetURL = assetsDirectory.appendingPathComponent(entry)

    let pngs = scan.pngsByName[entry] ?? []

    guard let chosenPng = preferredRendition(from: pngs)
    else {
      // Unreachable: `withArtwork` already guarantees at least one PNG. Kept as a
      // guard rather than a force-unwrap so a future change to the scan cannot trap.
      continue
    }

    let pngURL = imagesetURL.appendingPathComponent(chosenPng)
    knownBrandIds.append(slug)
    inputURLs.append(pngURL)

    if let stats = logoPixelStats(at: pngURL) {
      if stats.meanLuminance > lightLuminanceThreshold {
        lightLogoBrandIds.append(slug)
      }
      if stats.isBlank {
        blankArtwork.append(slug)
      }
    }
  }

  return BrandLogoAssetAnalysis(
    knownBrandIds: knownBrandIds.sorted(),
    lightLogoBrandIds: lightLogoBrandIds.sorted(),
    blankArtwork: blankArtwork.sorted(),
    inputURLs: inputURLs.sorted { $0.path < $1.path }
  )
}

/// Emits `BrandLogoCatalogData` for one watch target. Both the watch app and the
/// watch-widget extension compile their own copy: they are separate bundles, and
/// `Image("BrandLogo-<slug>")` resolves against the bundle it is compiled into,
/// so each target needs the data alongside its own asset catalogue. The two are
/// generated from the same analysis and the app's imagesets are a byte-exact
/// mirror of the widget's, so the sets are identical by construction —
/// `assetSourcePath` only records where each target's copy comes from.
func generateBrandLogoCatalogSource(
  from analysis: BrandLogoAssetAnalysis,
  assetSourcePath: String
) -> String {
  return """
    // DO NOT EDIT — This file is auto-generated.
    // Generated by watch-ios/Scripts/generate-catalogue.swift
    // Source: catalogue/italy.json + \(assetSourcePath)

    import Foundation

    /// Brand-logo data for the watch surfaces that can render real artwork, kept in
    /// lockstep with the catalogue and the bundled `BrandLogo-*` imagesets by the
    /// generator. Today only the app's card list draws them; the complication ships the
    /// same data and assets but its per-card path is dormant (see
    /// `WatchComplicationWidget.swift`).
    enum BrandLogoCatalogData {
      /// Brand slugs that ship a `BrandLogo-<slug>` imageset in this target, so the
      /// view can render the real logo instead of falling back to initials.
      static let knownBrandIds: Set<String> = \(brandIdSetLiteral(analysis.knownBrandIds))

      /// Brand logos whose rendered artwork is predominantly white / very light
      /// (mean Rec. 709 luminance > \(Int(lightLuminanceThreshold)) over opaque pixels). On the default
      /// white chip they would disappear, so those logos get a dark backing instead.
      static let lightLogoBrandIds: Set<String> = \(brandIdSetLiteral(analysis.lightLogoBrandIds))
    }
    """
}

// MARK: - BrandLogoCatalog.swift mirror (watch app target)

/// Wraps the authored `targets/watch-widget/BrandLogoCatalog.swift` in a
/// DO-NOT-EDIT banner so the watch app target can compile the same resolver.
///
/// The two watch targets have no shared-source mechanism available:
/// `@bacons/apple-targets`' `_shared` folders link files into the **main iOS app**
/// target (see its README), which is wrong for watch-only code, and the plugin
/// writes those files into `membershipExceptions` — which Xcode treats as
/// *exclusions*. Mirroring through the generator keeps exactly one authored copy
/// of the logic and makes drift impossible, because `--check` compares the two.
func generateResolverMirrorSource(from authoredSource: String, sourcePath: String) -> String {
  return """
    // DO NOT EDIT — This file is auto-generated.
    // Generated by watch-ios/Scripts/generate-catalogue.swift
    // Source: \(sourcePath)
    //
    // The watch app and the watch-widget extension are separate Xcode targets, so
    // the resolver has to be compiled into each of them. The widget's copy is the
    // single authored source; this one is generated from it verbatim.

    \(authoredSource)
    """
}

// MARK: - Brand logo imageset mirror (watch app target)

/// What the watch app's asset catalogue needs in order to match the widget's
/// bundled brand logos. Empty on both counts means the mirror is in sync.
struct BrandLogoMirrorPlan {
  /// Imagesets missing from the watch app catalogue, or present but differing.
  let outOfDate: [String]
  /// `BrandLogo-*` imagesets in the watch app catalogue with no widget counterpart
  /// that ships usable artwork — the source folder is gone, or it is still there but
  /// its PNGs were removed. Cleared so the mirror does not accumulate junk. A source
  /// the generator could not read is deliberately NOT in here: deleting a valid
  /// mirrored copy over a transient permission problem would be the worse outcome.
  let orphaned: [String]
  /// Source entries named like an imageset that are not directories — a bad merge
  /// or a stray `git mv`. Reported rather than thrown so `--check` still lists every
  /// other drift in the same run; write mode refuses to copy them.
  let malformed: [String]
  /// Staging directories left in the destination by an interrupted earlier run.
  /// `--check` must not write, so it reports them instead of sweeping them; write
  /// mode clears them before it starts.
  let staging: [String]
  /// Source imagesets whose directory could not be read (permissions, a half-synced
  /// mount). Reported, never acted on — see `orphaned`.
  let unreadable: [String]
  /// Source imagesets that cannot be trusted to describe their own artwork. Reported
  /// and never acted on, for the same reason as `unreadable`.
  let inconsistent: [ImagesetInconsistency]
  /// Set when the destination catalogue itself is absent. Collected rather than
  /// thrown for the same reason as `malformed`: by the time the mirror is planned,
  /// all four generated sources are already comparable, and aborting here would hide
  /// their drift until a second run.
  let missingDestination: String?

  var isInSync: Bool {
    outOfDate.isEmpty && orphaned.isEmpty && malformed.isEmpty && staging.isEmpty
      && unreadable.isEmpty && inconsistent.isEmpty && missingDestination == nil
  }

  /// Human-readable difference, naming a few imagesets so a single unexpected
  /// change is actionable without printing every imageset on a first run.
  var summary: String {
    func describe(_ label: String, _ names: [String]) -> String? {
      guard names.isEmpty == false else { return nil }
      let sample = names.prefix(3).joined(separator: ", ")
      let remainder = names.count - min(names.count, 3)
      let suffix = remainder > 0 ? ", +\(remainder) more" : ""
      return "\(names.count) \(label): \(sample)\(suffix)"
    }

    // `malformed` is deliberately absent: `runCheck` names each malformed entry on
    // its own line, and repeating them here read as two separate problems.
    return [describe("missing or stale", outOfDate), describe("orphaned", orphaned)]
      .compactMap { $0 }
      .joined(separator: "; ")
  }
}

func brandLogoImagesetNames(in directory: URL) throws -> [String] {
  let entries = try FileManager.default.contentsOfDirectory(atPath: directory.path)
  return entries
    .filter { $0.hasPrefix(brandLogoImagesetPrefix) && $0.hasSuffix(brandLogoImagesetSuffix) }
    .sorted()
}

/// The brand slug an imageset folder name carries, e.g. `BrandLogo-bennet.imageset`
/// → `bennet`.
func brandSlug(fromImagesetName name: String) -> String {
  String(name.dropFirst(brandLogoImagesetPrefix.count).dropLast(brandLogoImagesetSuffix.count))
}

/// Hidden prefix for a half-built mirror entry. Dot-prefixed so `actool` and the
/// `BrandLogo-*.imageset` scans both skip it if a hard kill ever leaves one behind.
let mirrorStagingPrefix = ".mirror-staging-"

/// Removes staging directories left by an interrupted earlier run, returning their
/// names so the caller can say what it cleaned up.
func clearMirrorStaging(in directory: URL) throws -> [String] {
  let fileManager = FileManager.default
  let debris = try fileManager.contentsOfDirectory(atPath: directory.path)
    .filter { $0.hasPrefix(mirrorStagingPrefix) }
    .sorted()

  for entry in debris {
    try fileManager.removeItem(at: directory.appendingPathComponent(entry))
  }
  return debris
}

/// True for a directory entry that is real imageset content rather than filesystem
/// noise. Every consumer applies this, because a dotfile breaks each of them
/// differently: a Finder `.DS_Store` copied into the mirror makes `--check` fail with
/// no source change to explain it (its bytes change between Finder sessions), and an
/// AppleDouble sidecar (`._brand-logo-x@3x.png`, produced when PNGs travel via exFAT
/// or some SMB shares) sorts BEFORE the real file and ends with `.png`, so it would be
/// chosen as the rendition to analyse — and being undecodable, would silently cost a
/// light logo its dark chip with nothing to catch it, since `--check` would reproduce
/// the same wrong answer from the same polluted source.
func isImagesetContent(_ entry: String) -> Bool {
  entry.hasPrefix(".") == false
}

/// The PNG renditions an imageset ships, sorted, or `nil` when the directory could not
/// be read at all. `Image("BrandLogo-<slug>")` resolves only when at least one PNG
/// exists, so this is what makes a brand "known" — and what makes an imageset worth
/// mirroring. The `nil` case is kept distinct from "read fine, no PNGs": conflating
/// them would let an unreadable source look like artwork that had been deleted.
func imagesetPNGs(in imagesetURL: URL) -> [String]? {
  guard let entries = try? FileManager.default.contentsOfDirectory(atPath: imagesetURL.path) else {
    return nil
  }
  return entries.filter { isImagesetContent($0) && $0.lowercased().hasSuffix(".png") }.sorted()
}

/// The highest-resolution rendition available, for the most accurate luminance
/// analysis. Scale markers are matched case-insensitively, like the `.png` extension
/// in `imagesetPNGs` — one standard for "the same convention, differently cased".
func preferredRendition(from pngs: [String]) -> String? {
  func matching(_ marker: String) -> String? {
    pngs.first { $0.lowercased().contains(marker) }
  }
  return matching("@3x") ?? matching("@2x") ?? matching("@1x") ?? pngs.first
}

/// The PNG filenames an imageset's `Contents.json` declares, or `nil` when there is
/// no readable, decodable `Contents.json` to compare against. Only filenames are read
/// — everything else in the file is Xcode's business.
func declaredImagesetFilenames(in imagesetURL: URL) -> Set<String>? {
  struct ImagesetContents: Decodable {
    struct Image: Decodable { let filename: String? }
    let images: [Image]?
  }

  guard
    let data = try? Data(contentsOf: imagesetURL.appendingPathComponent("Contents.json")),
    let contents = try? JSONDecoder().decode(ImagesetContents.self, from: data)
  else {
    return nil
  }

  return Set((contents.images ?? []).compactMap { $0.filename })
}

/// The members of an imageset the generator mirrors: the artwork plus its
/// `Contents.json`.
func mirroredImagesetMembers(in imagesetURL: URL) throws -> [String] {
  try FileManager.default.contentsOfDirectory(atPath: imagesetURL.path)
    .filter(isImagesetContent)
    .sorted()
}

func isDirectory(_ url: URL) -> Bool {
  var isDirectory: ObjCBool = false
  let exists = FileManager.default.fileExists(atPath: url.path, isDirectory: &isDirectory)
  return exists && isDirectory.boolValue
}

/// Byte-compares the mirrored members of two imagesets. False when the
/// destination is missing, is not a directory, or holds a different member list —
/// so a re-rasterized PNG counts as out of date, not just a missing folder.
func imagesetsMatch(source: URL, destination: URL) -> Bool {
  guard isDirectory(destination) else { return false }

  guard
    let sourceMembers = try? mirroredImagesetMembers(in: source),
    let destinationMembers = try? mirroredImagesetMembers(in: destination),
    sourceMembers == destinationMembers
  else {
    return false
  }

  return sourceMembers.allSatisfy { member in
    FileManager.default.contentsEqual(
      atPath: source.appendingPathComponent(member).path,
      andPath: destination.appendingPathComponent(member).path
    )
  }
}

/// Compares the widget's `BrandLogo-*` imagesets against the watch app's copies.
/// Source-side facts come from `scan` — one read, shared with the luminance analysis —
/// and survive a missing destination, which must not hide them until a second run.
/// `malformed`/`unreadable` are carried rather than thrown so `--check` still lists
/// every other drift in the same run.
func planBrandLogoMirror(_ scan: BrandLogoSourceScan, source: URL, destination: URL) throws
  -> BrandLogoMirrorPlan
{
  // A PNG-less imageset (a brand scaffolded ahead of its artwork) is not "known" to
  // `analyzeBrandLogoAssets`, so mirroring it would ship a folder no code can resolve.
  let mirrorable = Set(scan.withArtwork)

  guard isDirectory(destination) else {
    return BrandLogoMirrorPlan(
      outOfDate: [], orphaned: [], malformed: scan.malformed, staging: [],
      unreadable: scan.unreadable, inconsistent: scan.inconsistent,
      missingDestination: destination.path)
  }

  let destinationEntries = try FileManager.default.contentsOfDirectory(atPath: destination.path)
  let destinationNames = destinationEntries
    .filter { $0.hasPrefix(brandLogoImagesetPrefix) && $0.hasSuffix(brandLogoImagesetSuffix) }
    .sorted()

  let outOfDate = scan.names.filter { name in
    guard mirrorable.contains(name) else { return false }
    return
      imagesetsMatch(
        source: source.appendingPathComponent(name),
        destination: destination.appendingPathComponent(name)
      ) == false
  }

  let uncertain = scan.untrustworthy
  let orphaned = destinationNames.filter {
    mirrorable.contains($0) == false && uncertain.contains($0) == false
  }
  let staging = destinationEntries.filter { $0.hasPrefix(mirrorStagingPrefix) }.sorted()

  return BrandLogoMirrorPlan(
    outOfDate: outOfDate, orphaned: orphaned, malformed: scan.malformed, staging: staging,
    unreadable: scan.unreadable, inconsistent: scan.inconsistent, missingDestination: nil)
}

/// Brings the watch app's catalogue in line with `plan`. Only `BrandLogo-*`
/// imagesets are touched — `AppIcon.appiconset` (rewritten by `expo prebuild`),
/// `AccentColor.colorset` and the catalogue's root `Contents.json` are left alone.
///
/// Each imageset is staged into a hidden sibling directory member by member and
/// only then moved into place, for two reasons: the member list is filtered (so the
/// mirror holds exactly what `mirroredImagesetMembers` admits, never a `.DS_Store`),
/// and an interruption mid-copy cannot leave a half-written imageset — one missing a
/// PNG its `Contents.json` references — at the real path. Staging inside the
/// destination keeps the final step a same-volume rename; the name is hidden, and
/// `runGenerator` sweeps it before every write-mode run while `--check` reports it as
/// drift, so a hard kill cannot leave anything Xcode would see for long.
///
/// A malformed source can never reach the copy loop on its own: `planBrandLogoMirror`
/// builds `outOfDate` from the mirrorable names only. The caller still refuses to
/// proceed when `plan.malformed` is non-empty — see `runGenerator` for why that
/// matters, which is about not rewriting the generated sources, not about this loop.
func applyBrandLogoMirror(_ plan: BrandLogoMirrorPlan, source: URL, destination: URL) throws {
  let fileManager = FileManager.default

  for name in plan.orphaned {
    try fileManager.removeItem(at: destination.appendingPathComponent(name))
  }

  for name in plan.outOfDate {
    let sourceURL = source.appendingPathComponent(name)
    let destinationURL = destination.appendingPathComponent(name)
    let stagingURL = destination.appendingPathComponent(mirrorStagingPrefix + name)
    try fileManager.createDirectory(at: stagingURL, withIntermediateDirectories: true)

    do {
      for member in try mirroredImagesetMembers(in: sourceURL) {
        try fileManager.copyItem(
          at: sourceURL.appendingPathComponent(member),
          to: stagingURL.appendingPathComponent(member)
        )
      }

      if fileManager.fileExists(atPath: destinationURL.path) {
        // replaceItemAt swaps atomically and, on failure, leaves the original in
        // place. Doing this as removeItem + moveItem would open a window where a
        // failed move leaves NO imageset at all — and the catch below would then
        // delete the staged replacement, losing both copies.
        _ = try fileManager.replaceItemAt(destinationURL, withItemAt: stagingURL)
      } else {
        try fileManager.moveItem(at: stagingURL, to: destinationURL)
      }
    } catch {
      // Never leave staging debris behind for the next run to trip over. A
      // successful swap has already consumed the staging directory, so this only
      // ever removes a partial copy.
      try? fileManager.removeItem(at: stagingURL)
      throw error
    }
  }
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

  for id in analysis.blankArtwork {
    fputs(
      "warning: BrandLogo-\(id).imageset rasterized to a uniform rectangle — the row will show a blank disc, not a logo. Check the source artwork in assets/images/brands/\(id).svg.\n",
      stderr
    )
  }

  for id in catalogueIds where assetIdSet.contains(id) == false {
    fputs(
      "warning: Catalogue brand \"\(id)\" has no BrandLogo-\(id).imageset; the watch card list will fall back to initials.\n",
      stderr
    )
  }
}

// MARK: - Driver

/// One committed artifact the `--check` gate compares against freshly generated
/// content. Unlike `GeneratorError`, the messages here name the artifact rather than
/// its resolved path: these four paths are only ever redirected by the Jest suite, so
/// a real run's path is always the committed one the message already names.
/// Missing and differing are both collected rather than raised, so a single run
/// reports every problem: an early missing file must not hide a mismatch further
/// down the list.
struct GeneratedArtifactCheck {
  let url: URL
  let expected: String
  /// Reported when the file is absent.
  let missingMessage: String
  /// Reported when the file exists but differs.
  let mismatchMessage: String
}

/// `writeBlocked` marks a failure that makes write mode refuse to write anything at
/// all, so the closing advice points at the cause instead of at a regenerate that
/// cannot succeed.
func runCheck(
  artifacts: [GeneratedArtifactCheck],
  mirrorPlan: BrandLogoMirrorPlan,
  additionalFailures: [String] = [],
  writeBlocked: Bool
) {
  let fileManager = FileManager.default
  var failures: [String] = additionalFailures

  for artifact in artifacts {
    guard fileManager.fileExists(atPath: artifact.url.path) else {
      failures.append(artifact.missingMessage)
      continue
    }
    // A file that exists but cannot be read (permissions, a truncated write, a bad
    // merge leaving invalid UTF-8) is collected like any other failure. Letting it
    // throw would discard the failures already found and skip the imageset
    // comparison below — the very thing this loop exists to avoid. The underlying
    // error is reported verbatim rather than guessed at: "unreadable" and "not UTF-8"
    // are different problems and the message should not conflate them.
    let existing: String
    do {
      existing = try String(contentsOf: artifact.url, encoding: .utf8)
    } catch {
      failures.append("\(artifact.url.lastPathComponent) could not be read: \(error.localizedDescription)")
      continue
    }
    if existing != artifact.expected {
      failures.append(artifact.mismatchMessage)
    }
  }

  for name in mirrorPlan.malformed {
    failures.append(malformedImagesetMessage(name))
  }

  if let missingDestination = mirrorPlan.missingDestination {
    failures.append(
      GeneratorError.missingWatchAssetCatalogue(missingDestination).errorDescription
        ?? "Watch app asset catalogue is missing")
  }

  for name in mirrorPlan.unreadable {
    failures.append(
      "\(name) in the widget asset catalogue could not be read, so its mirror cannot be verified")
  }

  for inconsistency in mirrorPlan.inconsistent {
    failures.append(inconsistency.message)
  }

  for name in mirrorPlan.staging {
    failures.append(
      "\(name) is leftover staging from an interrupted mirror run; regenerating removes it")
  }

  if mirrorPlan.outOfDate.isEmpty == false || mirrorPlan.orphaned.isEmpty == false {
    failures.append("Watch app brand-logo imagesets differ from the widget's (\(mirrorPlan.summary))")
  }

  guard failures.isEmpty else {
    for failure in failures {
      fputs("error: \(failure)\n", stderr)
    }
    // Regenerating fixes drift, but write mode deliberately writes NOTHING while a
    // source imageset is malformed or unreadable — so pointing there first would send
    // the reader round a loop that cannot succeed.
    let cannotRegenerate =
      writeBlocked
      || mirrorPlan.malformed.isEmpty == false
      || mirrorPlan.unreadable.isEmpty == false
      || mirrorPlan.inconsistent.isEmpty == false
      || mirrorPlan.missingDestination != nil
    if cannotRegenerate {
      fputs("error: Fix the problems above first — until then `yarn watch:catalogue:generate` writes nothing.\n", stderr)
    } else {
      fputs("error: Run `yarn watch:catalogue:generate` and commit the result.\n", stderr)
    }
    exit(1)
  }

  print("Generated catalogue is up to date.")
}

func runGenerator(paths: GeneratorPaths, checkMode: Bool) throws {
  let catalogueData = try Data(contentsOf: paths.catalogueURL)
  let catalogue = try JSONDecoder().decode(CatalogueData.self, from: catalogueData)

  let scan = try scanBrandLogoSource(assetsDirectory: paths.assetsDirectory)
  let analysis = analyzeBrandLogoAssets(scan, assetsDirectory: paths.assetsDirectory)
  warnOnCatalogueAssetDrift(catalogue: catalogue, analysis: analysis)

  let sourcePath = repoRelativePath(for: paths.catalogueURL, repoRoot: paths.repoRoot)
  let brandsSource = generateSource(from: catalogue, sourcePath: sourcePath)
  let widgetSource = generateBrandLogoCatalogSource(
    from: analysis,
    assetSourcePath: "\(repoRelativePath(for: paths.assetsDirectory, repoRoot: paths.repoRoot))/\(brandLogoImagesetPrefix)*\(brandLogoImagesetSuffix)"
  )
  let watchCatalogSource = generateBrandLogoCatalogSource(
    from: analysis,
    assetSourcePath: "\(repoRelativePath(for: paths.watchAssetsDirectory, repoRoot: paths.repoRoot))/\(brandLogoImagesetPrefix)*\(brandLogoImagesetSuffix) (mirrored from \(repoRelativePath(for: paths.assetsDirectory, repoRoot: paths.repoRoot)))"
  )

  let resolverSourcePath = paths.resolverSourceURL.path

  // Read, not required: `--check` reports an unreadable authored resolver alongside
  // every other drift rather than aborting on it, since the other three artifacts are
  // already computed and comparable by this point. Write mode still cannot proceed.
  let watchResolverSource = (try? String(contentsOf: paths.resolverSourceURL, encoding: .utf8))
    .map { authored in
      generateResolverMirrorSource(
        from: authored,
        sourcePath: repoRelativePath(for: paths.resolverSourceURL, repoRoot: paths.repoRoot)
      )
    }

  let mirrorPlan = try planBrandLogoMirror(
    scan,
    source: paths.assetsDirectory,
    destination: paths.watchAssetsDirectory
  )

  if checkMode {
    var artifacts: [GeneratedArtifactCheck] = [
      GeneratedArtifactCheck(
        url: paths.outputURL,
        expected: brandsSource,
        missingMessage: "Committed Brands.swift is missing",
        mismatchMessage: "Generated catalogue differs from committed Brands.swift"
      ),
      GeneratedArtifactCheck(
        url: paths.widgetOutputURL,
        expected: widgetSource,
        missingMessage: "Committed targets/watch-widget/Generated/BrandLogoCatalog.generated.swift is missing",
        mismatchMessage:
          "Generated widget catalog differs from committed BrandLogoCatalog.generated.swift"
      ),
      GeneratedArtifactCheck(
        url: paths.watchCatalogOutputURL,
        expected: watchCatalogSource,
        missingMessage: "Committed targets/watch/Generated/BrandLogoCatalog.generated.swift is missing",
        mismatchMessage:
          "Generated watch app catalog differs from committed targets/watch/Generated/BrandLogoCatalog.generated.swift"
      ),
    ]

    // Without the authored resolver there is nothing to compare the mirror against,
    // so that one comparison is replaced by a failure of its own and the rest still run.
    var additionalFailures: [String] = []
    if let watchResolverSource {
      artifacts.append(
        GeneratedArtifactCheck(
          url: paths.watchResolverOutputURL,
          expected: watchResolverSource,
          missingMessage: "Committed targets/watch/Generated/BrandLogoCatalog.swift is missing",
          mismatchMessage:
            "Generated watch app BrandLogoCatalog.swift differs from the authored targets/watch-widget/BrandLogoCatalog.swift"
        ))
    } else {
      additionalFailures.append(
        GeneratorError.missingResolverSource(resolverSourcePath).errorDescription
          ?? "Authored resolver is unreadable")
    }

    runCheck(
      artifacts: artifacts,
      mirrorPlan: mirrorPlan,
      additionalFailures: additionalFailures,
      // A missing authored resolver stops write mode dead, so the advice must not be
      // "regenerate".
      writeBlocked: watchResolverSource == nil
    )
    return
  }

  guard let watchResolverSource else {
    throw GeneratorError.missingResolverSource(resolverSourcePath)
  }

  if let missingDestination = mirrorPlan.missingDestination {
    throw GeneratorError.missingWatchAssetCatalogue(missingDestination)
  }

  // Sweep first, so debris from an interrupted run is cleared even when this run
  // then refuses to proceed for an unrelated reason.
  let sweptStaging = try clearMirrorStaging(in: paths.watchAssetsDirectory)

  // Write mode must reject a source it cannot read BEFORE touching any output:
  // rewriting the four generated sources and only then failing would leave a tree
  // that looks committable next to an error the developer has already scrolled past.
  // Every malformed entry is named, matching what `--check` reports, so one run is
  // enough to fix them all.
  if scan.untrustworthy.isEmpty == false {
    for name in mirrorPlan.malformed {
      fputs("error: \(malformedImagesetMessage(name))\n", stderr)
    }
    for name in mirrorPlan.unreadable {
      fputs("error: \(name) in the widget asset catalogue could not be read.\n", stderr)
    }
    for inconsistency in mirrorPlan.inconsistent {
      fputs("error: \(inconsistency.message)\n", stderr)
    }
    fputs("error: Nothing was written. Fix the widget asset catalogue and re-run.\n", stderr)
    exit(1)
  }

  let inputHash = try computeSHA256(
    for: [paths.catalogueURL, paths.scriptURL, paths.resolverSourceURL] + analysis.inputURLs
  )
  let storedHash = readStoredHash(at: paths.hashURL)
  let fileManager = FileManager.default
  // The hash covers the inputs only, so every output is existence-checked too —
  // otherwise deleting one generated file would be masked by an unchanged hash.
  // The imageset mirror is content-checked because it has no digest of its own.
  let upToDate = storedHash == inputHash
    && fileManager.fileExists(atPath: paths.outputURL.path)
    && fileManager.fileExists(atPath: paths.widgetOutputURL.path)
    && fileManager.fileExists(atPath: paths.watchCatalogOutputURL.path)
    && fileManager.fileExists(atPath: paths.watchResolverOutputURL.path)
    && mirrorPlan.isInSync

  if upToDate {
    print("Inputs unchanged; skipping catalogue generation.")
    return
  }

  try writeSource(brandsSource, to: paths.outputURL)
  try writeSource(widgetSource, to: paths.widgetOutputURL)
  try writeSource(watchCatalogSource, to: paths.watchCatalogOutputURL)
  try writeSource(watchResolverSource, to: paths.watchResolverOutputURL)
  try applyBrandLogoMirror(mirrorPlan, source: paths.assetsDirectory, destination: paths.watchAssetsDirectory)
  try writeStoredHash(inputHash, to: paths.hashURL)
  print("Generated \(paths.outputURL.path)")
  print("Generated \(paths.widgetOutputURL.path)")
  print("Generated \(paths.watchCatalogOutputURL.path)")
  print("Generated \(paths.watchResolverOutputURL.path)")
  if sweptStaging.isEmpty == false {
    print("Cleared \(sweptStaging.count) leftover staging director\(sweptStaging.count == 1 ? "y" : "ies").")
  }
  // Gated on the two lists `summary` actually describes, not on `isInSync`: staging
  // debris also clears `isInSync`, and treating that as a mirror change used to print
  // "Mirrored … ()" for a run whose copy loop did nothing.
  if mirrorPlan.outOfDate.isEmpty && mirrorPlan.orphaned.isEmpty {
    print("Watch app brand-logo imagesets already in sync.")
  } else {
    print("Mirrored brand-logo imagesets into \(paths.watchAssetsDirectory.path) (\(mirrorPlan.summary))")
  }
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
