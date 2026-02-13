# Story 5.2: Generate Catalogue for watchOS

## Story Information

| Field        | Value                                                   |
| ------------ | ------------------------------------------------------- |
| **Story ID** | 5.2                                                     |
| **Epic**     | 5 - Apple Watch App                                     |
| **Sprint**   | 4                                                       |
| **Status**   | Done                                                    |
| **Priority** | High                                                    |
| **Estimate** | Small (0.5-1 day)                                       |
| **Owners**   | PM: John · UX: Sally · Dev: Amelia · Tech Writer: Paige |

---

## User Story

**As a** developer,
**I want** the Italian catalogue available as Swift code at build time,
**So that** the watch app can resolve brand logos for synced cards without runtime JSON parsing.

---

## Acceptance Criteria

### AC1: Code Generation

```gherkin
Given /catalogue/italy.json exists
When I run the watch catalogue generation step
Then it produces watch-ios/Generated/Brands.swift
And the file contains all brand entries with id and logoUrl (name/aliases optional)
```

### AC2: Build Integration

```gherkin
Given I build the watch app
When the build runs
Then the generation step executes before compilation
And the app compiles using the generated Brands.swift file
And there is no catalogue browsing UI on watchOS
```

### AC3: Git Hygiene

```gherkin
Given Brands.swift is generated
Then it is ignored by git
And the Generated/ folder is not committed
```

---

## Technical Requirements

- Add a generation script in watch-ios/Scripts/generate-catalogue.swift
- Output path: watch-ios/Generated/Brands.swift
- Ensure the script reads /catalogue/italy.json from repo root
- Add Generated/ to gitignore
- Add a build phase in the watchOS target to run the script
- Use catalogue data only to map brandId → logo for synced cards (no browsing UI)

Testing notes:

- Validate that all brands in italy.json appear in Brands.swift
- Ensure the build succeeds when Generated/ is absent

---

## Tasks/Subtasks

- [x] Create generate-catalogue.swift script
- [x] Add Xcode build phase to run script
- [x] Add watch-ios/Generated/ to gitignore
- [x] Verify generated file compiles in watch app

---

## Testing Checklist

- [x] Generated file matches italy.json content
- [x] Clean build works without pre-generated files
- [x] Watch app compiles with generated data

---

## Definition of Done

- [x] All acceptance criteria pass
- [x] Build-time generation works in a clean clone
- [x] Generated files are not committed

---

## Dev Agent Record

### Debug Log

- Added Jest coverage for generator behavior and Xcode integration assertions.
- Implemented Swift generator script at watch-ios/Scripts/generate-catalogue.swift.
- Updated watchOS project build phases to generate watch-ios/Generated/Brands.swift before compilation.
- Fixed build phase Swift invocation to use macOS SDK via xcrun inside Xcode script environment.

### Completion Notes

- AC1: `catalogue/italy.json` now generates `watch-ios/Generated/Brands.swift` with brand `id` and derived `logoUrl`, plus optional `name` and `aliases`.
- AC2: Xcode target now runs `Generate Watch Catalogue` pre-build script and compiles generated `Brands.swift` from `watch-ios/Generated`.
- AC3: `watch-ios/Generated` is ignored in `.gitignore`.
- Validation: story-specific tests pass, full suite passes (372), lint passes, and clean watch build succeeds when `watch-ios/Generated` is absent.

## File List

- .gitignore
- docs/sprint-artifacts/stories/5-2-generate-catalogue-for-watchos.md
- watch-ios/MyLoyaltyCardsWatch.xcodeproj/project.pbxproj
- watch-ios/Scripts/generate-catalogue.swift
- watch-ios/**tests**/generate-catalogue.test.ts

## Change Log

- 2026-02-13: Implemented watchOS catalogue generation pipeline, integrated pre-build Xcode script phase, added automated tests, and marked story ready for review.
