# Story 9.2: Mark Card as Favorite

Status: ready-for-dev

## Story

As a user,
I want to pin my most important cards,
so that they always appear at the top of my card list.

## Acceptance Criteria

1. **Given** I am viewing a card's details screen
   **When** I tap the favourite star icon (in the header / top-right area)
   **Then** the card's `isFavorite` is toggled (true → false, false → true)
   **And** the icon reflects the new state immediately (filled star = favourite, outline star = not)
   **And** the change persists to SQLite

2. **Given** a card has `isFavorite: true`
   **When** I view my card list
   **Then** the card shows a small star badge indicator on its `CardTile`

3. **Given** a card has `isFavorite: false`
   **When** I view my card list
   **Then** no star badge is shown on its `CardTile`

4. **Given** the device is signed in to a cloud account
   **When** `isFavorite` is toggled
   **Then** the change syncs to cloud on the next sync cycle (existing sync infrastructure handles this — no extra code needed)

5. **Given** the Watch is reachable
   **When** `isFavorite` is toggled
   **Then** the updated card snapshot is pushed to the Watch automatically (via existing `pushSnapshotToWatch`)

6. **Given** the toggle write fails (e.g., DB error)
   **When** the error is caught
   **Then** the UI reverts to the previous state (optimistic update with rollback)

## Tasks / Subtasks

- [ ] Add `toggleFavorite(id, db?)` to `core/database/card-repository.ts` (AC: 1, 4, 5)
  - [ ] SQL: `UPDATE loyalty_cards SET is_favorite = NOT is_favorite, updated_at = ? WHERE id = ?`
  - [ ] Use `new Date().toISOString()` for `updated_at`
  - [ ] Call `pushSnapshotToWatch(db)` after update (AC: 5)
- [ ] Create `features/cards/hooks/useToggleFavorite.ts` (AC: 1, 6)
  - [ ] Accepts `card: LoyaltyCard` and a `onUpdate: (updated: LoyaltyCard) => void` callback
  - [ ] Implements optimistic update: toggle local state immediately, call `toggleFavorite`, rollback on error
  - [ ] Returns `{ toggle: () => void, isPending: boolean }`
- [ ] Add favourite star button to `features/cards/components/CardDetails.tsx` (AC: 1)
  - [ ] Place it in the header action area (top-right, respecting safe area)
  - [ ] Use `MaterialCommunityIcons`: `star` (filled, when favourite) / `star-outline` (when not)
  - [ ] Icon colour: use `theme.colors.warning` (or `#F5C518` gold) for filled; `theme.text.secondary` for outline
  - [ ] Wrap in `Pressable` using `onPressIn`/`onPressOut` pattern (NOT style callback — see AGENTS.md)
  - [ ] Add `testID="favourite-toggle"` to the Pressable
  - [ ] Wire to `useToggleFavorite` — card prop flows up via `onCardUpdate` callback to parent screen
- [ ] Add star badge to `features/cards/components/CardTile.tsx` (AC: 2, 3)
  - [ ] Show a small filled star icon (16pt) in the top-right corner of the tile shell when `card.isFavorite === true`
  - [ ] Use `MaterialCommunityIcons` `star` in `#F5C518` gold
  - [ ] Absolutely positioned within the tile, 6pt from top and right edges
  - [ ] Hidden when `card.isFavorite === false` (do NOT render the element at all)
  - [ ] Add `testID="favourite-badge"` to the star icon View
- [ ] Wire `onCardUpdate` callback through `app/card/[id].tsx` → `CardDetails` (AC: 1)
  - [ ] `CardDetailsScreen` holds local `card` state; `onCardUpdate` updates it so star reflects instantly
  - [ ] No re-fetch needed — optimistic local state is sufficient
- [ ] Export `useToggleFavorite` from `features/cards/index.ts`
- [ ] Tests:
  - [ ] Unit test `toggleFavorite` in `core/database/card-repository.test.ts`
    - toggles `isFavorite` from false → true
    - toggles again true → false
    - updates `updatedAt`
  - [ ] Unit test `useToggleFavorite` in `features/cards/hooks/useToggleFavorite.test.ts`
    - calls `toggleFavorite` on press
    - rolls back state on error
  - [ ] Component test in `features/cards/components/CardDetails.test.tsx`
    - renders `testID="favourite-toggle"` with correct icon for favourite/non-favourite card
  - [ ] Component test in `features/cards/components/CardTile.test.tsx`
    - renders `testID="favourite-badge"` when `isFavorite: true`
    - does NOT render badge when `isFavorite: false`

## Dev Notes

### Icon library

`MaterialCommunityIcons` is already used throughout this project (via `@expo/vector-icons`).

- Filled favourite: `star`
- Outline (not favourite): `star-outline`
- Gold colour: `#F5C518` — consistent with standard star/rating convention
- Do NOT use `MaterialIcons` `star`/`star-border` (inconsistent stroke weight)

### Pressable pattern (MANDATORY — from AGENTS.md)

```tsx
// ✅ CORRECT
const [isPressed, setIsPressed] = useState(false);
<Pressable
  onPressIn={() => setIsPressed(true)}
  onPressOut={() => setIsPressed(false)}
  onPress={toggle}
  testID="favourite-toggle"
>
  <MaterialCommunityIcons
    name={card.isFavorite ? 'star' : 'star-outline'}
    size={24}
    color={card.isFavorite ? '#F5C518' : theme.text.secondary}
  />
</Pressable>

// ❌ FORBIDDEN
<Pressable style={({ pressed }) => ...}>
```

### Optimistic update pattern

```ts
const toggle = async () => {
  const previous = card.isFavorite;
  onUpdate({ ...card, isFavorite: !previous }); // optimistic
  try {
    await toggleFavorite(card.id);
  } catch {
    onUpdate({ ...card, isFavorite: previous }); // rollback
  }
};
```

### CardTile badge placement

The tile shell is absolutely constrained (fixed `TILE_WIDTH` × `TILE_HEIGHT`). Place the badge at:

```tsx
{card.isFavorite && (
  <View style={styles.favouriteBadge} testID="favourite-badge">
    <MaterialCommunityIcons name="star" size={16} color="#F5C518" />
  </View>
)}
// style:
favouriteBadge: {
  position: 'absolute',
  top: 6,
  right: 6,
}
```

### CardDetails header placement

The favourite toggle should sit in the Stack header right button (via `<Stack.Screen options={{ headerRight }}>`) in `app/card/[id].tsx`. This is the same pattern used for the edit button already in that screen. This avoids modifying `CardDetails.tsx` props interface unnecessarily — keep the toggle at the screen layer.

Check `app/card/[id].tsx` to confirm the existing `headerRight` pattern and match it exactly.

### Callback wiring

`app/card/[id].tsx` already holds `card` in local state via `useState<LoyaltyCard | null>`. Pass an `onCardUpdate` callback to `CardDetails` (or handle the toggle at screen level via `headerRight`) that calls `setCard(updated)`. Either approach is acceptable — prefer the `headerRight` approach as it keeps `CardDetails` props interface clean.

### Cloud sync

`isFavorite` is already a field in the cloud schema (Epic 7 sync infrastructure). Toggling it via `updateCard` / `toggleFavorite` sets `updated_at`, which the existing delta sync picks up on the next sync cycle. No additional sync code needed.

### Project Structure Notes

| Layer     | File                                             | Change                      |
| --------- | ------------------------------------------------ | --------------------------- |
| Database  | `core/database/card-repository.ts`               | Add `toggleFavorite`        |
| Hook      | `features/cards/hooks/useToggleFavorite.ts`      | New file                    |
| Component | `features/cards/components/CardTile.tsx`         | Add star badge              |
| Screen    | `app/card/[id].tsx`                              | Add headerRight star toggle |
| Barrel    | `features/cards/index.ts`                        | Export hook                 |
| Tests     | `core/database/card-repository.test.ts`          | New test cases              |
| Tests     | `features/cards/hooks/useToggleFavorite.test.ts` | New file                    |
| Tests     | `features/cards/components/CardTile.test.tsx`    | Badge rendering tests       |

### References

- Repository pattern: [core/database/card-repository.ts](../../../core/database/card-repository.ts)
- Schema: [core/schemas/card.ts](../../../core/schemas/card.ts) — `isFavorite: z.boolean().default(false)`
- CardTile structure: [features/cards/components/CardTile.tsx](../../../features/cards/components/CardTile.tsx) — `TILE_WIDTH`, `TILE_HEIGHT`, `TILE_RADIUS` constants defined here
- Screen entry point: [app/card/[id].tsx](../../../app/card/[id].tsx) — holds card state, has existing `headerRight` button pattern
- Pressable rules: AGENTS.md — "UI Interaction Reliability (NativeWind + Pressable)"

## Dev Agent Record

### Agent Model Used

_to be filled by dev agent_

### Debug Log References

### Completion Notes List

### File List
