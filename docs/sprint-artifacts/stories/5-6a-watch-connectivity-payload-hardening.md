# Story 5.6a: WatchConnectivity Payload Hardening

Status: review

## Story

As an Apple Watch user,
I want phone-to-watch sync payloads to respect WatchConnectivity's transport contract and preserve sorting metadata,
so that my cards sync reliably to the watch and stay ordered by usage / recency.

## Context

This bugfix follow-up was discovered during real-device watch validation after Epic 5 delivery and while closing out Sprint 12 TestFlight work.

Two defects were identified in the existing sync path introduced around Story 5.6:

1. **Invalid outbound payload types on the phone side**
   - The React Native wrapper sent dictionaries containing `null` / unsupported JS values through `WCSession.updateApplicationContext`.
   - Apple WatchConnectivity accepts only **property-list values** for `sendMessage`, `updateApplicationContext`, and `transferUserInfo`.
   - Result: native diagnostics emitted `Payload contains unsupported type.` and the watch did not receive the snapshot.

2. **Sorting metadata lost on the watch side**
   - `WatchCard` omitted `usageCount`, `lastUsedAt`, and `createdAt` from its `Codable` keys.
   - The fallback migration path from `UserDefaults` into `SwiftData` also reset those values instead of preserving them.
   - Result: even when cards arrived successfully, watch sorting could degrade to incomplete / incorrect ordering.

**Origin:** Real-device watch connectivity debugging after Epic 5 / Sprint 12 validation
**Depends on:** Story 5.6 — Sync Cards from Phone
**Related:** Story 11.6 — watchOS TestFlight pipeline (surfaced during release validation)

## Acceptance Criteria

### AC1: Property-list-safe WatchConnectivity payloads

- [x] Outbound phone-side messages are sanitized before calling `sendMessage`, `updateApplicationContext`, or `transferUserInfo`
- [x] `null` / `undefined` / unsupported nested values are omitted from outbound dictionaries
- [x] Snapshot pushes (`type: 'cards'`) no longer send unsupported values to `WCSession`
- [x] Nested one-shot messages (for example `syncCard`) are sanitized consistently

### AC2: Watch-side sorting metadata is decoded and encoded correctly

- [x] `WatchCard` decodes `usageCount`, `lastUsedAt`, and `createdAt` when present in synced payloads
- [x] `WatchCard` remains backward compatible with legacy payloads that omit those fields
- [x] `WatchCard` encodes the sorting fields back to JSON in ISO 8601 string form

### AC3: Migration preserves metadata

- [x] `CardStore.migrateUserDefaults(to:)` preserves `usageCount`, `lastUsedAt`, and `createdAt`
- [x] Legacy fallback data remains importable without crashes

### AC4: Regression coverage

- [x] JS tests cover outbound payload sanitization for snapshot and nested message payloads
- [x] watchOS unit tests cover decoding of sorting metadata from phone payloads
- [x] watchOS unit tests cover encoding of sorting metadata and migration preservation

### AC5: Validation

- [x] Targeted `core/watch-connectivity.test.ts` suite passes
- [x] Full JavaScript test suite passes
- [x] watchOS validation passes (`xcodebuild` / watch test build)

## Tasks / Subtasks

- [x] Sanitize phone-side WatchConnectivity payloads in `core/watch-connectivity.ts`
- [x] Add JS regression tests in `core/watch-connectivity.test.ts`
- [x] Restore full `Codable` coverage for sorting metadata in `targets/watch/CardListView.swift`
- [x] Preserve metadata during `UserDefaults` → `SwiftData` migration
- [x] Add watch-side regression tests in `watch-ios/Tests/CardStoreTests.swift`
- [x] Run watchOS validation and capture results in Dev Agent Record

## Dev Notes

### Files Modified

| File                                      | Purpose                                                                                   |
| ----------------------------------------- | ----------------------------------------------------------------------------------------- |
| `core/watch-connectivity.ts`              | Sanitizes outbound WatchConnectivity payloads to property-list-safe values                |
| `core/watch-connectivity.test.ts`         | JS regression tests for payload sanitization                                              |
| `targets/watch/CardListView.swift`        | Restores `WatchCard` sort-field Codable support and migration preservation                |
| `targets/watch/WatchSessionManager.swift` | Repairs existing SwiftData rows during resync so sort metadata fully refreshes on upgrade |
| `watch-ios/Tests/CardStoreTests.swift`    | watchOS regression tests for decoding, encoding, and migration                            |

### Technical Notes

- Apple `WatchConnectivity` dictionaries must contain property-list values only.
- Omitting unsupported fields is preferable to sending `NSNull`-like values into `WCSession`.
- The watch-side model must keep backward compatibility with older payloads that lacked sort metadata.

## Dev Agent Record

### Agent Model Used

GPT-5.4

### Debug Log References

- `runTests` targeted: `core/watch-connectivity.test.ts` → 25 passed, 0 failed
- `runTests` full JS suite → 1295 passed, 0 failed
- `yarn test:watchos` → build succeeded in 379.62s

### Completion Notes List

- Added recursive payload sanitization for outbound WatchConnectivity messages on the phone side.
- Fixed watch-side `WatchCard` serialization so sort metadata is no longer silently dropped.
- Updated fallback migration to preserve sorting fields instead of resetting them.
- Repaired existing SwiftData watch rows during resync so `createdAt` and other sort metadata self-heal after upgrade.
- Added regression coverage on both JavaScript and watchOS unit-test sides.
- Fixed a watchOS compile issue in `CardListView.swift` (`internetDateTimeFormatter` static initializer) discovered while running validation.

### File List

- `core/watch-connectivity.ts`
- `core/watch-connectivity.test.ts`
- `targets/watch/CardListView.swift`
- `targets/watch/WatchSessionManager.swift`
- `watch-ios/Tests/CardStoreTests.swift`
