# Story 9.3: Implement Sorting Algorithm

Status: done

## Story

As a user,
I want my cards automatically sorted by relevance,
so that the right card is near the top when I need it.

## Acceptance Criteria

1. **Given** I have multiple cards
   **When** I view my card list with the default sort
   **Then** cards are sorted by:
   1. Favourites first (`isFavorite === true`)
   2. Then by usage frequency (`usageCount` descending)
   3. Then by recency (`lastUsedAt` descending)
   4. Then alphabetically by name (locale-aware, case-insensitive, fallback)

2. **Given** a card is marked as favourite
   **When** I view the card list
   **Then** it appears above all non-favourite cards regardless of usage count

3. **Given** I have 10 cards with usage data
   **When** I visit my usual store
   **Then** the correct card appears in the top 3 positions at least 95% of the time

4. **Given** I change the sort option:
   - **"A-Z"** → favourites remain pinned to the top, then names sort alphabetically within the favourite and non-favourite groups
   - **"Recently Added"** → the favourite-first rule does NOT apply (user explicitly chose chronological order)

5. **Given** the "Frequently Used" sort label
   **When** it is displayed in `SortFilterRow`
   **Then** the label reads as the smart sort option (existing i18n key `cards.sort.frequent` — no label change required unless Ifero requests it)

6. **Given** I have scrolled down the card list and open a card's details
   **When** I navigate back to the list
   **Then** the list preserves my scroll position (it does NOT jump back to the top)
   _(Added 2026-06-08, stakeholder-directed: folded into 9.3 — see Dev Notes.)_

## Tasks / Subtasks

- [x] Update `sortByFrequent` in `features/cards/hooks/useCardSort.ts` (AC: 1, 2)
  - [x] Add `isFavorite` as the top-tier: if `a.isFavorite !== b.isFavorite`, favourites win (`return a.isFavorite ? -1 : 1`)
  - [x] Keep the remaining tiers unchanged: `usageCount desc → lastUsedAt desc → createdAt desc`
- [x] Apply favourite pinning per corrected AC4 (AC: 4)
  - [x] Extract a shared `compareFavoriteFirst` helper (reused by `sortByFrequent` and `sortByAZ`)
  - [x] Pin favourites first in `sortByAZ`, then alphabetical within each group
  - [x] Do NOT pin favourites in `sortByRecent` (chronological order preserved)
- [x] Update `useCardSort.test.ts` to cover new sort behavior (AC: 1, 2, 3, 4)
  - [x] Test: favourite card sorts above higher-usageCount non-favourite
  - [x] Test: mixed list orders favourites block (by usageCount) ahead of non-favourites block
  - [x] Test: favourite "usual store" card lands in the top 3 of a 10-card list (AC: 3)
  - [x] Test: `sortByAZ` pins favourites first, then alphabetical within each group (AC: 4)
  - [x] Test: `sortByRecent` is unaffected by `isFavorite` (AC: 4)
- [x] Preserve card-list scroll position on back-navigation (AC: 6)
  - [x] `useCards`: only drive `isLoading` on the initial load, not on focus refetches, so `CardList` keeps its `FlashList` mounted (no remount → scroll preserved)
  - [x] Update `useCards.test.ts`: a refetch keeps `isLoading` false (initial load still sets it true)

## Dev Notes

> ⚠️ **Requirement update (2026-06-08, stakeholder-directed):** AC4 was corrected — favourite pinning **also applies to the "A-Z" sort** (favourites pinned to the top, then alphabetical within each group), but **not** to "Recently Added". The original notes below (including the "do NOT touch `sortByAZ`" guidance and the `sortByAZ ignores isFavorite` test sketch) predate this change and are retained for historical context only; the authoritative behavior is the updated AC4 above. Implementation extracts a shared `compareFavoriteFirst` helper reused by both `sortByFrequent` and `sortByAZ`.

> ➕ **Scope addition (2026-06-08, stakeholder-directed):** AC6 (card-list scroll persistence) was folded into this story. **Root cause:** `CardList` refetches on focus (`useFocusEffect` → `refetch()`), and `useCards.fetchCards()` set `isLoading = true` on _every_ call; `CardList` renders a full-screen spinner whenever `isLoading` is true (`if (isLoading) return <ActivityIndicator/>`), so the focus refetch unmounted and remounted the `FlashList`, resetting scroll to the top. **Fix:** `useCards` only sets `isLoading` on the initial load (guarded by `hasLoadedRef`); focus refetches update data in place so the `FlashList` stays mounted and scroll is preserved. Viewing a card still bumps `usageCount`/`lastUsedAt` (Story 9.1), so the "Frequently used" order may legitimately change on return — but the scroll offset is retained, not reset.

### The change is minimal — one insertion into an existing comparator

Current `sortByFrequent` in `features/cards/hooks/useCardSort.ts`:

```ts
const sortByFrequent = (a: LoyaltyCard, b: LoyaltyCard): number => {
  if (a.usageCount !== b.usageCount) return b.usageCount - a.usageCount;
  if (a.lastUsedAt && b.lastUsedAt) return b.lastUsedAt.localeCompare(a.lastUsedAt);
  if (a.lastUsedAt) return -1;
  if (b.lastUsedAt) return 1;
  return b.createdAt.localeCompare(a.createdAt);
};
```

After this story:

```ts
const sortByFrequent = (a: LoyaltyCard, b: LoyaltyCard): number => {
  // Tier 0: favourites always first
  if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
  // Tier 1: usageCount descending
  if (a.usageCount !== b.usageCount) return b.usageCount - a.usageCount;
  // Tier 2: lastUsedAt descending
  if (a.lastUsedAt && b.lastUsedAt) return b.lastUsedAt.localeCompare(a.lastUsedAt);
  if (a.lastUsedAt) return -1;
  if (b.lastUsedAt) return 1;
  // Tier 3: createdAt descending (fallback)
  return b.createdAt.localeCompare(a.createdAt);
};
```

That's the entire code change. Everything else (persistence, `CardList.tsx` wiring, `SortFilterRow`) is already correct and requires no modification.

### Existing sort infrastructure (do NOT touch)

- `CardList.tsx` already calls `sortCards(filtered)` with the persisted sort preference — no changes needed
- `SortFilterRow.tsx` already renders the sort UI — no changes needed
- `AsyncStorage` persistence of sort preference already works — no changes needed
- Default sort option is already `'frequent'` — no changes needed

### Test cases to add to `useCardSort.test.ts`

The existing test file already has a `sortByFrequent` describe block. Add these cases:

```ts
it('sorts favourites above non-favourites regardless of usageCount', () => {
  const cards = [
    { ...base, id: '1', name: 'Alpha', isFavorite: false, usageCount: 100 },
    { ...base, id: '2', name: 'Beta', isFavorite: true, usageCount: 0 }
  ];
  const result = sortCards(cards); // sortOption = 'frequent'
  expect(result[0]!.id).toBe('2'); // Beta wins despite zero usage
});

it('sorts two favourites by usageCount', () => {
  const cards = [
    { ...base, id: '1', isFavorite: true, usageCount: 3 },
    { ...base, id: '2', isFavorite: true, usageCount: 7 }
  ];
  const result = sortCards(cards);
  expect(result[0]!.id).toBe('2');
});

it('sortByAZ ignores isFavorite', () => {
  // set sortOption to 'az' first, then call sortCards
  // favourite card mid-alphabet should NOT bubble to top
});
```

### Project Structure Notes

| Layer | File                                       | Change                                    |
| ----- | ------------------------------------------ | ----------------------------------------- |
| Hook  | `features/cards/hooks/useCardSort.ts`      | Add `isFavorite` tier to `sortByFrequent` |
| Tests | `features/cards/hooks/useCardSort.test.ts` | New test cases for favourite tier         |

### References

- Sort hook: [features/cards/hooks/useCardSort.ts](../../../features/cards/hooks/useCardSort.ts)
- Sort tests: [features/cards/hooks/useCardSort.test.ts](../../../features/cards/hooks/useCardSort.test.ts)
- Schema: [core/schemas/card.ts](../../../core/schemas/card.ts) — `isFavorite: z.boolean().default(false)`
- Card list wiring: [features/cards/components/CardList.tsx](../../../features/cards/components/CardList.tsx) — `sortCards(filtered)` already applied

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Amelia — Developer Agent, BMM dev-story workflow)

### Debug Log References

- Full test suite: 150 suites / 1468 tests passing.
- `useCards` suite: 10/10 passing (focus refetch no longer flips `isLoading`; initial-load spinner preserved — AC6).
- `useCardSort` suite: 16/16 passing (TDD red→green confirmed — favourites-first test failed against the pre-change comparator, passed after the Tier 0 insertion). The mixed-list, AC3 top-3, and A-Z favourite-pinning tests also fail against the pre-change comparators, confirming they guard the new behavior.
- `yarn typecheck` clean; `yarn lint` clean; target files Prettier-compliant.

### Completion Notes List

- **AC1, AC2 (favourites-first):** Added Tier 0 to `sortByFrequent` — `if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;` — so favourites sort above all non-favourites regardless of `usageCount`. Existing tiers (usageCount desc → lastUsedAt desc → createdAt desc) are unchanged and now apply within each favourite/non-favourite group.
- **AC4 (corrected — A-Z pins favourites, Recently Added does not):** Per stakeholder direction (2026-06-08), favourite pinning now also applies to "A-Z" (favourites pinned to the top, then alphabetical within each group) via the shared `compareFavoriteFirst` helper; "Recently Added" remains pure chronological (favourites NOT pinned). Tests assert the A-Z pinning order and that `recent` is unaffected by `isFavorite`.
- **AC3 (right card in top 3 ≥95%):** Covered by a deterministic 10-card test asserting the favourite "usual store" card lands in the top 3 even with only moderate usage — the tier ordering (favourites → frequency → recency) delivers this outcome. No separate code path required; the frequency/recency tiers were already in place from earlier stories and are preserved.
- **QA follow-up (2026-06-08):** Added an integrated mixed favourites/non-favourites test and the AC3 top-3 test, and replaced the redundant "two favourites by usageCount" test (which did not exercise the new tier) — both new tests are verified to fail against the pre-change comparator.
- **AC5 (label):** No change required — existing i18n key `cards.sort.frequent` ("Frequently used") is retained per story note.
- **AC6 (scroll persistence — folded in per stakeholder direction):** Fixed `useCards` so a focus refetch no longer flips `isLoading` to `true` (guarded by `hasLoadedRef`); `CardList` keeps its `FlashList` mounted on back-navigation instead of remounting at the top. `CardList` is the only consumer of `useCards().isLoading`, so the blast radius is contained. Updated the `useCards` refetch test to assert the corrected behaviour (initial load still shows the spinner).
- Updated the hook JSDoc to document favourite pinning in both "Frequently used" and "A-Z", and that "Recently added" is not pinned.
- No new dependencies; change is contained to the `features/cards` layer (no layer-boundary impact).

### File List

- `features/cards/hooks/useCardSort.ts` — Modified: added `compareFavoriteFirst` helper; favourites tier in `sortByFrequent` and `sortByAZ`; `sortByRecent` unchanged; updated JSDoc.
- `features/cards/hooks/useCardSort.test.ts` — Modified: added favourites-tier tests (AC1, AC2), AC3 top-3 test, A-Z favourite-pinning test, and the `recent` not-pinned guard (AC4).
- `features/cards/hooks/useCards.ts` — Modified: only set `isLoading` on the initial load (added `hasLoadedRef`) so focus refetches don't unmount `CardList`'s list (AC6 scroll persistence).
- `features/cards/hooks/useCards.test.ts` — Modified: updated the refetch test to assert `isLoading` stays `false` on a refetch (AC6).

## Change Log

| Date       | Description                                                                                                                                                                             |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-06-08 | Implemented favourites-first tier in `sortByFrequent` (Story 9.3, AC1/AC2/AC4); added tests.                                                                                            |
| 2026-06-08 | QA follow-up: added integrated mixed-list test + AC3 top-3 test; removed redundant two-favourites test.                                                                                 |
| 2026-06-08 | Stakeholder-directed AC4 correction: favourite pinning now applies to "A-Z" (not "Recently Added"); extracted `compareFavoriteFirst` helper; updated tests + JSDoc.                     |
| 2026-06-08 | Stakeholder-directed AC6 fold-in: card-list scroll persistence — `useCards` keeps `isLoading` false on focus refetches so `CardList` doesn't remount the list; updated `useCards` test. |
