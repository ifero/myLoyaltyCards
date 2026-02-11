# Story 5.2: Generate Catalogue for watchOS

## Story Information

| Field        | Value                                                   |
| ------------ | ------------------------------------------------------- |
| **Story ID** | 5.2                                                     |
| **Epic**     | 5 - Apple Watch App                                     |
| **Sprint**   | 4                                                       |
| **Status**   | ready-for-dev                                           |
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

- [ ] Create generate-catalogue.swift script
- [ ] Add Xcode build phase to run script
- [ ] Add watch-ios/Generated/ to gitignore
- [ ] Verify generated file compiles in watch app

---

## Testing Checklist

- [ ] Generated file matches italy.json content
- [ ] Clean build works without pre-generated files
- [ ] Watch app compiles with generated data

---

## Definition of Done

- [ ] All acceptance criteria pass
- [ ] Build-time generation works in a clean clone
- [ ] Generated files are not committed
