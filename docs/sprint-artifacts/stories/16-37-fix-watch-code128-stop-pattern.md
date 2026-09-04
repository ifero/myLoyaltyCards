---
baseline_commit: 13b39a3486ad21ff341aff9275fbfcf678dfa72f
---

# Story 16.37: Fix the Apple Watch Code 128 stop pattern — every symbol ends two modules short

Status: review

Epic: 16 — Platform & Tech Debt

> **Every Code 128 barcode the Apple Watch has ever drawn is missing its final bar.**
> `targets/watch/BarcodeGenerator.swift`, in `encodeCode128(value:)`, index **106** of the local
> `widthsTable` — the STOP character — is `"233111"`. The published Code 128 stop pattern is
> **`"2331112"`**. Six elements where there should be seven; 11 modules where there should be 13. The
> terminating 2-module bar is absent, so every symbol ends on a **space**.
>
> **CONFIRMED BY EXECUTION, not inferred.** The shipped encoder, lifted verbatim and run under
> `xcrun --sdk macosx swift`, returns **121 modules** for `5901234123457`. BWIPP returns **123**, and
> the two arrays are identical up to that missing trailing `2`. A Code 128 decoder terminates the
> symbol by matching the stop pattern; without its final bar there is nothing to match.
>
> **A THIRD, INDEPENDENT CAUSE** of ifero's "most of the checkout scanners don't recognise the
> barcodes from the apple watch" — separate from **16.27** (module quantisation) and **16.28** (wrong
> symbology for EAN-8/UPC-A/Code39). Code 128 is the **default fallback format** for manually entered
> cards (`mapFormat`'s `?? 'CODE128'`), so the blast radius is the widest of the three.
>
> **Native change → NOT OTA-eligible.**

## Story

As a user who shows a Code 128 loyalty card on my Apple Watch,
I want the symbol to carry its complete stop pattern,
so that the checkout scanner can terminate the read instead of rejecting it.

## Context

### The defect, in one table

`widthsTable` maps each Code 128 code word to its six element widths — except the stop, which has
seven. Its last seven entries:

| Index   | Shipped  | Correct    | Meaning                            |
| ------- | -------- | ---------- | ---------------------------------- |
| 103     | `211412` | `211412`   | Start A ✅                         |
| 104     | `211214` | `211214`   | Start B ✅                         |
| 105     | `211232` | `211232`   | Start C ✅                         |
| **106** | `233111` | `2331112`  | **STOP — final 2-module bar lost** |
| 107     | `211214` | _(absent)_ | unreachable duplicate of Start B   |
| 108     | `233111` | _(absent)_ | unreachable duplicate of the stop  |
| 109     | `211214` | _(absent)_ | unreachable duplicate of Start B   |

Code 128 code words run **0…106**. The table has **110** entries. Indices 107-109 are unreachable —
`encodeCode128` guards `c < widthsTable.count` and never appends a code word above 106 — but they are
not harmless: **they are why the wrong entry at 106 was never obvious.** A correct 107-entry table
puts the stop last, where a truncated pattern stands out; three trailing duplicates hide it in the
middle of a run.

### Evidence

Four independent sources agree on `2331112`, and all four were checked rather than cited:

1. **BWIPP's own source**, vendored at `node_modules/@bwip-js/react-native/barcode.ps:6757`, ends its
   code128 `encs` table `(211232) (2331112)` — Start C, then STOP. That table has exactly **107**
   entries, and its 103-106 match the table above.
2. **bwip-js 4.10.1** — `bwipjs.raw({ bcid: 'code128', text: '5901234123457' })` returns an `sbs` of
   **67 elements / 123 modules**, ending `2,3,3,1,1,1,2`.
3. **The shipped Swift**, executed — **66 elements / 121 modules**, ending `2,3,3,1,1,1`. Identical to
   BWIPP for all 66 preceding elements.
4. **The width formula** — 11 × (code words including start and check) + 13 for the stop. Ten code
   words for that value gives 11 × 10 + 13 = **123**.

### Why a decoder cares

The final bar is not decoration. A Code 128 reader identifies the symbol's end by matching the
13-module stop against its bar/space waveform; the pattern is deliberately asymmetric so the decoder
can also tell a reversed scan from a forward one. Ending on a space leaves the symbol
**indistinguishable from a truncated scan** — the reader keeps waiting for a terminator that never
arrives, and either times out or discards the read. That is a **plausible** rejection mechanism, not a
measured one: no POS lane was tested here, and this story does not claim to have measured one.

### What is NOT wrong

Verified while confirming the above, and recorded so no one re-audits it:

- **Every other entry in the table is correct.** All 107 shipped values at indices 0-106 match BWIPP's
  `encs` exactly, including all three start codes.
- **The checksum arithmetic is correct.** Twenty values were encoded by the shipped Swift, given the
  missing element, and decoded back independently: all twenty round-trip to their exact input text
  with a valid modulo-103 check.
- **The ASCII gate holds.** `encodeCode128` validates every character against 32…126 up front, so its
  later `asciiValue!` uses are unreachable when nil — Story 16.34 checked this and it still stands.

## Acceptance Criteria

- **AC1 — The stop pattern is complete.** `widthsTable[106]` is `"2331112"`. Every Code 128 symbol the
  watch draws gains its terminating 2-module bar and is 2 modules longer.
- **AC2 — The table has exactly 107 entries**, indices 0…106, with the stop last. The three
  unreachable duplicates at 107-109 are removed.
- **AC3 — No other change to any encoded symbol.** For every value, the fixed output equals the
  pre-fix output with `2` appended — the code-set decisions, checksum and all 66 preceding elements
  are untouched.
- **AC4 — Output matches BWIPP.** `encodeCode128("5901234123457")` produces exactly:
  `2,1,1,2,3,2,3,3,2,1,1,1,2,2,2,1,2,2,3,1,2,1,3,1,2,3,1,3,1,1,3,1,2,1,3,1,1,1,3,1,2,3,1,1,4,1,3,1,3,1,2,1,3,1,2,2,1,2,3,1,2,3,3,1,1,1,2`
  — 67 elements, 123 modules.
- **AC5 — CI enforces it, permanently.** `encodeCode128` joins `HARNESS_DECLARATIONS` in
  `targets/watch/__tests__/watch-barcode-symbology-contract.test.ts` so the executed-Swift check runs
  it, with BWIPP `REFERENCE_SYMBOLS` rows covering every code-set branch and `UNENCODABLE` rows for
  the ASCII gate. Reverting `widthsTable[106]` must fail the suite.
- **AC6 — Devices stop serving the short symbol.** `cacheVersion` is bumped past `watch-barcode-v3`,
  so a card already cached under v3 re-renders instead of returning the two-modules-short image.

## Tasks / Subtasks

- [x] **Task 1 — Correct index 106 and trim the table** (AC: 1, 2)
  - [x] `"233111"` → `"2331112"`; delete indices 107-109; update the trailing comment, which says
        "codes 0..106" while the array holds 110
- [x] **Task 2 — Prove no other symbol changed** (AC: 3, 4)
  - [x] Re-run the lifted encoder over the full candidate set; assert each output equals the pre-fix
        output with `2` appended
- [x] **Task 3 — Add Code 128 to the executed-Swift contract test** (AC: 5)
  - [x] `encodeCode128` into `HARNESS_DECLARATIONS`, a `CODE128` case into the harness driver
  - [x] BWIPP `REFERENCE_SYMBOLS` rows; `UNENCODABLE` rows for non-ASCII input
  - [x] Mutation-test: restoring `"233111"` must turn the suite red
- [x] **Task 4 — Bump `cacheVersion`** (AC: 6)
- [x] **Task 5 — Compile the watch target** (`yarn watch:build`)

## Dev Notes

### Files to touch

**`targets/watch/BarcodeGenerator.swift`** — one string in `widthsTable`, three deleted entries, the
table's own comment, and `cacheVersion`.

- **What must survive:** every other `widthsTable` entry, the code-set selection heuristics
  (`digitRunLength`, the Start B/C decision, the `99`/`100` switches), the checksum, and the
  `c < widthsTable.count` guard. Only the stop pattern and the table's length change.
- `encodeEAN13`, `encodeEAN8`, `encodeUPCA` and `encodeCode39` are not touched — they have their own
  tables and are unaffected.

**`targets/watch/__tests__/watch-barcode-symbology-contract.test.ts`** — the harness already lifts
pure declarations out of the Swift source and runs them under `xcrun --sdk macosx swift`.
`encodeCode128` is fully self-contained (its only helper, `digitRunLength`, is nested inside it), so
it needs its signature in `HARNESS_DECLARATIONS` and a `case .CODE128` in the driver — no new
dependency declarations.

**`watch-ios/Tests/BarcodeGeneratorTests.swift`** — XCTests, for local Xcode runs.

### Choosing reference vectors — read before adding one

**Code 128 permits several valid encodings of the same text**, because the code-set switches are an
optimisation, not a requirement. BWIPP optimises; this hand-rolled encoder uses simpler heuristics.
They usually agree, but not always — so a candidate vector must be **checked**, never assumed:

| Value            | Agrees with BWIPP after the fix?       |
| ---------------- | -------------------------------------- |
| `A12345`         | ❌ — Swift uses 9 code words, BWIPP 8  |
| `CARD 12345 ABC` | ❌ — same count, different set choices |

Both of those still **decode to the correct text**. They are less compact, not wrong (see Out of
scope). Vectors were chosen only from values where the two agree exactly, so a future failure means a
real regression rather than a rediscovery of this.

### Guardrails

- **Do not "fix" the divergent values by changing the code-set heuristics.** That alters symbols that
  work today, on a native non-OTA path, for a compactness gain — out of scope, and its own story.
- **Do not add the missing element in `renderCGImage` or anywhere downstream.** The table is where the
  symbology is defined; patching the geometry layer would leave `encodeCode128` still wrong and
  untestable.
- **Do not extend the ASCII gate.** BWIPP encodes `CAFÉ` via a latin-1 path; this encoder refuses it,
  and refusing falls back to the readable card number — the deliberate contract from 16.28.
- Watch is read-only for card data (ADR-2026-06-09-001).
- Native → **not OTA-eligible**.

### Testing

- Swift XCTests in `watch-ios/Tests/` **do not run in CI** — no target references them. The
  CI-enforced layer is the TS contract test, which since 16.28 both inspects _and executes_ the Swift.
- **Mutation-test the assertion.** A reference table that nothing executes is decoration; this defect
  survived precisely because `REFERENCE_SYMBOLS` covered EAN-8, UPC-A and Code 39 but not Code 128.
- Compile: `yarn watch:build`.

### Previous story intelligence

- **16.28** built the executed-Swift harness and the refuse-don't-substitute contract. It added
  reference symbols for the three formats it introduced; **Code 128 was pre-existing and so was never
  given any**, which is the coverage hole this story closes.
- **16.34** extended the same harness to `encodeEAN13`, and explicitly checked `encodeCode128` for the
  force-unwrap defect — finding it clean. It did not check the width table.

### Sequencing

**16.27 (`fix/16-27-watch-barcode-geometry`) has not started.** Re-verified 2026-09-04 after rebasing
onto `13b39a3`: both `fix/16-27-watch-barcode-geometry` and `claude/bmad-dev-story-ds-16-27-ae3dfc`
are **0 commits ahead of `main`** and carry no PR; the story is still `ready-for-dev`. So this story
branches from `main` directly — nothing to rebase onto.

The two remain **not parallel-safe**: both edit `BarcodeGenerator.swift` and both bump `cacheVersion`.
The code overlap is nil — 16.27 changes `renderCGImage` and `quietZone(for:)`, this changes
`encodeCode128` — so whichever lands second takes a trivial rebase, resolving `cacheVersion` to a
single bump. **16.27 should also inherit the corrected 123-module width** when it computes Code 128
symbol widths: its story note says "a 13-digit Code128 is ≈123 modules", which is right, but the
shipped encoder produces 121, so a naive `modules.count`-driven layout would have been 2 units short.

### Out of scope — flag, don't fix

- **Non-minimal code-set switching.** `A12345` costs one code word more than it needs; `CARD 12345 ABC`
  makes different set choices at the same length. Both decode correctly, so this is symbol width, not
  correctness. Fixing it would change working symbols on a native path — its own story, if wrist space
  ever proves tight (which is 16.27's question, not this one).
- **`encodeCode128("")` returns a valid empty-payload symbol** rather than `nil`. BWIPP does the same,
  so this is not a deviation, and an empty card number cannot reach it — `CardForm.tsx:42` requires
  `.min(1)`. Worth a guard if the empty case ever becomes reachable.
- **The other five encoders' tables.** EAN/UPC and Code 39 are already covered by both static table
  assertions and executed reference symbols; they were re-checked here and are correct.

## Dev Agent Record

### Agent Model Used

claude-opus-5 (Claude Code)

### Debug Log References

**The defect was executed, not read.** `encodeCode128` is self-contained, so it was lifted verbatim
from the shipped source, compiled standalone and run under `xcrun --sdk macosx swift` (Swift 6.3.3)
over 20 values, before and after the change:

| value           | before            | after             | BWIPP             |
| --------------- | ----------------- | ----------------- | ----------------- |
| `5901234123457` | 66 els / 121 mods | 67 els / 123 mods | 67 els / 123 mods |
| `12345678`      | 42 / 79 − 2       | 43 / 79           | 43 / 79           |
| `ABC-123`       | 60 / 110          | 61 / 112          | 61 / 112          |

Every pre-fix array ended `2,3,3,1,1,1`; every post-fix array ends `2,3,3,1,1,1,2`.

**AC3 held for 20 of 20.** Each fixed output equals the pre-fix output with `2` appended — nothing
else moved. **AC4 held for 18 of 20** against BWIPP; the two exceptions are the documented code-set
divergences, not regressions.

**Both encodings were decoded back, which is what separates "wrong" from "differently valid."**
Comparing two encoders byte-for-byte cannot tell those apart, because Code 128 permits several code-set
paths to the same text. A decoder built from BWIPP's own 107-entry `encs` table was run over both:
with the fix, all 20 shipped-Swift symbols round-trip to their exact input with a valid modulo-103
check; without it, decoding fails **at the stop pattern**. `A12345` and `CARD 12345 ABC` decode
correctly under both encoders — so they are less compact, not wrong.

**Mutation-tested three ways.** Each mutation was applied to the shipped source and the suite re-run:

| mutation                                      | result                                                       |
| --------------------------------------------- | ------------------------------------------------------------ |
| `widthsTable[106]` back to `"233111"`         | **2 red** — the table assertion and the executed-Swift check |
| correct stop, three dead entries restored     | **1 red** — the 107-entry assertion (AC2's guard)            |
| `cacheVersion` reverted to `watch-barcode-v3` | **1 red** — the cache-version test                           |

The third mutation only fails because that test was extended: it asserted `not.toBe('watch-barcode-v2')`,
so reverting this story's bump would have passed. It now checks a **list** of superseded versions, with
a note to append rather than replace.

**Build:** `yarn watch:build` → `** BUILD SUCCEEDED **`, zero errors. The worktree had never been
prebuilt, so `yarn watch:prebuild` ran first; it modified no tracked file.

### Completion Notes

**One string, three dead entries, one cache version.** `widthsTable[106]` `"233111"` → `"2331112"`;
indices 107-109 removed; the table comment rewritten to state the 107-entry invariant and why it
matters; `cacheVersion` `v3` → `v4`. No encoder logic changed — the code-set heuristics, the
checksum and the `c < widthsTable.count` guard are untouched.

**The coverage hole is closed at its cause.** `encodeCode128` now sits in `HARNESS_DECLARATIONS` with
a `case .CODE128` in the harness driver, 12 BWIPP `REFERENCE_SYMBOLS` rows and 3 `UNENCODABLE` rows.
The 12 were chosen to span the encoder's branches — Start C, pure C, Start B, the mid-symbol B→C
switch, the full C→B→C round trip, the ASCII 32/126 boundaries, all-zero data, leading zeros — not
merely to be valid. Each carries a one-line note saying which branch it drives, so a later "simplify
the test data" pass can see what it would remove.

**A static assertion was added alongside the executed one**, because execution cannot see dead data: a
110-entry table with a correct index 106 encodes identically. It pins the length at 107, the three
start codes and the stop **by index**, and asserts every other code word is six elements over 11
modules while the stop is seven over 13.

**Swift XCTests added** (`watch-ios/Tests/`, not CI-wired) mirroring the same three properties.

**Why this survived 16.28 and 16.34.** 16.28 built the executed harness and gave reference symbols to
the three formats it _introduced_; Code 128 was pre-existing and got none. 16.34 extended the harness
to `encodeEAN13` and explicitly checked `encodeCode128` — but for the _force-unwrap_ defect, which it
does not have. Nothing had ever compared its output to a reference.

**Flagged, not fixed:** the non-minimal code-set switching (both divergent values decode correctly, so
this is symbol width, not correctness, and changing it would alter working symbols on a native path);
`encodeCode128("")` returning a valid empty-payload symbol, which BWIPP also does and which
`CardForm.tsx:42`'s `.min(1)` makes unreachable.

**Not verified on hardware.** No POS lane was tested. The claim proven here is that the symbol was
malformed and now matches BWIPP; that a scanner _therefore_ rejected it remains the plausible
mechanism the story states, not a measurement.
