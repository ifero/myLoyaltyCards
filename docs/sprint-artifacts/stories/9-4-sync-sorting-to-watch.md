# Story 9.4: Sync Sorting to Watch

Status: ready-for-dev

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

## Tasks / Subtasks

### Phone side — `core/watch-connectivity.ts`

- [ ] Add `isFavorite: boolean` to the `WatchCardPayload` interface (AC: 1, 3)
- [ ] Include `isFavorite: card.isFavorite` in `toBaseWatchCardPayload()` (AC: 1, 3)
- [ ] Update `watch-connectivity.test.ts` to assert `isFavorite` is present in the serialized payload

### Watch side — `targets/watch/CardListView.swift`

- [ ] Add `var isFavorite: Bool = false` to `WatchCard` struct (AC: 3, 4)
- [ ] Add `isFavorite` to `WatchCard.CodingKeys` enum
- [ ] Decode: `isFavorite = try container.decodeIfPresent(Bool.self, forKey: .isFavorite) ?? false` in `init(from decoder:)` (AC: 4)
- [ ] Encode: `try container.encode(isFavorite, forKey: .isFavorite)` in `encode(to encoder:)` (AC: 3)
- [ ] Add `isFavorite` parameter to `WatchCard.init(...)` with default `false`
- [ ] Update `migrateUserDefaults`: use `isFavorite: c.isFavorite` instead of `isFavorite: false` when creating `WatchCardEntity`
- [ ] Update `displayCards` computed var sort closure to add `isFavorite` as top tier (AC: 1, 2):
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
- [ ] Update the matching sort in `migrateUserDefaults` (the `topCardName` calculation) to also include `isFavorite` tier

### Watch side — `targets/watch/WatchSessionManager.swift`

- [ ] In `upsert()` update-existing-entity branch: add `entity.isFavorite = card.isFavorite` (AC: 5)
- [ ] In `upsert()` insert-new-entity branch: use `isFavorite: card.isFavorite` instead of `isFavorite: false` (AC: 3)

### Tests — `watch-ios/Tests/CardStoreTests.swift`

- [ ] Add test: `WatchCard` decodes `isFavorite: true` from payload correctly
- [ ] Add test: `WatchCard` defaults `isFavorite` to `false` when field is absent (backward compat)
- [ ] Add test: `upsert` updates `entity.isFavorite` when payload changes it

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

_to be filled by dev agent_

### Debug Log References

### Completion Notes List

### File List
