# Story 9.3: Implement Sorting Algorithm

Status: ready-for-dev

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

4. **Given** I change the sort option to "A-Z" or "Recently Added"
   **When** I view the card list
   **Then** the favourite-first rule does NOT apply (user explicitly chose a different order)

5. **Given** the "Frequently Used" sort label
   **When** it is displayed in `SortFilterRow`
   **Then** the label reads as the smart sort option (existing i18n key `cards.sort.frequent` — no label change required unless Ifero requests it)

## Tasks / Subtasks

- [ ] Update `sortByFrequent` in `features/cards/hooks/useCardSort.ts` (AC: 1, 2, 4)
  - [ ] Add `isFavorite` as the top-tier: if `a.isFavorite !== b.isFavorite`, favourites win (`return a.isFavorite ? -1 : 1`)
  - [ ] Keep the remaining tiers unchanged: `usageCount desc → lastUsedAt desc → createdAt desc`
  - [ ] Do NOT change `sortByRecent` or `sortByAZ` (AC: 4)
- [ ] Update `useCardSort.test.ts` to cover new sort tier (AC: 1, 2, 4)
  - [ ] Test: favourite card sorts above higher-usageCount non-favourite
  - [ ] Test: two favourite cards are then sorted by usageCount
  - [ ] Test: `sortByRecent` and `sortByAZ` are unaffected by `isFavorite`

## Dev Notes

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

_to be filled by dev agent_

### Debug Log References

### Completion Notes List

### File List
