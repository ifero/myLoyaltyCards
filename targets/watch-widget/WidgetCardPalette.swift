import SwiftUI

/// Resolves a per-card color value — either a palette key the phone sends
/// ("red"/"blue"/"green"/"orange"/"grey") or a "#RRGGBB" hex string — into a
/// SwiftUI `Color`, and picks a legible foreground color for content drawn on
/// top of it. Mirrors the watch app's `ColorHelpers` so the complication reads
/// as the same color as the in-app card rows.
enum WidgetCardPalette {
  /// Hex for each palette key, matching the app's canonical `CARD_COLORS`
  /// (shared/theme/colors.ts) so the complication background is exactly the
  /// same color the user sees on the card inside the app.
  private static let namedHex: [String: String] = [
    "blue": "#1A73E8",
    "red": "#E2231A",
    "green": "#16A34A",
    "orange": "#F59E0B",
    "gray": "#64748B",
    "grey": "#64748B",
  ]

  /// The normalized "#RRGGBB" hex for a raw color value, or nil when unusable.
  static func hex(for raw: String?) -> String? {
    guard
      let trimmed = raw?.trimmingCharacters(in: .whitespacesAndNewlines),
      !trimmed.isEmpty
    else {
      return nil
    }

    if let named = namedHex[trimmed.lowercased()] {
      return named
    }

    return normalizedHex(trimmed)
  }

  /// SwiftUI color for a raw card color value, or nil when unusable.
  static func color(for raw: String?) -> Color? {
    guard let hex = hex(for: raw) else { return nil }
    return Color(hex: hex)
  }

  /// True when white content is more legible than black on the resolved color.
  /// Threshold matches the watch app's `shouldUseWhiteText` (ColorHelpers.swift)
  /// so e.g. orange picks black text on both surfaces. Defaults to white for
  /// unknown colors (the complication falls back to dark neutrals).
  static func prefersWhiteForeground(for raw: String?) -> Bool {
    guard let hex = hex(for: raw) else { return true }
    return relativeLuminance(hex: hex) < 0.4
  }

  // MARK: - Hex helpers

  private static func normalizedHex(_ value: String) -> String? {
    var h = value
    if h.hasPrefix("#") { h.removeFirst() }
    guard h.count == 6, UInt64(h, radix: 16) != nil else { return nil }
    return "#" + h.uppercased()
  }

  /// WCAG relative luminance (0 = black, 1 = white) for a "#RRGGBB" string.
  private static func relativeLuminance(hex: String) -> Double {
    var h = hex
    if h.hasPrefix("#") { h.removeFirst() }
    guard h.count == 6, let rgb = UInt64(h, radix: 16) else { return 0 }

    let r = Double((rgb >> 16) & 0xFF) / 255.0
    let g = Double((rgb >> 8) & 0xFF) / 255.0
    let b = Double(rgb & 0xFF) / 255.0
    let linearize: (Double) -> Double = { channel in
      channel <= 0.03928 ? channel / 12.92 : pow((channel + 0.055) / 1.055, 2.4)
    }

    return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b)
  }
}

extension Color {
  /// Initializes from a "#RRGGBB" (or "RRGGBB") hex string; black on bad input.
  init(hex: String) {
    var h = hex.trimmingCharacters(in: .whitespacesAndNewlines)
    if h.hasPrefix("#") { h.removeFirst() }
    let rgb = (h.count == 6 ? UInt64(h, radix: 16) : nil) ?? 0
    self.init(
      red: Double((rgb >> 16) & 0xFF) / 255.0,
      green: Double((rgb >> 8) & 0xFF) / 255.0,
      blue: Double(rgb & 0xFF) / 255.0
    )
  }
}
