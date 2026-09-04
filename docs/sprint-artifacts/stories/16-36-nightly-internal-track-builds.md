---
baseline_commit: fe0febc # PR #218 merge — the WEAR_PLAY_TRACK override this story builds on
---

# Story 16.36: Nightly internal-track builds for all four apps, skipped when nothing that ships has changed

Status: review

Epic: 16 — Platform & Tech Debt

> **🟢 THIS IS NEW CAPABILITY, NOT A DEFECT.** Every existing release path is triggered by a
> **published GitHub Release** (`beta-releases.yml`, `store-upload.yml`) or a **push to `main`**
> (`ios-release.yml`, `android-release.yml`). `grep -rn "schedule\|cron" .github/` returns **zero
> matches** across all 11 workflow files. There is nothing scheduled to fix — this story adds the
> first cron in the repository.
>
> **⚠️ `paths:` FILTERS DO NOT WORK ON A `schedule:` TRIGGER. Read AC3 before writing any YAML.**
> The "did code change?" logic the user is asking for already exists in this repo, twice — as
> `on.push.paths` allow-lists in [`ios-release.yml:10-45`](../../../.github/workflows/ios-release.yml)
> and [`android-release.yml:10-42`](../../../.github/workflows/android-release.yml). GitHub applies
> `paths`/`paths-ignore` **only** to `push` and `pull_request` events. A `schedule:` run gets no path
> filtering at all, so the decision has to be computed **inside the job** from a git diff against a
> remembered baseline. Copying the YAML list into the nightly workflow would make it a **third**
> divergent copy — and the two that exist already disagree with each other (see AC4).
>
> **⚠️ A NEW WORKFLOW FILE IS A NEW `GITHUB_RUN_NUMBER` COUNTER, AND THAT COLLIDES. Read AC6.**
> `GITHUB_RUN_NUMBER` is scoped **per workflow file** — `beta-releases.yml` run 40 and
> `store-upload.yml` run 40 are unrelated releases. That is precisely why
> [`watch-android/app/build.gradle.kts:20-56`](../../../watch-android/app/build.gradle.kts) carries a
> four-band `versionCode` scheme and a `wearProductionVersionCodeOffset`. `nightly-builds.yml` run 40
> would be a **fifth** consumer of one shared counter space and, with today's code, would compute
> `versionCode 40` for the phone (colliding with RC run 40) and `2_000_040` for Wear (colliding with
> Wear RC run 40). Story 16.7 exists to document exactly this class of failure. Two new bands are
> required.
>
> **✅ DEPENDENCY DISCHARGED — PR #218 MERGED as `fe0febc` on 2026-09-03, and this story is baselined
> on it.** The Wear track name is no longer derived: `wear_play_track(phone_track)`
> ([`fastlane/Fastfile:372-378`](../../../fastlane/Fastfile)) reads `ENV['WEAR_PLAY_TRACK']` and only
> falls back to `"wear:#{phone_track}"`, and `available_play_tracks` (`:384-395`) lists the app's real
> tracks when one is not found. **So the nightly needs no Fastfile change for the track — it sets
> `WEAR_PLAY_TRACK: wear:qa` in its own workflow env, and that is the whole mechanism.**
>
> **✅ THIS APP'S REAL WEAR TRACK INVENTORY, confirmed by ifero 2026-09-03 — no longer an
> assumption.** The Wear form factor has **`qa`** (internal testing) and **`alpha`** (the current
> closed test). Two consequences, and they pull in opposite directions:
>
> - **This story's destination `wear:qa` exists.** It was the single highest-risk item in the draft;
>   it is now settled. AC12 still has to prove the upload _succeeds_ and installs, but not that the
>   track is there.
> - **`wear:alpha` exists now too** — as a hand-created closed track literally named "alpha", which
>   is exactly the shape Play's docs describe for anything outside the three well-known names. So
>   `wear_play_track`'s derived fallback is _correct_ for the RC lane, and the RC pipeline needs no
>   `WEAR_PLAY_TRACK` value. **This retires the "Wear delivery is still broken on the release lanes"
>   concern an earlier draft of this story raised.** rc.21's `Track not found: wear:alpha` was true
>   when it happened; the track was created afterwards.
>
> **The derivation is still not a general rule, and that is why the override must stay.** `wear:alpha`
> resolves because a human made a track with that name, not because Play derives it — and the phone's
> `internal` has no counterpart at all, since the Wear internal track is named **`qa`**. That gap is
> precisely what `WEAR_PLAY_TRACK` exists for and what this story uses it for.
>
> Per [developers.google.com/android-publisher/tracks](https://developers.google.com/android-publisher/tracks)
> only **three** Wear track names are well known: `wear:production`, `wear:beta` (open testing) and
> **`wear:qa` (internal testing — the name is literally "qa", NOT "internal")**. Everything else is a
> hand-created closed track with a custom name. **Do not re-derive `wear:internal`; it does not
> exist.**
>
> **⚠️ THE APPLE WATCH NEEDS NO NEW UPLOAD PATH AND MUST NOT GET ONE.** The watchOS app and its
> WidgetKit complication are **embedded targets in the iOS binary**, wired for every distribution
> lane by `apply_distribution_signing` ([`Fastfile:32-57`](../../../fastlane/Fastfile), whose own
> comment says "All distribution lanes go through here so a target can never be forgotten"). One
> TestFlight upload delivers phone + watch + complication. The asymmetry with Wear OS — which _is_ a
> separate Play artifact on a separate track — is a platform fact, not an inconsistency to tidy up.

## Story

As ifero, distributing myLoyaltyCards to internal testers,
I want a nightly build of all four apps pushed automatically to the internal tracks — iOS +
Apple Watch to TestFlight, Android phone + Wear OS to Play — and skipped entirely on nights when
nothing that can reach a binary has changed,
so that testers always have yesterday's `main` on every device without me cutting an RC by hand, and
a quiet week costs no CI minutes.

## Context

### This is not a new product decision — it is an unimplemented ratified one

`docs/architecture.md:414-426` has specified the Dev distribution posture since the architecture was
written, and it is exactly what was asked for:

| Aspect                   | Dev                | Production               |
| ------------------------ | ------------------ | ------------------------ |
| **iOS Distribution**     | **TestFlight**     | App Store                |
| **Android Distribution** | **Internal Track** | Google Play              |
| **Trigger**              | Push to main, PRs  | Published GitHub Release |
| **Approval**             | **None**           | Required                 |

`docs/project-context.md:412-419` says the same in its environment table ("TestFlight / Internal").
**The implementation drifted:** every lane targets Play's `alpha` track (`Fastfile:472`, `:497`), and
the Dev trigger was never built at all. So AC7's move to `internal` is _alignment with a ratified
decision_, not a new one — and this story is the first thing in the repo to implement the "Trigger:
push to main / Approval: none" half of that table.

Two nearby documents are **stale and must not be cited**: `docs/architecture.md:428-447` lists
workflow filenames that do not exist (`dev-phone.yml`, `prod-release.yml`, …) and secret names that
were never used; `docs/sprint-artifacts/epic-11-cicd.yaml` still shows Story 11.1 as `in-progress`.
`docs/cicd.md` and `sprint-status.yaml` are the current sources.

### Why nightly device-installable builds are worth CI minutes

The Epic 16 retrospective put the case in one line
(`docs/sprint-artifacts/epic-16-retro-2026-07-11.md:68`): _"The CI sandbox can't run
native/browser/release paths, so a class of defect only appears at the device gate."_ That gate is
currently reached only when someone cuts an RC by hand, and this project has repeatedly stacked
device-validation debt behind it — the Sprint 16 retro carried a "consolidated RC validation pass"
action item for two sprints, and Epic 10 closed with DEC-E10-RETRO-001 accepting the risk of
**never** having run its two-device validation.

`runtimeVersion.policy` is `appVersion` (`docs/project-context.md:417-419`), so **no native change
can ship as an OTA update** — a nightly binary is the only mechanism that puts native changes,
watchOS changes and Wear OS changes in front of a tester at all.

### What exists today, and what it cannot do

| Capability                               | Today                                                                                                                                                                                                 |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Any scheduled workflow                   | ❌ none — `grep -rn "schedule\|cron" .github/` = 0 matches across 11 files                                                                                                                            |
| iOS → TestFlight                         | ✅ `fastlane ios beta`, but only from a published RC release                                                                                                                                          |
| Android phone → Play                     | ✅ `fastlane android beta` → `alpha` track, `release_status: "draft"`                                                                                                                                 |
| Wear OS → Play                           | ✅ `build_wear_bundle!` + `upload_wear_bundle!` → `wear:<track>` (Story 16.35); `WEAR_PLAY_TRACK` override available since #218, unset because the derived `wear:alpha` matches the real closed track |
| Apple Watch → TestFlight                 | ✅ implicitly, embedded in the iOS binary                                                                                                                                                             |
| **Play `internal` track used anywhere**  | ❌ never — only `alpha` and `production` appear in the Fastfile                                                                                                                                       |
| **Unattended delivery (no human click)** | ❌ the beta lane uploads a **draft**; promotion is a deliberate human action                                                                                                                          |
| "Did code change?" logic                 | ⚠️ exists **twice**, as `on.push.paths` YAML in `ios-release.yml` and `android-release.yml` — unusable from a `schedule:` trigger                                                                     |
| Timeout on a release job                 | ❌ none. `beta-releases.yml` / `store-upload.yml` jobs have no `timeout-minutes`, so a hung `macos-latest` job can burn the 360m default                                                              |

### Why the two halves of the request are one story

"Nightly internal builds" and "skip when no code changed" are not separable. A nightly iOS build runs
on `macos-latest`, which GitHub bills at a **10× minute multiplier**, and after nearly every merge
[`mark-story-done.yml`](../../../.github/workflows/mark-story-done.yml) pushes
`chore(sprint): mark story done after merge [skip ci]` straight to `main`. So on a quiet day `main`'s
tip has moved and nothing shippable has changed. Without the gate the nightly would spend its most
expensive resource re-shipping identical bytes, and — worse — would burn a TestFlight build number
and a Play `versionCode` per night for no delivered change.

Note the interaction, because it is a trap in the opposite direction: `[skip ci]` suppresses **only**
`push` and `pull_request` events (that is why both release workflows moved to `release: published` —
[`beta-releases.yml:4-8`](../../../.github/workflows/beta-releases.yml)). A `schedule:` trigger is
**not** suppressed by it. So the bot commit does not stop the nightly from running; it just needs to
be correctly classified as a non-code change, which a path-based diff does for free — it touches only
`docs/sprint-artifacts/**`.

### The four apps and the three destinations

```
iOS binary ────────────────────────► TestFlight (internal testers)
  ├── myLoyaltyCards (phone)             one upload, three targets
  ├── watch          (Apple Watch)       `apply_distribution_signing` wires all three
  └── watchwidget    (complication)

android/ ──── app-release.aab ─────► Play `internal`
watch-android/ ── app-release.aab ─► Play `wear:qa`   ⚠️ NOT `wear:internal`
```

### One Android decision, not two

Story 16.35 deliberately put the phone AAB and the Wear AAB in **one job**, and its reasoning carries
over verbatim: _"the two artifacts belong to one release intent and a partial ship should be one red
X, not two green ones."_ This story keeps that, which means the Android build/skip decision is a
**single decision over the union of the phone and Wear path sets** — not two independent ones.

That is not just consistency. If the phone shipped nightly and Wear did not, internal testers would
accumulate a phone app paired with an increasingly stale watch app across the Wearable Data Layer
contract that `modules/wear-data-layer` and `watch-android` share — a silent-compatibility risk with
**no telemetry to surface it** (Sentry has ~10 events / 90 days, ~100% iOS). Pairing them removes the
risk entirely.

### The one thing that is genuinely cheap here

iOS needs **no new versionCode band.** `fastlane ios beta` is the only lane in the repo whose build
number comes from remote state rather than the run number:

```ruby
last_build = latest_testflight_build_number(app_identifier: app_identifier, api_key: api_key)
increment_build_number(xcodeproj: "ios/myLoyaltyCards.xcodeproj",
                       build_number: (last_build.to_i + 1).to_s)
# fastlane/Fastfile:130-137
```

Because it asks App Store Connect what the highest build number is, it is inherently
workflow-independent and cannot collide with the RC pipeline. The Android side's
`GITHUB_RUN_NUMBER`-derived codes are the fragile ones, and they are the ones AC6 has to fix.

## Acceptance Criteria

- **AC1 — one new workflow, with two first-class entry points.**
  `.github/workflows/nightly-builds.yml` with `schedule:` (a single daily cron, at an off-peak minute
  — GitHub queues every `0 * * * *` job on the hour and delays them) **and `workflow_dispatch`, which
  is a supported way to use this pipeline rather than an escape hatch — see AC13 for its full input
  contract.** A `concurrency` group prevents a manual
  dispatch and the cron from double-uploading. `timeout-minutes` is set on **every** job — the
  existing release workflows set none, and an unbounded `macos-latest` job is the most expensive
  failure mode in this repository. Note as a documented constraint, not a choice: `schedule:` only
  ever runs the **default branch's** copy of the file, so nothing about this workflow can be tested
  from a branch except via `workflow_dispatch`.

- **AC2 — a preflight job decides per platform, and both decisions are visible.** One `preflight` job
  resolves a baseline commit per platform, diffs it against the scheduled `HEAD`, and emits two
  outputs: `build_ios` and `build_android`. The build jobs gate on them with `if:`. `force` sets both
  true. The job summary states, for each platform, the baseline SHA, the decision, and — when
  building — which changed paths triggered it. **A skipped night must be legible in the Actions UI
  without opening logs**; a silent green is indistinguishable from a broken cron, which is the exact
  failure shape Story 16.35 was written about.

- **AC3 — the "can this reach a binary?" definition becomes a single source of truth, checked in CI.**
  The path allow-list moves into one committed config file that the nightly's diff logic reads, and a
  new drift guard (`yarn check:build-path-filters`, wired into
  [`ci-quality-gates.yml`](../../../.github/workflows/ci-quality-gates.yml) beside `tokens:check`,
  `splash:check` and `wear:catalogue:check`) fails when `ios-release.yml` / `android-release.yml`'s
  `on.push.paths` and that config disagree. Rationale: the list already exists twice and the copies
  have **already diverged** (AC4). A third hand-maintained copy inside a workflow that runs
  unattended at 3am — where a stale entry means "we quietly stopped shipping" — is not acceptable.
  The guard is the deliverable, not the extraction: `on.push.paths` cannot reference an external
  file, so the duplication is irreducible and must instead be made _loud_.
  **⚠️ Adding a gate has a documentation contract.** `CONTRIBUTING.md:270` states it outright: _"The
  pre-push hook and the quality-gates workflow run the **same set of checks in a different order** …
  **If you add or remove a check, update both the file and this list.**"_ So the new guard goes into
  `.husky/pre-push` **and** `ci-quality-gates.yml` **and** both ordered lists in
  `CONTRIBUTING.md:272-300`. Three places, or the story has broken a rule it is otherwise enforcing.

- **AC4 — the path lists gain the entries they are missing today, and the Wear paths join the Android
  decision.** Three concrete corrections, each verified rather than assumed:
  1. **`modules/**`is absent from both`ios-release.yml`and`android-release.yml`.**
`modules/wear-data-layer/`is tracked source with an`expo-module.config.json`declaring`"platforms": ["android"]`, and it ships inside the phone binary. A change to it triggers **no**
adhoc build today. This is already a known open Epic 10 retro action item ("Widen the Wear CI
trigger paths… a PR touching only `modules/wear-data-layer/` never runs the Wear job").
  2. **`watch-android/**`must be in the nightly's Android path set.** Its absence from`android-release.yml`is *correct* there —`fastlane android adhoc` builds no Wear artifact — but
     the nightly ships the Wear AAB, so a Wear-only change must trigger the Android nightly.
  3. **`.github/workflows/nightly-builds.yml` itself**, plus the shared config from AC3, must be in
     the set, matching the existing convention that a pipeline change is exercised on merge.
     The negative patterns stay and their order stays load-bearing: `!**/*.test.ts`,
     `!**/*.test.tsx`, `!**/*.stories.tsx`.

- **AC5 — the baseline is durable, and it fails OPEN.** After a successful build **and upload**, the
  job records the built commit. Two moving lightweight git tags — `nightly/ios` and
  `nightly/android` — force-pushed with the default `GITHUB_TOKEN` (`permissions: contents: write`).
  Chosen over an `actions/cache` entry (evicted after 7 unused days, so a quiet fortnight silently
  loses the baseline) and over reconstructing it from the Actions API (a _skipped_ run is also
  `conclusion: success`, so the API cannot distinguish "nothing changed" from "we shipped", and
  per-job archaeology breaks on a job rename). Tags also make the pending diff a one-liner for a
  human: `git log nightly/ios..main`.
  Three properties this must have, all verified not assumed:
  - **No baseline → build.** A missing tag means "we do not know", and the safe answer to that is to
    ship, not to skip.
  - **The tag is only moved after the upload succeeds.** Moving it on a build failure would silently
    swallow the change forever.
  - **⚠️ The tag names must not match any existing tag trigger.** `store-upload.yml` fires on
    `push: tags: ['v*.*.*', '!v*.*.*-*']` and `beta-releases.yml` on `push: tags: ['v*.*.*-rc.*']`.
    `nightly/ios` matches neither — **verify this, do not reason about it**; a nightly tag that
    accidentally matched would trigger a **production store upload every night**. Using
    `GITHUB_TOKEN` rather than `STORY_BOT_TOKEN` is a second, independent guard: pushes made with the
    default token do not trigger workflow runs at all.

- **AC6 — two new `versionCode` bands, with no possible collision.** `GITHUB_RUN_NUMBER` is per
  workflow file, so `nightly-builds.yml` starts a fifth independent counter. Allocate:

  | Band        | Consumer             | Set by               |
  | ----------- | -------------------- | -------------------- |
  | `0`         | phone, alpha/beta    | `beta-releases.yml`  |
  | `1_000_000` | phone, production    | `store-upload.yml`   |
  | `2_000_000` | Wear OS, alpha/beta  | `beta-releases.yml`  |
  | `3_000_000` | Wear OS, production  | `store-upload.yml`   |
  | `4_000_000` | **phone, nightly**   | `nightly-builds.yml` |
  | `5_000_000` | **Wear OS, nightly** | `nightly-builds.yml` |

  For the phone the offset is applied as workflow arithmetic (`$((GITHUB_RUN_NUMBER + 4000000))`),
  matching `store-upload.yml`'s existing shape — `app.config.ts` reads a single env var at prebuild
  and has no other option. For Wear the offset is applied **in
  `watch-android/app/build.gradle.kts`**, selected by `WEAR_RELEASE_TRACK`, because that file's own
  comment forbids the alternative in as many words: _"Do not 'restore consistency' with the phone by
  moving the arithmetic into YAML."_ `WEAR_RELEASE_TRACK` is **binary today** — `Fastfile:309` maps
  anything that is not the literal `production` to `"beta"`, i.e. band `2_000_000` — so it must
  become three-state, and a typo must still land on the _beta_ band rather than a production one, per
  the reasoning already written at `build.gradle.kts:63-72`. The existing positive-integer validation
  and the `2_100_000_000` ceiling check must still hold for the larger values — **verified against a
  real build, not assumed.**
  **State the consequence in the band table's own documentation:** nightly codes are _higher_ than
  production codes, so a device on a nightly will never receive a production build as an update. That
  is acceptable for an internal track and unacceptable to discover by surprise.

- **AC7 — Android goes to Play's `internal` track, and Wear to `wear:qa`.** The phone AAB uploads to
  `internal` (Play's internal-testing track — up to 100 testers, no review). The Wear AAB uploads to
  **`wear:qa`**, which is Play's _well-known_ Wear internal-testing track name; `wear:internal` does
  not exist, and `wear:` + the phone's track name is not a valid derivation — RC v1.0.0-rc.21 died on
  `Track not found: wear:alpha` proving the derivation is not a rule. **The reason an override is
  needed here is narrower than the draft implied, and it is worth stating exactly:** this app's Wear
  form factor has `qa` (internal) and `alpha` (closed) — so the phone's `alpha` _does_ derive
  correctly today, but the phone's `internal` derives `wear:internal`, which **does not exist**. The
  Wear internal track is named `qa`. That single gap is the whole reason this story sets the override.
  The mechanism is already on `main` (#218): set `WEAR_PLAY_TRACK: wear:qa` in the workflow env and
  `wear_play_track` uses it verbatim. **Do not add a second override, a lane parameter, or a
  `WEAR_TRACK_PREFIX` variant** — the env var is the sanctioned seam and `Fastfile:369-370` says so
  in as many words ("Set it in the release workflow rather than editing the default here, so the
  phone and Wear tracks stay visibly paired"). A `Track not found` will already print
  `available_play_tracks`' diagnostic; **confirm that path is reached from the nightly lane** rather
  than assuming it, since it lives in `upload_wear_bundle!`'s `rescue`.

- **AC8 — nightly uploads are `completed`, not `draft`, and the reason is written down.**
  `fastlane android beta` uses `release_status: "draft"` deliberately, so promoting an RC to testers
  stays a human action. A nightly whose entire purpose is unattended delivery must not require a
  nightly human click, so it uploads as `completed`. This divergence from the RC lane is the single
  most likely thing for a future reader to "fix" back; it goes in the Fastfile as a comment, next to
  the value, not in this story only.

- **AC9 — iOS reuses the existing TestFlight path unchanged, and the Apple Watch rides along.**
  This is settled by **ADR-2026-04-11-002** (`docs/architecture.md:171-187`): _"Apple requires ALL
  watchOS apps — including 'independent' ones (watchOS 6+) — to be distributed embedded inside the
  iOS app's IPA archive. **There is no standalone watchOS binary upload to App Store Connect or
  TestFlight.**"_ Any AC that asks for a separate watch upload is asking for something Apple does not
  provide. The
  nightly's iOS job runs the same lane semantics as `fastlane ios beta` — including
  `latest_testflight_build_number + 1`, which is workflow-independent and therefore needs no band.
  `apply_distribution_signing` already covers `myLoyaltyCards`, `watch` and `watchwidget`, so no
  watch-specific work exists. `upload_to_testflight` is called bare today (no `groups:`, no
  `distribute_external:`), which delivers to App Store Connect **internal** users only — that is
  already exactly "the internal track" for iOS, so **do not add a tester group**; state it in the
  docs instead. The prebuild + `watch-ios/Scripts/generate-catalogue.swift` step must be present, as
  in all three existing iOS paths, or the watch ships a stale brand catalogue.

- **AC10 — a failed nightly is loud, and a skipped nightly is not a failure.** The workflow reuses
  the optional-`SLACK_WEBHOOK_URL` pattern from `ci-quality-gates.yml:139` (`failure() && env… != ''`)
  so failure notification works if the secret is present and costs nothing if not. A skip produces a
  green run with an explanatory summary, never a red X and never a warning annotation — otherwise the
  common case trains everyone to ignore the signal.

- **AC11 — the documentation describes the real pipeline.**
  [`docs/cicd.md`](../../cicd.md) gains the nightly to its Mermaid diagram, its workflow list, a
  "Nightly internal builds" section covering the change gate and the baseline tags, and a runbook
  entry for _"the nightly did not run / did not ship"_ (check the baseline tag first). This is a
  standing obligation, not a nicety: Epic 11's retro action item #2 is _"Keep `docs/cicd.md` current
  whenever Fastlane or workflow files change"_, and its discussion notes say _"Any future changes to
  Fastlane lanes or Apple bundle IDs must be reflected immediately"_.
  `watch-android/README.md`'s versionCode band table gains its fifth and sixth rows, **and its two
  stale statements are corrected while the file is open**: it still says "Wear OS APK" /
  `build_wear_apk!` / `upload_wear_apk!` throughout § Signing, Play and Asset Links (the Fastfile has
  shipped `*_bundle!` since rc.20), and its Known gaps still list _"No Fastlane lane for the watch
  APK"_, superseded by Story 16.35.
  [`CONTRIBUTING.md`](../../../CONTRIBUTING.md) notes that a change outside the binary-affecting path
  set will not produce a nightly build, plus the AC3 gate-list updates.
  `docs/architecture.md:414-426`'s Dev row gains a pointer to the nightly as the mechanism that
  finally implements it.

- **AC12 — verified on real runs, and the evidence recorded.** Nothing below can be proven from this
  repository, so the story is not done until each is observed and written into the Dev Agent Record:
  1. The cron fires at all, on the default branch, after the workflow is merged.
  2. A night with **only** a `chore(sprint): … [skip ci]` commit on `main` **skips both platforms**.
  3. A night with a real source change **builds and uploads both platforms**.
  4. The iOS build appears in TestFlight, and the Apple Watch app installs from it.
  5. The phone AAB appears on Play `internal` with `versionCode 4_000_000 + N`.
  6. The Wear AAB appears on **`wear:qa`** with `versionCode 5_000_000 + N`, and installs on a paired
     Wear OS device. The track's _existence_ is confirmed (ifero, 2026-09-03), so what is left to
     prove is that the upload succeeds and the app installs — a normal verification, no longer the
     story's biggest unknown. **The first run is still the first machine confirmation**; on a
     `Track not found`, read `available_play_tracks`' printed list before changing anything.
  7. Both baseline tags advanced to the built commit, and no `v*` workflow was triggered by pushing
     them.

- **AC13 — `workflow_dispatch` is a real testing tool, with four inputs and one hard rule.** ifero
  asked for this explicitly: _"I would also like the nightly to be manually triggered too if I need
  to run some tests."_ A `force`-only boolean is not enough, because the expensive and the risky parts
  of this pipeline are separable and a tester needs to reach them independently.

  | Input      | Type                               | Default | Purpose                                                                                                                                                                                                         |
  | ---------- | ---------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `platform` | choice: `both` / `ios` / `android` | `both`  | Test one half without paying the other's cost — iOS is the 10× `macos-latest` job                                                                                                                               |
  | `force`    | boolean                            | `true`  | Bypass the AC2 change gate. **Defaults true on dispatch**: a manual run's whole point is to build regardless of the diff, and a dispatch that silently skipped would be indistinguishable from a broken trigger |
  | `dry_run`  | boolean                            | `false` | Build and verify **everything**, upload **nothing** — see below                                                                                                                                                 |
  | `ref`      | string                             | (empty) | Build a branch or tag instead of the default branch's tip                                                                                                                                                       |

  **⛔ THE HARD RULE: a `workflow_dispatch` run must NEVER move a baseline tag.** Three independent
  reasons, and any one of them is sufficient:
  1. A `platform: ios` run knows nothing about the Android diff, so advancing `nightly/android` would
     silently consume an unshipped Android change — the exact "swallowed forever" failure AC5 guards.
  2. A `force` run ships a commit the gate would have skipped; recording it as the new baseline
     rewrites history the cron reasons from.
  3. A `dry_run` uploads nothing, so there is nothing for a baseline to attest to.

  Implement it as an explicit `if: github.event_name == 'schedule'` on the tag-move step, not as a
  chain of input checks — an allow-list of one event is auditable at a glance, and a future fifth
  input cannot accidentally satisfy it.

  **`dry_run` is the input that makes this genuinely safe to experiment with.** Without it, every
  test run burns a real TestFlight build number and a real Play `versionCode` (neither is reusable),
  and pushes a build to real internal testers. With it, the run exercises the whole expensive
  path — prebuild, the watchOS catalogue generator, `build_app`, `bundleRelease` for both Android
  artifacts, and the signing-parity check — then stops before the two `supply` calls and the
  TestFlight upload. `ref` exists for the same reason: `schedule:` can only ever run the default
  branch's copy of the file (AC1), so **a dispatch is the only way to test this workflow before it is
  merged**, and even then only the _jobs_ can be tested from a branch, never the cron itself.

  **A dry run must still leave something installable behind.** PR #218 already added an
  `if: always()` artifact upload for the Wear bundle (`wear-os-bundle-${{ github.run_id }}`,
  `beta-releases.yml:236-247`) for precisely this reason — a hand upload through the Console needs a
  _signed_ bundle, and the release keystore is not in the repo, so a local build can only ever
  produce an unsigned one. Mirror that step for the IPA and the phone AAB, `if: always()`, so a
  `dry_run` (and any failed run) yields downloadable, correctly-signed artifacts. This is the one
  place where doing more than the schedule needs is justified: the artifacts are the deliverable of a
  test run.

  **Both entry points must reach the same code.** The build/upload jobs take the platform decision as
  an input, so `preflight` computes it from a diff on `schedule` and from `platform`/`force` on
  `dispatch`, and nothing downstream branches on `github.event_name` except the tag-move step above.
  Two divergent paths would mean the thing you tested by hand is not the thing that runs at 3am.

## Tasks / Subtasks

- [x] **Task 1 — baseline on PR #218** (AC7) — **DONE 2026-09-03.** Merged as `fe0febc`;
      `wear_play_track` + `WEAR_PLAY_TRACK` + `available_play_tracks` are on `main`, and this story's
      `baseline_commit` is `fe0febc`. Nothing to build here — the nightly sets the env var and stops.
- [x] **Task 2 — the shared path-filter config and its drift guard** (AC3, AC4)
  - [x] Author the committed config (one iOS set, one Android set, shared negatives)
  - [x] `scripts/check-build-path-filters.mjs` + `yarn check:build-path-filters`, wired into
        **`.husky/pre-push` AND `ci-quality-gates.yml` AND both ordered lists in
        `CONTRIBUTING.md:272-300`** — the doc contract in AC3
  - [x] Unit tests for the comparison as `scripts/lib/*.test.js` — **`.test.js`, not `.test.ts`**: a
        `.test.ts` under `scripts/` gets typechecked against an undeclared transitive `@types/node`
  - [x] Add `modules/**` to both existing workflows; verify the guard now passes
- [x] **Task 3 — the preflight job** (AC2, AC5)
  - [x] Baseline resolution from `nightly/ios` / `nightly/android`, fail-open when absent
  - [x] `git diff --name-only` against the config, per platform, honouring the negative patterns
  - [x] Two job outputs + a `$GITHUB_STEP_SUMMARY` block
  - [x] **Verify the tag names match no existing `push: tags` pattern** before the first run
- [x] **Task 4 — the version-code bands** (AC6)
  - [x] `4_000_000` phone offset in the nightly workflow's versionCode step
  - [x] `5_000_000` Wear band: make `WEAR_RELEASE_TRACK` three-state in `build.gradle.kts`; keep the
        typo-lands-on-beta stance
  - [x] Real Gradle builds + `aapt2 dump badging` for each state, and for the invalid-input cases
        (`""`, `0`, `-3`, `abc`) — the existing table in Story 16.35's record is the format to match
  - [x] Band table rows in `build.gradle.kts` and `watch-android/README.md`, including the
        "nightly > production, so no downgrade path" consequence
- [x] **Task 5 — the Fastlane nightly destination** (AC7, AC8, AC9)
  - [x] Android: phone track `internal` + `release_status: "completed"`, factored so `beta`,
        `upload_release` and the nightly share one body rather than a third copy-paste
  - [x] Wear track comes from `WEAR_PLAY_TRACK: wear:qa` **in the workflow env** — no Fastfile
        change, no second override (`Fastfile:369-370` sanctions exactly this seam)
  - [x] **Route every path through `project_path`** — a lane body's cwd is `fastlane/`, not the
        project root, and a raw `Dir.glob`/`sh` there silently returns `[]`. This produced the
        release-breaking finding #1 in Story 16.35's review
  - [x] iOS: reuse `beta`'s semantics verbatim; no `groups:`, no new band
- [x] **Task 6 — the workflow itself** (AC1, AC10, AC13)
  - [x] Cron at an off-peak minute, concurrency group, `timeout-minutes` on every job
  - [x] `workflow_dispatch` with all four AC13 inputs: `platform` (choice), `force` (default
        **true**), `dry_run`, `ref`
  - [x] **`if: github.event_name == 'schedule'` on the tag-move step** — the AC13 hard rule, as a
        one-event allow-list rather than a chain of input checks
  - [x] `if: always()` artifact uploads for the IPA and phone AAB, mirroring #218's existing
        `wear-os-bundle-${{ github.run_id }}` step (`beta-releases.yml:236-247`), so a `dry_run` or a
        failed run still yields signed, downloadable artifacts
  - [x] The full setup preambles (Node 24 / Ruby 4.0.5 / Xcode latest-stable for iOS; + JDK 17 and
        `platforms;android-36 build-tools;36.0.0` for Android, because the Wear build needs them)
  - [x] Optional Slack-on-failure step
- [x] **Task 7 — documentation** (AC11)
- [ ] **Task 8 — real-run verification and the record** (AC12) — ⛔ **CANNOT BE CLOSED FROM THIS
      REPOSITORY, and that is expected.** The cron only runs the default branch's copy of the
      workflow, and Play/TestFlight cannot be exercised locally. Same shape as Story 16.35's
      AC9, which was also merged open. Everything provable locally has been proved — see the
      Dev Agent Record. The first dispatched run after merge closes items 1, 3-7; item 2 (a
      docs-only night skipping) is already verified against real history locally.

## Dev Notes

### Files this story touches, and what must survive

| File                                                         | State today                                                                                                     | This story                                                      |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `.github/workflows/nightly-builds.yml`                       | **NEW**                                                                                                         | the whole thing                                                 |
| `.github/workflows/ios-release.yml`                          | `on.push.paths` allow-list at `:10-45`; no `modules/**`                                                         | add `modules/**` only — **do not** touch the negatives' order   |
| `.github/workflows/android-release.yml`                      | same at `:10-42`; no `modules/**`, deliberately no `targets/**`/`watch-ios/**`                                  | add `modules/**` only; the deliberate absences stay absent      |
| `.github/workflows/ci-quality-gates.yml`                     | 11 gates; already `fetch-depth: 0`                                                                              | add `yarn check:build-path-filters`                             |
| `fastlane/Fastfile`                                          | `android beta`→`alpha`/draft, `android upload_release`→`production`; `WEAR_TRACK_PREFIX`; `project_path` helper | a nightly destination; factor the shared upload body            |
| `watch-android/app/build.gradle.kts`                         | 4 bands, binary `WEAR_RELEASE_TRACK`, validation + `2_100_000_000` ceiling                                      | 5th/6th band; three-state selector; validation must still apply |
| `docs/cicd.md`, `watch-android/README.md`, `CONTRIBUTING.md` | describe a release-triggered pipeline with no nightly                                                           | AC11                                                            |

### Six things that will bite, from this repo's own history

1. **A lane body's working directory is `fastlane/`, not the project root.** fastlane wraps the lane
   in `Dir.chdir(FastlaneCore::FastlaneFolder.path)`; action _parameters_ resolve against the root
   because `execute_action`'s `custom_dir` defaults to `".."`, but raw Ruby and `sh` do not. Story
   16.35's review found a `Dir.glob` that returned `[]` **with the artifact on disk**, aborting the
   lane _after_ the phone AAB had uploaded. Use `project_path` for everything.
2. **`skip_upload_apk: true` is required on every phone `upload_to_play_store` call**, even when
   `aab:` is passed explicitly. `upload_to_play_store.rb:10-17` fills `apk:` from `lane_context`
   whenever neither `apk:` nor `apk_paths:` is given, and supply's `verify_config!` then refuses the
   pair. This is what failed RC v1.0.0-rc.19.
3. **Build everything before uploading anything.** The invariant is
   `build phone AAB → build+verify Wear AAB → upload phone → upload Wear`, and it exists so a Kotlin
   error, an R8 failure or a signing mismatch happens while nothing has shipped. The irreducible
   risk window is only the two `supply` calls: `:apk`/`:apk_paths` are declared `conflicting_options`
   with `:aab`/`:aab_paths`, so one invocation can never carry both.
4. **An unsigned AAB is named `app-release.aab`, identical to a signed one** — no `-unsigned` suffix.
   `scripts/check-android-signing-parity.mjs` (via `keytool -printcert -jarfile`; `apksigner` cannot
   read an AAB at all) is the _only_ guard. It already runs inside `build_wear_bundle!`, so the
   nightly inherits it — **confirm that, do not re-add a name-based check.**
5. **`app.config.ts` silently falls back to a Unix-timestamp versionCode** on an invalid
   `ANDROID_VERSION_CODE` (`resolveAndroidVersionCode`, `app.config.ts:30-41`), while
   `build.gradle.kts:104-113` hard-fails. The asymmetry is deliberate and documented in both files.
   A nightly whose env wiring breaks would therefore ship the phone with a timestamp code (≈1.7e9 —
   inside the ceiling, _above every band_, and unrecoverable) while Wear goes red. Worth a preflight
   assertion that `ANDROID_VERSION_CODE` is in the `4_000_000` band before the phone build.
6. **`android-actions/setup-android@v4` never puts `build-tools` on `PATH`** (verified against the
   action's bundled `dist/index.js` at v4.0.1) — only `cmdline-tools` and `platform-tools`. The
   signing-parity script's glob-based tool resolution is load-bearing, not over-engineering.

### Testing standards for this story

Almost all of this story is YAML and Ruby that **cannot be unit-tested**, which is precisely why AC12
exists and why the one genuinely testable piece must actually be tested.

- **What gets real tests:** the AC3 path-filter comparison and the glob matching used by the AC2 diff.
  These are pure functions over string lists — put them in `scripts/lib/` with
  `scripts/lib/*.test.js` beside them (**`.test.js`, not `.test.ts`** — a `.test.ts` under `scripts/`
  gets typechecked against an undeclared transitive `@types/node`). Cover at minimum: a positive
  match, a negative-pattern exclusion, a commit touching **both** a test file and real source (must
  build — the ordering rule at `ios-release.yml:41-44`), a docs-only commit (must skip), and a
  `modules/**` change (must build, which is the AC4 regression test).
- **What is verified by real Gradle builds, not tests:** every `WEAR_RELEASE_TRACK` state and every
  invalid `WEAR_VERSION_CODE`. Story 16.35's Dev Agent Record has the table format to match; produce
  the same one via `aapt2 dump badging`.
- **Coverage thresholds do not apply.** The 80% global gate is scoped to `features/**`, `core/**` and
  `shared/**`; `scripts/` is outside `collectCoverageFrom`, so adding files here cannot move
  coverage — do not chase a number that is not being measured.
- **The scripts-under-test subprocess patterns already exist in this repo** for `scripts/*.mjs`; reuse
  them rather than inventing a third.
- **Green tests prove nothing about delivery here.** This is the same lesson as Story 16.35, whose CI
  was green while shipping nothing from `watch-android/`, and the same as the Epic 16 retro's
  device-gate finding. AC12 is the only real test in this story.

### Project conventions that apply

- Branch prefix is **`feature/`**, not `feat/` — read `CONTRIBUTING.md` first.
- **`--no-verify` is forbidden.** If a hook blocks the push, fix the gate (e.g. `.prettierignore` for
  generated content), never bypass it.
- Tests are **co-located** beside their subject; `__tests__/` folders are banned and CI-enforced
  (`yarn check:no-tests-folders`), with `targets/`/`watch/` allowlisted. **But tests for `scripts/`
  are `.test.js`** — see Task 2.
- Update this story's `Status:` to `review` **and** its `sprint-status.yaml` key to `review` when
  opening the PR.
- Put a literal `docs/sprint-artifacts/stories/16-36-nightly-internal-track-builds.md` path in the PR
  body: it short-circuits the numeric story scan in `scripts/lib/story-refs.mjs`, which has
  previously marked the wrong story done from a bare `N.M` in a PR body.
- Working in a `.claude/worktrees/` checkout? `core.hooksPath` is pinned to the **main** checkout's
  `.husky/_`, so you run another branch's hooks. Fix with `yarn install` **then**
  `git config --worktree core.hooksPath .husky/_` — the config line **alone** silently disables every
  hook, because no `.husky/_` exists yet and the push then looks clean with zero gates run.

## Out of scope — flagged, not fixed

- **Unifying the `versionCode` counter.** The real defect underneath AC6 is that five pipelines each
  own a per-workflow counter and stay apart only by band arithmetic. A repo-global monotonic value
  (`git rev-list --count HEAD`, say) would delete the whole band scheme. That is a much larger,
  release-critical refactor across `app.config.ts`, `build.gradle.kts` and four workflows, and it
  should be its own story. **Adding two bands is the conservative move on purpose.**
- **Extracting the copy-pasted setup preamble into a reusable `workflow_call`.** There are no reusable
  workflows in the repo today and the ~15-step preamble is duplicated across four release workflows;
  the nightly makes it five. Real tech debt, wrong story.
- **~~Setting `WEAR_PLAY_TRACK` on the RC and production lanes.~~ RETIRED 2026-09-03** — an earlier
  draft of this story called this urgent, on the belief that the release lanes' derived `wear:alpha`
  pointed at nothing. ifero confirmed the Wear form factor has a closed track literally named
  `alpha`, so the derived value is correct and **the RC lane needs no override**. Nothing is owed
  here. The one name still unconfirmed is `wear:production` for `store-upload.yml`; it is a
  well-known name that Play provisions with the form factor, so it very likely exists, but **confirm
  it before the next production release** rather than discovering it mid-upload — that lane commits
  the phone AAB first, so a Wear failure there is a live phone-only release. Out of scope either way:
  this story never touches `production`.
- **`timeout-minutes` on the _existing_ release jobs.** `beta-releases.yml` and `store-upload.yml`
  have none. AC1 covers only the new workflow. One-line fix, separate PR, so a release-path change
  is not smuggled into a feature story.
- **Discharging the Epic 10 "widen the Wear CI trigger paths" item in full.** AC4 fixes the two
  _release_ workflows only. See the Notes → _Retrospective items_ section for the exact boundary and
  what the Dev Agent Record has to state either way.
- **Downgrading `wear-os-build.yml` to a nightly.** Its own header invites this ("If Gradle ever gets
  slow enough to hurt, downgrade this to a nightly and say so in the README") but it runs in ~1m30s.
  Not a problem yet.
- **A TestFlight external tester group, and Play Console tester-list management.** Console data, not
  repository content.
- **Release notes / changelog for nightlies.** All `upload_to_play_store` calls already pass
  `skip_upload_changelogs: true`.
- **OTA/EAS Update as a cheaper nightly channel.** There is no `eas.json` in this repo and no EAS
  build path; every pipeline is native GitHub Actions + Fastlane. A JS-only nightly over
  `expo-updates` is a genuinely different (and cheaper) product decision, and it cannot deliver the
  native Wear OS or watchOS halves at all — which is most of what was asked for.
- **Any change to app behaviour, UI or dependencies.** This is delivery only.

## Notes

**Why Epic 16 and not Epic 11.** Epic 11 (CI/CD & Quality Gates) is `done`, and `create-story` refuses
to add to a completed epic. Epic 16 is the standing platform bucket and already owns the whole
release-plumbing family — **11.2** ("Build on main only if app code changes" — the path-filter
ancestor), 16.7 (versionCode bands) and 16.35 (Wear delivery) are this story's direct ancestors, and
it inherits their scars rather than rediscovering them.

**The user-facing outcome, named explicitly** — Epic 16's conventions require it of an Enabling story
(`docs/epics.md:35-39`: enabling work is permitted _"only when it directly unlocks a user-facing
outcome in the same phase"_). It is this: internal testers receive and can actually use yesterday's
`main` on phone **and** watch, on both platforms, without anyone cutting a release.

**No new FR, and that is the convention rather than an omission.** Epic 11 carried **no** FR/NFR
coverage at all — it appears nowhere in the `docs/epics.md` Requirements Inventory, and its header
has no `**FRs Covered:**` line, unlike every user-facing epic. Story 16.35 added none either. FR85
and NFR-M9 are both free if a traceability anchor is later wanted; NFR-M9 (Maintainability) is the
correct slot. **Do not "helpfully" assign FR85** — the PRD has two written-down notes about people
reusing already-assigned FR numbers, and `docs/epics.md:180` records an existing FR75/FR76 desync
between the PRD and the inventory.

**⚠️ "Nightly" already means something else in this repository.**
[`wear-os-build.yml:22-24`](../../../.github/workflows/wear-os-build.yml) says _"If Gradle ever gets
slow enough to hurt, downgrade this to a nightly and say so in the README"_ — there, nightly is a
**cost-reduction downgrade for a PR job**. This story inverts the word into a **distribution
trigger**. Two different mechanisms, one noun; say which one you mean in every comment you write.

### Retrospective items this story touches

- **Closes (or should explicitly say it does not):** Epic 10's open _"Widen the Wear CI trigger
  paths"_ item. Note the scope boundary carefully — that item is about `wear-os-build.yml`'s **test**
  trigger missing `modules/wear-data-layer/` **and** `core/wear-connectivity.ts`; AC4 fixes only
  `modules/**` in the two **release** workflows. The Epic 10 retro (§6) explicitly parked the wider
  fix as _"a CI-policy change"_ needing its own story, and this is the natural home — but the item
  stays open unless AC4 is widened to `wear-os-build.yml` too. **Record which, rather than leaving it
  ambiguous.**
- **Fires:** DEC-E10-RETRO-002. The Epic 5 generic-complication follow-up has been parked for four
  sprints with the trigger _"draft it when the Wear OS APK is published to Play"_. A working nightly
  delivering to `wear:qa` is that confirmation.
- **Partially answers:** Epic 11 retro action item #5, _"Add a CI check for watchOS workflow health —
  validate `watchos-tests.yml` and TestFlight triggers remain functional after future changes"_,
  never implemented. A nightly that uploads to TestFlight every night is a continuous liveness check
  on exactly that path.
- **Does not fix:** Epic 10's open _"Wear OS field observability"_ (critical-path). It makes it worse
  in one specific way worth stating — the nightly puts Wear builds in testers' hands more often, and
  `watch-android` still has no crash reporting, so a nightly-introduced Wear crash produces zero
  signal. AC10's loud-failure stance covers the _pipeline_, not the _app_.

**Cost, stated plainly.** The worst case is one `macos-latest` iOS build plus one `ubuntu-latest`
Android+Wear build per night. The macOS multiplier is 10×, so the iOS job dominates the bill and the
gate exists mostly to suppress it. If the observed skip rate is low, the honest follow-up is to move
iOS to every-other-night or to weekdays — **not** to loosen the path list, which would trade a
visible cost for an invisible one.

**The scariest assumption is no longer the track name.** ifero confirmed the Wear form factor has
`qa` (internal) and `alpha` (closed), so `wear:qa` exists and this story's destination is settled.
Two things about how that was settled are worth keeping, because the _method_ is the reusable part:

- **A human said so; no run has asked Play.** That is good enough to write the YAML against — it is
  a direct observation of the Console, which is more than any previous draft had — but the first
  dispatched run is still the first machine confirmation. If it comes back `Track not found`, read
  `available_play_tracks`' printed list before changing anything else.
- **The failure mode that fooled me once.** rc.20 failed with "APKs are not allowed" and I read that
  as proof the track existed. It proves nothing: `Uploader#perform_upload` uploads the artifact
  **before** calling `update_track`, so a rejected artifact means track resolution never ran. Do not
  re-derive that inference from a future error message.

**What is genuinely unproven now** is everything the repository cannot see: that the cron fires, that
the skip gate classifies a `[skip ci]`-only night correctly, that Play accepts a `wear:qa` upload and
the app installs on a paired device, and that the baseline tags advance without triggering a `v*`
workflow. That is AC12, and it is unchanged.

**Retro material.** Every hazard in this story's banner was already written down somewhere in the
repo — the per-workflow run-number scoping in three separate comments, the Wear track naming in a
memory and an open PR, the `modules/**` gap in an open retro action item. None of it had a CI status
check. Story 16.35's retro note said the same thing about `assembleDebug`, and AC3 is the first
attempt in this family to answer it with a guard instead of a paragraph.

### References

| Source                                                                                                   | What it establishes                                                                     |
| -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| [docs/cicd.md](../../cicd.md) — whole file                                                               | The single source of truth for the pipeline; AC11 must update it                        |
| docs/cicd.md:117-126                                                                                     | The canonical binary-affecting path set — AC3/AC4's oracle                              |
| docs/cicd.md:243-251                                                                                     | The `[skip ci]` trap and why `release`/`schedule` beat `push`                           |
| docs/cicd.md:400-403                                                                                     | Build-number rules, incl. the `+1,000,000` production band                              |
| docs/architecture.md:414-426                                                                             | **Ratified** Dev = TestFlight + Internal Track, Approval: none                          |
| docs/architecture.md:171-187 (ADR-2026-04-11-002)                                                        | No standalone watchOS upload exists — AC9                                               |
| docs/project-context.md:412-419                                                                          | Env/distribution table; `runtimeVersion` ⇒ native changes cannot ship OTA               |
| CONTRIBUTING.md:255-310                                                                                  | The gate lists AC3 must keep in sync; `--no-verify` forbidden                           |
| [.github/workflows/ios-release.yml:10-45](../../../.github/workflows/ios-release.yml)                    | Path allow-list + the load-bearing negative-pattern ordering                            |
| [.github/workflows/android-release.yml:10-42](../../../.github/workflows/android-release.yml)            | Its Android counterpart, and the deliberate omissions                                   |
| [.github/workflows/beta-releases.yml:1-31](../../../.github/workflows/beta-releases.yml)                 | Trigger + concurrency precedent; the `[skip ci]` rationale in comments                  |
| [.github/workflows/ci-quality-gates.yml:28-31,139](../../../.github/workflows/ci-quality-gates.yml)      | Already `fetch-depth: 0`; the optional-Slack pattern                                    |
| [fastlane/Fastfile:119-151](../../../fastlane/Fastfile)                                                  | `ios beta` — TestFlight build number from remote state, so no band needed               |
| fastlane/Fastfile:215-235                                                                                | `project_path` and the lane-cwd-is-`fastlane/` warning banner                           |
| fastlane/Fastfile:307-339, :375-425                                                                      | `build_wear_bundle!` / `upload_wear_bundle!`, and the build-before-upload order         |
| fastlane/Fastfile:446-498                                                                                | `android beta` — `alpha` + `draft`, and why `skip_upload_apk` is required               |
| [watch-android/app/build.gradle.kts:20-131](../../../watch-android/app/build.gradle.kts)                 | The band scheme, `WEAR_RELEASE_TRACK`, validation, ceiling                              |
| watch-android/README.md:401-513                                                                          | Wear signing, tracks, band table — AC11 corrects its APK-era wording                    |
| docs/epics.md:2175-2184 (Story 11.2)                                                                     | The path-filter ancestor, and the CI-minutes rationale                                  |
| docs/epics.md:3135-3153 (Story 16.35)                                                                    | The AC template and every Wear delivery constraint this story inherits                  |
| docs/epics.md:2668-2672, :35-39                                                                          | Epic 16 standing-bucket + the Enabling-story user-outcome rule                          |
| [Story 16.35 file](16-35-ship-wear-os-apk-to-play.md) — Dev Agent Record                                 | rc.19/rc.20/rc.21 failure history; the four review findings                             |
| PR [#218](https://github.com/ifero/myLoyaltyCards/pull/218) — MERGED `fe0febc`                           | `wear_play_track` / `WEAR_PLAY_TRACK` / `available_play_tracks` — this story's baseline |
| fastlane/Fastfile:365-395, :413                                                                          | The merged track-override + diagnostic contract, and its sanctioned seam                |
| sprint-status.yaml action_items                                                                          | The open Epic 10 CI-path and observability items this story touches                     |
| docs/sprint-artifacts/epic-10-retro-2026-08-20.md:150-156                                                | Path-filter widening classified as a CI-policy change needing its own story             |
| docs/sprint-artifacts/epic-16-retro-2026-07-11.md:68                                                     | "a class of defect only appears at the device gate" — the story's justification         |
| [developers.google.com/android-publisher/tracks](https://developers.google.com/android-publisher/tracks) | The well-known track names, incl. `wear:qa`                                             |

## Dev Agent Record

Implemented 2026-09-03 on `feature/16-36-nightly-internal-track-builds`, baselined on `fe0febc`
(the PR #218 merge).

### Agent Model Used

claude-opus-5 (Claude Code, `bmad-dev-story`)

### Files changed

| File                                     | Why                                                                                                                    |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `.github/workflows/nightly-builds.yml`   | **NEW** — AC1/AC2/AC10/AC13: cron, 4-input dispatch, preflight, both build jobs, baseline tags, failure notify         |
| `.github/build-path-filters.json`        | **NEW** — AC3: the single source of truth for "can this reach a binary?"                                               |
| `scripts/lib/build-path-filters.mjs`     | **NEW** — AC2/AC3: glob subset, GitHub `paths` semantics, workflow scanner, drift comparison, `decideBuild`            |
| `scripts/lib/build-path-filters.test.js` | **NEW** — 33 tests over all of the above                                                                               |
| `scripts/check-build-path-filters.mjs`   | **NEW** — AC3: the drift guard CLI                                                                                     |
| `scripts/nightly-build-decision.mjs`     | **NEW** — AC2/AC5: baseline resolution, tree diff, fail-open, job summary                                              |
| `.github/workflows/ios-release.yml`      | AC4 — `modules/**`                                                                                                     |
| `.github/workflows/android-release.yml`  | AC4 — `modules/**`, plus a note on why `watch-android/**` stays out                                                    |
| `.github/workflows/ci-quality-gates.yml` | AC3 — the new gate                                                                                                     |
| `.husky/pre-push`, `CONTRIBUTING.md`     | AC3 — the gate in the hook and in BOTH ordered lists (`CONTRIBUTING.md:270`)                                           |
| `package.json`                           | AC3 — `check:build-path-filters`                                                                                       |
| `watch-android/app/build.gradle.kts`     | AC6 — three-state `WEAR_RELEASE_TRACK`, `wearNightlyVersionCodeOffset`, band docs                                      |
| `fastlane/Fastfile`                      | AC7/AC8/AC9/AC13 — `ship_ios!`, `ship_android!`, two `nightly` lanes, `wear_band_for`, the `WEAR_PLAY_TRACK` preflight |
| `fastlane/README.md`                     | regenerated by fastlane, then prettier-formatted                                                                       |
| `docs/cicd.md`                           | AC11 — diagram, section, lane list, two runbooks                                                                       |
| `watch-android/README.md`                | AC11 — bands 4-6, the ordering consequence, APK→bundle wording                                                         |
| `docs/architecture.md`                   | AC11 — the ratified Dev row now points at its implementation; stale tree flagged                                       |

### Verified locally — measured, not assumed

**Android versionCode bands** (real `assembleDebug` + `aapt2 dump badging`, build-tools 37.0.0):

| `WEAR_VERSION_CODE` / `WEAR_RELEASE_TRACK` | versionCode     | Result                                                      |
| ------------------------------------------ | --------------- | ----------------------------------------------------------- |
| unset / unset                              | `2 000 000`     | ✅ bare band, local build                                   |
| `42` / unset                               | `2 000 042`     | ✅ beta band                                                |
| `42` / `production`                        | `3 000 042`     | ✅ production band                                          |
| `42` / `nightly`                           | `5 000 042`     | ✅ **new nightly band**                                     |
| `42` / `NIGHTLY`                           | `5 000 042`     | ✅ case-insensitive                                         |
| `42` / `nitely` (typo)                     | `2 000 042`     | ✅ typo lands on beta, as designed                          |
| `""` / `0` / `-3` / `abc`                  | —               | ✅ build fails, all four                                    |
| `2100000000` / `nightly`                   | —               | ✅ ceiling still enforced (`2 105 000 000 > 2 100 000 000`) |
| `2094999999` / `nightly`                   | `2 099 999 999` | ✅ accepted just under the ceiling                          |

`:app:testDebugUnitTest` passes — no Kotlin regression.

**The change gate, against real repository history:**

| Case                                                       | Result                                                                         |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------ |
| No `nightly/ios` tag                                       | ✅ BUILD, `reason=no-baseline` (fails OPEN)                                    |
| Baseline `567e0e2` → `67e3266` (a `[skip ci]` docs commit) | ✅ SKIP, 2 files changed, 0 binary-affecting — **AC12 item 2, proved locally** |
| Baseline `7b05c13` → `567e0e2` (Story 16.29, watch assets) | ✅ BUILD, 238 binary-affecting files                                           |
| `--force` on an unchanged night                            | ✅ BUILD, `reason=forced`                                                      |

**AC5's tag-safety property, checked with the repo's own matcher rather than by eye:**
`nightly/ios` and `nightly/android` match neither `v*.*.*-rc.*` nor `v*.*.*`, so a baseline tag
push cannot trigger `beta-releases.yml` or `store-upload.yml`. Using the default `GITHUB_TOKEN`
is the second, independent guard.

**Fastlane** — all lanes register (`ios: … nightly …`, `android: … nightly …`, private
`ship_ios!` / `ship_android!`); `wear_band_for` maps `alpha`→beta, `production`→production,
`internal`→nightly, typo→beta; `wear_play_track("internal")` yields `wear:internal` **without**
the override and `wear:qa` with it; the `WEAR_PLAY_TRACK` preflight aborts the lane before Gradle
is invoked.

**Repo gates:** all 11 pass. `yarn test` = **178 suites / 2217 tests**, including the 33 new ones.

### Found while implementing

1. **`modules/**`was missing from BOTH release workflows, and the reason it belongs in the iOS
one is not obvious.**`modules/wear-data-layer`declares`"platforms": ["android"]`, so the
instinct is to add it to Android only — but `core/wear-connectivity.ts:119`does`require('@/modules/wear-data-layer')`, so its TypeScript is bundled for iOS too. Verified by
   grep before writing the config, and the reason is recorded there.

2. **No YAML parser and no glob library is a declared dependency.** `js-yaml` and `minimatch`
   resolve only as transitives — the same landmine as the undeclared `@types/node` that forces
   `scripts/` tests to be `.test.js`. The config is therefore JSON (`JSON.parse` is a builtin)
   and both the glob subset and the `paths:` scanner are implemented and tested here. No new
   dependency was added.

3. **`supply` does not validate track names at all.** `Supply::Options` accepted `internal`,
   `wear:qa` **and the non-existent `wear:internal`** without complaint, so Play's server-side
   `Track not found` is the only check — and it fires _after_ the phone AAB is uploaded. That is
   what makes the `WEAR_PLAY_TRACK` preflight load-bearing rather than belt-and-braces: it is the
   same "guard evaluated too late" defect as Story 16.35's review finding #2.

4. **Two real bugs in the first draft of the workflow, both caught before commit.**
   `needs.record-baseline.result` — a hyphen in a property path is parsed as subtraction, so it
   had to become `needs['record-baseline'].result`. And the preflight's `head` output was derived
   from the iOS decision step, which is _skipped_ on a `platform: android` run — every downstream
   `checkout` would then have silently fallen back to the default branch instead of the decided
   commit. `head` is now resolved by its own step.

5. **`dry_run:false` is safe, verified in fastlane's source rather than assumed.**
   `CommandLineHandler.convert_value` maps `'true'`/`'yes'` → `true` and `'false'`/`'no'` →
   `false`, so `options[:dry_run]` is a real boolean and `!options[:dry_run]` behaves. Had it
   arrived as the string `"false"` it would have been truthy in Ruby and every nightly would have
   skipped its upload.

6. **Running fastlane locally rewrites two tracked files.** `fastlane/README.md` is regenerated
   (correctly — it picked up the new lanes) but in fastlane's own un-prettied markdown, and
   `fastlane/report.xml` is overwritten with local-run noise. The README was kept and
   reformatted; `report.xml` was reverted.

### Code review — three domain reviewers, 1 critical + 2 high + 5 others, all fixed

Run at `high` effort, one Sonnet reviewer per domain (GitHub Actions / Fastlane+Gradle / Node), so
none of them skimmed three systems at once — the shape Story 16.35's third pass established. Every
finding below was reproduced before being acted on.

**🔴 CRITICAL — a non-ASCII filename silently skipped the build.** Git's default
`core.quotePath=true` wraps any path containing a non-ASCII byte, a quote or a backslash in double
quotes with octal escaping: `core/café.ts` came back from `git diff --name-only` as
`"core/caf\303\251.ts"`, which matched no pattern. A real source change produced a **green, silent
"nothing changed" night** — precisely the failure this story exists to prevent, arriving through the
one part no pure unit test could reach. Reproduced in a throwaway repo; fixed with `-z`
(NUL-separated, immune to quoting). An accented brand asset is an entirely plausible commit in an
Italian loyalty-card catalogue. `--no-renames` was added alongside: with rename detection on,
`git mv app/big.ts docs/moved.md` reports only the destination, so a file leaving the bundle looked
like a docs-only change.

**🟠 HIGH — script injection from `workflow_dispatch` inputs.** `inputs.platform` and
`inputs.dry_run` were spliced straight into `run:` bodies. `type: choice` and `type: boolean`
constrain the _web form_, not the REST API, and `dry_run` flowed unquoted into the step holding
`MATCH_PASSWORD`, `PLAY_STORE_API_KEY` and the keystore password. Every input now reaches the shell
through `env:` — the pattern `record-baseline` already used — and both are **normalised to fixed
literals** in the preflight, so nothing downstream ever handles attacker-shaped text. An
unrecognised `platform` now fails the job. Verified: a payload of `x' ; echo PWNED ; echo '` is
rejected, not executed.

**🟠 HIGH — a failed `$GITHUB_OUTPUT` write looked exactly like a legitimate skip.** Both writes
shared one silent `catch` justified by "the decision is already on stdout" — true of the step
summary, false of `$GITHUB_OUTPUT`, which nothing reads from stdout. A failed write produced empty
job outputs, and an empty `build_ios` fails `== 'true'` identically to a real skip. Split into
`writeRequired` (fatal) and `writeBestEffort` (summary only).

**🟡 The two "independent" decisions were coupled on failure.** An `if:` with no status function is
implicitly ANDed with `success()`, so a _failing_ iOS decision skipped the Android one and cost the
whole night. Now `!cancelled() && …`.

**🟡 The Wear-track guard depended on lane discipline.** It lived in the `nightly` lane, so a future
caller of `ship_android!(track: "internal")` would reproduce Story 16.35's phone-only release. Moved
into `ship_android!` as `ensure_wear_track_resolvable!`, where every caller inherits it.
Deliberately a **deny-list of known-bad derivations**, not an allow-list of well-known names:
`wear:alpha` is not well-known and exists here only as a hand-created closed track, so an allow-list
would have broken the RC lane. Verified `alpha` and `production` still derive; `internal` without
the override is blocked.

**🟡 `extractWorkflowPaths` returned a silent `[]` on CRLF** — the one outcome its own contract
forbids, because `.` does not match `\r` and `$` without `/m` anchors to end-of-string. Also fixed:
a quoted item with a trailing comment kept its orphaned quotes, and the scanner took the _first_
`paths:` in the file rather than the one under `push:` — correct in the two guarded workflows only
by luck, and wrong the moment either gains a `pull_request` trigger.

**⚪ Smaller:** `contents: write` was workflow-scoped and is now a job-level override on
`record-baseline` alone; the baseline tag keys off a `shipped` step output rather than the job
conclusion (a flaky trailing `upload-artifact` would otherwise block the tag for a build that had
already reached TestFlight, costing a duplicate 10× upload); `normalize()` names the broken config
section instead of throwing a bare `TypeError`; `arg()` falls back when a flag is given with no
value; the cosmetic summary step is `continue-on-error`.

**Accepted, not fixed — and written into the file.** The concurrency group is shared across both
entry points, so a _queued_ dispatch can be dropped when a newer one queues behind an in-flight run
(visible as "cancelled", not silent). Splitting the group would let two runs upload to the same Play
track and TestFlight concurrently, racing track edits and burning two version codes. Mutual
exclusion is the more important property.

**The reviewers also confirmed, by reading gem source and by execution rather than inference:** no
regression in the refactored `beta`/`upload_release` lanes (argument-for-argument, including that
supply's `release_status` default is `completed`, so making it explicit changed nothing); `next`
inside a `private_lane` ends only that lane; `wear_band_for` and `build.gradle.kts` agree exactly on
all three states; `dry_run:false` arrives as a real Ruby boolean; `record-baseline` cannot run on a
dispatch; the empty-array bash is safe; and `nightly/*` matches no `v*` tag trigger.

**New coverage:** `scripts/nightly-build-decision.test.js` — 14 integration tests that build real
throwaway git repos, because the critical bug lived in the `git diff` call and mocking it would have
encoded the very assumption that was wrong.

### Not verifiable from this repository — AC12 is still open

The same position Story 16.35 merged in. `schedule:` only ever runs the **default branch's** copy
of a workflow, so the cron cannot fire until this merges; and no local run can exercise Play or
TestFlight. Outstanding:

1. The cron fires at 02:17 UTC on the default branch.
2. ~~A `[skip ci]`-only night skips both platforms~~ — **proved locally against real history.**
3. A real-change night builds and uploads both platforms.
4. The iOS build reaches TestFlight and the Apple Watch app installs from it.
5. The phone AAB appears on Play `internal` with `versionCode 4 000 000 + N`.
6. The Wear AAB appears on **`wear:qa`** with `versionCode 5 000 000 + N` and installs on a paired
   device. The track's existence is confirmed (ifero, 2026-09-03); what is unproven is the upload.
7. Both baseline tags advance, and pushing them triggers no `v*` workflow.

**Cheapest first run:** dispatch with `platform: android`, `dry_run: true`. That exercises the
whole Android path including the signing-parity gate, costs no macOS minutes, consumes no Play
`versionCode`, and leaves both AABs as run artifacts.

### Change Log

| Date       | Change                                                                                                               |
| ---------- | -------------------------------------------------------------------------------------------------------------------- |
| 2026-09-03 | Story drafted (`bmad-create-story`), catalogued in `epics.md`, added to Sprint 19 `wave_4`                           |
| 2026-09-03 | Rebased onto `fe0febc` (#218 merged); AC7 simplified to the `WEAR_PLAY_TRACK` env var                                |
| 2026-09-03 | AC13 added at ifero's request — `workflow_dispatch` as a first-class testing entry point                             |
| 2026-09-03 | Wear track inventory confirmed (`qa` = internal, `alpha` = closed); the "release lanes still broken" concern retired |
| 2026-09-03 | Tasks 1-7 implemented; 11 gates + 178 suites / 2217 tests green. Task 8 (AC12) open by design                        |
| 2026-09-03 | Code review (3 domain reviewers): 1 critical + 2 high + 5 others fixed; 179 suites / 2236 tests green                |
