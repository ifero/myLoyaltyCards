# Story 16.25: Map UPC-E so a UPC-E barcode is not stored as Code 128

Status: ready-for-dev

Epic: 16 — Platform & Tech Debt

> **Not urgent, and not blocking anything.** This is a latent data-correctness defect found while
> implementing Story 16.23, deliberately scoped out of it. Nothing is on fire.
>
> **Check Sentry before sizing this.** Story 16.23 shipped the telemetry that measures how often this
> actually happens — query `unmappedFormat: 'UPC_E'`. If the answer is "never", option (b) below is a
> ten-line change; if it is "often", it justifies the wider option (a). **Do not skip this step**: the
> frequency was unknown when the story was written, and it is knowable now.
>
> **There is an open decision for ifero — see [Decision required](#decision-required-pick-the-approach-before-writing-code).**
> Do not start coding until it is made. Option (b) is recommended and needs no protocol change; option
> (a) is a cross-platform sync-contract change touching seven files plus two native apps.

## Story

As a user adding a loyalty card whose barcode is UPC-E,
I want the card stored with its real format,
so that it renders and scans correctly instead of being silently relabelled as Code 128.

## Context

### The defect

A UPC-E barcode detected by **scan-from-image** is stored with `barcodeFormat: 'CODE128'`. The card is
then re-rendered as Code 128 for the rest of its life. No error, no warning to the user.

This is **reachable in production, not hypothetical** — the chain was traced in source, not inferred:

1. `features/add-card/hooks/useImageScan.ts` always requests `UPC_A` as part of
   `SUPPORTED_IMAGE_SCAN_FORMATS`.
2. The iOS decoder maps a requested `"UPC_A"` to **two** Vision symbologies:
   `symbologies.append(contentsOf: [.ean13, .upce])`
   (`node_modules/react-native-image-code-scanner/ios/ImageCodeScanner.swift:273`). So `.upce` is
   registered with Vision whenever `UPC_A` is requested — which is always.
3. When Vision detects `.upce`, the same file reports the format back to JS as the string `"UPC_E"`
   (`:361`).
4. `BARCODE_FORMAT_MAP` in `useImageScan.ts` has **no `upc_e` key**, so `mapFormat` falls through to
   `?? 'CODE128'`.
5. `normalizeBarcode` does not rescue it: its three rules cover UPC-A→EAN-13 (12-digit), UPC-A→EAN-13
   (13-digit relabel), and CODE128-carrying-valid-EAN-13. A UPC-E payload is **8 digits**, so none apply.

⚠️ Line numbers above are for the **patched** `ImageCodeScanner.swift` (Story 16.23 adds ~50 lines via
`patches/react-native-image-code-scanner+1.1.3.patch`). Grep for the symbol, not the line.

### What Story 16.23 already did — do NOT redo it

The fallback is now **observable**. `mapFormat` emits
`logger.notify('Barcode format fell back to CODE128')` with `context: [{ unmappedFormat }]`, so a UPC-E
detection shows up in Sentry as `unmappedFormat: 'UPC_E'`. 16.23 deliberately shipped only the telemetry
and scoped the fix out, because the fix is a schema question and the report that triggered 16.23 was
about a format we already support.

The camera path has the same gap (`mapBarcodeFormat` in `features/cards/hooks/useBarcodeScanner.ts`),
also already instrumented. Note `expo-camera`'s `barcodeTypes` lists do **not** include `upc_e`, so the
camera is less exposed — but `expo-camera` may still report a UPC-E detection when `upc_a` is requested,
which is worth confirming on device rather than assuming.

### Why this was out of scope for 16.23

Adding `UPCE` to `barcodeFormatSchema` (`core/schemas/card.ts`) is a **cross-platform sync-contract
change**, not a local edit. watchOS (Swift) and Wear OS (Kotlin) serialise the same string values, so a
new member is a protocol change. Per 16.23's Defect 2 analysis, it would have to move in **one** change:

| File                                              | What changes                                          |
| ------------------------------------------------- | ----------------------------------------------------- |
| `core/schemas/card.ts`                            | `barcodeFormatSchema` gains `UPCE`                    |
| `features/cards/components/BarcodeRenderer.tsx`   | `BWIPJS_FORMAT_MAP` gains a verified `bcid`           |
| `features/cards/components/FormatPicker.tsx`      | `formatLabels` + `FORMAT_OPTIONS`                     |
| `features/add-card/components/ScannerOverlay.tsx` | `barcodeTypes`                                        |
| `features/cards/components/BarcodeScanner.tsx`    | `barcodeTypes`                                        |
| `features/add-card/hooks/useImageScan.ts`         | `SUPPORTED_IMAGE_SCAN_FORMATS` + `BARCODE_FORMAT_MAP` |
| `shared/i18n/locales/en.ts` + `it.ts`             | `addCard.multiCode.formats.UPCE`                      |

Two of these are **compile-enforced**, which is a genuine safety net: `BWIPJS_FORMAT_MAP` is
`Record<BarcodeFormat, string>` and `FormatPicker`'s `formatLabels` is `Record<BarcodeFormat, string>`,
so adding a schema member is a **type error** until both are updated. The locale files are **not**
enforced (no i18next module augmentation — see 16.23's correction on this), so those are manual.

## Decision required: pick the approach before writing code

### ✅ (b) Normalise UPC-E → EAN-13 — RECOMMENDED, evaluate first

Expand the 8-digit UPC-E to its 12-digit UPC-A form, then let the **existing** `normalizeBarcode` Rule 1
carry it to EAN-13. **No schema change. No protocol change. No native app work. No new locale keys.**

Why this fits this codebase:

- **It is the precedent already set.** `normalizeBarcode` Rule 1 exists to do exactly this for UPC-A:
  _"A UPC-A barcode is structurally identical to an EAN-13 barcode whose first digit is 0 … prepending
  `0` and labelling it as EAN-13 is always safe and reversible."_ UPC-E is a **compressed UPC-A**, so
  UPC-E → UPC-A → EAN-13 is the same argument applied one step earlier.
- **It is lossless.** UPC-E zero-suppression is a defined, reversible GS1 encoding — the 8-digit form
  carries exactly the information of its 12-digit UPC-A parent.
- **It shrinks rather than grows the format surface**, which every other consumer benefits from.

Cost: one well-tested pure function (the expansion has six defined cases keyed on the last digit of the
6-digit body) plus a `upc_e: 'EAN13'`-style entry or a pre-normalisation step. Add `upc_e` to
`BARCODE_FORMAT_MAP` only if you route through the format map; otherwise handle it in `normalizeBarcode`
so **both** scanner hooks get it for free.

### (a) Add `UPCE` as a full schema member

Truthful to the source symbology, and the right answer if UPC-E cards turn out to be common enough that
users care about seeing "UPC-E" in the format picker. Cost: the seven-file table above, plus watchOS and
Wear OS.

✅ **`bwip-js` support is verified, not assumed.** `toSVG({ bcid: 'upce', text: '04252614' })` and
`text: '01234565'` both render successfully against the installed `@bwip-js/react-native`. So this option
would not hit the `invalidA11y` fallback (`BarcodeRenderer.tsx:164`, shown when the render errors).

### ❌ (c) Stop requesting `UPC_A` — rejected

It would stop `.upce` being registered, but also break genuine UPC-A scanning, which real cards use.
Not viable.

## Acceptance Criteria

1. **The decision above is recorded in this story before implementation starts**, with the Sentry
   `unmappedFormat: 'UPC_E'` frequency noted as evidence.
2. **A UPC-E detection is no longer stored as `CODE128`.** Whichever option is chosen, scanning a UPC-E
   barcode from an image produces a card whose stored value and format render and re-scan correctly.
3. **The chosen path is unit-tested at the seam that failed.** For option (b): the expansion function
   covers all six UPC-E zero-suppression cases plus an invalid input; `useImageScan.test.ts` asserts a
   `UPC_E` decoder result resolves to the expected value and format. For option (a): the schema, both
   format maps, both `barcodeTypes` lists and both locale files are updated together, with a test
   asserting `BWIPJS_FORMAT_MAP` renders the new member without error.
4. **The 16.23 telemetry stops firing for `UPC_E`.** `mapFormat` must no longer reach its
   `'Barcode format fell back to CODE128'` branch for a `UPC_E` label — assert this in a test, since it
   is the observable proof the gap is closed.
5. **No regression to existing formats.** `normalizeBarcode` / `applyExpectedFormat` semantics for
   UPC-A, EAN-13, CODE128-carrying-EAN-13 and the Conad leading-zero case are unchanged; their existing
   tests still pass untouched.
6. **Round-trip verified on a real device.** Render a UPC-E card in the app and scan it back with a
   second device or a physical scanner. Bars that a decoder rejects are invisible to a unit test — this
   is the Story 16.15 / 16.23 lesson, and it is the only evidence that matters for a rendering change.
7. **Regression-safe.** `yarn lint`, `typecheck`, `test`, `tokens:check`, `format:check`,
   `check:native-patches` and `check:native-strings` all pass.

## Tasks / Subtasks

- [ ] **Task 1 — Size it from real data (AC: 1)**
  - [ ] Query Sentry for `unmappedFormat: 'UPC_E'` on the `Barcode format fell back to CODE128` issue
  - [ ] Confirm on a device whether `expo-camera` also reports `UPC_E` when only `upc_a` is requested
  - [ ] Record the decision (a or b) and the evidence in this story before writing code
- [ ] **Task 2 — Implement the chosen option (AC: 2, 3)**
  - [ ] Option (b): a pure UPC-E → UPC-A expansion in `core/utils/`, wired so **both** scanner hooks
        benefit — prefer `normalizeBarcode` over a per-hook map entry
  - [ ] Option (a): all seven files in the table, in one change; do not land a partial schema
- [ ] **Task 3 — Prove the gap is closed (AC: 4)**
  - [ ] Assert `mapFormat` no longer falls back for `UPC_E`
- [ ] **Task 4 — Non-regression (AC: 5, 7)**
  - [ ] Existing `normalizeBarcode` tests untouched and passing; run the full gate set
- [ ] **Task 5 — Device round-trip (AC: 6)**
  - [ ] Render a UPC-E card and scan it back; record device, iOS/Android version and build type

## Dev Notes

### Files to touch — current state and what must survive

| File                                        | Change            | What must be preserved                                                                                                                                                    |
| ------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `core/utils/normalizeBarcode.ts`            | UPDATE (option b) | All three existing rules are documented as **idempotent** and called from three surfaces plus `selectCode`. Their tests encode the Conad regression — add, never rewrite. |
| `features/add-card/hooks/useImageScan.ts`   | UPDATE            | `mapFormat` now takes a per-scan `reportedFormats` Set (Story 16.23) — keep the dedupe. Do not disturb the cancel / single / multi-code-capped-at-6 paths.                |
| `features/cards/hooks/useBarcodeScanner.ts` | UPDATE            | `mapBarcodeFormat` takes a per-instance Set. `handleBarcodeScanned` guards re-entry via `hasScanned` + a 2 s reset and fires haptics **before** `onScan`.                 |
| `core/schemas/card.ts`                      | Option (a) ONLY   | Cross-platform contract. If option (b) is chosen, **do not touch this file at all.**                                                                                      |

### watchOS: correcting a stale claim in story 10-4

Story 10-4's notes state that `EAN8`, `CODE39` and `UPCA` _"fall through leaving `modules` nil and
generateImage returns nil"_, so an EAN-8 card shows nothing on Apple Watch. **That is no longer true of
the current code.** `targets/watch/BarcodeGenerator.swift:57-59` reads:

```swift
case .EAN8, .UPCA, .CODE39:
  // pragmatic fallback: render as Code128 so scanners can still read it
  modules = encodeCode128(value: value)
```

So those three formats **do** render on the watch, as Code 128 bars carrying the same digits — readable
by a scanner, just not the declared symbology. Two consequences for this story:

- Option (a) would inherit that same fallback for `UPCE` unless watchOS is also updated. Acceptable, but
  it should be a conscious choice rather than a surprise.
- **Option (b) sidesteps it entirely**, since an EAN-13 value renders natively on the watch.

Worth correcting 10-4's note separately so the next reader is not misled.

### Guardrails

- **Never `console.*`** — use `core/utils/logger.ts`. `info`/`warn` are `__DEV__`-only no-ops; only
  `notify` and `error` reach production. `notify`'s message and every tag **value** must be a string
  literal (compile-enforced), and tag values are **not** scrubbed.
- **A barcode number is PII.** It must never reach Sentry as a message, tag or context value. Note the
  scrubber matches by **key name**, and its pattern includes `barcode` — so a context key containing
  that word is redacted to `[Redacted]`, losing the signal. Story 16.23 named its key `unmappedFormat`
  for exactly this reason.
- **Do not widen the symbology set as a side effect.** If option (b) is chosen, the six supported formats
  stay six.
- **Layer boundaries** (ESLint-enforced): `core/` must not import React or from `features/`.
  `add-card → cards` is a sanctioned exception; the reverse is not.

### Testing

- Co-locate tests beside the subject; `__tests__/` folders are banned (CI-enforced), and `app/` holds no
  tests. Coverage gate is **80 % global** over `features/**`, `core/**`, `shared/**`.
- `useImageScan.test.ts` already mocks `expo-image-picker` and `react-native-image-code-scanner`
  (including the `BarcodeFormat` enum) and stubs `logger.notify` while keeping `normalizeBarcode` real —
  reuse that shape. It already contains a `UPC_E` fallback test from Story 16.23; **that test asserts the
  current wrong behaviour and must be updated, not deleted.**
- ⚠️ **A green suite does not prove a rendering change works.** Jest never runs bwip-js against a real
  scanner. AC6's device round-trip is the only evidence that counts.

### Previous story intelligence

- **Story 16.23** — the direct parent; found this defect and shipped its telemetry. Read its Dev Agent
  Record: it documents the `logger.notify` tag conventions, the PII key-name trap, and three factual
  corrections worth knowing (a fabricated native error string, a false claim that a
  `Record<BarcodeFormat, …>` forces locale parity, and a mid-implementation baseline test count). Its
  lesson for this story: **verify claims against source before writing them into a spec.**
- **Story 16.24** — landed immediately before this one; enabled `eslint-plugin-react-hooks` and left a
  small backlog of pre-existing `exhaustive-deps` warnings in `app/_layout.tsx`,
  `features/auth/CreateAccountScreen.tsx` and `features/cards/components/BarcodeScanner.tsx`. Do not
  "fix" those here — 16.24 owns them. Note `BarcodeScanner.tsx` is on that list **and** in option (a)'s
  file table, so an option-(a) implementation should expect to touch a file with a known open warning.
- **Story 2.9** — introduced `normalizeBarcode` for the Conad "EAN-13 reported as 12-digit UPC-A" bug,
  and is the precedent option (b) builds on. It also removed `defaultFormat` from 11 brands where
  CODE-128 had been guessed wrongly: the standing lesson is **don't guess a brand's format**.

### Project structure notes

- Story files live in `docs/sprint-artifacts/stories/` (not flat) — required by
  `scripts/lib/story-refs.mjs` and `.github/workflows/mark-story-done.yml`.
- Branch prefix is **`feature/`**, not `feat/`.
- ⚠️ Any bare `N.M` in a PR body or title marks that story done on merge. A `chore:`-titled PR is exempt
  from the spec-first story requirement.

### References

- `node_modules/react-native-image-code-scanner/ios/ImageCodeScanner.swift:273,361` — the `UPC_A` →
  `[.ean13, .upce]` registration and the `"UPC_E"` report (line numbers are for the **patched** file)
- `features/add-card/hooks/useImageScan.ts` — `BARCODE_FORMAT_MAP`, `mapFormat`
- `features/cards/hooks/useBarcodeScanner.ts` — `mapBarcodeFormat`
- `core/utils/normalizeBarcode.ts` — the three existing rules, Rule 1 being the precedent
- `core/schemas/card.ts` — `barcodeFormatSchema`, the cross-platform contract
- `targets/watch/BarcodeGenerator.swift:57-59` — the Code 128 fallback that corrects 10-4's note
- `docs/sprint-artifacts/stories/16-23-fix-silent-barcode-scan-failures.md` — parent story, Defect 2 and
  Defect 3

### Out of scope — flag, don't fix

- The pre-existing `exhaustive-deps` warnings (Story 16.24 owns them).
- Any other unmapped decoder format. `CODE_93`, `ITF`, `CODABAR`, `PDF_417`, `DATA_MATRIX` and `AZTEC`
  are never requested, so they cannot be returned. Only `UPC_E` is reachable-but-unmapped.
- Widening the symbology set generally — that needs its own story and a real user need.

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

### Change Log
