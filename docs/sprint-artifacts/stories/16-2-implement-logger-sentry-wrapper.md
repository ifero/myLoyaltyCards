# Story 16.2: Implement logger/Sentry wrapper and migrate console.\* call sites

Status: backlog

Epic: 16 — Platform & Tech Debt

## Story

As a maintainer,
I want a single logging wrapper that gates debug output on `__DEV__` and routes errors to Sentry in production,
so that production error reporting actually fires and logging is consistent across the codebase.

## Background / Context

Surfaced during **Story 9.2** code review (2026-06-07). `docs/project_context.md` (Error Handling → Logging) and `CONTRIBUTING.md` prescribe a `logger` wrapper with `Sentry.captureException` in production instead of `console.*`. However:

- **No `logger` wrapper is implemented or used anywhere in `features/`.**
- Hooks and components call `console.error` / `console.log` directly — e.g. `features/cards/hooks/useTrackCardUsage.ts`, `useDeleteCard.ts`, `useEditCard.ts`, `useAddCard.ts`, `useToggleFavorite.ts`, `features/cards/components/CardDetails.tsx`, `features/settings/hooks/useImportData.ts`, and others.
- **Net effect: production errors are never captured by Sentry** for these paths.

This is a pre-existing, codebase-wide convention divergence — not introduced by any single feature story — so it should be fixed project-wide in one change.

## Acceptance Criteria (draft — refine before dev)

1. A `logger` module exists (likely `core/utils/logger.ts`, exported from `core/utils`) with `log` / `warn` / `error`:
   - `log` / `warn` are dev-only (gated on `__DEV__`).
   - `error` always logs and, in production (`!__DEV__`), calls `Sentry.captureException`.
2. Sentry is initialised appropriately per environment, or the wrapper degrades gracefully if Sentry isn't configured — and never leaks PII / card data (GDPR — see privacy rules).
3. All `console.error` / `console.log` / `console.warn` call sites in `features/`, `core/`, `shared/`, and `app/` are migrated to the wrapper (excluding intentional build/dev tooling under `scripts/`).
4. Tests that currently assert on `console.error` (e.g. `useTrackCardUsage.test.ts`, `useToggleFavorite.test.ts`, `useDeleteCard.test.ts`) are updated to assert on the wrapper.
5. ESLint enforces the convention (e.g. `no-console`, allowing only the wrapper) so it cannot regress.
6. `yarn lint`, `yarn typecheck`, `yarn test` all pass; coverage threshold maintained.

## Tasks / Subtasks (draft)

- [ ] Add `core/utils/logger.ts` (+ export from `core/utils`): `log`/`warn`/`error`, `__DEV__` gating, prod `Sentry.captureException`.
- [ ] Decide on / wire Sentry init (confirm `@sentry/react-native` dependency, env config, PII scrubbing) — or a graceful no-op if Sentry is deferred.
- [ ] Migrate `console.*` call sites across `features/`, `core/`, `shared/`, `app/` to the wrapper.
- [ ] Update tests that assert on `console.*` to target the wrapper.
- [ ] Add/enable an ESLint `no-console` rule (wrapper-allowed); fix violations.
- [ ] Run all quality gates.

## Tech Notes

- Reference: `docs/project_context.md` → "Error Handling → Logging" (prescribed shape) and "Critical Anti-Patterns" ("Use `console.log` directly ❌ → Use `logger` wrapper ✅").
- Sibling precedent intentionally left on `console.error` pending this story: `useToggleFavorite.ts` (Story 9.2), `useTrackCardUsage.ts` (Story 9.1).
- Privacy: do not send card data / PII to Sentry (GDPR rules).
- Confirm whether `@sentry/*` is already a dependency; if not, installing it is part of this story.

## Definition of Ready (before moving to ready-for-dev)

- [ ] Confirm Sentry is the chosen provider + how it's initialised per environment (dev/prod).
- [ ] Confirm the exact logger API surface and the ESLint enforcement approach.
- [ ] Confirm PII-scrubbing requirements.
