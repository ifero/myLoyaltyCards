# Story 16.2: Implement logger/Sentry wrapper and migrate console.\* call sites

Status: ready-for-dev

## Story

As a maintainer,
I want a single logging wrapper that gates debug output on `__DEV__` and routes errors to Sentry in production,
so that production error reporting actually fires and logging is consistent across the codebase.

## Context

Surfaced during **Story 9.2** code review (2026-06-07). `docs/project_context.md` (Error Handling → Logging) and `CONTRIBUTING.md` prescribe a `logger` wrapper with `Sentry.captureException` in production instead of `console.*`. Current state (verified 2026-06-08):

- A **minimal `logger` stub already exists** at `core/utils/logger.ts` (added 2026-03-28, exported from the `core/utils` barrel). It exposes `info` / `warn` / `error` but only **forwards directly to `console.*`** — no `__DEV__` gating and no Sentry routing.
- Adoption is **partial**: only a couple of `core/` call sites use it (`core/sync/retry.ts`, `core/schemas/index.ts`). **~30 files with `console.*`** remain (verified 2026-06-11; the earlier "~65" was an occurrence estimate) across `features/`, `core/`, `shared/`, `app/` (excluding tests) — e.g. `features/settings/screens/SettingsScreen.tsx`, `features/settings/hooks/useImportData.ts`, `features/cards/hooks/useTrackCardUsage.ts`, `useDeleteCard.ts`, `useToggleFavorite.ts`, `features/cards/components/CardDetails.tsx`.
- **Net effect: production errors are never captured by Sentry** — the stub's `error` just calls `console.error`.

This is a pre-existing, codebase-wide convention divergence — not introduced by any single feature story — so it should be fixed project-wide in one change.

_Part of Epic 16 — Platform & Tech Debt (standing tech-debt bucket; see also Story 16.1)._

## Acceptance Criteria

1. The `logger` module (`core/utils/logger.ts`, exported from `core/utils`) is hardened, **keeping its current `info` / `warn` / `error` API** (no rename):
   - `info` / `warn` are dev-only (gated on `__DEV__`).
   - `error` always logs and, in production (`!__DEV__`), calls `Sentry.captureException`.
2. **Sentry is installed and initialised** (decision 2026-06-11: full Sentry now) via `npx @sentry/wizard@latest -i reactNative --saas --org andrea-pacino --project react-native`, configured per environment (dev vs prod), and **never leaks PII / card data** (GDPR — scrub via `beforeSend` before transmit). Done = a thrown error in a prod build reaches the Sentry project (`andrea-pacino/react-native`).
3. All `console.*` call sites (~30 files, verified 2026-06-11) in `features/`, `core/`, `shared/`, and `app/` are migrated to the wrapper — **including `core/privacy/consent-logger.ts`** (verify its consent-audit behaviour is preserved) — excluding build/dev tooling under `scripts/`.
4. Tests that currently assert on `console.error` (e.g. `useTrackCardUsage.test.ts`, `useToggleFavorite.test.ts`, `useDeleteCard.test.ts`) are updated to assert on the wrapper.
5. ESLint enforces the convention (e.g. `no-console`, allowing only the wrapper) so it cannot regress.
6. `yarn lint`, `yarn typecheck`, `yarn test` all pass; coverage threshold maintained.

## Tasks / Subtasks

- [ ] Harden `core/utils/logger.ts` (keep the `info`/`warn`/`error` API): `__DEV__`-gate `info`/`warn`; `error` always logs and calls `Sentry.captureException` in prod.
- [ ] Install + wire Sentry: run `npx @sentry/wizard@latest -i reactNative --saas --org andrea-pacino --project react-native`; configure per-env init + a `beforeSend` PII/card-data scrub; prebuild + `pod install` (repo CocoaPods workaround).
- [ ] Migrate the ~30 `console.*` files across `features/`, `core/`, `shared/`, `app/` to the wrapper — including `core/privacy/consent-logger.ts`.
- [ ] Update tests that assert on `console.*` to target the wrapper.
- [ ] Add/enable an ESLint `no-console` rule (wrapper-allowed); fix violations.
- [ ] Run all quality gates.

## Dev Notes

### Resolved Decisions (2026-06-11, refinement with ifero)

- **Sentry — full adoption now.** Install via `npx @sentry/wizard@latest -i reactNative --saas --org andrea-pacino --project react-native` (SaaS org `andrea-pacino`, project `react-native`). Initialise per environment with **real prod capture**. `@sentry/*` is **not** a dependency today — the wizard adds it (native dep → prebuild + `pod install`).
- **Logger API — keep `info` / `warn` / `error`** (no rename to `log`). Zero churn for the 2 existing adopters; just harden behaviour. _(Supersedes the original AC1 `log/warn/error` proposal.)_
- **PII scrubbing — required (GDPR).** No card data / PII to Sentry; scrub event payloads (`beforeSend`) before transmit.
- **`consent-logger.ts` — in scope.** Migrate it through the wrapper too; verify its consent-audit behaviour is preserved.
- **ESLint `no-console` — add it** (wrapper-allowed) so the convention can't regress.

_Repo survey (2026-06-11): `logger.ts` is a console-forwarding stub (`info`/`warn`/`error`); ~30 files use `console.*` (non-test); adopters = `core/schemas/index.ts`, `core/sync/retry.ts`; no `no-console` rule configured yet._

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
