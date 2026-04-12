import SwiftUI

// MARK: - Hex Color Parsing

/// Parses an arbitrary 6-digit hex string (with or without `#` prefix) into a SwiftUI `Color`.
/// Returns `.gray` for invalid / unparseable input.
func parseHexColor(_ hex: String) -> Color {
    var h = hex.trimmingCharacters(in: .whitespacesAndNewlines)
    if h.hasPrefix("#") { h.removeFirst() }
    guard h.count == 6, let rgb = UInt64(h, radix: 16) else {
        return .gray
    }
    return Color(
        red: Double((rgb >> 16) & 0xFF) / 255.0,
        green: Double((rgb >> 8) & 0xFF) / 255.0,
        blue: Double(rgb & 0xFF) / 255.0
    )
}

/// Backward-compatible wrapper that supports both named colors ("blue", "red", …)
/// and arbitrary hex strings ("#RRGGBB"). Returns `nil` only when input is nil/empty.
func mapColor(hex: String?) -> Color? {
    guard let hex = hex?.trimmingCharacters(in: .whitespacesAndNewlines), !hex.isEmpty else {
        return nil
    }
    // Named-color fallbacks (legacy compatibility)
    switch hex.lowercased() {
    case "blue": return Color.blue
    case "red": return Color.red
    case "green": return Color.green
    case "orange": return Color.orange
    case "gray", "grey":
        return Color(red: 156 / 255, green: 163 / 255, blue: 175 / 255)
    default:
        return parseHexColor(hex)
    }
}

// MARK: - Contrast Helpers

/// Returns the relative luminance of a hex color string (0 = black, 1 = white).
/// Uses the WCAG formula: https://www.w3.org/TR/WCAG20/#relativeluminancedef
func relativeLuminance(hex: String) -> Double {
    var h = hex.trimmingCharacters(in: .whitespacesAndNewlines)
    if h.hasPrefix("#") { h.removeFirst() }
    guard h.count == 6, let rgb = UInt64(h, radix: 16) else {
        return 0.0 // default to dark for invalid input
    }

    let r = Double((rgb >> 16) & 0xFF) / 255.0
    let g = Double((rgb >> 8) & 0xFF) / 255.0
    let b = Double(rgb & 0xFF) / 255.0

    let rLin = r <= 0.03928 ? r / 12.92 : pow((r + 0.055) / 1.055, 2.4)
    let gLin = g <= 0.03928 ? g / 12.92 : pow((g + 0.055) / 1.055, 2.4)
    let bLin = b <= 0.03928 ? b / 12.92 : pow((b + 0.055) / 1.055, 2.4)

    return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin
}

/// Returns `true` when text on a background of `hex` color should be white.
/// Uses luminance threshold: dark backgrounds → white text, light → black text.
func shouldUseWhiteText(onBackgroundHex hex: String) -> Bool {
    return relativeLuminance(hex: hex) < 0.4
}

/// Detects near-black colors (luminance below threshold) that need special treatment
/// on an OLED-black background (e.g., subtle border or lighter accent).
func isNearBlack(hex: String) -> Bool {
    return relativeLuminance(hex: hex) < 0.05
}

// MARK: - Initials

/// Extracts one-letter or two-letter initials from a display name.
func initials(from name: String) -> String {
    let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmed.isEmpty else { return "" }
    let parts = trimmed.split(separator: " ")
    if parts.count >= 2 {
        let first = parts[0].first.map(String.init) ?? ""
        let second = parts[1].first.map(String.init) ?? ""
        return (first + second).uppercased()
    }
    return String(trimmed.prefix(2)).uppercased()
}
