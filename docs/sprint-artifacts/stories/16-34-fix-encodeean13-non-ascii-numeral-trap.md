---
baseline_commit: 73e8eca1c0d3fc8b5f45968240bdb42c99df6fec
---

# Story 16.34: Fix the `encodeEAN13` crash on non-ASCII numerals

Status: done

Epic: 16 — Platform & Tech Debt

> **A card number containing a non-ASCII digit kills the watch app.**
> `targets/watch/BarcodeGenerator.swift:109`:
>
> ```swift
> let digits = value.filter { $0.isWholeNumber }.map { Int(String($0))! }
> ```
>
> `Character.isWholeNumber` is `true` for numerals outside ASCII, but `Int(String(_:))` returns `nil`
> for them, so the `!` traps. **Reproduced, not inferred** — the shipped `encodeEAN13` compiled
> standalone and run on Swift 6.3.3 exits **133 (SIGTRAP)** for `٣901234123457`, `590123412345Ⅷ` and
> `㉈901234123457`, while the same harness returns the correct module array for `5901234123457`.
>
> **Found during Story 16.28**, which fixed this exact defect in the two encoders it introduced but was
> **forbidden by its own guardrails** from touching `encodeEAN13` (_"encodeEAN13 and encodeCode128
> unchanged"_). That constraint belonged to that story, not to this code.
>
> **⛔ DEPENDS ON 16.28 ([#212](https://github.com/ifero/myLoyaltyCards/pull/212)).** The helper this
> story reuses, `asciiDigits(of:)`, arrives with it. Land #212 first.
>
> **Native change → NOT OTA-eligible.**

## Story

As a user whose card number contains a character that merely looks like a digit,
I want the watch to fall back to the readable number,
so that opening the card does not crash the app.

## Context

### Why a crash and not a wrong barcode

Three distinct wrong readings hide behind `isWholeNumber`, which is why 16.28 rejected the obvious
"just use `wholeNumberValue`" repair:

| Character          | `isWholeNumber` | `Int(String(_:))` | `wholeNumberValue` | Outcome if used                               |
| ------------------ | --------------- | ----------------- | ------------------ | --------------------------------------------- |
| `٣` Arabic-Indic 3 | `true`          | `nil`             | `3`                | **traps** on `!`                              |
| `Ⅷ` Roman 8        | `true`          | `nil`             | `8`                | encodes a digit the card does not contain     |
| `㉈` circled 10     | `true`          | `nil`             | `10`               | **indexes past** the ten-entry pattern tables |
| `①` circled 1      | `true`          | `nil`             | `1`                | as `Ⅷ`                                        |

So the fix cannot be "parse more leniently". It has to be "accept ASCII digits, ignore separators,
refuse anything else" — which is exactly what `asciiDigits(of:)` already does.

### Reachability — verified, not assumed

- `core/schemas/card.ts:45` types the field as a bare `z.string()`.
- `features/cards/components/CardForm.tsx:42` validates only `.min(1)`.
- `CardForm.tsx:215` sets `keyboardType="number-pad"`, a soft keyboard hint that does not block paste
  or an IME.
- `features/add-card/screens/CardSetupScreen.tsx` only `.trim()`s a manually entered value.

Scanned cards cannot reach it — the OS decoders emit ASCII — but a **pasted or IME-entered** card
number can, and EAN-13 is the most common format in the catalogue.

### Why `encodeCode128` is not in scope

It was checked and does **not** share the defect: it validates `ch.asciiValue` for **every** character
up front and returns `nil` on failure, so its later `asciiValue!` uses are unreachable when `nil`.
No change needed there, and none is made.

## Acceptance Criteria

- **AC1 — `encodeEAN13` no longer traps.** It uses the same `asciiDigits(of:)` helper as `encodeEAN8`
  and `encodeUPCA`, so a value carrying a non-ASCII numeral returns `nil` instead of crashing.
- **AC2 — No behaviour change for any value that works today.** Separator tolerance survives
  (`"5901234-123457"` still encodes), 12 digits still computes the check digit, 13 still validates it,
  and a bad checksum still returns `nil`.
- **AC3 — Byte-identical output for valid input.** `encodeEAN13("5901234123457")` still produces
  exactly:
  `1,1,1,3,1,1,2,1,1,2,3,1,2,2,2,2,1,2,2,1,4,1,1,2,3,1,1,1,1,1,1,1,2,2,2,1,2,1,2,2,1,4,1,1,1,1,3,2,1,2,3,1,1,3,1,2,1,1,1`
- **AC4 — CI enforces it.** `encodeEAN13` joins `HARNESS_DECLARATIONS` in
  `targets/watch/__tests__/watch-barcode-symbology-contract.test.ts` so the executed-Swift check runs
  it, with an `EAN13` reference symbol and non-ASCII values in `UNENCODABLE`. Reintroducing the
  force-unwrap must fail the suite.
- **AC5 — All five linear formats are then trap-free.** No `Int(String($0))!` remains in any encoder.

## Tasks / Subtasks

- [x] **Task 1 — Point `encodeEAN13` at `asciiDigits(of:)`** (AC: 1, 2)
  - [x] Also re-homed the helper above `encodeEAN13`; it was under an `EAN-8 / UPC-A` MARK that
        stopped being accurate the moment a third encoder used it
- [x] **Task 2 — Prove no regression against BWIPP** (AC: 3)
  - [x] Re-derived from bwip-js; the fixed encoder's output is byte-identical to both BWIPP's symbol
        and the pre-fix shipped output, and the 12-digit and separator variants still match
- [x] **Task 3 — Extend the executed-Swift contract test** (AC: 4)
  - [x] `encodeEAN13` + `ean13CheckDigit` added to `HARNESS_DECLARATIONS`, an `EAN13` reference
        symbol to `REFERENCE_SYMBOLS`, and five EAN-13 values to `UNENCODABLE`
  - [x] Mutation-tested: restoring the force-unwrap turns **two** tests red
- [x] **Task 4 — Swift XCTests for the new contract** (AC: 1, 2)
- [x] **Task 5 — Confirm no encoder still force-unwraps digit parsing** (AC: 5)

## Dev Notes

### Files to touch

**`targets/watch/BarcodeGenerator.swift`** — one line in `encodeEAN13`, plus its doc comment.

- **What must survive:** `encodeEAN13`'s guard band assembly, its A/B/R tables and parity table, its
  12-vs-13-digit contract, and `ean13CheckDigit` — all unchanged. Only digit _extraction_ changes.
- `encodeCode128` is not touched (see Context).

**`targets/watch/__tests__/watch-barcode-symbology-contract.test.ts`** — the executed-Swift harness
already lifts pure declarations out of the Swift source and runs them under `xcrun --sdk macosx swift`.
Adding `encodeEAN13` needs its signature in `HARNESS_DECLARATIONS`, its dependency
`ean13CheckDigit`, and a driver case.

**`watch-ios/Tests/BarcodeGeneratorTests.swift`** — XCTests, for local Xcode runs.

### Guardrails

- **Do not "fix" this with `wholeNumberValue`.** See the table in Context — it invents digits and
  overruns the tables.
- **Do not strip non-ASCII numerals.** That encodes a _shorter_ number than the one stored, which is
  the silent-wrongness class Story 16.28 removed.
- **Do not widen or narrow what `encodeEAN13` accepts otherwise.** Separator tolerance is deliberate.
- Watch is read-only for card data (ADR-2026-06-09-001).
- Native → **not OTA-eligible**.

### Testing

- Swift XCTests in `watch-ios/Tests/` **do not run in CI** — they are wired into no target. The
  CI-enforced layer is the TS contract test, which since 16.28 both inspects _and executes_ the Swift.
- **Mutation-test the assertion.** A source-inspection regex that matches nothing passes forever.
- Compile: `yarn watch:build:ci`.

### Previous story intelligence

- **16.28** introduced `asciiDigits(of:)` and the executed-Swift harness, and documented why refusing
  beats stripping. Read its Completion Notes before starting — this story is its explicitly flagged
  follow-up.

### Out of scope — flag, don't fix

- **Phone-side input validation.** The absence of charset validation on manual entry is the _reason_
  this is reachable, but constraining it is a product decision affecting the phone UI, not a watch fix.
  Worth its own story if a wrong-character card ever shows up in the field.
- **`encodeCode128`** — verified not affected.

## Dev Agent Record

### Agent Model Used

claude-opus-5 (Claude Code, `bmad-dev-story`)

### Debug Log References

**The crash was reproduced, not inferred.** `encodeEAN13`, `ean13CheckDigit` and
`compressBitStringToModuleWidths` were lifted verbatim from the shipped source, compiled standalone and
run on Swift 6.3.3. Exit codes:

| input           | before                  | after                 |
| --------------- | ----------------------- | --------------------- |
| `5901234123457` | 0, correct module array | 0, **byte-identical** |
| `٣901234123457` | **133 (SIGTRAP)**       | 0, `nil`              |
| `590123412345Ⅷ` | **133 (SIGTRAP)**       | 0, `nil`              |
| `㉈901234123457` | **133 (SIGTRAP)**       | 0, `nil`              |

**No regression, checked three ways.** The fixed encoder's output for `5901234123457` equals (a) the
symbol BWIPP renders for the same value, (b) the exact array the pre-fix code produced, and (c) the
output for both `590123412345` (12 digits, check computed) and `5901234-123457` (separator).

**Mutation-tested.** Restoring `value.filter { $0.isWholeNumber }.map { Int(String($0))! }` turns two
tests red — the source assertion and the executed-Swift check, which traps inside the harness.

**Both failure diagnostics were improved while here**, because a test nobody can read on failure stops
being consulted. The force-unwrap assertion used to dump the entire 1000-line file; it now reports the
offending line number and text. A trapping harness used to surface ~40 lines of LLVM stack dump; the
runner now catches it and reports the one `Fatal error:` line with a sentence explaining that a nil
unwrap here means a crash on real card data rather than a wrong barcode.

**QA review closed four findings, one of which found a genuinely non-discriminating test value.**

- The executed dataset reached EAN-13's _validate_ path but never its **12-digit compute-the-check-digit
  branch**, nor the **separator** path — both behaviours AC2 names explicitly. QA proved it by breaking
  the compute branch and still getting a clean pass. Both now have `REFERENCE_SYMBOLS` rows.
- ⚠️ **The first 12-digit value chosen was useless as a test.** `590123412345` yields check digit 7
  under _both_ `ean13CheckDigit` (weights 1,3,…) and `upcEANCheckDigit` (weights 3,1,…), so swapping
  the two helpers — precisely the regression QA asked about — still passed. The two agree exactly when
  `(sum of even-index digits − sum of odd-index digits) % 5 == 0`, which that value satisfies. Replaced
  with `590123412341` (9 vs 1), and the swap now fails. The reasoning is recorded beside the vector so
  the value is not "simplified" back later.
- The trap diagnostic reported a line number relative to the assembled harness, which is deleted before
  anyone could open it. It now also quotes the offending line verbatim, greppable in the real source.
- The force-unwrap assertion matched one exact spelling; it now matches the unsafe _shape_, so
  `Int(String(ch))!` is caught too, and it no longer pins the helper's parameter name. `HARNESS_DECLARATIONS`
  deliberately still uses exact signatures — they must anchor unambiguously, and that coupling fails
  loudly, naming the declaration it could not find.

All three QA-named regressions (compute branch broken, compute branch borrowing `upcEANCheckDigit`,
separator tolerance dropped) now turn the suite red; the unmutated tree is green.

A second QA pass then caught a leak the third fix had introduced: hoisting `buildHarness` above the
`try` meant an extraction failure skipped the `finally` that removes the temp directory. It now runs
_before_ the directory is created, so that failure has nothing to clean up. Verified by counting
`watch-barcode-*` directories across a deliberately-failing run: unchanged.

\*\*Validation run: `yarn test` 176 suites / 2166 tests pass · watch contract suite 5 suites / 50 tests
pass · `yarn watch:build:ci` BUILD SUCCEEDED · `tsc --noEmit`, `eslint`, `prettier --check` clean ·
`swiftc -typecheck` clean in Debug and Release.

### Completion Notes List

**Story numbering.** Allocated **16-34**, not 16-30. The tracker and `stories/` both stop at 16-29, but
`16-30`…`16-33` are already claimed by story files on the unmerged `docs/cardi-redesign-carry-over`
branch. Taking the next number the tracker appeared to offer would have collided on merge.

**`asciiDigits(of:)` was re-homed.** It sat under `// MARK: EAN-8 / UPC-A`, which stopped describing it
once EAN-13 became its third caller. Moved above `encodeEAN13` — first use — and its doc comment now
names all three. Behaviour unchanged.

**The force-unwrap assertion was widened from "the new encoders" to the whole file.** Scoping it to the
slice 16.28 introduced is what let this defect sit in `encodeEAN13` while a green test claimed
force-unwrapped digit parsing was gone.

**`encodeCode128` is genuinely unaffected**, re-verified here: it guards `ch.asciiValue` for every
character up front and returns `nil` on failure, so its later `asciiValue!` uses are unreachable when
`nil`. No change made.

**⚠️ Stacked on 16.28.** `asciiDigits(of:)` arrives with [#212](https://github.com/ifero/myLoyaltyCards/pull/212),
so this branch is cut from `feature/16-28-watch-real-symbologies` rather than `main`. **#212 must merge
first.** If it squash-merges, rebase this branch onto the new `main` before merging — the fix is small
and the rebase should be trivial, but it will not be a fast-forward.

**Flagged, not fixed — phone-side input validation.** The reason a non-ASCII numeral can reach the
encoder at all is that `core/schemas/card.ts:45` types `barcode` as a bare `z.string()` and
`CardForm.tsx:42` validates only `.min(1)`. Constraining that is a product decision about the phone UI,
not a watch fix, and is deliberately out of scope. Worth its own story if such a card ever appears in
the field.

### File List

- `targets/watch/BarcodeGenerator.swift` — modified
- `targets/watch/__tests__/watch-barcode-symbology-contract.test.ts` — modified
- `watch-ios/Tests/BarcodeGeneratorTests.swift` — modified
- `docs/sprint-artifacts/stories/16-34-fix-encodeean13-non-ascii-numeral-trap.md` — added
- `docs/sprint-artifacts/sprint-status.yaml` — modified

### Change Log

| Date       | Change                                                                                                                                                                                            |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-01 | `encodeEAN13` parses digits through `asciiDigits(of:)`, so a non-ASCII numeral returns `nil` instead of trapping. Output for every value that worked before is byte-identical.                    |
| 2026-09-01 | Re-homed `asciiDigits(of:)` above `encodeEAN13`; it is shared by all three EAN/UPC encoders and no longer belongs under the EAN-8/UPC-A heading.                                                  |
| 2026-09-01 | Lifted `encodeEAN13` into the executed-Swift contract harness with a BWIPP reference symbol and five refusal cases, and widened the force-unwrap assertion from 16.28's two encoders to the file. |
| 2026-09-01 | Improved both failure diagnostics: offending line numbers instead of a whole-file dump, and the Swift `Fatal error:` line instead of an LLVM stack dump.                                          |
| 2026-09-01 | QA review: added `REFERENCE_SYMBOLS` rows for EAN-13's 12-digit compute branch and its separator path, after QA proved both were unreachable by the executed harness.                             |
| 2026-09-01 | QA review: replaced the 12-digit value with one that actually discriminates — `590123412345` gives the same check digit under both helpers, so a swap between them passed undetected.             |
| 2026-09-01 | QA review: the trap diagnostic now quotes the offending source line, and the force-unwrap assertion matches the unsafe shape rather than one spelling.                                            |
| 2026-09-01 | QA review round 2: build the Swift harness before creating its temp directory, so an extraction failure cannot skip the cleanup `finally`.                                                        |
