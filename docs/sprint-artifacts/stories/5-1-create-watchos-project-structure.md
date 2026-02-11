# Story 5.1: Create watchOS Project Structure

## Story Information

| Field        | Value                                                   |
| ------------ | ------------------------------------------------------- |
| **Story ID** | 5.1                                                     |
| **Epic**     | 5 - Apple Watch App                                     |
| **Sprint**   | 4                                                       |
| **Status**   | ready-for-dev                                           |
| **Priority** | High                                                    |
| **Estimate** | Medium (1-2 days)                                       |
| **Owners**   | PM: John · UX: Sally · Dev: Amelia · Tech Writer: Paige |

---

## User Story

**As a** developer,
**I want** a properly structured watchOS project in the repo,
**So that** the Apple Watch companion app can be built and maintained independently as a companion-only experience.

---

## Acceptance Criteria

### AC1: Project Structure

```gherkin
Given the existing Expo project
When I add the watchOS companion app
Then a new /watch-ios/ folder exists at repo root
And the watch app builds using standard Xcode tooling
And the app is documented as companion-only (no card creation on watch)
And the project targets watchOS 10+ (or the minimum needed for SwiftData)
```

### AC2: Documentation

```gherkin
Given the /watch-ios/ folder exists
Then /watch-ios/README.md clearly states this is native Swift/SwiftUI, not React Native
And it includes build instructions, dependencies, and simulator setup steps
```

### AC3: Build Integration

```gherkin
Given the watch project is added
When I open the workspace in Xcode
Then the watch app target builds without manual fixes
And the target compiles with default configs (Debug/Release)
```

---

## Technical Requirements

- Create folder structure: watch-ios/ with an Xcode watchOS project (Swift/SwiftUI)
- Add a README that documents:
  - Native Swift/SwiftUI stack
  - Xcode version requirements
  - How to run on simulator/device
  - Relationship to the phone app (sync via WatchConnectivity)
  - Companion-only behavior (read-only, no card creation)
- Ensure project follows Apple naming conventions and is scoped to watchOS target only
- No React Native code in watch-ios/ (pure Swift/SwiftUI)

Testing notes:

- Add a minimal build check in CI or document manual build steps for now
- Verify the watch app launches to a placeholder screen

---

## Tasks/Subtasks

- [ ] Create watch-ios/ project using Xcode
- [ ] Add watch-ios/README.md with build instructions
- [ ] Verify build in simulator (Apple Watch Series 9 45mm)
- [ ] Ensure no RN dependencies leak into watch-ios/

---

## Testing Checklist

- [ ] watchOS app builds in Xcode
- [ ] App launches on simulator
- [ ] README provides clear setup steps

---

## Definition of Done

- [ ] All acceptance criteria pass
- [ ] watch-ios/ project builds in Xcode with no manual fixes
- [ ] Documentation complete and accurate
