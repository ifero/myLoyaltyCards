# CI/CD Pipeline & Quality Gates

This document describes the CI/CD pipeline, quality gates, and related workflows for the myLoyaltyCards project. All automation is managed via GitHub Actions.

## Overview

- CI/CD covers linting, type checking, testing, coverage, native builds, and deploys.
- Quality gates block PR merges if any check fails.
- Minimum coverage: 80% lines/statements.
- Build and coverage badges are shown in README.
- Notifications: GitHub status checks, Slack (#ci-alerts), email (dev lead).
- Visual regression: pipeline ready for future addition.

## Project Structure

**Important:** The Fastfile and Gemfile are at the **project root**, not inside `ios/` or `android/` subdirectories. All `bundle exec fastlane` commands must run from the project root.

- `Gemfile` / `Gemfile.lock` — Ruby dependencies (Fastlane)
- `fastlane/Fastfile` — Lane definitions for both iOS and Android
- `fastlane/Appfile` — App identifier and Apple ID
- `fastlane/Matchfile` — Certificate repository configuration

## Path Filters & Build Triggers

### AdHoc Builds (main branch + manual)

AdHoc build workflows trigger on push to `main` **only if files change in these folders:**

- `app/`
- `core/`
- `features/`
- `shared/`
- `android/` (Android workflow only)
- `ios/` (iOS workflow only)

**Manual trigger:** Both iOS and Android adhoc build workflows support `workflow_dispatch`, allowing manual runs on **any branch** (feature branches, main, etc.) from the GitHub Actions UI.

**Main branch builds use the `adhoc` Fastlane lane for both iOS and Android.**

### How to Update Path Filters

Edit the `paths` section in the following workflow files:

- `.github/workflows/android-release.yml`
- `.github/workflows/ios-release.yml`

Example:

```yaml
on:
  push:
    branches: [main]
    paths:
      - 'app/**'
      - 'core/**'
      - 'features/**'
      - 'shared/**'
      - 'ios/**'
  workflow_dispatch:
```

If you need to add or remove folders, update the `paths` list in both workflow files and document the change here.

### Beta and Release Builds by Tag

Beta builds (TestFlight/Android beta) are triggered by tags matching `v*.*.*-rc.*` (e.g., `v1.2.3-rc.1`).

Release builds (store upload) are triggered by tags matching `v*.*.*` **excluding** pre-release tags (the `!v*.*.*-*` exclusion pattern prevents RC tags from triggering store uploads).

Workflow files:

- `.github/workflows/beta-releases.yml` (for RC builds)
- `.github/workflows/store-upload.yml` (for final release uploads)

Triggers:

- On `v*.*.*-rc.*` tags: `beta-releases.yml` builds iOS TestFlight and Android beta (using `beta` lane)
- On `v*.*.*` tags (excluding pre-release): `store-upload.yml` uploads iOS and Android release builds to stores (using `upload_release` lane)

To change the trigger pattern, update the `tags:` section in the relevant workflow and document the change here.

## Bundler Setup (Ruby dependencies)

- Version Gemfile and Gemfile.lock.
- Use `ruby/setup-ruby@v1` with `bundler-cache: true` for automatic install and caching.
- Always run `bundle install` before Fastlane or Ruby scripts.

### GitHub Actions Example

```yaml
- name: Set up Ruby
  uses: ruby/setup-ruby@v1
  with:
    ruby-version: '3.2'
    bundler-cache: true
```

## Fastlane Setup (Native build & deploy)

- The Fastfile is at `fastlane/Fastfile` (project root) — **not** inside `ios/` or `android/`.
- Use lanes with explicit platform prefix: `bundle exec fastlane ios adhoc`, `bundle exec fastlane android adhoc`.
- Store secrets in GitHub Actions (never in repo).
- Use `fastlane match` for certificate management.
- Always run `npx expo prebuild` before Fastlane for native sync.
- iOS lanes use `setup_ci` automatically on CI to create a temporary keychain for `match`.

### Available Lanes

**iOS:**

- `ios fetch_certificates` — Fetch dev, adhoc, and appstore certificates
- `ios build_dev` — Build development app
- `ios adhoc` — Build AdHoc distribution (used by main branch CI + manual dispatch)
- `ios beta` — Build and upload to TestFlight (used by RC tag CI)
- `ios upload_release` — Build and upload to App Store Connect (used by release tag CI)

**Android:**

- `android build_dev` — Build debug APK
- `android adhoc` — Build release APK (used by main branch CI + manual dispatch)
- `android beta` — Build and upload to Play Console beta track (used by RC tag CI)
- `android upload_release` — Build AAB and upload to Play Store production (used by release tag CI)

### GitHub Actions Example

```yaml
- name: Prebuild native projects
  run: npx expo prebuild --platform ios
- name: Run Fastlane (iOS AdHoc)
  run: bundle exec fastlane ios adhoc
```

## Quality Gates

- ESLint, TypeScript, Jest (unit/integration tests).
- Minimum 80% coverage enforced.
- PR merge blocked if any check fails.
- Clear report on GitHub.

## Notifications

- GitHub status checks for all builds.
- Slack (#ci-alerts) for build/deploy/rollback.
- Email to dev lead for failures.
- Notification content includes link to log/build.

## Rollback Strategy

- Automatic rollback on failed deploys to production (web/app).
- Revert to last stable release.
- Manual override and fallback documented.

## Troubleshooting & Updating

- Update Gemfile for new Ruby dependencies, then run `bundle install`.
- Update Fastfile for new lanes or build steps.
- Add new secrets in GitHub Actions settings.
- If build fails, check logs for Bundler or Fastlane errors.
- For path filter changes, update workflow triggers and document here.
- **Common issue:** If Fastlane fails immediately (~1 second), check that all required secrets are configured in GitHub repository settings.

## Required GitHub Secrets

### iOS Builds

- `MATCH_PASSWORD` — Password for decrypting match certificates
- `MATCH_GIT_BASIC_AUTHORIZATION` — Base64-encoded credentials for the certificates git repo
- `MATCH_USERNAME` — Apple ID username for match
- `FASTLANE_TEAM_ID` — Apple Developer Team ID
- `APP_STORE_CONNECT_API_KEY_KEY_ID` — App Store Connect API key ID
- `APP_STORE_CONNECT_API_KEY_ISSUER_ID` — App Store Connect API issuer ID
- `APP_STORE_CONNECT_API_KEY_KEY` — App Store Connect API private key content (p8)

### Android Builds

- `ANDROID_PACKAGE_NAME` — Android package name (e.g. com.iferoporefi.myloyaltycards)
- `PLAY_STORE_API_KEY` — Google Play Store service account key (JSON)

## References

- See Epic 11 and related stories in docs/sprint-artifacts/epic-11-cicd.yaml and docs/sprint-artifacts/stories/.
- For more details, see Fastlane documentation and Expo CI/CD guides.
