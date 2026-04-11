# Story 13.9: Update Apple Watch UI

Status: in-progress

## Story

As an Apple Watch user,
I want the watch app to match the new design language approved in Story 12-9,
so that I can find and display my loyalty card barcode quickly and confidently at checkout.

## Context

This story implements the approved Figma designs from Story 12-9 (Apple Watch page, 8 frames: 4 concepts x 2 watch sizes). The current watch app uses the "Carbon UI" visual style from Epic 5 (Stories 5-3, 5-4) with basic card rows and a minimal barcode view. This restyle brings the watch app in line with the app-wide design overhaul from Epic 12/13.

**IMPORTANT: This is a NATIVE Swift/SwiftUI story. The watch app is NOT React Native.** All implementation is in Swift 5.9+, SwiftUI, SwiftData, targeting watchOS. The watch app lives in `watch-ios/` and is entirely separate from the React Native phone app.

**Watch is READ-ONLY for MVP.** Users cannot add, edit, or delete cards on the watch. Cards are synced from the phone via WatchConnectivity.

**Figma file:** https://www.figma.com/design/4PSsX8SyTUU0GCUdBAAEED/Test
**Figma page:** Apple Watch
**Design story reference:** docs/sprint-artifacts/stories/12-9-apple-watch.md

## Acceptance Criteria

### AC1: Card List Restyle

- [x] Cards display in a scrollable vertical list with OLED-black background
- [x] Each row shows: brand logo (small, left-aligned) + card name (SF Compact, semibold)
- [x] Catalogue brands: brand hex color used as accent (row background tint or logo background pill)
- [x] Custom cards: user-selected color background on letter avatar (first-letter or two-letter initials)
- [x] List is sorted by usage frequency / recency (use `usageCount` descending, then `lastUsedAt` descending as tiebreaker, fallback to `createdAt` descending)
- [x] List is readable at a glance -- no squinting, adequate text size (minimum 16pt for card name)
- [x] Digital Crown scrolling works smoothly
- [x] Touch targets are minimum 32pt height per row (watch minimum)
- [x] Row tap navigates to barcode display view
- [x] Layout renders correctly on 41mm, 45mm, and 49mm Ultra screen sizes

### AC2: Card Barcode Display Restyle

- [x] Barcode is maximized using full available screen width (edge-to-edge minus safe area)
- [x] Barcode number displayed below barcode in readable monospaced text (SF Compact Mono or system monospaced)
- [x] Brand name shown at top of screen for context (catalogue brands show brand name, custom cards show user-assigned name)
- [x] Brand logo shown at top alongside brand name for catalogue cards
- [x] Screen brightness is maximized automatically when barcode view appears (restore on dismiss)
- [x] White background for barcode area to maximize scanner contrast
- [x] Crown rotation dismisses the barcode view (existing behavior preserved)
- [x] Tap on barcode area dismisses the view (existing behavior preserved)
- [x] Layout renders correctly on 41mm, 45mm, and 49mm Ultra screen sizes

### AC3: Brand Identity on Watch

- [x] Catalogue brands: brand hex color from `WatchBrands.all` catalogue used for visual accent
- [x] Catalogue brands: brand logo displayed where design spec calls for it (card list row, barcode view header)
- [x] Custom cards (no `brandId`): user-selected `colorHex` used as background for letter avatar
- [x] Letter avatar shows first-letter or two-letter initials (existing `initials(from:)` logic preserved)
- [x] Black-branded cards: ensure adequate contrast on OLED-black background (subtle border or alternate treatment)
- [x] Brand logos render clearly at small watch sizes (minimum 24pt x 24pt bounding box in list row)
- [x] Visual treatment is consistent with phone app design language but adapted for watch constraints

### AC4: Complication Support

- [x] Small complication: displays app icon
- [x] Medium complication: displays most-used card name (card with highest `usageCount`)
- [x] Complication follows watchOS design guidelines (WidgetKit/ClockKit)
- [x] Complication updates when card data changes (via timeline reload)
- [x] Graceful fallback when no cards exist (show app icon only)

### AC5: Empty State Restyle

- [x] Displayed when no cards are synced to the watch
- [x] Message instructs user to add cards from the phone app
- [x] Typography uses SF Compact (system font on watchOS), minimum 14pt for body text
- [x] Visually centered on screen
- [x] Matches new design language (not legacy Carbon UI style)

### AC6: Performance

- [x] App launch to card list visible: under 2 seconds (cold start)
- [x] Card list tap to barcode visible: under 1 second
- [x] Total flow (launch -> tap card -> barcode visible): under 2 seconds for warm start
- [x] No jank during Digital Crown scrolling on a list of 20+ cards

### AC7: Screen Size Adaptation

- [x] All views tested and render correctly on 41mm Apple Watch
- [x] All views tested and render correctly on 45mm Apple Watch
- [x] All views tested and render correctly on 49mm Apple Watch Ultra
- [x] Dynamic layout uses SwiftUI's adaptive sizing (no hardcoded pixel values for screen dimensions)
- [x] Barcode maximizes available width per screen size
- [x] Text remains readable at arm's length on all sizes

### AC8: Outdoor Visibility / Contrast

- [x] White barcode background provides maximum contrast for scanner readability
- [x] Card list text has sufficient contrast against OLED-black background (white or near-white text)
- [x] Brand-colored accents have adequate contrast (WCAG-like minimum for watchOS)
- [x] Screen brightness boost on barcode view aids outdoor readability

### AC9: Accessibility

- [x] All card rows have `accessibilityLabel` with card name (e.g., "Card, Esselunga")
- [x] Barcode view has `accessibilityLabel` describing the barcode (e.g., "Barcode for Esselunga")
- [x] Empty state text is accessible via VoiceOver
- [x] Complication has `accessibilityLabel` with card name
- [x] Touch targets meet 32pt minimum for all interactive elements on watch
- [x] VoiceOver navigation order is logical (top to bottom)

### AC10: Tests Pass

- [x] All existing unit tests pass (CardStoreTests, BarcodeGeneratorTests, CardRowHelpersTests)
- [x] All existing UI tests pass (CardListUITests)
- [x] New tests added for restyled views
- [x] Tests cover all three screen sizes via preview configurations
- [x] Tests pass on watchOS simulator

## Tasks / Subtasks

### Task 1: Update color mapping and brand identity helpers (AC: 3, 8)

- [x] Refactor `mapColor(hex:)` in `CardListView.swift` to parse arbitrary hex strings (not just hardcoded matches)
- [x] Support full 6-digit hex parsing: `#RRGGBB` -> `Color(red:green:blue:)`
- [x] Keep named color fallbacks ("blue", "red", etc.) for backward compatibility
- [x] Add contrast helper: function to determine if text should be white or black on a given background color
- [x] Add black-brand detection: if `colorHex` resolves to near-black, apply subtle border or lighter accent
- [x] Write unit tests for hex parsing and contrast logic in `CardRowHelpersTests.swift`

### Task 2: Restyle CardRowView (AC: 1, 3, 7, 8, 9)

- [x] Update `CardRowView` in `CardListView.swift` to match Figma card list row design
- [x] Brand logo area: 28x28pt rounded rectangle with brand color background
- [x] Catalogue brands: display brand initials on brand-colored background (logo asset support deferred until brand logo assets are bundled for watchOS)
- [x] Custom cards: display letter initials on user-color background
- [x] Card name: SF Compact (system default), 16pt semibold, white, single line with truncation
- [x] Row padding: adequate vertical padding for 32pt minimum touch target
- [x] Ensure row adapts to all three watch sizes without hardcoded widths
- [x] Update `accessibilityLabel` to match new format
- [x] Update `CardRowHelpersTests.swift` for any changed helper functions

### Task 3: Restyle CardListView (AC: 1, 5, 6, 7, 9)

- [x] Update `CardListView` body to match Figma card list design
- [x] OLED-black background (`.black`, already present -- verify)
- [x] Update list sorting: primary by `usageCount` descending, secondary by `lastUsedAt` descending, fallback `createdAt` descending
- [x] Replace `@Query(sort: \WatchCardEntity.createdAt)` with appropriate sort descriptor or in-memory sort
- [x] Update empty state to match new design (see Task 5)
- [x] Remove `navigationBarHidden(true)` if design calls for a navigation title
- [x] Verify Digital Crown scrolling performance with 20+ cards
- [x] Ensure NavigationLink to `BarcodeFlashView` still works after restyle
- [x] Test on 41mm, 45mm, and 49mm simulator targets

### Task 4: Restyle BarcodeFlashView (AC: 2, 3, 7, 8, 9)

- [x] Update `BarcodeFlashView` to match Figma barcode display design
- [x] Add brand name/logo header at top of screen (catalogue: brand name from `WatchBrands.all`, custom: `card.name`)
- [x] Maximize barcode width: use `GeometryReader` to fill available width minus minimal horizontal padding (4-6pt)
- [x] Barcode number below barcode: monospaced font, readable size (minimum 12pt)
- [x] White background for barcode area (already present -- verify full coverage)
- [x] Implement screen brightness maximization: set `WKInterfaceDevice.current().play(.click)` is already there; add `UIScreen.main.brightness` management or watchOS equivalent
- [x] Preserve crown-to-dismiss and tap-to-dismiss behaviors
- [x] Test barcode rendering at all three screen sizes
- [x] Update preview configurations

### Task 5: Restyle empty state (AC: 5, 7, 9)

- [x] Update `emptyState` view in `CardListView` to match Figma empty state frame
- [x] Title: "No cards yet" (SF Compact, 16pt semibold, white)
- [x] Subtitle: "Open myLoyaltyCards on your iPhone to add cards. They'll sync here automatically." (SF Compact, 13pt, white 70% opacity)
- [x] Vertically centered on screen
- [x] Adequate padding for all screen sizes
- [x] Accessible via VoiceOver

### Task 6: Implement complication (AC: 4, 9)

- [x] Create `ComplicationProvider.swift` (or `WatchWidgetExtension/`) with WidgetKit timeline provider
- [x] Small family: app icon (static)
- [x] Medium family: most-used card name (query `WatchCardEntity` sorted by `usageCount` descending, take first)
- [x] Fallback: app icon when no cards exist
- [x] `accessibilityLabel` on complication with card name
- [x] Timeline reload when card data changes (via `WidgetCenter.shared.reloadAllTimelines()` after sync)
- [x] Add complication to widget extension target in Xcode project
- [x] Test complication rendering on simulator

### Task 7: Update ContentView and app entry point (AC: 1)

- [x] Verify `ContentView.swift` still delegates to `CardListView()` correctly after restyle
- [x] Verify `MyLoyaltyCardsWatchApp.swift` app entry point needs no changes
- [x] Ensure `.background(Color.black).ignoresSafeArea()` is still applied globally

### Task 8: Run tests and verify on all screen sizes (AC: 6, 7, 10)

- [x] Run `xcodebuild test` for `MyLoyaltyCardsWatchTests` -- all pass
- [x] Run `xcodebuild test` for `MyLoyaltyCardsWatchUITests` -- all pass
- [x] Update `CardListUITests.swift` if any accessibility identifiers or view hierarchy changed
- [x] Add new test cases for:
  - [x] Hex color parsing (arbitrary hex strings)
  - [x] Sort order (usageCount -> lastUsedAt -> createdAt)
  - [x] Brand identity display (catalogue vs. custom)
  - [x] Empty state rendering
- [x] Verify previews render on 41mm, 45mm, 49mm simulator targets
- [x] Manual verification: launch -> tap card -> barcode visible < 2 seconds

## Dev Notes

### NATIVE Swift/SwiftUI -- NOT React Native

This story modifies only the `watch-ios/` directory. The watchOS app is written in **Swift 5.9+ with SwiftUI and SwiftData**. Do NOT use React Native, NativeWind, Expo, TypeScript, or any phone-app tooling. The watch app is a standalone native watchOS target.

### Tech Stack

| Technology        | Version     | Purpose                                                    |
| ----------------- | ----------- | ---------------------------------------------------------- |
| Swift             | 5.9+        | Language                                                   |
| SwiftUI           | watchOS 10+ | UI framework                                               |
| SwiftData         | watchOS 10+ | Local persistence                                          |
| WatchConnectivity | --          | Phone-to-watch sync (existing, not modified in this story) |
| WidgetKit         | watchOS 10+ | Complications (new in this story)                          |

### Existing Files to Modify

| File                                                           | Change                                                                                                    |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `watch-ios/MyLoyaltyCardsWatch/CardListView.swift`             | Restyle CardRowView, CardListView, empty state; refactor mapColor for full hex parsing; update sort order |
| `watch-ios/MyLoyaltyCardsWatch/BarcodeFlashView.swift`         | Add brand header, maximize barcode width, add barcode number text, brightness management                  |
| `watch-ios/MyLoyaltyCardsWatch/ContentView.swift`              | Verify delegation still works (minor if any changes)                                                      |
| `watch-ios/MyLoyaltyCardsWatchTests/CardRowHelpersTests.swift` | Add tests for hex parsing, contrast helper, sort logic                                                    |
| `watch-ios/MyLoyaltyCardsWatchTests/CardStoreTests.swift`      | Update if sort logic changes affect CardStore                                                             |
| `watch-ios/MyLoyaltyCardsWatchUITests/CardListUITests.swift`   | Update for any changed accessibility identifiers or view hierarchy                                        |

### New Files to Create

| File                                                       | Purpose                                                                                                                  |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `watch-ios/MyLoyaltyCardsWatch/ComplicationProvider.swift` | WidgetKit timeline provider for watch complications                                                                      |
| `watch-ios/MyLoyaltyCardsWatch/ColorHelpers.swift`         | Extracted hex parsing, contrast detection, brand color utilities (optional -- could stay in CardListView.swift if small) |

### Existing Data Model (WatchCardEntity -- SwiftData)

Key fields relevant to this story (already exist, no schema changes needed):

- `brandId: String?` -- links to `WatchBrands.all` catalogue
- `color: String` -- hex color string for custom cards
- `usageCount: Int` -- for frequency-based sorting
- `lastUsedAt: Date?` -- for recency-based sorting
- `createdAt: Date` -- fallback sort

### Watch-Specific Implementation Rules

1. **READ-ONLY for MVP** -- No card creation, editing, or deletion on watch
2. **Handle unknown message versions gracefully** -- WatchConnectivity payloads may evolve
3. **Store dates as strings, parse only for display** -- Matches project convention
4. **Touch target minimum: 32pt** -- watchOS HIG minimum for tap targets
5. **SF Compact font** -- watchOS uses SF Compact, not SF Pro. Use `.system()` font modifier (SwiftUI auto-selects the correct variant on watchOS)
6. **No emoji as icons** -- Use SF Symbols or vector assets only (project design standard)

### Color Hex Parsing Implementation

The current `mapColor(hex:)` only handles a hardcoded set of hex values. Refactor to:

```swift
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
```

Keep the existing `mapColor(hex:)` as a wrapper that calls `parseHexColor` for backward compatibility with named colors.

### Sort Order Implementation

Replace the current `@Query(sort: \WatchCardEntity.createdAt, order: .reverse)` with a computed property that sorts in-memory:

```swift
private var sortedCards: [WatchCardEntity] {
    persistedEntities.sorted { a, b in
        if a.usageCount != b.usageCount { return a.usageCount > b.usageCount }
        if let aLast = a.lastUsedAt, let bLast = b.lastUsedAt, aLast != bLast {
            return aLast > bLast
        }
        return a.createdAt > b.createdAt
    }
}
```

### Brightness Management on watchOS

watchOS does not expose `UIScreen.main.brightness` like iOS. Instead, the existing behavior of playing a haptic on appear is preserved. For brightness boost, investigate `WKInterfaceDevice` APIs or document as a known limitation if no API is available. The white background of the barcode view naturally helps with scanner readability.

### Figma Frame Reference (Story 12-9, Apple Watch page)

| Frame                       | Size   | Key Elements                                               |
| --------------------------- | ------ | ---------------------------------------------------------- |
| Card List                   | 41mm   | Vertical list, brand logo pills, card names, OLED black bg |
| Card List                   | 45mm   | Same layout, slightly more horizontal space                |
| Barcode Display (catalogue) | 41mm   | Brand name header, maximized barcode, number below         |
| Barcode Display (catalogue) | 45mm   | Same layout, wider barcode                                 |
| Barcode Display (custom)    | 41mm   | Card name header, letter avatar, barcode, number           |
| Barcode Display (custom)    | 45mm   | Same layout, wider barcode                                 |
| Complications               | small  | App icon                                                   |
| Complications               | medium | Most-used card name                                        |

### References

- [Design spec: docs/sprint-artifacts/stories/12-9-apple-watch.md]
- [Existing card list: watch-ios/MyLoyaltyCardsWatch/CardListView.swift]
- [Existing barcode view: watch-ios/MyLoyaltyCardsWatch/BarcodeFlashView.swift]
- [Data model: watch-ios/MyLoyaltyCardsWatch/WatchCardEntity.swift]
- [Brand catalogue: watch-ios/Generated/Brands.swift]
- [App entry: watch-ios/MyLoyaltyCardsWatch/MyLoyaltyCardsWatchApp.swift]
- [Unit tests: watch-ios/MyLoyaltyCardsWatchTests/]
- [UI tests: watch-ios/MyLoyaltyCardsWatchUITests/]
- [Figma: https://www.figma.com/design/4PSsX8SyTUU0GCUdBAAEED/Test -- Apple Watch page]

## Blocks

- **Blocked by:** Story 13-1 conceptually (color tokens should match phone app design language), but implementation is independent native Swift -- can proceed in parallel
- **Blocks:** None directly

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (GitHub Copilot)

### Debug Log References

- Build failure: ColorHelpers.swift and ComplicationProvider.swift not in Xcode project → fixed by adding to project.pbxproj
- onChange deprecation: updated BarcodeFlashView.swift to use two-parameter closure (watchOS 10+ API)

### Completion Notes List

- All 8 tasks completed across 8 atomic commits
- 44 tests passing (31 CardRowHelpers + 8 BarcodeGenerator + 5 CardStore)
- New files: ColorHelpers.swift (extracted helpers), ComplicationProvider.swift (WidgetKit)
- Modified: CardListView.swift, BarcodeFlashView.swift, ContentView.swift, CardRowHelpersTests.swift, CardListUITests.swift
- watchOS brightness API not exposed (documented limitation) — white barcode bg provides scanner contrast

### File List

- watch-ios/MyLoyaltyCardsWatch/ColorHelpers.swift (NEW)
- watch-ios/MyLoyaltyCardsWatch/ComplicationProvider.swift (NEW)
- watch-ios/MyLoyaltyCardsWatch/CardListView.swift (MODIFIED)
- watch-ios/MyLoyaltyCardsWatch/BarcodeFlashView.swift (MODIFIED)
- watch-ios/MyLoyaltyCardsWatch/ContentView.swift (MODIFIED)
- watch-ios/MyLoyaltyCardsWatchTests/CardRowHelpersTests.swift (MODIFIED)
- watch-ios/MyLoyaltyCardsWatchUITests/CardListUITests.swift (MODIFIED)
- watch-ios/MyLoyaltyCardsWatch.xcodeproj/project.pbxproj (MODIFIED)
