# MyLoyaltyCards watchOS App

Native Swift/SwiftUI watchOS app (no React Native). This is a **companion-only** experience: read-only card access on watch with sync planned via WatchConnectivity.

## Requirements

- macOS with Xcode 15 or newer
- watchOS 10+ SDK (minimum deployment target: 10.0)

## Bundle Identifiers

- iOS app: `com.iferoporefi.myloyaltycards`
- watchOS app: `com.iferoporefi.myloyaltycards.watch`

## Build & Run (Simulator)

1. Open `watch-ios/MyLoyaltyCardsWatch.xcodeproj` in Xcode.
2. Select the `MyLoyaltyCardsWatch` scheme.
3. Choose **Apple Watch Series 9 (45mm)** simulator.
4. Run (`Cmd + R`).

### CLI (from repo root)

- Build: `yarn watch:build`
- Build + launch: `yarn watch:run`

Expected result: a placeholder screen with “MyLoyaltyCards” and “Read-only companion”.

## Build & Run (Device)

1. Connect the Apple Watch and paired iPhone.
2. Select the watch device as the run destination.
3. Run (`Cmd + R`).

## Notes

- **Companion-only**: no card creation or editing on watch.
- **Sync**: intended via `WatchConnectivity` with the iPhone app (future story).
- **No React Native**: the watch app is pure Swift/SwiftUI and isolated from the Expo project.
