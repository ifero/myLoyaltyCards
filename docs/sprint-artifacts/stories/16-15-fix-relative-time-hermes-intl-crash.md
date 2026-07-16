---
baseline_commit: 174658ad1196fc30ccf8e00cc5cbe0d833cc14c2
---

# Story 16.15: Fix `formatRelativeTime` crash on Hermes (`Intl.RelativeTimeFormat` unsupported)

Status: done

Epic: 16 — Platform & Tech Debt

## Story

As a user opening the Settings sync indicator,
I want the "last synced" relative-time label to render without crashing,
so that the app does not throw an unhandled `TypeError` (and, on the interval path, a fatal error) on production Hermes builds.

## Context

Production Sentry surfaced the **same root cause** under two grouped issues, both culprit `formatRelativeTime(core/utils/relative-time)`, both in the same session/trace (`993ec2e8…`):

- **REACT-NATIVE-1** — `TypeError: Cannot read property 'prototype' of undefined` — 7 events, first seen 2026-07-09, `handled: yes`, `mechanism: onunhandledrejection`. Fired from the boot-time `load()` effect (`useSyncTrigger.ts:20`), `in_foreground: false`.
- **REACT-NATIVE-2** — same `TypeError` — 2 events, first seen 2026-07-15, `handled: no`, `level: fatal`, `mechanism: onerror`. Fired from the 30s `setInterval` (`useSyncTrigger.ts:28`).

Both crash at `core/utils/relative-time.ts:21`:

```ts
const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'always' });
```

**Root cause — runtime parity gap.** Hermes (the production JS engine — `js_engine: "hermes"`, `hermes_version: 0.14.1` in the event context) does **not** implement `Intl.RelativeTimeFormat`. `new Intl.RelativeTimeFormat(...)` evaluates `new undefined(...)`, and the engine reads `.prototype` off `undefined` → the exact `TypeError`. The construction is **unconditional** (built before the locale branches), so it threw for **English users too**, even though only the Italian branches ever called `formatter.format(...)`.

**Why CI never caught it.** The unit tests run on **Node**, which ships full ICU including `Intl.RelativeTimeFormat`, so line 21 worked in Jest and the suite was green while the production build crashed. The Italian branch — the only path that consumed the formatter — had **zero** test coverage. `Intl.*` is used **nowhere else** in the app, and no `@formatjs`/Intl polyfill is installed.

**Fix chosen (with ifero, 2026-07-16):** remove `Intl.RelativeTimeFormat` entirely and hardcode the Italian relative strings, mirroring the pre-existing manual English pattern. Zero new dependencies, no entry-point polyfill wiring, works on Hermes. The manual strings were verified **byte-for-byte** against Node's ICU output for `numeric: 'always'`, so there is **no visible change** for Italian users — the label simply stops crashing.

## Acceptance Criteria

1. `core/utils/relative-time.ts` no longer references `Intl.RelativeTimeFormat` (nor any `Intl.*` API).
2. Italian output is unchanged vs. the previous `Intl.RelativeTimeFormat(..., { numeric: 'always' })` behaviour: `"1 minuto fa"` / `"N minuti fa"`, `"1 ora fa"` / `"N ore fa"`, `"1 giorno fa"` / `"N giorni fa"` (verified against ICU).
3. English output is unchanged (`"Just now"`, `"N min ago"`, `"N hour[s] ago"`, `"N day[s] ago"`, `"Never"`).
4. The Italian locale path has explicit test coverage, including the singular↔plural boundaries (1 vs. N) for minutes, hours, and days — the gap that let this ship.
5. `yarn typecheck`, `yarn eslint` on the changed files, and the `relative-time` test suite all pass; no new dependency added.

## Tasks / Subtasks

- [x] (AC1) Delete the `new Intl.RelativeTimeFormat(...)` line (`relative-time.ts:21`).
- [x] (AC2) Replace the three Italian `formatter.format(-n, unit)` calls with hardcoded pluralised strings (`minuto`/`minuti`, `ora`/`ore`, `giorno`/`giorni` + `fa`).
- [x] (AC2) Verify the hardcoded strings match Node ICU output for `it-IT` / `numeric: 'always'` at n=1 and n>1 (minute/hour/day).
- [x] (AC3) Leave the English branches and the `Never`/`Just now`/`Proprio adesso`/`Mai` early returns untouched.
- [x] (AC4) Add an `Italian locale` describe block to `core/utils/relative-time.test.ts` (Mai, Proprio adesso, minuti/minuto, ore/ora, giorni/giorno).
- [x] (AC5) Run `yarn test core/utils/relative-time.test.ts` (13/13 green), `yarn typecheck`, `yarn eslint` on both changed files.

## Dev Notes

### Consumer impact

`formatRelativeTime` is exported via `core/utils/index.ts:8` and consumed only by `features/settings/hooks/useSyncTrigger.ts` (4 call sites: initial `useState`, boot `load()`, 30s interval, post-sync). `useSyncTrigger.test.ts` **mocks** `formatRelativeTime`, so the hook's tests are unaffected by the internal change.

### Why manual strings over a polyfill

The English branches already format by hand, so manual Italian strings are the consistent, lowest-risk fix. A `@formatjs/intl-relativetimeformat` polyfill would add a dependency, bundle weight (locale data), and app-entry wiring, and could drift out of sync with locale data — all to restore an API the code touches in exactly one file.

### ICU parity check (verification evidence)

`new Intl.RelativeTimeFormat('it-IT', { numeric: 'always' }).format(-n, unit)` on Node:

| unit / n | ICU output    | hardcoded output |
| -------- | ------------- | ---------------- |
| minute 1 | `1 minuto fa` | `1 minuto fa` ✅ |
| minute 5 | `5 minuti fa` | `5 minuti fa` ✅ |
| hour 1   | `1 ora fa`    | `1 ora fa` ✅    |
| hour 2   | `2 ore fa`    | `2 ore fa` ✅    |
| day 1    | `1 giorno fa` | `1 giorno fa` ✅ |
| day 3    | `3 giorni fa` | `3 giorni fa` ✅ |

### Regressions to avoid

Do not reintroduce any `Intl.*` API in the app without a Hermes-availability check first (Hermes ships only a limited `Intl` subset). Keep the English strings and the early-return sentinels (`Never`/`Mai`, `Just now`/`Proprio adesso`) exactly as-is.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 — root-cause analysis (via Sentry MCP), implementation, and tests, following the `sentry-fix-issues` skill workflow.

### Debug Log References

- Developed in the **main checkout** (not a `.claude` worktree), so `yarn test core/utils/relative-time.test.ts` runs normally: **13/13 pass**.
- `yarn typecheck` → 0 errors; `yarn eslint core/utils/relative-time.ts core/utils/relative-time.test.ts` → 0 errors.
- ICU parity confirmed with a one-off `node -e` run (table above) — hardcoded strings are identical to the previous `Intl` output.

### Completion Notes List

- **AC1** ✅ `Intl.RelativeTimeFormat` removed; grep confirms `Intl.` now appears nowhere in the app source.
- **AC2** ✅ Italian branches hardcode `${n} ${n === 1 ? 'minuto' : 'minuti'} fa` (and `ora`/`ore`, `giorno`/`giorni`); byte-for-byte match with ICU verified.
- **AC3** ✅ English branches and all early returns untouched.
- **AC4** ✅ New `Italian locale` describe block adds 8 cases incl. the 1-vs-N boundary for each unit — the previously-uncovered path.
- **AC5** ✅ 13/13 tests, typecheck, and lint all green; no dependency added.
- **Sentry** ✅ REACT-NATIVE-1 and REACT-NATIVE-2 marked resolved after the fix landed on the branch.

### File List

- `core/utils/relative-time.ts` — **modified**: removed `Intl.RelativeTimeFormat`; hardcoded pluralised Italian relative strings.
- `core/utils/relative-time.test.ts` — **modified**: added the `Italian locale` describe block (8 cases).
- `docs/sprint-artifacts/stories/16-15-fix-relative-time-hermes-intl-crash.md` — **new** (this file).
- `docs/sprint-artifacts/sprint-status.yaml` — **modified**: registered `16-15` in Sprint 17 (wave_1) + `development_status` at `review`.

### Change Log

| Date       | Change                                                                                                                                                                                       | Author          |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| 2026-07-16 | Diagnosed from Sentry REACT-NATIVE-1/-2 (Hermes lacks `Intl.RelativeTimeFormat`); fixed by hardcoding Italian relative strings (ICU-verified) + added Italian-locale tests. Status → review. | claude-opus-4-8 |
