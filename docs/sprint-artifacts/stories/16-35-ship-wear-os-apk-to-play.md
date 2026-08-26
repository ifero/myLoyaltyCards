---
baseline_commit: 652f3c61442ab02841180e7bc837556721576165
---

# Story 16.35: Ship the Wear OS APK to Play — the watch app has never been delivered to any track

Status: review

Epic: 16 — Platform & Tech Debt

> **✅ ROOT CAUSE ESTABLISHED — this is not a regression, and there is nothing to bisect.** The Wear
> OS app has **no release or upload path at all**, and never has. `beta-releases.yml` contains exactly
> two jobs (`ios-testflight-beta`, `android-beta`); neither mentions `watch-android`. The Wear
> project's only pipeline, `wear-os-build.yml`, runs `./gradlew testDebugUnitTest assembleDebug` —
> **debug, unsigned, never uploaded** — and is path-filtered to `watch-android/**`, so it does not
> even run on an RC tag. Epic 10 closed on 2026-08-20 with six stories done and the release path
> parked in a README paragraph: `watch-android/README.md` § Signing, Play and Asset Links says, in
> its own words, **"Documented here, not configured here."** A documented gap and an undocumented gap
> ship identically — nothing.
>
> **The proof is a grep, not an inference.** `WEAR_VERSION_CODE` — the environment variable
> `watch-android/app/build.gradle.kts` reads to compute the Wear `versionCode` — appears in exactly
> **two** places in this repository: that build file, and the README table describing it. **No
> workflow sets it.** There is no CI wiring for a release to have broken.
>
> **⚠️ THE NAIVE FIX UN-DELIVERS THE PHONE. Read AC3 before writing any YAML.** The Wear APK shares
> `applicationId` with the phone app, so Play does not see two apps — it sees **one app whose track
> release must list both version codes**. A second, independent `upload_to_play_store` call creates a
> **new release on the same track**, and the phone's version code silently drops out of it. Adding a
> parallel `wear-beta` job would therefore trade a missing watch app for a missing phone app, and the
> Play Console would look correct in both cases. This is the Story 16.7 failure class — a
> plausible-looking result that is wrong.
>
> **⚠️ AND fastlane cannot carry both artifacts in one call.** `supply` accepts an APK **or** an AAB,
> not both (`skip_upload_apk` / `skip_upload_aab` exist precisely to disambiguate), and multiple AABs
> are not supported. The phone ships an AAB; the Wear app ships an APK. They are structurally unable
> to travel in a single `upload_to_play_store` invocation. The mechanism that does work is
> `version_codes_to_retain` — see AC3.
>
> **The scope decisions below are binding, not questions.** ifero chose the wider read on both forks
> (party mode, 2026-08-26): fix **beta and production**, and **verify the signing certificate**.
> Do not re-open either.

## Story

As an internal tester who installed the newest RC on my phone,
I want the Wear OS companion app to arrive on my watch with it,
so that the watch app Epic 10 built is actually testable — and so that a released phone build can
never again ship without the watch half nobody notices is missing.

## Context

### The report

ifero released the newest app version to internal testers (2026-08-26) and reported that **the Wear
OS app was not delivered**. Investigation found no defect in the Wear OS app itself: it compiles, its
unit tests pass in CI, and its Play-facing manifest declarations are correct. What is missing is
every step between "it compiles" and "a tester's watch has it".

### What actually exists today

| Concern                      | Status                                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------------------------ |
| Wear app compiles in CI      | ✅ `wear-os-build.yml` → `testDebugUnitTest assembleDebug`                                             |
| Wear **release** build in CI | ❌ never built — `assembleRelease` runs nowhere, so R8/ProGuard is never exercised                     |
| Wear APK signed              | ❌ no `signingConfig` in the `release` block; `assembleRelease` produces an **unsigned** APK by design |
| `WEAR_VERSION_CODE` set      | ❌ set by no workflow; referenced only in `build.gradle.kts` and the README                            |
| Wear APK uploaded to Play    | ❌ no lane, no job, no `upload_to_play_store` call anywhere touches `watch-android`                    |
| Phone AAB uploaded to Play   | ✅ `fastlane android beta` → alpha track (draft); `fastlane android upload_release` → production       |

### Why the green checkmark was misleading

`wear-os-build.yml` is path-filtered to `watch-android/**` and `push: branches: [main]`. An RC tag
touches neither, so the Wear job **does not run on a release at all**. Every RC therefore showed a
clean board while shipping nothing from `watch-android/`. The job proves compilation and _implies_
delivery, and that gap is the whole defect.

### The three platform constraints this story must not break

From `watch-android/README.md` § The three non-negotiable platform constraints:

1. **`applicationId` identical to the phone app** — `com.iferoporefi.myloyaltycards`, no suffix.
   Already correct in `watch-android/app/build.gradle.kts`; this story must not change it.
2. **Same signing key as the phone app.** The Wearable Data Layer will not connect two APKs signed
   with different keys, and Play rejects the association. **This failure is silent** — no crash, no
   log, and Sentry has effectively no Android coverage (~10 events / 90 days, ~100 % iOS), so nothing
   would surface it. AC5 exists because of this.
3. **A Digital Asset Links entry** carrying the applicationId + signing-cert SHA-256. This is a Play
   Console / hosted-file task owned by @ifero and is **out of scope** here — but AC5's certificate
   fingerprint is the value that task needs, so this story must print it.

### versionCode bands, and the collision this story would otherwise introduce

Play allocates `versionCode` **per applicationId**, so the phone and the watch share one counter
space. The existing bands (`watch-android/README.md` § versionCode bands):

| Band        | Consumer          | Set by                                                  |
| ----------- | ----------------- | ------------------------------------------------------- |
| `0`         | phone, alpha/beta | `beta-releases.yml` — bare `GITHUB_RUN_NUMBER`          |
| `1_000_000` | phone, production | `store-upload.yml` — `$((GITHUB_RUN_NUMBER + 1000000))` |
| `2_000_000` | Wear OS APK       | `watch-android/app/build.gradle.kts`                    |

`GITHUB_RUN_NUMBER` is **per workflow file**. `beta-releases.yml` run 40 and `store-upload.yml` run 40
are unrelated releases. Wiring both pipelines to `WEAR_VERSION_CODE=$GITHUB_RUN_NUMBER` would make
both compute `2000040` — the exact two-counters-one-band collision Story 16.7 exists to document.
A **fourth band** is therefore required. The phone's precedent — offset _declared_ in `app.config.ts`,
_applied_ as `$((GITHUB_RUN_NUMBER + 1000000))` in `store-upload.yml`, held together by a "must stay in
sync" comment — was considered and rejected: it is a workaround for `app.config.ts` running at prebuild
with a single env var, and Gradle has no such constraint. See AC4.

## Acceptance Criteria

- **AC1 — the RC pipeline builds and uploads the Wear OS release APK.** `beta-releases.yml`'s
  `android-beta` job produces a signed `watch-android` release APK and uploads it to the Play **alpha**
  track alongside the phone AAB. `WEAR_VERSION_CODE` is set from `GITHUB_RUN_NUMBER`.

- **AC2 — the production pipeline does the same.** `store-upload.yml`'s `upload-android-release` job
  does the equivalent against the **production** track. Shipping AC1 alone would create a new trap:
  a production release that silently drops the watch app testers already have — a downgrade with no
  crash and no telemetry.

- **AC3 — one Play release carries both version codes, and the ordering is enforced.** The phone AAB
  is uploaded **first**; the Wear APK is uploaded **second, in the same job**, with
  `skip_upload_aab: true` and `version_codes_to_retain` carrying the phone's `versionCode`, so the
  resulting track release lists **both** codes. It must **not** be a parallel job — two jobs race the
  same Play track edit and one silently loses. Both calls use the same `release_status` so the end
  state is a single coherent release. The reason for each of these three constraints is written into
  the Fastfile, not left to review memory.

- **AC4 — a fourth versionCode band, with no possible collision.** Wear alpha/beta stays at
  `2_000_000 + GITHUB_RUN_NUMBER`; Wear production becomes `3_000_000 + GITHUB_RUN_NUMBER`. The
  `1_000_000` offset is a named constant in `watch-android/app/build.gradle.kts` and is **applied
  there**, selected by `WEAR_RELEASE_TRACK` — which the Fastfile sets from the upload track, so the
  band cannot disagree with the destination. (The draft proposed YAML arithmetic mirroring the phone;
  that was reversed during implementation — see the Dev Agent Record for why the phone's shape is a
  constraint of `app.config.ts`, not a pattern worth copying.) The existing positive-integer validation
  and the `2_100_000_000` ceiling check must still apply to the larger value — verified, not assumed.
  The README band table gains the fourth row.

- **AC5 — the Wear APK's signing certificate is verified against the phone's before upload.** The
  build injects the phone's keystore via the `android.injected.signing.*` properties the phone lane
  already uses, then asserts with `apksigner verify --print-certs` that the Wear APK's certificate
  SHA-256 **equals** the phone AAB's. A mismatch **fails the job** before any upload. The fingerprint
  is echoed to the job log, because it is also the value the Digital Asset Links entry needs.
  Rationale: an unsigned APK fails loudly at Play, but a **wrong-key** APK uploads cleanly and breaks
  the Data Layer silently.

- **AC6 — a missing Wear artifact fails the release; it never degrades to a phone-only upload.** If
  `assembleRelease` produces no APK, or the expected path does not exist, the job fails with a named
  error rather than proceeding. Same stance as `android-release.yml`'s `if-no-files-found: error`.

- **AC7 — the Wear release variant is built in CI on every PR that touches it.** `wear-os-build.yml`
  gains `assembleRelease` (unsigned is fine there). Today R8 full mode runs against the Wear app
  **only in a release build that has never happened**, and `watch-android/app/proguard-rules.pro` says
  so in its own header: _"CI only builds the debug variant … so nothing would catch R8 mis-optimising
  the barcode path in the release APK — the only build users receive."_ The moment AC1 lands, that
  untested variant becomes the one users get.

- **AC8 — the documentation stops lying.** `watch-android/README.md` § Signing, Play and Asset Links
  no longer says "Documented here, not configured here" — it describes the real wiring, the band
  table gains its fourth row, and the § CI section's "❌ no release build" bullet is corrected.
  `docs/cicd.md` gains the Wear OS artifact in its pipeline description and its post-release
  verification checklist.

- **AC9 — verified on a real release, and the evidence recorded.** Because no local run can exercise
  the Play Console, the story is not done until an RC has been cut and the alpha track release is
  confirmed to list **two** version codes (phone `N`, Wear `2000000 + N`), and the watch app is
  confirmed to install on a paired Wear OS device. Record the release, both version codes and the
  certificate fingerprint in the Dev Agent Record.

## Out of scope — flagged, not fixed

- **Digital Asset Links publication** (constraint #3). It is a Play Console + hosted-file task owned
  by @ifero. AC5 produces the fingerprint it needs; publishing it is not code.
- **Play Console store-listing assets for the Wear OS form factor** (screenshots, description). Play
  requires these before a Wear release can be _promoted_; they are console data, not repository
  content.
- **Publishing the draft.** `fastlane android beta` uploads with `release_status: "draft"` and this
  story keeps that behaviour — promoting a draft to the internal/alpha testers stays a deliberate
  human action.
- **Lint in the Wear CI job** (`./gradlew lintDebug`), still a known gap in the README. AC7 adds the
  release _build_, not lint.
- **The monochrome launcher icon** and the hand-copied launcher artwork, both already recorded under
  the README's Known gaps.
- **Any change to the Wear app's behaviour, UI or dependencies.** This story is delivery only. If a
  release-variant R8 problem surfaces from AC7, file it separately rather than widening this one.

## Notes

**Why this is Epic 16 and not Epic 10.** Epic 10 is closed and retrospected (2026-08-20). This is a
platform/delivery defect found in shipped-but-undelivered software, which is Epic 16's remit, and it
is the same family as Story 16.7 (Android beta upload versionCode) — same shared counter space, same
class of silent-but-plausible failure.

**Toolchain cost, accepted deliberately.** AC3's same-job requirement merges two toolchains into one
job: the phone half needs Node + `expo prebuild`; the Wear half needs JDK 17 and Android SDK
platform 36. That is slower than two parallel jobs and it is the price of not racing a Play track
edit. Do not "optimise" it back into parallel jobs — the reason is written into the Fastfile per AC3.

**The one thing that cannot be proven from this repository.** Whether `version_codes_to_retain`
composes cleanly with an existing **draft** release on the same track is a Play Console behaviour, not
a fastlane one, and no local run can settle it. AC9 is the gate. If it does not behave, the documented
fallback is a single `upload_to_play_store` call issued _after_ both artifacts exist, using
`version_codes_to_retain` for the phone code and treating the phone AAB upload as a separate
non-track-modifying step — record whichever shape actually works.

**Retro material.** Epic 10's definition of done stopped at `assembleDebug` while its own README
predicted this exact failure in prose. Worth naming at the next retrospective: a gap recorded only in
Markdown has no CI status check and is indistinguishable, at release time, from a gap nobody noticed.

## Dev Agent Record

Implemented 2026-08-26 in the same pass that drafted the story (party mode: Amelia + Winston).

### Files changed

| File                                                         | Why                                                                                    |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| `watch-android/app/build.gradle.kts`                         | AC4 — `wearProductionVersionCodeOffset` + `WEAR_RELEASE_TRACK` band selector           |
| `fastlane/Fastfile`                                          | AC1/AC2/AC3/AC5/AC6 — `ship_wear_apk!`, `wear_release_apk!`, `phone_version_code!`     |
| `scripts/lib/signing-fingerprints.mjs`                       | AC5 — pure fingerprint parsing/normalisation/comparison                                |
| `scripts/check-android-signing-parity.mjs`                   | AC5 — the gate itself (resolves `apksigner`, runs `keytool`, compares, prints SHA-256) |
| `scripts/lib/signing-fingerprints.test.js`                   | AC5 — 12 unit tests over the parsing, incl. the public-key-digest trap                 |
| `.github/workflows/beta-releases.yml`                        | AC1 — JDK 17 + Android SDK 36 in `android-beta`, `WEAR_VERSION_CODE`                   |
| `.github/workflows/store-upload.yml`                         | AC2 — the same for `upload-android-release`                                            |
| `.github/workflows/wear-os-build.yml`                        | AC7 — `assembleRelease` added                                                          |
| `watch-android/README.md`, `docs/cicd.md`, `CONTRIBUTING.md` | AC8                                                                                    |

### Design decision reversed mid-implementation (AC4)

The story as drafted proposed applying the production offset as workflow arithmetic, mirroring the
phone's `$((GITHUB_RUN_NUMBER + 1000000))`. **That was reversed.** The phone does it that way only
because `app.config.ts` runs at prebuild and reads a single env var, and it pays for it with a "must
stay in sync" comment — the exact fragility this story is about. Gradle has no such constraint, so the
band, the offset and the validation now all live in `build.gradle.kts`, and `WEAR_RELEASE_TRACK` is set
by `ship_wear_apk!` **from the upload track**, so the band cannot disagree with the destination.
`store-upload.yml` therefore passes the **bare** run number to `WEAR_VERSION_CODE` while passing an
offset one to `ANDROID_VERSION_CODE`; the asymmetry is commented at both sites.

### Verified locally

`watch-android` Gradle, real builds, `aapt2 dump badging` on the produced APK:

| Input                                                | versionCode | Result                   |
| ---------------------------------------------------- | ----------- | ------------------------ |
| `WEAR_VERSION_CODE=42`                               | `2000042`   | ✅ beta band             |
| `WEAR_VERSION_CODE=42 WEAR_RELEASE_TRACK=production` | `3000042`   | ✅ production band       |
| unset (local build)                                  | `2000000`   | ✅ bare band             |
| `""` / `0` / `-3` / `abc`                            | —           | ✅ build fails, all four |

`./gradlew :app:assembleRelease` succeeds cold in **~1m31s** with R8 (`minifyReleaseWithR8`) and
`lintVitalRelease` both running — the first time either has ever run on this app. `testDebugUnitTest`
passes. Repo gates: `typecheck`, `lint` (3 pre-existing warnings owned by 16-24), `format:check`,
`tokens:check`, `splash:check`, `wear:catalogue:check`, `check:native-patches`, `check:native-strings`
all green; `yarn test` = **177 suites / 2178 tests passed**, including the 12 new ones.

### Found while implementing — the hardcoded APK path was wrong

`assembleRelease` with no signing config emits **`app-release-unsigned.apk`**, not `app-release.apk`;
AGP names the artifact from whether signing applied. The first draft of the Fastfile hardcoded the
signed name, which would have failed the release with a confusing "file not found". Replaced with
`wear_release_apk!`, which globs the output directory, refuses to guess when there is not exactly one
APK, and **fails with a named error if the one it finds is the `-unsigned` variant** — i.e. if the
injected-signing properties did not take effect. Verified against the real build output.

### Not verifiable from this repository — AC9 is still open

No local run can exercise the Play Console, so two things remain unproven and gate the story:

1. **That `version_codes_to_retain` composes with the existing _draft_ release** the phone upload
   creates on the alpha track. This is Play behaviour, not fastlane behaviour. The documented fallback
   is in the story's Notes.
2. **That the injected keystore produces a signed `app-release.apk`** rather than the unsigned name.
   The signing material is not in this repo. Both `wear_release_apk!` and the parity check fail loudly
   if it does not, so the failure mode is a red job — not a bad upload.

**Next step for @ifero:** cut an RC and confirm the alpha release lists two version codes (phone `N`,
Wear `2000000 + N`), then record them and the certificate fingerprint here.

### Code review — 4 findings, all fixed

Reviewed at `high` effort against the full branch diff. All four were confirmed against fastlane's own
source or a real artifact, not argued from reading.

1. **🔴 Release-breaking: `Dir.glob` in a lane body resolves against `fastlane/`, not the project root.**
   fastlane wraps the whole lane in `Dir.chdir(FastlaneCore::FastlaneFolder.path)` (`runner.rb`) and
   chdirs out to the root only _inside_ an action (`execute_action`'s `custom_dir` defaults to `".."`).
   So action parameters (`gradle(project_dir:)`, `aab:`) resolve against the root, while raw Ruby and
   `sh` — `FastFile#sh` calls `Actions.sh_no_action` with no chdir — resolve against `fastlane/`. The
   first draft's glob therefore returned `[]` **with the APK on disk**, aborting the lane _after_ the
   phone AAB had been uploaded: the phone-only release this story exists to prevent, on every release.
   Proven both ways against the real repo — old expression `[]`, fixed expression finds the artifact.
   Fixed by routing every path through a new `project_path` helper (absolute paths are correct under
   both working directories), with the rule written into the file as a warning banner.
2. **The `ANDROID_VERSION_CODE` guard ran too late.** `phone_version_code!` was evaluated as an
   argument to `ship_wear_apk!`, i.e. after the phone upload — so a missing value produced the
   phone-only release its own error message warns about. Moved to a preflight beside
   `ensure_android_signing_env!` in both lanes.
3. **`Integer(raw, exception: false)` honours radix prefixes.** `042` parsed as octal `34` while
   `app.config.ts`'s `Number('042')` — the value actually baked into the AAB — is `42`;
   `version_codes_to_retain: [34]` would have retained a nonexistent code and dropped the phone. Base
   10 is now pinned. Verified across `42 / 042 / 0x1f / "" / 0 / -3 / abc / unset`.
4. **build-tools versions were sorted lexicographically**, so `'9.0.0'` outranked `'36.0.0'` and an
   ancient `apksigner` could be resolved, failing a correctly signed APK on a parse error. Replaced
   with a numeric comparator, moved into the tested lib and covered by four more cases (16 total).

The review's own lesson is worth keeping: **findings 1 and 2 both produce the exact defect the story
was written to fix.** A change that hardens a release path is itself a release path, and deserves the
same suspicion.
