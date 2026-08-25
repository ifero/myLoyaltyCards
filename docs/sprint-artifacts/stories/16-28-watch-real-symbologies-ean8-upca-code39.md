---
baseline_commit: 115709db1516be13e449145bcc6ac9ac139e5c97
---

# Story 16.28: Render EAN-8, UPC-A and Code39 with their real symbologies on Apple Watch

Status: review

Epic: 16 — Platform & Tech Debt

> **The watch draws a Code128 symbol for three formats that are not Code128.**
> `BarcodeGenerator.generateImage` maps three of the six supported formats onto a fourth:
>
> ```swift
> case .EAN8, .UPCA, .CODE39:
>   // pragmatic fallback: render as Code128 so scanners can still read it
>   modules = encodeCode128(value: value)
> ```
>
> `targets/watch/BarcodeGenerator.swift:57-59`, introduced **2026-02-16** in `1d6cf7f` and unchanged
> since. The result is a **valid Code128 symbol carrying the right digits under the wrong symbology**:
> a POS lane expecting EAN-8 with Code128 disabled for loyalty **rejects it outright**, and a lane that
> accepts it reports a different symbology identifier than the same card scanned off the plastic.
> This is a direct, concrete cause of _"the checkout scanner doesn't recognise the barcodes from the
> apple watch"_.
>
> **📌 WRITTEN DOWN AT IFERO'S EXPLICIT REQUEST (2026-08-02): _"we need to write it down otherwise it
> gets lost"_.** This was **found during investigation, not reported from the field** — there is no user
> report attached to it and no reproduction case supplied.
>
> **⚠️ CORRECTS A STALE CLAIM IN THE TRACKER.** Story 10.4's research note says these formats
> _"fall through leaving `modules` nil and generateImage returns nil"_, so _"an EAN-8 card shows NOTHING
> on Apple Watch today"_. **That was true before `1d6cf7f`.** Current behaviour is the Code128
> substitution — harder to notice and arguably worse, because the user sees a plausible barcode that the
> lane may refuse. Story 16.25 (UPC-E) independently found and corrected the same stale claim.
>
> **⚠️ SCOPE DEPENDS ON STORY 16.25, WHICH IS NOW ON `main` BUT NOT YET IMPLEMENTED.** It ships three
> options and picks none; the one that lands decides whether a fourth encoder is needed here. See
> [Interaction with 16.25](#interaction-with-story-1625--check-this-before-sizing).
>
> **Native change → NOT OTA-eligible.** Shares `BarcodeGenerator.swift` with **16.27** —
> **land 16.27 first** so these encoders are written against the corrected renderer.

## Story

As a user whose loyalty card is an EAN-8, UPC-A or Code39 barcode,
I want my watch to show that card in the symbology it actually is,
so that a checkout scanner accepts it instead of reading a barcode that claims to be something my card is not.

## Context

### The gap between what is advertised and what is drawn

`WatchBarcodeFormat` (`targets/watch/BarcodeGenerator.swift:15-22`) declares **six** cases —
`CODE128`, `EAN13`, `EAN8`, `CODE39`, `UPCA`, `QR` — matching `barcodeFormatSchema`
(`core/schemas/card.ts:16-23`), the cross-platform sync contract shared with watchOS and Wear OS.

Only **three** are really implemented. The file's own doc comment concedes it at `:37-38`:
_"Supports EAN-13, Code128, and QR."_

| Format    | Encoder today                | Correct?               |
| --------- | ---------------------------- | ---------------------- |
| `EAN13`   | `encodeEAN13` (`:95`)        | ✅                     |
| `CODE128` | `encodeCode128` (`:164`)     | ✅                     |
| `QR`      | `renderQRCodeImage` (`:377`) | ✅                     |
| `EAN8`    | `encodeCode128`              | ❌ **wrong symbology** |
| `UPCA`    | `encodeCode128`              | ❌ **wrong symbology** |
| `CODE39`  | `encodeCode128`              | ❌ **wrong symbology** |

### Why the fallback is worse than it looks

The comment says _"so scanners can still read it"_ — and a Code128 symbol **is** readable. But:

1. **Symbology gating.** Many POS lanes enable only the symbologies they expect for loyalty. A lane
   with Code128 disabled reads nothing at all.
2. **Silent wrongness.** Where it does scan, the lane reports Code128 with an 8-digit payload where it
   expected EAN-8 — a mismatch the loyalty backend may reject.
3. **It is invisible.** Nothing logs, nothing warns, and the barcode _looks_ fine on the wrist. That is
   why this has shipped since February without a bug report.

### Interaction with Story 16.25 — check this before sizing

Story **16.25** ("map UPC-E instead of storing it as Code 128") **merged to `main` on 2026-08-02**
(PR #189) and now sits at `ready-for-dev`. It is **the phone-side sibling of this defect**:

- **16.25** — a UPC-E scan is **stored** with `barcodeFormat: CODE128`, because `BARCODE_FORMAT_MAP` has
  no `upc_e` key and `mapFormat` falls through to `?? 'CODE128'`.
- **This story** — formats already **stored correctly** are **rendered** as Code128 on the watch.

Complementary, not duplicates. **But which option 16.25 lands changes this story's scope:**

| 16.25 option                                                   | Impact here                              |
| -------------------------------------------------------------- | ---------------------------------------- |
| **(a)** add `UPCE` to `barcodeFormatSchema`                    | ⚠️ **a fourth encoder is required here** |
| **(b)** expand UPC-E → 12-digit UPC-A _(their recommendation)_ | nothing extra needed                     |
| **(c)** stop requesting `UPC_A` _(rejected there)_             | n/a                                      |

**16.25 is drafted, not implemented — confirm which option it lands before sizing this story.**

## Acceptance Criteria

- **AC1 — EAN-8, UPC-A and Code39 each get a real encoder** in `BarcodeGenerator`, alongside
  `encodeEAN13` (`:95`) and `encodeCode128` (`:164`).
  - **EAN-8** — 8 digits, its own check-digit weighting (**not** EAN-13's).
  - **UPC-A** — 12 digits. ⚠️ It **decodes** as EAN-13 with a leading zero, but it is **not** that at the
    module level — do not implement it by prefixing `0` and calling `encodeEAN13`.
  - **Code39** — alphanumeric, `*` start/stop delimiters, a different module structure (9 elements per
    character, 3 wide).
- **AC2 — Check digits are validated the way EAN-13 already is.** `encodeEAN13` accepts 12 digits and
  computes the check, or 13 and validates it, returning `nil` on mismatch (`:95-107`). New encoders
  follow the same contract so a corrupt payload **fails visibly** rather than rendering a wrong-but-plausible
  symbol. (Code39 has an optional mod-43 check digit — decide and document whether it is required.)
- **AC3 — An unencodable value returns `nil`** and the view falls back to the existing value-text
  placeholder (`BarcodeFlashView.swift:167-183`), which shows the human-readable number for manual
  keying. **Substituting a different symbology is the defect being removed and must not survive anywhere
  in the switch** — including as a "temporary" fallback.
- **AC4 — Encoder output is unit-tested against known-good module sequences** in
  `watch-ios/Tests/BarcodeGeneratorTests.swift`. ⚠️ **Test vectors come from published reference symbols,
  not from this implementation's own output** — self-generated vectors would lock in whatever bug the
  encoder has.
- **AC5 — Validated on a real scanner, per symbology.** One card of each of the three formats scanned at
  a physical lane. **This is the only AC that can prove the fix**, and it cannot be met in a simulator.
- **AC6 — The six-format contract is unchanged.** `barcodeFormatSchema` (`core/schemas/card.ts:16-23`) is
  a cross-platform sync contract; Story 16.23 already fixed the supported set **by decision**. This story
  implements three of the six properly — **it does not add or remove any** (unless 16.25 option (a) lands
  first, which is a change owned by _that_ story).
- **AC7 — Inherits Story 16.27's geometry.** These symbologies have different module counts from EAN-13,
  so they go through the same integer-snap, per-symbology quiet zone and rotation predicate rather than
  carrying their own maths. Code39 in particular is **much wider per character** than Code128 and will
  cross the rotation threshold sooner.

## Tasks / Subtasks

- [x] **Task 0 — Confirm 16.25's landed option** (AC: 6) — determines whether a UPC-E encoder is in scope
  - [x] 16.25 is still `ready-for-dev` — **not implemented, no option landed**. No UPC-E encoder is in
        scope and the six-format contract is untouched.
- [x] **Task 1 — EAN-8 encoder** (AC: 1, 2)
  - [x] 8-digit parity/check-digit tables; `nil` on checksum mismatch
- [x] **Task 2 — UPC-A encoder** (AC: 1, 2)
  - [x] 12-digit module structure — **not** `"0" + encodeEAN13`
- [x] **Task 3 — Code39 encoder** (AC: 1, 2)
  - [x] `*` delimiters, 9-element characters; **mod-43 decided against** — see Completion Notes
- [x] **Task 4 — Remove the substitution** (AC: 3)
  - [x] Deleted the `case .EAN8, .UPCA, .CODE39: encodeCode128` arm; `nil` reaches the placeholder
- [x] **Task 5 — Reference-vector tests** (AC: 4)
  - [x] 11 BWIPP reference symbols in `BarcodeGeneratorTests.swift`, plus a CI-enforceable
        contract test that cross-checks the Swift tables against the same reference data
- [x] **Task 6 — Quiet zones + geometry** (AC: 7)
  - [x] Per-symbology quiet zones via `quietZone(for:)` — EAN-8 7X, UPC-A 9X, Code39 10X
  - [ ] ⏸️ **Confirm 16.27's rotation predicate handles the wider symbols — NOT POSSIBLE YET.** The
        Sprint 19 plan sequences 16-27 _after_ this story (inverting this story's banner), so the
        predicate does not exist to confirm against. **Carried into 16-27.**
- [ ] ⏸️ **Task 7 — Real-scanner validation, one card per format** (AC: 5) — **REQUIRES IFERO.** Needs a
      physical Apple Watch and a physical checkout lane; it cannot be met in a simulator or by any
      automated check. **Not done, and not silently accepted** — see Completion Notes.

## Dev Notes

### Files to touch — current state and what must survive

**`targets/watch/BarcodeGenerator.swift`** — the only source file this story changes.

- Current state: `generateImage` (`:39`) resolves the format, switches to an encoder, renders through
  `renderCGImage` (`:313`), and caches into an `NSCache` keyed `cacheVersion|value|format|WxH` (`:45`).
- What this story changes: the `switch` at `:52-67` and the three new encoders.
- **What must survive:** `encodeEAN13` and `encodeCode128` unchanged; the QR branch (`:61-66`) untouched;
  the `NSCache` budget (`:29-35`); off-main-thread rendering (`:72-77`); `Task.isCancelled` (`:80`, `:128`).
- ⚠️ **`cacheVersion` (`:27`) must be bumped** — an existing EAN-8 card has a cached _Code128_ image
  keyed by the same value+format+size, and without a bump the device keeps serving it.

### Guardrails

- **Do not widen the format set.** Six formats, by decision (Story 16.23). Adding `UPCE` belongs to
  Story 16.25 if its option (a) is chosen.
- **Do not implement UPC-A as zero-padded EAN-13.** They decode equivalently; they do not encode
  identically. This is the single most likely shortcut and it produces a wrong symbol.
- **No silent substitution, anywhere.** `nil` → placeholder is the contract (AC3).
- Watch is read-only for card data (ADR-2026-06-09-001).
- Native → **not OTA-eligible**.

### Testing

- ⚠️ **Swift XCTests in `watch-ios/Tests/` do not auto-run in CI** — the CI-enforced watch tests are the
  **TypeScript** contract tests in `targets/watch/__tests__/`, which regex-parse Swift source rather than
  executing it. `BarcodeGeneratorTests.swift` is still the right home for AC4's vectors (run it locally in
  Xcode), but **do not assume CI is checking it**.
- Consider a TS contract assertion that the substitution arm is **gone** — that one _is_ CI-enforceable by
  source inspection, and it is the regression this story most needs to prevent.
- Compile: `yarn watch:build` (needs the **main checkout**; `ios/` is gitignored).
- **AC5 is the only real proof.**

### Previous story intelligence

- **16.23** — same defect family on the phone (`?? 'CODE128'` silently relabelling unknown formats).
  It also set the house standard for this kind of work: **verify on both platforms**, because iOS and
  Android use different native engines.
- **16.27** — the renderer this story's encoders feed. **Land it first.**
- **Story 2.9** (`2-9-scan-cards-from-image-screenshot.md:184`) — _"verify on both platforms because iOS
  and Android now use different native engines for static images"_. Same caution applies to symbology
  handling across watchOS and Wear OS.

### Git intelligence

`1d6cf7f` (2026-02-16, _"fix(watch): use encodeCode128 for fallbacks (remove missing encodeCode128B ref)"_)
is the commit that introduced this. Read it: the fallback was a **compile fix** for a missing
`encodeCode128B` reference, not a considered product decision — which is why the comment reads as a
stopgap. Nothing has touched the encoders since.

### Library versions

No new dependency. Encoders are hand-written Swift, consistent with the existing ones — **watchOS ships
no barcode library**, which is why `BarcodeGenerator` hand-implements EAN-13 and Code128 in ~500 lines.
⚠️ **Do not add a third-party barcode pod to work around this**; Story 10.4 uses ZXing on Wear OS because
Android has it for free, and that is not transferable.

### Project structure notes

`targets/watch/` is generated into the gitignored `ios/` by `@bacons/apple-targets` at prebuild.
`deploymentTarget: '10.0'`.

### Out of scope — flag, don't fix

- **UPC-E** — Story 16.25 (unless its option (a) lands, see Task 0).
- **Wear OS** — Story 10.4 covers all six natively via ZXing; this closes the watchOS side only.
- Changing which symbologies the **phone** can scan or store — Story 16.23 fixed that set by decision.

### Open questions for ifero

None blocking — but note this defect has **no field report behind it**. If AC5 shows real lanes accept
the Code128 substitution fine, that is worth knowing before investing in three encoders. **Run Task 0 and
a quick AC5 spot-check before committing to the full build.**

## Dev Agent Record

### Agent Model Used

claude-opus-5 (Claude Code, `bmad-dev-story`)

### Debug Log References

**How the encoders were verified — no table was typed from memory.**

The phone renders all six formats with `@bwip-js/react-native` 4.10.1 (BWIPP 2026-04-21) via
`BarcodeRenderer.tsx`. BWIPP is a published reference implementation _and_ the thing the watch has to
agree with, so it was used as the source of truth for every module pattern.

1. **The extraction tool was validated before it was trusted.** `bwipjs.toSVG` was used to recover each
   symbol's alternating bar/space run array. Run against EAN-13 `5901234123457`, its output is
   **byte-identical** to the already-shipped, known-good `encodeEAN13`. That single control proves the
   extractor is correct, and that BWIPP's array convention matches this file's `[Int]` convention
   (first entry a bar, alternating).
2. **Tables were derived, not transcribed.** All 43 Code 39 patterns plus the `*` delimiter, and both
   EAN/UPC digit tables, were generated from BWIPP. The EAN right-hand table was independently
   cross-checked as the bitwise complement of the left-hand table.
3. **The encoders were verified before landing.** Compiled standalone and diffed against 13 BWIPP
   reference symbols — all matched. Re-extracted _from the committed file_ afterwards and re-diffed;
   still all matched. **11 of those 13 are retained** as assertions in `BarcodeGeneratorTests.swift`;
   the two dropped (`HELLO WORLD`, `1234567890`) add no coverage the retained Code 39 cases lack.
4. **CI now executes the encoders, it does not merely read them.** The Swift XCTests are wired into no
   build target, so nothing ran the encoding maths automatically — a change that kept every function
   name, switch arm and lookup table intact while breaking what a function _computes_ would have passed
   every gate this repo has, on a native path that cannot be hotfixed OTA. The contract test now lifts
   the pure encoder declarations out of the shipped source, assembles them into a standalone program and
   runs it under `xcrun --sdk macosx swift` — the same mechanism `watch:catalogue:generate` already uses
   in this workflow — comparing its output to the BWIPP reference symbols. Costs ~0.9s. Verified against
   five logic mutations that every source-inspection assertion waves through: EAN-13's check-digit
   weighting reused, an off-by-one left-digit slice, UPC-A drawing left digits from the right-hand table,
   the Code 39 inter-character gap widened, and the non-ASCII guard downgraded from refuse to strip. All
   five turn the suite red. Breaking the extraction itself fails loudly, naming the missing declaration,
   rather than skipping, and the brace matcher skips comments so a brace written in prose cannot desync
   it. The executed dataset is 16 BWIPP reference symbols and 9 values that must come back `nil`, chosen
   so that **every branch and every table entry is reached**: 7-digit EAN-8 and 11-digit UPC-A drive the
   compute-the-check-digit paths (8 and 12 digits drive the validate-it paths), and one Code 39 case
   spells out all 43 encodable characters. Both additions were made because a QA pass proved the earlier
   dataset was blind to them — hardcoding both auto-compute branches to append `0` still passed.
5. **The contract tests were mutation-tested.** Source-inspection assertions pass silently when they
   match nothing, so six defects were deliberately reintroduced (Code128 fallback restored, a Code 39
   pattern mistyped, an EAN pattern mistyped, the cache version left at v2, a quiet zone wrong, a
   seventh format added). Every one produced a red test; the unmutated tree is green.

**Validation run:** `yarn test` 176 suites / 2166 tests pass · watch contract suite 5 suites / 50
tests pass, including the executed-Swift check ·
`yarn watch:build:ci` **BUILD SUCCEEDED** with no new warnings · `tsc --noEmit` clean · `eslint` clean ·
`prettier --check` clean · `swiftc -typecheck` clean against the watchOS SDK in both Debug and Release.

### Completion Notes List

**Task 0 result.** Story 16.25 is still `ready-for-dev` — no option has landed. Per this story's own
table that means **no fourth encoder**: `UPCE` is not added, and `barcodeFormatSchema` is untouched
(AC6). A contract test now asserts `WatchBarcodeFormat` and `barcodeFormatSchema` stay in step, so a
future 16.25 option (a) cannot widen one without the other.

**AC2 open question — mod-43 decided against, on evidence.** Code 39's check digit is optional in the
symbology. The phone renders these cards through bwip-js `code39` **without** `includecheck`, so it
emits no check digit. Adding one only on the watch would make the wrist symbol decode to a _different
string_ than the phone and the plastic — the same class of silent mismatch AC3 exists to remove. So:
no mod-43, documented at `encodeCode39`.

**Related decision: lower case is rejected, not upper-cased.** BWIPP refuses `a` outright. Silently
upper-casing on the watch would change the payload, so `encodeCode39` returns `nil` and the view shows
the human-readable placeholder — matching the phone's behaviour for the same value.

**⚠️ A factual correction to AC1.** AC1 says UPC-A _"is **not** [EAN-13 with a leading zero] at the
module level"_. That was tested and it is **not accurate**: BWIPP's UPC-A array for `012345000058` is
identical to its EAN-13 array for `0012345000058`, and likewise for two other payloads. **AC1's
instruction was still followed**, because it is right for a different and more serious reason:
`encodeEAN13` reads a **12-digit** argument as EAN-13 data _awaiting_ a check digit, so handing it a
complete 12-digit UPC-A appends a 13th digit and produces a wholly different symbol. UPC-A also has its
own 11-digit check-digit contract that `encodeEAN13` cannot express. `encodeUPCA` is therefore a real,
standalone encoder, and the reasoning is recorded in its doc comment so the shortcut is not
"rediscovered" later.

**⚠️ Sequencing inverted relative to this story's banner.** The banner says _"land 16.27 first"_. The
Sprint 19 plan (2026-08-20, later than the story) deliberately reverses that, putting 16-28 first so
16-27's quantisation fix then applies to all six formats instead of three. The sprint plan was
followed. Consequence for **AC7**: the shared geometry 16-27 will introduce does not exist yet, so
these encoders carry **no geometry maths of their own** — they emit module arrays into the existing
shared `renderCGImage`, exactly as EAN-13 and Code128 do. When 16-27 lands, its fix covers them for
free. The one half of Task 6 that needs 16-27 (confirming its rotation predicate copes with Code 39's
much wider symbols) is **carried into 16-27** and left unchecked here.

**⛔ AC5 IS NOT MET AND MUST NOT BE ASSUMED — this needs ifero.** AC5 (one card of each format scanned
at a physical lane) is the story's own _"only AC that can prove the fix"_, and it cannot be met from
this environment: it needs a real Apple Watch and a real checkout scanner. Everything achievable
without hardware has been done and is green, but **that is not the same as proving a scanner accepts
the symbols.** The Epic 10 retro (DEC-E10-RETRO-001) closed with on-device validation skipped and the
risk accepted _by default_; the Sprint 19 plan asked that this story either get a real-device pass or
record the same risk **knowingly**. It is recorded here knowingly, unresolved, and Task 7 is left
unchecked rather than quietly closed.

What the automated evidence does and does not establish:

- ✅ Each symbol is **bit-identical to BWIPP's**, so the watch now draws exactly what the phone draws.
- ✅ The wrong-symbology substitution is gone and cannot return without failing CI.
- ❌ It does **not** establish that any particular POS lane reads the symbol off a watch screen —
  that depends on physical rendering, screen luminance and scanner optics. 16-27 (geometry) and 16-26
  (luminance) address those, and both are still ahead in this sprint.

**Found in code review and fixed — a trap on non-ASCII numerals.** Both new encoders originally copied
`encodeEAN13`'s digit extraction, `value.filter { $0.isWholeNumber }.map { Int(String($0))! }`.
`Character.isWholeNumber` is also true outside ASCII, and every reading of such a character is wrong:
`Int(String("٣"))` is `nil`, so the force-unwrap **traps and kills the watch app**;
`"Ⅷ".wholeNumberValue` is `8`, which would encode a digit the card does not contain; `"㉈"` is `10`,
which would index past the ten-entry pattern tables. Nothing upstream prevents such a character
arriving — `barcode` is a bare `z.string()` and the phone's entry fields do not restrict the charset.
Replaced with `asciiDigits(of:)`, which still ignores separators (so `"9520-0002"` works, matching
`encodeEAN13`'s tolerance) but **refuses** a non-ASCII numeral rather than silently dropping it, since
dropping it would encode a shorter number than the one stored. A contract test now fails if the
trapping idiom comes back.

**⚠️ Flagged, not fixed — the same trap remains in `encodeEAN13` (`BarcodeGenerator.swift:109`).** It
is the original of the pattern the new encoders copied, and it is reachable the same way. Left alone
because this story's guardrails require `encodeEAN13` to survive **unchanged**. It needs its own story.
`encodeCode128` was checked and does **not** share the defect: it validates `ch.asciiValue` for every
character up front and returns `nil` on failure, so its later `asciiValue!` uses are unreachable when
`nil`.

**Observation, not fixed — flagged for 16-27.** `encodeEAN13` keeps its own inline copies of the A/B/R
digit tables while `encodeEAN8`/`encodeUPCA` use new file-scope constants, so the A and R tables now
exist twice. Deduplicating would mean editing `encodeEAN13`, which this story's guardrails explicitly
forbid (_"encodeEAN13 and encodeCode128 unchanged"_). Both copies are pinned to BWIPP by the contract
test, so they cannot silently diverge. 16-27 already edits this file and is the natural place to merge
them if wanted.

### File List

- `targets/watch/BarcodeGenerator.swift` — modified
- `watch-ios/Tests/BarcodeGeneratorTests.swift` — modified
- `targets/watch/__tests__/watch-barcode-symbology-contract.test.ts` — added
- `docs/sprint-artifacts/sprint-status.yaml` — modified
- `docs/sprint-artifacts/stories/16-28-watch-real-symbologies-ean8-upca-code39.md` — modified

### Change Log

| Date       | Change                                                                                                                                                                                                                                                     |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-24 | Added `encodeEAN8`, `encodeUPCA` and `encodeCode39`, each verified bit-for-bit against BWIPP reference symbols. Removed the `case .EAN8, .UPCA, .CODE39 -> encodeCode128` substitution.                                                                    |
| 2026-08-24 | Consolidated format→encoder selection into a single `modules(for:value:)`, so one switch is the only place a format can pick an encoder — and the only place a substitution could reappear.                                                                |
| 2026-08-24 | Bumped `cacheVersion` to `watch-barcode-v3`; v2 entries for these formats hold Code128 images under the same key.                                                                                                                                          |
| 2026-08-24 | Replaced the flat 10-module quiet zone with per-symbology minima (`quietZone(for:)`): EAN-8 7X, UPC-A 9X, Code 39 10X. EAN-13 and Code128 unchanged.                                                                                                       |
| 2026-08-24 | Added 12 reference-vector XCTests and a new CI-enforced contract test that cross-checks the Swift tables against BWIPP and fails if the substitution returns. Mutation-tested against six reintroduced defects.                                            |
| 2026-08-24 | Code review: replaced the copied `Int(String($0))!` digit extraction with `asciiDigits(of:)`, which cannot trap on non-ASCII numerals and refuses them rather than silently shortening the payload. Added tests plus a CI assertion against the old idiom. |
| 2026-08-24 | Code review: corrected indentation drift in the `#if DEBUG` block and reconciled the reference-vector counts in this record.                                                                                                                               |
| 2026-08-24 | QA review: the contract test now **executes** the shipped encoders under `xcrun swift` against the BWIPP reference symbols, closing the gap where CI checked names and tables but never the encoding maths on a non-OTA native path.                       |
| 2026-08-24 | QA review: extended the end-to-end placeholder test to the malformed values reachable from manual card entry (bad-checksum UPC-A, lower-case Code 39), and corrected two notes in this record.                                                             |
| 2026-08-24 | QA review round 2: widened the executed dataset to cover the compute-the-check-digit branches and all 43 Code 39 characters (a QA probe proved both were blind spots), and made the declaration matcher comment-aware.                                     |
