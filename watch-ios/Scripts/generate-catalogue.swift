import CryptoKit
import Foundation

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

  var errorDescription: String? {
    switch self {
    case .missingScriptPath:
      return "Unable to resolve script path from command line arguments."
    case .invalidRepositoryStructure:
      return "Unable to infer repository root from script location. Expected path structure: watch-ios/Scripts/<script>."
    case .missingCommittedOutput:
      return "Committed Brands.swift is missing. Run the generator without --check to create it."
    }
  }
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

func resolvePaths() throws -> (catalogueURL: URL, outputURL: URL, hashURL: URL, scriptURL: URL, repoRoot: URL) {
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

  // CATALOGUE_OUTPUT_PATH lets callers (notably the Jest test suite) redirect generation to a
  // throwaway path so the tracked targets/watch/Generated/Brands.swift is never mutated.
  let outputURL: URL
  if let overridePath = environment["CATALOGUE_OUTPUT_PATH"], overridePath.isEmpty == false {
    outputURL = resolveEnvPath(overridePath, relativeTo: repoRoot)
  } else {
    outputURL = repoRoot.appendingPathComponent("targets/watch/Generated/Brands.swift")
  }

  let hashURL = outputURL.deletingLastPathComponent().appendingPathComponent(".catalogue-inputs.sha256")
  return (catalogueURL, outputURL, hashURL, scriptURL, repoRoot)
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

func runGenerator(catalogueURL: URL, outputURL: URL, hashURL: URL, scriptURL: URL, repoRoot: URL, checkMode: Bool) throws {
  let catalogueData = try Data(contentsOf: catalogueURL)
  let decoder = JSONDecoder()
  let catalogue = try decoder.decode(CatalogueData.self, from: catalogueData)

  let inputHash = try computeSHA256(for: [catalogueURL, scriptURL])
  let sourcePath = repoRelativePath(for: catalogueURL, repoRoot: repoRoot)

  if checkMode {
    guard FileManager.default.fileExists(atPath: outputURL.path) else {
      throw GeneratorError.missingCommittedOutput
    }

    let generatedSource = generateSource(from: catalogue, sourcePath: sourcePath)
    let existingSource = try String(contentsOf: outputURL, encoding: .utf8)

    if generatedSource == existingSource {
      print("Generated catalogue is up to date.")
      return
    }

    fputs("error: Generated catalogue differs from committed Brands.swift\n", stderr)
    exit(1)
  }

  let storedHash = readStoredHash(at: hashURL)
  let shouldGenerate = storedHash != inputHash || !FileManager.default.fileExists(atPath: outputURL.path)

  if shouldGenerate {
    let source = generateSource(from: catalogue, sourcePath: sourcePath)
    try FileManager.default.createDirectory(at: outputURL.deletingLastPathComponent(), withIntermediateDirectories: true)
    try source.write(to: outputURL, atomically: true, encoding: .utf8)
    try writeStoredHash(inputHash, to: hashURL)
    print("Generated \(outputURL.path)")
  } else {
    print("Inputs unchanged; skipping catalogue generation.")
  }
}

do {
  let (catalogueURL, outputURL, hashURL, scriptURL, repoRoot) = try resolvePaths()
  let environment = ProcessInfo.processInfo.environment
  let checkMode = environment["CATALOGUE_GENERATOR_CHECK"] == "1" || CommandLine.arguments.contains("--check")
  try runGenerator(catalogueURL: catalogueURL, outputURL: outputURL, hashURL: hashURL, scriptURL: scriptURL, repoRoot: repoRoot, checkMode: checkMode)
} catch {
  fputs("error: \(error.localizedDescription)\n", stderr)
  exit(1)
}
