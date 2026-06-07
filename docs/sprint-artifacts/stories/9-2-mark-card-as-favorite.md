# Story 9.2: Mark Card as Favorite

Status: review

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

- [x] Add `toggleFavorite(id, db?)` to `core/database/card-repository.ts` (AC: 1, 4, 5)
  - [x] SQL: `UPDATE loyalty_cards SET is_favorite = NOT is_favorite, updated_at = ? WHERE id = ?`
  - [x] Use `new Date().toISOString()` for `updated_at`
  - [x] Call `pushSnapshotToWatch(db)` after update (AC: 5)
- [x] Create `features/cards/hooks/useToggleFavorite.ts` (AC: 1, 6)
  - [x] Accepts `card: LoyaltyCard` and a `onUpdate: (updated: LoyaltyCard) => void` callback _(param widened to `LoyaltyCard | null` — see Completion Notes #4)_
  - [x] Implements optimistic update: toggle local state immediately, call `toggleFavorite`, rollback on error
  - [x] Returns `{ toggle: () => void, isPending: boolean }`
- [x] Add favourite star button to the card detail header (AC: 1) _(implemented in `app/card/[id].tsx` `headerRight`, not `CardDetails.tsx` — see Completion Notes #1)_
  - [x] Place it in the header action area (top-right, respecting safe area) _(navigator header handles insets)_
  - [x] Use `MaterialCommunityIcons`: `star` (filled, when favourite) / `star-outline` (when not)
  - [x] Icon colour: `#F5C518` gold for filled; `headerTextColor` for outline _(header-contrast adaptation — see Completion Notes #3)_
  - [x] `Pressable` avoids the forbidden `style={({pressed})=>…}` callback (mirrors existing `headerLeft`) — see Completion Notes #3
  - [x] Add `testID="favourite-toggle"` to the Pressable
  - [x] Wire to `useToggleFavorite` — `setCard` is the `onUpdate` callback at the screen layer
- [x] Add star badge to `features/cards/components/CardTile.tsx` (AC: 2, 3)
  - [x] Show a small filled star icon (16pt) in the top-right corner of the tile shell when `card.isFavorite === true`
  - [x] Use `MaterialCommunityIcons` `star` in `#F5C518` gold
  - [x] Absolutely positioned within the tile, 6pt from top and right edges
  - [x] Hidden when `card.isFavorite === false` (do NOT render the element at all)
  - [x] Add `testID="favourite-badge"` to the star icon View
- [x] Wire favourite state through `app/card/[id].tsx` so the header star reflects instantly (AC: 1)
  - [x] `CardDetailsScreen` holds local `card` state; `setCard` (as `onUpdate`) updates it so the star reflects instantly
  - [x] No re-fetch needed — optimistic local state is sufficient
- [x] Export `useToggleFavorite` from `features/cards/index.ts`
- [x] Tests:
  - [x] Unit test `toggleFavorite` in `core/database/card-repository.test.ts`
    - toggles `isFavorite` (single `NOT is_favorite` statement covers false→true and true→false)
    - updates `updatedAt` (ISO-8601 UTC), no transaction, pushes to Watch, no-ops unknown id
  - [x] Unit test `useToggleFavorite` in `features/cards/hooks/useToggleFavorite.test.ts`
    - calls `toggleFavorite` on toggle; optimistic flip both directions
    - rolls back state on error; clears `isPending`; null-card guard
  - [x] Toggle render/behavior coverage _(via `useToggleFavorite.test.ts` + `card-repository.test.ts`; the `CardDetails.test.tsx` bullet is N/A — toggle lives in `headerRight`, see Completion Notes #2)_
  - [x] Component test in `features/cards/components/CardTile.test.tsx`
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

claude-opus-4-8 (Amelia — BMM Dev agent)

### Debug Log References

- `yarn jest card-repository.test.ts useToggleFavorite.test.ts CardTile.test.tsx` → 3 suites, 45 tests passed
- `yarn typecheck` → clean
- `yarn lint` → clean (0 errors, 0 warnings)
- `yarn test` → 150 suites, 1458 tests passed (no regressions)
- `yarn test:coverage` → global 80% threshold met; new code coverage: `useToggleFavorite.ts` 100%, `card-repository.ts` 100% lines (`toggleFavorite` fully covered), `CardTile.tsx` 100% lines

### Completion Notes List

All 6 acceptance criteria implemented and verified:

- **AC1** (toggle on detail screen, persists): `toggleFavorite` repo fn + `useToggleFavorite` hook (optimistic) + `headerRight` star in `app/card/[id].tsx`. Verified by `card-repository.test.ts` + `useToggleFavorite.test.ts`.
- **AC2 / AC3** (badge on `CardTile` when favourite / hidden otherwise): conditional badge in `CardTile.tsx`. Verified by `CardTile.test.tsx`.
- **AC4** (cloud sync): no extra code — `toggleFavorite` bumps `updated_at`, which existing delta sync picks up (per Dev Notes).
- **AC5** (Watch push): `toggleFavorite` calls `pushSnapshotToWatch(db)`, matching every other write fn. Verified in repo test.
- **AC6** (rollback on failure): hook restores previous `isFavorite` via `onUpdate` in the `.catch`. Verified by the rollback test.

**Implementation decisions / deviations from the literal task bullets (all sanctioned by the story's own Dev Notes + Project Structure Notes table):**

1. **Toggle placed in `app/card/[id].tsx` `headerRight`, not `CardDetails.tsx`.** The Dev Notes ("CardDetails header placement") state _"prefer the headerRight approach as it keeps CardDetails props interface clean"_, and the Project Structure Notes table lists the change as `app/card/[id].tsx` → "Add headerRight star toggle" (with no `CardDetails.tsx` entry). AC1 also specifies "in the header / top-right area". `CardDetails.tsx` was therefore left untouched.
2. **`CardDetails.test.tsx` component test is N/A** as a consequence of #1 (the toggle is not in `CardDetails`). The toggle's logic is fully covered by `useToggleFavorite.test.ts` (optimistic flip both directions + rollback + pending) and `card-repository.test.ts` (DB statement, timestamp, Watch push, no-op). No `app/` screen test was added — `app/**` is outside the Jest `collectCoverageFrom` scope and the repo has no precedent for testing `expo-router` `Stack.Screen` headers.
3. **Header star styling:** mirrors the existing `headerLeft` back button — a plain `Pressable` with `onPress` (no forbidden `style={({pressed})=>…}` callback, satisfying AGENTS.md). Outline star uses `headerTextColor` (not `theme.text.secondary`) for contrast against the brand-coloured header; filled star uses the spec'd `#F5C518` gold.
4. **`useToggleFavorite` signature widened** `card: LoyaltyCard` → `card: LoyaltyCard | null` so the screen can call the hook before the early returns (Rules of Hooks) while `card` is still loading; `toggle` no-ops when `card` is null (guard test included).

**AGENTS.md-mandated cleanup (touched-file rule):** `CardTile.tsx` previously used the forbidden `style={({ pressed }) => …}` Pressable callback. Per AGENTS.md ("refactor it in the same change before merge"), it was converted to `onPressIn`/`onPressOut` + local `isPressed` state. Behaviour preserved; new handlers covered by an added test.

i18n keys `cards.details.favoriteAccessibilityLabel` / `unfavoriteAccessibilityLabel` added to `en.ts` + `it.ts` (US spelling, matching the existing `isFavorite` field and `color` copy).

**Code review — round 1 follow-ups (addressed):**

- **[MAJOR]** Added real-SQLite integration coverage for `toggleFavorite` in `core/database/card-repository.integration.test.ts` (the suite Story 9.1 established for verifying DB _effects_). New cases prove the flip false→true→false against the real migration schema, `updated_at` is bumped, only the targeted row changes, and an unknown id no-ops without mutating state.
- **[MINOR]** Hardened against rapid double-tap desync: the hook's `isPending` is now wired to `disabled` (+ `accessibilityState`) on the `headerRight` toggle, so a second tap can't fire while the optimistic write is in flight.
- **[NIT]** `console.error` retained (not a `logger` wrapper): intentional consistency with sibling `useTrackCardUsage` (Story 9.1) and the de-facto `features/` logging pattern; switching in isolation would only add inconsistency.

**Code review outcome:** Round 2 — **APPROVED** by an independent reviewer subagent. Both round-1 actionable findings verified resolved (not papered over). The remaining `console.error`-vs-`logger` item is a confirmed pre-existing, codebase-wide divergence (the `logger` wrapper is implemented/used nowhere in `features/`); the reviewer recommends addressing it as a separate project-wide change — not a 9.2 blocker. Flagged as a follow-up task.

**QA outcome:** **APPROVED** by an independent QA subagent with a full AC→test traceability matrix (AC1–AC6 all covered; AC4/AC5 + the header star's visual/contrast + double-tap behaviour correctly identified as on-device manual checks). QA's one substantive item (the double-tap guard had no automated test) was then closed by adding a hook-level re-entry guard + test (`useToggleFavorite.test.ts` → "ignores a second toggle while a write is still in flight"). Remaining items are the same deferred `console`/`logger` NIT and a non-defect (badge geometry is safely within the tile bounds).

**On-device verification still required before release** (cannot be unit-tested): AC5 Watch snapshot delivery on a physical paired watch; AC4 cloud propagation on the next sync cycle; AC1 header star visual (filled ↔ outline, contrast on brand-coloured headers) and the double-tap guard.

**Design reconciliation (2026-06-07) — ⛔ BLOCKED on design sign-off (stakeholder decision):**

A stakeholder design review found the implemented visual diverges from the UX spec and the project's icon decision. Behaviour/architecture are approved (code review + QA passed), but **9.2 is paused before commit/PR pending a Figma "Card — Favourite states" frame + designer sign-off.** Agreed decisions (ifero, 2026-06-07), to be captured in Figma and then implemented:

- **Icon:** keep **star** semantics, but switch `MaterialCommunityIcons` → **`MaterialIcons` `star`/`star-border`** — complies with DEC-12.5-004 (MI is primary; MI ships a star) and removes the mixed-icon family in the detail header. _Reverses this story's original "use MCI; do NOT use MI star" Dev Note._
- **Colour:** replace the ad-hoc `#F5C518` with the existing **`theme.warning`** token (`#D97706` light / `#F59E0B` dark) — theme-aware, no new token.
- **Badge contrast (a11y):** the gold star is invisible on light/yellow brand tiles (e.g. Esselunga `#FFCC00`). Add a **contrast-safe circular backing plate** (reuse the `avatarCircle`/`logoSlot` rgba-plate pattern) so the double-encoded star reads on any tile.
- **Interaction:** keep the **header-tap** toggle for 9.2; **defer long-press-on-grid to Story 9.3** (it only pays off once 9.3 adds favourites-first sorting — `useCardSort` has none yet).
- **Stale specs to reconcile (flag to owners; do not silently edit):** UX spec §3.3 "Smart Sort" (Pin icon + long-press) and epics.md Epic 9 ("long-press to pin") → re-point: favourite = header-star tap in 9.2; long-press + favourites-first sort in 9.3.

**Design sign-off (2026-06-07):** Stakeholder approved the favourite-states design drafted in Figma — page **"Card — Favourite states (9.2)"**, node `587:3` in file `4PSsX8SyTUU0GCUdBAAEED`. **Implementation delta APPLIED:** `MaterialCommunityIcons` → `MaterialIcons` (`star` / `star-border`) in `app/card/[id].tsx` + `CardTile.tsx`; `#F5C518` → `theme.warning` (`#D97706` light / `#F59E0B` dark); white circular backing plate (Ø24, 95%) behind the tile badge for contrast on light/yellow tiles; `CardTile.test.tsx` theme mock extended with `warning`. The story's original "Icon library" Dev Note (which mandated MCI) is superseded by this signed-off decision.

### File List

**Implementation**

- `core/database/card-repository.ts` — add `toggleFavorite(id, db?)`
- `core/database/index.ts` — export `toggleFavorite`
- `features/cards/hooks/useToggleFavorite.ts` — new optimistic-toggle hook
- `features/cards/components/CardTile.tsx` — favourite star badge (AC2/AC3) + Pressable refactor (AGENTS.md)
- `app/card/[id].tsx` — `headerRight` favourite toggle + hook wiring
- `features/cards/index.ts` — export `useToggleFavorite` + `UseToggleFavoriteReturn`
- `shared/i18n/locales/en.ts` — favourite/unfavourite accessibility labels
- `shared/i18n/locales/it.ts` — favourite/unfavourite accessibility labels

**Tests**

- `core/database/card-repository.test.ts` — `toggleFavorite` suite (6 cases)
- `core/database/card-repository.integration.test.ts` — real-SQLite `toggleFavorite` cases (flip both directions, no cross-row bleed, unknown-id no-op)
- `features/cards/hooks/useToggleFavorite.test.ts` — new hook suite (6 cases incl. double-tap guard)
- `features/cards/components/CardTile.test.tsx` — badge tests + pressIn/pressOut test

**Tracking**

- `docs/sprint-artifacts/sprint-status.yaml` — `9-2` → `review`
- `docs/sprint-artifacts/stories/9-2-mark-card-as-favorite.md` — this file

## Change Log

| Date       | Change                                                                                                                                                                                                                                                          |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-06-07 | Implemented Story 9.2 (Mark Card as Favorite): repo toggle, optimistic hook, header toggle, CardTile badge, i18n, tests. All quality gates green. Status → review.                                                                                              |
| 2026-06-07 | Code review round 1: added real-SQLite integration tests for `toggleFavorite`; wired `isPending` → `disabled` on the header toggle to prevent double-tap desync.                                                                                                |
| 2026-06-07 | QA follow-up: added a hook-level in-flight re-entry guard (+ test) so the double-tap protection is provable independent of the call site. Code review + QA both APPROVED.                                                                                       |
| 2026-06-07 | Stakeholder design review: keep star but MCI→MI (DEC-12.5-004), `#F5C518`→`theme.warning`, add contrast-safe badge plate, defer long-press to 9.3. **9.2 paused before commit pending Figma favourite-states frame + designer sign-off.** Status → in-progress. |
| 2026-06-07 | Design signed off (Figma frame "Card — Favourite states (9.2)" approved). Applied delta: MI star/star-border, theme.warning, white badge backing plate, test theme mock. Re-running code-review + QA + gates.                                                   |
| 2026-06-07 | Design delta passed independent code-review + QA (both APPROVED, 0 findings); typecheck/lint/1463 tests green. Status → review; ready to commit pending stakeholder approval.                                                                                   |
