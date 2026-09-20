---
baseline_commit: 635cb949d257133ba552c3c06bdab0bdf21ab3bc
---

# Story 16.43: Android lint never runs in CI, so the one check `lint.xml` deliberately left visible is only ever cleared by hand

Status: review

Epic: 16 — Platform & Tech Debt

> **⚠️ THE OBVIOUS FIX GATES NOTHING.** `.github/workflows/wear-os-build.yml` runs no `lint*` task,
> so "add `lintDebug`" looks like the whole story. It is not. `watch-android/app/build.gradle.kts`
> has **no `lint {}` block**, so all defaults apply and `./gradlew -p watch-android lintDebug`
> exits **0** with findings present — `abortOnError` fails on _errors_, and every finding here is a
> _warning_. `MonochromeLauncherIcon` is a warning. Adding the task alone buys ~15s of CI time and
> changes no outcome.
>
> **⚠️ THE SPAWNING NOTE WAS WRONG, and the correction matters.** It claimed adding `lintDebug`
> as-is would hand CI "a gate that can go red on a day nobody touched the repo", and prescribed
> suppressing `AndroidGradlePluginVersion` first. Measured: it cannot. Warnings never fail a build,
> so the network-dependent AGP check is harmless **under a targeted promotion**, and suppressing it
> would be dead config. It only becomes a problem under `warningsAsErrors` — the broader
> alternative this story deliberately does not take.
>
> **⚠️ THE GAP IS NARROWER THAN "NO LINT IN CI".** `lintVitalRelease` is already in
> `bundleRelease`'s task graph (confirmed with `--dry-run`), and the workflow runs `bundleRelease`.
> **Fatal-severity lint already runs in CI.** What does not run is everything below fatal.
>
> **⛔ SEQUENCE AFTER STORY 21.4.** Hard dependency, not a preference — see
> [Blocking dependency](#blocking-dependency).

## Story

As a maintainer of the Wear OS app,
I want Android lint to run as a real gate in CI,
so that a check the repository deliberately left unsuppressed cannot be satisfied once and then
silently regress.

## Story context

Found 2026-09-20 during the QA review of **Story 21.4**, which added a `<monochrome>` layer
specifically to satisfy `MonochromeLauncherIcon` — a check
[`watch-android/app/lint.xml`](../../../watch-android/app/lint.xml) leaves **unsuppressed on
purpose** so the gap stays visible. That check was cleared once, locally, and nothing re-verifies
it. Drop the layer and every gate stays green.

`watch-android` is a standalone Gradle project. The repo's only other lint step is `yarn lint`
(`eslint . --ext .ts,.tsx`), and `jest.config.js` matches only `**/*.test.[jt]s?(x)`, so `.kt` files
and `res/*.xml` are invisible to both.

### What is true today (measured, 2026-09-20)

| fact                                                                     | evidence                                              |
| ------------------------------------------------------------------------ | ----------------------------------------------------- |
| `wear-os-build.yml` runs `testDebugUnitTest assembleDebug bundleRelease` | workflow line 105                                     |
| …and **no `lint*` task**                                                 | grep across `.github/workflows/`                      |
| `lintVitalRelease` IS in `bundleRelease`'s graph                         | `gradlew bundleRelease --dry-run`                     |
| `lintDebug` exits **0** with findings present                            | run with 2 findings → `$? = 0`                        |
| no `lint {}` block anywhere                                              | `watch-android/app/build.gradle.kts`                  |
| current findings: 2, both `AndroidGradlePluginVersion`                   | `lint-results-debug.sarif`                            |
| `lintDebug` costs ~15s warm                                              | timed with `--rerun-tasks`                            |
| README § CI names the wrong task                                         | says `assembleRelease`; workflow runs `bundleRelease` |

### Blocking dependency

`main` has **no `<monochrome>` layer** until Story 21.4 merges, so promoting `MonochromeLauncherIcon`
to `fatal` turns the Wear job **red on `main`** until it does. Measured by removing the layer and
re-running lint:

```
AndroidGradlePluginVersion  (×2)
UnusedResources             R.mipmap.ic_launcher_monochrome appears to be unused
MonochromeLauncherIcon      The application adaptive icon is missing a monochrome tag
```

`UnusedResources` is a bonus finding worth keeping: it fires when the generated PNGs exist without
the `<monochrome>` reference, so the artefacts and the reference guard each other.

## Acceptance Criteria

- **AC1 — `MonochromeLauncherIcon` is promoted to `severity="fatal"`** in
  `watch-android/app/lint.xml`, so it can actually fail a build. Its existing comment explains why
  it is unsuppressed; it must now also explain why it is fatal. ⚠️ **This AC said `error` when the
  story was written, and was changed to `fatal` during QA review on measured evidence** — see the
  Completion Notes. `error` gates only a job that runs a lint task explicitly; `fatal` is
  additionally enforced by `lintVitalRelease`, which every release pipeline already runs via
  `bundleRelease`. Same single named issue, strictly wider coverage.
- **AC2 — `lintDebug` runs in `.github/workflows/wear-os-build.yml`**, and the workflow comment
  states what it does and does not gate — specifically that `lintVitalRelease` already covered
  fatal severity via `bundleRelease`, and what `lintDebug` adds. ⚠️ This AC originally read "this adds
  the tier below it", which stopped being true when AC1 moved to `fatal`: the promoted issue is now
  enforced at the SAME tier by both tasks. What `lintDebug` still adds is the debug variant and a
  signal on every PR rather than only where a release bundle is built.
- **AC3 — `AndroidGradlePluginVersion` is NOT suppressed, and the story says why not.** It consults
  the network, so it is non-reproducible in the way `GradleDependency` and `NewerVersionAvailable`
  are — but under a targeted promotion it stays a warning, never fails a build, and suppressing it
  would be dead config of exactly the kind `lint.xml`'s own `DataExtractionRules` comment argues
  against. ⛔ It **must** be suppressed first if anyone later reaches for `warningsAsErrors`; say so
  where a future reader will find it.
- **AC4 — The promotion is proven to bite.** `lintDebug` is shown FAILING with the `<monochrome>`
  layer removed and passing with it present. A promotion nobody watched fail is the same
  unverified claim this story exists to remove.
- **AC5 — `watch-android/README.md` § CI is corrected.** It claims the workflow runs
  `assembleRelease`; it runs `bundleRelease`. Its "❌ No lint in CI" bullet becomes accurate for
  whatever this story lands, and § Lint is checked for the same drift.
- **AC6 — The added CI duration is measured** and the workflow's own timing comment (and the
  README's restatement of it) updated if it moves materially. ~15s warm locally.

## Tasks / Subtasks

- [x] **Task 1 — Promote the check (AC1, AC3).** `<issue id="MonochromeLauncherIcon"
severity="fatal" />`, extending the existing comment. Leave `AndroidGradlePluginVersion`
      alone and record the reasoning next to it.
- [x] **Task 2 — Prove it bites (AC4).** Remove the `<monochrome>` line, run `lintDebug`, capture
      the failure, restore. Everything must be committed first so `git checkout --` restores exactly.
- [x] **Task 3 — Wire it into CI (AC2).** Add `lintDebug` to the Gradle invocation. Decide
      `lintDebug` vs `lint` and justify the choice in the comment. ⚠️ NOT on the grounds that
      `lint` aggregates variants — AGP 7.0 stopped that and this module pins 9.3.1.
- [x] **Task 4 — Measure and update the timing notes (AC6).**
- [x] **Task 5 — README corrections (AC5).**

## Dev Notes

### Guardrails

- **Verify every claimed edit by re-reading the file from disk**, not from what the edit script was
  meant to do. A script applying several edits can fail partway and discard the ones already made in
  memory, and a report written from intent will then be wrong. That happened twice in this story —
  the narrative is in the Completion Notes; this is the rule. Write after every edit, not at the end.
- **When a FACT changes, grep the tree for the fact, not just the file you were editing** — and
  search for the fact's MEANING, not for the token that happened to change. Verifying each edit
  against its own file is necessary and not sufficient: `error` → `fatal` was correct in `lint.xml`
  and still wrong in six other places, one of them nine lines away. Then a seventh survived even
  that sweep, in the tracker note, because it paraphrased the claim ("this adds the tier below")
  without ever using the word `error` — so no token grep could reach it. Both rounds of this were
  caught by QA rather than by the rule, which is the honest state of the rule.
- **Do not reach for `warningsAsErrors`.** It was considered and rejected: every future noisy or
  network-dependent check becomes a CI outage until someone suppresses it. The narrow promotion was
  chosen by ifero on 2026-09-20. ⚠️ **State the cheap half too:** the full lint report today is
  exactly two findings, both `AndroidGradlePluginVersion`, so `warningsAsErrors` would currently
  catch **nothing** the targeted promotion does not. That is what makes the trade cheap — not an
  argument that it is free. What it gives up is every future Android Lint warning (~400 built-in
  checks: Compose, accessibility, performance, correctness) staying non-gating unless promoted by
  name. **That is the intended pattern rather than an oversight** — Story 16.24 promoted
  `exhaustive-deps` to error the same way. Promote the next real one here, by name. A curated
  allowlist is the unexplored middle ground if one-at-a-time ever becomes the bottleneck.
- **`--` is illegal inside an XML comment** and `aapt2`/`mergeDebugResources` is the only gate that
  catches it — prettier has no parser for `res/*.xml`, and eslint and jest never see it. Use a real
  em dash. (Cost Story 21.4 a build.)
- `.github/build-path-filters.json` governs which changes reach a RELEASE build and deliberately
  excludes `watch-android/**` from both platform sets. This story does not touch it, and
  `yarn check:build-path-filters` only gates the two release YAMLs — `wear-os-build.yml` is not one
  of them, so its `paths:` list has no guard.

### Testing

`./gradlew -p watch-android lintDebug` (the subject), `yarn format:check`. AC4 is a manual
mutation — removing the layer and watching lint fail — because nothing in the repo can assert on a
Gradle task's exit code.

### References

- [Source: docs/epics.md#Story 16.43]
- [Source: docs/sprint-artifacts/stories/21-4-wear-os-launcher-icons.md] — where the gap was found,
  and its "Accepted risks" section
- [Source: watch-android/README.md#CI] — the § that is wrong today
- [Source: docs/sprint-artifacts/stories/16-24-clear-exhaustive-deps-warnings.md] — the precedent
  for promoting a lint rule to error as its own story

## Dev Agent Record

### Agent Model Used

claude-opus-5 (Claude Code)

### Debug Log References

- `gradlew -p watch-android lintDebug --rerun-tasks` with and without the `<monochrome>` layer —
  the AC4 proof.
- `gradlew -p watch-android bundleRelease --dry-run` — establishes that `lintVitalRelease` was
  already in the graph. Cited by output rather than by method, because review found published
  sources claiming `lintVital` attaches to `assembleRelease` only:

  ```
  :app:generateReleaseLintVitalReportModel SKIPPED
  :app:lintVitalAnalyzeRelease SKIPPED
  :app:lintVitalReportRelease SKIPPED
  :app:lintVitalRelease SKIPPED
  ```

  (`--dry-run` prints every task in the graph as `SKIPPED`; presence in the list is the signal.)
  With controls, because a grep returning nothing and a grep that is broken look identical:
  `assembleDebug` has **0** lintVital tasks, `assembleRelease` has **4**, `bundleRelease` has **4**
  of 57 total. So on AGP 9.3.1 it attaches to BOTH release packaging paths — the sources describing
  `assembleRelease` only were written against an older AGP.

- `git log --format=%h -- .github/workflows/wear-os-build.yml` + `git show <c>:<path>` — traced
  which Release task each workflow revision used, for the AC5 provenance correction.

### Completion Notes List

#### ✅ AC4 — the promotion demonstrably gates, which is the only claim that mattered

| state                  | exit | lint output                                          |
| ---------------------- | ---- | ---------------------------------------------------- |
| `<monochrome>` present | 0    | 2 findings, both `AndroidGradlePluginVersion`        |
| `<monochrome>` removed | 1    | "Lint found 1 error and 3 warnings… aborting build." |

The three surviving warnings did **not** fail the build, which is AC3's reasoning confirmed by
measurement rather than argument: a targeted promotion makes exactly one issue fatal and leaves the
network-dependent AGP check harmless.

#### ⚠️ The note that spawned this story was wrong, and the story exists partly to record that

It claimed adding `lintDebug` as-is would hand CI "a gate that can go red on a day nobody touched
the repo", and prescribed suppressing `AndroidGradlePluginVersion` first. Measured, neither half
holds: `lintDebug` exits 0 with warnings, so as-is it is harmless _and useless_, and the AGP check
cannot redden anything while it remains a warning. Suppressing it would have been dead config —
and, worse, would have removed a real signal to solve a problem that did not exist. **The one thing
the note got right is that the suppression becomes mandatory under `warningsAsErrors`**, which is
why that condition is now written next to the check itself rather than in a story nobody will
re-read.

#### ⚠️ AC5 found a SECOND drift, older than the one the story named

The README's § CI said the workflow runs `assembleRelease`. It runs `bundleRelease`. Traced through
git rather than guessed: Story 16.35 (`c74e757`) genuinely did add `assembleRelease`, and `d83586b`
("ship the Wear OS artifact as an AAB, not an APK") later changed it — so the README's provenance
sentence was _historically_ true and _currently_ misleading, which is the harder kind to spot. It
now names the supersession instead of being silently rewritten.

#### AC6 — measured, and the timeout deliberately left alone

`lintDebug` adds **+14s** locally (71s → 85s, both `--rerun-tasks`).

⚠️ **The CI extrapolation from that was wrong, and is corrected rather than left standing.** The job
ran 2m58s on PR #244 before lint, so this story predicted "a little over three minutes". The first
run **with** lint — PR #245, which is this story's own PR and therefore the first execution of the
gate it adds — came in at **1m27s**, _faster_ than the pre-lint baseline. Run-to-run variance on
this job plainly exceeds what lint costs, so the local `--rerun-tasks` delta is the only figure here
worth trusting and the CI point-estimates are noise. The conclusion is unchanged and better
supported: nowhere near the 20m ceiling. The workflow's
existing cold-cache figure was measured a different way and is not directly comparable, so the new
measurement was recorded alongside it rather than overwriting it.

#### ⛔ Sequencing — this must not reach `main` before Story 21.4

✅ **RESOLVED 2026-09-20 — PR #244 merged, and the rebase below was performed.** Kept as written
because the constraint shaped how this story was branched and reviewed, and because the squash
hazard it predicted is exactly what happened.

`main` had no `<monochrome>` layer, so this promotion would have turned the Wear job red there until
PR #244 merged. The branch was therefore stacked on `feature/21-4-wear-os-launcher-icons`, so CI ran
against a tree that had the layer.

⛔ **A REBASE IS REQUIRED AFTER #244 MERGES, and auto-retargeting is not it.** This repository
squash-merges — PRs #238 through #243 each produced exactly one `<title> (#NNN)` commit on `main` —
so #244 will land as a NEW single commit whose SHA is unrelated to the 21-4 commits already in this
branch's history. GitHub retargets this PR's base to `main` automatically, but retargeting only
repoints the base; it does not drop the now-duplicated commits. Left alone, this PR's diff would
balloon to re-include all of 21-4's files and merging it would put 21-4's pre-squash commits into
`main` a second time.

✅ **Done.** #244 squash-merged as `9d4de21`, confirming the prediction — `e8896e8` is NOT an
ancestor of `main`, so this branch did carry duplicates. The `--onto` form below was used and
replayed exactly one commit with no conflicts.

**Use the explicit form, not a plain `git rebase main`:**

```bash
git rebase --onto main feature/21-4-wear-os-launcher-icons feature/16-43-wear-ci-android-lint
```

That replays **only** this branch's own commits — everything after the 21-4 tip — regardless of
whether the squashed commit's content matches the originals byte for byte. A plain `git rebase main`
_usually_ works too, but only via Git's empty-patch pruning: each 21-4 commit becomes a no-op once
its content is already in the squashed commit, so Git skips it. ⚠️ **That silently stops working if
#244 picks up any review-driven change before it merges** — the pre-squash commits then produce real
conflicts rather than clean auto-drops, and whoever is rebasing has to know to resolve them as
"already upstream, skip" rather than as ordinary conflicts. The `--onto` form does not depend on
that mechanism at all, which is why it is the one written down here.

⚠️ **"Gate" here means the signal is computed, not that a merge is blocked.** `main`'s ruleset
declares no `required_status_checks` at all — for this job or any other — and the owner can bypass
it regardless. So this story makes a regression _visible_ where it previously was not; a human still
has to act on red. That is true of every check in this repository and is not specific to this one,
but the word "gate" over-promises without it.

#### ⛔ QA FOUND THE GATE DID NOT REACH THE RELEASE PIPELINES — fixed by `fatal`, not `error`

The story shipped `severity="error"` and called that a gate. QA found it gated one job.
`fastlane`'s `build_wear_bundle!` calls `gradle(task: "bundleRelease")` directly for
`beta-releases.yml`, `store-upload.yml` and `nightly-builds.yml`, and none of them runs a lint task
— so the only lint those pipelines see is `lintVitalRelease`, which enforces **fatal** severity
only. `error` is not `fatal`. A `<monochrome>` regression reaching `main` would have shipped through
every release pipeline with no lint enforcement on the artifact actually uploaded.

`severity="fatal"` closes it at zero cost in narrowness — still exactly one named issue — because
AGP already wires `lintVitalRelease` into `bundleRelease`. Measured, with the layer removed:

| task                          | `severity="error"`  | `severity="fatal"`   |
| ----------------------------- | ------------------- | -------------------- |
| `lintDebug` (the CI job)      | exit 1              | exit 1               |
| `lintVitalRelease` (releases) | **exit 0 — misses** | **exit 1 — catches** |

And with the layer present, both tasks exit 0 under `fatal`, so nothing is gained by breaking the
green path. **This changed AC1**, which is flagged inline there rather than quietly rewritten.

#### ⚠️ The `error` → `fatal` change did not sweep, and QA caught that too

Round 2 of QA found the promotion had been changed in `lint.xml` and the story's AC1, and left as
`error` in **six** other places — including `wear-os-build.yml` line 128, nine lines below the new
paragraph explaining why it is `fatal` and not `error`. A reader of that one file got two answers.

That is the same defect the Guardrail added one round earlier warns about, and it recurred because
the guardrail was applied per-EDIT and not per-CLAIM: every edit was verified against the file it
touched, and nothing checked whether the claim was repeated elsewhere. **The rule is now: when a
fact changes, grep the tree for the fact, not just the file.** Ten sites were swept and
re-verified; the three surviving `error` mentions are the historical narrative (what the story
shipped first, the comparison table, and the superseded Change Log row, which now carries a pointer
so it cannot be read alone).

#### ✅ The gate is live in CI, verified on this story's own PR

PR #245 is the first execution of the gate it adds, so its CI log is the proof rather than an
inference. From the Wear job's log:

```
Run ./gradlew lintDebug testDebugUnitTest assembleDebug bundleRelease --no-daemon
> Task :app:lintAnalyzeDebug
> Task :app:lintVitalAnalyzeRelease
> Task :app:lintVitalReportRelease
> Task :app:lintVitalRelease
```

`lintDebug` ran, and `lintVitalRelease` ran too — which confirms in real CI what the `--dry-run`
evidence showed about `bundleRelease`'s task graph, and therefore that the `fatal` promotion reaches
the release path rather than only this job. 4/4 checks green.

#### Flagged, not fixed — more "Wear APK" drift outside this story's mechanism

Review's AC5 sweep turned up the same APK/AAB staleness in the RELEASE-pipeline prose, which this
story does not own: `watch-android/README.md` lines 477 ("build and upload the phone AAB and this
Wear APK"), 522 ("The Wear APK goes to `wear:<track>`") and 549 ("this Wear APK shares"). All three
are stale for the same reason — the Wear artifact is an AAB, as the file's own top-of-document
warning says loudly.

Two adjacent instances WERE fixed, and the line between them is deliberate: the § CI bullet, because
AC5 names it, and line 539, because it is the _same sentence about the same script_ as the § CI one —
leaving that claim false in one place and true in another, 150 lines apart, is worse than either. The
remaining three are a different subject (which artifact goes to which Play track) and deserve their
own pass rather than a drive-by.

#### ⚠️ Process failure worth recording: three "fixes" were reported without being verified

Round 2 of review found that three of eleven claimed fixes were not in the tree at all — one file
was byte-identical to round 1. Cause: a single edit script applied four changes, hit an assertion
failure on the third, and **exited before writing the file**, so the two edits already made in
memory were discarded along with it. The failure was visible in the output; the report was written
from what the script was meant to do rather than from what the tree said afterwards.

That is the same defect this story and Story 21.4 both exist to remove — a claim asserted rather
than checked — committed while writing the story about it. Every fix in round 3 was verified by
grepping the file back from disk after the edit, and those verifications are in the transcript
rather than in prose.

### File List

- `docs/epics.md` — modified (Story 16.43 catalogue section; `totalStories` 205 → 206)
- `docs/sprint-artifacts/sprint-status.yaml` — modified (16-43 tracker key)
- `docs/sprint-artifacts/stories/16-43-wear-ci-android-lint.md` — added
- `watch-android/app/lint.xml` — modified
- `.github/workflows/wear-os-build.yml` — modified
- `watch-android/README.md` — modified

### Change Log

| Date       | Change                                                                                                                                                                                                                                                                                                                |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-20 | Created the story from Story 21.4's QA review; allocated 16-43 by scanning all git refs (16-42 is claimed on an unmerged peer branch).                                                                                                                                                                                |
| 2026-09-20 | Promoted `MonochromeLauncherIcon` to `severity="error"` (**superseded below — it is `fatal` as shipped**) and recorded why `AndroidGradlePluginVersion` is deliberately NOT suppressed (AC1, AC3).                                                                                                                    |
| 2026-09-20 | Proved the promotion gates: exit 0 with the layer, exit 1 without (AC4).                                                                                                                                                                                                                                              |
| 2026-09-20 | Added `lintDebug` to `wear-os-build.yml` with the reasoning that adding the task is not what makes it a gate (AC2).                                                                                                                                                                                                   |
| 2026-09-20 | Measured +14s and left the 20m timeout unchanged (AC6).                                                                                                                                                                                                                                                               |
| 2026-09-20 | Corrected README § CI and § Lint, including an older `assembleRelease` → `bundleRelease` drift traced through git history (AC5).                                                                                                                                                                                      |
| 2026-09-20 | Code review (3 rounds, 15 findings) to zero, incl. a squash-merge rebase hazard and a `lint`-aggregates-variants claim wrong since AGP 7.0.                                                                                                                                                                           |
| 2026-09-20 | QA review: promoted `error` → `fatal` after QA found the release pipelines build via fastlane’s `bundleRelease` and run no lint task, so `error` gated one job only. Also recorded the residual risk that nothing protects the gate’s own config, and what the narrow choice gives up.                                |
| 2026-09-20 | QA round 2: swept the `error` → `fatal` change through the six other places that still claimed `error`, one of them nine lines from the paragraph explaining the change.                                                                                                                                              |
| 2026-09-20 | QA round 3: a seventh site survived that sweep — the tracker note paraphrased the superseded claim ("this adds the tier below") without ever using the word `error`, so no token grep could reach it. Fixed, and the Guardrails rule sharpened to search for a fact’s MEANING rather than for the token that changed. |
| 2026-09-20 | Post-merge: rebased onto `main` with `--onto` after #244 squash-merged, corrected the CI timing extrapolation (predicted ~3m, actual 1m27s — variance exceeds what lint costs), and recorded the CI log proving `lintDebug` and `lintVitalRelease` both ran.                                                          |
