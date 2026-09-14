---
baseline_commit: 0d79e28c45cd7b4c65435a58e106bf09fe3d2e89
---

# Story 16.24: Clear the `exhaustive-deps` backlog and promote the rule to `error`

Status: review

Epic: 16 — Platform & Tech Debt

> **⛔ DEPENDS ON PR #185** (`chore/enable-react-hooks-eslint`), which adds
> `eslint-plugin-react-hooks` and registers `react-hooks/rules-of-hooks` (error) +
> `react-hooks/exhaustive-deps` (warn). None of the warnings below exist until that merges.
> Do not start this story before it lands.
>
> **⚠️ Two of the three warnings must NOT be resolved the way the rule suggests.** Obeying the
> `BarcodeScanner` autofix causes repeated camera-permission requests; obeying the `_layout` one
> re-runs database initialisation on every language change. The correct fixes are written out in
> [Dev Notes](#dev-notes). This is the whole reason the story exists rather than someone running
> `eslint --fix`.
>
> **Gates run inside a `.claude` worktree too, once you `yarn install` there.** `jest.config.js`
> anchors its `.claude` ignore patterns to `<rootDir>`. `--no-verify` stays forbidden.

## Story

As a developer changing a React component in this codebase,
I want `react-hooks/exhaustive-deps` to **fail** the build rather than print an advisory warning,
so that a narrowed dependency array cannot reach `main` — the class of defect that caused the
card-grid tile overlap and survived until manual review caught it.

## Context

PR #185 turned on the two React hook rules for the first time. Before it, neither
`rules-of-hooks` nor `exhaustive-deps` ran, so `yarn lint` and CI gave **zero** automated
assurance about the ~178 dependency-array hook call sites across 66 files.

That PR deliberately set `exhaustive-deps` to **`warn`**, because three pre-existing violations
would otherwise have turned the merge gate red. This story closes them and finishes the job.

### Why `warn` is not protection

**ESLint exits 0 when only warnings are present.** CI's `lint` step therefore passes, so a
reintroduced narrow dep array prints a line in the log that nobody reads and merges anyway. The
protection is advisory until either this story promotes the rule to `error`, or a
`--max-warnings` ceiling is added.

This is not hypothetical. The card-grid tile-overlap fix (#173) hinged on `renderItem`'s
`useCallback` deps including the derived tile size; a narrowed array silently reintroduces the
overlap for the whole lifetime of the mounted screen, because `useFocusEffect` keeps that screen
alive rather than remounting it, so the stale closure is never flushed. Verified against the
merged code: narrowing the deps back to `[highlightCardId]` makes the rule report _"missing
dependencies: 'gridTile.height' and 'gridTile.width'"_ — but at `warn`, that finding does not
block anything.

### Warning 1 — `BarcodeScanner` holds a stale `onManualEntry` (the real bug)

`features/cards/components/BarcodeScanner.tsx:84` — _missing dependency `handlePermissionDenied`_.

Current shape:

| Line        | Code                                                                                                             | Problem                                                                             |
| ----------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `:56`       | `const handlePermissionDenied = () => { … }`                                                                     | Plain function. **New identity every render.** Closes over `t` and `onManualEntry`. |
| `:78`–`:84` | `useCallback(async () => { … handlePermissionDenied() … }, [onError, requestCameraPermission, t])`               | Captures whichever `handlePermissionDenied` existed when it was last recreated.     |
| `:87`–`:91` | `useEffect(() => { if (permission === null) handleRequestPermission() }, [permission, handleRequestPermission])` | Re-runs whenever `handleRequestPermission`'s identity changes.                      |

**The genuine defect:** `handleRequestPermission` is only recreated when `onError`,
`requestCameraPermission` or `t` change. If the parent passes a **new `onManualEntry`** without
any of those changing, the captured `handlePermissionDenied` is stale, and the alert's "Manual
entry" button invokes the _previous_ callback.

**🚫 The naive fix is actively harmful.** Adding `handlePermissionDenied` to the `:84` dep array
makes `handleRequestPermission` change identity on **every render**, which makes the `:91` effect
re-run on every render. Guarded only by `if (permission === null)`, that means
`requestCameraPermission()` fires repeatedly while permission is unresolved — a permission-prompt
loop. **Wrap the helper in `useCallback` instead** (see Dev Notes).

### Warning 2 — `app/_layout.tsx` translates inside a mount-only effect

`app/_layout.tsx:530` — _missing dependency `t`_ on a `[]` effect that begins at `:394`.

The effect initialises the database and subscribes to watch usage events (`subscribeToWatchUserInfo`),
with a cleanup that unsubscribes. It calls `t` exactly once, at `:475`:

```ts
setDbError(t('common.errors.initializationFailed'));
```

**🚫 `[]` is correct; do not add `t`.** `t`'s identity changes on language change, so adding it
would tear down the watch subscriptions and re-run database initialisation every time the user
switches language. The rule is flagging a real smell — a translated string captured at mount, so
the message stays in the mount-time language — but the dependency array is the safer of the two
options as written.

**Correct fix:** store an error _code_ in state and translate at render time, so the effect no
longer closes over `t` at all and the dep array becomes honestly empty.

### Warning 3 — `CreateAccountScreen` has a type-only dependency (trivial)

`features/auth/CreateAccountScreen.tsx:124` — _unnecessary dependency `fieldErrors`_.

`fieldErrors` appears in the callback body only in a **type position** (`:99`,
`const errors: typeof fieldErrors = {}`), which TypeScript erases at compile time. The rule is
correct that it is unnecessary at runtime. Effect today is benign over-invalidation:
`validateFields` is recreated whenever `fieldErrors` changes, and it calls `setFieldErrors`
itself. Harmless because `validateFields` is only invoked from event handlers, never from an
effect's dep array — **verify that is still true before removing it**, because if it ever enters
one, the pair becomes an infinite loop.

Included here only because the rule cannot be promoted to `error` while any warning remains.

## Acceptance Criteria

1. `features/cards/components/BarcodeScanner.tsx` no longer warns. `handlePermissionDenied` is
   wrapped in `useCallback` with its own honest deps and added to `handleRequestPermission`'s dep
   array — **not** added as a bare per-render function.
2. `handleRequestPermission`'s identity is stable across renders when none of its dependencies
   have changed, so the `:91` effect does not re-run per render. Demonstrated by a test that
   fails if the identity churns.
3. The stale-`onManualEntry` defect is fixed: after the parent supplies a new `onManualEntry`,
   the permission-denied alert's "Manual entry" action invokes the **current** callback.
4. `app/_layout.tsx`'s app-initialisation effect no longer closes over `t`; the boot-failure
   message is stored as a translation **key/code** in state and translated at render.
5. The boot-failure message renders in the **current** language, including after a language
   change following a failed initialisation (the staleness that warning 2 describes).
6. The app-initialisation effect still runs **exactly once** per mount, and database
   initialisation and watch-event subscription/unsubscription behaviour is unchanged. A language
   change must not re-run it.
7. `features/auth/CreateAccountScreen.tsx` drops the unnecessary `fieldErrors` dependency, with
   `validateFields` confirmed absent from any effect dependency array.
8. `react-hooks/exhaustive-deps` is promoted from `'warn'` to `'error'` in `eslint.config.mjs`,
   and the accompanying comment (which currently explains the `warn` choice as temporary) is
   updated to match reality.
9. `yarn lint` reports **0 errors and 0 warnings** from `react-hooks/*`.
10. The full pre-push gate sequence passes from a checkout with dependencies installed:
    `yarn typecheck`, `yarn tokens:check`, `yarn splash:check`, `yarn lint`, `yarn format:check`,
    `yarn test`. No `--no-verify`.

## Tasks / Subtasks

- [x] (AC1, AC2, AC3) `BarcodeScanner.tsx`: wrap `handlePermissionDenied` in `useCallback` with
      deps `[t, onManualEntry]`; add it to `handleRequestPermission`'s dep array at `:84`.
- [x] (AC2) Add a test asserting `handleRequestPermission` does not change identity on a re-render
      with unchanged props — it must fail if the helper is left un-memoised.
- [x] (AC3) Add a test that a changed `onManualEntry` is the one invoked by the alert action.
- [x] (AC4, AC5) `app/_layout.tsx`: change `dbError` state to hold a translation key (or a small
      discriminated error code); translate at render; remove `t` from the effect body.
- [x] (AC6) Verify the effect's dep array is still `[]` and that DB init + watch
      subscribe/unsubscribe run once per mount. Assert a language change does not re-run it.
- [x] (AC7) Confirm `validateFields` is not in any effect dep array, then remove `fieldErrors`
      from `:124`.
- [x] (AC8) Flip `'react-hooks/exhaustive-deps'` to `'error'` and rewrite the adjacent comment.
- [x] (AC9) `yarn lint` → zero `react-hooks/*` findings.
- [x] (AC10) Run all six gates; record counts in the Dev Agent Record.

## Dev Notes

### Files to touch

| File                                           | Change | Notes                                                                                                                                                                                     |
| ---------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `features/cards/components/BarcodeScanner.tsx` | UPDATE | `handlePermissionDenied` `:56`, `handleRequestPermission` `:78`–`:84`, effect `:87`–`:91`. **Do not touch `:206`–`:208`** (the `CameraView` symbology set) — that belongs to Story 16.23. |
| `app/_layout.tsx`                              | UPDATE | Effect `:394`–`:530`; `t` call at `:475`. Largest-risk change in the story — it is the app's root layout and boot path.                                                                   |
| `features/auth/CreateAccountScreen.tsx`        | UPDATE | One dep removal at `:124`. Type-only use at `:99` stays.                                                                                                                                  |
| `eslint.config.mjs`                            | UPDATE | Promote the rule; update the comment. `.mjs` is now covered by `lint-staged` and `yarn format:check`, so keep it prettier-clean.                                                          |

### ⚠️ Conflict watch — Story 16.23

Story 16.23 (`ready-for-dev`, Sprint 18 wave_0c) also edits `BarcodeScanner.tsx`, but only the
symbology list at `:206`–`:208`, plus `useBarcodeScanner.ts` and `useImageScan.ts`. **Different
concern, same file.** Parallel-safe in principle; expect a trivial rebase if both are in flight.
Land 16.23 first if sequencing is free — it is a user-facing bug fix and this is tech debt.

### Anti-patterns — do NOT do these

- ❌ Run `eslint --fix` over these three sites and accept the result. Two of the three autofixes
  are wrong (permission loop; DB re-init on language change).
- ❌ Add `handlePermissionDenied` to `:84` without memoising it first.
- ❌ Add `t` to the `app/_layout.tsx` effect deps.
- ❌ Silence any of the three with `// eslint-disable-next-line`. If a disable ever becomes
  genuinely necessary, it needs an inline comment justifying it — but all three have real fixes,
  so a disable here is a failure to do the story.
- ❌ Enable the rest of `eslint-plugin-react-hooks`' `recommended` config while you are in there
  (see Out of scope).

### Testing requirements

Tests live **beside** their subject as `*.test.ts(x)`; `__tests__/` folders are banned and
CI-enforced. `app/` holds no test files — an `app/_layout.tsx` test belongs in the top-level
`test/` directory, imported via `@/app/...`.

AC2 and AC6 are the ones worth care: both assert _absence of churn_, which is easy to write
non-falsifiably. Confirm each new test **fails** against the unfixed code before you rely on it —
the repo has an explicit precedent for tightening a test that could not fail (#171).

### Guardrails

- `no-console` is an error; use the `logger` wrapper (`core/utils/logger.ts`).
- Do not reduce the boot-time gating behaviour in `app/_layout.tsx` — auth + local infra gating is
  load-bearing and has its own history.
- `eslint.config.mjs` is prettier-clean as of #180/#181 and gated by `yarn format:check`. Keep it
  that way; do not reformat unrelated regions.

### Previous story intelligence

The Story 16.15 lesson applies directly: **green tests on Node do not prove runtime safety.**
Here the analogue is that a green `yarn lint` at `warn` level does not prove hook correctness —
which is precisely the gap AC8 closes.

The card-grid tile-overlap story is the worked example of the defect class: correctness depended on
a dependency array, and only a manual review plus a hand-written regression test caught it.

### Out of scope — flag, don't fix

- **The ~30 React Compiler lints** that `eslint-plugin-react-hooks` v7 also ships (`purity`,
  `immutability`, `set-state-in-effect`, `preserve-manual-memoization`, `static-components`, …).
  PR #185 registered only `rules-of-hooks` and `exhaustive-deps` on purpose. Adopting the
  `recommended` config is a separate, much larger migration and deserves its own story.
- **`additionalHooks` configuration.** Not needed today: all three `useFocusEffect` call sites use
  the canonical `useFocusEffect(useCallback(…))` form, so the inner `useCallback` is already
  checked. If a raw `useFocusEffect(() => {…})` is ever introduced it becomes invisible to the
  rule — worth an `additionalHooks` regex at that point, not now.
- **A `--max-warnings` ceiling.** Redundant once AC8 lands, since `error` already fails the build.

## Dev Agent Record

Implemented 2026-09-14 on `feature/16-24-clear-exhaustive-deps-warnings`.

### Outcome

All ten ACs met. `yarn lint` exits 0 with **zero** `react-hooks/*` findings (baseline: 3 warnings),
and the rule is now `'error'`. Full suite: **183 suites / 2295 tests, all passing**. Every gate in
`.husky/pre-push` passes: typecheck, tokens:check, icons:check, frames:check, wear:catalogue:check,
check:build-path-filters, lint, check:native-patches, check:native-strings, format:check, test.

### Correction — AC10 named a script that does not exist

AC10 lists `yarn splash:check`. There is no such script in `package.json`; the gate list also
predates six checks that `.husky/pre-push` now runs. The real hook sequence was run instead, and it
is a strict superset of AC10's list minus that one phantom entry.

### Finding — warning 1 was masked, and the masking dependency had to be fixed for AC2/AC3 to mean anything

The story frames warning 1 as "the real bug": a stale `onManualEntry` captured by
`handleRequestPermission`. **Measured, it did not reproduce.** `requestCameraPermission` was a bare
`async () => {}` in `useBarcodeScanner.ts`, so it got a fresh identity every render; because it sits
in `handleRequestPermission`'s dependency array, that callback was rebuilt every render too and
always closed over the current `handlePermissionDenied`. The staleness was masked, and the mount
effect re-ran on every render — the very churn AC2 asks to prevent.

So AC1's memoisation alone changed no observable behaviour, and tests for AC2 and AC3 passed
identically against fixed and unfixed code (verified by running them both ways).

**Resolution, approved by ifero:** `requestCameraPermission` is now wrapped in `useCallback` with
`[requestPermission]`. This is outside the story's "Files to touch" table, and the story's conflict
watch names Story 16.23 as also editing `useBarcodeScanner.ts` — **that watch is stale, 16.23 is
`done`**, so there was no conflict. Memoising is safe because the closure reads _no reactive value_:
only `setError` (stable by React's guarantee), a ref, and module-level constants, so it cannot go
stale. Evidence it is inert beyond the intended effect: the full 2295-test suite passes.

With that in place the permission request drops from **2 calls to 1** on an unresolved permission —
AC2's "the effect does not re-run per render" is now literally true, and testable.

### Finding — AC3 has no reachable UI path, so its test is a guard, not a reproduction

For the stale capture to be observable, `handleRequestPermission` must be invoked _without_ the
mount effect re-running. The only such call site is the Retry button at `BarcodeScanner.tsx:171`,
which lives in the `if (error && !isReady)` branch. That branch is effectively unreachable:
`isReady` is `permission?.granted === true && enabled`, so reaching it needs a permission object
that is neither `null` nor `granted === false` nor `granted === true`. The AC3 test is therefore
written as a behavioural regression guard (the alert carries the current `onManualEntry`) and is
documented as such in the test body rather than being dressed up as a reproduction.

**Follow-up worth filing:** that unreachable error branch is dead UI. Out of scope here.

### Falsifiability

The story requires each new test to be shown failing against the unfixed code. Each was:

| Test                                                | Falsified against                                    | Result                                              |
| --------------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------- |
| AC2 — permission requested exactly once             | un-memoised `useBarcodeScanner`                      | **fails**: expected 1, received 2                   |
| AC5 — message re-translates after a language change | pre-fix `app/_layout.tsx`                            | **fails**: message stays in the mount-time language |
| AC6 — no re-init / resubscribe on language change   | the forbidden autofix (`t` added to the effect deps) | **fails**: expected 1 DB init, received 3           |
| AC3 — alert carries the current `onManualEntry`     | —                                                    | guard only; see the finding above                   |

AC6 is a _preservation_ assertion, so "fails against the old code" is the wrong bar for it — it is
falsified against the tempting wrong fix the story explicitly forbids, which is what it guards.

### Files changed

| File                                                | Change                                                                                                                                                           |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `features/cards/components/BarcodeScanner.tsx`      | `handlePermissionDenied` wrapped in `useCallback([t, onManualEntry])`; added to `handleRequestPermission`'s deps.                                                |
| `features/cards/hooks/useBarcodeScanner.ts`         | `requestCameraPermission` wrapped in `useCallback([requestPermission])`. Beyond the story's table — see the finding above.                                       |
| `app/_layout.tsx`                                   | `dbError` → `dbErrorKey`: state holds a translation key, translated at render, so the boot effect no longer closes over `t` and `[]` is honest.                  |
| `features/auth/CreateAccountScreen.tsx`             | Dropped the type-only `fieldErrors` dependency. `validate` confirmed absent from every effect dep array (the file's one `useEffect` deps on `[prefilledEmail]`). |
| `eslint.config.mjs`                                 | `react-hooks/exhaustive-deps` → `'error'`; comment rewritten, including why two of the three autofixes are wrong.                                                |
| `features/cards/components/BarcodeScanner.test.tsx` | +2 tests (AC2, AC3).                                                                                                                                             |
| `test/root-layout.initialization-error.test.tsx`    | +2 tests (AC5, AC6).                                                                                                                                             |

### Note on the story's stale banner

The `⛔ DEPENDS ON PR #185` banner at the top is obsolete: #185 merged 2026-07-31 and both rules were
already live in `eslint.config.mjs`. Left in place as history rather than edited away.

## References

- PR #185 — `chore/enable-react-hooks-eslint`: adds the plugin, registers both rules, fixes the
  `PasswordStrengthIndicator` hook-ordering violation, and documents this triage in full.
- PR #173 — the card-grid tile-overlap fix that motivated enabling the rule.
- PR #180 / #181 — `eslint.config.mjs` reformat and the `prettier --check` gate.
- `docs/sprint-artifacts/stories/16-23-fix-silent-barcode-scan-failures.md` — the other in-flight
  story touching `BarcodeScanner.tsx`.
- `CONTRIBUTING.md` § Quality Gates — `--no-verify` is forbidden; fix the gate instead.
