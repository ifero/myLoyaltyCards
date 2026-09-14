---
baseline_commit: 8c220e6cd2a5e03b4dc222e874c11ccc9d2df725
---

# Story 16.40: `BarcodeScanner`'s camera-error state is unreachable, so a failed permission request strands the user on a loading string

Status: review

Epic: 16 — Platform & Tech Debt

> **✅ CONFIRMED BY TEST, NOT BY READING.** Found 2026-09-14 while implementing Story 16.24, where
> the error branch's Retry button was the only call site that could have exercised a stale-callback
> path. Recorded there as out of scope and carried here.
>
> **⛔ DEPENDS ON STORY 16.24.** Without its `requestCameraPermission` memoisation the mount effect
> re-runs, and the `setError(null)` at the top of each call wipes the error — this screen then
> oscillates with the loading string. Two of the four tests below fail on an un-memoised hook.

## Story

As a user whose camera permission request fails outright — the OS never answers, as opposed to
denying — I want the app to tell me and offer a way forward, so that I am not left staring at
"Checking camera permission..." with no button to press.

## Context

`features/cards/components/BarcodeScanner.tsx` has four render branches, in this order:

| #   | Guard                          | Renders                                                 |
| --- | ------------------------------ | ------------------------------------------------------- |
| 1   | `permission === null`          | "Checking camera permission..." — **no buttons at all** |
| 2   | `permission.granted === false` | "Camera Access Needed" + Open Settings + manual entry   |
| 3   | `error && !isReady`            | "Camera Error" + Retry + manual entry                   |
| 4   | —                              | the camera view                                         |

`isReady` is `permission?.granted === true && enabled`, and `enabled` is hardcoded `true` at the
hook call. So by branch 3, `permission` is non-null and `granted` is not `false`; if `granted` is
`true` then `isReady` is true and `!isReady` is false. **Branch 3 therefore requires a permission
object whose `granted` is neither `true` nor `false`** — a shape `expo-camera` does not produce.

### The state it was written for is real, and branch 1 was swallowing it

`useBarcodeScanner.requestCameraPermission` sets `error` in two places: on a denial, and in its
`catch` when `requestPermission()` **rejects**. A rejection is a different failure with a different
fix — the OS never gave an answer — and it leaves `permission` at `null`. Branch 1 then wins
forever. The user gets a loading string, no retry, and no manual-entry escape.

### The sibling component already does this correctly

`features/add-card/components/ScannerOverlay.tsx` — the scanner `BrandScannerScreen` actually
renders — has no null-permission early return above its error branch. Its order is
`permission && !permission.granted` → `effectiveCameraError` → camera. This story aligns
`BarcodeScanner` with the component that got it right.

## Acceptance Criteria

1. A permission request that **rejects** renders the camera-error UI, not the loading string.
2. That state offers both escapes: Retry re-requests permission, and manual entry invokes
   `onManualEntry`.
3. An unresolved permission with **no** error still renders the loading string.
4. A **denied** permission still renders the permission-denied UI — not the generic error UI —
   because only that branch offers Open Settings. (A denial sets `error` too, so branch order
   matters here.)
5. No new locale keys: `addCard.scanner.cameraErrorTitle` / `cameraErrorFallback` already exist and
   are already used by `ScannerOverlay`.
6. Each new test is shown failing against the unfixed code.

## Tasks / Subtasks

- [x] (AC1, AC3) Guard branch 1 with `&& !error` so an error is not swallowed.
- [x] (AC4) Make branch 2 tolerate the `null` it may now see (`permission?.granted === false`);
      it still precedes the error branch, so denial keeps winning.
- [x] (AC1–AC4) Four tests in `BarcodeScanner.test.tsx`.
- [x] (AC6) Verify the two new-behaviour tests fail before the fix.

## Dev Notes

### Anti-patterns — do NOT do these

- ❌ **Delete the branch as dead code.** It is dead by _ordering_, not by intent, and its strings are
  shared with `ScannerOverlay`. The state it serves is reachable.
- ❌ **Move the error branch above the denied branch.** A denial also sets `error`, so that makes
  denial render the generic error UI and lose the Open Settings affordance.

### Out of scope — flag, don't fix

- **`BarcodeScanner` has no consumer.** Its only reference in the repository is the barrel
  re-export at `features/cards/index.ts:33`, and that barrel has **zero importers**;
  `ScannerOverlay` is what the app renders. This story fixes the component's correctness and
  leaves the larger question — delete it, or wire it up — to an explicit decision.
- **The `useBrightness`-style race in `requestCameraPermission`**: `setError(null)` at the top of
  each call means any re-entrant call briefly clears a live error. Benign once the hook is
  memoised (16.24), but it is why this fix depends on that one.

## Dev Agent Record

Implemented 2026-09-14 on `fix/scanner-error-branch-unreachable`, stacked on the 16.24 branch.

**Unreachability proven by execution.** All four permission shapes were rendered: `granted: true`
and `granted: undefined` both fall through to the camera view; a rejected request rendered the
loading string. The error branch rendered **only** when `error` was combined with a
`granted: undefined` object — i.e. never, in production.

**Fix: two guards, not a reorder.** `permission === null && !error` and `permission?.granted === false`.
Reordering the JSX was rejected because it regresses AC4.

**Falsifiability:**

| Test                                       | Result against unfixed code              |
| ------------------------------------------ | ---------------------------------------- |
| AC1 — rejection surfaces the error UI      | **fails** — loading string still present |
| AC2 — retry and manual entry available     | **fails** — neither control rendered     |
| AC3 — loading still shown without an error | passes (preservation guard)              |
| AC4 — denial still shows Open Settings     | passes (preservation guard)              |

**Gates:** typecheck, tokens:check, icons:check, frames:check, wear:catalogue:check,
check:build-path-filters, lint, check:native-patches, check:native-strings, format:check,
check:no-tests-folders, check:story-catalogue-sync — all pass. Suite: 183 files / 2299 tests.

## References

- `docs/sprint-artifacts/stories/16-24-clear-exhaustive-deps-warnings.md` — where this was found and
  the memoisation this depends on.
- `features/add-card/components/ScannerOverlay.tsx` — the correct reference implementation.
