# Story 9.5: Selectable Watch Sort

Status: review

> Drafted 2026-06-09 via `correct-course` (`sprint-artifacts/sprint-change-proposal-2026-06-09.md`).
> ✅ **Gates cleared 2026-06-10 → `ready-for-dev`:** PRD **FR75/FR76** added (PM) + UX watch-picker & favourite-badge spec merged (PR #130). Depends on Story 9.4 (done). _(FR75 renumbered from the proposal's erroneous "FR25"; see PRD note.)_

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

- [x] Add a `WatchSortMode` enum (`frequent` / `recent` / `az`) (AC: 1, 2)
- [x] Extend the comparator: keep `WatchCard.sortedForDisplay` as `frequent`; add `recent` (createdAt desc, no favourite pin) and `az` (favourite-first → localized name) variants — e.g. `WatchCard.sorted(_ cards:by mode:)` (AC: 2)
- [x] Persist the selected mode on the watch (UserDefaults/`@AppStorage`), default `az` (AC: 3, 4)

### Watch UI — `targets/watch/CardListView.swift`

- [x] Add a toolbar button that presents a sort picker (per UX spec) (AC: 1)
- [x] Drive `displayCards` from the selected `WatchSortMode` (AC: 2, 5)
- [x] Localize the control + mode labels in `en.lproj` + `it.lproj` (AC: 1)

### Tests

- [x] Unit-test each sort variant's ordering (`recent`, `az`), incl. favourite pinning rules (AC: 2)
- [x] Test persistence + `az` default (AC: 3, 4)
- [x] Update `targets/watch/__tests__/watch-layout-contract.test.ts` if the row/list layout changes

## Dev Notes

- **Phone reference (do not re-invent):** `features/cards/hooks/useCardSort.ts` (Story 13.2) defines the three modes, their comparators, and persisted-preference pattern (`AsyncStorage` key `@myLoyaltyCards/sortPreference`, default `frequent`). Mirror the _semantics_; the watch keeps its **own** preference with an **A‑Z** default (decision 2026-06-09).
- **Reuse:** `WatchCard.sortedForDisplay(_:)` already implements `frequent`. Add the other two variants beside it so all watch surfaces share one source of truth.
- **Watch contract tests** (`targets/watch/__tests__/`) run in CI via `watchos-tests.yml` and are **excluded** by the default `yarn test` — run them with `jest --testPathPattern='targets/watch/__tests__' --testPathIgnorePatterns='/node_modules/' --modulePathIgnorePatterns='/node_modules/'`.
- **Open product input:** exact picker affordance (sheet vs inline list vs Digital Crown) → UX. PRD **FR75** (selectable per-surface sort, persisted) must land first.

### References

- Proposal: [sprint-change-proposal-2026-06-09.md](../sprint-change-proposal-2026-06-09.md)
- Phone sort: [features/cards/hooks/useCardSort.ts](../../../features/cards/hooks/useCardSort.ts), [features/cards/components/SortFilterRow.tsx](../../../features/cards/components/SortFilterRow.tsx)
- Watch sort: [targets/watch/CardListView.swift](../../../targets/watch/CardListView.swift) — `WatchCard.sortedForDisplay`

## Dev Agent Record

### Agent Model Used

Opus 4.8 (`claude-opus-4-8`) — BMad dev agent (Amelia).

### Debug Log References

- `yarn watch:build` → **BUILD SUCCEEDED**; `CardListView.swift` is deprecation-warning-clean (watchOS 26.5 SDK). Fixed one pre-existing deprecation while in-file: the deep-link `onChange(of:perform:)` single-param closure → two-param form (deprecated in watchOS 10.0).
- Watch contract jest (`watch-layout-contract.test.ts`): 11/11 pass (incl. 2 new Story 9.5 specs).
- `yarn lint` clean · `yarn typecheck` clean.
- Sort orderings independently validated via a standalone `swift` run of the three comparators against the XCTest data (`.recent`/`.az`/`.frequent` all matched expectations).

### Completion Notes List

- **AC6 (API currency) — verified against official Apple docs before coding:** `ToolbarItemPlacement.topBarTrailing` (watchOS 10.0+, not deprecated), `sheet(isPresented:onDismiss:content:)` (watchOS 6.0+), `@AppStorage` (watchOS 7.0+, `String`-RawValue enum support) — none deprecated. Deployment target is watchOS 10.0.
- **Model:** `WatchSortMode` enum (`frequent`/`recent`/`az`) + `WatchCard.sorted(_:by:)` added beside `sortedForDisplay` (single source of truth). `.frequent` reuses `sortedForDisplay`, so the complication "top card" can never drift. `.recent` = `createdAt` desc (no favourite pin); `.az` = favourite-first → locale-aware, case- & diacritic-insensitive name compare. Swift `sorted(by:)` is stable (Swift 5+), matching the phone's stable `Array.sort`.
- **AC2 A‑Z comparator:** uses `compare(options: [.caseInsensitive, .diacriticInsensitive], locale: .current)` to mirror the phone's `localeCompare(…, {sensitivity:'base'})` exactly — accents don't change ordering (matters for the Italian-first audience). _(Tightened from case-insensitive-only after code review finding #5.)_
- **AC2 `.frequent` parity fix:** corrected `sortedForDisplay` so a card that has been used outranks one that never has at equal `usageCount` (mixed-`nil` `lastUsedAt`) — the prior both-present-only check fell through to `createdAt`, diverging from the phone's `if (a.lastUsedAt) return -1` rule. Pre-existing (Story 9.4) bug surfaced by AC2's "match exactly"; fix also tightens the shared complication ordering. _(Code review finding #1; covered by a new XCTest.)_
- **Persistence (AC3/AC4):** `@AppStorage("watch.sortMode")` default `.az`, watch-local under its own key — independent of the phone's `AsyncStorage @myLoyaltyCards/sortPreference`. This is UI state, **not** card data, so the watch read-only rule (ADR-2026-06-09-001) is preserved; no `WatchSessionManager`/complication code touched.
- **UI (UX spec §5):** top-trailing toolbar button (`arrow.up.arrow.down`, a11y "Sort") → `.sheet` hosting `WatchSortPickerView` (Carbon-black `List` of 3 rows). Active row is double-encoded — semibold `accentColor` label + trailing `checkmark` + VoiceOver `.isSelected` trait (never colour alone). Tap sets the mode and dismisses immediately; `.animation(.default, value: sortMode)` gives the brief re-order. Sort button is hidden on the empty state (nothing to sort). `Color.accentColor` is the app key/tint per spec (watch `AccentColor` asset is intentionally system-default).
- **Localization:** added `watch.sort.{title,frequent,recent,az}` to `en.lproj` + `it.lproj`. Italian is ASCII (`"Piu usate"`) to match the established watch-target convention — both watch `.strings` bundles are deliberately accent-free (e.g. existing `"…carta fedelta piu usata."`); semantics still mirror the phone (`Più usate`). Did not retro-fit accents elsewhere (out of scope).
- **Tests:** Swift XCTests (`watch-ios/Tests/CardStoreTests.swift`) for the three orderings, favourite-pin rules, the frequent mixed-`nil` tier, A-Z diacritic-insensitivity, `az` default, `allCases` row order, and `UserDefaults` round-trip — following the repo's existing watch-test pattern (these, like all watch Swift tests, run in Xcode; the watch scheme has no `xcodebuild test` step). All orderings were additionally validated by a standalone `swift` run. CI-enforced TS contract coverage added to `watch-layout-contract.test.ts`.
- **Scope:** card list only; phone behaviour and sync payloads untouched. `sortedForDisplay` (shared with the complication) was tightened for phone parity (see `.frequent` parity fix above) — strictly more correct, no behavioural regression (existing full-tier test still passes).
- **Code review:** round 1 (sonnet subagent) → fixed findings #1 (frequent mixed-`nil` parity) and #5 (A-Z diacritics) + added covering tests; round 2 → APPROVED (0 comments). Findings #4/#7 (pre-existing vacuous `test_readOnly_preventsCardModification` + Italian comments) were initially deferred, then **addressed per stakeholder request**: rewritten as `test_readOnly_localCardEdits_doNotPersistAcrossReload` (proves a local edit never writes back across a store reload) with English comments. Not a 9.5 AC; folded onto this branch as a separate `test:` change. A 3rd review round on that test → APPROVED (0 comments); its 2 NITs (`setUp` clears stray `UITEST_CARDS`; `defer`-guarded sort-mode cleanup) were then applied, along with gating the DEBUG sample-card seeder to the empty state so it no longer crowds the sort button in dev builds.

### File List

- `targets/watch/CardListView.swift` — `WatchSortMode` enum, `WatchCard.sorted(_:by:)`, `@AppStorage` sort pref, toolbar sort button + `.sheet`, `WatchSortPickerView`, `displayCards` driven by mode, re-order animation; `sortedForDisplay` mixed-`nil` parity fix; pre-existing `onChange` deprecation fix; DEBUG sample-card seeder gated to the empty state (avoids crowding the sort button in dev builds).
- `targets/watch/en.lproj/Localizable.strings` — `watch.sort.*` keys.
- `targets/watch/it.lproj/Localizable.strings` — `watch.sort.*` keys.
- `targets/watch/__tests__/watch-layout-contract.test.ts` — 2 new Story 9.5 contract specs (sort model + sort control).
- `watch-ios/Tests/CardStoreTests.swift` — 8 new Story 9.5 XCTests (3 mode orderings, frequent mixed-`nil` tier, A-Z diacritic-insensitivity, `az` default, `allCases` order, `UserDefaults` round-trip); plus rewrote the pre-existing `test_readOnly_*` into a meaningful read-only persistence-invariant guard with English comments (stakeholder follow-up; not a 9.5 AC). Test isolation hardened: `setUp` clears any stray `UITEST_CARDS` env; the sort-mode persistence test cleanup is `defer`-guarded.
- `docs/sprint-artifacts/sprint-status.yaml` — `9-5-selectable-watch-sort` status.
- `docs/sprint-artifacts/stories/9-5-selectable-watch-sort.md` — status, tasks, this record.

## Change Log

| Date       | Version | Description                                                             | Author       |
| ---------- | ------- | ----------------------------------------------------------------------- | ------------ |
| 2026-06-09 | 0.1     | Drafted via correct-course (C1)                                         | Amelia (dev) |
| 2026-06-10 | 0.2     | Implemented selectable watch sort (model, UI, l10n, tests); AC1–AC6 met | Amelia (dev) |
