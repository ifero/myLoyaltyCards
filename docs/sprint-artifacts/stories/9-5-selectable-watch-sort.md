# Story 9.5: Selectable Watch Sort

Status: drafted

> Drafted 2026-06-09 via `correct-course` (`sprint-artifacts/sprint-change-proposal-2026-06-09.md`).
> **Gates before `ready-for-dev`:** PRD **FR25** (PM) + UX watch-picker spec (UX). Depends on Story 9.4.

## Story

As a user,
I want to choose how my cards are sorted on the Watch,
so that the order matches how I think about my cards (not just a fixed algorithm).

## Acceptance Criteria

1. **Given** I am on the Watch card list
   **When** I open the sort control (a toolbar button → picker)
   **Then** I can choose between **Frequently used**, **Recently added**, and **A‑Z**

2. **Given** the watch sort modes
   **Then** their ordering semantics match the phone's `useCardSort`:
   - Frequently used → `isFavorite` first → `usageCount` desc → `lastUsedAt` desc → `createdAt` desc
   - Recently added → `createdAt` desc (favourites **not** pinned)
   - A‑Z → `isFavorite` first → name (locale-aware, case-insensitive)

3. **Given** a fresh install (no saved preference)
   **When** the Watch list first renders
   **Then** the default sort is **A‑Z**

4. **Given** I pick a sort mode on the Watch
   **When** I relaunch the Watch app
   **Then** my choice persists (watch-local), **independently** of the phone's selected mode

5. **Given** I change the sort mode
   **When** the picker closes
   **Then** the list re-orders immediately

6. **(API currency)** The picker uses current, non-deprecated SwiftUI/watchOS APIs — verified via Context7 / official docs before implementation (Sprint 14 retro action item).

## Tasks / Subtasks

### Watch sort model — `targets/watch/`

- [ ] Add a `WatchSortMode` enum (`frequent` / `recent` / `az`) (AC: 1, 2)
- [ ] Extend the comparator: keep `WatchCard.sortedForDisplay` as `frequent`; add `recent` (createdAt desc, no favourite pin) and `az` (favourite-first → localized name) variants — e.g. `WatchCard.sorted(_ cards:by mode:)` (AC: 2)
- [ ] Persist the selected mode on the watch (UserDefaults/`@AppStorage`), default `az` (AC: 3, 4)

### Watch UI — `targets/watch/CardListView.swift`

- [ ] Add a toolbar button that presents a sort picker (per UX spec) (AC: 1)
- [ ] Drive `displayCards` from the selected `WatchSortMode` (AC: 2, 5)
- [ ] Localize the control + mode labels in `en.lproj` + `it.lproj` (AC: 1)

### Tests

- [ ] Unit-test each sort variant's ordering (`recent`, `az`), incl. favourite pinning rules (AC: 2)
- [ ] Test persistence + `az` default (AC: 3, 4)
- [ ] Update `targets/watch/__tests__/watch-layout-contract.test.ts` if the row/list layout changes

## Dev Notes

- **Phone reference (do not re-invent):** `features/cards/hooks/useCardSort.ts` (Story 13.2) defines the three modes, their comparators, and persisted-preference pattern (`AsyncStorage` key `@myLoyaltyCards/sortPreference`, default `frequent`). Mirror the _semantics_; the watch keeps its **own** preference with an **A‑Z** default (decision 2026-06-09).
- **Reuse:** `WatchCard.sortedForDisplay(_:)` already implements `frequent`. Add the other two variants beside it so all watch surfaces share one source of truth.
- **Watch contract tests** (`targets/watch/__tests__/`) run in CI via `watchos-tests.yml` and are **excluded** by the default `yarn test` — run them with `jest --testPathPattern='targets/watch/__tests__' --testPathIgnorePatterns='/node_modules/' --modulePathIgnorePatterns='/node_modules/'`.
- **Open product input:** exact picker affordance (sheet vs inline list vs Digital Crown) → UX. PRD FR25 must land first.

### References

- Proposal: [sprint-change-proposal-2026-06-09.md](../sprint-change-proposal-2026-06-09.md)
- Phone sort: [features/cards/hooks/useCardSort.ts](../../../features/cards/hooks/useCardSort.ts), [features/cards/components/SortFilterRow.tsx](../../../features/cards/components/SortFilterRow.tsx)
- Watch sort: [targets/watch/CardListView.swift](../../../targets/watch/CardListView.swift) — `WatchCard.sortedForDisplay`

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

## Change Log

| Date       | Version | Description                     | Author       |
| ---------- | ------- | ------------------------------- | ------------ |
| 2026-06-09 | 0.1     | Drafted via correct-course (C1) | Amelia (dev) |
