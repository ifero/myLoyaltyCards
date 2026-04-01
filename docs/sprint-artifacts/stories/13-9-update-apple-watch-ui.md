# Story 13.9: Update Apple Watch UI

Status: ready-for-dev

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

- [ ] Cards display in a scrollable vertical list with OLED-black background
- [ ] Each row shows: brand logo (small, left-aligned) + card name (SF Compact, semibold)
- [ ] Catalogue brands: brand hex color used as accent (row background tint or logo background pill)
- [ ] Custom cards: user-selected color background on letter avatar (first-letter or two-letter initials)
- [ ] List is sorted by usage frequency / recency (use `usageCount` descending, then `lastUsedAt` descending as tiebreaker, fallback to `createdAt` descending)
- [ ] List is readable at a glance -- no squinting, adequate text size (minimum 16pt for card name)
- [ ] Digital Crown scrolling works smoothly
- [ ] Touch targets are minimum 32pt height per row (watch minimum)
- [ ] Row tap navigates to barcode display view
- [ ] Layout renders correctly on 41mm, 45mm, and 49mm Ultra screen sizes

### AC2: Card Barcode Display Restyle

- [ ] Barcode is maximized using full available screen width (edge-to-edge minus safe area)
- [ ] Barcode number displayed below barcode in readable monospaced text (SF Compact Mono or system monospaced)
- [ ] Brand name shown at top of screen for context (catalogue brands show brand name, custom cards show user-assigned name)
- [ ] Brand logo shown at top alongside brand name for catalogue cards
- [ ] Screen brightness is maximized automatically when barcode view appears (restore on dismiss)
- [ ] White background for barcode area to maximize scanner contrast
- [ ] Crown rotation dismisses the barcode view (existing behavior preserved)
- [ ] Tap on barcode area dismisses the view (existing behavior preserved)
- [ ] Layout renders correctly on 41mm, 45mm, and 49mm Ultra screen sizes

### AC3: Brand Identity on Watch

- [ ] Catalogue brands: brand hex color from `WatchBrands.all` catalogue used for visual accent
- [ ] Catalogue brands: brand logo displayed where design spec calls for it (card list row, barcode view header)
- [ ] Custom cards (no `brandId`): user-selected `colorHex` used as background for letter avatar
- [ ] Letter avatar shows first-letter or two-letter initials (existing `initials(from:)` logic preserved)
- [ ] Black-branded cards: ensure adequate contrast on OLED-black background (subtle border or alternate treatment)
- [ ] Brand logos render clearly at small watch sizes (minimum 24pt x 24pt bounding box in list row)
- [ ] Visual treatment is consistent with phone app design language but adapted for watch constraints

### AC4: Complication Support

- [ ] Small complication: displays app icon
- [ ] Medium complication: displays most-used card name (card with highest `usageCount`)
- [ ] Complication follows watchOS design guidelines (WidgetKit/ClockKit)
- [ ] Complication updates when card data changes (via timeline reload)
- [ ] Graceful fallback when no cards exist (show app icon only)

### AC5: Empty State Restyle

- [ ] Displayed when no cards are synced to the watch
- [ ] Message instructs user to add cards from the phone app
- [ ] Typography uses SF Compact (system font on watchOS), minimum 14pt for body text
- [ ] Visually centered on screen
- [ ] Matches new design language (not legacy Carbon UI style)

### AC6: Performance

- [ ] App launch to card list visible: under 2 seconds (cold start)
- [ ] Card list tap to barcode visible: under 1 second
- [ ] Total flow (launch -> tap card -> barcode visible): under 2 seconds for warm start
- [ ] No jank during Digital Crown scrolling on a list of 20+ cards

### AC7: Screen Size Adaptation

- [ ] All views tested and render correctly on 41mm Apple Watch
- [ ] All views tested and render correctly on 45mm Apple Watch
- [ ] All views tested and render correctly on 49mm Apple Watch Ultra
- [ ] Dynamic layout uses SwiftUI's adaptive sizing (no hardcoded pixel values for screen dimensions)
- [ ] Barcode maximizes available width per screen size
- [ ] Text remains readable at arm's length on all sizes

### AC8: Outdoor Visibility / Contrast

- [ ] White barcode background provides maximum contrast for scanner readability
- [ ] Card list text has sufficient contrast against OLED-black background (white or near-white text)
- [ ] Brand-colored accents have adequate contrast (WCAG-like minimum for watchOS)
- [ ] Screen brightness boost on barcode view aids outdoor readability

### AC9: Accessibility

- [ ] All card rows have `accessibilityLabel` with card name (e.g., "Card, Esselunga")
- [ ] Barcode view has `accessibilityLabel` describing the barcode (e.g., "Barcode for Esselunga")
- [ ] Empty state text is accessible via VoiceOver
- [ ] Complication has `accessibilityLabel` with card name
- [ ] Touch targets meet 32pt minimum for all interactive elements on watch
- [ ] VoiceOver navigation order is logical (top to bottom)

### AC10: Tests Pass

- [ ] All existing unit tests pass (CardStoreTests, BarcodeGeneratorTests, CardRowHelpersTests)
- [ ] All existing UI tests pass (CardListUITests)
- [ ] New tests added for restyled views
- [ ] Tests cover all three screen sizes via preview configurations
- [ ] Tests pass on watchOS simulator

## Tasks / Subtasks

### Task 1: Update color mapping and brand identity helpers (AC: 3, 8)

- [ ] Refactor `mapColor(hex:)` in `CardListView.swift` to parse arbitrary hex strings (not just hardcoded matches)
- [ ] Support full 6-digit hex parsing: `#RRGGBB` -> `Color(red:green:blue:)`
- [ ] Keep named color fallbacks ("blue", "red", etc.) for backward compatibility
- [ ] Add contrast helper: function to determine if text should be white or black on a given background color
- [ ] Add black-brand detection: if `colorHex` resolves to near-black, apply subtle border or lighter accent
- [ ] Write unit tests for hex parsing and contrast logic in `CardRowHelpersTests.swift`

### Task 2: Restyle CardRowView (AC: 1, 3, 7, 8, 9)

- [ ] Update `CardRowView` in `CardListView.swift` to match Figma card list row design
- [ ] Brand logo area: 28x28pt rounded rectangle with brand color background
- [ ] Catalogue brands: display brand initials on brand-colored background (logo asset support deferred until brand logo assets are bundled for watchOS)
- [ ] Custom cards: display letter initials on user-color background
- [ ] Card name: SF Compact (system default), 16pt semibold, white, single line with truncation
- [ ] Row padding: adequate vertical padding for 32pt minimum touch target
- [ ] Ensure row adapts to all three watch sizes without hardcoded widths
- [ ] Update `accessibilityLabel` to match new format
- [ ] Update `CardRowHelpersTests.swift` for any changed helper functions

### Task 3: Restyle CardListView (AC: 1, 5, 6, 7, 9)

- [ ] Update `CardListView` body to match Figma card list design
- [ ] OLED-black background (`.black`, already present -- verify)
- [ ] Update list sorting: primary by `usageCount` descending, secondary by `lastUsedAt` descending, fallback `createdAt` descending
- [ ] Replace `@Query(sort: \WatchCardEntity.createdAt)` with appropriate sort descriptor or in-memory sort
- [ ] Update empty state to match new design (see Task 5)
- [ ] Remove `navigationBarHidden(true)` if design calls for a navigation title
- [ ] Verify Digital Crown scrolling performance with 20+ cards
- [ ] Ensure NavigationLink to `BarcodeFlashView` still works after restyle
- [ ] Test on 41mm, 45mm, and 49mm simulator targets

### Task 4: Restyle BarcodeFlashView (AC: 2, 3, 7, 8, 9)

- [ ] Update `BarcodeFlashView` to match Figma barcode display design
- [ ] Add brand name/logo header at top of screen (catalogue: brand name from `WatchBrands.all`, custom: `card.name`)
- [ ] Maximize barcode width: use `GeometryReader` to fill available width minus minimal horizontal padding (4-6pt)
- [ ] Barcode number below barcode: monospaced font, readable size (minimum 12pt)
- [ ] White background for barcode area (already present -- verify full coverage)
- [ ] Implement screen brightness maximization: set `WKInterfaceDevice.current().play(.click)` is already there; add `UIScreen.main.brightness` management or watchOS equivalent
- [ ] Preserve crown-to-dismiss and tap-to-dismiss behaviors
- [ ] Test barcode rendering at all three screen sizes
- [ ] Update preview configurations

### Task 5: Restyle empty state (AC: 5, 7, 9)

- [ ] Update `emptyState` view in `CardListView` to match Figma empty state frame
- [ ] Title: "No cards yet" (SF Compact, 16pt semibold, white)
- [ ] Subtitle: "Open myLoyaltyCards on your iPhone to add cards. They'll sync here automatically." (SF Compact, 13pt, white 70% opacity)
- [ ] Vertically centered on screen
- [ ] Adequate padding for all screen sizes
- [ ] Accessible via VoiceOver

### Task 6: Implement complication (AC: 4, 9)

- [ ] Create `ComplicationProvider.swift` (or `WatchWidgetExtension/`) with WidgetKit timeline provider
- [ ] Small family: app icon (static)
- [ ] Medium family: most-used card name (query `WatchCardEntity` sorted by `usageCount` descending, take first)
- [ ] Fallback: app icon when no cards exist
- [ ] `accessibilityLabel` on complication with card name
- [ ] Timeline reload when card data changes (via `WidgetCenter.shared.reloadAllTimelines()` after sync)
- [ ] Add complication to widget extension target in Xcode project
- [ ] Test complication rendering on simulator

### Task 7: Update ContentView and app entry point (AC: 1)

- [ ] Verify `ContentView.swift` still delegates to `CardListView()` correctly after restyle
- [ ] Verify `MyLoyaltyCardsWatchApp.swift` app entry point needs no changes
- [ ] Ensure `.background(Color.black).ignoresSafeArea()` is still applied globally

### Task 8: Run tests and verify on all screen sizes (AC: 6, 7, 10)

- [ ] Run `xcodebuild test` for `MyLoyaltyCardsWatchTests` -- all pass
- [ ] Run `xcodebuild test` for `MyLoyaltyCardsWatchUITests` -- all pass
- [ ] Update `CardListUITests.swift` if any accessibility identifiers or view hierarchy changed
- [ ] Add new test cases for:
  - [ ] Hex color parsing (arbitrary hex strings)
  - [ ] Sort order (usageCount -> lastUsedAt -> createdAt)
  - [ ] Brand identity display (catalogue vs. custom)
  - [ ] Empty state rendering
- [ ] Verify previews render on 41mm, 45mm, 49mm simulator targets
- [ ] Manual verification: launch -> tap card -> barcode visible < 2 seconds

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

### Debug Log References

### Completion Notes List

### File List
