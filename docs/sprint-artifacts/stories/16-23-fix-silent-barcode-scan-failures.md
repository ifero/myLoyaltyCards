---
baseline_commit: 93f1770f9a1a8c33fe7fb00bf95389b07aed66c9
---

# Story 16.23: Fix silent barcode-scan failures — reported as "PENNY Card EAN-13 not recognised by the library"

Status: ready-for-dev

Epic: 16 — Platform & Tech Debt

> **Run all gates from the main checkout, never a `.claude` worktree.** `jest.config.js` sets
> `modulePathIgnorePatterns: ['/.claude/']` and `testPathIgnorePatterns: [… '/.claude/' …]`, so
> `yarn test` inside a worktree finds **zero tests** and passes vacuously.
>
> **This CAN ship as an OTA update.** JS/TS + JSON + locale changes only — no native module, no
> `app.json` change, no config plugin. `runtimeVersion: { policy: 'appVersion' }` is not a blocker
> here (unlike Story 16.17). ⚠️ But AC1's **reproduction** still needs a real device with a real
> native decoder — an OTA-able fix is not a simulator-verifiable one.
>
> **The scope decisions recorded below are binding, not questions.** The symbology set stays at 6;
> implement as written and do not pause to re-open it.

## Story

As a user adding a loyalty card by scanning a photo or screenshot of it,
I want the app to tell me **why** the scan failed rather than always saying the image contains no barcode,
so that a scan failure is a recoverable, diagnosable event — and so that we can actually diagnose the next report from the field.

## Context

### The report

ifero reported (2026-07-29) that the barcode on an Italian **Penny Market** loyalty card "is not recognised
by the library", supplying a card image. The printed payload is `2095110257978` (card face also prints
`Codice PENNYCard 2095110257978`), rendered in the 1 + 6 + 6 human-readable grouping characteristic of
EAN-13.

✅ **Failing surface confirmed by ifero (2026-07-29): "scan from image / screenshot".** That path uses
`react-native-image-code-scanner` (iOS Vision / Android ML Kit) via
`features/add-card/hooks/useImageScan.ts` — **not** `expo-camera`. The two camera surfaces are in scope
only as a **control** (see [Surface map](#surface-map)).

⚠️ **AC1 still gates everything else on reproducing the failure on a device first.** Do not start
writing fixes from the hypotheses below — reproduce, capture what the decoder actually returned or
threw, then fix what the reproduction shows.

### What was already ruled out (verified, not assumed)

Every one of these was executed against this repo at `7837f35`. The baseline has since moved to
`93f1770`, which is **docs-only** (Story 16.22 + the six Epic 10 story files) — no source file
changed, so every result below still holds. **Do not re-litigate them; do not "fix" them.**

| Hypothesis                                    | Verdict          | Evidence                                                                                                                                                                                                                                                            |
| --------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The payload is not a valid EAN-13             | ❌ **Ruled out** | Weighted sum of the first 12 digits = 92 → check digit `(10 − 92 mod 10) mod 10` = **8**, matches. Satisfies `isValidEAN13Checksum` (`core/utils/normalizeBarcode.ts:41-54`).                                                                                       |
| `bwip-js` cannot render it                    | ❌ **Ruled out** | `toSVG({bcid:'ean13', text:'2095110257978'})` succeeds; the same call with a corrupted check digit (`…79`) throws `bwipp.ean13badCheckDigit#6875`. So the renderer is exercising real EAN-13 validation and this value passes.                                      |
| `inferBarcodeFormat` mislabels it             | ❌ **Ruled out** | 13-digit numeric branch → `'EAN13'` (`core/utils/inferBarcodeFormat.ts:47-51`).                                                                                                                                                                                     |
| A scanner doesn't request EAN-13              | ❌ **Ruled out** | All three surfaces request it — see [Surface map](#surface-map).                                                                                                                                                                                                    |
| The `2` GS1 prefix is special-cased somewhere | ❌ **Ruled out** | `20–29` is the GS1 "restricted circulation / in-store" band — exactly what a loyalty card uses. Grep of `core/`, `features/`, `shared/` finds no prefix logic; the only prefix check is `isLikelyUPCA` in the **library's** iOS code, which requires a leading `0`. |
| The leading-zero bug from Story 2.9 recurring | ❌ **Ruled out** | That bug (iOS Vision reporting Italian Conad EAN-13 as 12-digit UPC-A) only fires on a leading `0`. This payload leads with `2`, so `isLikelyUPCA` returns false and no digit can be stripped.                                                                      |

**Reproduce the renderer check:**

```bash
cd /Users/ifero/Developer/myLoyaltyCards && node --input-type=module -e "import {toSVG} from '@bwip-js/react-native'; console.log((await toSVG({bcid:'ean13',text:'2095110257978',scale:3,height:12,includetext:false})).length)"
```

**Conclusion: nothing in this repo rejects `2095110257978`.** The failure is in the decode step — and
the app currently **cannot tell us which decode step, or why**. That undiagnosability is the primary
defect this story fixes.

### Surface map

| Surface                                                     | Entry point                                               | Decoder                                                               | Formats requested                                                            |
| ----------------------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **Scan from image / screenshot** ⬅ **the reported failure** | `features/add-card/hooks/useImageScan.ts:106-157`         | `react-native-image-code-scanner@1.1.3` (iOS Vision / Android ML Kit) | `CODE_128, EAN_13, EAN_8, QR_CODE, CODE_39, UPC_A` (`useImageScan.ts:40-47`) |
| Add-card camera _(control only)_                            | `features/add-card/components/ScannerOverlay.tsx:316-318` | `expo-camera` `CameraView` (AVFoundation / ML Kit)                    | `code128, ean13, ean8, qr, code39, upc_a`                                    |
| Edit/rescan camera _(control only)_                         | `features/cards/components/BarcodeScanner.tsx:206-208`    | `expo-camera` `CameraView`                                            | `code128, ean13, ean8, qr, code39, upc_a`                                    |

The camera surfaces matter to the diagnosis: if the **physical card** scans fine through the camera
while the **image** of it fails, the defect is in the image pipeline (decode, downscale, or file
handling), not in EAN-13 support. That comparison is Task 1's job.

### Defect 1 — a failed image scan is undiagnosable (primary)

`features/add-card/hooks/useImageScan.ts:126-156` collapses **three different outcomes** into one
user-facing message and emits **zero** telemetry:

```ts
if (scanned.length === 0) {
  setShowError(true);        // decoder ran, found nothing
}
…
} catch {                    // ← native module threw: reason discarded entirely
  setShowError(true);
}
```

Both paths render `addCard.noCodeFound.message` = **"No barcode found in this image"**
(`shared/i18n/locales/en.ts:529-536`). So a permissions failure, an unreadable/HEIC path, an OOM in
the native downscaler, and a genuine no-detection all look identical — to the user _and_ to us.

This is exactly the gap Story **16.14** closed for OTA updates: `logger.warn` is `__DEV__`-only and a
**no-op in production** (`core/utils/logger.ts`), so field failures leave no trace. Here it is worse —
there is no `logger` call at all. **We cannot diagnose ifero's report today, and we could not diagnose
the next one either.**

### Defect 2 — symbology coverage is narrower than the UI implies (bounded: NOT widening)

The app requests **6** of the **14** formats `react-native-image-code-scanner` exposes
(`BarcodeFormat` enum in its `src/index.tsx`). Never requested: `CODE_93`, `UPC_E`, `ITF`, `CODABAR`,
`PDF_417`, `DATA_MATRIX`, `AZTEC`. `expo-camera`'s list is the same 6.

**Decision (ifero, 2026-07-29): keep the 6. Do NOT widen in this story.** The reasoning, recorded here
so it does not get re-opened: `barcodeFormatSchema` (`core/schemas/card.ts:16-23`) is a **cross-platform
sync contract** — watchOS (Swift) and Wear OS (Kotlin) serialise the same string values — so adding a
member is a protocol change, not a local edit. It would also have to move
`BWIPJS_FORMAT_MAP` (`features/cards/components/BarcodeRenderer.tsx:53-60`), `FormatPicker` labels, both
`barcodeTypes` lists, `SUPPORTED_IMAGE_SCAN_FORMATS`, and both locale files **in one change**, and each
new member needs a verified `bwip-js` `bcid` or the renderer falls back to the grey `invalidA11y`
placeholder. None of that is justified by a report about a barcode we have **proven is EAN-13** — a
format already fully supported.

One piece of this **is** in scope, because it is a live inconsistency rather than a widening:
`shared/i18n/locales/en.ts:526` and `it.ts:529` ship a `DATAMATRIX: 'Data Matrix'` label that **no
`BarcodeFormat` member corresponds to** — a dead key, and evidence someone previously started down this
path. Remove it (AC5).

If Task 1 proves the card is in an unrequested symbology after all, **stop and re-scope** — that is a
different story, not a silent expansion of this one.

### Defect 3 — unknown formats are silently relabelled `CODE128`

`mapFormat` (`useImageScan.ts:49-52`) and `mapBarcodeFormat` (`useBarcodeScanner.ts:30-32`) both
`?? 'CODE128'`. If a decoder ever returns a format outside `BARCODE_FORMAT_MAP`, the card is **stored
with the wrong `barcodeFormat`** and later re-rendered as Code 128. `normalizeBarcode` Rule 3
(`core/utils/normalizeBarcode.ts:95-99`) rescues the 13-digit-valid-EAN-13 case only; everything else
is silently corrupted. The fallback is a reasonable default, but it must be **observable**.

### Defect 4 — Android downscales 2× harder than iOS, and Android has no telemetry

Inside `react-native-image-code-scanner@1.1.3`:

- **Android** — `scaleBitmapIfNeeded` caps the longest edge at **1024 px** (`ImageCodeScannerModule.kt:28`),
  after an `inSampleSize` decode already capped it at 2048 (`:134-135`).
- **iOS** — `scaleImageIfNeeded(originalImage, maxDimension: 2048)` (`ImageCodeScanner.swift:151`).

A photo where the barcode occupies a small part of the frame can drop below the ~2 px-per-narrow-module
floor on Android while still decoding on iOS. Per project history there is **effectively zero Android
telemetry** (~10 Sentry events/90 d, 100 % iOS), so "no reports from Android" is not evidence of health —
the same trap Story 16-18 documented for the `react-native-screens` crash.

### Defect 5 — `penny-market` carries no `defaultFormat`

`catalogue/italy.json:293-298`:

```json
{
  "id": "penny-market",
  "name": "Penny Market",
  "aliases": ["supermarket", "discount", "grocery"],
  "logo": "penny-market",
  "color": "#CD1414"
}
```

`defaultFormat` is optional (`catalogue/types.ts:23`) and absent here, so `expectedFormat` is
`undefined` on both Penny paths (`features/add-card/screens/BrandScannerScreen.tsx:111,127`) and
`applyExpectedFormat` (`core/utils/normalizeBarcode.ts:117-132`) is a **no-op** for Penny. That safety
net does not cause the reported failure (this payload leads with `2`, not `0`), but Penny is
demonstrably an EAN-13 brand and the hint is missing.

## Acceptance Criteria

1. **Reproduce first, on the image path.** The reported failure is reproduced on a real device (not a
   simulator — the native image decoder needs real hardware) by running the supplied Penny card image
   through **scan-from-image**, and the story records: platform + OS version, the source image's pixel
   dimensions, and whether `ImageCodeScanner.scan` returned an empty array or **threw** (with the verbatim
   error). The camera control is also run — physical card via the add-card camera — and the result
   recorded. If it does **not** reproduce, that is a valid outcome: record the evidence and proceed with
   AC2–AC7, which stand on their own.
2. **Image-scan failures are distinguishable.** `useImageScan` separates "decoder returned zero
   results" from "the native call threw", and the thrown reason is captured rather than discarded. The
   user-facing copy differentiates the two cases in **both** `en.ts` and `it.ts`.
3. **Image-scan failures are visible in production.** Both failure paths emit `logger.notify` with a
   string-**literal** message and low-cardinality literal tags. **The barcode value, the image URI, and
   the file name MUST NEVER be sent to Sentry** — tag values are not redacted by the PII scrubber
   (`core/utils/logger.ts`). Safe fields only: surface, platform, format-requested list, result count,
   error class/name.
4. **Unknown-format fallbacks are observable.** When `mapFormat` / `mapBarcodeFormat` falls through to
   `'CODE128'`, a `logger.notify` records the _unmapped format label_ (a low-cardinality decoder
   constant, not user data). Behaviour is unchanged — `CODE128` remains the fallback.
5. **The symbology set stays at 6, and the dead locale key is gone.** `barcodeFormatSchema`,
   `BWIPJS_FORMAT_MAP`, `FormatPicker`, both `barcodeTypes` lists, and `SUPPORTED_IMAGE_SCAN_FORMATS` are
   **unchanged**. The unbacked `DATAMATRIX` key is removed from `en.ts:526` **and** `it.ts:529`, and a
   grep confirms nothing references `multiCode.formats.DATAMATRIX`. The rationale for not widening is
   recorded in the story (already drafted under [Defect 2](#defect-2--symbology-coverage-is-narrower-than-the-ui-implies-bounded-not-widening)).
6. **`penny-market` declares `defaultFormat: "EAN13"`** in `catalogue/italy.json`, and
   `catalogue/italy.test.ts` still passes.
7. **Regression-safe.** `yarn lint`, `yarn typecheck`, `yarn test`, and `yarn tokens:check` pass from
   the **main checkout** (see [Testing](#testing)). No change to the successful single-code,
   multi-code, or cancel paths of `useImageScan`; no change to `normalizeBarcode` /
   `applyExpectedFormat` semantics (both are documented as idempotent and have callers on three
   surfaces).

## Tasks / Subtasks

- [ ] **Task 1 — Reproduce and classify on the image path (AC: 1)** ⚠️ do this before writing any fix
  - [ ] Obtain the Penny card image from ifero; add it to `test-fixtures/` only if licensing is clear
  - [ ] Device-test **scan-from-image** with that file; temporarily log the raw `ImageCodeScanner.scan`
        return value **and** any thrown error, and record both verbatim
  - [ ] Run the camera control: physical Penny card through the add-card camera. Camera-works +
        image-fails ⇒ image pipeline; both fail ⇒ look at the symbology/card itself
  - [ ] Cross-check the same image with an independent decoder (OS Camera app / Photos live text) to
        separate "our pipeline" from "this image is undecodable"
  - [ ] Record platform, OS version, build type, and the source image's pixel dimensions
- [ ] **Task 2 — Split and surface the image-scan failure modes (AC: 2, 3)**
  - [ ] `useImageScan.ts`: replace bare `catch {}` with `catch (err)`; distinguish no-results from thrown
  - [ ] Add a `logger.notify` at each path — literal message, safe tags only, **no barcode/URI/filename**
  - [ ] Add the differentiated copy to `en.ts` **and** `it.ts` (no parity test exists — check by hand)
  - [ ] Extend `useImageScan.test.ts` with a rejected-`scan` case asserting the notify call and the copy
- [ ] **Task 3 — Make the format fallback observable (AC: 4)**
  - [ ] Add `logger.notify` on the `?? 'CODE128'` branch in `useImageScan.ts` and `useBarcodeScanner.ts`
  - [ ] Assert it fires for an unmapped label and does **not** fire for every mapped label
- [ ] **Task 4 — Remove the dead `DATAMATRIX` locale key (AC: 5)** — the symbology set stays at 6
  - [ ] `grep -rn "DATAMATRIX" --include='*.ts' --include='*.tsx' .` to confirm the key is unreferenced
  - [ ] Delete it from `en.ts:526` and `it.ts:529`; run the i18n-consuming suites
  - [ ] Do **not** touch `barcodeFormatSchema`, `BWIPJS_FORMAT_MAP`, `FormatPicker`,
        `SUPPORTED_IMAGE_SCAN_FORMATS`, or either `barcodeTypes` list
- [ ] **Task 5 — Catalogue hint (AC: 6)**
  - [ ] Add `"defaultFormat": "EAN13"` to `penny-market`; run `catalogue/italy.test.ts`
- [ ] **Task 6 — Android decode-headroom check (AC: 1)**
  - [ ] Compare the same image on Android vs iOS; if Android fails where iOS succeeds, the 1024 px cap is
        confirmed as a contributing factor — record it and file a follow-up (do **not** patch
        `node_modules` in this story)
- [ ] **Task 7 — Gates (AC: 7)**
  - [ ] `yarn lint && yarn typecheck && yarn test && yarn tokens:check` from the main checkout

## Dev Notes

### Files to touch — current state and what must survive

| File                                            | Change              | Current state / what must be preserved                                                                                                                                                                                                                                                                                                                           |
| ----------------------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `features/add-card/hooks/useImageScan.ts`       | UPDATE              | `pickAndScan` (`:106-157`) has 4 outcomes: cancelled/empty-assets → silent return; 0 results → error; 1 result → `onCodeResolved`; 2+ → `multiCodes` capped at **6** (`:141`). `selectCode` (`:91-104`) deliberately re-runs the normalize pipeline (idempotent by design — keep that comment and behaviour). `isProcessing` must still be cleared in `finally`. |
| `features/cards/hooks/useBarcodeScanner.ts`     | UPDATE              | `handleBarcodeScanned` (`:80-110`) guards re-entry via `hasScanned` + a 2 s reset timeout, and fires haptics **before** `onScan`. Touch only the format-mapping fallback.                                                                                                                                                                                        |
| `shared/i18n/locales/en.ts` + `it.ts`           | UPDATE              | `addCard.noCodeFound` block (`en.ts:529-536`) — keep `dismissAccessibilityLabel`, `retryAccessibilityLabel`, `retry`, `manualEntry`, `manualEntryAccessibilityLabel`; `ScannerOverlay` renders those buttons.                                                                                                                                                    |
| `catalogue/italy.json`                          | UPDATE              | `penny-market` at `:293-298`. Schema-validated by `catalogue/types.ts`; `defaultFormat` must be a `barcodeFormatSchema` member.                                                                                                                                                                                                                                  |
| `core/schemas/card.ts`                          | ⛔ **DO NOT TOUCH** | `barcodeFormatSchema` is the **cross-platform** contract — watchOS (Swift) and Wear OS (Kotlin) serialise the same string values. Adding a member is a sync-protocol change. Out of scope by decision.                                                                                                                                                           |
| `features/cards/components/BarcodeRenderer.tsx` | ⛔ **DO NOT TOUCH** | `BWIPJS_FORMAT_MAP` (`:53-60`). Verified working for this payload — a `toSVG`/`toDataURL` round-trip of `2095110257978` as `ean13` succeeds. Not implicated.                                                                                                                                                                                                     |
| `features/cards/components/FormatPicker.tsx`    | ⛔ **DO NOT TOUCH** | Labels are a `Record<BarcodeFormat, string>` (`:35-42`); it stays in sync with the unchanged schema. Note it reads the same `addCard.multiCode.formats.*` keys as the multi-code sheet — so deleting `DATAMATRIX` (AC5) must not disturb the other six.                                                                                                          |

### Guardrails

- **Never `console.*`** — use `core/utils/logger.ts`. `info`/`warn` are `__DEV__`-only no-ops in
  production; only `notify` (Sentry `captureMessage`, 'warning') and `error` (`captureException`) reach
  the field. `notify`'s `message` must be a **string literal** — a compile-time guard rejects anything
  widening to `string`.
- **PII:** a barcode number identifies a person's loyalty account. It must not reach Sentry as a
  message, tag, or context value. Tag values are **not** scrubbed.
- **Layer boundaries (ESLint-enforced, `eslint.config.mjs`):** `core/` must not import React or from
  `features/`. Cross-feature imports are banned by default, but **`add-card → cards` is an explicitly
  sanctioned exception** (`eslint.config.mjs:70-76`), which is why `useImageScan.ts:23` may import
  `ScanResult` from `@/features/cards/hooks/useBarcodeScanner`. **Do not "fix" that import.** The
  reverse direction (`cards → add-card`) is _not_ allowed.
- **Do not patch `node_modules`.** The 1024 px Android cap is upstream. If it is the confirmed cause,
  file a follow-up (`yarn patch` + a CI guard is the pattern Story 16-19 established for `burnt`).
- **Do not "fix" `normalizeBarcode` or `applyExpectedFormat`.** Both are documented as idempotent and
  are called from three surfaces plus `selectCode`. Their tests encode the Conad regression.

### Testing

- Co-locate tests beside the subject; `__tests__/` folders are **banned** (CI-enforced). `app/` holds
  no tests.
- Existing suites to extend: `features/add-card/hooks/useImageScan.test.ts` (already mocks
  `expo-image-picker` and `react-native-image-code-scanner`, including the `BarcodeFormat` enum — reuse
  that mock shape), `core/utils/inferBarcodeFormat.test.ts`, `catalogue/italy.test.ts`.
- Coverage gate is **80 % global** over `features/**`, `core/**`, `shared/**`.
- ⚠️ **Run the gates from the main checkout, not this `.claude` worktree** — a bare `yarn test` inside a
  worktree finds 0 tests (no `node_modules`), which reads as a pass.
- ⚠️ **A green Jest run does not prove the fix.** Jest never executes the native decoder; both
  `expo-camera` and `react-native-image-code-scanner` are mocked. AC1's device evidence is the only
  proof that matters here — this is the Story 16.15 lesson (green CI, fatal production crash).
- The pre-push Jest run intermittently SIGSEGVs a worker. Retry the push; **never** `--no-verify`
  (forbidden by CONTRIBUTING).

### Previous story intelligence

- **Story 2.9 (`39cda57`, `aabbffc`)** — the direct ancestor. Image scanning was moved _off_
  `@react-native-ml-kit/barcode-scanning` onto `react-native-image-code-scanner` because ML Kit forced
  an iOS 15.5 pod floor. The same commit introduced `normalizeBarcode` for the Conad
  "EAN-13 reported as 12-digit UPC-A" bug **and** removed `defaultFormat` from 11 brands where CODE-128
  had been guessed wrongly. Read `docs/sprint-artifacts/stories/2-9-scan-cards-from-image-screenshot.md`
  before touching the catalogue — the precedent is _don't guess a brand's format_, so AC6 is justified
  only because the Penny card's own payload is a checksum-valid EAN-13.
- **Story 2.10 (`aabbffc`)** — hardened `bwip-js` quiet zones and clamped QR to a scanner-safe minimum.
  Relevant precedent if AC1 turns out to be a _rendering_ readability problem rather than a decode one.
- **Story 16.14** — established `logger.notify` precisely because `logger.warn` is invisible in
  production. AC3/AC4 are the same pattern applied to the scanner. Read its story file for the tag
  conventions already in use.
- **Story 16.15** — green Jest, fatal production crash, because the runtime differs from Node. Directly
  motivates AC1's device requirement.
- **Story 16-18 (backlog)** — documents that Android telemetry is absent, so Android-only defects are
  invisible. Motivates Task 6.

### Git intelligence

Recent commits touching these paths: `569c3c8` (SVG fix), `aabbffc` (barcode reliability + decoder
swap), `39cda57` (iOS hardening + leading-zero recovery), `159c681` (Story 2.9 initial). The most recent
repo work is catalogue-shaped (`7837f35` added Paghi Poco / il Centesimo / Codice Fiscale) — that commit
is the model to follow for AC6, and per the add-a-brand checklist a **format-only** edit needs no logo or
watch-imageset work.

### Library versions (verified against `package.json` @ `7837f35`)

| Library                           | Version                        | Role                                                    |
| --------------------------------- | ------------------------------ | ------------------------------------------------------- |
| `react-native-image-code-scanner` | `^1.1.3`                       | Image decode (iOS Vision / Android ML Kit), TurboModule |
| `expo-camera`                     | `~55.0.16`                     | Live camera decode                                      |
| `@bwip-js/react-native`           | `^4.8.0` (resolved **4.10.1**) | Render — **not** implicated                             |
| `expo-image-picker`               | `~55.0.19`                     | Gallery picker (`quality: 1`, `exif: false`)            |

`react-native-image-code-scanner` always forces `enhanceContrast`, `convertToGrayscale`, and
`tryRotations` on (`src/index.tsx`) — there is no knob to disable preprocessing, and the JS layer
exposes no reason code when the native call fails.

### Project structure notes

- Story file lives in `docs/sprint-artifacts/stories/` (not flat) — required by
  `scripts/lib/story-refs.mjs` and `.github/workflows/mark-story-done.yml`.
- Branch prefix is **`feature/`**, not `feat/` (CONTRIBUTING).
- Sprint tracking: set `16-23-fix-silent-barcode-scan-failures` to `review` in
  `docs/sprint-artifacts/sprint-status.yaml` when the PR opens; the `done` transition is automation's job.

### Out of scope — flag, don't fix

- **Widening the symbology set** (ifero, 2026-07-29) — see
  [Defect 2](#defect-2--symbology-coverage-is-narrower-than-the-ui-implies-bounded-not-widening). If a
  real card in an unsupported symbology turns up, that is its own story.
- Patching the library's Android 1024 px cap (Task 6 only records it).
- Any change to `expo-camera`'s live-preview UX, `ScannerOverlay`'s mount-error fallback, or the
  multi-code picker's 6-result cap.
- Adding brand assets for Penny Market (the logo already exists; AC6 is a format-only edit).
- Any change to the watch apps' barcode-format enums — the schema is unchanged, so no parity work is needed.

### Answered by ifero (2026-07-29)

- **Failing surface:** scan from image / screenshot. Camera surfaces are controls only.
- **AC5:** keep the 6 supported symbologies; document the decision; remove the dead `DATAMATRIX` key.

### Open questions for ifero

1. Was the failing input **that digital card image**, or a **photo of the physical card**? (The former
   points at the image pipeline; the latter at capture quality.) Task 1 can proceed either way — it
   tests the supplied file — but the answer changes which fix is likely.
2. Do other cards scan from image fine on the same build — i.e. is this Penny-specific or a general
   regression in the image path?
3. Which platform was it (iOS or Android)? Android would implicate the 1024 px downscale cap
   (Task 6) directly.

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

### Change Log
