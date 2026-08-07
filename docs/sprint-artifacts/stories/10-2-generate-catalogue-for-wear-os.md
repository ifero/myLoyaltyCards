---
baseline_commit: 7837f359540c72c30edcf392e1a897fa99ab9752
---

# Story 10.2: Generate the catalogue for Wear OS [Enabling]

Status: done

Epic: 10 — Wear OS App

> **Gates run inside a `.claude` worktree too, once you `yarn install` there.** `jest.config.js`
> anchors its `.claude` ignore patterns to `<rootDir>`, so a worktree runs its own suite instead of
> finding zero tests. A worktree with no `node_modules` fails on missing dependencies instead — a
> different problem. Native builds (`yarn watch:build`, `./gradlew`) still need the **main checkout**:
> `ios/`, `android/` and `.expo/` are gitignored and absent in a fresh worktree. `--no-verify` stays
> forbidden either way.
>
> **Depends on 10-1** — needs `watch-android/` to exist. Do not start before it merges.
>
> **⚠️ This story deliberately CONTRADICTS three of Epic 10's written ACs for Story 10.2.**
> `docs/epics.md` says the generated file goes in `.gitignore` and that the Gradle build runs the
> generator before compiling. The project **rejected that design for watchOS in Story 5-8** and settled
> on commit-the-artifact-plus-a-CI-drift-check. Following the epic text would silently drop the drift
> guard and diverge the two watch platforms. See
> [Superseding the epic](#superseding-the-epic-text) — overrule it there if you disagree, not in code.

## Story

As a developer,
I want the Italian brand catalogue available as Kotlin source,
so that the Wear OS app has brand data with no JSON parsing, no file I/O and no failure mode at
runtime.

## Context

### The single source of truth

`catalogue/italy.json` — `{ version, brands[] }`, **56 brands** today. Each brand:

```json
{
  "id": "esselunga",
  "name": "Esselunga",
  "aliases": ["fidaty", "market", "grocery"],
  "logo": "esselunga",
  "color": "#FFCC00"
}
```

`catalogue/types.ts` is the TS contract; `catalogue/italy.test.ts` guards the data. Neither changes here.

### How watchOS solves this today (the mirror)

`watch-ios/Scripts/generate-catalogue.swift` (488 lines) reads `catalogue/italy.json` and emits
`targets/watch/Generated/Brands.swift`. Relevant mechanics, all worth copying:

- **Deterministic output.** Sorted, stable literal emission (`swiftStringLiteral`, `aliasesLiteral`,
  `brandIdSetLiteral`) — a byte-stable artifact is what makes a drift check possible at all.
- **Repo-relative provenance.** `repoRelativePath()` keeps the generated `Source:` header comment
  identical across checkout locations instead of baking an absolute machine path. Copy this; it is the
  difference between a drift check that works on two machines and one that doesn't.
- **Input hashing for incremental skip** (`computeSHA256`, `readStoredHash`, `writeStoredHash`) — Story
  5-8's contribution, so an unchanged catalogue doesn't re-run the generator on every build.
- **A `--check` mode** that regenerates and compares against the committed artifact, failing with a
  clear message ("Committed Brands.swift is missing. Run the generator without --check to create it.").
  Wired as `yarn check:catalogue-generated` and enforced in CI.
- **Test-safety.** Under test it writes to a throwaway path so the tracked artifact is never mutated
  (`generate-catalogue.swift:154`, `:163`).

### The generated artifact is COMMITTED — verified, not assumed

```
.gitignore:65   targets/watch/Generated/*
.gitignore:66   !targets/watch/Generated/Brands.swift
```

The directory is ignored; **the artifact is explicitly un-ignored**. `git ls-files` confirms
`targets/watch/Generated/Brands.swift` is tracked. The same pattern applies to
`targets/watch-widget/Generated/BrandLogoCatalog.generated.swift` (`.gitignore:70-71`).

This is not a one-off. It is the project's **house pattern for generated code**, applied three times
with a drift gate each:

| Artifact                               | Generator                                    | Drift gate                       |
| -------------------------------------- | -------------------------------------------- | -------------------------------- |
| `shared/theme/tokens.generated.ts`     | `scripts/build-tokens.mjs`                   | `yarn tokens:check`              |
| `assets/splash-icon.png`               | `scripts/build-splash-icon.mjs`              | `yarn splash:check`              |
| `targets/watch/Generated/Brands.swift` | `watch-ios/Scripts/generate-catalogue.swift` | `yarn check:catalogue-generated` |

`docs/project-context.md` states the rule directly: never edit the generated file, edit the source and
run the build script; the check guards drift "in CI **and** pre-push".

### Superseding the epic text

`docs/epics.md` Story 10.2 asks for: a `/watch-android/scripts/generate-catalogue.kts` script, output
in a generated folder, **the generated file in `.gitignore`**, and **the build running the script before
compiling**. Three of those four are superseded here:

| Epic AC                               | This story                                        | Why                                                                                                                                                    |
| ------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Generated file in `.gitignore`        | **Committed**, directory ignored, file un-ignored | Matches watchOS + tokens + splash. A gitignored artifact cannot be drift-checked, so a stale catalogue would ship silently                             |
| Gradle runs the generator pre-compile | Gradle just **compiles** the committed file       | Follows directly from committing it. Keeps the Wear OS build free of a Node/Kotlin-script step and keeps `assembleDebug` fast and hermetic             |
| Script is `generate-catalogue.kts`    | **Node** — `scripts/generate-wear-catalogue.mjs`  | Matches the repo's two existing `.mjs` generators, needs no Kotlin compiler, and lets the drift check be a plain `yarn` script like its three siblings |

The `.kts` objection ("but then Gradle needs Node") dissolves once the artifact is committed: **the
Gradle build never runs the generator.** Node is needed only when the catalogue changes, in a dev or CI
context where Node is already installed and pinned by `.nvmrc`.

`docs/sprint-artifacts/README.md` records that `docs/epics.md` is regenerated _from_ the tracker and is
the drifted plan, not the authority — which is exactly the situation here. Epic 10 was drafted before
Story 5-8 taught the project this lesson.

## Acceptance Criteria

**AC1 — Generator exists and is deterministic.**
`scripts/generate-wear-catalogue.mjs` reads `catalogue/italy.json` and writes
`watch-android/.../Brands.kt` (path per Open Decision 1). Output is byte-stable across runs and across
checkout locations: brands emitted in a deterministic order, and any provenance comment uses a
**repo-relative** source path, never an absolute one.

**AC2 — Generated Kotlin is idiomatic and complete.**
A Kotlin data class (or `data object` holder) exposing all 56 brands with every field —
`id`, `name`, `aliases`, `logo`, `color` — plus the catalogue `version`. Immutable (`val`), no runtime
JSON parsing, no file I/O, no reflection. String literals correctly escaped. A file header states it is
generated, names the generator, and says "do not edit".

**AC3 — Field parity with the phone and the watchOS catalogue.**
Every field present in `Brands.swift` is present in `Brands.kt`, with the same names and semantics. No
field is dropped, renamed, or re-typed. A brand with `aliases: []` and one with a null-ish optional
must both round-trip correctly — mirror how `aliasesLiteral` / `optionalLiteral` handle those cases
rather than inventing new conventions.

**AC4 — Committed artifact + gitignore shape.**
`Brands.kt` is **committed**. `.gitignore` ignores its containing generated directory and explicitly
un-ignores `Brands.kt`, mirroring `.gitignore:65-66` including comment style. Verify with
`git ls-files` that the artifact is tracked and with `git status --porcelain` that nothing else in that
directory is.

**AC5 — `--check` drift mode.**
`node scripts/generate-wear-catalogue.mjs --check` regenerates into memory (or a throwaway path — never
over the tracked file) and exits non-zero on any difference, with a message naming the fix command.
Exposed as a `yarn` script named consistently with its siblings (`tokens:check`, `splash:check`).
A missing committed artifact is a distinct, clearly-worded failure, as in the Swift generator.

**AC6 — Drift gate wired into pre-push and CI.**
Added to `.husky/pre-push` alongside `tokens:check` and `splash:check`, and to the PR quality gates so
a catalogue change that forgets to regenerate **fails**. This is the whole point of the story; a
generator without a gate is a suggestion.

**AC7 — Incremental skip.**
An unchanged `catalogue/italy.json` + unchanged generator does not rewrite the artifact (input hashing,
mirroring `computeSHA256`/`readStoredHash`/`writeStoredHash` in the Swift generator). Rewriting a
byte-identical file is acceptable; producing a spurious `git diff` is not.

**AC8 — The Wear OS module compiles against it.**
`./gradlew assembleDebug` in `watch-android/` compiles with `Brands.kt` present and requires **no**
generator step. No Node, no `.kts`, no codegen task in the Gradle build.

**AC9 — Tests.**
Co-located `*.test.ts`/`*.mjs`-adjacent tests (never a `__tests__/` folder — CI-enforced) covering:
determinism across two runs; `--check` passing on a fresh generate; `--check` failing on a mutated
artifact; correct escaping of a name containing a quote or backslash; empty-`aliases` handling; and all
56 brands present. Follow `scripts/`-generator test precedent rather than inventing a harness.

**AC10 — Documentation.**
`watch-android/README.md` gains a section: what is generated, how to regenerate, that the artifact is
committed on purpose, and that the drift check gates pre-push and CI. Add the Wear OS step to the
add-a-brand path so the next brand addition cannot forget it.

**AC11 — No regression.**
`yarn lint`, `yarn typecheck`, `yarn test`, `yarn tokens:check`, `yarn splash:check`,
`yarn check:catalogue-generated`, `yarn watch:build` all pass from the main checkout. The watchOS
generator and its artifact are untouched.

## Tasks / Subtasks

- [x] **Task 1 — Write the generator (AC: 1, 2, 3)**
  - [x] `scripts/generate-wear-catalogue.mjs`, modelled on `scripts/build-tokens.mjs` for CLI/`--check`
        shape and on `watch-ios/Scripts/generate-catalogue.swift` for emission logic.
  - [x] Port the literal-escaping helpers to Kotlin equivalents. Kotlin string literals differ from
        Swift: `$` is a template character and **must** be escaped in addition to `\` and `"`. The
        catalogue has no `$` today, but a future brand name or alias could — handle it now.
  - [x] Read `version` from the catalogue and expose it; a version-less generated catalogue makes 10-6's
        sync debugging harder.
  - [x] Emit a repo-relative `Source:` header comment (port `repoRelativePath`).

- [x] **Task 2 — Determinism + incremental skip (AC: 1, 7)**
  - [x] Sort brands by `id` before emitting. Never rely on JSON key order.
  - [x] SHA-256 the inputs (catalogue JSON **and** the generator itself) into a sidecar hash file;
        short-circuit when unchanged. Gitignore the sidecar — it is machine state, not an artifact.

- [x] **Task 3 — `--check` mode and gates (AC: 5, 6)**
  - [x] Implement `--check` so it never writes over the tracked artifact.
  - [x] Add the `yarn` scripts to `package.json`, named to match the sibling gates.
  - [x] Add to `.husky/pre-push` next to `tokens:check` / `splash:check`.
  - [x] Add to the PR quality-gate workflow. If `check:catalogue-generated` already has a job, extend
        that job rather than adding a new one.

- [x] **Task 4 — Commit the artifact correctly (AC: 4, 8)**
  - [x] Generate `Brands.kt`, commit it, add the `.gitignore` ignore-dir + un-ignore-file pair.
  - [x] `./gradlew assembleDebug` from `watch-android/` to prove it compiles with no codegen step.

- [x] **Task 5 — Tests and docs (AC: 9, 10, 11)**
  - [x] Write the AC9 tests.
  - [x] Update `watch-android/README.md` and the add-a-brand documentation.
  - [x] Run the full gate suite (JS gates in any installed checkout; native builds from the main
        checkout).

## Dev Notes

### Files to touch

| File                                      | Change                                                          |
| ----------------------------------------- | --------------------------------------------------------------- |
| `scripts/generate-wear-catalogue.mjs`     | **NEW** — the generator                                         |
| `scripts/generate-wear-catalogue.test.ts` | **NEW** — co-located tests (AC9)                                |
| `watch-android/.../Brands.kt`             | **NEW, COMMITTED** — the generated artifact                     |
| `.gitignore`                              | UPDATE — ignore dir, un-ignore `Brands.kt`, ignore hash sidecar |
| `package.json`                            | UPDATE — generate + check scripts                               |
| `.husky/pre-push`                         | UPDATE — add the drift check                                    |
| `.github/workflows/ci-quality-gates.yml`  | UPDATE — enforce the drift check                                |
| `watch-android/README.md`                 | UPDATE — AC10                                                   |

**Do not touch:** `catalogue/italy.json` (this story consumes it), `watch-ios/**`, `targets/**`, or the
watchOS generator and its artifact.

### Anti-patterns — do NOT do these

| ❌ Don't                                              | ✅ Do instead                                                                                 |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Gitignore `Brands.kt` because `docs/epics.md` says so | Commit it + drift-check. Three existing artifacts do exactly this; the epic text predates 5-8 |
| Add a Gradle codegen task or a `.kts` script          | Node generator, committed output, Gradle only compiles                                        |
| Parse `italy.json` at runtime on the watch            | The whole point is zero runtime parsing                                                       |
| Emit brands in JSON key order                         | Sort by `id` — non-determinism breaks the drift check                                         |
| Bake an absolute path into the generated header       | Repo-relative (port `repoRelativePath`)                                                       |
| Let `--check` write over the tracked file             | Throwaway path or in-memory compare                                                           |
| Escape only `\` and `"` in Kotlin literals            | Also `$` — Kotlin string templates                                                            |
| Hand-edit `Brands.kt` to fix something                | Fix the generator; the drift gate will catch you anyway                                       |
| Create a `__tests__/` folder                          | Co-locate `*.test.ts` — banned and CI-enforced via `yarn check:no-tests-folders`              |
| Add brand **logo images** here                        | Data only. See Out of scope #1 — this is a real gap needing a home                            |

### Testing requirements

- `features/**`, `core/**`, `shared/**` are coverage-measured at 80 %
  global; `scripts/` is **not** in `collectCoverageFrom`, so these tests do not move the coverage
  number — write them for correctness, not for the gate.
- The most valuable test is the **negative** one: mutate the committed artifact, assert `--check` fails.
  A drift gate that cannot fail is worse than none, because it reads as protection.

### Previous story intelligence

**Story 5-2** built the original watchOS generator; **Story 5-8** made it incremental and added the CI
drift check. 5-8 is the more important read: it is where the project chose commit-plus-check, and its
AC4 ("Keep generated file committed") is the direct precedent this story follows over the epic text.

**Story 16-4 (DTCG tokens)** made the identical call for design tokens — "COMMIT `tokens.generated.ts`
(+ `tokens:check` drift guard)". Two independent stories reaching the same conclusion is what makes
this a pattern rather than a preference.

**Story 16-17** added `scripts/build-splash-icon.mjs` with `yarn splash:check` in pre-push **and** CI —
the most recent instance, and the closest model for a new `.mjs` generator plus gate. Note its story
explicitly called out closing "the story's own 'no rasterization script' gap": a generated artifact
without a generator script is technical debt the project has already paid off once.

**The add-a-brand path is currently four steps** (catalogue JSON → app SVG → `brandLogos.ts` → watch
imageset PNGs, then regenerate `Brands.swift`). This story adds a fifth. AC10 exists because an
undocumented step in a manual checklist will be missed.

## Out of scope — flagged, not fixed

1. **Brand logo assets — deliberately NOT needed, and this is worth knowing.** The watchOS card list
   renders **initials on a brand-coloured circle**, not artwork: `CardListView.swift:372-389` uses
   `initials(from: brand.name ?? brand.id)` for catalogue brands and `initials(from: card.name)` for
   custom cards, over a colour resolved from the brand hex. So `Brands.kt`'s `name` + `color` are
   sufficient for 10-3, and **no Wear OS drawable pipeline is required by Epic 10 as scoped.** The
   `logo` field is still generated (AC3 field parity) but has no consumer yet.
2. **A Wear OS complication** — the parked Epic 5 generic-complication follow-up, which has **no story
   number**. This is the only thing that would need real artwork plus the per-logo luminance analysis
   the watchOS widget uses (`generate-catalogue.swift:247+`, `lightLuminanceThreshold = 200`, to decide
   when a light logo needs a dark chip behind it). If that story is ever written, the Wear OS drawable
   pipeline belongs to it, not here. **Worth raising with @ifero that Epic 10 has no complication
   story** even though the Epic 5 follow-up was parked into this epic.
3. **Catalogue OTA updates.** Story 3-5 ships catalogue updates over the air to the phone. The watch
   catalogue is compiled in, so it only changes with a new watch APK. That asymmetry is pre-existing on
   watchOS and out of scope, but worth stating in the README so nobody expects OTA parity.
4. **Localising brand names.** Not localised on watchOS either.

## Open Decisions — binding defaults, implement as written

1. **Path: `watch-android/<app-module>/src/main/kotlin/<package>/Generated/Brands.kt`**, mirroring the
   `Generated/` directory convention of `targets/watch/Generated/`. Adjust the module/package segment to
   whatever 10-1 actually scaffolded — the invariant is a `Generated/` directory holding exactly one
   committed file.
2. **Node (`.mjs`), not Kotlin (`.kts`)** — supersedes the epic. Rationale in
   [Superseding the epic](#superseding-the-epic-text).
3. **Commit the artifact; gate with `--check`** — supersedes the epic. Same rationale.
4. **Gradle does not invoke the generator.** Follows from (3). Keeps `assembleDebug` hermetic and
   Node-free.
5. **One file, not one-file-per-brand.** 56 brands is small; a single deterministic file is trivial to
   diff and drift-check.
6. **Do not extend the Swift generator to also emit Kotlin.** A second output language would couple the
   two watch platforms' build steps and put Kotlin emission behind Xcode's build-phase machinery. Keep
   them independent, as the platforms are.

## References

- `catalogue/italy.json` — 56 brands, `{ version, brands[] }`; `catalogue/types.ts` the TS contract
- `watch-ios/Scripts/generate-catalogue.swift` — the mirror generator; `:63-101` literal helpers,
  `:109-121` `repoRelativePath`, `:122-182` path resolution + test-safety, `:183-205` input hashing,
  `:213+` emission, `:247+` logo luminance (out of scope here)
- `targets/watch/Generated/Brands.swift` — the committed artifact to mirror in shape
- `.gitignore:65-66`, `:70-71` — ignore-dir + un-ignore-file pattern (AC4)
- `scripts/build-tokens.mjs`, `scripts/build-splash-icon.mjs` — `.mjs` generator + `--check` precedents
- `.husky/pre-push` — where `tokens:check` and `splash:check` are wired
- `package.json` — `tokens:build`/`tokens:check`, `splash:build`/`splash:check`,
  `check:catalogue-generated` naming convention
- `docs/sprint-artifacts/stories/5-2-generate-catalogue-for-watchos.md` — original mirror story
- `docs/sprint-artifacts/stories/5-8-incremental-catalogue-generation.md` — AC4 "keep generated file
  committed"; the precedent that overrides the epic text
- `docs/sprint-artifacts/stories/16-4-design-tokens-dtcg-style-dictionary.md` — same call for tokens
- `docs/epics.md` — Epic 10 Story 10.2's ACs (three superseded; see above)
- `docs/sprint-artifacts/README.md` — `epics.md` is regenerated from the tracker, not authoritative
- `docs/project-context.md` — never edit generated files; drift guarded in CI and pre-push

## Dev Agent Record

### Agent Model Used

claude-opus-5 (implementation), claude-sonnet-4-5 (code review + QA review subagents)

### Debug Log References

**Kotlin escape set verified against the real compiler, not just the docs.** The `$` and `\uXXXX`
branches of the escaper are unreachable from the real catalogue, so nothing in the shipped build would
ever compile them. A throwaway `EscapeProbeTemp.kt` was generated from a fixture containing `\`, `"`,
`$`, `${…}`, `\n\t\r\b`, a form feed, `U+0000`, `U+001F`, `U+007F` and `U+009F`, compiled with
`./gradlew compileDebugKotlin` (Kotlin 2.4.10 / AGP 9.3.1) — **BUILD SUCCESSFUL** — then deleted. The
escape list itself was taken from kotlinlang's Characters reference via Context7, which confirms exactly
`\t \b \n \r \' \" \\ \$` plus `\uXXXX` and **no `\f`**.

**APK contents checked.** `unzip -l app-debug.apk` confirms the `.catalogue-inputs.sha256` sidecar does
not ship: it sits in a Kotlin _source_ directory, which is not packaged. `./gradlew lintDebug` also
passes, so the `Generated/` directory + lowercase package causes no Android-lint complaint.

**Gate runs (all from the main checkout):** `yarn lint` (0 errors; 3 pre-existing
`react-hooks/exhaustive-deps` warnings in `app/_layout.tsx`, `CreateAccountScreen.tsx`,
`BarcodeScanner.tsx` — untouched by this story), `yarn typecheck`, `yarn format:check`, `yarn test`
(**173 suites / 2087 tests**, up one suite), `yarn tokens:check`, `yarn splash:check`,
`yarn wear:catalogue:check`, `yarn check:no-tests-folders`, `yarn check:story-catalogue-sync`,
`yarn check:native-patches`, `yarn check:native-strings`, `yarn check:catalogue-generated`,
`yarn watch:build` (**BUILD SUCCEEDED**), `./gradlew assembleDebug` + `lintDebug`.

### Completion Notes List

**All 11 ACs satisfied.** Three decisions went beyond the literal AC text; each is called out below
because a reviewer should agree with them explicitly rather than discover them.

1. **The catalogue holds 57 brands, not 56.** The story says 56; `catalogue/italy.json` is now at
   version `2026-08-02` with 57. Nothing hardcodes a count — the generator emits whatever it reads and
   the tests assert against `catalogue.brands.length`, so the next brand needs no test edit.

2. **`defaultFormat` is emitted, though AC2 lists only `id`/`name`/`aliases`/`logo`/`color`+`version`.**
   `catalogue/types.ts` has a sixth, optional field (`defaultFormat`: 10 of 57 brands carry `EAN13` or
   `QR`). AC3 is the stricter constraint — "No field is dropped" and "one with a null-ish optional must
   round-trip correctly" — and `defaultFormat` is the _only_ optional field in the catalogue, so it is
   what AC3's optional case can refer to. Dropping it would also make Story 10-4 (barcode rendering)
   change the generator. It stays a `String?` rather than becoming an enum because AC3 forbids
   re-typing a field.

3. **Kotlin naming follows kotlinlang's conventions over `Brands.swift`'s spelling.** The generated
   accessors are `WearBrands.ALL` / `WearBrands.VERSION`, not `all` / `version`: the official rule is
   that `const val` and object `val`s holding deeply immutable data use SCREAMING*SNAKE_CASE. Field
   \_names* and semantics still mirror the catalogue exactly, which is what AC3 constrains.

**One improvement over the Swift generator it ports from.** The incremental-skip decision includes the
_output_ file's digest, not just the inputs'. The Swift version hashes inputs alone, which deadlocks a
hand-edited artifact: inputs still match, so `generate` skips and leaves the edit, while `--check` keeps
failing and telling you to run `generate`. Including the output digest makes a hand edit simply get
overwritten — which is what the story's own anti-pattern table ("Hand-edit `Brands.kt` → fix the
generator; the drift gate will catch you anyway") assumes happens. `watch-ios/Scripts/generate-catalogue.swift`
still has the latent version of this; not fixed here, per the story's do-not-touch list. **Flagged as a
follow-up.**

**Input validation added, following repo precedent.** The generator refuses an unknown catalogue field
rather than silently dropping it, and refuses duplicate brand ids (which would make the sort order — and
therefore the drift check — depend on how the JSON happened to be written). Both sibling generators
guard their inputs the same way (`assertWellFormed` in `build-tokens.mjs`, `assertSvgMatches` in
`build-splash-icon.mjs`); a generator that quietly ignores new input is how a field ends up present on
the phone and missing on the watch.

**Tests decode rather than substring-match.** `generate-wear-catalogue.test.ts` implements a Kotlin
string _unescaper_, independent of the generator's escaper, which buys two things: a full field-by-field
round-trip of all 57 brands against `catalogue/italy.json`, and a hard failure if the generator ever
emits an escape Kotlin does not define. 41 tests; `scripts/` is outside `collectCoverageFrom`, so they
move no coverage number by design. One of them runs `--check` against the **tracked** artifact, making
`yarn test` a third drift gate alongside pre-push and CI.

**Where the CI gate lives, and why not in the Wear job.** `yarn wear:catalogue:check` is in
`ci-quality-gates.yml`, not `wear-os-build.yml`. The Wear job is path-filtered to `watch-android/**`, so
a PR editing only `catalogue/italy.json` would never trigger it — the exact case the gate exists to
catch. A regenerated `Brands.kt` does trigger the Wear job, so the compile is covered too.

**AC4, AC6 and AC8 now have automated guards, which they did not at first.** The QA review's most
useful observation was that three ACs were _true_ but _unguarded_ — properties of files outside the
generator that nothing would notice regressing: a `.gitignore` edit that re-ignores `Brands.kt`, a
`pre-push` rewrite that drops the check, a Gradle codegen task creeping back in. Given AC6's own framing
("a generator without a gate is a suggestion"), leaving the gate itself ungated was the wrong place to
stop. A `gate wiring` describe block now asserts each of them, plus AC3's parity against
`Brands.swift`'s field list specifically — the two generators are independent, so nothing else would
catch a field added on one side only. The equivalent gap for `tokens:check` / `splash:check` is
pre-existing and repo-wide; **flagged as a follow-up**, not widened into this story.

**`defaultFormat` is validated against a derived enum, not a transcribed one.** QA noted the generator
would accept any string. It now checks against `barcodeFormatSchema`, **parsed out of
`core/schemas/card.ts`** rather than copied into the generator — the same choice
`build-splash-icon.mjs` makes for its SVG geometry, and for the same reason: a hand-maintained parallel
list goes stale silently, and here staleness would mean rejecting a format the phone app had legally
added. It fails loudly if that schema is ever refactored beyond regex reach, because skipping the
validation quietly would be worse than not having it.

**The generated KDoc's format list is derived too — and that changed the hashing decision.** QA's
sharpest catch: the first version derived only the _validation_ and left the KDoc's
"`CODE128`, `EAN13`, … or `UPCA`" a hand-typed literal, recreating in the documentation the exact
staleness the derivation existed to prevent. It is now interpolated from the same parsed list.

That has a consequence I got wrong the first time and am recording rather than quietly correcting:
having argued that `core/schemas/card.ts` should stay **out** of the input hash because it "constrains
what input is accepted, never what is emitted", deriving the KDoc makes it emitted — so the formats are
a real input and are hashed now.

**And a second correction, which QA had to make for me.** It is the KDoc interpolation _alone_ that
makes a schema change detectable: `--check` calls `runCheck(source)` and returns before any hash or
sidecar code runs, so the hash has nothing to do with it. What the hash inclusion actually buys is that
`yarn wear:catalogue:generate` no longer no-ops through its "inputs unchanged" fast path after a schema
change that does affect output. Two fixes, two different jobs — worth stating precisely, because
someone debugging this later would otherwise go hunting in the hash logic for behaviour that lives
entirely in `renderKotlin`.

The formats enter the hash as the extracted, **sorted** values rather than as `card.ts`'s bytes.
Sorting decouples the two modules — a phone-side contributor alphabetising the enum should not be told
to regenerate a Wear OS file — and hashing the values rather than the file means an unrelated edit to
`card.ts` (it also holds the card schemas, and is edited often) no longer invalidates the fast path.

**Two docs were already wrong and are fixed as part of this mechanism** (both describe the thing this
story builds, so leaving them stale would invite a future story to re-litigate the decision):

- `docs/architecture.md` still described `watch-android/scripts/generate-catalogue.kts` writing into a
  gitignored `generated/` folder "at build time" — the design this story supersedes, on all three
  counts.
- `CONTRIBUTING.md`'s "Exactly what runs, in order" list — which the doc itself says must be updated
  when a check is added — was **already missing `check:story-catalogue-sync`** (added in PR #200). Both
  it and `wear:catalogue:check` are now listed, and the Wear OS CI workflow got the table row it never
  had.

`watch-android/README.md`'s 10-1 statements were reconciled rather than appended to: "No unit tests run
— there are none … Stories 10-2 onward should add them" is now precise about _Kotlin_ unit tests still
being absent (10-2's logic lives in a Node generator tested by Jest), and the Scope table's 10-2 row is
struck through.

**Out of scope — flagged, not fixed:**

- **`docs/epics.md` Story 10.2 still documents the superseded design** (gitignored artifact, Gradle
  codegen, `.kts`). Deliberately not edited: `docs/sprint-artifacts/README.md` records that `epics.md` is
  regenerated from the tracker, and `check:story-catalogue-sync` gates its heading structure. The
  contradiction is documented in this story, in the generator's header and in the Wear README.
- **`watch-ios/Scripts/generate-catalogue.swift` has the hand-edit deadlock** described above.
- **Epic 10 has no Wear OS complication story**, though the Epic 5 generic-complication follow-up was
  parked into this epic — and a complication is the only surface that would need real brand artwork plus
  the per-logo luminance analysis. Worth a story number, @ifero. (Carried forward from the story's own
  Out-of-scope #2.)
- **No Kotlin unit tests and no Android lint in CI** for `watch-android/` — pre-existing 10-1 gaps,
  recorded in that README's Known gaps.
- **`tokens:check` and `splash:check` have no wiring guard**, the gap this story closed for its own gate.
  Repo-wide pattern; deliberately not widened into this story.
- **No `.gitattributes` pins line endings.** The generator only ever writes `\n`, so CRLF cannot enter
  through it, but a contributor with `core.autocrlf=true` on Windows could in principle check out a CRLF
  copy and see the drift check fail. Pre-existing and shared identically by all three sibling generated
  artifacts (tokens, splash, `Brands.swift`), so it is a repo-level decision, not this story's.

### Review Record

**Code review (Sonnet, fresh context): APPROVED, zero comments** — after one round. Its two NITs were
both fixed rather than accepted: an unpaired-UTF-16-surrogate guard (a lone surrogate would otherwise
have become U+FFFD — a corrupted brand name that still compiles _and_ still passes the drift check), and
a parser fixture with parentheses and commas inside string literals. The reviewer then independently
mutation-tested that second one, confirming a string-state-blind splitter yields 7 arguments where the
real one yields 6, so the test genuinely discriminates.

**QA review round 1 (Sonnet, fresh context): CONCERNS → all 8 findings resolved.** One MAJOR: the test
counts in this record and in `sprint-status.yaml` said 24/2070 when the truth was 26/2072 — I had
written them before adding the two code-review fixes and never revisited. The remaining seven were the
AC4/AC6/AC8 guard gaps, the AC3 Swift-parity cross-check, the `defaultFormat` enum, a generic
`SyntaxError` on malformed JSON, and three untested validation branches.

**QA review round 2: CONCERNS → all 6 findings resolved.** It mutation-tested all five new wiring tests
and confirmed none is tautological, then found six refinements:

- The AC8 codegen regex banned `Exec` wholesale, so a legitimate future
  `tasks.register<Exec>("gitHash") { commandLine("git", "rev-parse", "HEAD") }` would have failed a test
  named "catalogue" with no explanation. Narrowed to the two signals AC8 actually names — a reference to
  the generator/artifact, or a Node invocation — each with a message saying which it is. Re-verified:
  the `git rev-parse` case now passes, real codegen still fails.
- The KDoc-derivation gap and its hashing consequence, above.
- The format-doc test was one-directional (it caught a format missing from the doc, not a removed format
  whose stale mention lingered). Now asserts set-equality.
- The AC6 assertions were string-exact. The pre-push one is now whitespace-tolerant, and the
  `continue-on-error` check isolates the workflow step by YAML indentation rather than a 200-character
  window that an unrelated comment could push it out of.
- `readBarcodeFormats`'s own "fail loudly" promise was untested and its path unoverridable. Added
  `WEAR_BARCODE_SCHEMA_PATH` (matching the other two overrides) and two tests: the parse-failure branch,
  and that widening the schema is real drift.
- A deliberately obfuscated Gradle invocation still evades a text guard. Accepted and now stated in the
  code as a design boundary — it exists to catch an accidental regression, not sabotage.

Test count went 24 → 26 → 36 → 38 → **41**; suite total 2070 → **2087**. The counts were updated last in each
round, after nothing else was changing, which is the process fix for the round-1 MAJOR.

**QA review round 3: CONCERNS → all 5 findings resolved.** Zero blocker/major/minor; five NITs, three
of them direct side effects of the round-2 fixes:

- Narrowing the AC8 regex reopened a gap: `tasks.register<Exec>("regenerateCatalogue") { /* TODO */ }`
  — named for the job but not yet wired to a command — matched neither surviving signal. Added a third
  keyed on the task **name**, so an unrelated `Exec` still passes.
- The attribution correction above (KDoc interpolation, not the hash, is what makes `--check` catch it).
- Hashing all of `card.ts` meant any unrelated edit to it forced a redundant byte-identical rewrite.
  Now hashes the extracted values.
- Reordering the enum was drift, because the KDoc's word order changed. The formats are sorted now, so
  a phone-side restyle costs `watch-android/` nothing.
- A single-value enum would have rendered a dangling "— or `X`". Handled, and tested.

**QA review round 4: CONCERNS → both findings resolved.** One MINOR, one cosmetic:

- The round-3 name-keyed AC8 signal matched the noun alone, so it flagged
  `tasks.register<Copy>("copyBrandsAssets")` and `tasks.register("validateBrandsData")`. Those are not
  contrived: "brands" is this app's own domain vocabulary, and an asset-bundling task is close to the
  complication work Out-of-scope #2 already anticipates. Now requires a generation **verb** beside the
  noun (`regen`/`sync`/`generat`), which keeps both intended catches and clears both false positives.
  Six fixture cases are asserted in the test itself, both directions, so the pattern cannot drift back
  toward either uselessness or nuisance. Accepted limit, stated in the code: a codegen task named with
  a verb outside that list slips past _this_ signal — but a finished one still has to invoke the
  generator, which trips one of the other two.
- The generated KDoc lists formats alphabetically while `core/schemas/card.ts` keeps its declaration
  order, so the two read differently side by side. Left as is: sorting is what decouples the modules
  (round-3 finding 4), and the cost is cosmetic.

**QA review round 5: PASS, zero findings.** The narrowed pattern was re-verified against all eight
cases in a fresh process rather than read off the test file. Both review loops are closed: code review
APPROVED with zero comments, QA PASS with zero findings.

QA could not reproduce `./gradlew assembleDebug` (no Android SDK in its sandbox) or `yarn watch:build`.
Both were run from the main checkout for this record: `assembleDebug` and `lintDebug` **BUILD
SUCCESSFUL**, `yarn watch:build` **BUILD SUCCEEDED**, `check:catalogue-generated` up to date.

### File List

| File                                                                                        | Change                                                  |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `scripts/generate-wear-catalogue.mjs`                                                       | **NEW** — the generator                                 |
| `scripts/generate-wear-catalogue.test.ts`                                                   | **NEW** — 41 co-located tests (AC9)                     |
| `watch-android/app/src/main/kotlin/com/iferoporefi/myloyaltycards/wear/Generated/Brands.kt` | **NEW, COMMITTED** — generated artifact                 |
| `.gitignore`                                                                                | UPDATE — ignore dir, un-ignore `Brands.kt`              |
| `package.json`                                                                              | UPDATE — `wear:catalogue:generate`/`:check`             |
| `.husky/pre-push`                                                                           | UPDATE — added the drift check                          |
| `.github/workflows/ci-quality-gates.yml`                                                    | UPDATE — enforce the drift check                        |
| `watch-android/README.md`                                                                   | UPDATE — § Brand catalogue (AC10) + 10-1 reconciliation |
| `CONTRIBUTING.md`                                                                           | UPDATE — add-a-brand step 4, quality-gate lists         |
| `docs/architecture.md`                                                                      | UPDATE — corrected the superseded Wear codegen tree     |
| `docs/sprint-artifacts/stories/10-2-generate-catalogue-for-wear-os.md`                      | UPDATE — this record                                    |
| `docs/sprint-artifacts/sprint-status.yaml`                                                  | UPDATE — status → review                                |

## Change Log

| Date       | Change                                                                                                                                                                                      |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-03 | Implemented Story 10.2: Node generator for the Wear OS Kotlin brand catalogue, committed artifact, `--check` drift gate in pre-push + CI, incremental skip, 41 tests, docs. All 11 ACs met. |
