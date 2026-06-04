# Story 16.1: Migrate Styling Engine — NativeWind → Unistyles [Enabling]

Status: drafted

## Story

As a developer maintaining myLoyaltyCards,
I want to replace NativeWind (Tailwind) with react-native-unistyles as the styling engine,
so that styling is faster (no React re-render on theme/breakpoint changes), type-safe, and unified with the existing `shared/theme` token system — with zero visual regression for users.

## Context

The app currently styles components with **NativeWind 4.2.1** (Tailwind CSS for RN) via `className` props, alongside a hand-rolled design-system token layer in `shared/theme/` (colors, typography, spacing, ThemeProvider) introduced in Story 13-1. Dynamic colors already read from theme token _values_; `className` is used mostly for static layout. This split means two styling systems coexist.

This story migrates the styling mechanism to **react-native-unistyles (v3.x)**, which keeps StyleSheet-like ergonomics, recomputes styles in a C++ core without React re-renders, and natively supports themes + breakpoints. The existing `shared/theme/` tokens become the single source feeding Unistyles' theme registry — so the design system is **preserved**; only the consumption mechanism changes.

**Footprint (measured 2026-06-04):** **31** source files use `className`, out of **197** ts/tsx files. The migration is contained and can proceed incrementally.

> ⚠️ Unistyles 3 ships native code (Nitro Modules) and requires the New Architecture — fine on Expo SDK 55 / RN 0.83 (New Arch default), but it means **no Expo Go**: a prebuild / dev-client build is required. This project already uses prebuild (native watch targets, CocoaPods), so no workflow change.

## Acceptance Criteria

### AC1: Unistyles installed & configured

- [ ] `react-native-unistyles` v3.x + required native deps (e.g. `react-native-nitro-modules`) added to package.json
- [ ] Babel plugin configured per Unistyles 3 docs
- [ ] `StyleSheet.configure` registers light + dark themes sourced from existing `shared/theme/` tokens (colors, typography, spacing)
- [ ] Breakpoints defined if needed (current app is phone-only 2-col; document explicitly if none required)
- [ ] App builds and runs via dev client on iOS (prebuild) — no Expo Go assumption

### AC2: Theme tokens preserved (single source of truth)

- [ ] `shared/theme/` remains the canonical token source; Unistyles themes are **derived** from it, not duplicated
- [ ] Light/dark switching still respects system preference + the in-app ThemePickerSheet (no regression to Story 13-10 behavior)
- [ ] `useThemePreference` continues to drive theme selection

### AC3: All `className` usage migrated

- [ ] All 31 `className`-using files converted to Unistyles `StyleSheet.create` + `useStyles` (or `withUnistyles`)
- [ ] No `className` props remain in `app/`, `features/`, `shared/`, `core/`
- [ ] Both static layout and dynamic theming expressed via Unistyles

### AC4: NativeWind fully removed

- [ ] `nativewind` + `tailwindcss` removed from package.json
- [ ] `tailwind.config.js`, `global.css`, `nativewind-env.d.ts` deleted
- [ ] NativeWind references removed from `babel.config.js` and `metro.config.js`
- [ ] `global.css` import removed from the app entrypoint
- [ ] Grep confirms zero `nativewind` / `tailwind` references remain

### AC5: Zero visual regression

- [ ] Every migrated screen visually compared against pre-migration (light + dark): card list/grid, card detail, add-card flow, auth screens, settings, onboarding, sync indicators
- [ ] Spacing (8px grid), Accessible Sage palette, and typography are unchanged to the eye
- [ ] Manual device check on a real iPhone (watch UI is native Swift — unaffected, out of scope)

### AC6: Tests pass / coverage maintained

- [ ] Full `npm test` suite green, no regressions
- [ ] Coverage ≥ 80% branches/functions/lines/statements (existing jest threshold)
- [ ] NativeWind-specific jest setup/mocks replaced with Unistyles equivalents in `jest.setup.js`
- [ ] Snapshot tests updated where styling output legitimately changed

### AC7: Atomic migration (no half-baked release)

- [ ] No release ships with both NativeWind and Unistyles active — the migration reaches users as a single complete change
- [ ] When 16-1 is marked done, AC3 (all files migrated), AC4 (NativeWind removed), and AC5 (zero visual regression) all hold simultaneously
- [ ] Internal incremental commits are fine for rollback safety, but no partial-migration state is tagged or released

## Tasks / Subtasks

### Task 1: Install & configure Unistyles (AC: 1, 2)

- [ ] Add `react-native-unistyles@^3` + native deps; prebuild + `LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 pod install` (per repo CocoaPods workaround)
- [ ] Configure the Unistyles babel plugin
- [ ] Create `shared/theme/unistyles.ts`: map `colors.ts` / `typography.ts` / `spacing.ts` → Unistyles themes and register via `StyleSheet.configure`
- [ ] Wire theme selection to `useThemePreference` / ThemeProvider

### Task 2: Pilot migration — 1 simple + 1 complex component (AC: 3, 5)

- [ ] Migrate one leaf component (e.g. shared `Button` or `CardTile`) end-to-end as the reference pattern
- [ ] Migrate one full screen (e.g. card list) to validate theme + layout parity
- [ ] Document the conversion recipe in Dev Notes for the remaining batch
- [ ] **Spike check:** confirm NativeWind and Unistyles babel plugins can coexist during incremental migration (if not, migration must be per-entrypoint big-bang)

### Task 3: Batch-migrate remaining className files (AC: 3)

- [ ] Convert remaining files in feature batches: cards → auth → settings → onboarding → sync indicators → shared
- [ ] Keep each batch a separate commit for easy visual review / rollback

### Task 4: Remove NativeWind (AC: 4)

- [ ] Delete config files + plugin entries; remove deps; drop `global.css` import
- [ ] Grep-verify zero `className=` and zero `nativewind` / `tailwind` references remain

### Task 5: Tests + visual parity sweep (AC: 5, 6)

- [ ] Replace NativeWind jest setup with a Unistyles mock
- [ ] Run full suite; fix regressions; update snapshots
- [ ] Manual light/dark device pass across all screens

## Dev Notes

### Open Decisions (resolve during refinement → ready-for-dev)

1. **Migration approach** — recommend **incremental** (batch by feature, brief coexistence) over big-bang. _Owner: Winston._
2. **Unistyles version** — confirm v3.x (New Arch / Nitro Modules) vs a 2.x line. v3 recommended given Expo 55 New Arch default.
3. **Plugin coexistence** — verify NativeWind + Unistyles babel plugins don't conflict mid-migration (validated in Task 2 spike). If they do, migration becomes big-bang.
4. **Scope split — DECIDED (2026-06-04): do NOT split.** Stays one atomic story. Rationale: solo dev (no parallel-work or independent-review benefit), and the migration must ship all-or-nothing to avoid a half-baked state where NativeWind and Unistyles both reach users (see AC7). Internal dev may still proceed in safe per-feature batches/commits for rollback, but the story is "done" — and released — only when AC3 + AC4 + AC5 hold together.

### Key Facts (measured 2026-06-04)

- NativeWind **4.2.1**, tailwindcss **^3.4.0** → target **react-native-unistyles ^3**
- **31** files use `className` / **197** total ts/tsx files
- Token layer: `shared/theme/{colors,typography,spacing,luminance,sync-tokens,ThemeProvider,index}`
- Configs to remove: `tailwind.config.js`, `global.css`, `nativewind-env.d.ts`; clean `babel.config.js`, `metro.config.js`
- Expo **^55.0.19**, RN **0.83.6** (New Architecture default)
- Jest coverage gate: **80%** all metrics (`jest.config.js`)
- Watch app is native Swift — out of scope, unaffected

### Architecture Compliance

- Feature-first structure preserved
- `shared/theme/` stays the single source of truth (no token duplication into Unistyles)
- Tests co-located; 80% coverage gate respected

## References

- [Foundation dependency: docs/sprint-artifacts/stories/13-1-implement-design-system-tokens.md]
- [Dark-mode behavior to preserve: docs/sprint-artifacts/stories/13-10-fix-dark-mode-system-preference.md]
- [Project rules: docs/project_context.md]
- [Architecture: docs/architecture.md]
- [react-native-unistyles v3 documentation]

## Blocks

- **Blocked by:** None (token layer from Story 13-1 already complete)
- **Blocks:** Future styling-dependent stories should land after this to avoid double-migration

## Dev Agent Record

### Agent Model Used

_(pending implementation)_

### Debug Log References

_(pending implementation)_

### Completion Notes List

_(pending implementation)_

### File List

_(pending implementation)_
