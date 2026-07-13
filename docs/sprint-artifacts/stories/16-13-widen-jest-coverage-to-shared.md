---
baseline_commit: 31af5be5c911b70d221dfec7ea07a5ce991279a2
---

# Story 16.13: Widen the Jest coverage gate to `shared/**`

Status: review

Epic: 16 — Platform & Tech Debt

## Story

As a developer relying on the coverage gate to catch untested code,
I want `shared/**` included in Jest's coverage collection,
so that safety-critical logic in `shared/` (Supabase auth/session, sync hooks) is held to the same 80% threshold as `core/` and `features/`.

## Context

Follow-up from **Story 16.10** QA review. `jest.config.js` `collectCoverageFrom` currently spans only `features/**` + `core/**` (`:22-27`). The 16.10 hotfix logic (`shared/supabase/useBootAuthGate.ts`, `client.ts`) and the 16-8 store (`shared/hooks/useCloudSync.ts`) sit **outside** the enforced 80% global gate — well tested, but not measured.

**Empirical finding (measured 2026-07-11, main checkout, full suite 1675 tests) — this INVERTS the draft's premise.** Adding `shared/**` does **not** drop the gate; `shared/**` is already ~95% covered, so the global numbers **improve**:

| Metric     | Now (core+features) | +`shared/**` | Δ         | Gate  |
| ---------- | ------------------- | ------------ | --------- | ----- |
| Statements | 91.38%              | **92.19%**   | **+0.81** | 80 ✅ |
| Branches   | 81.49%              | **83.91%**   | **+2.42** | 80 ✅ |
| Functions  | 87.84%              | 87.47%       | −0.37     | 80 ✅ |
| Lines      | 91.98%              | **92.82%**   | **+0.84** | 80 ✅ |

Both runs exit 0. **Branches** — the tightest metric today (only 1.49 pts of headroom) — **gains +2.42 pts**. So there is no large triage: the real work is the glob edit + one genuine backfill (`shared/toast.ts`, the only untested logic file) + a couple of cosmetic excludes.

The one genuine gap: **`shared/toast.ts`** (57.14% stmts / 50% branch, **no** co-located test) — a user-facing utility imported by 8 feature files.

## Acceptance Criteria

1. `collectCoverageFrom` in `jest.config.js` includes `'shared/**/*.{ts,tsx}'`, retaining `'!**/*.d.ts'` and `'!**/index.ts'`.
2. `yarn test:coverage` passes the **global 80%** threshold on all four metrics with `shared/` collected; the thresholds are **not** lowered. (Verified: 92.19 / 83.91 / 87.47 / 92.82, exit 0 — the glob edit alone keeps the gate green.)
3. `shared/toast.ts` gets a co-located `shared/toast.test.ts` to ≥80% (convention: prefer testing logic; "new behavior has tests") — it is the only untested logic file in `shared/`.
4. Each new exclude is enumerated with a one-line justification and **scoped to `shared/`** so core/features accounting is untouched: `'!shared/types/**'` (type-only modules, erased at compile — morally identical to the existing `!**/*.d.ts`); and (decision) `'!shared/theme/spacing.ts'` (pure re-export shim of `tokens.generated`, never imported directly).
5. CI "Quality gates" job (`ci-quality-gates.yml` runs `test:coverage`) stays green; no flaky suites.

## Tasks / Subtasks

- [x] (AC1) Add `'shared/**/*.{ts,tsx}'` to `collectCoverageFrom` (`jest.config.js:22-27`).
- [x] (AC3) Add `shared/toast.test.ts`: (a) happy path calls `Burnt.toast(options)`; (b) `Burnt.toast` not a function → `logger.warn` + early return (`toast.ts:10-11`); (c) `Burnt.toast` throws → catch `logger.warn` (`:16`). Mock `burnt` + `@/core/utils/logger`.
- [x] (AC4) Add `'!shared/types/**'` (type-only); decide on `'!shared/theme/spacing.ts'` (re-export shim) and document either way.
- [x] (AC2,5) Run `yarn test:coverage --watchAll=false --runInBand`; confirm global ≥80% on all four metrics, exit 0.
- [x] (AC4) Note in Dev Notes that `shared/i18n/index.ts` logic stays unmeasured under `!**/index.ts` (documented decision, not a regression).

## Dev Notes

### Current Jest coverage config (`jest.config.js`)

- `collectCoverageFrom` (`:22-27`): `features/**/*.{ts,tsx}`, `core/**/*.{ts,tsx}`, `!**/*.d.ts`, `!**/index.ts`.
- `coverageThreshold` (`:28-35`): global **80** on branches/functions/lines/statements.
- Ignores: `testPathIgnorePatterns` (`:18`) `['/node_modules/','/.claude/','babel.config.test.js','targets/watch/']`; `modulePathIgnorePatterns` (`:21`) `['/.claude/']` — the Haste worktree guard, **DO NOT touch**. No `coveragePathIgnorePatterns` anywhere; no per-file excludes beyond `d.ts`/`index.ts`.
- CI: `ci-quality-gates.yml` runs `yarn test:coverage --watchAll=false --runInBand`.

### `shared/**` gaps (measured; the only ones that matter)

- `shared/toast.ts` — 57.14 / 50, **no** test → **BACKFILL** (only required work).
- `shared/types/sync-ui.ts` — 0% type-only → **EXCLUDE** (`'!shared/types/**'`).
- `shared/theme/spacing.ts` — 0% pure re-export → **EXCLUDE** (decision).
- `shared/i18n/index.ts` — holds real logic (`getSystemLanguage` / `resolveLanguagePreference` / `changeAppLanguage`) but is swept out by `!**/index.ts` → stays **unmeasured**; document as a known gap (keep the blanket `index.ts` rule this round).
- Everything else in `shared/` (auth.ts 95.83, client.ts 91.76, useBootAuthGate 91.66, useCloudSync 99.1, useAutoSync 90.8, theme, i18n locales, `ui/*`) is already ≥80% aggregate.

### Test Plan

- **New:** `shared/toast.test.ts` (~3 tests) — the only required new file (mock `burnt` + `logger`).
- **Optional follow-ups (NOT needed for the gate; per-file dips only):** `useSyncUpload.ts` (branch 77%), `colors.getBrandColor` (funcs 50%), `ConflictResolutionModal.tsx` (funcs 33%). Leave as separate tech-debt unless done opportunistically.

### Regressions to avoid

Do **not** lower any of the four 80 thresholds; do **not** touch the `/.claude/` Haste guard (`:18-21`); keep `features/**`+`core/**` and the `d.ts`/`index.ts` excludes; **scope new excludes to `shared/`** (not global) so core/features accounting is undisturbed; avoid a global `!**/*.stories.*` / `!**/*.test.*` (it changes core/features accounting — leave it out).

### Scope estimate

Small chore: 1 config edit + 1 new test file + 1–2 excludes. **Zero** files strictly need backfill to keep the gate green (`toast.ts` is done for convention, not to rescue the gate).

### Definition of Ready

- [x] Baseline measured (glob edit keeps the gate green: 92.19 / 83.91 / 87.47 / 92.82)
- [x] Exclude policy defined (`shared/types/**`; `spacing.ts` decision)
- [x] Single global gate (no per-file ratchet)
- [ ] Open decisions confirmed by ifero (below) — recommended defaults baked in

### Open decisions (recommended defaults applied)

1. **`shared/theme/spacing.ts` (0%, pure re-export)** — baked in: EXCLUDE, for a clean report (contributes ~0 either way).
2. **`shared/types/sync-ui.ts`** — baked in: EXCLUDE the whole `shared/types/` dir (type-only).
3. **`shared/i18n/index.ts` logic unmeasured** — baked in: keep the blanket `!**/index.ts` rule + note the gap; a carve-out is a possible future story.
4. **Optional per-file backfills** (`useSyncUpload` branch, `getBrandColor`, `ConflictResolutionModal`) — baked in: leave as separate tech-debt (they don't affect the gate).

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Amelia, BMAD dev agent) — implementation. Code review + QA review delegated to sonnet subagents per stakeholder protocol.

### Debug Log References

- Developed in the **main checkout** (not a `.claude` worktree), so `yarn test:coverage` runs the full suite normally: **163 suites / 1699 tests pass**, `EXIT_CODE=0`.
- **Coverage with `shared/` collected — global gate GREEN (exit 0), thresholds unchanged at 80:**

  | Metric     | Global (All files) | Gate  |
  | ---------- | ------------------ | ----- |
  | Statements | 92.31%             | 80 ✅ |
  | Branches   | 84.11%             | 80 ✅ |
  | Functions  | 87.5%              | 80 ✅ |
  | Lines      | 92.94%             | 80 ✅ |

  Branches (the tightest metric) sits at 84.11% — comfortably above 80. Numbers differ slightly from the story's refinement measurement (83.91% branches) because the `toast.ts` backfill took it from 57.14/50 → **100/100/100/100**, and `main` advanced (1699 vs. the 1675 baseline).

- Other gates: `yarn eslint shared/toast.test.ts` → 0 errors (`jest.config.js` is eslint-ignored as a config file); `yarn typecheck` → 0 errors (validates the `ToastOptions` annotation + the test's casts); `npx prettier --check` on all changed files → clean; `yarn check:no-tests-folders` → pass (`toast.test.ts` is co-located, not in a `__tests__` folder).
- **Test-authoring note (2 RED-phase iterations on the mock strategy):**
  1. First cut used a module-level `jest.mock('@/core/utils/logger', …)` + a top-level `import { showToast }`. Failed: `jest.mock` hoists **above** the import, so the factory captured `mockLogger` before its `const` initialised → `logger` was `undefined` inside `toast.ts`. (This is exactly why `core/watch-connectivity.test.ts` `require()`s its subject _inside_ each test.)
  2. Switched to `jest.spyOn(logger, 'warn')` (the `shared/supabase/auth.test.ts` idiom). For the "unavailable" branch, `jest.replaceProperty(Burnt, 'toast', …)` is **rejected by Jest on function properties**, so I use a restored direct property swap (`Burnt` is a shared mocked-module object — proven by the happy-path assertion matching the same `jest.fn` `toast.ts` invokes). All three branches green.

### Completion Notes List

- **AC1 (glob widened)** ✅ `collectCoverageFrom` now includes `'shared/**/*.{ts,tsx}'`, retaining `'!**/*.d.ts'` + `'!**/index.ts'` (`jest.config.js:22-31`).
- **AC2 (gate stays green, thresholds not lowered)** ✅ Full `yarn test:coverage` exits 0 with `shared/` collected; global 92.31 / 84.11 / 87.5 / 92.94, all four ≥ 80. The four `coverageThreshold.global` values are untouched at 80.
- **AC3 (`toast.ts` backfill)** ✅ New co-located `shared/toast.test.ts` (3 tests) drives `toast.ts` to 100% on all metrics: (a) happy path forwards options to `Burnt.toast`; (b) unavailable `Burnt.toast` → `logger.warn` + early return; (c) rejecting `Burnt.toast` → caught `logger.warn`.
- **AC4 (excludes enumerated + `shared/`-scoped)** ✅ Added `'!shared/types/**'` (verified type-only — `sync-ui.ts` is pure `export type`, erased at compile, same rationale as `!**/*.d.ts`) and `'!shared/theme/spacing.ts'` (verified pure re-export of `tokens.generated` — a single `export {…} from` with no logic/branches of its own to cover). Both scoped to `shared/`, so `core/**` + `features/**` accounting is unchanged. Per the baked-in decision, the blanket `'!**/index.ts'` rule is kept, so `shared/i18n/index.ts` logic (`getSystemLanguage` / `resolveLanguagePreference` / `changeAppLanguage`) stays **unmeasured** — a documented known gap (Dev Notes), not a regression; a carve-out is a possible future story.
  - ⚠️ **Spec-wording correction (for ifero):** the story's AC4 + Dev Notes justify the `spacing.ts` exclude partly as "never imported directly" — that is **inaccurate**: `spacing.ts` is imported directly by 29 production files (e.g. `Button.tsx`, `CardDetails.tsx`, `ThemeProvider.tsx`). The **exclude decision still holds** on its true merit (a pure re-export with no logic/branches to cover), so there is no behaviour change — only the justification was wrong. The `jest.config.js` comment now uses the corrected rationale; the AC/Dev-Notes text was left unmodified (spec text is outside the dev-edit lane). Surfaced by the code-review pass.
- **AC5 (CI green, no flake)** ✅ 163 suites / 1699 tests pass; lint/typecheck/prettier/tests-folder guard all clean. No new suites (only `toast.test.ts`, deterministic — no timers/network).
- **Residual per-file coverage dips in `shared/` (deferred; do NOT affect the global gate) — for the record:** the global gate holds (92.31/84.11/87.5/92.94), but several individual `shared/` files sit below 80 on a single metric. Beyond the three the Dev Notes/Test Plan name (`useSyncUpload.ts` branch 77%, `colors.getBrandColor` funcs 50%, `ConflictResolutionModal.tsx` funcs 33%), measurement also shows: `client.ts` funcs 72.72%, `BottomSheet.tsx` funcs 66.66%, `useNetworkStatus.ts` branch 66.66%, `ConflictComparisonCard.tsx` branch 62.5%, `ConflictResolutionModal.tsx` branch 66.66%. All are **pre-existing** and low-risk (nullish fallbacks, best-effort `.catch(() => …)` cleanup swallows, Storybook/UI edge branches) — none is the safety-critical auth/session logic this story is chartered to protect, and none blocks AC2/AC5.
  - ⚠️ **For ifero:** the Dev Notes ("everything else … already ≥80% aggregate", `:65`) + Test Plan deferred list (`:70`) **understate** this — they name only 3 files; the fuller list is above. Spec text left unmodified (outside the dev-edit lane). Surfaced by the QA pass.

### File List

- `jest.config.js` — **modified**: added `'shared/**/*.{ts,tsx}'` to `collectCoverageFrom` + two `shared/`-scoped excludes with inline justifications.
- `shared/toast.test.ts` — **new**: 3-test suite covering all branches of `showToast`.
- `docs/sprint-artifacts/stories/16-13-widen-jest-coverage-to-shared.md` — **modified** (this file): baseline commit, task checkboxes, Dev Agent Record, status (workflow bookkeeping).
- `docs/sprint-artifacts/sprint-status.yaml` — **modified**: `16-13` status `ready-for-dev` → `in-progress` → `review` (workflow bookkeeping).

### Change Log

| Date       | Change                                                                                                                                                                                                                                                                           | Author       |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| 2026-07-10 | Drafted as a Story 16.10 QA follow-up. Needs refinement → ready-for-dev.                                                                                                                                                                                                         | Amelia (Dev) |
| 2026-07-11 | Refined → ready-for-dev. Measured coverage inverts the premise: the gate stays green; only `toast.ts` needs a backfill.                                                                                                                                                          | Amelia (Dev) |
| 2026-07-13 | Implemented: widened `collectCoverageFrom` to `shared/**` + 2 `shared/`-scoped excludes; backfilled `shared/toast.test.ts` (`toast.ts` → 100%). Full suite 163/1699 green, coverage gate green (92.31/84.11/87.5/92.94, exit 0), lint/typecheck/prettier clean. Status → review. | Amelia (Dev) |
