# Story 16.5: Component preview gallery — Storybook + Chromatic [Blocked by 16-1]

Status: done

Epic: 16 — Platform & Tech Debt

## Story

As a reviewer or design contributor,
I want a public component gallery with visual-regression review on every PR,
so that UI/design changes are reviewable without building the app locally or holding a Figma seat.

## Background / Context

The component library lives at `shared/components/ui/` (Button, TextField, ActionRow, BottomSheet, CardShell, ColorPicker, ToggleSwitch) but there is **no Storybook** today. A web-served Storybook (via `react-native-web`) published through **Chromatic** (free for open source) gives every PR a public component preview plus visual-diff review — the closest thing to a git-anchored, account-free "design review surface."

**Dependency — `Blocked by: 16-1`.** Story 16-1 replaces NativeWind with react-native-unistyles and deletes `tailwind.config.js` / `global.css`. The web rendering pipeline for Storybook is styling-engine-specific, so we build it **once, against the final engine** to avoid throwaway plumbing.

> ✅ **Resolved 2026-06-11:** 16-1 (Unistyles migration) is committed to this sprint (Wave 2), so 16-5 takes the **"build once, against the final engine"** path — build the web Storybook pipeline against **Unistyles** after 16-1 lands. The engine-agnostic fallback (ThemeProvider + inline styles + Unistyles-on-web spike) is **not** taken. 16-5 is **dev-gated on 16-1** (Sprint 16 Wave 4).

Components theme via `useTheme()` + inline styles (`className` is mostly layout), which is the safety net: colors/typography render correctly through the ThemeProvider even if class-based styling is imperfect on web.

## Acceptance Criteria (draft — refine before dev)

1. A web Storybook (`react-native-web`, e.g. `@storybook/react-native-web-vite`) renders the `shared/components/ui` primitives in **light and dark** via a `ThemeProvider` decorator that mocks `core/settings` (the `Button` test's `jest.mock('@/shared/theme')` shows the isolation pattern); i18n is initialized and stories are wrapped in `SafeAreaProvider` so `ColorPicker`/`BottomSheet` render.
2. Stories exist for the 7 primitives. **MVP:** Button / TextField / ToggleSwitch / CardShell (no i18n/icon/portal deps); then ActionRow / ColorPicker / BottomSheet (require vector-icon fonts + i18n + Modal-on-web verification).
3. **Chromatic** (free OSS tier) publishes on PRs via a **separate, path-filtered** `.github/workflows/chromatic.yml` that mirrors `ci-quality-gates.yml` (Node 24, yarn `sdk55` cache, `fetch-depth: 0`) and uses `onlyChanged`/TurboSnap to stay within quota. PRs get a public preview URL + visual diffs; a README badge links the published Storybook. The existing merge gates are **not** slowed.
4. An ESLint override for `**/*.stories.tsx` disables `i18next/no-literal-string` and exempts `boundaries`, so `yarn lint` (a merge gate) stays green.
5. `storybook`, `build-storybook`, and `chromatic` scripts are added to `package.json`.

## Tasks / Subtasks (draft)

- [x] (Gate) 16-1 (Unistyles) must be `done` before 16-5 dev starts (Wave 4) — build the web pipeline against Unistyles. (No engine-agnostic spike: 16-1 is committed this sprint.) — verified `16-1-migrate-nativewind-to-unistyles: done`.
- [x] Add Storybook + `react-native-web` deps; create `.storybook/main.ts` + `preview.tsx` (theme/i18n/SafeArea decorators; reproduce the styling pipeline on web). — Storybook 10.4.6 + `@storybook/react-native-web-vite`; Unistyles babel plugin wired via `framework.options.pluginReactOptions.babel`; `expo-sqlite/kv-store` aliased to an in-memory mock so the real `ThemeProvider`/i18n render on web.
- [x] Seed the 4 MVP stories; verify the light/dark toggle renders. — Button / TextField / ToggleSwitch / CardShell; light/dark verified by the jest smoke test (canvas bg flips `#FFFFFF`↔`#000000`).
- [x] Add the 3 dependency-heavier stories (vector-icon fonts, i18n, Modal-on-web). — ActionRow / ColorPicker / BottomSheet; all render in the web build and the smoke test.
- [x] Add the ESLint stories override. — `**/*.stories.{ts,tsx}` + `.storybook/**` exempt from `i18next/no-literal-string` and `boundaries/element-types`; `yarn lint` green.
- [x] Add the Chromatic CI workflow, scripts, and README badge — path-filtered `chromatic.yml` (`--only-changed`/TurboSnap, `--exit-zero-on-changes`, off the merge critical path), `storybook`/`build-storybook`/`chromatic` scripts, README badge.
- [ ] **Human prerequisite (ifero, not dev work):** create the free OSS Chromatic project + add the `CHROMATIC_PROJECT_TOKEN` GitHub secret, then replace `CHROMATIC_APP_ID` in the README badge. Until then `chromatic.yml` no-ops its publish step (stays green). This is the DoR operational prereq the story already called out — the spec/code is complete regardless.

## Tech Notes

- Biggest risk is the **CSS pipeline on web** (NativeWind-under-Vite pre-16-1, or Unistyles-on-web post-16-1 — both unproven). Safety net: `useTheme()` inline styling renders colors/typography regardless.
- Reanimated / gesture-handler are **not** used by the `ui/` primitives, so they are not a blocker for the MVP.
- Keep the Chromatic workflow off the critical merge path; path-filter to UI surfaces only.

## Definition of Ready (resolved 2026-06-11)

- [x] **Engine path decided — build after 16-1 (Unistyles).** 16-1 is committed to Sprint 16 (Wave 2); 16-5 is **dev-gated** on it (Wave 4). No engine-agnostic spike.
- [ ] **Chromatic project + `CHROMATIC_PROJECT_TOKEN` — human prerequisite (ifero):** create the free OSS Chromatic project and add the GitHub secret before the `chromatic.yml` step can run. (Spec is ready regardless.)
- [x] **MVP story scope confirmed** — Button / TextField / ToggleSwitch / CardShell first; then ActionRow / ColorPicker / BottomSheet.

> Status: spec is `ready-for-dev`, but **dev must not start until 16-1 is `done`** (Wave 4) and the Chromatic token exists.

## Blocks

- **Blocked by:** 16-1 (styling engine migration NativeWind → Unistyles). ✅ Unblocked — 16-1 is `done`.

## Dev Agent Record

### Context & approach

- **Engine path:** built the web pipeline against **Unistyles v3** (16-1 is `done`), per the resolved DoR — no engine-agnostic spike.
- **Framework:** `@storybook/react-native-web-vite@10.4.6` (Storybook 10, Vite 8). `react-native-web@0.21.2` + `react-dom@19.2.0` installed via `npx expo install` (Expo-pinned, per AGENTS.md); Storybook/Vite/Chromatic via `yarn add -D`.
- **Web styling pipeline (AC1, the flagged risk):** the app's Unistyles babel transform is reproduced in the Storybook Vite build via `framework.options.pluginReactOptions.babel.plugins` (`react-native-unistyles/plugin`, `autoProcessImports`) — mirrors `babel.config.js`. `build-storybook` compiles the full graph (RN→web, Unistyles, `@expo/vector-icons`, i18n, `Modal`) with **0 errors**.
- **Isolation seam (AC1 "mock core/settings"):** rather than stubbing all of `core/settings`, the single native leaf `expo-sqlite/kv-store` is aliased (Vite) / jest-mocked to an in-memory store. This keeps the **real** `ThemeProvider` (both the `useTheme()` context and the Unistyles engine via `UnistylesRuntime.setTheme`), `shared/i18n`, and `shared/theme/unistyles` as the single source of truth. The toolbar theme toggle drives the real provider by persisting the preference and remounting `ThemeProvider` via `key` (see `.storybook/StoryDecorator.tsx`, reused by the smoke test).
- **Chromatic (AC3):** a **separate**, path-filtered `.github/workflows/chromatic.yml` mirrors `ci-quality-gates.yml` (Node 24, `yarn` `sdk55` cache, `fetch-depth: 0`) and runs the pinned Chromatic CLI (`chromatic@18`) with `--only-changed` (TurboSnap) + `--exit-zero-on-changes` (off the merge critical path). The publish step is guarded on `CHROMATIC_PROJECT_TOKEN`, so it no-ops (green) until the human prereq is met.
- **tsconfig:** `.storybook/**` added to `include` — TS `**` globs skip dot-directories, so the config files were otherwise unparsed by `tsc`/typed-ESLint.

### Validation

- `yarn typecheck` → 0 errors (incl. `.storybook/**`).
- `yarn lint` → 0 errors / 0 warnings.
- `yarn tokens:check` → in sync.
- `yarn test:coverage --runInBand` → **1622/1622 pass**, 156 suites, coverage thresholds held (story smoke tests render all 33 stories in light + dark, plus a re-render toggle guard; no regressions).
- `yarn build-storybook` → **build completed successfully** (33 stories across the 7 primitives).
- **In-browser render (real browser, static build):** verified Button (`useTheme`, dark), TextField (`useUnistyles` engine, dark), ActionRow (MaterialIcons font, light), and BottomSheet (Modal-on-web, dark) all render with the theme applied and **no console errors** — confirms AC1 (light + dark) on web.
- **`yarn storybook` dev server:** starts cleanly and serves (HTTP 200); the manager lists all 7 components / 33 stories; no process crash.
- **Chromatic** adds the automated per-PR visual-regression layer on top (human-gated on the token).

### Completion Notes

- All ACs implemented and verified (static gates + jest + real-browser render + dev-server liveness).
- Only open item is the **human operational prerequisite** (Chromatic project + `CHROMATIC_PROJECT_TOKEN` secret + README `CHROMATIC_APP_ID`) — not dev work; flagged above and to the stakeholder.

### Review fixes — round 1 (Sonnet subagent, adversarial)

The first review drove a real browser and caught two runtime defects the build-only checks missed; all findings resolved:

- **[Blocker] Every story crashed on web** — nothing imported the `shared/theme/unistyles` side-effect module, so `UnistylesRuntime.setTheme()` ran before `StyleSheet.configure()`. Fixed by importing it in `.storybook/preview.tsx` (mirrors `app/_layout.tsx`); browser-verified.
- **[Blocker] `yarn storybook` dev server crashed** on the first story request — Rolldown's dev linker choked on `expo-modules-core`'s type-only `ts-declarations/global` value-imports (the production build tree-shakes them). Fixed with a `resolveId` stub of that no-runtime module in `.storybook/main.ts`; dev server now starts + serves.
- **[High] Doc overclaim / no browser validation** — corrected this record and performed the real-browser verification above.
- **[Med] Unistyles babel-plugin config duplication** — added `babel.config.js` to `chromatic.yml` path filters + cross-reference comments in both files.
- **[Low] ColorPicker covered 3/5 colors** — added `Red` + `Grey` stories (all 5).
- **[Low] Icon-font bundle (~3 MB, all `@expo/vector-icons` families)** — inherent to `ActionRow`'s barrel `import { MaterialIcons } from '@expo/vector-icons'`; narrowing means editing a shipped primitive (out of 16.5 scope) and only affects Chromatic upload size, not correctness or the merge gate. **Deferred as a tracked follow-up.**
- **[Nit] Dead `render` branch in smoke test** — removed (no story uses a custom `render`).
- **[Nit] Side-effect in `StoryDecorator` render body** — round 1 moved it into a `useState` lazy initializer, but **round 2 caught that this broke the theme toggle**: the initializer runs only on mount, not on the re-render a toolbar toggle triggers, so the keyed `ThemeProvider` remounted while reading the stale scheme. **Reverted** to the render-body write (correct on mount _and_ re-render; rationale documented inline) and added a re-render regression test in `stories.test.tsx` that fails on the `useState` form and passes on the render-body form.

### File List

**Added**

- `.storybook/main.ts`
- `.storybook/preview.tsx`
- `.storybook/StoryDecorator.tsx`
- `.storybook/mocks/kv-store.ts`
- `.github/workflows/chromatic.yml`
- `shared/components/ui/Button.stories.tsx`
- `shared/components/ui/TextField.stories.tsx`
- `shared/components/ui/ToggleSwitch.stories.tsx`
- `shared/components/ui/CardShell.stories.tsx`
- `shared/components/ui/ActionRow.stories.tsx`
- `shared/components/ui/ColorPicker.stories.tsx`
- `shared/components/ui/BottomSheet.stories.tsx`
- `shared/components/ui/stories.test.tsx`

**Modified**

- `package.json` (deps: `react-native-web`, `react-dom`; devDeps: `storybook`, `@storybook/react-native-web-vite`, `vite`, `chromatic`; scripts: `storybook`, `build-storybook`, `chromatic`)
- `tsconfig.json` (`include` → `.storybook/**`)
- `babel.config.js` (cross-reference comment: Storybook mirrors the Unistyles plugin config)
- `eslint.config.mjs` (stories/`.storybook` override — AC4; ignore `storybook-static/`)
- `README.md` (component-gallery badge)
- `.gitignore` (`storybook-static/` + Chromatic logs)
- `docs/sprint-artifacts/sprint-status.yaml` (status → review)
- `yarn.lock`

## Change Log

- 2026-07-07 — Implemented Story 16.5: web Storybook (react-native-web-vite, Storybook 10) rendering the 7 `shared/components/ui` primitives in light/dark via a real-`ThemeProvider` decorator; 33 stories + jest smoke tests; path-filtered Chromatic workflow (off the merge critical path). All quality gates green (typecheck, lint, tokens, tests, build-storybook). Status → review. Remaining: human Chromatic project/token prereq.
- 2026-07-07 — Addressed round-1 code review (Sonnet): fixed two browser-runtime blockers (Unistyles `configure` import in preview; dev-server `expo-modules-core` type-only stub) plus 6 lower findings; real-browser render verified; full suite 1621/1621 green.
- 2026-07-07 — Round-2 review caught a regression from the round-1 #8 "fix": the `useState` wrapper broke the theme toggle on re-render. Reverted `StoryDecorator` to the render-body persist and added a re-render regression test (empirically confirmed to fail on the buggy form). Full suite 1622/1622 green.
