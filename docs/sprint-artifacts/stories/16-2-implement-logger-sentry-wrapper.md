# Story 16.2: Implement logger/Sentry wrapper and migrate console.\* call sites

Status: drafted

## Story

As a maintainer,
I want a single logging wrapper that gates debug output on `__DEV__` and routes errors to Sentry in production,
so that production error reporting actually fires and logging is consistent across the codebase.

## Context

Surfaced during **Story 9.2** code review (2026-06-07). `docs/project_context.md` (Error Handling → Logging) and `CONTRIBUTING.md` prescribe a `logger` wrapper with `Sentry.captureException` in production instead of `console.*`. Current state (verified 2026-06-08):

- A **minimal `logger` stub already exists** at `core/utils/logger.ts` (added 2026-03-28, exported from the `core/utils` barrel). It exposes `info` / `warn` / `error` but only **forwards directly to `console.*`** — no `__DEV__` gating and no Sentry routing.
- Adoption is **partial**: only a couple of `core/` call sites use it (`core/sync/retry.ts`, `core/schemas/index.ts`). **~65 `console.*` call sites** remain across `features/`, `core/`, `shared/`, `app/` (excluding tests) — e.g. `features/settings/screens/SettingsScreen.tsx`, `features/settings/hooks/useImportData.ts`, `features/cards/hooks/useTrackCardUsage.ts`, `useDeleteCard.ts`, `useToggleFavorite.ts`, `features/cards/components/CardDetails.tsx`.
- **Net effect: production errors are never captured by Sentry** — the stub's `error` just calls `console.error`.

This is a pre-existing, codebase-wide convention divergence — not introduced by any single feature story — so it should be fixed project-wide in one change.

_Part of Epic 16 — Platform & Tech Debt (standing tech-debt bucket; see also Story 16.1)._

## Acceptance Criteria

1. The `logger` module (`core/utils/logger.ts`, exported from `core/utils`) is hardened to provide `log` / `warn` / `error`:
   - `log` / `warn` are dev-only (gated on `__DEV__`).
   - `error` always logs and, in production (`!__DEV__`), calls `Sentry.captureException`.
2. Sentry is initialised appropriately per environment, or the wrapper degrades gracefully if Sentry isn't configured — and never leaks PII / card data (GDPR — see privacy rules).
3. All `console.error` / `console.log` / `console.warn` call sites in `features/`, `core/`, `shared/`, and `app/` are migrated to the wrapper (excluding intentional build/dev tooling under `scripts/`).
4. Tests that currently assert on `console.error` (e.g. `useTrackCardUsage.test.ts`, `useToggleFavorite.test.ts`, `useDeleteCard.test.ts`) are updated to assert on the wrapper.
5. ESLint enforces the convention (e.g. `no-console`, allowing only the wrapper) so it cannot regress.
6. `yarn lint`, `yarn typecheck`, `yarn test` all pass; coverage threshold maintained.

## Tasks / Subtasks

- [ ] Harden `core/utils/logger.ts` (already exported from `core/utils`): add `__DEV__` gating for `log`/`warn` and prod `Sentry.captureException` in `error`. Reconcile the API (`log` vs the stub's current `info`).
- [ ] Decide on / wire Sentry init (confirm `@sentry/react-native` dependency, env config, PII scrubbing) — or a graceful no-op if Sentry is deferred.
- [ ] Migrate the ~65 `console.*` call sites across `features/`, `core/`, `shared/`, `app/` to the wrapper.
- [ ] Update tests that assert on `console.*` to target the wrapper.
- [ ] Add/enable an ESLint `no-console` rule (wrapper-allowed); fix violations.
- [ ] Run all quality gates.

## Dev Notes

### Open Decisions (resolve during refinement → ready-for-dev)

- [ ] Confirm Sentry is the chosen provider + how it's initialised per environment (dev/prod).
- [ ] Confirm the exact logger API surface and the ESLint enforcement approach. The existing stub exposes `info`/`warn`/`error`; AC1 proposes `log`/`warn`/`error` — decide whether to rename `info`→`log` (and migrate the existing `logger.*` adopters) or keep `info`.
- [ ] Confirm PII-scrubbing requirements (no card data / PII to Sentry — GDPR).
- [ ] Confirm whether `@sentry/*` is already a dependency; if not, installing it is part of this story.
- [ ] Decide whether `core/privacy/consent-logger.ts` (a separate domain logger that also calls `console.warn` directly) is in scope for migration.

> Acceptance Criteria above are a **draft** pending these decisions.

### References

- `docs/project_context.md` → "Error Handling → Logging" (prescribed shape) and "Critical Anti-Patterns" ("Use `console.log` directly ❌ → Use `logger` wrapper ✅").
- `CONTRIBUTING.md` — prescribes the `logger` wrapper convention.
- Sibling precedent intentionally left on `console.error` pending this story: `useToggleFavorite.ts` (Story 9.2), `useTrackCardUsage.ts` (Story 9.1).
- Privacy: do not send card data / PII to Sentry (GDPR rules).

### Project Structure Notes

- Module to harden: `core/utils/logger.ts`; already re-exported via `core/utils/index.ts` (`export { logger } from './logger'`).
- Existing stub adopters (preserve behaviour after hardening): `core/sync/retry.ts` (`logger.warn`), `core/schemas/index.ts` (`logger.error`).
- Migration surface: ~65 `console.*` sites in `features/`, `core/`, `shared/`, `app/` (excl. `*.test.*` and `scripts/`).
- ESLint: add a `no-console` rule (wrapper-allowed) in the project's ESLint config.
- Tests are colocated (`*.test.ts(x)` next to source); update those asserting on `console.*`.

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
