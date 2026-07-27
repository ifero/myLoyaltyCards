# Story 16.1: Migrate Styling Engine — NativeWind → Unistyles [Enabling]

Status: done

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

- [x] `react-native-unistyles` v3.x + required native deps (`react-native-nitro-modules`, `react-native-edge-to-edge`) added to package.json
- [x] Babel plugin configured per Unistyles 3 docs
- [x] `StyleSheet.configure` registers light + dark themes sourced from existing `shared/theme/` tokens (colors, typography, spacing)
- [x] Breakpoints: phone-only — single base breakpoint `{ xs: 0 }` registered, `mq` intentionally unused (documented in `unistyles.ts`)
- [ ] App builds and runs via dev client on iOS (prebuild) — **ifero's hardware gate** (Nitro native module needs prebuild + pod install)

### AC2: Theme tokens preserved (single source of truth)

- [x] `shared/theme/` remains the canonical token source; Unistyles themes are **derived** from it, not duplicated (verified by `unistyles.test.ts` reference-equality assertions)
- [x] Light/dark switching still respects system preference + the in-app ThemePickerSheet (no regression to Story 13-10 behavior); `adaptiveThemes: false`, ThemeProvider drives `UnistylesRuntime.setTheme`
- [x] `useThemePreference` continues to drive theme selection

### AC3: All `className` usage migrated

- [x] All 31 `className`-using files converted to Unistyles `StyleSheet.create`
- [x] No `className` props remain in `app/`, `features/`, `shared/`, `core/` (grep-verified)
- [x] Both static layout and dynamic theming expressed via Unistyles / `shared/theme` tokens

### AC4: NativeWind fully removed

- [x] `nativewind` + `tailwindcss` + `prettier-plugin-tailwindcss` removed from package.json
- [x] `tailwind.config.js`, `global.css`, `nativewind-env.d.ts` deleted
- [x] NativeWind references removed from `babel.config.js` and `metro.config.js` (and `prettier.config.js`, `tsconfig.json`, `jest.setup.js`)
- [x] `global.css` import removed from the app entrypoint (replaced by `@/shared/theme/unistyles`)
- [x] Grep confirms zero `nativewind` / `tailwind` references remain (excluding migration-context comments)

### AC5: Zero visual regression

- [~] Pixel/colour parity verified statically: every converted value matched against the pre-migration NativeWind/Tailwind output (custom 8px spacing scale, stock font/radius/colours) — confirmed by the Sonnet code review. **On-device visual comparison is ifero's gate.**
- [~] Spacing (8px grid), palette, and typography preserved at the value level (tokens unchanged; conversion table in Dev Agent Record) — **eye-level device confirmation pending ifero**
- [ ] Manual device check on a real iPhone (watch UI is native Swift — unaffected, out of scope) — **ifero's hardware gate**

### AC6: Tests pass / coverage maintained

- [x] Full test suite green, no regressions (152 suites / 1544 tests); `tsc` + ESLint clean
- [x] Coverage ≥ 80% — 90.92% statements / 80.74% branches / 86.91% functions / 91.49% lines
- [x] NativeWind-specific jest setup/mocks replaced with `react-native-unistyles/mocks` + configured themes in `jest.setup.js`; `transformIgnorePatterns` updated
- [x] No snapshot tests in repo (N/A); added `unistyles.test.ts` for derivation/initial-theme logic

### AC7: Atomic migration (no half-baked release)

- [x] No release ships with both NativeWind and Unistyles active — big-bang migration; neither engine coexists in the babel pipeline
- [x] AC3 (all files migrated) + AC4 (NativeWind removed) hold simultaneously in this single change; AC5 value-level parity holds, pending ifero's device sweep before marking done
- [x] No partial-migration state tagged or released (single review-gated change)

## Tasks / Subtasks

### Task 1: Install & configure Unistyles (AC: 1, 2)

- [x] Add `react-native-unistyles@^3` + native deps (`react-native-nitro-modules`, `react-native-edge-to-edge`) — installed `react-native-unistyles@3.2.5`. ⚠️ prebuild + `pod install` is a device/native step for ifero (cannot run in sandbox).
- [x] Configure the Unistyles babel plugin (`root: 'app'` + `autoProcessImports: ['react-native-unistyles']` for multi-root coverage; reanimated plugin stays last)
- [x] Create `shared/theme/unistyles.ts`: derive light/dark Unistyles themes from `colors.ts` / `typography.ts` / `spacing.ts` / `sync-tokens.ts` and register via `StyleSheet.configure`
- [x] Wire theme selection to `useThemePreference` / ThemeProvider (`UnistylesRuntime.setTheme`)

### Task 2: Pilot migration — 1 simple + 1 complex component (AC: 3, 5)

- [x] Migrate one leaf component (`shared/components/ui/TextField`) end-to-end as the reference pattern
- [x] Migrate the shared component layer (TextField, ActionRow, BottomSheet, ColorPicker, sync/conflict components) to validate theme + layout parity
- [x] Document the conversion recipe in Dev Agent Record for the remaining batch
- [x] **Spike check:** babel-plugin coexistence requires a native build (not runnable in sandbox) → took the story's documented **big-bang** fallback; NativeWind/Unistyles never coexist in the pipeline (AC7)

### Task 3: Batch-migrate remaining className files (AC: 3)

- [x] Convert remaining files in feature batches: cards → auth → privacy/help → app routes (all 31 className files migrated)
- [x] Batches kept logically separate; commit deferred to a single review-gated commit per ifero's instruction (no per-batch commits)

### Task 4: Remove NativeWind (AC: 4)

- [x] Delete config files (`tailwind.config.js`, `global.css`, `nativewind-env.d.ts`) + plugin entries; remove deps (`nativewind`, `tailwindcss`, `prettier-plugin-tailwindcss`); drop `global.css` import; remove dead `TAILWIND_*` token adapters; clean `tsconfig.json`
- [x] Grep-verified zero `className=` and zero `nativewind` / `tailwind` references remain (only migration-context comments remain in `unistyles.ts`)

### Task 5: Tests + visual parity sweep (AC: 5, 6)

- [x] Replace NativeWind jest setup with the official `react-native-unistyles/mocks` + configured themes
- [x] Run full suite; fix regressions; no snapshots in repo (N/A). Added `unistyles.test.ts` for derivation/initial-theme logic
- [ ] **Manual light/dark device pass across all screens — ifero's hardware gate (AC5)**

## Dev Notes

### Resolved Decisions (2026-06-11, refinement)

1. **Migration approach — INCREMENTAL with a big-bang fallback.** Migrate feature-by-feature (cards → auth → settings → onboarding → sync indicators → shared) in rollback-safe commits. **Gated by the Task 2 spike:** if the NativeWind + Unistyles babel plugins cannot coexist mid-migration, fall back to a single big-bang migration. Ships atomically either way (AC7). _Owner: Winston._
2. **Unistyles version — v3.x (confirmed).** New Architecture prerequisite verified in-repo: `app.json` `newArchEnabled: true`, RN 0.83.6, Expo ^55.0.19. v3 (Nitro Modules) is correct; no 2.x line.
3. **Plugin coexistence — empirical, decided by the Task 2 spike** (not a pre-decision). The spike outcome selects incremental (coexistence OK) vs big-bang (conflict).
4. **Scope split — NO (decided 2026-06-04).** One atomic story; released only when AC3 + AC4 + AC5 hold together (AC7). Internal per-feature batches/commits allowed for rollback safety.

_Repo survey (2026-06-11) confirmed the Key Facts below: 31 `className` files, NativeWind 4.2.1 / tailwindcss ^3.4.0 / `prettier-plugin-tailwindcss` present, `react-native-unistyles` NOT yet installed, `shared/theme` tokens intact, New Arch on._

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
- [Project rules: docs/project-context.md]
- [Architecture: docs/architecture.md]
- [react-native-unistyles v3 documentation]

## Blocks

- **Blocked by:** None (token layer from Story 13-1 already complete)
- **Blocks:** Future styling-dependent stories should land after this to avoid double-migration

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Amelia / dev agent) — 2026-06-13

### Migration approach (spike resolution)

The Task-2 babel-plugin coexistence spike requires a native dev-client build, which
cannot run in the CI/sandbox environment used for implementation. Per the story's
documented fallback (Dev Notes decision #1/#3), the migration was executed as a single
**big-bang** change: NativeWind and Unistyles never coexist in the babel pipeline. The
change still ships atomically (AC7); internal per-batch commits provide rollback safety.

### Conversion recipe

Engine wiring:

- `shared/theme/unistyles.ts` derives `light`/`dark` Unistyles themes from the existing
  `shared/theme` tokens (colors + spacing + layout + touchTarget + typography + flattened
  sync tokens) and calls `StyleSheet.configure` (adaptive themes OFF). Theme shape:
  `{ colors, spacing, layout, touchTarget, typography, sync, cardColors, barcodeFlash }`.
- `ThemeProvider` drives `UnistylesRuntime.setTheme(resolvedScheme)` in place of NativeWind's
  `setColorScheme`, so `useThemePreference` + system preference still govern selection
  (no regression to Story 13-10). `useTheme()` context is unchanged for existing consumers.
- Babel: `react-native-unistyles/plugin` with `{ root: 'app', autoProcessImports: ['react-native-unistyles'] }`
  so files across `app/features/shared/core` are all processed. Reanimated plugin stays last.
- Jest: `react-native-unistyles/mocks` + side-effect import of `shared/theme/unistyles` in
  `jest.setup.js`; package added to `transformIgnorePatterns` allowlist. Themed styles resolve
  against the first-registered theme (`light`), so tests assert against `LIGHT_THEME` tokens.

Per-file pattern: `import { StyleSheet, useUnistyles } from 'react-native-unistyles'`; move
static layout + theme colors into a module-level `StyleSheet.create((theme) => ({…}))`; replace
`className="…"` with `style={styles.x}` (array-merge for per-instance dynamic values); read
ad-hoc colors via `useUnistyles().theme.colors.*` instead of `useTheme()`.

className → style conversion table (matches the pre-migration NativeWind/Tailwind output):

- Spacing (custom 8px grid): `0.5`=4 `1`=8 `1.5`=12 `2`=16 `2.5`=20 `3`=24 `3.5`=28 `4`=32
  `4.5`=36 `5`=40 `5.5`=44 `6`=48 `7`=56 `8`=64 `9`=72 `10`=80; defaults `11`=44 `12`=48 `20`=80.
  `p/px/py/pt/pb/pl/pr/m…/gap/h/w/top/right` map to padding*/margin*/gap/height/width/top/right.
- Layout: `flex-1`→flex:1, `flex-[2]`→flex:2, `flex-row`→flexDirection:'row', `items-center`→
  alignItems:'center', `justify-center`/`justify-end`→justifyContent:'center'/'flex-end',
  `self-center`→alignSelf:'center', `text-center`→textAlign:'center', `w-full`→width:'100%',
  `absolute`→position:'absolute', `right-0`→right:0, `overflow-hidden`→overflow:'hidden',
  `top-1/4`→'25%', `top-1/2`→'50%'.
- Radius (Tailwind defaults): `rounded`=4 `rounded-md`=6 `rounded-lg`=8 `rounded-xl`=12
  `rounded-2xl`=16 `rounded-full`=9999.
- Font size (Tailwind defaults, fontSize/lineHeight): `text-xs`=12/16 `text-sm`=14/20
  `text-base`=16/24 `text-lg`=18/28 `text-xl`=20/28 `text-2xl`=24/32; `leading-5`→lineHeight:20.
- Font weight: `font-medium`='500' `font-semibold`='600' `font-bold`='700'.
- Border: `border`→borderWidth:1, `border-2`→borderWidth:2.
- Colors: `text-white`/`bg-white`→#FFFFFF, `text-red-500`→#EF4444, `text-gray-400`→#9CA3AF,
  `text-gray-500`→#6B7280, `text-gray-600`→#4B5563, `bg-neutral-900`→#171717,
  `text-neutral-400`→#A3A3A3.

### Debug Log References

- Jest could not load `react-native-unistyles/mocks` (ESM `export {}`) until the package was added to `transformIgnorePatterns` allowlist (`jest.config.js`).
- `app/__tests__/{layout-initialization-error,welcome-redirect}.test.tsx` mocked the deleted `../../global.css`; removed those obsolete `jest.mock` lines.
- Array-style assertions (`style={[styles.x, { dynamic }]}`) required `StyleSheet.flatten()` in the sync/conflict + TextField tests.

### Completion Notes List

- Engine fully migrated NativeWind → react-native-unistyles@3.2.5 (big-bang). All 31 `className` files converted; NativeWind/Tailwind deps + configs removed.
- `shared/theme/unistyles.ts` derives `light`/`dark` themes from existing tokens (single source of truth, AC2); `ThemeProvider` drives `UnistylesRuntime.setTheme` (adaptive themes off — preserves Story 13-10).
- Conversion rule: `className` (static layout + static colours) → Unistyles `StyleSheet.create`; pre-existing app-wide `useTheme()` inline dynamic styles left intact (out of scope; same tokens). Pixel/colour values matched 1:1 to the prior NativeWind/Tailwind output (custom 8px spacing scale + stock font/radius/colours) — see conversion table above.
- Gates: 152 suites / 1544 tests green; coverage 90.92/80.74/86.91/91.49 (≥80%); `tsc` + ESLint clean; zero `className`/`nativewind`/`tailwind` references in source.
- Reviews: Sonnet code-review (2 rounds → 0 comments) + Sonnet QA-review (2 rounds → 0 comments).
- **Post-review nav-bar fix (ifero device feedback):** header icons flashed/tinted on press + transition. Root cause: the Unistyles babel plugin (`root: 'app'`) remaps `react-native` `Pressable` to the Unistyles wrapper, whose `style(state)` callback runs `UnistylesShadowRegistry.remove+add` on every press (verified in node_modules) — churning the shadow registry inside the native nav header. This regressed even files NOT edited during the migration (e.g. `app/card/[id].tsx`), because the babel-config change has repo-wide blast radius. Fix: added `HeaderIconButton` (raw RN `Pressable`/`StyleSheet`, lives in `shared/` so it's not force-processed → no remap) and routed all nav-bar buttons through it; memoized header `screenOptions`/render props (unstable inline options forced native header reconfiguration mid-transition). Applied to:
  - `app/_layout.tsx` — home settings/add icons + global back button.
  - `app/card/[id].tsx` — back + favourite-star buttons (also recomputed the whole options object on every scroll-driven `isHeaderCondensed` toggle — now memoized).
  - `app/add-card/_layout.tsx` — memoized `screenOptions` (no header icons; consistency/cleanliness).

  Two focused Sonnet reviews → 0 comments each. All gates re-green (152 suites / 1544 tests, coverage steady, tsc + ESLint clean).

- **Flagged (NOT in this story — needs ifero's go-ahead):** `expo-system-ui` not installed though `app.json` sets `userInterfaceStyle: automatic` — can cause a launch-time window-background flash (adding a dependency is ifero's call).
- ⚠️ **Outstanding human gates (ifero, on device):** AC1 dev-client iOS build (Nitro native module → needs `expo prebuild` + `pod install`) and AC5 on-device light/dark visual sweep across all screens. Dark-token rendering for `useUnistyles()` components is not unit-verifiable (Unistyles v3 mock always returns the first/`light` theme), so the device sweep is the authoritative dark-mode regression gate.

### File List

**Added**

- `shared/theme/unistyles.ts` — Unistyles theme registry + `StyleSheet.configure`
- `shared/theme/unistyles.test.ts` — unit tests for derivation / initial-theme
- `shared/components/ui/HeaderIconButton.tsx` — raw-RN 44pt nav-bar icon button (post-review nav-bar flash fix; see Completion Notes)

**Deleted**

- `tailwind.config.js`, `global.css`, `nativewind-env.d.ts`

**Modified — config/build**

- `package.json`, `yarn.lock` (deps add/remove)
- `babel.config.js`, `babel.config.test.js`, `metro.config.js`, `prettier.config.js`
- `jest.config.js`, `jest.setup.js`, `tsconfig.json`

**Modified — theme**

- `shared/theme/ThemeProvider.tsx`, `shared/theme/ThemeProvider.test.tsx`
- `shared/theme/colors.ts`, `shared/theme/typography.ts`, `shared/theme/spacing.ts`, `shared/theme/index.ts`

**Modified — shared components**

- `shared/components/ui/TextField.tsx` (+ `.test.tsx`), `shared/components/ui/ActionRow.tsx`, `shared/components/ui/BottomSheet.tsx`, `shared/components/ui/ColorPicker.tsx`
- `shared/components/OfflineIndicator.tsx` (+ `.test.tsx`), `shared/components/SyncIndicator.tsx` (+ `.test.tsx`), `shared/components/SyncErrorBanner.tsx` (+ `.test.tsx`), `shared/components/ConsentCheckbox.tsx`, `shared/components/ConflictComparisonCard.tsx` (+ `.test.tsx`), `shared/components/ConflictResolutionModal.tsx` (+ `.test.tsx`)

**Modified — features**

- `features/cards/components/{BarcodeScanner,CardForm,CatalogueGrid,ColorPicker,FormatPicker}.tsx`
- `features/auth/components/{AppIconHeader,AuthScreenLayout,ErrorBanner,GuestModeBanner,PasswordStrengthIndicator}.tsx`
- `features/auth/{CreateAccountScreen,ForgotPasswordScreen,MigrationBanner,ResetPasswordScreen,SignInScreen,VerifyEmailScreen}.tsx`
- `features/help/HelpScreen.tsx`, `features/privacy/{DataSummaryScreen,PrivacyPolicyScreen}.tsx`

**Modified — app routes**

- `app/_layout.tsx`, `app/barcode/[id].tsx`
- `app/card/[id].tsx`, `app/add-card/_layout.tsx` (nav-bar flash fix — header buttons + memoized options)
- `app/__tests__/layout-initialization-error.test.tsx`, `app/__tests__/welcome-redirect.test.tsx`
