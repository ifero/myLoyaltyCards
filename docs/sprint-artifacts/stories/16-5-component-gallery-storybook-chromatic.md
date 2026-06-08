# Story 16.5: Component preview gallery — Storybook + Chromatic [Blocked by 16-1]

Status: backlog

Epic: 16 — Platform & Tech Debt

## Story

As a reviewer or design contributor,
I want a public component gallery with visual-regression review on every PR,
so that UI/design changes are reviewable without building the app locally or holding a Figma seat.

## Background / Context

The component library lives at `shared/components/ui/` (Button, TextField, ActionRow, BottomSheet, CardShell, ColorPicker, ToggleSwitch) but there is **no Storybook** today. A web-served Storybook (via `react-native-web`) published through **Chromatic** (free for open source) gives every PR a public component preview plus visual-diff review — the closest thing to a git-anchored, account-free "design review surface."

**Dependency — `Blocked by: 16-1`.** Story 16-1 replaces NativeWind with react-native-unistyles and deletes `tailwind.config.js` / `global.css`. The web rendering pipeline for Storybook is styling-engine-specific, so we build it **once, against the final engine** to avoid throwaway plumbing.

> Open decision (resolve at refinement, per maintainer): if 16-1 is deprioritized, build engine-agnostically by theming stories via the existing `ThemeProvider` + inline-style path (preserved by both engines), treating class-based layout as best-effort. This needs a **spike** first: Unistyles-3's native (Nitro/C++, New-Architecture) core rendering under `react-native-web` is unproven.

Components theme via `useTheme()` + inline styles (`className` is mostly layout), which is the safety net: colors/typography render correctly through the ThemeProvider even if class-based styling is imperfect on web.

## Acceptance Criteria (draft — refine before dev)

1. A web Storybook (`react-native-web`, e.g. `@storybook/react-native-web-vite`) renders the `shared/components/ui` primitives in **light and dark** via a `ThemeProvider` decorator that mocks `core/settings` (the `Button` test's `jest.mock('@/shared/theme')` shows the isolation pattern); i18n is initialized and stories are wrapped in `SafeAreaProvider` so `ColorPicker`/`BottomSheet` render.
2. Stories exist for the 7 primitives. **MVP:** Button / TextField / ToggleSwitch / CardShell (no i18n/icon/portal deps); then ActionRow / ColorPicker / BottomSheet (require vector-icon fonts + i18n + Modal-on-web verification).
3. **Chromatic** (free OSS tier) publishes on PRs via a **separate, path-filtered** `.github/workflows/chromatic.yml` that mirrors `ci-quality-gates.yml` (Node 24, yarn `sdk55` cache, `fetch-depth: 0`) and uses `onlyChanged`/TurboSnap to stay within quota. PRs get a public preview URL + visual diffs; a README badge links the published Storybook. The existing merge gates are **not** slowed.
4. An ESLint override for `**/*.stories.tsx` disables `i18next/no-literal-string` and exempts `boundaries`, so `yarn lint` (a merge gate) stays green.
5. `storybook`, `build-storybook`, and `chromatic` scripts are added to `package.json`.

## Tasks / Subtasks (draft)

- [ ] (Gate) Confirm 16-1 done, or take the refinement decision + run the Unistyles-on-web spike.
- [ ] Add Storybook + `react-native-web` deps; create `.storybook/main.ts` + `preview.tsx` (theme/i18n/SafeArea decorators; reproduce the styling pipeline on web).
- [ ] Seed the 4 MVP stories; verify the light/dark toggle renders.
- [ ] Add the 3 dependency-heavier stories (vector-icon fonts, i18n, Modal-on-web).
- [ ] Add the ESLint stories override.
- [ ] Create the Chromatic project + `CHROMATIC_PROJECT_TOKEN` secret; add `chromatic.yml` (path-filtered, `onlyChanged`) + README badge.

## Tech Notes

- Biggest risk is the **CSS pipeline on web** (NativeWind-under-Vite pre-16-1, or Unistyles-on-web post-16-1 — both unproven). Safety net: `useTheme()` inline styling renders colors/typography regardless.
- Reanimated / gesture-handler are **not** used by the `ui/` primitives, so they are not a blocker for the MVP.
- Keep the Chromatic workflow off the critical merge path; path-filter to UI surfaces only.

## Definition of Ready (before moving to ready-for-dev)

- [ ] 16-1 is `done` — OR a refinement decision to build engine-agnostically, with the Unistyles-on-web spike passed.
- [ ] Chromatic project created and `CHROMATIC_PROJECT_TOKEN` available as a GitHub secret.
- [ ] MVP story scope confirmed.

## Blocks

- **Blocked by:** 16-1 (styling engine migration NativeWind → Unistyles).
