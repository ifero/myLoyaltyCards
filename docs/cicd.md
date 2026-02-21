# CI/CD Pipeline & Quality Gates

This document describes the CI/CD pipeline, quality gates, and related workflows for the myLoyaltyCards project. All automation is managed via GitHub Actions.

## Overview

- CI/CD covers linting, type checking, testing, coverage, native builds, and deploys.
- Quality gates block PR merges if any check fails.
- Minimum coverage: 80% lines/statements.
- Build and coverage badges are shown in README.
- Notifications: GitHub status checks, Slack (#ci-alerts), email (dev lead).
- Visual regression: pipeline ready for future addition.

## Path Filters & Build Triggers

### Main Branch Builds (AdHoc)

Build workflows on `main` are triggered **only if files change in these folders:**

- `app/`
- `core/`
- `features/`
- `shared/`
- `android/`
- `ios/`

**Excluded folders:**

- `docs/`
- `config/`
- `test/`
- `assets/`
- `.github/`
- `scripts/`

Native changes (`android/`, `ios/`) always trigger builds.

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
      - 'android/**'
      - 'ios/**'
```

If you need to add or remove folders, update the `paths` list in both workflow files and document the change here.

### Beta and Release Builds by Tag

Beta builds (TestFlight/Android beta) are triggered by tags matching `v*.*.*-rc.*` (e.g., `v1.2.3-rc.1`). These builds are NOT uploaded to stores.

Release builds (store upload) are triggered by tags matching `v*.*.*` (e.g., `v1.2.3`). These builds are uploaded to App Store Connect and Play Console (just create/update build, review is manual).

Workflow files:

- `.github/workflows/beta-releases.yml` (for RC builds)
- `.github/workflows/store-upload.yml` (for final release uploads)

Triggers:

- On `v*.*.*-rc.*` tags: `beta-releases.yml` builds iOS TestFlight and Android beta (using `beta` lane)
- On `v*.*.*` tags: `store-upload.yml` uploads iOS and Android release builds to stores (using `upload_release` lane)

To change the trigger pattern, update the `tags:` section in the relevant workflow and document the change here.

## Bundler Setup (Ruby dependencies)

- Version Gemfile and Gemfile.lock.
- Use `bundle install --path vendor/bundle` for local and CI installs.
- Cache `vendor/bundle` in GitHub Actions.
- Always run `bundle install` before Fastlane or Ruby scripts.

### GitHub Actions Example

```yaml
- name: Set up Ruby
  uses: ruby/setup-ruby@v1
  with:
    ruby-version: '3.2'
- name: Install Bundler dependencies
  run: bundle install --path vendor/bundle
- name: Cache Bundler
  uses: actions/cache@v3
  with:
    path: vendor/bundle
    key: ${{ runner.os }}-bundler-${{ hashFiles('**/Gemfile.lock') }}
    restore-keys: |
      ${{ runner.os }}-bundler-
```

## Fastlane Setup (Native build & deploy)

- Place Fastfile and Matchfile in ios/ and android/.
- Use lanes for build, test, beta, release.
- Store secrets in GitHub Actions (never in repo).
- Use `fastlane match` for certificate management.
- Always run `npx expo prebuild` before Fastlane for native sync.

### Fastfile Example (ios/)

```ruby
default_platform(:ios)

platform :ios do
  desc "Build and upload to TestFlight"
  lane :beta do
    match(type: "appstore")
    build_app(scheme: "myLoyaltyCards")
    upload_to_testflight
  end
end
```

### GitHub Actions Example

```yaml
- name: Prebuild native projects
  run: npx expo prebuild
- name: Run Fastlane (iOS)
  run: bundle exec fastlane beta
  working-directory: ios
  env:
    MATCH_PASSWORD: ${{ secrets.MATCH_PASSWORD }}
    APP_STORE_CONNECT_API_KEY: ${{ secrets.APP_STORE_CONNECT_API_KEY }}
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

## References

- See Epic 11 and related stories in docs/sprint-artifacts/epic-11-cicd.yaml and docs/sprint-artifacts/stories/.
- For more details, see Fastlane documentation and Expo CI/CD guides.
