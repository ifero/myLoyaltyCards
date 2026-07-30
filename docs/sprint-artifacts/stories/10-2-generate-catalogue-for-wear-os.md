---
baseline_commit: 7837f359540c72c30edcf392e1a897fa99ab9752
---

# Story 10.2: Generate the catalogue for Wear OS [Enabling]

Status: ready-for-dev

Epic: 10 — Wear OS App

> **Run all gates from the main checkout, never a `.claude` worktree.**
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

- [ ] **Task 1 — Write the generator (AC: 1, 2, 3)**
  - [ ] `scripts/generate-wear-catalogue.mjs`, modelled on `scripts/build-tokens.mjs` for CLI/`--check`
        shape and on `watch-ios/Scripts/generate-catalogue.swift` for emission logic.
  - [ ] Port the literal-escaping helpers to Kotlin equivalents. Kotlin string literals differ from
        Swift: `$` is a template character and **must** be escaped in addition to `\` and `"`. The
        catalogue has no `$` today, but a future brand name or alias could — handle it now.
  - [ ] Read `version` from the catalogue and expose it; a version-less generated catalogue makes 10-6's
        sync debugging harder.
  - [ ] Emit a repo-relative `Source:` header comment (port `repoRelativePath`).

- [ ] **Task 2 — Determinism + incremental skip (AC: 1, 7)**
  - [ ] Sort brands by `id` before emitting. Never rely on JSON key order.
  - [ ] SHA-256 the inputs (catalogue JSON **and** the generator itself) into a sidecar hash file;
        short-circuit when unchanged. Gitignore the sidecar — it is machine state, not an artifact.

- [ ] **Task 3 — `--check` mode and gates (AC: 5, 6)**
  - [ ] Implement `--check` so it never writes over the tracked artifact.
  - [ ] Add the `yarn` scripts to `package.json`, named to match the sibling gates.
  - [ ] Add to `.husky/pre-push` next to `tokens:check` / `splash:check`.
  - [ ] Add to the PR quality-gate workflow. If `check:catalogue-generated` already has a job, extend
        that job rather than adding a new one.

- [ ] **Task 4 — Commit the artifact correctly (AC: 4, 8)**
  - [ ] Generate `Brands.kt`, commit it, add the `.gitignore` ignore-dir + un-ignore-file pair.
  - [ ] `./gradlew assembleDebug` from `watch-android/` to prove it compiles with no codegen step.

- [ ] **Task 5 — Tests and docs (AC: 9, 10, 11)**
  - [ ] Write the AC9 tests.
  - [ ] Update `watch-android/README.md` and the add-a-brand documentation.
  - [ ] Run the full gate suite from the main checkout.

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

- Run from the **main checkout**. `features/**`, `core/**`, `shared/**` are coverage-measured at 80 %
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

_To be filled by the dev agent._

### Debug Log References

### Completion Notes List

### File List
