# Story 16.7: Fix Android beta (alpha) Play upload — authoritative versionCode through Expo prebuild

Status: ready-for-dev

## Story

As a maintainer/release engineer,
I want the Android RC build to upload to Google Play with a correct, monotonically-incrementing versionCode (and to be signed with the real upload key),
so that the beta (alpha-track) upload stops failing with "Version code 1 has already been used" and RC builds reliably reach testers.

## Context

Surfaced 2026-06-11 when the Android beta upload failed on RC tag `v1.0.0-rc.12`. Diagnosed by a dev investigation **confirmed against the real CI log** (run `27338428755`, job "Build Android Alpha (RC)"):

- The **iOS** upload in the same run **succeeded**; only Android failed.
- The Gradle build **succeeded** and the AAB **was signed** — the failure is purely the `upload_to_play_store` (fastlane `supply`) step:

  > `Google Api Error: Invalid request - Version code 1 has already been used.`

- **Root cause:** the `:beta` lane queries the Play alpha track for the max versionCode and passes `-Pandroid.injected.version.code=<max+1>` to `gradle bundleRelease` (`fastlane/Fastfile:221-230`). But `expo prebuild --platform android` **regenerates `android/app/build.gradle` with `versionCode 1` on every run**, because `app.json` has no `android.versionCode` (`app.json:28-34`). `supply` reads the versionCode from the **AAB's `AndroidManifest.xml`** (always `1`), not the Gradle property — so every RC re-submits `1` and Play rejects the duplicate. The computed `max+1` is silently discarded.
- `android/` is **gitignored** (`.gitignore:46`) and only exists because prebuild regenerates it — so the fix **must** live in Expo config (`app.json`/`app.config.*`) or a config plugin, never by hand-editing the generated native files.

**Secondary defects found in the same release path (now in scope — see Refined Decisions):**

- The generated release buildType uses `signingConfigs.debug` (`android/app/build.gradle:115`); it works **only** because CI injects `android.injected.signing.*` (`beta-releases.yml:89-92`, `Fastfile:231-234`) — fragile if those props are ever absent.
- The **production** lane has the identical latent versionCode bug (`fastlane/Fastfile:251-281`, `.github/workflows/store-upload.yml:62-112`).
- The lane targets the **alpha** track (`Fastfile:240`), but `docs/cicd.md:165` calls it the "beta track" — doc inaccuracy.

_Part of Epic 16 — Platform & Tech Debt (standing tech-debt bucket; see also 16-1, 16-2)._

## Acceptance Criteria

1. **Given** an Android RC build (`v*.*.*-rc.*`) **When** the pipeline uploads to Google Play **Then** it succeeds without "Version code N has already been used" — the AAB's manifest versionCode is strictly greater than the highest versionCode already present across **all** Play tracks.
2. The versionCode is set in a way that **survives `expo prebuild`** — via a new `app.config.ts` that extends `app.json` and reads the value from an env var — **not** by editing the gitignored `android/app/build.gradle`, and **not** relying solely on `-Pandroid.injected.version.code`.
3. The versionCode is sourced from **`GITHUB_RUN_NUMBER`** (mirroring the iOS lanes at `Fastfile:101,164`), with a local fallback (e.g. Unix timestamp). Because the alpha/beta and production uploads run in **separate workflows** with independent run counters, the **production** lane uses a distinct offset band (e.g. `GITHUB_RUN_NUMBER + 1_000_000`) so the two can never collide in Play's single shared versionCode space. The scheme's starting values must exceed all existing codes across alpha/internal/production (one-time check — see Prerequisites).
4. The **same versionCode fix is applied to the production lane** (`upload_release` / `store-upload.yml`) so it doesn't hit the identical failure on first use.
5. The release build is **signed with the real upload key**, not the debug-keystore fallback: a prebuild-safe `release` `signingConfig` (e.g. an Expo config plugin) is in place, and reliance on `android.injected.signing.*` as the _sole, unguarded_ path is removed (or, at minimum, the lane explicitly guards that all signing env vars are present before building).
6. `docs/cicd.md` is corrected to reflect the actual target track (**alpha**), removing the "beta" mislabel. No lane/track rename.
7. A successful RC upload to the Play alpha (testing) track is demonstrated — or, if Play access is unavailable in-session, the versionCode embedded in the locally-built AAB is verified (`aapt dump badging` / bundletool) to be the expected `GITHUB_RUN_NUMBER` value.

## Tasks / Subtasks

- [ ] Add `app.config.ts` that imports/extends `app.json` and sets `android.versionCode` from `process.env.ANDROID_VERSION_CODE` (fallback for local builds); verify `expo prebuild` bakes it into the generated `android/app/build.gradle versionCode` (AC: 1, 2, 3)
- [ ] Alpha/beta lane (`Fastfile:216-248`): export `ANDROID_VERSION_CODE = GITHUB_RUN_NUMBER` (local fallback `Time.now.to_i`); stop treating `-Pandroid.injected.version.code` as the manifest source (AC: 3)
- [ ] Production lane (`Fastfile:251-281` / `store-upload.yml`): export `ANDROID_VERSION_CODE = GITHUB_RUN_NUMBER + <offset>` so it can't collide with the beta workflow's counter (AC: 3, 4)
- [ ] One-time check: confirm the run-number-derived codes exceed the highest existing versionCode across alpha/internal/production; set a base offset if needed (AC: 1)
- [ ] Verify the built AAB manifest versionCode (`aapt dump badging` / bundletool) before upload (AC: 7)
- [ ] Wire a real `release` `signingConfig` via an Expo config plugin so release builds use the upload key (not the debug fallback); or add an explicit guard that all `ANDROID_*` signing env vars are set before `bundleRelease` (AC: 5)
- [ ] Correct `docs/cicd.md:165` (alpha vs "beta") (AC: 6)
- [ ] Re-run the RC pipeline (or a dry run) to confirm a clean upload; capture the versionCode used (AC: 7)

## Dev Notes

### Refined Decisions (2026-06-11, with ifero)

1. **versionCode source = `GITHUB_RUN_NUMBER`** (consistency with the iOS lanes, `Fastfile:101,164`), plumbed via the new `app.config.ts`. Production uses an **offset band** (e.g. `+1_000_000`) to avoid cross-workflow collision. _(Chosen over Play-max+1 and a timestamp scheme.)_
2. **Mechanism = add `app.config.ts`** extending `app.json` — `app.json` is static and can't compute a versionCode; `expo-build-properties` is present (`app.json:59`) but does **not** set versionCode.
3. **AC5 signing fix kept IN this story** — it's the same release path and would bite the very next upload once versionCode is fixed.
4. **alpha/"beta" → fix the doc only** (`docs/cicd.md:165`); no lane/track rename (tight scope).
5. **Play App Signing → human prerequisite** (verify enrolment; see Prerequisites) — doesn't block dev start.

### Prerequisites (human / out-of-repo — verify before first upload attempt)

- Confirm **Play App Signing** enrolment; if enrolled, `release.keystore` must be the **upload** key Play expects (relevant before re-attempting the upload).
- Confirm the highest existing versionCode across alpha/internal/production so the `GITHUB_RUN_NUMBER` scheme's starting value clears them (add a base offset if a prior code is unexpectedly high).
- Sanity: service account retains "Release to testing tracks" permission (auth already worked in run `27338428755`).

### References

- Investigation (2026-06-11): failing CI run `27338428755`, job "Build Android Alpha (RC)", tag `v1.0.0-rc.12`. Error: `Google Api Error: Invalid request - Version code 1 has already been used.`
- Alpha/beta lane: `fastlane/Fastfile:216-248`; version logic `:221-230`; signing inject `:231-234`.
- Production lane (same bugs): `fastlane/Fastfile:251-281`; `.github/workflows/store-upload.yml:62-112`.
- iOS run-number precedent: `fastlane/Fastfile:101,164`. Android adhoc commit-hash scheme (not chosen): `Fastfile:199-201`.
- Workflow: `.github/workflows/beta-releases.yml:58-108` (android-beta job); keystore decode `:89-92`.
- Generated native (gitignored): `android/app/build.gradle:95` (`versionCode 1`), `:115` (debug signingConfig), `:112-122`.
- Expo config: `app.json:28-34` (no `android.versionCode`); `app.json:59` (`expo-build-properties` present, not for versionCode); no `app.config.*` and no `eas.json` today.
- Doc inaccuracy: `docs/cicd.md:165` ("beta" vs actual alpha).

### Project Structure Notes

- New file: `app.config.ts` (extends `app.json`; sets dynamic `android.versionCode`). `app.json` stays as the static base.
- `android/` is **gitignored** (`.gitignore:46`) and regenerated by `expo prebuild` — the fix MUST live in Expo config / a config plugin, never in the generated files.
- This is a **CI/release-pipeline + Expo-config** change — no app feature code, no RN/TS feature-layer impact.
- Part of Epic 16 — Platform & Tech Debt (standing bucket; see 16-1, 16-2).

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
