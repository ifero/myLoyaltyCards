---
baseline_commit: 011dadfb378e749b85a598dce6f705b04ac799bd
---

# Story 16.28: Render EAN-8, UPC-A and Code39 with their real symbologies on Apple Watch

Status: ready-for-dev

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
> **⚠️ SCOPE DEPENDS ON STORY 16.25 — CHECK BEFORE SIZING.** See [Interaction with 16.25](#interaction-with-story-1625--check-this-before-sizing).
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

Story **16.25** ("map UPC-E instead of storing it as Code 128") is drafted concurrently on
`docs/16-25-map-upce-story` (commit `8b10f4f`, pushed to origin) and is **the phone-side sibling of this
defect**:

- **16.25** — a UPC-E scan is **stored** with `barcodeFormat: CODE128`, because `BARCODE_FORMAT_MAP` has
  no `upc_e` key and `mapFormat` falls through to `?? 'CODE128'`.
- **This story** — formats already **stored correctly** are **rendered** as Code128 on the watch.

Complementary, not duplicates. **But which option 16.25 lands changes this story's scope:**

| 16.25 option                                                   | Impact here                              |
| -------------------------------------------------------------- | ---------------------------------------- |
| **(a)** add `UPCE` to `barcodeFormatSchema`                    | ⚠️ **a fourth encoder is required here** |
| **(b)** expand UPC-E → 12-digit UPC-A _(their recommendation)_ | nothing extra needed                     |
| **(c)** stop requesting `UPC_A` _(rejected there)_             | n/a                                      |

**Confirm which option landed before sizing this story.**

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

- [ ] **Task 0 — Confirm 16.25's landed option** (AC: 6) — determines whether a UPC-E encoder is in scope
- [ ] **Task 1 — EAN-8 encoder** (AC: 1, 2)
  - [ ] 8-digit parity/check-digit tables; `nil` on checksum mismatch
- [ ] **Task 2 — UPC-A encoder** (AC: 1, 2)
  - [ ] 12-digit module structure — **not** `"0" + encodeEAN13`
- [ ] **Task 3 — Code39 encoder** (AC: 1, 2)
  - [ ] `*` delimiters, 9-element characters; decide on mod-43 and document it
- [ ] **Task 4 — Remove the substitution** (AC: 3)
  - [ ] Delete the `case .EAN8, .UPCA, .CODE39: encodeCode128` arm; verify `nil` reaches the placeholder
- [ ] **Task 5 — Reference-vector tests** (AC: 4)
- [ ] **Task 6 — Quiet zones + geometry** (AC: 7)
  - [ ] Per-symbology quiet zones (Code39 needs 10 modules each side); confirm 16.27's predicate handles the wider symbols
- [ ] **Task 7 — Real-scanner validation, one card per format** (AC: 5)

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

### Debug Log References

### Completion Notes List

### File List

### Change Log
