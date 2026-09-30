---
baseline_commit: 2ff3e23016a3ee6130e5e0c2b3651de62fa4ac5f
---

# Story 21.7: The single rebrand release [Enabling] — and the "eight orphaned SVGs" that are seven, one of them load-bearing

Status: done

Epic: 21 — Cardì Rebrand — Native Identity

> **⛔ THIS IS A GATE. Stories 21.1, 21.2, 21.2a and 21.3–21.6 — SEVEN — ship in ONE store release
> on both platforms, or none of them ships.** `runtimeVersion.policy` is `appVersion` (`app.json:85-87`), so no part of the rebrand can
> go out as an OTA update. Sequencing the pieces into separate releases buys one store review to
> put users into an icon/name/colour mismatch and another to get them back out.
>
> **⚠️ THE EPIC'S CLEANUP AC IS WRONG IN TWO WAYS, and copying it verbatim makes it unsatisfiable.**
> It says _"the eight orphaned `app-icon-_.svg`files"*. There are **SEVEN**, and **one of them is
not orphaned**:`assets/images/app-icon-variant-aurora.svg`is imported **twice** by`test/svg-module-resolution.test.tsx` — once aliased (`@/…`), once relative (`../…`) — and that
test is a jest `moduleNameMapper` **ordering invariant**, not a component test. Deleting the file
> without repointing the test deletes a guard.
>
> **⚠️ ITS ACCEPTANCE CANNOT BE PROVEN FROM THE REPOSITORY.** Real-device verification is most of
> this story, and the Epic 10 retrospective closed with exactly this kind of validation **not
> performed and the risk accepted** (DEC-E10-RETRO-001). Sprint 19 carried the same shape twice
> (16.35's AC9, 16.36's AC12). Do it, or record the accepted risk **knowingly** — not by default.

## Story

As a user,
I want the rebrand to arrive complete,
so that I never see an app whose icon, name and colours disagree with each other.

## Story context

Six stories change the app's identity across four surfaces and three binaries. Every one of them is
a native asset or a build-time value. There is no supported half-migrated state, and no OTA path to
correct one.

### The release machinery (verified)

- `app.json`: `version` `1.0.0`, `runtimeVersion.policy` `appVersion`.
- `.github/workflows/store-upload.yml` fires on a **published, non-prerelease GitHub Release**.
  Tag-push is a documented fallback: `mark-story-done.yml` lands `[skip ci]` commits on `main` after
  most merges, and GitHub honours `[skip ci]` for `push` events — so tagging that tip and pushing
  creates **no run at all**. Publishing the release cannot be skipped.
- Fastlane lanes: iOS `upload_release`, Android `upload_release`, plus a separate Wear track. The
  Wear APK releases on its own track but is **part of this release** — the identity must not split.

### What has to be removed

| target                                | state                                                                                                                                                                                                                                                                 |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `assets/app-icons/variants/`          | 10 files across `aurora`/`forest`/`sunset`. In `aurora`, `adaptive-icon-1024.png` and `transparent/icon-foreground-1024.png` are byte-identical; in `forest` and `sunset`, `adaptive-icon-1024.png` and `icon-1024.png` are byte-identical. **Zero code references.** |
| `assets/images/app-icon-*.svg`        | **Seven**, not eight. Six are genuinely orphaned (`app-icon-foreground`, `app-icon-master`, `app-icon-variant-aurora-ios-opaque`, `-aurora-transparent`, `-forest`, `-sunset`). **`app-icon-variant-aurora.svg` is imported by a test.**                              |
| `test/svg-module-resolution.test.tsx` | Must be repointed, not deleted.                                                                                                                                                                                                                                       |

`app-icon-variant-aurora-ios-opaque.svg`, `-forest` and `-sunset` have **zero references anywhere**,
including docs. The other three are referenced only from `docs/`.

### Repointing the SVG test is a four-line change

The test needs any `.svg` under `assets/images/` reachable by **both** import styles, and asserts:
the aliased import is a `function` (a component, not an asset object); the relative import is the
same object; it renders with `width`/`height` props; and — the negative case — a `.png` stays an
`object`. All three generated Cardì SVGs (`cardi-mark.svg`, `cardi-icon.svg`,
`cardi-mark-inline.svg`) sit in that same directory, so both paths still resolve. Swap the two
imports and the two identifiers.

## Acceptance Criteria

- **AC1 — Stories 21.1, 21.2, 21.2a and 21.3–21.6 ship in ONE store release on both platforms.**
  None is released alone. The PR (or release notes) lists **the seven** with their merge commits, so
  the gate is auditable. ⚠️ **21.2a was split out of 21.2 on 2026-09-15 and is inside this gate** —
  it declares itself bound by it, and on its migrate branch it edits native watch code
  (`WidgetCardPalette.swift`, `CardVisuals.kt`, `ColorHelpers.swift`) that must ship in the same
  binary as the phone-side change. Without it the release can pair Ink & Beam chrome with
  Google-Blue card accents, with no OTA remedy.
- **AC2 — Verified on real devices before submission**, with screenshots: home-screen icon and
  label; app switcher; launch surface into first screen with **no colour discontinuity**; watch face
  and watch app icon; and the **themed (Material You) icon on Android 13+**. ⚠️ **Record which phone/watch
  mismatches this release ships with, how long each persists, and why. Enumerate them; do not
  total them — every count in this set has gone stale at least once.**
  (a) **Card accents**: if Story 21.2a's AC1 took the _freeze_ branch, the watch palettes
  stay pre-rebrand (they are per-platform — `WidgetCardPalette.swift` and `CardVisuals.kt` hold
  hexes, `ColorHelpers.swift` resolves to SwiftUI system colours) and Epic 23's implementation
  stories are **unscheduled** — 23.2–23.4 are `backlog`, staged Sprint 22+, while `next_sprint`
  (Sprint 21) commits `epics: [22]` only. If it migrated the keys and moved the maps, they are current and this note does not
  apply. **Record whichever branch was taken** rather than asserting one.
  (b) **The favourite star**, unconditionally: 21.2 AC9 makes the phone tile beam-on-ink, while
  Wear keeps `CarbonTheme.kt:19`'s `FavoriteStarTint #F59E0B` and watchOS keeps `.yellow`
  (`CardListView.swift:346-350`) — Story 23.1 writes no Swift or Kotlin, so both stay amber
  through this release.
  (c) **Watch UI chrome stays Carbon, unconditionally — and this release splits the accent between
  the two watches.** 21.3 makes both watchOS `AccentColor.colorset` files beam, while Wear's
  `CarbonTheme.kt:22` `BrandPrimaryDark #4DA3FF` is touched by no story in this sprint (23.1 writes
  no Kotlin; 21.4 touches only `watch-android/.../res/`). The wider Carbon chrome —
  `CarbonSurface #1C1C1F`, white body text — also stays pre-rebrand against the phone's new
  palette, with 23.2 and 23.3 **unscheduled** (`backlog`, Sprint 22+).
  (d) **Type, conditional on 21.6's AC10.** 21.6 moves the phone to Space Grotesk / Inter /
  JetBrains Mono while its AC10 defers both watch apps ("deferral is the expected answer"), so this
  release ships phone-in-brand-type against watch-in-system-type (`.system(...)` on watchOS,
  `MaterialTheme.typography` on Wear), on the same unscheduled horizon as (c). If 21.6 covered the
  watches instead, this entry does not apply — record which.
  Unmarked, any of these reads as a defect in a release whose whole premise is that nothing mismatches.
- **AC3 — The legacy identity is removed**: `assets/app-icons/variants/` (10 files) and the **six**
  genuinely orphaned `app-icon-*.svg` files.
- **AC4 — `test/svg-module-resolution.test.tsx` is repointed to a Cardì SVG**, keeping both the
  aliased and the relative import and all five assertions, and **then**
  `app-icon-variant-aurora.svg` is deleted. The PR states the count: **seven files existed, six
  were orphaned, one was load-bearing** — correcting the epic's "eight".
- ⛔ **AC4b — `expo.version` is bumped, and the release tag is named.** `runtimeVersion.policy` is
  `appVersion` and `version` is still `1.0.0`, so shipping the rebrand at `1.0.0` leaves it sharing
  a runtimeVersion with **every pre-rebrand install**. `expo-updates` is a dependency and
  `eas update --branch` is the documented catalogue-delivery path, so the next OTA after this
  release would land the new tokens and new copy on **old binaries** — producing exactly the
  icon/name/colour mismatch this gate exists to prevent, through the one channel the gate does not
  cover. Nothing else bumps it: Fastlane only ever calls `increment_build_number`, and all 28 tags
  are `v1.0.0-rc.N` while `store-upload.yml` triggers on a bare `vX.Y.Z`. Decide the version and
  the tag here.
- ⛔ **AC4c — The release commit is PINNED, and 22.1 is explicitly in or out.**
  `store-upload.yml` ships whatever is at the tagged commit, and Story 22.1 is sequenced after 21.2
  and 21.6 — so it can merge before this story publishes. A release also carrying a rewritten card
  tile, `TOUCH_TARGET` 44→48 and two scanner fixes is a **different rollback** from the one AC5
  describes. Either cut at the 21.6 merge with 22.1 excluded, or include it and extend AC2 and AC5
  to cover it.
- **AC5 — A rollback position is written down BEFORE submission.** No part of this can be undone by
  an OTA update. State what a rollback actually is (a new build and a new review), how long it takes,
  and what the interim looks like for users who already updated.
- **AC6 — `currentColor` rendering in the in-app mark is confirmed ON A DEVICE.** The jest SVG mock
  means a green suite is no evidence. Story 20.4 verified it against react-native-svg 15.15.3's
  source (a first-class brush, `type: 2`) and explicitly left the device check open. ⚠️ Note 20.4's
  own text carries this gap forward to "story 21.6" — that is a typo; `epics.md` places it here, and
  here is where it is discharged.
- **AC7 — The Wear OS APK ships in the same release cycle**, on its own Play track. The identity
  must not be split across releases even though the artefacts upload separately.
- **AC8 — Every unprovable check is recorded as performed or knowingly accepted.** A table of AC2's
  checks with a yes/no per item — **plus the two deliverables that land out-of-band and that no
  merge can prove**: the Supabase config deploy carrying the renamed email templates and subject
  lines (Story 21.1 AC10 — no workflow deploys Supabase config, and no story owns running it), and
  the store listing title/subtitle/description/keywords (Story 21.5 AC7 — a console task). Without
  both, this "complete" release ships with the old name still in every transactional email and in
  the store listing. "Not performed" is an acceptable answer; a blank is not — that is
  the Epic 10 retro lesson, where a story merged with two validation tables unfilled.

## Tasks / Subtasks

- [x] **Task 1 — Confirm the seven stories are merged (AC1)**, 21.2a included.
- [x] **Task 2 — Repoint the SVG test (AC4).** Two imports, two identifiers.
- [x] **Task 3 — Delete the legacy assets (AC3, AC4).** 10 rasters + 7 SVGs, the last only after
      Task 2 is green.
- [x] **Task 4 — Write the rollback position (AC5).**
- [ ] **Task 5 — Device pass (AC2, AC6).** Both platforms, watch, Android 13+ themed icon,
      `currentColor`.
- [ ] **Task 6 — Fill the validation table (AC8).**
- [ ] **Task 7 — Publish the GitHub Release (AC1, AC7).** Non-prerelease, so `store-upload.yml`
      fires. Do not rely on a tag push.

## Dev Notes

### Guardrails

- **`[skip ci]` is why the release trigger is a published Release, not a tag.** Tagging a
  `mark-story-done` commit and pushing the tag produces no workflow run.
- **Do not delete `assets/images/android-store-banner.svg` or `empty-wallet.svg`.** Both have zero
  code references, but the banner is Story 21.5's source artefact, not legacy.
- **Do not bump `expo.slug`, `ios.bundleIdentifier` or `android.package`** as part of the release.
  Story 21.1 fixed those deliberately; changing them forfeits the listing. ⚠️ **`expo.scheme` is
  NOT in that list any more** — it changes to `cardi` in Story 21.1 (decided 2026-09-14), together
  with its five watch sites. Treat a changed scheme as expected, not as a defect.
- This story adds no user-facing behaviour. Its deliverable is a **release and a record**.

### Testing

`yarn test` after Task 2 (the SVG test must stay green through the repoint, which is the whole point
of doing it before the delete). `yarn icons:check`, `yarn format:check`. Everything else is device
and store work.

### Previous story intelligence

- **Epic 10 retro (DEC-E10-RETRO-001)**: an epic closed with AC17/AC18 on-device validation never
  performed, on a platform with no crash reporting, and the risk was accepted rather than fixed —
  so "0 production incidents" was not evidence. AC8 exists to stop that happening silently again.
- **Sprint 19** shipped two stories whose final ACs were unprovable from the repo (16.35's Play
  two-version-code release, 16.36's cron + four delivery targets). Both were flagged in the sprint
  block rather than discovered at review. This is the same shape, flagged the same way.

### References

- [Source: docs/epics.md#Story 21.7: The Single Rebrand Release]
- [Source: docs/sprint-artifacts/stories/20-4-one-generator-every-icon.md#Known gap] — `currentColor`
- [Source: .github/workflows/store-upload.yml] — why a published Release is the trigger

## Dev Agent Record

### Agent Model Used

claude-opus-5-5 (Claude Code)

### Debug Log References

- **The SVG guard, before and after the repoint (AC4).** A scratch jest config that `require`s the
  real one and puts `'^@/'` back ahead of `'\.svg$'` — the pre-2026-07-28 bug — fails the suite
  **4/5 with `app-icon-variant-aurora.svg` and 4/5 with `cardi-mark.svg`**. The real config passes
  5/5 both times, and again after the delete. No repository file was mutated to prove it.
- **The iOS upload blocker.** `gh api …/actions/workflows/store-upload.yml/runs` → `total_count` 5,
  every run `skipped` (RC events). Nightly run 36544051246 (2026-09-29) logged the latest upload as
  `build: 39` and set `CFBundleVersion` to `40`. From the lookup to "Successfully uploaded package"
  took 8m16s there and 21m21s on rc.22 (run 34240343173), from the log timestamps.
- **Nightly start times.** `gh run list --workflow nightly-builds.yml --event schedule`: 25 scheduled
  runs, 2026-09-05 → 09-29, all created between 06:58 and 08:45 UTC against a `17 2 * * *` cron.
- **fastlane 2.235.0, read from `./bundler`.** `latest_testflight_build_number` →
  `AppStoreBuildNumberAction.get_build_info`, which with no `version:` calls
  `get_build_uploads(…, sort: "-uploadedDate", limit: 1)` — the most recent upload, of any version.
  `FastFile#method_missing` → `runner.trigger_action_by_name`, so a `def` can call an action. Both
  probed on scratch Fastfiles: an action called from a `def` dispatches, and a Symbol argument
  survives a lane-to-lane call.
- **The real iOS lanes, executed with every action stubbed** (a scratch probe first, since committed
  as `TestShipIos`): `upload_release` → lookup `{app_identifier: "com.iferoporefi.myloyaltycards",
api_key: …}`, `build_number: "40"`, then `upload_to_app_store` with its options unchanged and no
  TestFlight upload; `beta` → `upload_to_testflight`; `nightly` with `dry_run` → builds, uploads
  nothing; a mistyped destination raises `Unknown iOS upload destination :appstore.` with **zero**
  steps run.
- `bundle exec ruby fastlane/Fastfile.test.rb` — **31 runs / 98 assertions** green on the bundled
  fastlane 2.235.0 AND on the system gem 2.232.2, with `test_lookup_is_by_upload_date` run (not
  skipped) under both. Before this story: 21 runs / 67 assertions.
- **Twenty-seven mutations of a scratch Fastfile**, each caught (table in the Completion Notes).
  Earlier versions of the tests let nineteen through, found by code review rounds 1, 2, 5, 6, 7 and
  8 mutating copies.
- **Ruby's lexer finds the upload calls, not a regex.** On Ruby 4.0.5, `Ripper.lex` flags
  `upload_to_testflight`, a bare `testflight`, `appstore(…)` and `pilot`, and none of the same words
  in a `desc` string, a quoted match type, a `%i[]` entry, a `:testflight` or `:"testflight"` symbol,
  or a comment. Three control Fastfiles built from those cases keep the suite green.
- **supply 2.235.0** (`supply/lib/supply/client.rb:214-241`, `options.rb:304-308`): on Play's "Please
  set the query parameter changesNotSentForReview to true", `rescue_changes_not_sent_for_review`
  (default `true`) re-commits with `changes_not_sent_for_review: true` and logs nothing.
- **The pin's source.** Local `nightly/ios` = `4de4307` and `nightly/android` = `fb7772c` against
  `f2b7571` on the remote (`git ls-remote`). Both nightly platform jobs check out
  `needs.preflight.outputs.head` (`nightly-builds.yml:236,346`), which
  `scripts/nightly-build-decision.mjs` writes into the job summary as its `head` row.
- **Apple's version train.** The error reads "Invalid Pre-Release Train - The train version '1.1' is
  closed for new build submissions" ([thread 109729](https://developer.apple.com/forums/thread/109729),
  no replies). [Thread 39028](https://developer.apple.com/forums/thread/39028)'s
  replies are from the community, none from Apple, and the ones that name a trigger tie closure to
  release, e.g. "Because version 3.0 is already available for sale …". Apple documents no trigger,
  and nothing here establishes approval as one — which is why the advice is to bump at approval,
  safe either way.
- **Apple's TN2420** ("Version Numbers and Build Numbers", 2017-06-15, archived): on iOS, build
  numbers "must be unique within each release train", and its sample error requires a new build to be
  higher than "the latest build within train version"; on macOS they "must monotonically increase
  even across different versions".
- **Google Play Help.** Managed publishing (9859654): "You can't use it when publishing an app for
  the first time", with a closed-testing release first recommended for a launch. Unpublishing
  (9859350) requires the latest Developer Distribution Agreement to be accepted, no outstanding app
  errors, and managed publishing not to be active.

### Completion Notes List

#### ✅ AC1 — the seven are merged; the release is their union, plus 22.1

| Story                                  | Merge     | PR   | Merged     |
| -------------------------------------- | --------- | ---- | ---------- |
| 21.1 — rename the app to Cardì         | `8e6eb86` | #237 | 2026-09-16 |
| 21.2 — colour tokens to Ink & Beam     | `7a86914` | #236 | 2026-09-16 |
| 21.2a — card accents and colour keys   | `f4782ee` | #240 | 2026-09-17 |
| 21.3 — watchOS app and widget icons    | `0617d8d` | #243 | 2026-09-19 |
| 21.4 — Wear OS launcher icons          | `9d4de21` | #244 | 2026-09-20 |
| 21.5 — store artwork                   | `d406b8b` | #246 | 2026-09-25 |
| 21.6 — brand typefaces                 | `34cdb2f` | #249 | 2026-09-26 |
| 22.1 — design-system components (AC4c) | `0d79b94` | #252 | 2026-09-28 |

⚠️ 21.2's squash title carries no story number (`feat(theme): migrate the colour tokens to Cardì Ink
& Beam (#236)`), so a grep for `Story 21.2` finds only 21.2a. It was found by content.

The release also carries everything else merged since `v1.0.0-rc.22` (`fb7772c`, 2026-09-08) — among
it #219, which first shipped the Cardì mark as every icon, 16.41's watch palette fix (#241), #232 and
#231. Write the release notes from `git log v1.0.0-rc.22..<pin>`, not from this table.

#### ✅ AC3 + AC4 — seven existed, six were orphaned, one was load-bearing

The epic's "eight orphaned `app-icon-*.svg` files" was wrong twice, as the story warned. **Seven**
existed; **six** had no reference outside `docs/`; the seventh, `app-icon-variant-aurora.svg`, was
imported twice by `test/svg-module-resolution.test.tsx`. The order was kept: repoint, prove green,
then delete.

- **Repointed to `cardi-mark.svg`** — the in-app source that `AppLaunchScreen.tsx:53` imports — so
  the guard now pins a file the product renders. `AliasedMark` / `RelativeMark` still describe it,
  so the "two identifiers" needed no rename. Both import styles and all five assertions are kept.
- **Deleted:** all 10 files under `assets/app-icons/variants/` (so `assets/app-icons/` is gone) and
  all seven SVGs. `android-store-banner.svg` and `empty-wallet.svg` stay, per the guardrail.
- **After:** `git grep` finds no reference to a deleted path outside `docs/`. Inside it, the hits are
  this story, its tracker entry and gate note, the live Story 21.7 section of `epics.md` (`:4199`,
  `:4203`), 21.1's story (`:576`), and historical records: 16.17's story and tracker entry, the
  2026-07-28 change proposal, and `epics.md`'s 16.17 section (`:2871`). All are left as written.
  `yarn icons:check`: all 27 brand assets in sync.

#### ⛔ AC4b — the version is NOT bumped: `1.0.0`, tag `v1.0.0` — ifero's decision, 2026-09-29

AC4b asked for a bump because a `1.0.0` release shares its runtimeVersion with every pre-rebrand
install. ifero, 2026-09-29: _"1.0.0 app hasn't been released publicly yet. I don't care"._ The
record agrees that the population is testers only: 21.5 (`:321`) says "THE APP HAS NEVER BEEN
PUBLICLY RELEASED", `docs/index.html:88,98` still say "Coming soon", and `store-upload.yml` has never
run a job.

- **The tag is `v1.0.0`.** It matches `store-upload.yml`'s `v*.*.*` and passes its non-prerelease
  guard; `beta-releases.yml` ignores it, having no `-rc.`.
- **Accepted, knowingly:** an OTA published for runtimeVersion `1.0.0` reaches every `1.0.0` binary,
  including a pre-rebrand TestFlight or internal build that a tester has not updated.
- ⚠️ **Two things change at launch, and both need `expo.version` bumped.** The OTA argument AC4b made
  becomes true for real users. And once `1.0.0` is released, App Store Connect closes its
  train ("The train version … is closed for new build submissions") and refuses every later upload at
  `1.0.0`, the nightly's and any RC's included. The forum explanations tie closure to release; Apple
  documents no trigger, and whether approval alone closes it is not established. So bump the version
  right after approval, before the next nightly — safe either way; `docs/cicd.md` § Release to
  Production, step 7.

#### ✅ AC4c — 22.1 is IN, and the pin is the commit the tested nightly built

- ifero, 2026-09-29: include 22.1. Tagging from `main` stays the practice; no release branch.
- **The pin is the commit the device-tested nightly built**, not `main`'s tip: the `head` row of
  that run's job summary, which both platform jobs check out. The row shows 12 characters; expand
  them with `git rev-parse` after fetching, because `gh release create --target` needs the full SHA.
  The first nightly after this PR merges builds both platforms, because the PR touches `assets/**`
  and `fastlane/**`, which are in both path sets; so one run gives one commit. Publish with
  `--target <that SHA>`; anything merged after it stays out.
- **Never read the pin from a local `nightly/*` tag.** The workflow force-moves them, a plain
  `git fetch --tags` will not update a tag that already exists, and only scheduled runs move them at
  all. In this checkout both local tags were weeks old (`4de4307`, `fb7772c`) while the remote's were
  `f2b7571`; `git ls-remote --tags origin 'nightly/*'` shows the remote's.
- ⛔ **The pin must be at or after this PR's merge.** An earlier commit still carries the old
  `upload_release`, whose iOS upload App Store Connect refuses.
- **Pin: not yet chosen.** The follow-up PR records it, with the run it came from.
- 22.1's surfaces join the device checklist (AC8 row 17, and 17a–17e for the checks its own record
  still owes), and AC5 covers them.

#### ⛔ FOUND AND FIXED — the production iOS upload would have been refused

This is Task 7's prerequisite, fixed here at ifero's direction (2026-09-29, "fix it in this story").

`fastlane ios upload_release` was a **second copy** of `ship_ios!`'s body, and it had drifted on the
one line that mattered: it numbered builds from `ENV['GITHUB_RUN_NUMBER']`, which is
`store-upload.yml`'s own counter — five runs, all RC-skipped — while TestFlight had reached build 40.
App Store Connect refuses an upload whose build number is not higher than the latest in its release
train. Apple's [TN2420](https://developer.apple.com/library/archive/technotes/tn2420/_index.html)
(2017, archived) scopes that rule to one release train, meaning one marketing version, on iOS, and
to the whole app on macOS. Its sample error reads _"must be higher than the build version … of the
latest build within train version"_.
[Forum thread 759988](https://developer.apple.com/forums/thread/759988) is a Mac Catalyst app
hitting the macOS rule. So the old lane fails under the documented iOS rule: it would upload
`1.0.0` build 6 into a train whose latest is 40, and the nightly this story tests on uploads build
41 first.

- `next_ios_build_number(app_identifier:, api_key:)` is one past the latest upload of **any**
  version. It is a plain `def`, so the existing harness can slice and test it.
- `upload_release` is now `ship_ios!(upload: true, destination: :app_store)` — ONE BODY, THREE LANES,
  the shape `ship_android!` already has. The destination is validated before the ~20-minute build.
  `upload_to_app_store`'s options are unchanged, and it still does not submit for review.
- **Tests.** `TestNextIosBuildNumber` pins the lookup. `TestShipIos` RUNS the real `ship_ios!` body
  against recording stubs: the lookup and the number it produces, each destination's upload and its
  options, the dry run and the up-front guard. `TestIosUploadLanesShareOneBody` pins each lane's one
  call, and that nothing else in this Fastfile's iOS platform uploads to App Store Connect. A
  second `platform :ios` opener, a `platform` line the slicer cannot read, a `lane` defined outside
  every platform block, or any `override_lane` fails the suite, and uploads are found by Ruby's own
  lexer, under every action name and alias. Code review found mutations that earlier versions let
  through: four in round 1, three in round 2, one in round 5, two in round 6, four in round 7 and
  five in round 8. This version catches all twenty-seven below.
- ⚠️ **The shared counter has a price, and it is written down where the operator looks.** A release
  that overlaps a nightly or RC run, in either order, numbers its iOS build like that run, and App
  Store Connect refuses the second upload. The window runs from one run's lookup until the other's
  upload is done: 8m16s on the 2026-09-29 nightly, 21m21s on rc.22. Before this story the release
  lane was refused outright; now only an overlapping one is. `ship_ios!`'s comment and
  `docs/cicd.md` § Release to Production say so.
- **`docs/cicd.md`.** § Build number conflict and the lane summary stated the old behaviour; the
  former now also names the overlap race and its remedy. § Release to Production targeted `main`
  rather than the tested commit. It now reads the pin from the run rather than from a local tag,
  rules out an overlap in either order, and bumps `expo.version` once Apple approves. It also has the
  operator CONFIRM in Play Console that both Android tracks are in review: a green lane does not
  prove it, because supply's `rescue_changes_not_sent_for_review` (default `true`) re-commits an edit
  unsent and says nothing (`supply/lib/supply/client.rb:214-241`, fastlane 2.235.0).
- The first CI run of the refactored TestFlight path is the nightly after merge. The App Store path is
  first exercised by the release itself (see AC5).

| Mutation of a scratch Fastfile                                                                       | Caught by                                                                                                                    |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| lookup scoped with `version:`                                                                        | `test_asks_about_every_version_of_the_app`, `test_numbers_the_build_from_the_lookup_before_building_it`                      |
| `+ 1` dropped                                                                                        | `test_numbers_one_past_the_latest_upload`, `test_numbers_the_build_from_the_lookup_before_building_it`                       |
| `upload_release` numbers its own builds again                                                        | `test_each_upload_lane_only_picks_a_destination`                                                                             |
| shared body numbers from `GITHUB_RUN_NUMBER`                                                         | `test_numbers_the_build_from_the_lookup_before_building_it`                                                                  |
| release lane sent to TestFlight                                                                      | `test_each_upload_lane_only_picks_a_destination`                                                                             |
| destination branch swapped                                                                           | `test_the_app_store_destination_uploads_only_to_the_app_store`, `test_the_testflight_destination_uploads_only_to_testflight` |
| destination guard deleted                                                                            | `test_an_unknown_destination_fails_before_anything_runs`                                                                     |
| release lane made `upload: false`                                                                    | `test_each_upload_lane_only_picks_a_destination`                                                                             |
| `skip_metadata` and `skip_screenshots` dropped                                                       | `test_the_app_store_destination_uploads_only_to_the_app_store`                                                               |
| dry run inverted                                                                                     | `test_a_dry_run_builds_and_uploads_nothing`, and both destination tests                                                      |
| lookup given a `nil` API key                                                                         | `test_numbers_the_build_from_the_lookup_before_building_it`                                                                  |
| lookup given the wrong app id                                                                        | `test_numbers_the_build_from_the_lookup_before_building_it`                                                                  |
| a fourth lane that numbers and uploads on its own                                                    | `test_nothing_else_in_the_ios_block_uploads_to_app_store_connect`                                                            |
| a fourth lane that uploads through `deliver`                                                         | `test_nothing_else_in_the_ios_block_uploads_to_app_store_connect`                                                            |
| `upload_release` calls `ship_ios!` twice                                                             | `test_each_upload_lane_only_picks_a_destination`                                                                             |
| a second `platform :ios` block with its own uploading lane                                           | `Fastfile.platform`, which refuses it, so every test errors at load                                                          |
| a lane outside every `platform` block                                                                | `test_nothing_else_in_the_ios_block_uploads_to_app_store_connect`                                                            |
| a second opener spelled `platform(:ios) do`, or with a trailing comment (two variants)               | `Fastfile.platform`, which refuses it, so every test errors at load                                                          |
| a lane outside every block, indented or written `lane(:x) do` (two variants)                         | `test_nothing_else_in_the_ios_block_uploads_to_app_store_connect`                                                            |
| a `platform` line the slicer cannot read: a quoted `:"ios"`, a split-line `platform(` (two variants) | `Fastfile.platform`, which refuses it, so every test errors at load                                                          |
| an `override_lane`, inside the iOS block or at root (two variants)                                   | `test_nothing_else_in_the_ios_block_uploads_to_app_store_connect`                                                            |
| a lane calling a bare `testflight` or `appstore` alias (two variants)                                | `test_nothing_else_in_the_ios_block_uploads_to_app_store_connect`                                                            |

#### ⏳ AC2 — the device pass has NOT run; it runs on the first nightly after merge

ifero's choice, 2026-09-29. Nothing in this PR reaches the app bundle: no code or config referenced
the deleted files, and the rest is a test, the Fastfile's upload lanes and docs. So the nightly build
of the merge carries exactly the app content the release ships. The checklist is AC8's device table,
rows 1–17e, which also collects every device check a gated story handed to this gate. The results
and screenshots land in the follow-up PR that closes this story.

**The phone/watch mismatches this release ships with — enumerated, not totalled:**

- **(a) Card accents — none.** 21.2a took the FREEZE branch (`21-2a:164`), which froze the keys, and
  still moved the values in all three watch resolvers in the same release (`21-2a:365`).
  `ColorHelpers.swift:44-49`, `WidgetCardPalette.swift:22-27` and `CardVisuals.kt:45-50` carry the
  phone's `CARD_COLORS` exactly: `#0C3C84 #E42424 #0C843C #FCCC0C #0C84CC`. The branch this AC
  anticipated is not the one that shipped.
- **(b) Favourite star — mismatched for the whole release.** The phone draws a beam star on an opaque
  ink plate (`Tile.tsx:212`, 22.1's `FavouriteBadge`). Wear keeps `FavoriteStarTint #F59E0B`
  (`CarbonTheme.kt:30`, "KNOWINGLY STALE, owned by Story 23.3"); watchOS keeps `.yellow`
  (`CardListView.swift:382`). Both stay amber until the watch implementation stories ship. 23.1 wrote
  the watch grammar and no Swift or Kotlin; 23.2 and 23.3 are `backlog`; Sprint 21 commits
  `epics: [22]` only. There is no date.
- **(c) Watch accent and chrome — mismatched, and split between the two watches.** watchOS's
  `AccentColor` is beam `#FCCC0C` in both colorsets (21.3). Wear's `primary` is still
  `BrandPrimaryDark #4DA3FF` (`CarbonTheme.kt:35`, owned by 23.3), and its `CarbonSurface #1C1C1F`
  (`:16`) mirrors watchOS's row fill. Both watches keep pre-rebrand chrome against the phone's Ink &
  Beam, on the same undated horizon as (b).
- **(d) Type — mismatched.** 21.6 moved the phone to Space Grotesk, Inter and JetBrains Mono and
  deferred both watches to Epic 23 (`21-6:493-497`). The watches keep system type:
  `shared/theme/typography.ts:18` says "Phone only". Same horizon.

#### ✅ AC5 — the rollback position, written before submission

**What a rollback is for a first launch.** No earlier public version exists on either store, so
there is nothing to roll back _to_. OTA is not a path either. Native assets cannot change without a
binary (`runtimeVersion.policy: appVersion`), and OTA delivery to these fastlane-built binaries has
never been exercised: there is no `eas.json`, no workflow runs `eas update`, and
`docs/catalogue-ota-updates.md` still lists `eas update:configure` as a prerequisite. So a rollback
is two moves:

1. **Stop new installs.** In App Store Connect, Pricing and Availability → _Remove App From Sale_:
   the app leaves every region within 24 hours, and existing users keep it and can redownload it.
   In Play Console, Test and release → Setup → Advanced settings →
   App availability → _Unpublish_: new users cannot find it, and existing users keep it and still
   receive updates. Play allows it only with the latest Developer Distribution Agreement accepted, no
   outstanding app errors (such as an unfinished content-rating questionnaire), and managed
   publishing off, so turn managed publishing off first if it was on.
2. **Fix forward.** A new build and a new review, released as a new version: `expo.version` `1.0.1`
   and Release `v1.0.1`. A released App Store version takes no further builds, and the `v1.0.0` tag
   is spent. **22.1 (#252) is inside the pin** — the tile rewrite, 44 → 48 touch targets, the new
   sheets and buttons, and two scanner fixes — so a fault there is handled the same way: fixed or
   reverted on `main`, and shipped as `1.0.1`. There is no earlier public build to fall back to.

**How long it takes.** The pipeline is about 45 minutes: the same lanes ran 43m30s for
`v1.0.0-rc.22`. Review comes on top. Apple: _"On average, 90% of submissions are reviewed in less
than 24 hours"_, and an expedited review can be requested for a critical bug. Google: for some
accounts, _"review times of up to seven days or longer in exceptional cases"_. Plan on a week for
Android.

**The interim for users who already installed.** They keep the launch build, working as shipped,
until the fix is approved. Removing the app from sale or unpublishing it does not touch them. They
receive the fix as an ordinary update.

**The gates that exist before anything is live** — use them, and a rollback should rarely be needed:

- **iOS: nothing is submitted automatically.** `upload_release` uploads the binary and prepares the
  version (`submit_for_review` defaults to false); a person submits it in App Store Connect. Choose
  _Manually release this version_ there, so the release can be timed with Android.
- **Android: for this launch, approval may well be the release.** The lane uploads
  `release_status: "completed"` to `production` and `wear:production` with no `rollout`, so without
  managed publishing an approved release goes live at 100%. Google does not offer managed publishing
  for an app's first publication (_"You can't use it when publishing an app for the first time"_,
  Play Console Help 9859654) and recommends a closed-testing release first. The RC lane uploads to
  `alpha`, Play's closed-testing track, as drafts a person promotes, so whether Publishing overview
  offers the toggle depends on console state no file records. Check it, turn it on if it is there,
  and otherwise accept that approval is the release (AC8 row 24). Then confirm in Play Console that
  both tracks really went to review: a green lane does not prove it (runbook step 6).
- **Publish only once that day's scheduled nightly has finished, with no RC or nightly run of any
  trigger in progress, and start none until the release's iOS upload is done.** Check Actions, not the
  clock: the cron says 02:17 UTC, but 25 scheduled nightlies from 2026-09-05 to 09-29 started between
  06:58 and 08:45 UTC, and a release takes about 45 minutes. A release that overlaps any of them, in
  either order, numbers its iOS build like that run, and App Store Connect refuses the second upload
  (`docs/cicd.md` § Release to Production, step 2).
- **If one store job fails, the other may already have uploaded.** That is a split in timing, not in
  identity: both binaries carry all seven stories. Re-run `store-upload.yml` by `workflow_dispatch`
  with the tag.
- **The shipped binaries are rebuilt from the pin, not the ones tested.** Build number and
  versionCode differ, and the runner's `latest-stable` Xcode may too. Accepted; publish promptly
  after the device pass.

#### ✅ AC6 — moot as written: nothing that ships uses `currentColor`

20.4's gap was a `currentColor` asset, `cardi-mark-adaptive.svg` (`20-4:31`). It was deleted before
#219 merged. `scripts/build-brand-icons.mjs:637` records the replacement: _"This replaced a
`currentColor` variant whose stem followed the theme."_ Every SVG under `assets/images/` has zero
`currentColor`; `cardi-mark.svg` and `cardi-mark-inline.svg` fill only `#FFFFFF` and `#FCCC0C`.
What still needs eyes is ordinary rendering of a fixed-colour mark. That is AC8 row 13: `BrandedIcon`
on Welcome, and `AppIconHeader` on Sign In, Create Account, New Password and Verify Email, but not
Forgot Password (`showAppIcon={false}`).

#### ✅ AC7 — the Wear app cannot ship in a different release cycle

`store-upload.yml`'s `upload-android-release` runs `fastlane android upload_release`, which is
`ship_android!(track: "production", release_status: "completed")`. That builds the phone AAB and the
Wear AAB before uploading either, then uploads phone → `production` and Wear → `wear:production` in
the same job. `wear:production` exists on this listing, per the live track inventory
`ensure_wear_track_exists!` checks against. The one residual failure — the Wear upload failing after
the phone's — is logged by the lane and fixed by a re-run. The release run's log is the evidence, and
it lands with the follow-up PR.

#### ⏳ AC8 — the validation table: every row's state today, 2026-09-29

It closes when the follow-up PR replaces each "not yet performed" with a result — or with a knowing
"not performed". Two tables, because the rows have different deadlines.

**Device checks — every row: ifero, on the first nightly after merge.** Where the Source column names
another story, that story handed the check on and never ran it.

| #   | Check                                                                                                           | Source                 | Where                 | State             |
| --- | --------------------------------------------------------------------------------------------------------------- | ---------------------- | --------------------- | ----------------- |
| 1   | Home-screen icon and the label "Cardì", and the name in system Settings                                         | AC2; 21.1 AC3          | iPhone                | not yet performed |
| 2   | Home-screen icon and the label "Cardì", and the name in system Settings                                         | AC2; 21.1 AC3          | Android phone         | not yet performed |
| 3   | App switcher                                                                                                    | AC2; 21.1 AC3          | iPhone                | not yet performed |
| 4   | App switcher                                                                                                    | AC2; 21.1 AC3          | Android phone         | not yet performed |
| 5   | Launch into the first screen with no colour discontinuity, light and dark                                       | AC2                    | iPhone                | not yet performed |
| 6   | Launch into the first screen with no colour discontinuity, light and dark                                       | AC2                    | Android phone         | not yet performed |
| 7   | Themed (Material You) icon, Android 13+                                                                         | AC2                    | Android phone         | not yet performed |
| 8   | Watch app icon, watch-face complication, and both display names                                                 | AC2; 21.1 AC9          | Apple Watch           | not yet performed |
| 9   | Launcher icon and label                                                                                         | AC2; 21.1 AC9          | Wear OS watch         | not yet performed |
| 10  | A complication tap opens the app over the `cardi` scheme — it fails silently                                    | 21.1 AC11              | Apple Watch           | not yet performed |
| 11  | The camera and photo permission prompts read "Cardì"                                                            | 21.1 AC7               | iPhone                | not yet performed |
| 12  | The launcher label at the narrowest density, and its accent in a non-Latin locale                               | 21.1 AC8               | Android phone         | not yet performed |
| 13  | The in-app mark in fixed colours: Welcome, Sign In                                                              | AC6                    | both phones           | not yet performed |
| 14  | Ink & Beam in both schemes, including onboarding, auth, add-card and scanner, sync status                       | 21.2                   | both phones           | not yet performed |
| 15  | A custom card in each of the five accents, both schemes, and a favourited yellow card on the card-detail header | 21.2a AC9              | both phones           | not yet performed |
| 16  | Space Grotesk, Inter and JetBrains Mono render, with no fallback face                                           | 21.6                   | Android phone         | not yet performed |
| 17  | 22.1: card grid and favourite badge, card form, sheets, buttons, scanner                                        | AC4c                   | both phones           | not yet performed |
| 17a | A real image-scan failure: the banner clears the action stack                                                   | 22.1 (#251; 16-30 AC5) | a real device         | not yet performed |
| 17b | EAN-13 and QR framing, and time-to-first-scan, in the reshaped viewfinder                                       | 22.1 (#251; 16-31 AC6) | a real device, camera | not yet performed |
| 17c | The sign-out and delete-account sheets, in a signed-in session                                                  | 22.1 (#251; 16-32 AC6) | both phones           | not yet performed |
| 17d | The Settings rows at 48dp, and the sheets' slide-out                                                            | 22.1 (#251; 16-33 AC6) | Android phone         | not yet performed |
| 17e | The multi-code picker's slide-out, after a multi-code image scan                                                | 22.1 (#251)            | both phones           | not yet performed |

- **Rows 17a–17e** are 22.1's own "Device checks still owed" (issue #251,
  `22-1-design-system-components.md:525-530`): each needed a camera, a signed-in session or an
  Android device that its development machine did not have.
- **Rows 1–4 and 8–12** are 21.1's Task 9, still open (`21-1:246`). Its record says "Not done, and
  **not** to be recorded as passing" (`21-1:385`).
- **Row 14:** 21.2 never ran Android, and never opened onboarding, authentication, the add-card and
  scanner flow, or the sync and status surfaces (`21-2:618-626`).
- **Row 15:** the beam-star-on-beam collision is resolved in code, and 21.2a calls that "a code
  proof, not a substitute for looking at it" (`21-2a:397-403`).
- **Row 16:** 21.6 verified the generated Android project, not a device: "a device pass belongs to
  Story 21.7's release gate" (`21-6:593-595`).

**Before publishing — every row: ifero, before the GitHub Release is published.**

| #   | Item                                                                                                                                                                          | Source               | State                        |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ---------------------------- |
| 18  | Supabase config deploy: the renamed email templates and subjects                                                                                                              | 21.1 AC10            | not yet performed; no record |
| 19  | Store listing title, subtitle, description and keywords, and the four Play artwork files                                                                                      | 21.5 AC7             | not yet performed; no record |
| 20  | Wear OS store screenshots, which are debug-build placeholders today                                                                                                           | 21.5 AC5             | not done                     |
| 21  | The privacy policy (in-app and `docs/privacy-policy.html`) and `docs/index.html` claim no analytics while Sentry ships; the App Privacy and Data safety forms must declare it | 21.5 QA              | not yet corrected            |
| 22  | The azure accent fails AA on the card-detail header: accept it, darken it, or enlarge that text                                                                               | design system § OPEN | open; no decision recorded   |
| 23  | Play production access for a personal account created after 2023-11-13                                                                                                        | Play policy          | unknown; to confirm          |
| 24  | Android launch control: check Publishing overview for managed publishing, or accept that approval is the release                                                              | Play Help 9859654    | unknown; check the console   |

- **Row 18:** the renamed subjects (`supabase/config.toml:231`, `:243`) and templates reach users only
  when the hosted project is updated from its dashboard — the same manual step the file marks
  _"RELEASE STEP (human, prod dashboard)"_ for the recovery template (`:237`). No workflow deploys
  Supabase config.
- **Row 19:** the copy is in PR #246's body. The artwork is `assets/store/`'s four generated files,
  which its README says are "uploaded to **Play Console by hand**" (`assets/store/README.md:3`); the
  Fastfile skips every image upload.
- **Row 20:** 21.5's tracker entry says AC5 "IS NOT DONE and must not be counted as done". Capturing
  now would bake Wear's stale palette — (b) and (c) above — into the listing, and 23.3 owns that
  palette.
- **Row 21:** `assets/legal/privacy-policy.ts:52-55` and the public `docs/privacy-policy.html:111`
  both say "We do not collect … Analytics or tracking data" while Sentry ships. They are two files
  with nothing keeping them in sync, and the tracker records all four surfaces as "ifero's call".
  `docs/index.html:224` adds "No tracking, no analytics." No record shows the App Privacy
  questionnaire or the Data safety form being filled, and Play requires the Data safety form for
  apps on closed-testing tracks too ("including apps on closed, open, or production testing
  tracks", Play Console Help 10787469), which the RC lane uses. So check both consoles: declare
  Sentry's crash data when filling them, or correct them if already filed.
- **Row 22 has a deadline as well as an owner.** `#0C84CC` is also the default accent, and no
  foreground clears AA on it: white 4.05:1, ink 4.34:1. `cardi-design-system.md:264-311` says it
  "owes an answer before the rebrand release ships", and its pinning test passes by design. Of its
  three options, darkening to `#0B7CC0` and large header text are code changes that ship only if they
  merge BEFORE the nightly that becomes the pin. So decide before the device pass. Accepting the
  exception needs no code.
- **Row 23 is new, and may be the longest pole.** For personal developer accounts created after
  2023-11-13, Production stays disabled until 12 testers have been opted in to a closed test for 14
  days, followed by a review Google says "usually takes seven days or less"
  ([Play Console Help 14151465](https://support.google.com/googleplay/android-developer/answer/14151465)).
  The page scopes the rule to personal accounts created after that date.
- **Row 24:** see AC5's Android gate. If the toggle is absent, Google's own route to it is a
  published closed-testing release first — the closed test row 23 may require anyway. Without it,
  approval is the release, at 100%.

#### ⚠️ The story's own text has gone stale

These are recorded here rather than fixed in the ACs, because dev-story may not edit them.

1. **AC2(a)** assumes FREEZE means the watch palettes stay pre-rebrand. 21.2a froze the keys and moved
   the values.
2. **AC6** asks for a `currentColor` device check. No shipped asset uses `currentColor`.
3. **AC2(b)/(c)** cite `CarbonTheme.kt:19`/`:22` and `CardListView.swift:346-350`. They are now
   `:30`/`:35` and `:379-383`.
4. **AC4b** says "all 28 tags are `v1.0.0-rc.N`". 22 are; 3 are `v0.1.0-rc.N`; 3 are not versions
   (`backup/pre-rebase-5-7`, `nightly/android`, `nightly/ios`). The conclusion stands: no bare
   `vX.Y.Z` tag exists.
5. **Story context and AC7** call the Wear artifact an APK. It has been an AAB since `d83586b`.
6. **The opening blockquote** cites `app.json:85-87` for `runtimeVersion.policy`. It is at
   `app.json:128-130` now.

The tracker's gate note carried item 2 as well, and is corrected in this PR.

#### Found, not fixed

These are out of this story's mechanism, and are filed as one follow-up issue,
[#253](https://github.com/ifero/myLoyaltyCards/issues/253).

- `docs/epics.md:3821` still says the in-app mark's stem is `currentColor`, and the Story 21.7 section
  (`:4226-4229`) still asks for its device check.
- `store-upload.yml` rebuilds instead of promoting the tested build, on both platforms, so the binary
  a person verified is never the binary that ships.
- Play production releases go out at 100%: `release_status: "completed"` and no `rollout`. There is
  no staged rollout for the launch or for any later update.
- The App Store half of `store-upload.yml` cannot be dry-run: its first exercise is a real release.
  `upload_to_app_store` offers `verify_only`.
- `docs/epics.md:4208-4215`, the Story 21.7 section, still requires `expo.version` to be bumped. ifero
  overruled that on 2026-09-29.
- `docs/style.css:3,14,41` still carry `#1a73e8` / `#16a34a`, so the public site keeps the pre-rebrand
  palette through the release. 21.5's tracker entry records that no story owns it.

### File List

- `assets/app-icons/variants/aurora/expo/adaptive-icon-1024.png` — deleted
- `assets/app-icons/variants/aurora/expo/favicon-48.png` — deleted
- `assets/app-icons/variants/aurora/expo/icon-1024.png` — deleted
- `assets/app-icons/variants/aurora/transparent/icon-foreground-1024.png` — deleted
- `assets/app-icons/variants/forest/expo/adaptive-icon-1024.png` — deleted
- `assets/app-icons/variants/forest/expo/favicon-48.png` — deleted
- `assets/app-icons/variants/forest/expo/icon-1024.png` — deleted
- `assets/app-icons/variants/sunset/expo/adaptive-icon-1024.png` — deleted
- `assets/app-icons/variants/sunset/expo/favicon-48.png` — deleted
- `assets/app-icons/variants/sunset/expo/icon-1024.png` — deleted
- `assets/images/app-icon-foreground.svg` — deleted
- `assets/images/app-icon-master.svg` — deleted
- `assets/images/app-icon-variant-aurora-ios-opaque.svg` — deleted
- `assets/images/app-icon-variant-aurora-transparent.svg` — deleted
- `assets/images/app-icon-variant-aurora.svg` — deleted
- `assets/images/app-icon-variant-forest.svg` — deleted
- `assets/images/app-icon-variant-sunset.svg` — deleted
- `test/svg-module-resolution.test.tsx` — modified
- `fastlane/Fastfile` — modified
- `fastlane/Fastfile.test.rb` — modified
- `docs/cicd.md` — modified
- `docs/sprint-artifacts/sprint-status.yaml` — modified
- `docs/sprint-artifacts/stories/21-7-single-rebrand-release.md` — modified

### Change Log

| Date       | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-09-29 | Picked up. Confirmed the seven merged (Task 1). ifero decided: the version stays `1.0.0`, tag `v1.0.0` (AC4b); 22.1 is in (AC4c); the device pass runs on the first nightly after merge; the story stays in-progress.                                                                                                                                                                                                                                                                                                                                  |
| 2026-09-29 | Repointed the SVG guard to `cardi-mark.svg`, proved it still fails 4/5 on the mapper regression, then deleted the 17 legacy files — seven SVGs existed, six orphaned, one load-bearing (AC3, AC4).                                                                                                                                                                                                                                                                                                                                                     |
| 2026-09-29 | Found and fixed the production iOS upload's build number: one `ship_ios!` body for all three lanes, `next_ios_build_number`, and fastlane tests, each proven by a mutation; corrected `docs/cicd.md`.                                                                                                                                                                                                                                                                                                                                                  |
| 2026-09-29 | Wrote the rollback position (AC5), the mismatch enumeration (AC2), AC6's moot finding, AC7's mechanism and the AC8 table with every row's current state.                                                                                                                                                                                                                                                                                                                                                                                               |
| 2026-09-29 | Code review round 1, ten findings, all fixed. AC8 now collects every device check a gated story handed on (21.1, 21.2, 21.2a, 21.6) and the before-publishing items: the open azure AA decision, the privacy copy and forms, the Wear screenshots. `TestShipIos` runs the real `ship_ios!` body, and four mutations that survived round 0 are now caught. The overlap hazard is documented where the operator looks. `docs/cicd.md`'s runbook pins the release to the tested commit. One import-order lint warning was fixed, and AC5 now covers 22.1. |
| 2026-09-29 | Code review round 2, seven findings, all fixed. The pin is now read from the tested run, not from a local tag, which had gone stale; it must be at or after this PR's merge. The runbook no longer claims a `completed` Android upload always reaches review: supply can commit it unsent, so the operator confirms. It rules out an overlap in either order and bumps the version once Apple closes the `1.0.0` train. Three more mutation survivors are killed, and the record's counts and stale-text list are corrected.                           |
| 2026-09-29 | Code review round 3, nine findings, all in the docs and the record, all fixed. The pin is expanded to the full SHA `--target` needs. The overlap guard covers every trigger and the whole release. 22.1's own owed device checks (#251) and the Play artwork upload join AC8. The collision window runs to upload completion. The train-closing claim is softened to what its sources support. The Supabase marker citation is corrected, the stale-baseline recipe forces the tag fetch, and the gate note records the deletion.                      |
| 2026-09-29 | Code review round 4, five findings, none in code or tests, all fixed. The cross-version citation (thread 759988) turned out to be a macOS case, so the evidence is restated for iOS, and the design is unchanged. The train-closing claim now says only what its sources support. The runbook sets managed publishing and manual release before the publish. 21.1's app-switcher provenance and the public privacy page are added, and a comment is rewrapped.                                                                                         |
| 2026-09-29 | Code review round 5, five findings, all fixed. Apple does document the build-number scope (TN2420: one release train on iOS, the whole app on macOS), so the rationale now cites it. Managed publishing is unavailable for a first publication, so AC5 and the runbook check for it rather than promise it (new row 24), and Unpublish's prerequisites are stated. A duplicated lane call no longer passes, which makes fifteen mutations caught. The train-closing claim is hedged everywhere.                                                        |
| 2026-09-29 | Code review round 6, two low findings, both fixed. The device checklist range now includes 17a–17e. The "nothing else uploads" scan reached only the first `platform :ios` block, so `Fastfile.platform` now refuses a second block and the scan refuses a lane outside every block; seventeen mutations are caught.                                                                                                                                                                                                                                   |
| 2026-09-29 | Code review round 7, two low findings and a nit, all fixed. Both guards matched one spelling only, so they now match every `platform` opener and `lane` definition fastlane accepts (overstated: round 8 found three spellings still uncovered); four more variants are caught, twenty-one in all. The unevidenced "plus the minutes to list an upload" tail is dropped. The Fastfile no longer says nothing but `ship_ios!` numbers a build, since `adhoc` does.                                                                                      |
| 2026-09-29 | Code review round 8, one low finding and a nit, both fixed by making the guards fail closed rather than by narrowing them. A `platform` line the slicer cannot read now fails the suite, `override_lane` is refused anywhere, and uploads are found by Ruby's lexer, so the `testflight` and `appstore` aliases count while a symbol or string that spells one does not. Twenty-seven mutations are caught, with three controls green.                                                                                                                 |
| 2026-09-29 | Code review round 9, two nits, both fixed. The `ship_ios!` header now says the lanes pass two values, the destination and, for `nightly`, whether to upload. AC8 row 21 now separates the surfaces that claim no analytics (both policies and `docs/index.html`) from the store forms, which must declare Sentry; round 10 removed an unverified claim that they were unfiled.                                                                                                                                                                         |
| 2026-09-29 | Code review round 10, one nit, fixed. Row 21 no longer asserts that the store forms are unfiled. No record shows either form filled, and Play requires the Data safety form on closed-testing tracks, which the RC lane uses. So the row now says to check both consoles and declare Sentry, or correct an existing filing.                                                                                                                                                                                                                            |
| 2026-09-29 | Code review round 11 approved with zero findings. ifero then directed the PR, so the QA review loop was not run. The follow-ups are filed as #253.                                                                                                                                                                                                                                                                                                                                                                                                     |
| 2026-09-30 | Closed as done by ifero's decision on 2026-09-30, so that Sprint 20 can close. AC8's rows keep the state they had on 2026-09-29, all "not yet performed"; this change records no result for any device or store check, and they are still owed on the first nightly.                                                                                                                                                                                                                                                                                   |
