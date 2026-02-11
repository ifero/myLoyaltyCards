# Native watchOS Companion App

## Scope

This skill documents **native watchOS** development guidelines for myLoyaltyCards. The watch app is **companion-only** and **read-only**. It relies on phone sync for data and only renders user cards.

> Note: For any concrete API usage (SwiftUI, SwiftData, WatchConnectivity), consult official docs before implementation.

---

## Goals

- Fast, offline access to synced cards.
- Minimal UI: list → tap → barcode.
- Clear empty state when no cards are synced.
- Companion-only behavior (no card creation/editing on watch).

---

## Core Principles

1. **Companion-only**: The watch app does not manage catalogue or card creation.
2. **Read-only data**: Sync from phone, store locally for fast access.
3. **Instant display**: Optimize for ≤1s tap-to-barcode.
4. **OLED-first UI**: High contrast, low chrome, minimal animations.
5. **Offline-first**: Works without phone or network after sync.

---

## Data Model Alignment

- Watch data model must match phone schema fields:
  - `id`, `name`, `barcode`, `barcodeFormat`, `brandId`, `color`, `isFavorite`, `lastUsedAt`, `usageCount`, `createdAt`, `updatedAt`
- Store timestamps as ISO 8601 strings (UTC).
- JSON payloads must include all fields (use nulls, never omit).

---

## Catalogue Usage Policy (watchOS)

- **No browsing UI**.
- Catalogue data is only for **brandId → logo** mapping when rendering cards.
- Sync transfers **card data only**; watch resolves logo locally.

---

## UX Requirements

- **Card List (Carbon UI)**: OLED black background, thin separators.
- **Empty State**: “Open the iPhone app to add cards.”
- **Tap**: Immediate barcode display + haptic feedback.
- **Exit**: Tap screen or crown to return.

---

## Sync Policy

- Use WatchConnectivity (phone → watch).
- Sync message includes version + card payload.
- Watch remains read-only; no outbound edits.
- Retry on reconnect.

---

## Performance Targets

- Cold start: ≤2s to list visible.
- Tap-to-barcode: ≤1s.
- Smooth scrolling with Digital Crown.

---

## Testing Checklist

- Cards persist across restarts.
- Empty state is shown when no cards synced.
- Barcode renders for all supported formats.
- Sync updates list within 30s when connected.

---

## Ownership & Boundaries

- Swift/SwiftUI only in watch-ios/.
- No React Native or Expo dependencies inside watch-ios/.
- Keep README explicit: native app, companion-only.

---

## References

- Official Apple links: .agents/skills/native-watchos/references/apple-watchos-links.md
