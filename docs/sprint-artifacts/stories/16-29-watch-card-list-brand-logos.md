---
baseline_commit: 7b05c1301d89086f74b01de7ac2049b5ede5d56b
---

# Story 16.29: Show brand logos instead of initials in the Apple Watch card list

Status: done

Epic: 16 — Platform & Tech Debt

> **✅ MOST OF THIS ALREADY EXISTS — IN THE WRONG TARGET. DO NOT BUILD IT FROM SCRATCH.**
> The watch **complication** already renders real brand logos. `targets/watch-widget/Assets.xcassets`
> ships **57 `BrandLogo-*.imageset` assets covering all 57 catalogue brands** (verified 2026-08-02
> against `origin/main` after Upim landed: 57 imagesets, `catalogue/italy.json` has 57 brands —
> **full coverage today, and the generator is what keeps it that way**), resolved through
> `BrandLogoCatalog` (`targets/watch-widget/BrandLogoCatalog.swift`) with `assetName(for:)` and
> `prefersDarkBacking(for:)`, backed by `knownBrandIds` / `lightLogoBrandIds` in
> `Generated/BrandLogoCatalog.generated.swift`. Both generated files come from
> `watch-ios/Scripts/generate-catalogue.swift`, which reads the catalogue **and** the imageset folder so
> they cannot drift.
>
> The watch **app** has none of it: `targets/watch/Assets.xcassets` contains only `AccentColor.colorset`
> and `AppIcon.appiconset`, and `CardRowView.logoView` (`targets/watch/CardListView.swift:369-393`) draws
> `initials(from:)` on a brand-coloured circle.
>
> **So this is an asset- and target-membership problem, not a design problem.** Reuse
> `BrandLogoCatalog`; do not re-derive light/dark logic, and do not hand-copy the imagesets.
>
> **Native change → NOT OTA-eligible.**
> **✅ INDEPENDENT of Stories 16.26 / 16.27 / 16.28** — it touches `CardListView.swift`, the asset
> catalogues and the generator script; none of those three edit any of them. **Can ship first.**

## Story

As a user scrolling my cards on the watch at a checkout,
I want to see each retailer's logo rather than two letters,
so that I can pick the right card at a glance instead of reading text on a 40 mm screen.

## Context

### The report

ifero, 2026-08-02: _"we should be showing the brands on the watch instead of the initials while showing
the list of cards (when the brand exists)"_. The parenthetical is load-bearing — see AC2.

### What the row renders today

`CardRowView` (`targets/watch/CardListView.swift:289-394`):

| Element        | Source                                    | Change?           |
| -------------- | ----------------------------------------- | ----------------- |
| Accent bar     | `:329-331`, 5 × 28 pt, `accentColor`      | ❌ unchanged      |
| **Avatar**     | `:333-335`, 30 pt, `.clipShape(Circle())` | ✅ **this story** |
| Card name      | `:337-343`                                | ❌ unchanged      |
| Favourite star | `:347-352`                                | ❌ unchanged      |
| Row background | `:359`, `#1C1C1F`                         | ❌ unchanged      |
| A11y label     | `:366` via `cardRowAccessibilityKey`      | ❌ unchanged      |

`logoView` (`:369-393`) has two branches today — a catalogue brand (initials on brand colour) and a
custom card (initials on user colour). **Both currently render initials**; only the first changes.

### The target-membership problem

The watch app and the widget are **separate targets with separate asset catalogues**, and
`@bacons/apple-targets` generates the Xcode project from the folder layout — so asset membership follows
the files on disk. `BrandLogoCatalog.swift` currently lives under `targets/watch-widget/` and is compiled
into the widget only.

## Acceptance Criteria

- **AC1 — A card whose `brandId` resolves to a known brand shows that brand's logo** in the 30 pt row
  avatar (`WatchCardRowLayoutMetrics.compact.avatarSize`, `WatchPresentationLayout.swift:31`), clipped to
  the existing `Circle()` (`CardListView.swift:334-335`).
- **AC2 — Initials remain the fallback, on two distinct paths.** (a) A **custom card** (`brandId` nil —
  the `else` branch at `:381-392`). (b) A **catalogue brand with no bundled imageset**:
  `BrandLogoCatalog.normalized(_:)` gates on `knownBrandIds` and returns `nil` for unknown brands, so this
  is a **real branch even at today's 57-of-57 coverage** — a brand added to `catalogue/italy.json` without
  a PNG must degrade to initials, **not to an empty circle**.
- **AC3 — Light and white logos stay legible** via the existing `prefersDarkBacking(for:)` dark chip. The
  row background is `#1C1C1F` (`:359`), so white-on-transparent artwork would otherwise vanish.
  **Reuse the widget's decision — do not re-derive it.**
- **AC4 — The accent bar and favourite star are unchanged.** The 5 × 28 pt accent rectangle (`:329-331`)
  and trailing star (`:347-352`) keep their current behaviour and colours. Only the avatar's content changes.
- **AC5 — Accessibility is unchanged.** The row stays a **single combined element** labelled by
  `cardRowAccessibilityKey(isFavorite:)` (`:283-287`, `:366`). The logo is **decorative** — it must not add
  a second VoiceOver element and must not replace the card name in the label.
- **AC6 — The assets reach the watch app target without a second source of truth.** Extend
  `watch-ios/Scripts/generate-catalogue.swift` to emit for **both** targets rather than hand-copying the
  imagesets, and make `BrandLogoCatalog` reachable from both **without duplicating its logic**.
  `yarn watch:catalogue:generate` must remain the single command that regenerates everything.
- **AC7 — The watch app's binary size increase is measured and recorded** in the story's completion notes.
  57 imagesets are being added to a target that has none, and the watch app is size-sensitive.
- **AC8 — The add-a-brand checklist is updated** to name the new asset location, so a future brand cannot
  ship with a complication logo and an initials-only list row.
- **AC9 — Verified on device** in both a light and a dark watch face context, with at least one
  dark-backing brand, one normal-logo brand, and one custom card visible in the same list.
  ⚠️ **Use `stroili` as the dark-backing brand, or add it as a fourth card.** QA found its committed
  artwork is blank (see QA round 1), and picking any of the other five dark-backing brands would let a
  passing device check miss it.

## Tasks / Subtasks

- [x] **Task 1 — Decide the sharing mechanism** (AC: 6)
  - [x] Choose between a shared source location compiled into both targets vs. generator-emitted copies
  - [x] Confirm `@bacons/apple-targets` picks it up for the watch app target
- [x] **Task 2 — Extend the generator** (AC: 6)
  - [x] `watch-ios/Scripts/generate-catalogue.swift` emits imagesets + catalogue data for both targets
  - [x] `yarn watch:catalogue:generate` still regenerates everything in one command
- [x] **Task 3 — Swap the avatar** (AC: 1, 2, 3, 4)
  - [x] `logoView` (`:369-393`) renders the logo when `BrandLogoCatalog.assetName(for:)` resolves
  - [x] Both initials fallbacks preserved; dark chip applied via `prefersDarkBacking(for:)`
- [x] **Task 4 — Accessibility check** (AC: 5)
  - [x] Combined element preserved; logo decorative; VoiceOver announces name + favourite state only
- [x] **Task 5 — Measure and document** (AC: 7, 8)
  - [x] Record binary-size delta; update the add-a-brand checklist
- [ ] **Task 6 — Device verification** (AC: 9) — **NOT DONE, needs a real Apple Watch (see notes)**

## Dev Notes

### Files to touch — current state and what must survive

**`targets/watch/CardListView.swift`**

- Current: `CardRowView` (`:289-394`) resolves the brand via `WatchBrands.all.first(where:)` (`:305-311`)
  from `targets/watch/Generated/Brands.swift`, derives an accent colour (`:314-325`), and draws initials
  in `logoView` (`:369-393`).
- Changes: `logoView` only.
- **Must survive:** `normalizedBrandId` trimming/lowercasing (`:294-303`), the accent-colour derivation and
  its `isNearBlack` border (`:361-364`), the combined a11y element (`:365-366`), and `CardListView`'s sort /
  deep-link / SwiftData behaviour (`:421-563`) — none of which this story touches.

**`watch-ios/Scripts/generate-catalogue.swift`** — currently emits `targets/watch/Generated/Brands.swift`
**and** `targets/watch-widget/Generated/BrandLogoCatalog.generated.swift`. It already reads both the
catalogue JSON and the imageset folder, so it is the right place for AC6.

**`targets/watch/Assets.xcassets`** — gains the brand imagesets.

**`targets/watch-widget/BrandLogoCatalog.swift`** — becomes shared. **Do not fork it.**

### Guardrails

- ⚠️ **`expo prebuild` rewrites tracked files inside the watch target's asset catalogue.** The watch
  `AppIcon` `Contents.json` is a known case — it is rewritten with **no trailing newline** and is
  `.prettierignore`d for exactly that reason. **Before putting generated content next to it, confirm which
  files under `targets/watch/Assets.xcassets` are prebuild-owned**, and never "fix" that missing newline.
- **`Brands.swift` and `BrandLogoCatalog.generated.swift` are generated — never hand-edit.** Both carry a
  `DO NOT EDIT` banner. Change the generator.
- **Generated content is committed and `.prettierignore`d.** Keep it that way; a CI `prettier --check`
  gate exists (`0d79e28`).
- Watch is read-only for card data (ADR-2026-06-09-001). This story reads brand metadata only.
- Native → **not OTA-eligible**.

### Testing

- **CI-enforced:** the TS contract tests in `targets/watch/__tests__/`. Two are directly relevant:
  - `generate-catalogue.test.ts` — guards the generator's output; **it will need extending for AC6**.
  - `watch-complication-contract.test.ts` — guards the widget's logo wiring; the pattern to copy for the app.
- ⚠️ These tests **regex-parse Swift source**; they do not run it. A refactor that changes a declaration's
  shape can break them even when behaviour is correct.
- Swift XCTests (`watch-ios/Tests/CardRowHelpersTests.swift`) cover `initials(from:)` and colour helpers —
  **AC2's fallback logic belongs there**, but note these **do not auto-run in CI**.
- Compile: `yarn watch:build` (**main checkout** — `ios/` is gitignored).

### Previous story intelligence

- **The complication logo work is the direct template.** Read how `BrandLogoCatalog` +
  `BrandLogoCatalogData` + the generator fit together before writing anything — the hard decisions
  (normalisation, unknown-brand fallback, light-logo dark chip) are already made and tested.
- **The add-a-brand checklist** already spans catalogue JSON + app SVG + `brandLogos.ts` + watch imageset
  PNGs (rasterised from SVG via AppKit) + regenerating `Brands.swift`. AC8 extends it; read it first so the
  new step lands in the right place.
- **16.22** — established the house pattern of extracting layout maths into a pure, testable helper rather
  than inlining it in the view. Relevant if AC3's chip logic needs a decision function.

### Git intelligence

Recent catalogue commits (`7837f35` Paghi Poco / il Centesimo / Codice Fiscale, `d6c3676` Leroy Merlin,
`1ce5928` Super Conveniente) are the **worked examples of adding a brand end-to-end** — read one to see
exactly which files a brand touches today, since AC8 changes that list.

### Library versions

No new dependency. SwiftUI + asset catalogues only.

### Project structure notes

- `targets/watch/` and `targets/watch-widget/` are separate `@bacons/apple-targets` targets, generated into
  the **gitignored `ios/`** at prebuild — never edit `ios/`.
- They already share an app group: `group.com.iferoporefi.myloyaltycards.watch-complication` (both
  `expo-target.config.js` files). That is for **runtime shared state**, not for compile-time asset sharing —
  do not conflate them.

### Out of scope — flag, don't fix

- **Changing the logo artwork itself.**
- **Brand logos on the barcode flash screen** (`BarcodeFlashView`) — different surface, different story.
- **Wear OS parity** — Story 10.4 territory.
- The 30 pt avatar size and the circle clip — AC4 keeps the row geometry as-is.

### Open questions for ifero

None blocking. If AC7's binary-size delta turns out to be large enough to matter, bring the number back
before deciding between duplicating the imagesets and a shared/downsampled asset set — that is a product
trade-off, not a dev one.

## Dev Agent Record

### Agent Model Used

Claude Opus 5 (`claude-opus-5`) — implementation. Sonnet code-review + QA review loops per the
project's review-gate protocol.

### Debug Log References

- `yarn watch:catalogue:generate` — emits 4 sources + mirrors 57 imagesets
- `yarn check:catalogue-generated` — drift gate, passes
- `yarn watch:build` — **BUILD SUCCEEDED**, no warnings on the changed files
- `npx jest --testPathPattern='targets/watch/__tests__' --testPathIgnorePatterns='/node_modules/'`
  — 102 passed / 6 suites at the time of writing. The `--testPathIgnorePatterns` override is
  required: `jest.config.js` excludes `targets/watch/` from the default run, and CI passes the same
  override. ⚠️ This count went stale four separate times across the review rounds (each round that
  added a test); treat the command as the source of truth, not the number.
- `yarn test` — 2184 passed / 177 suites; `yarn typecheck`, `yarn lint`, `yarn format:check` clean

### Completion Notes List

**AC6 — the sharing mechanism, and why it is not `_shared`.** `@bacons/apple-targets` 4.0.6 does
document a `_shared` folder (README § `_shared`): `targets/<target>/_shared/*` links files into "both
your target and the main target", and `targets/_shared/*` into all targets. It was rejected on two
independent grounds, both checked rather than assumed:

1. **"Main target" is the iOS phone app**, not the watch app. Linking `BrandLogoCatalog` there would
   drag watch-only code into the phone binary and require `BrandLogoCatalogData` to be compiled into
   it as well. Wrong shape for the problem.
2. **The implementation looks incapable of it anyway.** `with-xcode-changes.js` puts every shared file
   into a `PBXFileSystemSynchronizedBuildFileExceptionSet`'s `membershipExceptions` — for the main app
   target _and_ the extension target. `membershipExceptions` is an **exclusion** list: verified against
   this repo's own generated `ios/myLoyaltyCards.xcodeproj/project.pbxproj`, where each watch target's
   exception set contains exactly `Info.plist` and `expo-target.config.js` — the two files that must
   _not_ compile. So the global `_shared` route would add the group and then exclude its contents.

**So the generator owns the watch app's copies.** `watch-ios/Scripts/generate-catalogue.swift` now
emits four files instead of two and mirrors the imagesets:

| Output                                                            | Kind                                           |
| ----------------------------------------------------------------- | ---------------------------------------------- |
| `targets/watch/Generated/Brands.swift`                            | unchanged                                      |
| `targets/watch-widget/Generated/BrandLogoCatalog.generated.swift` | unchanged (doc-comment reflow only)            |
| `targets/watch/Generated/BrandLogoCatalog.generated.swift`        | **new** — same data, watch app target          |
| `targets/watch/Generated/BrandLogoCatalog.swift`                  | **new** — verbatim mirror of the authored file |
| `targets/watch/Assets.xcassets/BrandLogo-*.imageset`              | **new** — 57 byte-identical mirrors            |

`targets/watch-widget/BrandLogoCatalog.swift` stays the **single authored copy of the logic**; the
watch app compiles a generated mirror of it. Drift is impossible rather than merely discouraged:
`--check` compares the mirror against the authored file, compares all three data files, and compares
the imagesets member by member, so `yarn check:catalogue-generated` fails on any hand-edit.
`yarn watch:catalogue:generate` remains the single command.

**That gate runs in CI only — and it did not actually work until this story fixed it.**
`.husky/pre-push` deliberately runs only the Wear OS check (pure Node); the watchOS one needs
`xcrun swift`, so it cannot run on every contributor's machine. Worse, `watchos-tests.yml` ran
`generate-catalogue.swift` in **write** mode immediately before `yarn check:catalogue-generated`,
so the check compared freshly generated output against output generated seconds earlier and could
never fail. Because the `.sha256` sidecar is gitignored, a fresh CI checkout always missed the
incremental-skip hash, so that step rewrote all four artifacts every time. A contributor who edited
`catalogue/italy.json` or replaced a logo PNG without regenerating got a green board. The check now
runs against the **pristine checkout**, before `expo prebuild` and before anything regenerates
(`watch:build:ci` still regenerates via its own `pre` hook, so the build is unaffected). Verified by
seeding a stale catalog plus a deleted imageset: the gate now reports both and exits non-zero.

**AC7 — binary size, measured not estimated.** Two `watch` target builds (Debug, watchsimulator),
identical except for the presence of the mirrored imagesets:

| Artifact               | Without logos | With logos  | Delta                    |
| ---------------------- | ------------- | ----------- | ------------------------ |
| `watch.app/Assets.car` | 222,296 B     | 666,024 B   | **+443,728 B (+433 KB)** |
| `watch.app` total      | 2,690,173 B   | 3,192,253 B | **+502,080 B (+490 KB)** |

The mirrored source is 1.6 MB on disk (three scale renditions per brand) but compiles to +433 KB in
`Assets.car`. **Repo growth is ≈ 0**: git content-addresses blobs, so 57 byte-identical PNG sets add
tree entries, not objects. The story's open question said to bring the number back if it "turned out
to be large enough to matter" — 490 KB on a 2.7 MB app is a ~19% increase, real but modest, and it
buys the feature outright. Not escalated; the trade-off is recorded here instead. If it ever does
matter, the cheapest lever is dropping the `@3x` rendition (see follow-ups) — **not** un-mirroring.

**AC1/AC3 — how the row renders.** `logoView` resolves `BrandLogoCatalog.assetName(for: brand.id)`;
on a hit it draws the artwork on a chip, `.resizable().scaledToFit()`, inset by the new
`WatchCardRowLayoutMetrics.avatarLogoInset`. The inset is **derived, not tuned**: the avatar is clipped
to a circle, so artwork is only safe inside the circle's inscribed square (`diameter / √2`), and the
inset is computed from `avatarSize` so the two cannot drift. Without it a wide wordmark would have its
ends cut off by the mask. Light/white logos get a dark chip straight from
`BrandLogoCatalog.prefersDarkBacking(for:)` — the generator's luminance analysis, **not** re-derived in
the view (a contract test asserts the view neither reads `lightLogoBrandIds` nor calls
`relativeLuminance`). The dark chip carries the same `Color.white.opacity(0.15)` hairline the row
already uses for near-black accents, so the disc stays distinguishable from the `#1C1C1F` row.

**AC5 — accessibility.** The logo uses `Image(decorative:)`, which SwiftUI omits from the
accessibility tree entirely (confirmed against current SwiftUI docs) — stronger than adding
`.accessibilityHidden(true)` to a labelled image. The row remains one combined element labelled by
`cardRowAccessibilityKey(isFavorite:)`.

**⚠️ The story's premise was partly stale — worth knowing.** The banner says "the watch
**complication** already renders real brand logos". It does not: `WatchComplicationWidget.swift` is a
static open-the-app complication, and its own header says the card infrastructure (App Group snapshot,
`BrandLogoCatalog`, `WidgetCardPalette`) is "retained but dormant". So the 57 imagesets ship in the
widget today with **no live consumer**, and there was no working template to copy — only correct,
tested data. Two consequences: (a) the card list is now the **first** live consumer of this pipeline,
(b) the chip _colours_ were not "the widget's decision to reuse" because no chip was ever drawn; only
the light/dark **classification** existed, and that is what got reused. The white default chip is the
decision recorded in the generated file's own doc comment ("on the default white chip they would
disappear"). Mirroring rather than moving the assets deliberately keeps the dormant complication path
whole — a future per-card complication needs its own copy, since the extension is a separate bundle.

**⚠️ AC9 is NOT satisfied, and cannot be from this repo.** Device verification needs a real Apple
Watch in a light and a dark face context with a dark-backing brand (e.g. `conad`), a normal-logo brand
(e.g. `esselunga`) and a custom card in one list. What _is_ verified: the target compiles, the
imagesets are byte-identical to the widget's, `knownBrandIds` matches the shipped imagesets exactly,
and every one of the 57 catalogue brands is covered. Per the Sprint 19 validation constraint inherited
from the Epic 10 retro, this is recorded as an **open gate**, not silently accepted.

**⚠️ The Swift XCTests added here cannot run.** `watch-ios/Tests/CardRowHelpersTests.swift` gained 8
tests for `BrandLogoCatalog`'s fallback paths and the derived inset, as the story asked. They are
**unexecuted**: there is no unit-test target — `xcodebuild -list` shows only `myLoyaltyCards`, `watch`
and `watchwidget`, and `CardRowHelpersTests` appears nowhere in the generated project. Pre-existing
(the file has always been in this state), not introduced here, and flagged below. Executed coverage for
AC2/AC3 is therefore the TS contract tests plus the successful build.

### File List

| File                                                                         | Change                                                                                                                                                                                                                               |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `watch-ios/Scripts/generate-catalogue.swift`                                 | UPDATE — mirrors imagesets + resolver, emits the watch app catalog, `--check` gates all of it                                                                                                                                        |
| `targets/watch/CardListView.swift`                                           | UPDATE — `logoView` renders real artwork; both initials fallbacks extracted                                                                                                                                                          |
| `targets/watch/WatchPresentationLayout.swift`                                | UPDATE — derived `avatarLogoInset`                                                                                                                                                                                                   |
| `targets/watch-widget/BrandLogoCatalog.swift`                                | UPDATE — doc comment: authored copy, mirrored into the app target                                                                                                                                                                    |
| `targets/watch-widget/Generated/BrandLogoCatalog.generated.swift`            | REGENERATED — doc comment now covers both surfaces                                                                                                                                                                                   |
| `targets/watch/Generated/BrandLogoCatalog.generated.swift`                   | NEW (generated) — watch app brand-id sets                                                                                                                                                                                            |
| `targets/watch/Generated/BrandLogoCatalog.swift`                             | NEW (generated) — verbatim resolver mirror                                                                                                                                                                                           |
| `.gitignore`                                                                 | UPDATE — un-ignore the two new generated sources by name (review round 1, blocker)                                                                                                                                                   |
| `.github/workflows/watchos-tests.yml`                                        | UPDATE — run the drift check on the pristine checkout (round 2); trigger on the generator's inputs so a brand-add PR runs it at all (round 19)                                                                                       |
| `docs/cicd.md`                                                               | UPDATE — watchOS job path filters + step order (round 20)                                                                                                                                                                            |
| `targets/watch/README.md`                                                    | UPDATE — same, plus what the drift check actually covers (round 20)                                                                                                                                                                  |
| `.github/workflows/beta-releases.yml`, `ios-release.yml`, `store-upload.yml` | UPDATE — the generator step name named one of its five outputs (round 21)                                                                                                                                                            |
| `targets/watch/Generated/.catalogue-inputs.sha256`                           | NOT COMMITTED — gitignored incremental-skip sidecar; changes on disk only                                                                                                                                                            |
| `targets/watch/Assets.xcassets/BrandLogo-*.imageset` (57)                    | NEW (generated) — byte-identical mirrors of the widget's                                                                                                                                                                             |
| `targets/watch/__tests__/generate-catalogue.test.ts`                         | UPDATE — 10 → 50 tests (mirror, replace-in-place, drift, dotfiles, malformed imagesets, write-mode atomicity, staging debris, unreadable artifacts, missing catalogues, artwork-less imagesets, gitignore); failure helper extracted |
| `targets/watch/__tests__/watch-brand-logo-contract.test.ts`                  | NEW — 9 tests guarding the row wiring, a11y and asset shipping                                                                                                                                                                       |
| `targets/watch/__tests__/watch-catalogue-helpers.ts`                         | NEW — shared test helpers for the two catalogue suites (round 4)                                                                                                                                                                     |
| `watch-ios/Tests/CardRowHelpersTests.swift`                                  | UPDATE — 8 tests for the resolver + inset (⚠️ no test target; unexecuted)                                                                                                                                                            |
| `CONTRIBUTING.md`                                                            | UPDATE — AC8: add-a-brand checklist names the asset location and the mirror rule                                                                                                                                                     |
| `docs/architecture.md`                                                       | UPDATE — watchOS codegen description; corrected the false "generated files are gitignored" claim                                                                                                                                     |
| `docs/sprint-artifacts/stories/16-29-watch-card-list-brand-logos.md`         | UPDATE — this record                                                                                                                                                                                                                 |
| `docs/sprint-artifacts/sprint-status.yaml`                                   | UPDATE — 16-29 → review; `current_sprint` reconciled to include 16-34                                                                                                                                                                |

### Review rounds

**Round 1 (Sonnet, read-only) — CHANGES REQUESTED: 2 blocker, 3 minor, 3 nit, 1 judgment.** All acted
on. The two blockers shared one root cause and it was a genuine miss, worth recording:

1. **BLOCKER — the two new generated sources were gitignored.** `.gitignore:91` ignores
   `targets/watch/Generated/*` and un-ignores only `Brands.swift` by name, so
   `BrandLogoCatalog.generated.swift` and `BrandLogoCatalog.swift` — the watch app's **only**
   definition of the type `CardListView` now calls — would never have been committed. `git diff` and
   a PR review would both have shown nothing. Verified with `git check-ignore -v`. **This was masked
   locally by the exact mechanism it broke:** the files existed on my disk because I had run the
   generator, so the build and all 70 tests passed. Fixed by un-ignoring both by name, with a comment
   explaining the ignore-the-directory / un-ignore-each-artifact shape (matching the Wear OS block's
   precedent) and why the `.sha256` sidecar stays out. Guarded by four new tests that shell out to
   `git check-ignore` for the three known artifacts plus the sidecar. Note the residual gap: a
   _future_ fifth output under that directory still needs both a `!` line and a test entry, and
   nothing enumerates the generator's outputs independently of a human remembering both.
2. **BLOCKER (same cause) — the new contract suite would have failed CI on a fresh checkout.**
   `watchos-tests.yml` runs Jest at step 103, **before** `expo prebuild` (108) and the generator (111);
   the suite reads `targets/watch/Generated/*` at line 123/133, so on a clean clone those reads throw
   `ENOENT`. Confirmed by reading the workflow. Fixed by (1) — committed files exist at checkout time.
3. **MINOR — `.DS_Store` could pollute the mirror and churn the gate.** `FileManager.contentsEqual`
   compares directories deeply, so a Finder-dropped dotfile in the source imageset made it `outOfDate`
   and `copyItem` mirrored the junk into the tracked tree; its bytes change between sessions, so
   `--check` would then fail with no source change to explain it. Fixed with `mirroredImagesetMembers`
   (dotfiles excluded) plus a member-by-member compare and copy, so the mirror holds exactly what the
   filter admits. Regression test added.
4. **NIT — `--check` exited on the first mismatch.** Now every artifact is compared and all failures
   print together, followed by one "run `yarn watch:catalogue:generate`" line. Test added asserting
   three simultaneous drifts are all reported. **This refactor caused a real regression, which the
   pre-existing test caught:** a _missing_ file still `throw`ed, discarding mismatches already
   collected. So a missing file is now collected too — strictly better, and it let four `GeneratorError` cases
   and their descriptions be deleted.
5. **NIT — the `missingWatchAssetCatalogue` message overstated the check** (claimed a root
   `Contents.json` check that does not happen). Reworded to describe the directory check it performs
   and why it refuses to create one.
6. **NIT — File List listed the gitignored `.sha256` sidecar as a committed change.** Corrected.
7. **JUDGMENT (declined, with evidence) — "would a symlink remove this machinery?"** Spiked rather
   than argued: replaced `targets/watch/Generated/BrandLogoCatalog.swift` with a symlink to the
   authored widget file and ran a **clean** `xcodebuild` — `** BUILD SUCCEEDED **`, and the symlink
   appears in the target's compile list. So it does work in this toolchain today, and it would make
   drift structurally impossible rather than merely gated. **Kept the generated mirror anyway**, on
   three grounds: Apple documents no symlink contract for `PBXFileSystemSynchronizedRootGroup`, so this
   rests on observed behaviour of one Xcode version and would fail as "cannot find BrandLogoCatalog in
   scope" if it ever changed; a Windows clone with `core.symlinks=false` turns the link into a text
   file containing a path, which compiles as garbage rather than failing loudly; and no other symlink
   exists in this repo, so it would be a novel pattern for a file two contributors a year will read.
   The mirror is explicit, gated, and boring. Recorded as a follow-up so the option is not re-derived.
8. **NIT (declined) — `assetName(for:)` and `prefersDarkBacking(for:)` each normalize the same id.**
   Both are pure, so they cannot disagree; the cost is one extra trim + lowercase + set lookup per
   visible row on a list that renders a handful at a time. Collapsing them would mean a combined API on
   the shared authored file for one call site. The reviewer's own recommendation was not to. Left alone.

**Round 2 (Sonnet, read-only, told what round 1 found) — CHANGES REQUESTED: 1 major, 6 minor, 2 nit.**
All acted on.

1. **MAJOR — the drift gate could never fail.** Both halves of my "pre-push **and** CI" claim were
   wrong: pre-push runs only the Wear OS check, and CI regenerated in write mode immediately before
   checking. Written up in full in the completion notes above; fixed by moving the check ahead of
   everything that regenerates, and proven by seeding a stale catalog plus a deleted imageset and
   watching it report both and exit non-zero. **This was a pre-existing CI defect, not something this
   story introduced — but the story's central guarantee rests on it, so it belonged here.** Prose
   corrected in three places (`.gitignore`, `docs/architecture.md`, these notes).
2. **MINOR — the imageset mirror was not written atomically.** `removeItem` → `createDirectory` →
   per-member `copyItem` meant an interruption after `Contents.json` (which sorts first) but before a
   PNG left a valid-looking imageset missing artwork in the tracked tree. Now each imageset is staged
   into a hidden `.mirror-staging-<name>` sibling and swapped in only once complete, with stale
   staging swept at the start of every run and on any error. (Round 3 found the first version of this
   fix was still not atomic — see below.)
3. **MINOR — an unreadable (not missing) artifact still unwound `runCheck`**, discarding failures
   already collected and skipping the imageset comparison: exactly the bug round 1's nit fix was meant
   to remove, for a case it did not cover. Now collected like any other failure.
4. **MINOR — `applyBrandLogoMirror` threw a raw Foundation error** if a source imageset was a file
   rather than a directory. Now a named `malformedSourceImageset` error, with a test.
5. **MINOR — the dotfile test did not test what it claimed.** `--check` never invokes the copy loop,
   so only the planning-side filter was exercised; a regression that bypassed `mirroredImagesetMembers`
   in the copy loop would have passed. It also seeded `.DS_Store` into the **tracked** widget catalogue
   and relied on `finally` to clean up — with this repo's known Jest SIGSEGV flakes, a crash would have
   left real junk that then broke the byte-parity test. Rewritten to inject the dotfile into a
   throwaway copy via `WIDGET_ASSETS_PATH` against an empty destination, so the copy loop runs for
   real; it also asserts no staging debris is left.
6. **MINOR — two test-count claims were wrong** (15 vs the real 18 new tests; 70 vs 77), and the
   recorded Jest command was not runnable as written (missing the `--testPathIgnorePatterns` override
   that `jest.config.js` requires). All corrected.
7. **MINOR — the gitignore-guard claim was stronger than the mechanism.** Softened, with the residual
   gap stated: a future fifth generated output still needs a human to add both a `!` line and a test.
8. **NIT — `analyzeBrandLogoAssets` re-implemented** the directory check and the
   `BrandLogo-*.imageset` filter that the new helpers already provide. Refactored to call them, with
   the name shape hoisted into `brandLogoImagesetPrefix`/`Suffix` and a `brandSlug(fromImagesetName:)`
   helper, so the naming convention now lives in exactly one place.
9. **NIT — `missingAssetCatalogue` read ambiguously** beside the new `missingWatchAssetCatalogue`.
   Renamed to `missingWidgetAssetCatalogue`.

**Round 3 (Sonnet, read-only, told what rounds 1-2 found) — CHANGES REQUESTED: 1 major, 2 minor,
1 nit.** All acted on.

1. **MAJOR — the round-2 "atomic" swap was not atomic, and could lose both copies.** It was
   `removeItem(destination)` followed by a separate `moveItem(staging → destination)`, with a `catch`
   that deleted the staging directory. If the move failed after the remove succeeded — a directory
   inside a git working copy watched by Finder, Spotlight and Xcode is a realistic place for that —
   the imageset was gone AND the catch then deleted the staged replacement. Worse than the bug it
   replaced: `knownBrandIds` still claims the brand is known, so `Image(decorative:)` resolves to
   nothing and the row renders a blank circle instead of falling back to initials. Now uses
   `FileManager.replaceItemAt(_:withItemAt:)`, which swaps atomically and leaves the original in place
   on failure; the fresh-imageset case (no destination yet) still uses `moveItem`. The claim in the
   code comment and in these notes was corrected to match. New test covers the replace-in-place
   branch — every other mirror test took the fresh-copy path, which is why this went unnoticed.
2. **MINOR — `--check` could not give the malformed-imageset diagnosis.** Round 2's named error fired
   only from `applyBrandLogoMirror`, which `--check` never calls; `imagesetsMatch`'s `try?` folded
   "not a directory" into a generic "missing or stale". Since `--check` is the only mode CI runs, the
   better diagnosis was unreachable where it mattered. Validation moved into `planBrandLogoMirror`,
   which both modes call, and the test is now parameterised over both.
3. **MINOR — the unreadable-artifact message guessed wrong.** `try?` attributed every read failure to
   UTF-8; the reviewer reproduced a `chmod 000` case reporting "could not be read as UTF-8" for a plain
   permissions error. Now a `do`/`catch` reports the underlying error verbatim.
4. **NIT — round 2's unreadable-artifact fix had no regression coverage.** Test added: `chmod 000` on
   one committed artifact plus a second, unrelated drift, asserting both are reported (the read failure
   assertion is skipped when the process can read it anyway, e.g. running as root).

**Round 4 (Sonnet, read-only, told what rounds 1-3 found) — CHANGES REQUESTED: 1 major, 4 minor,
9 nit.** Acted on, with one decline.

1. **MAJOR — round 3's own fix put the malformed-imageset check where it bypassed the collect-all
   loop.** `planBrandLogoMirror` runs before the `if checkMode` branch, so throwing from it skipped
   `runCheck` entirely: one malformed imageset hid every other drift in the run and even suppressed the
   "run `yarn watch:catalogue:generate`" trailer. Reproduced by the reviewer. Fixed properly —
   `BrandLogoMirrorPlan` gained a `malformed` field, `runCheck` reports one line per entry alongside
   everything else, and write mode still refuses outright because it genuinely cannot copy a file as a
   directory. Confirmed by hand: a stale `Brands.swift` plus two malformed imagesets now produce four
   error lines in one run. Two new tests, including the "alongside other drift" case that had none.
2. **MINOR — only the first malformed imageset was named.** Now all of them, through the same
   first-few-plus-count summary the mirror already used for `outOfDate`/`orphaned`.
3. **MINOR — `CONTRIBUTING.md` implied the complication is a live logo consumer.** It is not (static
   open-the-app glyph, per-card path dormant), so "both surfaces fall back to initials" described
   something unobservable. Reworded, pointing at `WatchComplicationWidget.swift`.
4. **MINOR — copy-paste bug in the new contract suite's helper**: its not-found error read
   `Could not find "knownBrandIds" set in knownBrandIds` instead of naming the source searched. Fixed
   while extracting both duplicated helpers into `targets/watch/__tests__/watch-catalogue-helpers.ts`.
5. **MINOR — the recorded test total went stale again** (77 vs 81), because round 3 added tests without
   re-running the total. Third instance in one story; corrected.
6. **NIT — seven near-identical env-override blocks** in `resolvePaths` (four pre-existing, three added
   here). Collapsed into `overridablePath(_:default:repoRoot:)`; `resolveEnvPath` is gone.
7. **NIT — the generated `Source:` comment hardcoded `BrandLogo-*.imageset`** instead of composing it
   from the constants round 2 introduced for that purpose. Composed now.
8. **NIT (declined) — "`replaceItemAt` also works when the destination is absent, so drop the
   branch."** The reviewer verified that empirically, but Apple documents `replaceItemAt` as replacing
   _the item at_ a URL; relying on it to create a missing one is undocumented behaviour — the same bet
   this story already declined for symlinks. The reviewer's stated worry was an under-exercised branch,
   and both are now covered (fresh-copy by several tests, replace-in-place by round 3's). Kept explicit.
9. **NIT (resolved by finding 1, not declined) — the parameterised malformed test looked like one path
   tested twice.** True while the check threw from `planBrandLogoMirror`; the two modes now genuinely
   diverge, so the parameterisation earns its keep. The comment says why.
10. **NITs — sprint-status accuracy.** `16-34` moved out of `wave_1` into its own `wave_1b`, since the
    note beside it explained it is _not_ parallel-safe with wave_1's other story; the 16-29 line's stale
    "56 brands" counts corrected to 57; and that line now records the two premises implementation
    disproved (the dormant complication, and `_shared`). `baseline_commit` refreshed to the current
    `origin/main` tip.
11. **NIT (noted, no change) — a symlinked _destination_ imageset would break `replaceItemAt`** even
    though `isDirectory` reports it present. Nothing here creates one and the story declines symlinks;
    recorded so it is not rediscovered from scratch.

**Round 5 (Sonnet, read-only, told what rounds 1-4 found) — CHANGES REQUESTED: 1 major, 1 minor,
3 nit.** All acted on.

1. **MAJOR — round 4's own fix broke write-mode atomicity.** Making `planBrandLogoMirror` collect
   instead of throw meant nothing rejected a malformed source until `applyBrandLogoMirror`, which runs
   _after_ all four `writeSource` calls. So `yarn watch:catalogue:generate` would rewrite every
   generated Swift file, print no "Generated …" confirmation (those lines sit after the throw), and
   exit non-zero — leaving four modified files in the tree for someone to commit alongside a failure
   they had already read past. Reproduced by the reviewer, and worse than the bug round 4 fixed: if the
   malformed entry belonged to a brand that previously had artwork, the rewritten `knownBrandIds` would
   silently drop it. Fixed with a write-mode guard immediately after the `--check` branch and before
   any write; `applyBrandLogoMirror`'s now-unreachable guard is gone, replaced by a documented
   precondition. Verified: write mode with a malformed source now writes **zero** files. New test
   asserts all four outputs are absent.
2. **MINOR — `--check` named each malformed imageset twice**, once on its own line and again folded
   into the mirror summary, reading as two problems. `summary` no longer includes `malformed`; the
   per-name loop owns it. New test asserts exactly one mention plus a summary listing only real drift.
3. **NIT — the "not a directory" wording existed as two literals that had already diverged**
   (`GeneratorError`'s had a second sentence, `runCheck`'s did not). `runCheck` now reuses the error's
   own `errorDescription`.
4. **NIT — the epic-16 action item said 16-34 was added "to `wave_1`"** while the waves themselves
   (correctly) put it in `wave_1b`. Corrected.
5. **NIT (noted, no change — the reviewer asked for none) — `overridablePath` does not expand `~`.**
   Byte-for-byte identical to the deleted `resolveEnvPath` on every other input, so not a regression;
   these overrides are test-only and shells expand an unquoted `VAR=~/x` before Swift sees it.

**Round 6 (Sonnet, read-only, told what rounds 1-5 found and asked to scrutinise round 5 hardest) —
CHANGES REQUESTED: 4 nit, no correctness findings.** Three fixed, one declined.

It also independently confirmed the things rounds 3-5 kept breaking are now sound: nothing between
`runGenerator`'s entry and the write-mode guard touches the filesystem for writing, `summary` cannot
be empty while `isInSync` is false, the `errorDescription` reuse had no nil hazard, and both round-5
tests fail against round-4 code.

1. **NIT — write mode named only the first malformed imageset** while `--check` named them all. Now
   both list every offender, and write mode adds "Nothing was written." so the failure's blast radius
   is explicit. Fixing it removed the last user of `GeneratorError.malformedSourceImageset`, which
   existed only to carry a string: replaced by `malformedImagesetMessage(_:)`, one function shared by
   both call sites, so the two wordings still cannot drift.
2. **NIT — `applyBrandLogoMirror`'s precondition comment implied its copy loop depends on the guard.**
   It does not: `planBrandLogoMirror` builds `outOfDate` from the mirrorable names only, so a malformed
   entry can never reach the loop. Reworded to say what the guard actually protects (the generated
   sources) and to point at the call site that explains why.
3. **NIT — the "where new logo PNGs go" guidance sat after the regenerate command** it is a
   prerequisite for. Moved up under the step that adds the brand entry.
4. **NIT (declined, with a reason the reviewer could not have known) — "compile the generator once in
   `beforeAll` instead of `xcrun swift`-ing it per test."** The suite is 43 s and the reviewer rightly
   called it a trend rather than a bottleneck. It cannot be done as suggested: `resolvePaths` derives
   the repo root from `CommandLine.arguments.first` and asserts the script's parent directory is named
   `watch-ios`, so a binary compiled to a temp path fails immediately. Making it work would mean either
   dropping that structural guard or adding a repo-root override that exists purely to speed tests —
   both worse than 43 s. Recorded as a follow-up instead.

**Round 7 (Sonnet, read-only, told what rounds 1-6 found) — CHANGES REQUESTED: 3 minor, 2 nit.** All
acted on. Three of the five were the _same defect class_ rounds 1/3/4/5 kept fixing — "one early
problem hides every other diagnosis" — on paths no round had walked:

1. **MINOR — an unreadable authored resolver aborted `--check` before `runCheck` ran**, hiding every
   other drift, even though the other three artifacts were already computed and comparable. Now read
   with `try?`: check mode reports it as its own failure and still compares everything else; write mode
   keeps a hard failure, because there is genuinely nothing to write without it.
2. **MINOR — `resolverSourceURL` was the one path with no env override**, which is exactly why the
   branch above had no test coverage (the only way to make the file "missing" was to delete the real
   one, which the widget needs to compile). Now `RESOLVER_SOURCE_PATH`, like its seven siblings, with a
   test that redirects it and asserts the stale `Brands.swift` is still reported alongside.
3. **MINOR — staging debris was invisible to the gate.** `clearMirrorStaging` ran only as
   `applyBrandLogoMirror`'s first statement, so `--check` never saw it (the `BrandLogo-` prefix scan
   skips a dot-prefixed name) and a write-mode run that hit the malformed guard exited before the
   sweep. Fixed on both sides, respecting a constraint the reviewer's suggestion would have broken:
   **`--check` is a CI gate and must not write**, so it now _reports_ debris as its own drift category
   (`BrandLogoMirrorPlan.staging`) while write mode sweeps before it does anything else. Verified by
   hand: `--check` names it and leaves it on disk; the next write removes it. Test covers both halves.
4. **NIT — one assertion in the round-5 test could never fail**, because the string it asserted absent
   (`not a directory: <name>`) was never a real output shape. Replaced with the real risk: the mirror
   summary line must carry the genuine drift and _not_ the malformed name.
5. **NIT — a doc comment hardcoded "all 57"** while describing size-independent truncation. Generalised.

**Round 8 (Sonnet, read-only, told what rounds 1-7 found) — CHANGES REQUESTED: 2 minor, 3 nit.** All
acted on. It also confirmed the reviewer-brief worry that `staging` in `isInSync` could cause a
regenerate loop is unfounded: `isInSync` can only make `upToDate` more conservative.

1. **MINOR — the write-mode status line lied when staging debris was the only change.** It branched on
   `isInSync` (which includes `staging`) but printed `summary` (which deliberately excludes it), so a
   run whose copy loop did nothing announced `Mirrored brand-logo imagesets into … ()` — with an empty
   parenthesis. Reproduced by the reviewer. The round-7 test missed it because it never captured the
   second run's stdout. Now the mirror line is gated on the two lists `summary` actually describes,
   `clearMirrorStaging` returns what it swept, and the run says so explicitly ("Cleared 1 leftover
   staging directory."). The test now asserts all three.
2. **MINOR — `missingResolverSource` hardcoded the widget path** even though round 7 made that path
   overridable, so a failed read of a redirected path reported a file the run never opened. The case
   now carries the path it actually tried, formatted through the existing `repoRelativePath` helper.
3. **NIT — `planBrandLogoMirror` read the destination listing twice** (once for imageset names, once
   for staging). Enumerated once and filtered twice.
4. **NIT — a test assertion was ambiguous between two fixtures.** `'BrandLogoCatalog.generated.swift
could not be read'` is a substring of the _watch_ fixture's name `watch-BrandLogoCatalog.generated.swift`
   as well as the widget's, so a failure attributed to the wrong artifact would still have passed. Now
   asserts the exact basename.
5. **NIT — indentation of the `artifacts` array literal** was two levels deep. Normalised to the file's
   2-space-per-level style.

**Round 9 (Sonnet, read-only, told what rounds 1-8 found) — CHANGES REQUESTED: 1 minor, 4 nit.** Four
fixed, one declined.

1. **MINOR — the other two "missing catalogue" errors still hardcoded their default paths**, the same
   defect round 8 fixed for `missingResolverSource` and left in its siblings. Both now carry the path
   actually checked, and two tests assert the real path appears (the Jest suite overrides
   `WATCH_ASSETS_PATH` on every run, so this was misleading on every local failure).
2. **NIT — `@discardableResult` on `clearMirrorStaging` was stale** once round 8 made the single call
   site capture the result. Removed.
3. **NIT — no test pinned that `missingResolverSource` carries its path**, so reverting round 8's fix
   would still have passed. Asserted now.
4. **NIT — the round-8 comment about the status-line gating read awkwardly.** Reworded.
5. **NIT (declined) — "extract a `runWrite` for symmetry with `runCheck`."** The reviewer called it
   optional and not urgent, and the evidence in this story argues against it: restructuring exactly
   this function is what produced a fresh defect in rounds 4, 5 and 8, each caught only by the next
   round. A pure-symmetry refactor of the one function with that track record is not worth spending
   another round on. Recorded as a follow-up instead.

**Round 10 (Sonnet, read-only, asked to verify the feature actually works rather than hunt) —
CHANGES REQUESTED: 3 minor, 2 nit.** All acted on. It first traced the three row paths end to end and
confirmed the feature works: a catalogue brand resolves to a real bundled asset name, a dark-backing
brand takes the dark chip, both initials fallbacks are reachable, and the two pre-existing initials
branches are behaviourally identical to `origin/main` (same `accentColor`, same per-branch hex
source). It also confirmed `git status` completeness against the File List and that all 57 imagesets
are byte-identical with no debris.

1. **MINOR — the destination-catalogue guard was the last precondition still aborting `--check`.**
   Same class as rounds 1/4/5/7: by the time the mirror is planned all four sources are comparable, so
   a missing destination hid their drift until a second run. `BrandLogoMirrorPlan` gained
   `missingDestination`; check mode reports it with everything else, write mode still throws. Verified:
   a missing destination plus a stale artifact now produce both errors in one run.
2. **MINOR — `CONTRIBUTING.md` still described the pre-fix CI order** ("then `expo prebuild`,
   regenerates `Brands.swift`, verifies it") — the very ordering round 2 proved could never fail. It
   sat outside every hunk of this story's workflow diff, so nine rounds missed it. Rewritten to match.
3. **MINOR — `missingWidgetAssetCatalogue` had no test at all**, so round 9's claim that "two tests
   assert the real path" was only half true. Test added, plus one for the missing-destination path.
4. **NIT — three sibling errors formatted their paths two different ways** (raw `.path` vs
   repo-relative). Settled on one convention with the reason stated once: errors print the path as
   resolved, because a human is hunting for a file; repo-relative is reserved for `Source:` comments in
   generated files, where reproducibility across checkout locations is the point.
5. **NIT — the mirror was broader than `knownBrandIds`.** A `BrandLogo-*.imageset` shipping only a
   `Contents.json` (a brand scaffolded ahead of its artwork — plausible under the AC8 workflow this
   story wrote) was excluded from `knownBrandIds` but still mirrored, shipping a folder no code can
   resolve. Both sides now go through one `imagesetPNGs(in:)` helper, so the two notions cannot
   diverge, and `orphaned` follows the same set. Test added.

**Round 11 (Sonnet, read-only, told what rounds 1-10 found) — CHANGES REQUESTED: 2 minor, 4 nit.**
All acted on.

1. **MINOR — round 10's shared PNG filter could delete a valid mirrored asset.** `imagesetPNGs`
   swallowed every read failure with `try?`, so a source imageset that still existed but was
   momentarily unreadable (a bad `chmod`, a half-synced mount) looked identical to one whose artwork
   had been deleted — and because round 10 made `orphaned` derive from that same filter, write mode
   would have removed the destination's valid, tracked copy. Reproduced by the reviewer. Now
   `imagesetPNGs` returns `nil` for "could not read" and the plan carries `unreadable` separately:
   it is reported in both modes, and `orphaned` never acts on a source the generator is uncertain
   about. Verified by hand: the mirrored copy survives both a `--check` and a write attempt.
2. **MINOR — the missing-destination early return discarded source-side findings.** `malformed` is
   computed from the source alone, so a missing destination catalogue hid a malformed imageset until a
   second run — the same class as rounds 1/3/4/5/7/10, in the branch round 10 had just added.
   Source-side facts are now computed before the destination guard and survive the early return.
3. **NIT — a real compiler warning** (`initialization of immutable value 'fileManager' was never
used`), left by round 2's refactor. The Debug Log's "no warnings" note was about the Xcode target
   build, which never compiles this script. Removed.
4. **NIT — the `orphaned` doc comment described only the "source folder gone" case**, not the
   "folder kept, PNGs removed" case that the round-10 gating also routes there. Reworded, and a test
   now covers that transition (mirror a real imageset, strip the source's PNGs, assert the mirrored
   copy is removed and the brand leaves `knownBrandIds`).
5. **NIT — "absolute when the caller resolved an override"** implied the default case might be
   relative. It never is. Corrected.
6. **NIT — the four `GeneratedArtifactCheck` messages don't carry paths** while the three
   `GeneratorError` cases now do. Left as-is with the reason stated in the type's doc comment: those
   four paths are only ever redirected by the Jest suite, so a real run's path is always the committed
   one the message already names.

**Round 12 (Sonnet, read-only, told what rounds 1-11 found) — CHANGES REQUESTED: 4 minor, 3 nit.**
Six acted on, one declined.

1. **MINOR — round 11's own guarantee had a time-of-check/time-of-use hole.** `planBrandLogoMirror`
   read each source imageset **twice** — once to build `unreadable`, once inside `mirrorable`'s filter
   — so an imageset that was readable at the first read and unreadable at the second landed in neither
   `unreadable` nor `mirrorable`, fell into `orphaned`, and would have had its valid tracked copy
   deleted: exactly the outcome round 11 existed to prevent, reopened by the redundant read. Fixed at
   the root with a single `BrandLogoSourceScan` — one read per imageset — from which `malformed`,
   `unreadable` and `withArtwork` are all derived. `imagesetPNGs` now has exactly one call site.
2. **MINOR (same fix) — `analyzeBrandLogoAssets` and the mirror could disagree about the same
   directory.** The analysis treated an unreadable imageset as "not known" while the mirror treated it
   as "uncertain", so a transient glitch during the analysis pass alone could have baked a
   `knownBrandIds` missing a brand whose logo was still perfectly mirrored. Both now consume the same
   scan, so they cannot diverge by construction — and the scan's `unreadable` list makes write mode
   refuse, so such a `knownBrandIds` cannot be written at all.
3. **MINOR — round 7's "generalised the hardcoded 57" claim was false.** The comment still read
   "without printing all 57"; the edit had silently not matched and I recorded it as done without
   re-checking. Now fixed for real, and worth stating plainly: an unverified edit reported as complete
   is the same failure mode as the round-1 blocker, in the narrative rather than the code.
4. **MINOR (declined, with a concrete reason) — "collect the missing _widget_ catalogue like the
   missing destination."** Symmetry says yes, but the two are not symmetric: without the widget
   catalogue the expected contents of two of the four generated artifacts are unknowable, so `--check`
   would report them as "differing" — a wrong diagnosis, not a fuller one. A missing _destination_
   changes nothing about what the four sources should contain, which is why round 10's fix was right
   there. The reason is now a comment on the throw. Same argument covers the catalogue-JSON read.
5. **NIT — the drift warning still promised the complication falls back to initials**, a surface whose
   per-card path is dormant; this story had already corrected the same claim in `CONTRIBUTING.md` but
   edited this line without fixing it. Reworded.
6. **NIT — `--check`'s trailer told you to regenerate even when regenerating writes nothing** (a
   malformed or unreadable source makes write mode refuse). It now points at the catalogue in that
   case. One existing test asserted the old trailer for exactly that scenario and correctly failed;
   updated to assert the new one and the absence of the old.
7. **NIT — the path-convention comment sat between two `case`s**, reading as case-local. Moved above
   the first of the three cases it governs.

**Round 13 (Sonnet, read-only, told what rounds 1-12 found) — CHANGES REQUESTED: 1 major, 1 minor,
2 nit.** All acted on.

1. **MAJOR — a dotfile ending in `.png` could silently cost a light logo its dark chip.**
   `imagesetPNGs` filtered only on the `.png` suffix while its sibling `mirroredImagesetMembers`
   excluded dotfiles, so an AppleDouble sidecar (`._brand-logo-x@3x.png`, which macOS creates when
   PNGs travel via exFAT or some SMB shares — a realistic way to receive a new brand's artwork) sorted
   _before_ the real file, was selected as the `@3x` rendition to analyse, failed to decode, and
   dropped the brand from `lightLogoBrandIds`. That is precisely the AC3 failure this story exists to
   prevent, and **`--check` could never catch it**: it compares committed against freshly generated
   output, and both reproduce the same wrong answer from the same polluted source. The only dotfile
   test used `.DS_Store`, which does not end in `.png`. Fixed at the shared axis: one
   `isImagesetContent(_:)` predicate both helpers apply, with both failure modes written down where it
   lives. Verified by hand with a real sidecar: `conad` stays classified light and the sidecar is not
   mirrored. Test added.
2. **MINOR — the round-12 trailer covered only two of the four "write mode writes nothing" states.**
   A missing destination catalogue or a missing authored resolver also make write mode refuse, yet
   `--check` still said "run `yarn watch:catalogue:generate` and commit the result" — advice that
   cannot work. `runCheck` now takes a `writeBlocked` flag and also inspects `missingDestination`, and
   the message says what it means: "Fix the problems above first — until then
   `yarn watch:catalogue:generate` writes nothing." Both states are now tested; the two existing tests
   for them had never asserted on the trailer.
3. **NIT — two doc comments had merged**, leaving the dotfile-exclusion rationale sitting above
   `imagesetPNGs`, which did not implement it — the false belief behind finding 1. Split.
4. **NIT — `BrandLogoSourceScan`'s doc claimed more than it delivers.** It guarantees one read per
   imageset for the _classification_; later steps read again to compare and copy bytes. Scoped to
   what is actually true, with a note on why those later reads cannot resurrect the hazard (they are
   derived from the snapshot and fail loudly).

**Round 14 (Sonnet, read-only, told what rounds 1-13 found) — CHANGES REQUESTED: 3 minor, 2 nit.**
All acted on.

1. **MINOR — rendition selection trusted filenames over `Contents.json`.** A leftover PNG from a
   manual rename (`brand-logo-x-old@3x.png`, undeclared, sorting _before_ the real file because
   `-` < `@`) would be chosen as the artwork to analyse, misclassifying the logo — the same silent
   mechanism as round 13's sidecar, from a different trigger, and equally invisible to `--check`.
   `actool` does not fail the build over a loose extra file — it emits only a non-fatal "unassigned child" warning and compiles the declared renditions fine (verified with `actool` in round 15). The scan now compares each imageset's PNGs
   against the filenames its `Contents.json` declares and refuses the imageset if they disagree in
   _either_ direction, reported in check mode and blocking in write mode. Verified against all 57
   committed imagesets first — every one agrees — then verified the gate fires on a seeded leftover.
   Two tests, one per direction. **This also reclassified an existing test's fixture:** "source loses
   all artwork" had deleted the PNGs while leaving `Contents.json` declaring them, which is now
   (correctly) an inconsistency rather than a withdrawal, so the fixture was changed to empty
   `Contents.json` too — what Xcode actually leaves behind.
2. **MINOR — the contract test compared raw `readdirSync` output** on the two _tracked_ catalogues,
   the only test that reads them without redirection. A `.DS_Store` in one and not the other would
   fail it with no regression behind it — the noise class this story hardened the generator against in
   rounds 1 and 13, reintroduced in a test. Both sides now go through a shared `imagesetMembers`
   helper that applies the same dotfile rule.
3. **MINOR — `runCheck`'s `writeBlocked` had an optimistic default** (`false` = "regeneration will
   work") in the one function whose repeated defect has been an unaccounted-for state producing
   misleading advice. Default removed: with a single call site it costs nothing and forces any future
   caller to state the condition.
4. **NIT — the `.png` extension was matched case-insensitively but the `@3x` scale marker was not.**
   One standard now applies to both.
5. **NIT — `CONTRIBUTING.md`'s quality-gate table still summarised the watchOS job as "`Brands.swift`
   catalogue sync"** while the prose 30 lines below (edited twice by this story) described all four
   generated sources plus a byte-for-byte imageset comparison. Table cell updated to match.

**Round 15 (Sonnet, read-only, told what rounds 1-14 found) — CHANGES REQUESTED: 1 major, 1 minor,
4 nit.** Four acted on, two accepted as-is on the reviewer's own recommendation.

1. **MAJOR — an imageset with PNGs but no `Contents.json` shipped a blank row, every gate green.**
   Round 14's consistency check only compared when there was something to compare: a missing or
   undecodable `Contents.json` returned `nil` and was read as "nothing to check", so the imageset
   reached `knownBrandIds` and got mirrored. The reviewer verified with `actool` + `assetutil` what
   that means downstream: `actool` warns ("unassigned child"), exits 0, and **omits the image from
   `Assets.car` entirely** — so `assetName(for:)` resolves, `Image(decorative:)` finds nothing, and
   the row draws an empty circle, the exact outcome AC2 exists to prevent. And it is a live trap: the
   AC8 checklist this story wrote tells contributors to drop PNGs into the imageset without mentioning
   `Contents.json`. Now "PNGs but no parseable `Contents.json`" is an inconsistency in its own right,
   with its own message, refused in both modes. Verified by hand and tested.
2. **MINOR — the generated doc comment claimed the complication renders real artwork.** The same
   overclaim rounds 4 and 12 corrected in `CONTRIBUTING.md` and in the drift warning, still sitting in
   the template that ships it into **two** committed generated files. Reworded there, so both
   regenerate correctly.
3. **NIT — round 14's case-insensitive scale matching had no test.** A refactor dropping the
   `.lowercased()` would have passed the suite. Test added with uppercase `@3X` filenames, asserting
   the light-logo classification is unchanged. Rendition selection also moved out of the loop into a
   top-level `preferredRendition(from:)` — the reviewer's suggestion, and it makes the priority order
   readable in one line.
4. **NIT — the round-14 note said "Xcode does not complain about a loose extra file".** The reviewer
   checked: `actool` _does_ warn, it just does not fail. Corrected — and worth noting this is the
   second unverified claim of mine this loop has caught in the narrative rather than the code.
5. **NIT (accepted as-is, reviewer recommended no change) — `untrustworthy` is recomputed three times
   per run.** Three small `Set` unions over ≤57 names, dwarfed by the per-logo pixel decode in the same
   loop, and the stored arrays never change within a run.
6. **NIT (accepted as-is) — the rendition closure was re-created per iteration.** Resolved anyway by
   the hoist in item 3.

**Round 16 (Sonnet, read-only, told what rounds 1-15 found) — CHANGES REQUESTED: 2 minor, 2 nit.**
All acted on. It also traced and confirmed the round-15 questions: the scan's `continue` does not skip
`pngsByName` (that assignment precedes the guard), such an entry is excluded from both `outOfDate` and
`orphaned` so a still-valid mirrored copy is left alone, and a destination whose `Contents.json` was
deleted fails `imagesetsMatch` on the member list and is re-copied whole.

1. **MINOR — one shared message tail did not fit both inconsistency shapes.** `ImagesetInconsistency`
   appended "so which file is the real artwork is ambiguous" to both reasons, but with a single PNG and
   no `Contents.json` there is nothing ambiguous — the image simply never reaches `Assets.car`. A
   contributor primed by "ambiguous" would hunt for a duplicate to delete instead of adding the
   `Contents.json` the same sentence asks for. Each reason now carries its own accurate consequence,
   and both are pinned by tests (including that the no-`Contents.json` case does _not_ say "ambiguous").
2. **MINOR — round 15 hardened the generator against the missing-`Contents.json` trap but never
   closed the AC8 gap that creates it.** The checklist still said only "add the imageset", which is
   exactly what produces the refusal. It now says the imageset must carry a `Contents.json` declaring
   every PNG, how to get one (copy an existing imageset's), and what happens without it. That is the
   gap round 15 identified in its own finding and left open — caught here rather than by a contributor.
3. **NIT — `withArtwork`'s doc called shipping a PNG "the precise condition" for `Image(...)`
   resolving.** Round 15's own fix disproves it: an imageset with PNGs and no valid `Contents.json`
   satisfies that and still does not resolve, which is why the filter also excludes `untrustworthy`.
   Reworded to necessary-but-not-sufficient.
4. **NIT — inserting `ImagesetInconsistency` left `BrandLogoSourceScan`'s doc comment attached to it**
   and the scan itself undocumented — the same merge round 13 split apart. Split again.

**Round 17 (Sonnet, read-only, asked to judge whether anything shippable remains) — CHANGES
REQUESTED: 1 minor.** Acted on. The reviewer first re-verified the shipped feature from scratch rather
than trusting the record — three row paths, the resolver mirrors, both generated data files, 57/57
brand coverage in both directions, byte-identical imagesets, the derived inset maths, and the CI gate
ordering — and found nothing else.

1. **MINOR — the mismatch reason still covered two sub-directions with one clause.** "Ambiguous" fits
   an undeclared extra PNG (the generator's rendition picker really could choose wrong) but not a
   declared-but-absent one: verified with `actool`/`assetutil` that the remaining declared renditions
   still compile and the missing one simply never ships. Since the AC8 checklist now tells
   contributors to copy an existing `Contents.json` as a template, supplying fewer renditions than the
   template declares is a likely way to hit exactly this message — and "ambiguous" would send them
   hunting for a duplicate that does not exist. The two directions now report separately (and combine
   when both apply), naming the offending files, with number agreement. Both directions are tested,
   including that the absent-file case does **not** say "ambiguous".

**Round 18 (Sonnet, read-only, asked to judge readiness) — CHANGES REQUESTED: 1 nit.** Acted on. The
reviewer independently re-verified the feature and every gate (57/57 coverage both ways, byte-identical
mirrors, the resolver mirror against its authored source, the generated pair differing only in the
`Source:` line, the inset geometry re-derived by hand, the CI ordering and pre-push exclusion read from
the files themselves) and additionally stress-tested the consistency logic with `actool`/`assetutil` on
a case-mismatched `Contents.json`, confirming the refusal is correct rather than a false positive.

1. **NIT — round 17's plural and combined-clause branches had no test.** Every fixture seeded exactly
   one stray or one absent file, so `"them"`, `"those renditions … reach"` and the `"; and it "` join
   were unexercised: a future edit could ship a garbled message with all 49 tests green. One fixture
   now seeds two strays _and_ two absent renditions on the same imageset and pins all three.

**Round 19 (Sonnet, read-only, asked to decide whether the work is done) — CHANGES REQUESTED: 1
major, 1 nit.** Both acted on. It independently reproduced AC7's byte counts exactly from its own build
(`Assets.car` 666,024 B, `watch.app` 3,192,253 B), re-derived the inset, re-diffed all 57 imagesets and
both generated files, and confirmed the round-18 test would fail under plausible mutations.

1. **MAJOR — the round-2 CI fix guaranteed less than I claimed, because the workflow's own trigger
   paths excluded the generator's inputs.** `watchos-tests.yml` filtered on `targets/watch/**`,
   `watch-ios/**`, `ios/**`, `app.json` and `fastlane/Fastfile` — but **not** `catalogue/**` or
   `targets/watch-widget/**`. So the exact scenario the drift gate exists for — a contributor adds a
   brand per the AC8 checklist (catalogue JSON + an imageset in the _widget_) and forgets
   `yarn watch:catalogue:generate` — produces a diff matching none of those paths, the workflow never
   runs, and nothing catches the stale output until some unrelated later PR happens to touch
   `targets/watch/**`. The always-on quality-gates job cannot cover it either: it runs on ubuntu and
   `check:catalogue-generated` needs `xcrun swift` — which is precisely why the pure-Node Wear OS twin
   lives there instead, reasoning already written down beside it. Both path lists now include
   `catalogue/**` and `targets/watch-widget/**`, with the why recorded. **So "drift is impossible" was
   true of the check from round 2 and only becomes true of the pipeline now.**
2. **NIT — the round-18 test omitted the `Nothing was written.` assertions** its two siblings carry.
   Added for symmetry (no coverage change: `untrustworthy` gates write mode uniformly).

**Round 20 (Sonnet, read-only, sign-off review) — CHANGES REQUESTED: 3 minor.** All acted on. It
verified round 19's path lists are now complete for every input the generator reads and every output it
writes, confirmed `ci-quality-gates.yml`, `wear-os-build.yml` and `.husky/pre-push` need nothing from
this story, and re-ran every gate plus a real `./scripts/watch-build.sh`.

1-3. **MINOR ×3 — three other descriptions of the same CI step were left behind by rounds 2 and 19.**
`docs/cicd.md` (which calls itself the single source of truth for the pipeline) and
`targets/watch/README.md` both still listed the old path filters _and_ the old step order — a
post-prebuild regenerate with no pristine-checkout check, the ordering round 2 proved could never
fail — and `CONTRIBUTING.md`'s leading clause still had the old path list one clause away from text
this story had already edited twice. All three now match the workflow, and `docs/cicd.md` and the watch
README also say what the check actually covers (four generated sources plus the byte-exact imageset
mirror). **The lesson for the record: I fixed a mechanism twice and each time updated only the doc I
happened to be reading.** A grep for the path list would have found all four sites in one pass.

**Round 21 (Sonnet, read-only, sign-off with a systematic repo-wide grep) — CHANGES REQUESTED: 2
minor, 2 nit; reviewer's own verdict on mergeability: yes.** All acted on. It re-ran every gate, and
independently compiled `targets/watch/Assets.xcassets` with `actool` + `assetutil`: zero warnings, all
57 `BrandLogo-*` images present in the compiled catalog, and an `Assets.car` byte-identical to the
xcodebuild output — the strongest end-to-end evidence yet that the assets actually reach the build,
which is what AC1 needs and what AC9's device pass would confirm visually.

1. **MINOR — `targets/watch/README.md` described a complication that does not exist.** Two bullets
   claimed `AppIntentConfiguration` + `AppIntentTimelineProvider`, a configuration intent letting the
   user pick "Open App or a specific card", a `myloyaltycards://watch-card?id=…` deep link and a
   localised "sync your cards" empty state. None of it is real: the widget is a `StaticConfiguration`
   with a plain `TimelineProvider`, there is no `AppIntent` type anywhere in `targets/`, and neither
   `.lproj` holds that string. This is the same "the complication does more than it does"
   misconception rounds 4, 12 and 15 corrected in three other places — and the most consequential
   instance, because it sits in the README a future engineer would read _precisely_ when
   reintroducing a per-card complication, telling them a whole layer already exists. Rewritten to
   describe the static reality and to label the retained infrastructure as dormant.
2. **MINOR — three release workflows named the generator step "(Brands.swift)"**, one of its five
   outputs, in the real TestFlight/App-Store/beta pipelines. Renamed, so someone triaging release
   build time or output size can see that step also bakes in 57 image assets.
3. **NIT — the README's directory tree said `Generated/ ← gitignored` and listed one file.** Both
   wrong since this story: the contents are committed and drift-checked, and there are three. Fixed —
   the same false "generated files are gitignored" claim round 1 corrected in `docs/architecture.md`.
4. **NIT — `docs/cicd.md`'s maintained "Last updated" byline** was not bumped despite two content
   edits. Bumped.

The reviewer also checked `docs/epics.md`'s stale 16.29 entry and correctly did **not** report it:
that file declares `sprint-status.yaml` as its authoritative source, and leaving superseded story text
unsynced there is the established convention.

**Round 22 (Sonnet, read-only, final sign-off) — CHANGES REQUESTED: 1 minor, 1 nit.** Both acted on.
It re-ran every gate and independently compiled the watch app's asset catalogue again (zero warnings,
57/57 images in `Assets.car`, byte-identical size), and found nothing outside the file round 21 had
just rewritten.

1. **MINOR — round 21's rewrite dropped a supported family.** I wrote "`accessoryCircular`/
   `accessoryRectangular`/`accessoryInline`" where `WatchComplicationWidget.swift` declares four,
   including `accessoryCorner` — and the text I replaced had it right. `accessoryCorner` is not
   vestigial: `ComplicationImage.swift` sizes the icon against the corner slot's budget precisely
   because it is the strictest. Restored, with that reason attached. **A correcting edit that
   introduced a new inaccuracy of its own is the third instance of that pattern in this loop** (round
   4's fix broke round 3's; round 5's broke round 4's), and the same reason each was caught only by
   the next round.
2. **NIT — the "retained but dormant" inventory was incomplete.** It named the App Group snapshot and
   `BrandLogoCatalog` but not `WidgetCardPalette.swift` (which the widget's own header comment lists
   alongside them) or the `WatchComplicationDeepLink` parser and `.onOpenURL` routing still sitting in
   `CardListView.swift` for `myloyaltycards://watch-card?id=…` — a URL nothing in the repo constructs.
   Someone scoping the reintroduction would have re-derived both. Both now named, with the grep result
   that proves the deep link has no producer.

**Round 23 (Sonnet, read-only, final sign-off) — VERDICT: APPROVED, zero findings.** It checked every
claim in round 22's two rewritten bullets against the source line by line (four families and their
order, `StaticConfiguration` + plain `TimelineProvider` + `policy: .never`, the widget URL, the absence
of any `AppIntent` type, `ComplicationImage`'s corner budget, `WidgetCardPalette`'s threshold matching
`ColorHelpers`' 0.4 and `CARD_COLORS`, the deep-link constants and `.onOpenURL` wiring, and that the
extension reads none of it) and confirmed all of them exactly true. It re-ran every gate, built the
watch target, and inspected **both** compiled `Assets.car` files with `assetutil`: 57 `BrandLogo-*`
entries in each, no warnings referencing any of them.

Its one candidate was a pre-existing README error it correctly declined to raise as a finding: the
directory tree showed `Scripts/generate-catalogue.swift` nested under `targets/watch/` when the
generator has always lived at `watch-ios/Scripts/`. Fixed here anyway — it is one line, in a file this
story was already rewriting, describing the very generator this story extends — along with listing the
two new test files.

**The review loop closed here: 23 rounds, 0 blockers, 8 majors, 34 minors and 46 nits found and
resolved.** The majors are worth reading as a set, because none of them were in the feature code: a
`.gitignore` rule that would have left the watch app's only definition of `BrandLogoCatalog`
uncommitted; a CI drift gate that regenerated before checking and so could never fail; the same gate's
trigger paths excluding the generator's own inputs; a "collect all failures" refactor that a later fix
kept re-breaking (three times); a non-atomic mirror write that could destroy both copies; and two
input-validation gaps that would each have shipped a blank row with every gate green.

## QA Review

**QA round 1 (Sonnet, read-only) — CHANGES REQUESTED: 1 major, 2 minor, 1 nit.** Acted on. This was a
separate pass with a different question from the 23 code-review rounds: _does the change meet its ACs,
and is the testing enough to trust it?_ The reviewer audited AC1-AC9 individually, reproduced the build,
re-derived the light/dark classification from its own from-scratch luminance code, and confirmed AC7's
`Assets.car` byte count exactly. AC2, AC3, AC4, AC6, AC7, AC8 satisfied; AC5 satisfied by source plus
documented API behaviour but not by an actual VoiceOver run (folded into AC9); AC9 open.

**MAJOR — AC1 is false for one of the 57 brands, and no gate could have told us.**
`BrandLogo-stroili` ships **blank**: I independently confirmed it is the only imageset of the 57 that is
100% opaque with zero luminance variance — a uniform white rectangle with no mark in it. Root cause is
upstream in `assets/images/brands/stroili.svg`, which references `class="cls-1"` seven times and never
defines it, so it rasterized to nothing. **Pre-existing** (the asset landed long before this story) but
**first exposed to users by this story**, since the complication's per-card path was dormant and the
card list drew initials. A Stroili cardholder would see a blank disc where they used to see "ST" —
worse than the fallback it replaces, in exactly the checkout scenario the story exists to serve.

Actions taken, with the scope line held: **the artwork itself is not changed here** — "changing the logo
artwork" is explicitly out of this story's scope, and the fix belongs with the SVG and the rasterization
pipeline.

1. **The generator now detects it.** `averageLuminanceOverOpaquePixels` became `logoPixelStats`,
   returning mean, standard deviation and opaque fraction from the pass it was already making, and any
   logo that is fully opaque with zero variance is **warned** about by name, pointing at the SVG. A
   _warning_, not a gate: one such asset is already committed, so failing would block this story on an
   out-of-scope artwork fix. The code says to promote it to a hard failure once stroili is fixed.
2. **Two tests**, one proving the detector fires on a synthetic uniform PNG (written by a new
   `writeUniformPNG` test helper), one proving it does **not** fire on the real catalogue — because 20
   of the 57 logos are solid single-colour wordmarks with zero variance too, over the part of the image
   they cover. That distinction is the whole check: blank means _fully opaque_ and uniform.
3. **AC9 now names `stroili`** as the dark-backing brand to use. The reviewer's point was sharp: there
   are six dark-backing brands, so an arbitrary choice would have let a green device pass miss the one
   broken logo.
4. **Follow-up recorded** below for the artwork fix.

**MINOR/NIT — accepted, recorded.** The five wiring assertions in `watch-brand-logo-contract.test.ts`
are string-containment checks against Swift source and would survive a refactor that made
`resolvedBrand` always nil: real, and the disclosed house pattern for this repo's watch contract tests
(the file says so in its own header). The unexecutable Swift XCTests leave `prefersDarkBacking`'s and
`assetName`'s _behaviour_ without an executed Swift-level test — already follow-up 1. Neither is
introduced here, and both are named so nobody mistakes the green suite for behavioural proof.

**QA round 2 (Sonnet, read-only) — CHANGES REQUESTED: 1 major, 1 minor.** Both acted on. It first
re-verified round 1's fix independently: reimplemented `logoPixelStats`/`isBlank` in a standalone
script, ran it over all 57 real logos, and got `isBlank == ["stroili"]` and a light set bit-for-bit
identical to both committed generated files — so the refactor did not move the classification. It also
probed the margins: the closest non-blank logo to the fully-opaque axis is `blukids` (std 51.9 vs
stroili's 0) and to the zero-variance axis is `pandora` (opaque 0.619 vs stroili's 1.0). No near-miss on
either axis.

1. **MAJOR — the test I wrote to prove the detector does _not_ fire on real assets could never fail.**
   `runGenerator()` wraps `execFileSync`, which returns **stdout only**, and every warning goes to
   stderr — so `expect(output).not.toContain('rasterized to a uniform rectangle')` was vacuously true
   regardless of what the detector did. Galling detail: the sibling test six lines above carried a
   comment about exactly this pitfall, and I applied the workaround there and not here. Confirmed by
   splitting the two streams to separate files: the warning appears only on stderr. Fixed with a
   `runGeneratorCapturingBothStreams` helper (`spawnSync`, both streams), and the assertion is now
   stronger than before — it requires **exactly one** blank warning naming `stroili`, so any logo
   wrongly flagged fails it. **Then I mutation-tested it**: flipping `&&` to `||` in `isBlank` (the
   reviewer's own suggested mutation) now fails the test; before the fix it would have stayed green
   with ~25 of 57 logos wrongly flagged.
2. **MINOR — the add-a-brand checklist covered the `Contents.json` trap but not the blank-artwork
   one.** A contributor whose SVG has stroili's defect would get a non-fatal stderr warning nothing
   told them to look for — reproducing this very defect with every gate green. The checklist now says
   to read the generator's warnings, what the uniform-rectangle one means, and names stroili as the
   live example.

The reviewer also noted, without raising them as findings, that AC7's size figure is a Debug/simulator
measurement rather than a thinned Release one, and that nothing tests decode performance for 57 real
bitmaps in a scrolling list. Both are fair characterisations of what AC9's device pass covers; neither
changes the recorded number's purpose (directional, informational).

**QA round 3 (Sonnet, read-only) — CHANGES REQUESTED: 1 minor, 2 nit.** All acted on. It re-verified
round 2's fix from scratch — ran the generator directly with the streams split, confirmed the warning
appears only on stderr, and reproduced the `&&`→`||` mutation itself (14 of the 57 real logos falsely
flagged, so `toHaveLength(1)` fails decisively). It also swept every subprocess-derived assertion in
the watch test files against whether the generator writes that text to `print` or `fputs(…, stderr)`
and found no other instance of the round-2 defect class.

1. **MINOR — the recorded watch-suite total was stale again** (99 vs the actual 102). Fourth
   occurrence in this story, now surviving into the QA phase. Fixed, and the line now says to treat
   the command as the source of truth rather than the number — the number is a snapshot that every
   test-adding round invalidates, and four rounds of re-fixing it is enough evidence that recording it
   as a bare fact was the wrong shape.
2. **NIT — my own new test helper introduced two `import/order` lint warnings**, which also means the
   Debug Log's "`yarn lint` clean" was true only of _errors_. Fixed with `--fix`; the repo is back to
   exactly the three pre-existing warnings that belong to story 16-24.
3. **NIT — the blank-artwork thresholds were unpinned.** The reviewer went past round 2's mutation and
   found the sharper one: loosening `0.01`→`0.1` or `0.999`→`0.99` _on its own_ produces byte-identical
   output against today's 57 assets, so no fixture-based test can distinguish a one-digit typo. Added a
   source-text assertion pinning both literals — the same approach the contract suite already uses for
   the inset formula, and the only cheap way to catch that class of slip.

**QA round 4 (Sonnet, read-only) — QA VERDICT: PASS, zero findings.** It re-ran round 3's three fixes
rather than trusting them: the 102-test count reproduced exactly, `yarn lint` (0 errors / the 3
pre-existing 16-24 warnings) and `yarn format:check` verified clean _simultaneously_ — the specific
thing round 3's `--fix` had briefly broken — and the threshold-pinning test proved to fail on a
mutated copy of the generator while passing against the real one. It re-audited AC1-AC9 with no status
change, rebuilt the watch target and reproduced AC7's `Assets.car` byte count exactly (666,024), and
ran both suites clean (102 watch / 2184 repo).

It named one gap no earlier round had: **CI never inspects `actool`'s own asset-catalog warnings.**
`watch:build:ci` is a plain `xcodebuild build`, so a non-fatal actool warning cannot fail it, and the
generator's Node-side consistency checks — thorough as rounds 14-17 made them — are a reimplementation
of actool's rules rather than an assertion on its real output. Recorded as a follow-up rather than
fixed: parsing build logs for warnings is its own mechanism, and every shape we know of is already
gated on the generator side.

**Both loops are now closed: 23 code-review rounds (APPROVED, zero findings) and 4 QA rounds (PASS,
zero findings). AC1-AC8 are satisfied; AC9 (device verification) is open and is @ifero's to close —
use `stroili` as the dark-backing brand, since its artwork is the one known-broken asset.**

### Follow-ups — flagged, not fixed

1. **No watchOS unit-test target.** `watch-ios/Tests/*.swift` (4 files) is dead weight: not in the
   generated project, so `CardRowHelpersTests`, `BarcodeGeneratorTests` and `CardStoreTests` have never
   run in CI or locally. Either wire a test target through `@bacons/apple-targets` or stop pretending
   these are tests. Worth a story — three stories have now added assertions to files that cannot execute.
2. **`@3x` renditions are dead weight on watchOS**, in both targets — no Apple Watch renders at 3×. If
   app size ever matters, dropping them is a ~⅓ cut of 1.6 MB of source and the cheapest lever, ahead of
   any un-mirroring. Not done here: "changing logo artwork" is explicitly out of scope, and I could not
   confirm the watchOS scale set from primary docs within this story.
3. **`watch-ios/xcfilelists/*.xcfilelist` are vestigial.** `generate-catalogue-outputs.xcfilelist`
   lists only `Brands.swift` — it never learned about the widget catalog, let alone the two new outputs.
   Nothing reads these files any more: the build phase they were written for (Story 5.8) disappeared when
   `expo prebuild` took over project generation. Delete them or re-wire them; leaving a stale outputs
   list is worse than either.
4. **`docs/architecture.md`'s Wear codegen path is still wrong** —
   `watch-android/scripts/generate-catalogue.kts` does not exist (it is `scripts/generate-wear-catalogue.mjs`).
   Outside this story's mechanism, so left alone.
5. **The catalogue Jest suite recompiles the generator per test** (~72 s for 50 tests). Compiling once
   is blocked by `resolvePaths` deriving the repo root from the script's own path and asserting its
   parent is `watch-ios` — see review round 6, item 4. If the suite keeps growing, the fix is a
   deliberate decision about that guard, not a test-only workaround.
6. **A symlinked shared source is viable** — proven by a clean-build spike (see review round 1, item 7):
   Xcode's synchronized groups do follow a symlink into another target's folder. If the project ever
   adopts a symlink convention deliberately, `generateResolverMirrorSource`, `watchResolverOutputURL`
   and one `--check` branch all become unnecessary. Not adopted here because it rests on undocumented
   Xcode behaviour and would be this repo's only symlink.
7. **`BrandLogo-stroili` is blank and needs new artwork.** `assets/images/brands/stroili.svg`
   references an undefined `cls-1` class seven times; regenerating the imageset from a fixed SVG (and
   the phone-side asset) is the actual fix. When it lands, promote the generator's blank-artwork
   warning to a hard failure — the check is written and tested, only its severity is held back by this
   one asset. **Highest-value follow-up on this list: it is a live, user-visible defect.**
8. **`runGenerator`'s write path is still inline** while check mode is extracted into `runCheck`, so
   the function does more than its sibling (review round 9, item 5). Worth extracting when someone is
   already editing it for another reason — not on its own, given the rounds-4/5/8 history of
   restructuring that function.
9. **CI does not inspect `actool`'s own warnings.** `yarn watch:build:ci` is a plain `xcodebuild
build`, so a non-fatal asset-catalog warning ("unassigned child", a missing declared file) cannot
   fail it; the generator's own consistency checks cover every shape we know of, but they are a
   reimplementation of actool's rules, not an assertion on its output. Parsing the build log for
   warnings would close the gap for shapes nobody has thought of yet (QA round 4).
10. **The generator still hashes inputs only** (the open Epic 10 retro action item for the Swift side).
    Not fixed here, but the new outputs are not exposed to it: every output is existence-checked and the
    imageset mirror is content-checked before the "inputs unchanged" fast path can skip, and a test
    (`re-mirrors a deleted imageset even though the input hash is unchanged`) pins that.

### Change Log

| Date       | Change                                                                                  |
| ---------- | --------------------------------------------------------------------------------------- |
| 2026-09-03 | Implemented AC1–AC8. AC9 (device verification) remains open — needs a real Apple Watch. |
