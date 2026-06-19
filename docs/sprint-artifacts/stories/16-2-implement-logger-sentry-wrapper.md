# Story 16.2: Implement logger/Sentry wrapper and migrate console.\* call sites

Status: review

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

- [x] Harden `core/utils/logger.ts` (keep the `info`/`warn`/`error` API): `__DEV__`-gate `info`/`warn`; `error` always logs and calls `Sentry.captureException` in prod.
- [x] Install + wire Sentry: installed `@sentry/react-native@~7.11.0` via `npx expo install` (SDK-55-compatible; wizard is interactive/auth-gated so wired manually per Sentry + context7 best practices); per-env init + a `beforeSend` PII/card-data scrub in `core/observability/sentry.ts`; Expo config plugin + `getSentryExpoConfig` metro wiring + `Sentry.wrap` in root layout. _(Native prebuild + `pod install` and the prod-build→Sentry smoke test are device/CI steps — see Completion Notes.)_
- [x] Migrate the ~30 `console.*` files across `features/`, `core/`, `shared/`, `app/` to the wrapper — including `core/privacy/consent-logger.ts`.
- [x] Update tests that assert on `console.*` to target the wrapper.
- [x] Add/enable an ESLint `no-console` rule (wrapper-allowed); fix violations.
- [x] Run all quality gates.

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

claude-opus-4-8 (Amelia / BMAD dev agent)

### Debug Log References

- `yarn lint` — clean (0 errors).
- `yarn typecheck` — clean.
- `yarn test:coverage` — 1560 tests / 154 suites pass; global coverage 91.1% stmts, 81.1% branches, 87.5% funcs, 91.7% lines (threshold 80%). New `core/utils/logger.ts` and `core/observability/sentry.ts` at 100%.

### Completion Notes List

- **Logger (AC1):** `core/utils/logger.ts` keeps the `info`/`warn`/`error` API. `info`/`warn` are `__DEV__`-gated; `error` always `console.error`s (never silently swallowed) and in prod (`!__DEV__`) calls `Sentry.captureException` — preferring the first `Error` arg for a real stack trace, else synthesising one, attaching non-error args as `extra.context`.
- **Sentry (AC2):** Installed `@sentry/react-native@~7.11.0` via `npx expo install`. The interactive `@sentry/wizard` is auth-gated and can't run headless, so wiring was done manually per the Sentry MCP (org `andrea-pacino`, project `react-native`, DSN resolved via `find_dsns`) and context7 best practices: `core/observability/sentry.ts` (`initSentry` + `scrubEvent`), Expo config plugin in `app.json`, `getSentryExpoConfig` in `metro.config.js`, and `Sentry.wrap(RootLayout)` + early `initSentry()` in `app/_layout.tsx`. `enabled: !__DEV__`, `environment` dev/prod, `sendDefaultPii: false`. The DSN is read from `EXPO_PUBLIC_SENTRY_DSN` (real value in gitignored `.env`; fake placeholder in `.env.example`) — no hardcoded fallback; an absent DSN makes `Sentry.init` a no-op rather than crashing.
- **PII scrub (AC2 / GDPR):** `beforeSend` drops `event.user`/`event.request` and recursively redacts sensitive keys (barcode, card number, raw value, token, secret, email, api key, authorization, cookie) across `extra`/`contexts`, with cycle + depth guards. Unit-tested in `core/observability/sentry.test.ts`.
- **Migration (AC3):** All 30 `console.*` files migrated to the wrapper, including `core/privacy/consent-logger.ts` (consent-audit insert untouched; only the diagnostic warnings route through `logger.warn`). `core/schemas/index.ts` `defaultLogger` now delegates to the wrapper (DI seam preserved; import aliased `appLogger` to avoid shadowing). `core/sync/conflict-logger.ts` redundant `__DEV__` guard removed (now owned by `logger.info`).
- **Tests (AC4):** 12 specs converted to spy on `logger` instead of `console`. `core/watch-connectivity.test.ts` intentionally kept on `console` spies — it re-`require`s the source per test (`jest.resetModules`), so a wrapper-singleton spy wouldn't survive the reset; `console` is the stable seam there and the wrapper still routes to it in dev. Added global `@sentry/react-native` mock in `jest.setup.js`.
- **ESLint (AC5):** `no-console: error` in the app TS block; allowed in `core/utils/logger.ts`; off for test files.
- **Consent-audit observability (QA review):** `core/privacy/consent-logger.ts` audit-write failures use `logger.error` (always logs + Sentry in prod), NOT dev-only `logger.warn` — a dev-only warn would make GDPR audit-write failures invisible in production, contradicting AC3's "preserve consent-audit behaviour". `eventType` is not PII and the Sentry payload is scrubbed.
- **Deliberate `warn`-stays-`warn` (QA review, tight scope):** Operational warnings in `core/auth/guest-session-repository.ts` (SecureStore) and `shared/supabase/auth.ts` (profile upsert) were migrated faithfully `console.warn → logger.warn` (dev-only). Elevating them to Sentry-routed `logger.error` is a behaviour change beyond this story's "migrate" scope — flagged as a possible follow-up rather than changed here.
- **watch-connectivity test (QA review):** `core/watch-connectivity.test.ts` re-`require`s its module graph per test (`jest.resetModules`), so it asserts on a closure-stable `jest.mock('@/core/utils/logger')` mock (survives resets) rather than `console` — satisfying AC4 without the staleness a singleton spy would hit.

### Follow-ups (not blocking this story)

- **AC2 prod smoke test (required to fully close AC2):** run `npx expo prebuild` + `pod install` (repo CocoaPods workaround), then trigger a thrown error in a **release** build and confirm an event lands in `andrea-pacino/react-native`. Could not be exercised in this dev environment.
- **CI source maps:** wire `SENTRY_AUTH_TOKEN` (documented commented in `.env.example`) into the release workflow for symbolicated stack traces.
- **Optional:** consider elevating SecureStore / profile-upsert warnings to `logger.error` for prod Sentry visibility (see deliberate decision above).

### File List

**New**

- `core/observability/sentry.ts`
- `core/observability/sentry.test.ts`
- `core/utils/logger.test.ts`

**Modified — core integration**

- `core/utils/logger.ts`
- `app/_layout.tsx`, `app.json`, `metro.config.js`, `jest.setup.js`, `eslint.config.mjs`, `package.json`, `yarn.lock`

**Modified — console.\* migration (source)**

- `app/barcode/[id].tsx`, `app/card/[id].tsx`, `app/card/[id]/edit.tsx`
- `core/auth/guest-session-repository.ts`, `core/privacy/consent-logger.ts`, `core/schemas/index.ts`, `core/sync/cloud-sync.ts`, `core/sync/conflict-logger.ts`, `core/sync/sync-trigger.ts`, `core/watch-connectivity.ts`
- `features/cards/components/BarcodeFlash.tsx`, `features/cards/components/BarcodeRenderer.tsx`, `features/cards/components/CardDetails.tsx`, `features/cards/components/FullscreenBarcode.tsx`
- `features/cards/hooks/useAddCard.ts`, `useBrightness.ts`, `useDeleteCard.ts`, `useEditCard.ts`, `useToggleFavorite.ts`, `useTrackCardUsage.ts`
- `features/settings/hooks/useExportData.ts`, `useImportData.ts`, `features/settings/screens/SettingsScreen.tsx`
- `shared/hooks/useAutoSync.ts`, `useCloudSync.ts`, `useSyncUpload.ts`, `shared/supabase/auth.ts`, `shared/toast.ts`

**Modified — tests**

- `core/privacy/consent-logger.test.ts`, `core/sync/conflict-logger.test.ts`
- `features/cards/components/FullscreenBarcode.test.tsx`
- `features/cards/hooks/useAddCard.brand.test.ts`, `useBrightness.test.ts`, `useEditCard.test.ts`, `useToggleFavorite.test.ts`, `useTrackCardUsage.test.ts`
- `shared/hooks/useAutoSync.test.ts`, `useCloudSync.test.ts`, `shared/supabase/auth.test.ts`
