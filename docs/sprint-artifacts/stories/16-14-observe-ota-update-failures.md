---
baseline_commit: 48a3fd3d028af4181bdf8bf710730091583b9352
---

# Story 16.14: Surface boot-time OTA update failures in production telemetry

Status: done

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

## Architecture Decision — AD-16-14-02: tag the failure kind so the budget question is answerable in Sentry's UI

**Ratified by ifero 2026-07-28**, in response to the QA review of AD-16-14-01's implementation (QA rounds 1–2). Folded into this story rather than deferred to a fast-follow.

**Problem.** AD-16-14-01 fixes the message per call site (a deliberate grouping-key guarantee), and puts everything else in `extra.context`. But Sentry does **not index `extra`** — it can only be read event-by-event. That means the one question this story exists to answer — _"how often do users hit the 30s download budget, and is 30s right?"_ — is not chartable or filterable, because a budget timeout and an outright network failure land in the same issue, distinguishable only by opening individual events. The story would have satisfied AC1/AC2 while under-delivering its stated purpose.

**Decision.** Attach an **indexed Sentry tag** `otaFailureKind: 'timeout' | 'error'` to both OTA sites:

- `'timeout'` — `withTimeout` abandoned the step at _our_ budget. **This is the kind that speaks to calibration.**
- `'error'` — `expo-updates` or the network failed outright, irrespective of how long we were willing to wait. Must not pollute the timeout count.

**Scope boundary — what this tag does and does not answer** (QA round 5 rightly noted an earlier draft overstated it). A rising `otaFailureKind:timeout` count is evidence the budget is **too tight**. It is _not_ evidence the budget could safely be **shortened**: nothing here measures how long _successful_ checks/fetches take, so there is no distribution to shorten against. Nor is there a **denominator** — no signal for how many boots did not fail — so an absolute timeout count only becomes a rate by cross-referencing Sentry Release Health or app analytics, which this story does not add. Both limits are inherent to a message+tag design; recorded so this AD is not later cited as having fully closed the calibration question.

Tags are searchable and chartable, and are separate from the grouping message, so this adds the missing dimension **without** re-sharding the issue.

**Mechanism.** `withTimeout` (`core/utils/with-timeout.ts:23`) rejects with `new Error(timeoutMessage)` verbatim and exposes no distinguishable error type. Rather than add a `TimeoutError` class to that util, both timeout messages are hoisted into file-local constants in `app/_layout.tsx` (the check site previously used `withTimeout`'s templated default) and a local `classifyOtaFailure(error, timeoutMessage)` compares against the exact literal **this file supplied**. That basis is now genuinely test-protected — **but it was not when first written, and code review caught the overstatement.** The cited `with-timeout.test.ts` case asserted `.rejects.toThrow('update check timed out')`, and Jest's `toThrow(string)` checks **substring containment, not equality** (verified with a throwaway probe: it passes against `'PREFIX: update check timed out SUFFIX'`). So had `withTimeout` ever wrapped or prefixed the message, that test would have stayed green while the classifier silently mis-tagged every real timeout as `'error'` — defeating this AD entirely. Fixed by strengthening that assertion to `.rejects.toThrow(new Error('update check timed out'))`, which compares the message for exact equality (also probe-verified), with a comment recording that verbatim echo is a contract this classifier depends on. The end-to-end protection additionally lives in `test/root-layout.offline-boot.test.tsx`, which exercises the real unmocked `withTimeout` and asserts `otaFailureKind: 'timeout'`. No shared-util _source_ change; the only file touched outside this story's original scope is `with-timeout.test.ts` (a strengthened assertion, no behaviour change).

**Tag values are literal-constrained, not just documented** (QA round 5). Because `tags` is the one field `scrubEvent` does not redact, each value is passed through the same `FixedMessage` guard as `message`: a literal or literal union (e.g. the `'timeout' | 'error'` a classifier returns) compiles, while anything widening to `string` — a user's email, a card value, any runtime data — resolves to `never` and fails to compile. This closes the unguarded-egress gap structurally instead of by convention, and bounds tag cardinality as a side effect. Locked by a `@ts-expect-error` regression test, proven load-bearing by loosening the constraint to `T[K]` and observing `yarn typecheck` fail with TS2578.

**API shape.** `logger.notify` moves from variadic `...context` to a named `NotifyOptions` object (`{ tags?, context? }`). Deliberate divergence from the variadic `info`/`warn`/`error`: those are console pass-throughs where every argument shares one destiny, whereas `notify` builds a Sentry event in which the indexed field and the non-indexed field behave differently — naming them keeps that distinction visible at every call site. Tag values must stay **low-cardinality** (documented on the type); putting a raw error message in a tag would explode cardinality.

**Supersedes** AC4's "only the stable message + the error" to the extent that a bounded, non-PII, low-cardinality classification tag is now also carried. AC4's actual guarantee — no PII or card data leaves the device — is unaffected **for this story's payload**, because `'timeout'`/`'error'` are compile-time literals with no runtime input.

**Safety caveat, deliberately documented rather than glossed:** `tags` are **NOT redacted**. `scrubEvent` (`core/observability/sentry.ts:71-79`) drops `user`/`request` and walks `extra`/`contexts` — it never touches `tags`. So while a tagged event does pass _through_ `beforeSend`, the scrubber offers tags no protection, and a future caller putting an email or card value in a tag would leak it. This is pinned by a test in `sentry.test.ts` so the gap is known behaviour rather than a latent surprise, and called out on `NotifyOptions.tags` itself: tag values must be caller-controlled literals, never runtime data. Extending `scrubEvent` to redact tags is a reasonable follow-up (see accepted follow-ups) but changes a shared scrubber used by every event, so it is out of scope here.

## Acceptance Criteria

1. Given a production build and a boot-time OTA **manifest-check** failure (timeout or error), When the catch runs, Then a non-fatal Sentry **warning-level** event is emitted (not just a `__DEV__` console log).
2. Given a production build and a boot-time OTA **download/reload** failure (timeout or error), When the catch runs, Then the same non-fatal Sentry warning-level event is emitted.
3. The signal is **non-fatal**: it MUST NOT set `dbError`, MUST NOT render the boot-error screen, and MUST NOT `captureException`/crash. Boot proceeds on the current bundle (16.10 / 16.12 behavior unchanged).
4. **No PII / card data** leaves the device: the emitted event carries only the stable message + the error and passes through `beforeSend`/`scrubEvent` (GDPR). Assert nothing sensitive is attached. **(Amended by AD-16-14-02, ratified 2026-07-28: the payload now also carries a bounded, non-PII `otaFailureKind` tag whose values are compile-time literals. The no-PII guarantee is unchanged; note the caveat there that `tags` are not themselves redacted by `scrubEvent`.)**
5. **Dev behavior preserved:** in `__DEV__`, the failure still logs to the console and does NOT transmit to Sentry (`enabled: !__DEV__`).
6. Mechanism per **AD-16-14-01** applied **centrally** (one logger method reused by both call sites), not duplicated at each site.
7. Tests: unit tests for the new logger method (prod → `Sentry.captureMessage(…, 'warning')` with scrubbable context; dev → console only, no capture); the `_layout` sites are re-wired and the existing boot tests stay green. `yarn lint`/`typecheck`/`test` pass and **coverage is maintained** — note `core/utils/logger.ts` **is** measured (see Dev Notes), so real coverage is required.

## Tasks / Subtasks

- [x] (AC 1,2,3,5,6) Add `logger.notify` (name per Open decision) to `core/utils/logger.ts`: `console.warn` in `__DEV__`; `Sentry.captureMessage(message, 'warning')` with non-error args as `extra.context` in production. Keep it non-fatal (never `captureException`).
- [x] (AC 1,2,6) Route the two OTA failure `logger.warn` calls in `app/_layout.tsx` (`'Expo update check failed:'`, `'Expo update download/reload failed:'`) through the new method.
- [x] (AC 4) Confirm the emitted payload is scrubbed by `beforeSend`/`scrubEvent` and carries no PII/card data.
- [x] (AC 7) Add unit tests in `core/utils/logger.test.ts` (create if absent): prod emits `captureMessage` at `'warning'` with context; dev logs to console and does NOT capture; `logger.error`/`warn`/`info` behavior unchanged.
- [x] (AC 3,7) Verify the `_layout` boot tests (`test/root-layout.offline-boot.test.tsx`) still pass; extend the `logger` mock if the new method is asserted.
- [x] (AC 7) Run `yarn lint`/`typecheck`/`test`/`test:coverage` from the **main** checkout (not a `.claude` worktree).
- [x] (AD-16-14-02, ratified by ifero 2026-07-28) Add the indexed `otaFailureKind: 'timeout' | 'error'` tag: `NotifyOptions` (`{ tags?, context? }`) on `logger.notify`; hoist both timeout messages to file-local constants in `app/_layout.tsx`; classify via `classifyOtaFailure`; assert both branches at both call sites.

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

claude-opus-5 (Amelia / dev-story). Code review + QA review by Sonnet subagents (fresh context).

### Debug Log References

Verification performed against the **installed** SDK rather than from memory (`@sentry/react-native@7.11.0` → `@sentry/core@10.37.0`):

- **`beforeSend` covers message events.** `@sentry/core/build/cjs/client.js` `processBeforeSend` calls `beforeSend` when `isErrorEvent(event)`, and that predicate is `event.type === undefined`. `captureMessage` events have no `type`, so `scrubEvent` is the same single scrub authority for notify as for `logger.error` — AC4 holds by construction, not by hope.
- **Signature.** `captureMessage(message: string, captureContext?: CaptureContext | SeverityLevel)`; `CaptureContext` accepts `Partial<ScopeContext>`, which carries both `level` and `extra` — so one call sets severity _and_ attaches scrubbable context.
- **Normalize runs before `beforeSend`.** `utils/prepareEvent.js` applies `normalizeEvent` after the event processors, and `client._processEvent` runs `_prepareEvent` → `processBeforeSend`. Normalize calls `convertToPlainObject` on `Error` values, so a raw `Error` in `extra.context` reaches Sentry as `{ name, message, stack }` — readable, and still walked by `scrubEvent`.
- **Context7 (`/getsentry/sentry-react-native`)** surfaced the upstream `ExpoUpdatesListener` integration, which records update states as _breadcrumbs_. Not adopted: AD-16-14-01 rejected breadcrumbs precisely because they only transmit alongside a later event, which would undercount boot-time stalls. Logged as a follow-up option below rather than silently absorbed.

### Completion Notes List

- **AD-16-14-01 implemented as specified.** New `logger.notify(message, ...context)` in `core/utils/logger.ts`: `console.warn` in `__DEV__`, `Sentry.captureMessage(message, { level: 'warning', extra: { context } })` in production. It never calls `captureException`, so it cannot read as a crash or trip error alerting (AC3).
- **`message` is a single typed parameter, not part of a variadic `unknown[]`** (a deliberate divergence from the sibling methods). Sentry groups message events by their text, so an interpolated message would shard one failure mode across many issues; forcing the fixed string into slot one and variable detail into `extra.context` makes the grouping key un-pollutable.
- **That invariant is enforced by the compiler, not by comment discipline** (raised in code review): the `FixedMessage<M> = string extends M ? never : M` guard admits string literals and `as const` values, and rejects anything that widens to `string` — a `string`-typed variable, or a template interpolating one. Zero runtime cost.
- **The compile-time guard has a compile-time regression lock** (raised in code review round 3): two `@ts-expect-error` directives in `logger.test.ts` pin the rejection path. `tsconfig.json` includes `**/*.ts`, so `yarn typecheck` reads them — weaken the guard and the directives go unused, failing the build with TS2578. Proven by deliberately degrading the conditional to `string extends M ? M : M` and observing `yarn typecheck` fail on both lines, then restoring it. The two calls still execute, so the same test also shows the guard costs nothing at runtime.
- **`extra` is omitted entirely when there is no context**, mirroring `captureError`'s `undefined` hint — no empty `extra: { context: [] }` noise.
- **Non-fatality hardened to match AC3's literal "MUST NOT"** (surfaced in QA round 2). The `captureMessage` call is wrapped in a `try`/`catch`: the OTA catches sit inside `initializeApp`'s outer `try`, so a _synchronous_ throw out of the SDK would have set `dbError` and rendered the boot-error screen — a telemetry failure taking down boot. The catch is deliberately silent (a `logger.error` there would convert a lost warning into a reported exception and could re-enter the same failing SDK); losing the event is strictly better than escalating, and matches the pre-story status quo where these sites emitted nothing in production anyway. Proven load-bearing: replacing the `try`/`catch` with a pass-through makes the new AC3 test fail.
  **Correction (QA round 3):** an earlier draft of this note justified the asymmetry with `logger.error` by claiming `logger.error` "is not called from the boot critical path". **That was factually wrong and is withdrawn** — it is called at `app/_layout.tsx:50` (module scope, before mount) and at `:412`, inside the very same `initializeApp` outer catch that sits above the OTA catches. The accurate distinction is about _role_, not location: `logger.error` reports a failure that has already broken something, and at `:412` it is itself the fatal path (it sets `dbError` on the next line, `:413`), so there is nothing for a guard to protect. `notify` is purely additive — its whole contract is that adding observability cannot create a new failure. Guarding only `notify` is therefore deliberate, and sweeping `logger.error` into the same guard would change error semantics for every existing caller, which is out of scope here.
- **Both OTA sites re-wired centrally (AC6):** the manifest-check catch and the download/reload catch in `app/_layout.tsx` `initializeApp` now call `logger.notify`. The outer catch that sets `dbError` is untouched, so 16.10 / 16.12 boot behaviour is unchanged (AC3).
- **Re-wiring scope held to the two OTA sites** per Open decision 4 — no other `logger.warn` call was swept into `notify`.
- **Coverage:** `core/utils/logger.ts` and `core/observability/sentry.ts` both at **100%** statements/branches/functions/lines. Global 93.24% statements / 85.94% branches / 88.31% functions / 93.84% lines — over the 80% gate (AC7).
- **Validations (main checkout, not a `.claude` worktree):** `yarn lint` ✅, `yarn typecheck` ✅, `yarn test` ✅ 165 suites / 1776 tests (1755 → 1776, +21), `yarn test:coverage` ✅. Prettier is clean on all eight touched files.
- **Open decisions** were taken at their baked-in defaults (`notify`; `captureMessage` at `'warning'`; no sampling; two sites only). Flagged for ifero at review — the DoR box for explicit confirmation was still unchecked when dev started.
- **Boot-ordering hazard checked and closed (would have made the story a no-op):** an event captured before `Sentry.init` runs is silently dropped. `initSentry()` is invoked at **module scope** in `app/_layout.tsx:42`, so it runs at import time — strictly before `RootLayout` mounts and long before the `useEffect` holding the OTA catches can fire. There is no ordering under which `notify` can outrun init.
- **`beforeSend` throwing cannot escalate to the boot-error screen.** `captureMessage` is fire-and-forget and never awaited by `notify`, and inside the SDK `beforeSend` runs in an internal promise chain fully decoupled from our synchronous call — so even a scrubber bug cannot reach the `initializeApp` catch that sets `dbError` (AC3's key property holds in that failure mode too).
  **Correction (code review round 7):** an earlier draft described the SDK's rejection handler as swallowing the throw "(debug-log only)". **That was wrong and is withdrawn.** `_processEvent`'s handler (`@sentry/core/build/cjs/client.js:857-868`) re-reports a non-internal rejection via `this.captureException(reason, { mechanism: { handled: false, type: 'internal' }, data: { __sentry__: true } })`; only then does the outer `_captureEvent` handler (`:743-754`) debug-log the resulting internal error and drop it. So a throwing `scrubEvent` would surface in Sentry as an **unhandled** internal exception — worth knowing, since it reads as a crash in the UI. That is the SDK self-reporting its own scrubber bug, not our code escalating: `notify` never calls `captureException`, and this all happens asynchronously, so neither `dbError` nor the boot-error screen is reachable. AC3's guarantee is unchanged; the mechanism description is now accurate.
- **No sampling risk:** `tracesSampleRate` governs performance transactions only, not `captureMessage` events, so the configured 0.2 does not thin this signal.
- **Follow-up candidate (not in scope):** `@sentry/react-native` ships an `ExpoUpdatesListener` integration that breadcrumbs update lifecycle states. It complements rather than replaces this story's countable events; worth a separate triage if richer OTA context is ever wanted.

### QA review outcome — accepted follow-ups (deliberately NOT fixed in this story)

- **[RESOLVED IN THIS STORY — ifero ratified folding it in, 2026-07-28] Tag the failure kind so the 30s budget is answerable from the Sentry UI.** QA's strongest finding: the fixed-message grouping puts one issue per call site, but everything distinguishing a `withTimeout` timeout from a native `expo-updates` network error lived in `extra.context`, which Sentry does not index — so "how many of these were specifically the 30s fetch timeout?" could not be charted or filtered, only read event-by-event. Now implemented as **AD-16-14-02** (see above): a searchable `tags: { otaFailureKind: 'timeout' | 'error' }` preserving single-issue grouping. Both classifier branches are pinned at both call sites; proven load-bearing by forcing `classifyOtaFailure` to always return `'error'` and observing the two `'timeout'` assertions fail. The original deferral rationale is kept below for the audit trail.
  **Why not fixed here — and an accurate cost estimate for the follow-up.** An earlier draft of this note justified the deferral on blast radius, claiming the fix would have to touch `core/utils/with-timeout.ts`, "a shared util Stories 16.10 and 16.12 depend on". **QA round 2 correctly rejected that framing and it has been withdrawn.** `withTimeout` has exactly two call sites (`app/_layout.tsx:354` and `:364`) — both in a file already inside this story's scope; 16.10/16.12 authored those call sites but nothing outside this file consumes the util. A clean fix therefore needs **no shared-util change at all**: give the manifest-check call an explicit literal `timeoutMessage` (the download call already has one), compare `error.message` against that same file-local literal in each catch, and thread an optional `tags` argument through `logger.notify`. Two files, both already touched. It is **cheap, not risky**.
  **The real reason it is deferred is scope authority, not cost:** AC4 specifies the event carries "only the stable message + the error", and AD-16-14-01 fixes the payload shape. Adding an indexed tag changes what the event carries — an AD-level decision that belongs to ifero, not to the developer mid-review, especially while the Open-decisions DoR box is still unchecked. AC1/AC2 as written are satisfied without it, and QA graded it a fast-follow rather than a blocker. **Flagged to ifero for the call: this is a small, low-risk change if you want it, either folded in here or as a fast-follow story.**
- **[Pre/post-release manual step] No real-Sentry smoke test exists.** Every test here runs against the jest-mocked `@sentry/react-native`, so a signature drift between the mock and the real native SDK would make this story a silent no-op in production and no automated test would catch it. This is exactly the Sprint 17 retro lesson ("green tests on Node do NOT prove a Hermes build works") applied to an emission-only feature. Mitigated but not eliminated by verifying against the installed `@sentry/core` source (see Debug Log References). **Required manual pass:** on the next release/staging build, force an OTA failure (or temporarily set `enabled: true`) and confirm a `warning`-level event arrives in the Sentry project with the expected message and `extra.context`.
- **[New fast-follow candidate, surfaced by AD-16-14-02] Extend `scrubEvent` to redact `tags`.** The scrubber currently walks `extra`/`contexts` only, so tags are transmitted verbatim — safe for this story (both values are compile-time literals) but an unguarded path for any future caller. Pinned by a test and documented on `NotifyOptions.tags`. Deliberately not fixed here: it changes a shared `beforeSend` hook applied to every event in the app, which deserves its own story and its own regression pass.
- **[Optional fast-follow — ifero's call] A local fallback if the Sentry SDK itself is broken.** QA round 3: `notify`'s catch is silent, so if `captureMessage` were systematically broken in production (native binding failure, not just the mocked throw the test exercises), every notify would vanish with no trace at all — the observability channel losing its own observability. A `console.warn` inside the catch cannot throw and would satisfy AC3 while preserving device-log diagnosability. **Not done here** because it conflicts with this module's stated policy that console output is `__DEV__`-only and never emitted in production (`logger.ts` docblock; `warn`/`info` are both gated). Changing that policy is a decision above this story.
- **[Noted, no action]** The AC4 PII proof exercises `scrubEvent` directly rather than end-to-end through an unmocked SDK — unavoidable given the suite-wide Sentry mock, and consistent with how `logger.error`'s PII path is already tested. Compensated by the pre-existing `initSentry` test asserting `options.beforeSend === scrubEvent` by reference in both branches.

### File List

- `core/utils/logger.ts` — modified (added `logger.notify`; module docblock updated)
- `core/utils/logger.test.ts` — modified (+17 tests: both `notify` branches across every options combination, tag forwarding plus empty-tags/empty-context omission, the AC3 throwing-SDK guard, and TWO `@ts-expect-error` compile-time-guard locks — one for the message, one for tag values)
- `core/observability/sentry.test.ts` — modified (+2 tests: a `captureMessage`-shaped event is scrubbed — AC4; and tags are pinned as NOT redacted — AD-16-14-02 safety caveat)
- `app/_layout.tsx` — modified (two OTA catches routed through `logger.notify` with the `otaFailureKind` tag; timeout messages hoisted to constants; `classifyOtaFailure` added; comment updated)
- `test/root-layout.offline-boot.test.tsx` — modified (logger mock gains `notify`; OTA assertions moved `warn` → `notify` and now pin the `otaFailureKind` tag on both branches at both sites, +2 tests for the previously-uncovered `reloadAsync` failure and non-`Error` rejection branches, plus guards that `warn`/`error` are NOT used)
- `core/utils/with-timeout.test.ts` — modified (1 assertion strengthened to exact message equality — the classifier's contract; no behaviour change)
- `docs/sprint-artifacts/stories/16-14-observe-ota-update-failures.md` — modified (status, tasks, AD-16-14-02, AC4 amendment note, Dev Agent Record)
- `docs/sprint-artifacts/sprint-status.yaml` — modified (`16-14` → `review`)

### Change Log

| Date       | Change                                                                                                                                                                                                                                                                                                                                                                                                          | Author       |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| 2026-07-13 | Drafted as a Story 16.12 QA follow-up (AD-16-14-01). → ready-for-dev pending ifero confirmation of open decisions.                                                                                                                                                                                                                                                                                              | Amelia (Dev) |
| 2026-07-27 | Implemented AD-16-14-01: `logger.notify` → non-fatal `Sentry.captureMessage('warning')`; both OTA catches re-wired; +9 tests; logger.ts 100% covered.                                                                                                                                                                                                                                                           | Amelia (Dev) |
| 2026-07-28 | AD-16-14-02 (ratified by ifero): added the indexed `otaFailureKind: 'timeout' \| 'error'` tag via a `NotifyOptions` object, so budget timeouts are countable separately from outright failures. +12 tests (1764 → 1776); logger.ts still 100%. Code review round 6 also strengthened `with-timeout.test.ts` to exact message equality (the classifier's contract) and covered the `reloadAsync` failure branch. | Amelia (Dev) |
