# Story 16.14: Surface boot-time OTA update failures in production telemetry

Status: ready-for-dev

Epic: 16 — Platform & Tech Debt

## Story

As a maintainer who ships fixes via OTA updates,
I want boot-time OTA update failures (manifest check and bundle download) to be visible in production telemetry,
so that I can measure how often real users hit flaky-network update stalls and confirm the download budget (Story 16.12) is well-calibrated — instead of the failures being silently swallowed.

## Context

Follow-up from **Story 16.12** (surfaced in its QA review). In `app/_layout.tsx` `initializeApp`, boot-time Expo update failures are reported with `logger.warn`:

- the manifest-check catch — `logger.warn('Expo update check failed:', error)` (Story 16.10);
- the bundle-download/reload catch — `logger.warn('Expo update download/reload failed:', error)` (Story 16.12).

But `logger.warn`/`logger.info` are **`__DEV__`-only** (`core/utils/logger.ts:38-47`): in a production build they are complete no-ops — no console, no Sentry. Only `logger.error` reaches Sentry (prod-only `captureException`, `logger.ts:48-53`). So in the field a stalled or failed OTA update is **invisible**: there is no signal for how often users hit the exact flaky-network scenario 16.12 hardened against, and no way to tell whether the 30s `UPDATE_FETCH_TIMEOUT_MS` budget is right in practice.

This was deliberately **out of scope** for 16.12 (AC5 mandated a single-file change reusing `withTimeout`); changing observability touches the shared logging strategy and needs its own story.

Sentry is already wired (`core/observability/sentry.ts`): `initSentry()` sets `enabled: !__DEV__` and a `beforeSend: scrubEvent` PII scrubber (drops `user`/`request`, redacts sensitive keys in `extra`/`contexts`). `Sentry.captureMessage(message, level)` is available for non-fatal, level-tagged events and passes through the same `beforeSend` scrub.

## Architecture Decision — AD-16-14-01: a dedicated non-fatal "reportable warning" logger path; do NOT repurpose `logger.warn`

**Decision.** Add a new logger method — recommend `logger.notify(message, ...context)` (name TBD; see Open decisions) — that:

- in `__DEV__`: `console.warn(...)` (unchanged local-debugging behavior);
- in production (`!__DEV__`): `Sentry.captureMessage(message, 'warning')` with the non-error args attached as `extra.context` (mirroring `logger.error`'s `captureError` shape, so `beforeSend` scrubs it).

Route the two OTA failure sites (`'Expo update check failed:'` and `'Expo update download/reload failed:'`) through `logger.notify` instead of `logger.warn`.

**Why a new method, not a change to `logger.warn`:** `logger.warn` is used across the app for benign development logging; making every `logger.warn` emit a Sentry event would be noisy and change semantics for unrelated callers. A dedicated method keeps the blast radius to the intended sites and gives future "worth-knowing-in-prod-but-not-an-error" cases a home.

**Non-fatal is the key property (16.12 AC3 preserved):** these sites must stay warnings — they MUST NOT set `dbError`, show the boot-error screen, or `captureException` (which reads as a crash/error and may alert). Boot continues on the current bundle exactly as today; only the observability signal is added.

**Rejected — `Sentry.addBreadcrumb`:** a breadcrumb is only transmitted if a _later_ event is captured in the same session; a boot-time update stall usually has no subsequent error, so frequency would be undercounted. `captureMessage` produces a standalone, countable event.

## Acceptance Criteria

1. Given a production build and a boot-time OTA **manifest-check** failure (timeout or error), When the catch runs, Then a non-fatal Sentry **warning-level** event is emitted (not just a `__DEV__` console log).
2. Given a production build and a boot-time OTA **download/reload** failure (timeout or error), When the catch runs, Then the same non-fatal Sentry warning-level event is emitted.
3. The signal is **non-fatal**: it MUST NOT set `dbError`, MUST NOT render the boot-error screen, and MUST NOT `captureException`/crash. Boot proceeds on the current bundle (16.10 / 16.12 behavior unchanged).
4. **No PII / card data** leaves the device: the emitted event carries only the stable message + the error and passes through `beforeSend`/`scrubEvent` (GDPR). Assert nothing sensitive is attached.
5. **Dev behavior preserved:** in `__DEV__`, the failure still logs to the console and does NOT transmit to Sentry (`enabled: !__DEV__`).
6. Mechanism per **AD-16-14-01** applied **centrally** (one logger method reused by both call sites), not duplicated at each site.
7. Tests: unit tests for the new logger method (prod → `Sentry.captureMessage(…, 'warning')` with scrubbable context; dev → console only, no capture); the `_layout` sites are re-wired and the existing boot tests stay green. `yarn lint`/`typecheck`/`test` pass and **coverage is maintained** — note `core/utils/logger.ts` **is** measured (see Dev Notes), so real coverage is required.

## Tasks / Subtasks

- [ ] (AC 1,2,3,5,6) Add `logger.notify` (name per Open decision) to `core/utils/logger.ts`: `console.warn` in `__DEV__`; `Sentry.captureMessage(message, 'warning')` with non-error args as `extra.context` in production. Keep it non-fatal (never `captureException`).
- [ ] (AC 1,2,6) Route the two OTA failure `logger.warn` calls in `app/_layout.tsx` (`'Expo update check failed:'`, `'Expo update download/reload failed:'`) through the new method.
- [ ] (AC 4) Confirm the emitted payload is scrubbed by `beforeSend`/`scrubEvent` and carries no PII/card data.
- [ ] (AC 7) Add unit tests in `core/utils/logger.test.ts` (create if absent): prod emits `captureMessage` at `'warning'` with context; dev logs to console and does NOT capture; `logger.error`/`warn`/`info` behavior unchanged.
- [ ] (AC 3,7) Verify the `_layout` boot tests (`test/root-layout.offline-boot.test.tsx`) still pass; extend the `logger` mock if the new method is asserted.
- [ ] (AC 7) Run `yarn lint`/`typecheck`/`test`/`test:coverage` from the **main** checkout (not a `.claude` worktree).

## Dev Notes

### References

- `core/utils/logger.ts:38-53` — `warn`/`info` gated on `__DEV__` (no-op in prod); `error` → `console.error` + prod-only `Sentry.captureException` via `captureError` (`:27-35`).
- `core/observability/sentry.ts` — `initSentry()` (`enabled: !__DEV__`, `beforeSend: scrubEvent`, `:89-103`); `scrubEvent`/`redactValue` scrub `extra`/`contexts` and drop `user`/`request` (`:65-82`); `SENSITIVE_KEY_PATTERN` (`:29-30`).
- `app/_layout.tsx` — the two OTA failure catches inside `initializeApp` (`'Expo update check failed:'`, `'Expo update download/reload failed:'`); the outer catch that sets `dbError` must remain untouched.
- Sentry API: `Sentry.captureMessage(message, level?)`; attach context via `captureMessage(message, { level: 'warning', extra: { context } })`. **Confirm the exact signature against the installed `@sentry/react-native` (Context7) before use.**
- Story 16.12 (AD-16-12-01) — established the `download/reload` catch; its AC3 ("no `dbError`") must stay true.

### Coverage note (important — differs from 16.12)

Unlike 16.12 (where `app/_layout.tsx` is outside `collectCoverageFrom`), this story edits **`core/utils/logger.ts`, which IS measured** (`jest.config.js` `collectCoverageFrom` includes `core/**`). The new method needs **real unit-test coverage** to hold the 80% gate — budget for `logger.test.ts` (the `app/_layout.tsx` re-wiring remains unmeasured).

### Test Plan

- Mock `@sentry/react-native`; toggle `__DEV__` (set `(global as { __DEV__?: boolean }).__DEV__` per test, restore after) to exercise both branches.
- Prod (`__DEV__ = false`): `logger.notify('msg', err)` → `Sentry.captureMessage` called once with `'msg'`, level `'warning'`, `extra.context` containing the non-error args; `captureException` NOT called.
- Dev (`__DEV__ = true`): `console.warn` called; `Sentry.captureMessage` NOT called.
- Regression: `logger.error` still `captureException` (prod) + `console.error`; `logger.warn`/`info` unchanged.

### Regressions to preserve

Boot never shows the error screen for an update failure (no `dbError`); dev console logging unchanged; no PII to Sentry (`beforeSend` stays the sole scrub authority); the 16.10 / 16.12 boot tests stay green; no new dependency (Sentry already installed).

### Project Structure Notes

Two-file change (`core/utils/logger.ts` + `app/_layout.tsx`) + logger tests. Follow-up to 16.12; part of the standing Epic 16 — Platform & Tech Debt bucket. Engine-agnostic; no schema/native change. Sprint assignment TBD (not in Sprint 17's confirmed scope).

### Definition of Ready

- [x] Root cause confirmed in code (file:line): `logger.warn` is `__DEV__`-only → OTA failures invisible in prod.
- [x] AD drafted (AD-16-14-01): dedicated non-fatal `logger.notify` → `Sentry.captureMessage('warning')`; not a change to `logger.warn`.
- [x] Test strategy defined (logger unit tests toggling `__DEV__`; Sentry mocked).
- [x] Scope tight (2 files + tests; reuse existing Sentry wiring).
- [ ] Open decisions confirmed by ifero (below) — recommended defaults baked in.

### Open decisions (recommended defaults applied)

1. **Method name** — baked in: `logger.notify` (alternatives: `reportWarning`, `captureWarning`, `track`).
2. **Signal type & severity** — baked in: `Sentry.captureMessage(msg, 'warning')` (standalone, countable). Breadcrumb rejected (undercounts). Confirm `'warning'` vs `'info'`.
3. **Sampling / rate-limit** — baked in: none initially (OTA-failure volume is low); revisit if noisy.
4. **Re-wiring scope** — baked in: only the two OTA sites now; do NOT sweep other `logger.warn` calls into `notify` (separate triage if ever wanted).

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

### Change Log

| Date       | Change                                                                                                             | Author       |
| ---------- | ------------------------------------------------------------------------------------------------------------------ | ------------ |
| 2026-07-13 | Drafted as a Story 16.12 QA follow-up (AD-16-14-01). → ready-for-dev pending ifero confirmation of open decisions. | Amelia (Dev) |
