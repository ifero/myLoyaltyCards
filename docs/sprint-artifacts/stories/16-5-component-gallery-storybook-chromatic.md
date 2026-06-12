# Story 16.5: Component preview gallery — Storybook + Chromatic [Blocked by 16-1]

Status: ready-for-dev

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

- [ ] (Gate) 16-1 (Unistyles) must be `done` before 16-5 dev starts (Wave 4) — build the web pipeline against Unistyles. (No engine-agnostic spike: 16-1 is committed this sprint.)
- [ ] Add Storybook + `react-native-web` deps; create `.storybook/main.ts` + `preview.tsx` (theme/i18n/SafeArea decorators; reproduce the styling pipeline on web).
- [ ] Seed the 4 MVP stories; verify the light/dark toggle renders.
- [ ] Add the 3 dependency-heavier stories (vector-icon fonts, i18n, Modal-on-web).
- [ ] Add the ESLint stories override.
- [ ] Create the Chromatic project + `CHROMATIC_PROJECT_TOKEN` secret; add `chromatic.yml` (path-filtered, `onlyChanged`) + README badge.

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

- **Blocked by:** 16-1 (styling engine migration NativeWind → Unistyles).
