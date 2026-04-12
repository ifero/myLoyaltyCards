# Story 11-6: Embed watchOS App in iOS Build via @bacons/apple-targets

**Epic:** 11 — CI/CD & Quality Gates
**Sprint:** 12
**Status:** ready-for-dev
**Priority:** P0 — Blocks real-device testing of the entire app
**Points:** 5
**Depends on:** ~~match provisioning for watch bundle ID~~ ✅ Done by ifero (2026-04-11)

---

## Story

As a developer,
I want the watchOS app embedded in the iOS app archive via Expo's Continuous Native Generation,
so that a single `fastlane ios beta` command produces a TestFlight build containing both the iOS and watchOS apps.

---

## Context & Problem

### Why can't we ship the watchOS app separately?

Apple requires watchOS apps — even "independent" ones — to be **embedded inside the iOS app's IPA archive**. There is no way to upload a standalone watchOS binary to TestFlight or the App Store. This is by Apple's design: the watch app is distributed as a companion target within the iOS archive, and watchOS discovers it via the "Embed Watch Content" build phase.

### Current architecture (broken for distribution)

```
myLoyaltyCards/
├── ios/                                    ← Expo-generated (expo prebuild)
│   └── myLoyaltyCards.xcodeproj            ← iOS app only, no watch target
└── watch-ios/                              ← Separate Xcode project
    └── MyLoyaltyCardsWatch.xcodeproj       ← watchOS app, completely isolated
```

- `expo prebuild` regenerates `ios/` — any manual changes to the Xcode project are wiped
- The watchOS project has zero connection to the iOS project
- Fastlane lanes (`beta`, `upload_release`) archive only the iOS scheme
- **Result:** watchOS app cannot reach TestFlight

### Target architecture (this story)

```
myLoyaltyCards/
├── targets/
│   └── watch/                              ← watchOS source (CNG-managed)
│       ├── expo-target.config.js           ← @bacons/apple-targets config
│       ├── MyLoyaltyCardsWatchApp.swift
│       ├── ContentView.swift
│       ├── CardListView.swift
│       ├── CardRowView.swift
│       ├── BarcodeFlashView.swift
│       ├── BarcodeGenerator.swift
│       ├── ColorHelpers.swift
│       ├── ComplicationProvider.swift
│       ├── WatchCardEntity.swift
│       └── Assets.xcassets/
├── app.json                                ← Plugin registered
├── ios/                                    ← expo prebuild now includes watch target
│   ├── myLoyaltyCards.xcodeproj            ← Has "watch" target + "Embed Watch Content" phase
│   └── myLoyaltyCards.xcworkspace
└── watch-ios/                              ← REMOVED (migrated to targets/watch/)
```

After `expo prebuild --clean`, the iOS Xcode project automatically includes:

- A native watchOS target (`watch`, `com.apple.product-type.application`)
- Correct build settings: `SDKROOT: watchos`, `TARGETED_DEVICE_FAMILY: 4`, `WATCHOS_DEPLOYMENT_TARGET`
- An "Embed Watch Content" copy phase on the main iOS target
- Source files linked from `targets/watch/`
- Signing configured per the target config

When Fastlane runs `fastlane ios beta` and archives the `myLoyaltyCards` scheme, the archive automatically includes the embedded watchOS binary. **One upload → both apps in TestFlight.**

---

## Prerequisites

| #   | Prerequisite                                                     | Status               |
| --- | ---------------------------------------------------------------- | -------------------- |
| 1   | Watch App ID registered (`com.iferoporefi.myloyaltycards.watch`) | ✅ Done              |
| 2   | match development profile for watch bundle ID                    | ✅ Done              |
| 3   | match appstore profile for watch bundle ID                       | ✅ Done              |
| 4   | GitHub secrets (same team/API key as iOS)                        | ✅ No changes needed |

---

## Acceptance Criteria

### AC1: Install and configure `@bacons/apple-targets`

- [x] Package `@bacons/apple-targets` is installed via `npx expo install @bacons/apple-targets`
- [x] Plugin is registered in `app.json` under `plugins` array
- [x] Plugin configuration points to `./targets` directory

### AC2: Migrate watchOS source to `targets/watch/`

- [x] Directory `targets/watch/` exists at project root
- [x] All Swift source files from `watch-ios/MyLoyaltyCardsWatch/` are moved to `targets/watch/`:
  - `MyLoyaltyCardsWatchApp.swift`
  - `ContentView.swift`
  - `CardListView.swift`
  - `CardRowView.swift` (if exists)
  - `BarcodeFlashView.swift`
  - `BarcodeGenerator.swift`
  - `ColorHelpers.swift`
  - `ComplicationProvider.swift`
  - `WatchCardEntity.swift`
- [x] `Assets.xcassets/` (AccentColor, app icon) moved to `targets/watch/`
- [x] `expo-target.config.js` created with correct configuration (see Tech Notes)
- [x] The `@main` entry point (`MyLoyaltyCardsWatchApp.swift`) remains the app entry

### AC3: `expo prebuild --clean` generates correct Xcode project

- [x] Running `npx expo prebuild --clean --platform ios` produces an iOS Xcode project that includes:
  - A native target named `watch` (or the configured name) with `productType: com.apple.product-type.application`
  - Build settings: `SDKROOT: watchos`, `TARGETED_DEVICE_FAMILY: 4`, `WATCHOS_DEPLOYMENT_TARGET: 10.0`
  - Source files linked from `targets/watch/`
- [x] The main iOS target (`myLoyaltyCards`) has an "Embed Watch Content" copy files build phase
- [x] The watch target's `PRODUCT_BUNDLE_IDENTIFIER` is `com.iferoporefi.myloyaltycards.watch`

### AC4: Fastlane `beta` lane signs and builds both targets

- [x] `fastlane ios beta` lane is updated to also:
  - Fetch match `appstore` profile for BOTH `com.iferoporefi.myloyaltycards` AND `com.iferoporefi.myloyaltycards.watch`
  - Apply `update_code_signing_settings` for the watch target in the iOS Xcode project (separate call with watch bundle ID, profile name, and xcodeproj path)
- [ ] The archive produced by `build_app` contains both the iOS app and the embedded watchOS app
- [ ] `upload_to_testflight` uploads the combined archive successfully

### AC5: Fastlane `adhoc` and `upload_release` lanes updated

- [x] `fastlane ios adhoc` lane updated with watch target signing (match adhoc for watch bundle ID + `update_code_signing_settings`)
- [x] `fastlane ios upload_release` lane updated with watch target signing (match appstore for watch bundle ID + `update_code_signing_settings`)
- [ ] Both lanes produce archives containing iOS + watchOS

### AC6: Update `watchos-tests.yml` and test scripts

- [x] `watchos-tests.yml` workflow path trigger updated from `watch-ios/**` to `targets/watch/**`
- [x] `test:watchos` script in `package.json` updated to build from the new location:
  - **Option A (preferred):** Run tests via `expo prebuild` output: `xcodebuild test -project ios/myLoyaltyCards.xcodeproj -scheme watch ...`
  - **Option B:** If the watch target's test setup requires a standalone project, keep a lightweight project file for testing only
- [x] `watch:build` and `watch:run` scripts updated or removed depending on new workflow
- [ ] All existing watchOS tests pass

### AC7: Remove old `watch-ios/` directory

- [x] `watch-ios/MyLoyaltyCardsWatch.xcodeproj` removed (no longer needed — Xcode project is generated by prebuild)
- [x] `watch-ios/MyLoyaltyCardsWatch/` source files removed (migrated to `targets/watch/`)
- [x] `watch-ios/__tests__/` tests migrated or adapted to new path
- [x] `watch-ios/README.md` content merged into updated docs
- [x] `watch-ios/Generated/`, `watch-ios/build/` removed
- [x] No references to `watch-ios/` remain in:
  - `package.json` scripts
  - GitHub Actions workflows (`.github/workflows/`)
  - `docs/cicd.md`
  - Any import paths or configuration files

### AC8: Smoke test — TestFlight upload

- [ ] Tag an RC (e.g., `v1.0.0-rc.1`)
- [ ] `beta-releases.yml` workflow triggers and completes successfully
- [ ] `expo prebuild --platform ios` step generates project with watch target
- [ ] `fastlane ios beta` step archives both apps and uploads to TestFlight
- [ ] In App Store Connect → TestFlight → the iOS build shows the watchOS companion
- [ ] watchOS app is installable on a paired Apple Watch from TestFlight

### AC9: Local development workflow preserved

- [x] Developers can still run the watchOS app in the simulator:
  - `npx expo prebuild --platform ios` → open `ios/myLoyaltyCards.xcworkspace` in Xcode → select watch scheme → run on watch simulator
  - OR a simplified script in `package.json` that does this
- [x] Developers can still edit Swift source files in `targets/watch/` and changes are reflected immediately (files are linked, not copied)
- [x] `watch-ios/README.md` guidance is replaced with updated instructions

---

## Tasks / Subtasks

### T1: Install `@bacons/apple-targets` (AC1)

```bash
npx expo install @bacons/apple-targets
```

Register in `app.json`:

```jsonc
{
  "plugins": [
    // ... existing plugins ...
    "@bacons/apple-targets"
  ]
}
```

### T2: Create `targets/watch/expo-target.config.js` (AC2)

```js
/** @type {import('@bacons/apple-targets/app.plugin').Config} */
module.exports = {
  type: 'watch',
  name: 'MyLoyaltyCardsWatch',
  bundleIdentifier: '.watch', // Appended to main bundle → com.iferoporefi.myloyaltycards.watch
  deploymentTarget: '10.0', // Match current watchOS minimum from README
  icon: './Assets.xcassets/AppIcon.appiconset', // Or reference app icon
  colors: {
    $accent: 'steelblue' // Match current AccentColor.colorset value
  },
  frameworks: ['SwiftUI', 'SwiftData', 'WatchConnectivity'],
  entitlements: {
    // Add App Groups if WatchConnectivity shared data needs it
    // "com.apple.security.application-groups": ["group.com.iferoporefi.myloyaltycards"]
  }
};
```

**Note:** The exact config values must be verified by the dev agent during implementation. The `icon`, `colors`, and `entitlements` fields should match what exists in the current `watch-ios/` project's asset catalog and entitlements.

### T3: Migrate source files (AC2)

```bash
# Create target directory
mkdir -p targets/watch

# Move Swift source files
mv watch-ios/MyLoyaltyCardsWatch/*.swift targets/watch/

# Move asset catalog
cp -r watch-ios/MyLoyaltyCardsWatch/Assets.xcassets targets/watch/

# Move Preview Content if needed
cp -r watch-ios/MyLoyaltyCardsWatch/Preview\ Content targets/watch/ 2>/dev/null
```

### T4: Verify prebuild output (AC3)

```bash
npx expo prebuild --clean --platform ios
```

Then verify:

1. `ios/myLoyaltyCards.xcodeproj` contains a watch target
2. Build settings are correct (`SDKROOT: watchos`, etc.)
3. "Embed Watch Content" phase exists on main target
4. Source files are linked from `targets/watch/`

### T5: Update Fastlane lanes (AC4, AC5)

The critical change: Fastlane must sign BOTH the iOS app AND the watchOS target. The watchOS target is now embedded in the same Xcode project, so we need:

1. **Additional `match` call** for the watch bundle ID
2. **Additional `update_code_signing_settings` call** for the watch target

**Example for `beta` lane (architect guidance):**

```ruby
desc "Build and upload to TestFlight"
lane :beta do
  api_key = app_store_connect_api_key(...)

  # Sign iOS app
  match(type: "appstore", app_identifier: app_identifier, readonly: is_ci)
  update_code_signing_settings(
    use_automatic_signing: false,
    path: "ios/myLoyaltyCards.xcodeproj",
    team_id: ENV['FASTLANE_TEAM_ID'],
    profile_name: "match AppStore #{app_identifier}",
    code_sign_identity: "iPhone Distribution",
    targets: ["myLoyaltyCards"]  # Explicit target
  )

  # Sign watchOS app
  watch_identifier = "#{app_identifier}.watch"
  match(type: "appstore", app_identifier: watch_identifier, readonly: is_ci)
  update_code_signing_settings(
    use_automatic_signing: false,
    path: "ios/myLoyaltyCards.xcodeproj",
    team_id: ENV['FASTLANE_TEAM_ID'],
    profile_name: "match AppStore #{watch_identifier}",
    code_sign_identity: "iPhone Distribution",
    targets: ["watch"]  # Target name from @bacons/apple-targets (verify after T4)
  )

  # Build number
  last_build = latest_testflight_build_number(app_identifier: app_identifier, api_key: api_key)
  increment_build_number(
    xcodeproj: "ios/myLoyaltyCards.xcodeproj",
    build_number: (last_build.to_i + 1).to_s
  )

  # Archive — will include embedded watchOS app automatically
  build_app(
    scheme: "myLoyaltyCards",
    workspace: "ios/myLoyaltyCards.xcworkspace",
    export_method: "app-store",
    output_directory: "output",
    xcargs: "DEVELOPMENT_TEAM='#{ENV['FASTLANE_TEAM_ID']}'"
  )

  upload_to_testflight(api_key: api_key)
end
```

**Same pattern must be applied to `adhoc` and `upload_release` lanes.**

**Architect note (Winston):** The `targets:` parameter in `update_code_signing_settings` is critical — without it, Fastlane applies the iOS profile to ALL targets including the watch, which will cause a signing mismatch. The exact target name (e.g., `"watch"`, `"MyLoyaltyCardsWatch"`) depends on what `@bacons/apple-targets` names the target in the generated project. **Verify the target name after T4 (prebuild) before implementing.**

### T6: Update CI workflows and test scripts (AC6)

**`watchos-tests.yml`:**

```yaml
paths:
  - 'targets/watch/**' # was: watch-ios/**
  - 'ios/**'
```

**`package.json` scripts:**

- `test:watchos`: Update to use the prebuild-generated project or a test-specific approach
- `watch:build` / `watch:run`: Update or replace with prebuild-based workflow

**Dev note (Amelia):** The `test:watchos` script currently points to `watch-ios/MyLoyaltyCardsWatch.xcodeproj`. After migration, the tests need to target either:

- The prebuild-generated project: `xcodebuild test -workspace ios/myLoyaltyCards.xcworkspace -scheme watch -destination 'platform=watchOS Simulator,...'`
- Or if the watch target has tests configured in the generated project

If `@bacons/apple-targets` doesn't copy test files into the generated project, we may need a dedicated test approach. Investigate during T4.

### T7: Remove `watch-ios/` (AC7)

```bash
rm -rf watch-ios/
```

Update all references across the codebase. Do a global search for `watch-ios` to catch stragglers.

### T8: Smoke test (AC8)

1. Push to a feature branch, verify CI quality gates pass
2. After merge, tag `v1.0.0-rc.1`
3. Monitor `beta-releases.yml` in GitHub Actions
4. Verify both apps appear in TestFlight

### T9: Update local dev workflow (AC9)

Write updated instructions for running the watchOS app locally. Add to project README or watch-specific docs section.

---

## Tech Notes

### Architecture Decision (Winston — Architect)

**Why `@bacons/apple-targets` and not manual Xcode project manipulation:**

1. **CNG compatibility:** `expo prebuild --clean` wipes `ios/`. Any manual changes to the Xcode project are lost. `@bacons/apple-targets` hooks into the prebuild pipeline as a config plugin, so the watch target is regenerated every time.

2. **Single archive:** When the watch target is embedded in the iOS Xcode project, `xcodebuild archive` automatically includes the watchOS binary in the `*.xcarchive`. Fastlane's `build_app` and `upload_to_testflight` handle the combined archive natively — no extra steps needed.

3. **Signing consistency:** Both targets live in the same Xcode project, so Fastlane can sign both with separate `update_code_signing_settings` calls before the single `build_app` invocation.

4. **Future-proof:** Adding watch complications (`type: "watch-widget"`) or other Apple targets (widgets, intents) follows the same pattern — add a new `targets/<name>/expo-target.config.js` and source files. No pipeline changes.

### Implementation Notes (Amelia — Dev)

1. **`@main` entry point:** The watch app's `MyLoyaltyCardsWatchApp.swift` uses `@main`. Verify that `@bacons/apple-targets` correctly handles this. The iOS and watch targets are separate, so the `@main` attribute shouldn't conflict.

2. **SwiftData model:** `WatchCardEntity` uses `@Model` from SwiftData. Ensure SwiftData framework is included in the target config's `frameworks` array. The model container setup in `MyLoyaltyCardsWatchApp.swift` should work unchanged.

3. **BarcodeGenerator.swift** uses conditional imports (`#if canImport(WatchKit)` / `#if canImport(UIKit)`). This should work fine since the target's `SDKROOT` is `watchos`, so `WatchKit` will be available and `UIKit` won't.

4. **`increment_build_number` scope:** Fastlane's `increment_build_number` targets the `xcodeproj`. Verify it increments the build number for ALL targets in the project, or if we need separate calls for the iOS and watch targets. If `@bacons/apple-targets` sets the watch target's build number independently, we may need `increment_build_number` with a `target:` parameter.

5. **`export_options.plist`:** When archiving with `build_app`, Xcode may require an `exportOptions.plist` that includes provisioning profiles for both the iOS app and the watch app. Fastlane's `match` + `update_code_signing_settings` usually handles this, but verify during T5. If needed, pass `export_options` to `build_app`:

   ```ruby
   build_app(
     ...
     export_options: {
       provisioningProfiles: {
         "com.iferoporefi.myloyaltycards" => "match AppStore com.iferoporefi.myloyaltycards",
         "com.iferoporefi.myloyaltycards.watch" => "match AppStore com.iferoporefi.myloyaltycards.watch"
       }
     }
   )
   ```

6. **`watch-ios/__tests__/generate-catalogue.test.ts`:** This is a TypeScript test — NOT a Swift test. It likely generates/validates catalogue data for the watch. Migrate to an appropriate test location (e.g., `targets/watch/__tests__/` or `core/catalogue/`).

### What Does NOT Change

- **GitHub Actions workflows:** `beta-releases.yml` and `store-upload.yml` do NOT need new jobs or workflows. The existing `ios-testflight-beta` and `upload-ios-release` jobs already run `expo prebuild` + `fastlane ios beta/upload_release`. Once the plugin is configured and lanes are updated, the watch app is automatically included in the same build.
- **React Native Watch Connectivity:** `react-native-watch-connectivity` operates at the iOS app level (JavaScript bridge). It remains unchanged.
- **Supabase / auth / core logic:** Zero impact on the app's business logic.
- **Android:** Zero impact on Android builds or workflows.

### Risk: `@bacons/apple-targets` compatibility

- Package is at v4.0.6, requires Expo ≥52 (we have Expo 54) ✅
- Maintained by Evan Bacon (Expo team member)
- Has comprehensive e2e tests including `type: "watch"` target
- If the plugin doesn't work as expected, the fallback is a custom Expo config plugin that performs the same Xcode project manipulation. The `@bacons/apple-targets` source code is well-documented and can be referenced.

---

## Definition of Ready Checklist

| #   | Gate               | Status                                                                              |
| --- | ------------------ | ----------------------------------------------------------------------------------- |
| 1   | Design Approved    | N/A (CI/CD infrastructure story)                                                    |
| 2   | Story Spec Final   | ✅ This document (PM + Architect + Dev input)                                       |
| 3   | Interaction Spec   | N/A (no UI changes)                                                                 |
| 4   | Dependencies Clear | ✅ match provisioning done, no blocking stories                                     |
| 5   | Edge Cases Defined | ✅ Signing for multiple targets, export options, build number scope, test migration |
| 6   | Tech Notes         | ✅ Architect + Dev notes above                                                      |
| 7   | Testability        | ✅ AC3 (prebuild verification), AC6 (tests pass), AC8 (TestFlight smoke test)       |

---

## Definition of Done Checklist

| #   | Gate                   | Verification                                   |
| --- | ---------------------- | ---------------------------------------------- |
| 1   | All ACs pass           | Each AC checked off                            |
| 2   | Code review approved   | Dev agent review with APPROVED                 |
| 3   | QA review approved     | QA verifies TestFlight build installs on watch |
| 4   | Tests pass             | `yarn test:all` green, watchOS tests green     |
| 5   | Lint & typecheck clean | `yarn lint && yarn typecheck` zero errors      |
| 6   | PR merged              | Stakeholder (ifero) approves and merges        |
| 7   | Sprint status updated  | 11-6 → done in sprint-status.yaml              |
| 8   | No known defects       | No open bugs from this change                  |
