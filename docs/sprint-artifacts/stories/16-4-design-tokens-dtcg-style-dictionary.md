# Story 16.4: Make design tokens a portable DTCG source via Style Dictionary

Status: backlog

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

1. `tokens/*.json` (DTCG format) authored for **primitives + semantic color maps only**: `PRIMARY_COLORS`, `NEUTRAL_COLORS`, `CARD_COLORS`, the color members of `LIGHT_THEME`/`DARK_THEME` (excluding `statusBar`), `SPACING`, `TOUCH_TARGET`, `LAYOUT`, and `TYPOGRAPHY`.
2. A Style Dictionary config generates `shared/theme/tokens.generated.ts` with the exact existing constant names and `as const` shapes. The generated file is **committed** (not gitignored) so Metro / Jest / tsc need no build step.
3. `colors.ts` / `spacing.ts` / `typography.ts` are refactored to **import primitives** from `tokens.generated.ts` while keeping hand-authored: `BRAND_COLORS`/`getBrandColor`, `statusBar`, all `TAILWIND_*` exports, the typography tuple builder, the spacing interpolation. All **public named exports remain byte-stable**, so `tailwind.config.js`, every `@/shared/theme` consumer, and `colors.contrast.test.ts` work unchanged.
4. `tokens:build` and `tokens:check` scripts exist; `tokens:check` regenerates to a temp location and `git diff --exit-code`s against the committed file (drift guard), mirroring the existing `check:catalogue-generated` pattern. A CI step runs `tokens:check`.
5. `yarn typecheck` and `yarn test` pass; the WCAG contrast test (`colors.contrast.test.ts`) is the canary and stays green.

## Tasks / Subtasks (draft)

- [ ] Transcribe current literal values into `tokens/*.json` (DTCG).
- [ ] Add `style-dictionary` dev-dependency + `style-dictionary.config.mjs` with a custom TS format that reproduces the existing primitive shapes/keys.
- [ ] Generate `shared/theme/tokens.generated.ts`; `git diff` to confirm byte-for-byte parity with today's values.
- [ ] Refactor the three theme files to import primitives; keep derived/runtime exports hand-authored.
- [ ] Add `tokens:build` + `tokens:check` scripts + a CI guard step.
- [ ] Run `yarn typecheck` + `yarn test`; confirm contrast test green.

## Tech Notes

- **MVP** = colors + spacing primitives. The **typography tuple** and `sync-tokens` generation are **nice-to-have** (they need the fiddliest custom formats) — defer.
- Honest framing: the JSON-canonical layer is what delivers "versioned, PR-able tokens"; the Style Dictionary codegen is the _means_, and its real payoff is **portability** (DTCG is readable by Figma Tokens / other tools), not necessity — the tokens already work in TS today.
- Do **not** move `BRAND_COLORS`/`getBrandColor`/`statusBar` into JSON; they are catalogue-runtime / non-token data.

## Definition of Ready (before moving to ready-for-dev)

- [ ] Confirm the decision to commit `tokens.generated.ts` (recommended) vs gitignore + build step.
- [ ] Confirm the MVP token scope (colors + spacing first; typography/sync deferred).
- [ ] Confirm the DTCG file layout under `tokens/`.
