# Story 9.4: Sync Sorting to Watch

Status: review

## Story

As a user,
I want my watch to use the same card order,
so that my most-used and favourite cards are on top there too.

## Acceptance Criteria

1. **Given** I mark a card as favourite on the phone
   **When** the Watch syncs
   **Then** the Watch card list shows that card at the top (above non-favourites)

2. **Given** I use a card frequently on the phone (high `usageCount`)
   **When** the Watch syncs
   **Then** the Watch card list orders cards: favourites first → usageCount desc → lastUsedAt desc → createdAt desc

3. **Given** an existing Watch payload (before this story)
   **When** the Watch receives a new payload that includes `isFavorite`
   **Then** the Watch correctly decodes and applies `isFavorite` without crashing

4. **Given** a payload that does NOT include `isFavorite` (old format, backward compat)
   **When** the Watch decodes it
   **Then** `isFavorite` defaults to `false` (no crash, no data loss)

5. **Given** the Watch updates a card it already has stored (SwiftData entity exists)
   **When** an incoming payload sets `isFavorite: true`
   **Then** the stored `WatchCardEntity.isFavorite` is updated to `true`

6. **Given** a synced card has `isFavorite: true`
   **When** I view the Watch card list
   **Then** the row shows a favourite indicator (star/pin badge), visually consistent with the phone's star
   _(Added 2026-06-09 via correct-course — C3 folded into 9.4)_

## Tasks / Subtasks

### Phone side — `core/watch-connectivity.ts`

- [x] Add `isFavorite: boolean` to the `WatchCardPayload` interface (AC: 1, 3)
- [x] Include `isFavorite: card.isFavorite` in `toBaseWatchCardPayload()` (AC: 1, 3)
- [x] Update `watch-connectivity.test.ts` to assert `isFavorite` is present in the serialized payload

### Watch side — `targets/watch/CardListView.swift`

- [x] Add `var isFavorite: Bool = false` to `WatchCard` struct (AC: 3, 4)
- [x] Add `isFavorite` to `WatchCard.CodingKeys` enum
- [x] Decode: `isFavorite = try container.decodeIfPresent(Bool.self, forKey: .isFavorite) ?? false` in `init(from decoder:)` (AC: 4)
- [x] Encode: `try container.encode(isFavorite, forKey: .isFavorite)` in `encode(to encoder:)` (AC: 3)
- [x] Add `isFavorite` parameter to `WatchCard.init(...)` with default `false`
- [x] Update `migrateUserDefaults`: use `isFavorite: c.isFavorite` instead of `isFavorite: false` when creating `WatchCardEntity`
- [x] Update `displayCards` computed var sort closure to add `isFavorite` as top tier (AC: 1, 2):
  ```swift
  return entities.sorted { a, b in
    if a.isFavorite != b.isFavorite { return a.isFavorite }
    if a.usageCount != b.usageCount { return a.usageCount > b.usageCount }
    if let aLast = a.lastUsedAt, let bLast = b.lastUsedAt, aLast != bLast {
      return aLast > bLast
    }
    return a.createdAt > b.createdAt
  }
  ```
- [x] Update the matching sort in `migrateUserDefaults` (the `topCardName` calculation) to also include `isFavorite` tier

### Watch side — `targets/watch/WatchSessionManager.swift`

- [x] In `upsert()` update-existing-entity branch: add `entity.isFavorite = card.isFavorite` (AC: 5)
- [x] In `upsert()` insert-new-entity branch: use `isFavorite: card.isFavorite` instead of `isFavorite: false` (AC: 3)

### Tests — `watch-ios/Tests/CardStoreTests.swift`

- [x] Add test: `WatchCard` decodes `isFavorite: true` from payload correctly
- [x] Add test: `WatchCard` defaults `isFavorite` to `false` when field is absent (backward compat)
- [x] Add test: `upsert` updates `entity.isFavorite` when payload changes it

### Watch favourite indicator — `targets/watch/CardListView.swift` (C3 — folded in 2026-06-09)

- [x] Add a compact favourite badge (`star.fill`) to `CardRowView`, shown when `card.isFavorite` is true — trailing edge, legible at 49mm and below (AC: 6)
- [x] Favourite-aware accessibility label via `cardRowAccessibilityKey(isFavorite:)` + new `watch.card_row.favorite_accessibility_format` key (en + it); unit-tested in `CardRowHelpersTests` (no SwiftUI snapshot harness on the watch target — the badge is driven 1:1 by the same `card.isFavorite`)
- [x] Re-run dev + QA review after the badge lands — Sonnet code review APPROVED (0 comments) + QA APPROVED (0 comments), 2026-06-09

## Dev Notes

### Why `isFavorite` is missing today

The `WatchCardPayload` interface in `core/watch-connectivity.ts` (line ~110) was defined before Story 9.2 added the favourite feature. It includes `usageCount` and `lastUsedAt` but not `isFavorite`. The Watch-side `WatchCard` struct mirrors this gap. This story closes both gaps simultaneously.

### Exact changes in `core/watch-connectivity.ts`

**Interface** (add one field):

```ts
export interface WatchCardPayload {
  id: string;
  name: string;
  brandId: string | null;
  colorHex: string;
  barcodeValue: string;
  barcodeFormat: string;
  barcodeImageBase64?: string | null;
  usageCount: number;
  lastUsedAt: string | null;
  createdAt: string;
  isFavorite: boolean; // ← ADD THIS
}
```

**`toBaseWatchCardPayload`** (add one field):

```ts
function toBaseWatchCardPayload(card: LoyaltyCard): WatchCardPayload {
  return {
    id: card.id,
    name: card.name,
    brandId: card.brandId,
    colorHex: card.color,
    barcodeValue: card.barcode,
    barcodeFormat: card.barcodeFormat,
    usageCount: card.usageCount ?? 0,
    lastUsedAt: card.lastUsedAt ?? null,
    createdAt: card.createdAt,
    isFavorite: card.isFavorite // ← ADD THIS
  };
}
```

### Exact changes in `WatchCard` struct (`targets/watch/CardListView.swift`)

Add `isFavorite` alongside the other sorting fields (around line 17):

```swift
var usageCount: Int = 0
var lastUsedAt: Date? = nil
var createdAt: Date = Date()
var isFavorite: Bool = false  // ← ADD
```

Add to `init(...)`:

```swift
init(
  id: String,
  name: String,
  ...
  usageCount: Int = 0,
  lastUsedAt: Date? = nil,
  createdAt: Date = Date(),
  isFavorite: Bool = false   // ← ADD
) {
  ...
  self.isFavorite = isFavorite   // ← ADD
}
```

Add to `CodingKeys`:

```swift
case id, name, brandId, colorHex, barcodeValue, barcodeFormat,
     barcodeImageBase64, usageCount, lastUsedAt, createdAt, isFavorite  // ← ADD isFavorite
```

Add to `init(from decoder:)`:

```swift
isFavorite = try container.decodeIfPresent(Bool.self, forKey: .isFavorite) ?? false
```

Add to `encode(to encoder:)`:

```swift
try container.encode(isFavorite, forKey: .isFavorite)
```

### Exact changes in `WatchSessionManager.upsert()` (`targets/watch/WatchSessionManager.swift`)

Update-existing entity block (around line 170):

```swift
entity.usageCount = card.usageCount
entity.lastUsedAt = card.lastUsedAt
entity.createdAt = card.createdAt
entity.isFavorite = card.isFavorite  // ← ADD (was missing entirely)
entity.updatedAt = Date()
entity.rawPayload = raw
```

Insert-new entity block — change `isFavorite: false` to `isFavorite: card.isFavorite`.

### Exact change in `displayCards` sort (`CardListView.swift` ~line 380)

Current:

```swift
return entities.sorted { a, b in
  if a.usageCount != b.usageCount { return a.usageCount > b.usageCount }
  if let aLast = a.lastUsedAt, let bLast = b.lastUsedAt, aLast != bLast {
    return aLast > bLast
  }
  return a.createdAt > b.createdAt
}
```

After:

```swift
return entities.sorted { a, b in
  if a.isFavorite != b.isFavorite { return a.isFavorite }   // ← ADD tier 0
  if a.usageCount != b.usageCount { return a.usageCount > b.usageCount }
  if let aLast = a.lastUsedAt, let bLast = b.lastUsedAt, aLast != bLast {
    return aLast > bLast
  }
  return a.createdAt > b.createdAt
}
```

Apply the same change to the `topCardName` sort in `migrateUserDefaults` (same file, ~line 182).

### Backward compatibility

`decodeIfPresent` with `?? false` default ensures payloads without `isFavorite` (e.g., cached on-device payloads before this story ships) decode cleanly. No migration needed.

### SwiftData complication fields

`WatchCardEntity` already has `isFavorite: Bool = false` (added in a prior story). The only missing piece is the mapper in `upsert()` not writing it. This story fixes that.

### Project Structure Notes

| Layer | File                                      | Change                                        |
| ----- | ----------------------------------------- | --------------------------------------------- |
| Phone | `core/watch-connectivity.ts`              | Add `isFavorite` to interface + mapper        |
| Watch | `targets/watch/CardListView.swift`        | Add `isFavorite` to `WatchCard` struct + sort |
| Watch | `targets/watch/WatchSessionManager.swift` | Map `isFavorite` in `upsert()`                |
| Tests | `core/watch-connectivity.test.ts`         | Assert `isFavorite` in payload                |
| Tests | `watch-ios/Tests/CardStoreTests.swift`    | Decode + upsert tests                         |

### References

- Payload type: [core/watch-connectivity.ts](../../../core/watch-connectivity.ts) — `WatchCardPayload` interface + `toBaseWatchCardPayload()`
- Watch card model: [targets/watch/CardListView.swift](../../../targets/watch/CardListView.swift) — `WatchCard` struct + `displayCards` sort
- Watch session: [targets/watch/WatchSessionManager.swift](../../../targets/watch/WatchSessionManager.swift) — `upsert()` method
- Watch entity: [targets/watch/WatchCardEntity.swift](../../../targets/watch/WatchCardEntity.swift) — `isFavorite` already exists here ✅
- Watch tests: [watch-ios/Tests/CardStoreTests.swift](../../../watch-ios/Tests/CardStoreTests.swift)

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Amelia / dev-story workflow)

### Debug Log References

- TS: `jest core/watch-connectivity.test.ts` — drove red→green for the payload mapper.
- Full TS suite: 150 suites / 1469 tests pass (rebased on main incl. Story 9.3); `tsc --noEmit` clean; `eslint` clean on changed files.
- Swift: `swiftc -parse` clean on all modified `.swift` files (syntax). The watchOS Swift XCTest
  bundle (`watch-ios/Tests`) is not locally executable here (no `ios/` workspace) **and is not run
  in CI either** — `watch:build:ci` does `xcodebuild build` (not `test`), per Story 11-6. So these
  Swift XCTests are syntax-checked via `swiftc -parse` here and run in Xcode / `yarn test:all`
  locally. The watch **contract tests** (TS, `targets/watch/__tests__`) DO run in CI
  (`watchos-tests.yml`) and pass (32/32).

### Completion Notes List

Implemented `isFavorite` end-to-end so the Watch mirrors the phone's favourite-first ordering.

- **AC1/AC2** — Added `isFavorite` as the top sort tier (`favourites → usageCount desc →
lastUsedAt desc → createdAt desc`) in `CardListView.displayCards`.
- **AC3** — Phone payload now carries `isFavorite` (`WatchCardPayload` + `toBaseWatchCardPayload`);
  Watch `WatchCard` struct decodes/encodes it via `CodingKeys`.
- **AC4** — Watch decode uses `decodeIfPresent(...) ?? false`, so pre-9.4 payloads (no
  `isFavorite`) decode without crashing and default to `false`.
- **AC5** — `WatchSessionManager.upsert()` now writes `entity.isFavorite = card.isFavorite` on the
  update-existing branch and `isFavorite: card.isFavorite` on insert.

**Additions beyond the literal task list (same story intent):**

1. Extracted the 4-tier sort comparator into a single `WatchCard.sortedForDisplay(_:)` (one source
   of truth) and routed all three surfaces through it: `CardListView.displayCards`,
   `migrateUserDefaults` topCardName, and `WatchSessionManager.upsert` topCardName. Previously the
   comparator was duplicated three times (a drift risk); the story explicitly updated two copies, so
   the third (the primary runtime path that drives the complication "top card") had to match — and
   centralising removes the duplication entirely and makes the ordering directly unit-testable.
2. `CardListView.displayCards` entity→`WatchCard` fallback mapping — added `isFavorite: e.isFavorite`
   so the sort still honours the persisted entity's favourite flag when `rawPayload` is
   missing/undecodable (otherwise the fallback path would always sort as non-favourite).

**Test coverage:** TS — payload asserts `isFavorite` (existing exact-match tests) + a dedicated
`isFavorite: true` forwarding test. Swift — decode `true` (AC3), decode-absent default `false` (AC4),
encode round-trip (AC3), `upsert` sets favourite true→ and clears true→false on an existing entity
(AC5), migration carries `isFavorite` through `migrateUserDefaults`, an integration check that the
upsert path persists the favourite as the complication top card, and a direct full-tier ordering
test on `sortedForDisplay` covering all four tiers (AC1/AC2).

**C3 round (favourite badge, 2026-06-09):** added a `star.fill` badge to `CardRowView` (trailing,
shown when `card.isFavorite`) + a favourite-aware accessibility label via the testable
`cardRowAccessibilityKey(isFavorite:)` helper + new `watch.card_row.favorite_accessibility_format`
key (en + it), unit-tested in `CardRowHelpersTests`. **Caught a CI gap:** the
`targets/watch/__tests__/` contract suite (run by `watchos-tests.yml`; excluded by the default
`yarn test` config) asserted the old a11y-label literal — updated it + added a C3 badge/i18n
contract, and migrated three stale inline sort tests to the shared `WatchCard.sortedForDisplay`.
Verified: watch contract suite 32/32, main jest 1469, `tsc` + `eslint` clean, `swiftc -parse` clean.
Also marked one DEBUG "Import sample cards" card + one SwiftUI Preview card `isFavorite: true` so the
badge is demonstrable without a live phone sync (DEBUG/preview-only; no production impact).

### File List

- `core/watch-connectivity.ts` — add `isFavorite` to `WatchCardPayload` + `toBaseWatchCardPayload`
- `core/watch-connectivity.test.ts` — assert `isFavorite` in serialized payload (+ forwarding test)
- `targets/watch/CardListView.swift` — `WatchCard` struct/init/CodingKeys/decode/encode; new
  `WatchCard.sortedForDisplay(_:)` (favourite-first comparator, shared by all surfaces) used by
  `displayCards` + `migrateUserDefaults` topCardName; entity→card fallback mapping carries
  `isFavorite`; `migrateUserDefaults` entity uses `c.isFavorite`
- `targets/watch/WatchSessionManager.swift` — `upsert()` maps `isFavorite` (update + insert);
  topCardName calc uses the shared `sortedForDisplay`
- `watch-ios/Tests/CardStoreTests.swift` — 7 new tests + strengthened migration test (decode true /
  default false / encode / upsert true→ / upsert →false / full-tier ordering / top-card integration)
- `targets/watch/CardListView.swift` — (C3) `cardRowAccessibilityKey(isFavorite:)` helper + `star.fill`
  badge on favourite rows + favourite-aware accessibility label
- `targets/watch/en.lproj/Localizable.strings`, `it.lproj/Localizable.strings` — (C3) new
  `watch.card_row.favorite_accessibility_format` key
- `watch-ios/Tests/CardRowHelpersTests.swift` — (C3) `cardRowAccessibilityKey` tests; migrated 3 sort
  tests to `WatchCard.sortedForDisplay`
- `targets/watch/__tests__/watch-layout-contract.test.ts` — (C3) updated a11y-label assertion + added
  favourite badge/i18n contract

## Change Log

| Date       | Version | Description                                                                                                                                        | Author       |
| ---------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| 2026-06-08 | 0.1     | Implemented isFavorite sync to Watch (payload, decode, sort, upsert) + tests; status → review                                                      | Amelia (dev) |
| 2026-06-08 | 0.2     | QA round: centralised sort into `WatchCard.sortedForDisplay`; added full-tier ordering, un-favourite, encode, and migration `isFavorite` tests     | Amelia (dev) |
| 2026-06-09 | 0.3     | correct-course: C3 (watch favourite badge) folded into 9.4 — added AC6 + tasks; status review → in-progress (badge impl + re-review pending)       | Amelia (dev) |
| 2026-06-09 | 0.4     | Implemented C3: favourite badge + a11y label + helper + tests; fixed stale watch contract test (CI gap) + migrated sort tests; dev review approved | Amelia (dev) |
