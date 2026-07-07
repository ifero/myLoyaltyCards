# Story 16.4: Make design tokens a portable DTCG source via Style Dictionary

Status: review

Epic: 16 — Platform & Tech Debt

## Story

As a design contributor,
I want the design tokens available in a portable, human-diffable JSON format that generates the existing TypeScript,
so that token changes are easy to review in a PR and the tokens are portable to other tools (Figma Tokens plugin, Penpot) — without breaking the app.

## Background / Context

Design tokens already live in code at `shared/theme/colors.ts`, `spacing.ts`, and `typography.ts`, but only as TypeScript — not a portable, tool-agnostic artifact. Moving the _canonical_ values into the **W3C Design Tokens (DTCG) JSON** format and generating the TS via **Style Dictionary** gives a single, diff-friendly, tool-portable source.

**Verified constraints (these shape a layered, low-risk approach):**

- `colors.ts` mixes pure tokens with **catalogue-runtime** data: `import catalogueData from '../../catalogue/italy.json'` → `BRAND_COLORS` / `getBrandColor`.
- It also carries a non-token `statusBar: 'dark'|'light'` literal and a set of **derived `TAILWIND_*` exports** that `tailwind.config.js` consumes **by name**.
- `spacing.ts` builds `TAILWIND_SPACING`/`TAILWIND_TOUCH_TARGET` by interpolation; `typography.ts` emits a Tailwind **tuple** shape (`['34px', { … }]`).
- `colors.contrast.test.ts` imports `LIGHT_THEME`/`DARK_THEME`.

⇒ Style Dictionary **cannot own these files wholesale**. The approach generates only the _primitive records_ and keeps all derived / runtime / tuple logic hand-authored.

Engine-agnostic: 16-1 (NativeWind → Unistyles) explicitly preserves `shared/theme/` as the token source, so this work survives that migration.

## Acceptance Criteria (draft — refine before dev)

1. `tokens/*.json` (DTCG format) authored for **primitives + semantic color maps** (MVP): `PRIMARY_COLORS`, `NEUTRAL_COLORS`, `CARD_COLORS`, the color members of `LIGHT_THEME`/`DARK_THEME` (excluding `statusBar`), `SPACING`, `TOUCH_TARGET`, and `LAYOUT`. **`TYPOGRAPHY` (tuple) and `sync-tokens` are DEFERRED** to a follow-up (MVP scope decision 2026-06-11).
2. A Style Dictionary config generates `shared/theme/tokens.generated.ts` with the exact existing constant names and `as const` shapes. The generated file is **committed** (not gitignored) so Metro / Jest / tsc need no build step.
3. `colors.ts` / `spacing.ts` / `typography.ts` are refactored to **import primitives** from `tokens.generated.ts` while keeping hand-authored: `BRAND_COLORS`/`getBrandColor`, `statusBar`, all `TAILWIND_*` exports, the typography tuple builder, the spacing interpolation. All **public named exports remain byte-stable**, so `tailwind.config.js`, every `@/shared/theme` consumer, and `colors.contrast.test.ts` work unchanged.
4. `tokens:build` and `tokens:check` scripts exist; `tokens:check` regenerates to a temp location and `git diff --exit-code`s against the committed file (drift guard), mirroring the existing `check:catalogue-generated` pattern. A CI step runs `tokens:check`.
5. `yarn typecheck` and `yarn test` pass; the WCAG contrast test (`colors.contrast.test.ts`) is the canary and stays green.

## Tasks / Subtasks (draft)

- [x] Transcribe current literal values into `tokens/*.json` (DTCG).
- [x] Add `style-dictionary` dev-dependency + `style-dictionary.config.mjs` with a custom TS format that reproduces the existing primitive shapes/keys.
- [x] Generate `shared/theme/tokens.generated.ts`; `git diff` to confirm byte-for-byte parity with today's values.
- [x] Refactor the three theme files to import primitives; keep derived/runtime exports hand-authored. _(colors.ts + spacing.ts; typography.ts left fully hand-authored — TYPOGRAPHY deferred per AC1.)_
- [x] Add `tokens:build` + `tokens:check` scripts + a CI guard step.
- [x] Run `yarn typecheck` + `yarn test`; confirm contrast test green.

## Tech Notes

- **MVP** = colors + spacing primitives. The **typography tuple** and `sync-tokens` generation are **nice-to-have** (they need the fiddliest custom formats) — defer.
- Honest framing: the JSON-canonical layer is what delivers "versioned, PR-able tokens"; the Style Dictionary codegen is the _means_, and its real payoff is **portability** (DTCG is readable by Figma Tokens / other tools), not necessity — the tokens already work in TS today.
- Do **not** move `BRAND_COLORS`/`getBrandColor`/`statusBar` into JSON; they are catalogue-runtime / non-token data.

## Definition of Ready (resolved 2026-06-11)

- [x] **Commit `shared/theme/tokens.generated.ts`** (CONFIRMED, recommended) — not gitignored; a `tokens:check` CI guard `git diff`s a fresh regen for drift (mirrors `check:catalogue-generated`). No build step needed for Metro/Jest/tsc.
- [x] **MVP scope = colors + spacing/layout primitives** (CONFIRMED). The **typography tuple + `sync-tokens` are DEFERRED** to a follow-up (fiddliest custom Style Dictionary formats) — see AC1.
- [x] **DTCG layout** confirmed — token JSON under `tokens/*.json` (e.g. `tokens/color.json`, `tokens/spacing.json`).

## Dev Agent Record

### Context Reference

- Implemented by Amelia (Dev agent) via the `dev-story` workflow on 2026-07-07.
- Branch: `feature/16-4-design-tokens-dtcg-style-dictionary`.
- Style Dictionary v5.5.0.

### Completion Notes

**MVP delivered (AC1–AC5).** Canonical primitive values now live in DTCG JSON under `tokens/` and generate `shared/theme/tokens.generated.ts` via Style Dictionary. `colors.ts` and `spacing.ts` import the generated primitives; all public `@/shared/theme` exports are byte-stable.

- **AC1** — `tokens/color.json` + `tokens/spacing.json` (DTCG `$value`/`$type`) author `PRIMARY_COLORS`, `CARD_COLORS`, `NEUTRAL_COLORS`, `LIGHT_THEME_COLORS`, `DARK_THEME_COLORS` (color members only; `statusBar` excluded), `SPACING`, `LAYOUT`, `TOUCH_TARGET`. `TYPOGRAPHY` + `sync-tokens` deferred as planned.
- **AC2** — a custom `typescript/mlc-token-primitives` Style Dictionary format (in `scripts/token-format.mjs`, so the formatting logic is ESLint-covered) regenerates the exact `export const <NAME> = { … } as const` shapes/keys. Committed, no build step for Metro/Jest/tsc.
- **AC3** — `colors.ts`/`spacing.ts` import primitives; `BRAND_COLORS`/`getBrandColor`, `statusBar`, `SEMANTIC_COLORS`, `BARCODE_FLASH` stay hand-authored. `CARD_COLORS` keeps its `Record<CardColor, string>` public type via a typed re-assignment; `LIGHT_THEME`/`DARK_THEME` are reassembled from the generated color maps + the hand-authored `statusBar`. New `tokens.generated.test.ts` asserts value parity.
- **AC4** — `tokens:build` / `tokens:check` scripts + a `tokens:check` CI step in `ci-quality-gates.yml`. The generator prettier-formats its output so the committed file matches a fresh regen; `tokens:check` diffs a temp regen with `git diff --no-index --exit-code` (mirrors `check:catalogue-generated`).
- **AC5** — `yarn typecheck`, `yarn lint` (0 errors / 0 warnings), and `yarn test` (1572/1572, 155 suites) all green; the WCAG contrast canary passes unchanged. (Coverage stays ≥80%, but note `jest.config.js`'s `collectCoverageFrom` scopes coverage to `features/**`/`core/**` — this story's `shared/theme` + build-tooling files aren't instrumented, so the real value-safety nets here are `tokens.generated.test.ts` and the contrast canary, not the coverage number.)

**⚠️ Story-context divergence (16.1 landed first).** The story's "Verified constraints" (§Background) predate Story 16.1 (NativeWind→Unistyles), which is now `done`. Consequently `tailwind.config.js` and all `TAILWIND_*` exports **no longer exist**, and `typography.ts` no longer emits a Tailwind tuple. Byte-stability was therefore validated against the _actual_ current public API (the `shared/theme/index.ts` barrel + the `unistyles.ts` consumer), not the stale description. This shrank the hand-authored surface to catalogue-runtime + `statusBar` + `SEMANTIC_COLORS`/`BARCODE_FLASH`; there is no `tailwind.config.js` left to keep working.

**Decisions:**

- `LAYOUT.cardAspectRatio` is authored as the exact IEEE-754 double `1.3333333333333333` (=== `4 / 3`); runtime value unchanged. Its TS type narrows from `number` to that literal — assignable everywhere `number` was, so no consumer breaks.
- `style-dictionary` added as a **devDependency** (build-time codegen, not an Expo runtime lib → `yarn add -D`, not `npx expo install`).
- Grid-unit / touch-target documentation from the old inline comments is preserved as DTCG `$description` fields in the JSON (the canonical source).

### File List

**New:**

- `tokens/color.json`
- `tokens/spacing.json`
- `style-dictionary.config.mjs`
- `scripts/token-format.mjs`
- `scripts/build-tokens.mjs`
- `shared/theme/tokens.generated.ts` (generated, committed)
- `shared/theme/tokens.generated.test.ts`

**Modified:**

- `shared/theme/colors.ts`
- `shared/theme/spacing.ts`
- `package.json` (`style-dictionary` devDependency; `tokens:build` / `tokens:check` scripts)
- `yarn.lock`
- `.github/workflows/ci-quality-gates.yml` (`tokens:check` step)
- `.husky/pre-push` (`tokens:check` gate)
- `CONTRIBUTING.md` (quality-gates table: added `tokens:check`)
- `docs/design/CONTRIBUTING-DESIGN.md` (Layer 1 tokens now point to `tokens/*.json` + `yarn tokens:build`)
- `docs/sprint-artifacts/sprint-status.yaml` (16-4 → `in-progress`; the `review` gate lives in the story `.md`, per the `mark-story-done.mjs` invariant that the yaml never holds `review`)
- `docs/sprint-artifacts/stories/16-4-design-tokens-dtcg-style-dictionary.md`

## Change Log

| Date       | Version | Description                                                                                                                                                                                                                                                                                                                                                         | Author       |
| ---------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| 2026-07-07 | 0.1     | Implemented MVP: DTCG token JSON + Style Dictionary codegen (`tokens.generated.ts`) + byte-stable theme refactor + `tokens:build`/`tokens:check` + CI drift guard. All gates green.                                                                                                                                                                                 | Amelia (Dev) |
| 2026-07-07 | 0.2     | Addressed code-review + QA findings: DTCG `$type: number` (spec-valid); source-JSON validation (fail loudly on `$`-typos); leading-zero key guard; moved token-format logic to lint-covered `scripts/token-format.mjs`; doc updates (`CONTRIBUTING.md` × 1, `CONTRIBUTING-DESIGN.md`); `tokens:check` added to pre-push; sprint-status kept off the `review` value. | Amelia (Dev) |
