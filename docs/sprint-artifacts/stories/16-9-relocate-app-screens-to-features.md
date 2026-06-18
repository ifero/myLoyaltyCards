# Story 16.9: Relocate screens from the app/ routing layer into features/

Status: ready-for-dev

Epic: 16 — Platform & Tech Debt

<!-- Status: drafted 2026-06-18 (Bob/SM) → refined to ready-for-dev 2026-06-18 (Winston/Architect). All 6 open questions resolved with codebase evidence; see Architecture Decisions. AD-2 (cards→auth boundary exception) RATIFIED by ifero 2026-06-18 — no open items. -->

## Story

As a maintainer of myLoyaltyCards,
I want every screen implementation (and its tests) moved out of the `app/` routing layer into the correct `features/` module, with co-located tests and no `__tests__` folder, **and the documented-but-missing route-file lint rule implemented**,
so that `app/` stays a thin, _enforceably_ re-export-only routing boundary, feature code lives where the architecture says it should, and this debt cannot silently recur.

## Background / Context

The architecture mandates that `app/` is a **thin routing layer that only re-exports** screens from `features/` — no business logic in route files. Documented in `docs/project_context.md` (Project Structure, Route Files Pattern, Anti-Patterns) and `docs/architecture.md` (folder-responsibility table; "thin routing layer (delegates to features)").

Over time, several screens were built **directly in `app/`** instead of `features/`, plus a non-conforming `app/__tests__/` folder. This story relocates them. It is a **pure refactor** (move, don't rewrite) — zero behavioral/visual change — and is **engine-agnostic** (independent of the completed 16-1 Unistyles migration).

**Root cause (found during refinement):** `docs/architecture.md` (~line 1300) _specifies_ a route-file ESLint rule — `no-restricted-imports` banning `useState`/`useEffect`/`useCallback`/`useMemo` in `app/**/*.tsx` except `_layout.tsx` ("Route files must only re-export (no hooks/state)"). **That rule was never implemented in `eslint.config.mjs`** — only the layer `boundaries/element-types` rule is active. With no guard, hook-laden screens accumulated in `app/` while lint stayed green. This story closes that gap.

The correct target pattern already exists and must be mirrored:

```typescript
// app/welcome.tsx → onboarding (1-line re-export, the gold standard)
export { default } from '@/features/onboarding/screens/WelcomeScreen';
```

### Discovered inventory (SM + Architect recon, 2026-06-18)

**Screens to move (all → a NEW `features/cards/screens/` folder, which does not exist today):**

| `app/` file                  | Lines | `@/features/*` imports               | Move difficulty                    | Target                                        |
| ---------------------------- | ----- | ------------------------------------ | ---------------------------------- | --------------------------------------------- |
| `app/index.tsx` (HomeScreen) | 107   | **`cards` + `auth`** (cross-feature) | ⚠️ needs boundary exception (AD-2) | `features/cards/screens/HomeScreen.tsx`       |
| `app/card/[id].tsx`          | 241   | `cards` only                         | ✅ clean                           | `features/cards/screens/CardDetailScreen.tsx` |
| `app/card/[id]/edit.tsx`     | 213   | `cards` only                         | ✅ clean                           | `features/cards/screens/CardEditScreen.tsx`   |
| `app/barcode/[id].tsx`       | 124   | `cards` only                         | ✅ clean                           | `features/cards/screens/BarcodeScreen.tsx`    |

**Borderline:** `app/scan.tsx` (37) — legacy redirect shim (`useEffect` → `router.replace('/add-card/scan')`); **no feature imports**. Note: its `useEffect` would be flagged by the new lint rule (AC4) → must be refactored to declarative `<Redirect>` or removed (AD-4). `app/help-fallback.ts` (1) — a `.ts` helper (not `.tsx`, so untouched by the route-file rule); verify placement.

**Already correct — NO action:** all 1-line re-exports (`welcome`, `sign-in`, `create-account`, `forgot-password`, `reset-password`, `verify-email`, `settings`, `privacy-policy`, `data-summary`, `help`, `onboarding/*`) and `app/add-card/{index,scan,setup}.tsx`.

**Exempt — layouts, NO action:** `app/_layout.tsx` (418), `app/add-card/_layout.tsx` (42) — excluded from the route-file rule (`!app/**/_layout.tsx`); they legitimately hold routing/provider logic.

**`app/__tests__/` (7 files) — relocate + co-locate, delete folder:** `help.test.tsx`, `home-highlight.test.tsx`, `layout-initialization-error.test.tsx`, `onboarding.integration.test.tsx`, `scan.brand.test.tsx`, `welcome-redirect.test.tsx`, `welcome.test.tsx`. (Standard: 130 co-located `*.test.tsx` vs 40 in `__tests__` today — co-location wins.)

## Architecture Decisions (refinement output)

**AD-1 — All four screens land in a new `features/cards/screens/`.** `features/cards` has `components/hooks/repositories/utils` but no `screens/` — that gap is the leak's origin. Use the `<Name>Screen.tsx` **default-export** convention (matches `features/onboarding` & `features/settings`). `CardDetailScreen` (screen) is intentionally distinct from the existing `CardDetails` (component). Add a `// Screens` block to `features/cards/index.ts`; route files **deep-import the screen file** (e.g. `export { default } from '@/features/cards/screens/HomeScreen';`), matching the onboarding idiom.

**AD-2 — HomeScreen cross-feature composition → add a documented `cards → auth` boundary exception. ✅ RATIFIED (ifero, 2026-06-18).** `app/index.tsx` imports `@/features/auth` (`GuestModeBanner`, `MigrationBanner`, `useGuestMigration`) **and** `@/features/cards`. It sits in `app/` because `app/` is the only layer allowed to compose across features. Moving it into `features/cards` creates `cards → auth`, forbidden by `boundaries/element-types`. **Decision:** add a `cards → auth` exception to `eslint.config.mjs`, mirroring the existing `add-card → cards` exception — the home screen's guest/migration banners are a real, bounded auth dependency, and this keeps `app/index.tsx` a clean re-export. **Tradeoff:** the exception is feature-granular, so it allows _all_ of `cards` to import _all_ of `auth`. _Alternative considered & deferred (too large):_ promote the banners + their auth hooks to `shared/` (blocked because `shared → features` is forbidden, so the hooks would have to move too). **Ratified by ifero (2026-06-18):** proceed with the `cards → auth` exception.

**AD-3 — Implement the missing route-file lint rule (root-cause fix).** Add the `architecture.md`-documented `no-restricted-imports` rule (ban `useState`/`useEffect`/`useCallback`/`useMemo` in `app/**/*.tsx` except `_layout.tsx`) to `eslint.config.mjs`. Post-migration, a green `yarn lint` is the completeness proof — no hooks left in any route file.

**AD-4 — `scan.tsx` vs the new rule.** Its `useEffect` redirect would fail AC4. Refactor to expo-router's declarative `<Redirect href=...>` (no hooks) preserving param forwarding, **or** remove `/scan` if confirmed to have no inbound deep links.

**AD-5 — Test placement.** `welcome-redirect.test.tsx` and `layout-initialization-error.test.tsx` both `import RootLayout from '../_layout'` — they test the **exempt `app/_layout.tsx`**, so they stay in `app/`, co-located (e.g. `app/_layout.test.tsx`, merged or split). The rest co-locate with their screens' new homes: `home-highlight` → `features/cards/screens/`; `help` → `features/help/`; `onboarding.integration` → `features/onboarding/`; `scan.brand` → `features/add-card/`. **Reconcile `welcome.test.tsx` against the existing `features/onboarding/screens/WelcomeScreen.test.tsx`** (possible duplicate — merge/dedupe).

**AD-6 — Sequence before 16-2.** 16-2 (logger/Sentry) migrates `console.*` in `card/[id].tsx`, `card/[id]/edit.tsx`, `barcode/[id].tsx` (1 call each) — the same files 16-9 moves. **Land 16-9 first** (pure move), then let 16-2 swap `console→logger` at the new `features/cards/screens/` paths. Do not run them concurrently on those three files.

**AD-7 — Sibling `__tests__` cleanup is a separate story.** Five more non-conforming `__tests__` folders exist outside `app/` (`features/auth`, `features/auth/components`, `features/privacy`, `shared/components`, `targets/watch`). Keep 16-9 scoped to `app/` for a reviewable diff; recommend a follow-up (e.g. 16-10).

## Acceptance Criteria

1. A new `features/cards/screens/` folder exists; the four screens are moved there **with no logic changes** (pure relocation), default-exported, and added to `features/cards/index.ts` under a `// Screens` block. [AD-1]
2. The four `app/` route files (`index.tsx`, `card/[id].tsx`, `card/[id]/edit.tsx`, `barcode/[id].tsx`) become **thin re-exports** deep-importing the screen file. [AD-1]
3. A documented `cards → auth` exception is added to `boundaries/element-types` in `eslint.config.mjs`; `yarn lint` boundary checks pass for the moved `HomeScreen`. [AD-2 — ratified by ifero 2026-06-18]
4. The route-file `no-restricted-imports` rule (ban `useState`/`useEffect`/`useCallback`/`useMemo` in `app/**/*.tsx` except `_layout.tsx`) is added to `eslint.config.mjs`, and `yarn lint` is **green** after the migration. [AD-3]
5. `app/scan.tsx` is refactored to a hook-free declarative `<Redirect>` or removed (if `/scan` is dead), preserving existing behavior. [AD-4]
6. `app/__tests__/` is removed; its 7 tests are relocated and co-located per AD-5 (the two `_layout` tests stay with `app/_layout.tsx`); `welcome.test.tsx` duplication is reconciled. [AD-5]
7. No `__tests__` folder is introduced anywhere; co-located `*.test.tsx` only.
8. **Green gates, zero regression:** `yarn lint` (incl. `boundaries`), full test suite (coverage ≥ 80%), and watch build all pass; every route resolves to the same screen with no visual/behavioral change.

## Tasks / Subtasks

- [ ] Create `features/cards/screens/`; add the `// Screens` export block to `features/cards/index.ts`. (AC: 1)
- [ ] Move the 3 clean screens (`CardDetailScreen`, `CardEditScreen`, `BarcodeScreen`) → `features/cards/screens/`; collapse their routes to re-exports. (AC: 1, 2)
- [ ] Move `HomeScreen` → `features/cards/screens/HomeScreen.tsx`; collapse `app/index.tsx` to a re-export. (AC: 1, 2)
- [ ] Add the `cards → auth` exception to `boundaries/element-types`. (AC: 3)
- [ ] Add the route-file `no-restricted-imports` rule to `eslint.config.mjs`. (AC: 4)
- [ ] Refactor or remove `app/scan.tsx` (`<Redirect>` vs delete); verify `app/help-fallback.ts` placement. (AC: 5)
- [ ] Relocate the 7 `app/__tests__/*` tests per AD-5; delete `app/__tests__/`; reconcile `welcome.test.tsx`. (AC: 6, 7)
- [ ] Run `yarn lint`, full test suite, and watch build; confirm green + zero regression. (AC: 4, 8)

## Tech Notes

- **Mirror the gold standard** (`app/welcome.tsx`, `app/add-card/index.tsx`) for the re-export shape.
- **Move, don't rewrite** — keep screen logic verbatim so the diff is mechanical and regression-free; the refactor's risk lives entirely in import paths and the two ESLint additions.
- **`_layout.tsx` stays exempt** — do not collapse layouts.
- **Order matters:** add the route-file lint rule early; it will go red on the un-migrated screens (and `scan.tsx`) and green only once everything is moved — use it as the migration's done-signal.
- **Process (AGENTS.md):** arrow-function components, atomic commits, conventional messages, never `--no-verify`, stakeholder sign-off before commits.

## Resolved Questions (was: Open Questions)

1. Per-screen target → **AD-1** (all → `features/cards/screens/`).
2. Routing-behavior test placement → **AD-5** (`_layout` tests stay in `app/`, co-located).
3. Screen naming + export surface → **AD-1** (default-export `<Name>Screen`; `// Screens` block in `features/cards/index.ts`).
4. ESLint scope → **AD-3** (implement the documented-but-missing rule, not just verify).
5. Sibling `__tests__` cleanup → **AD-7** (separate follow-up story).
6. Sequencing vs 16-2 → **AD-6** (16-9 first).

## Definition of Ready

- [x] Per-screen target mapping confirmed (AD-1)
- [x] Test relocation strategy confirmed (AD-5)
- [x] Screen naming + export surface confirmed (AD-1)
- [x] ESLint scope decided (AD-3, AD-4)
- [x] `__tests__` follow-up scope decided (AD-7)
- [x] Sequencing vs 16-2 agreed (AD-6)
- [x] **AD-2 (`cards → auth` boundary exception) ratified by ifero (2026-06-18)**

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
