import Foundation

enum WatchL10n {
  static func string(_ key: String) -> String {
    NSLocalizedString(key, tableName: nil, bundle: .main, value: key, comment: "")
  }

  static func format(_ key: String, _ arguments: CVarArg...) -> String {
    let formatString = string(key)
    return String(format: formatString, locale: Locale.current, arguments: arguments)
  }
}
