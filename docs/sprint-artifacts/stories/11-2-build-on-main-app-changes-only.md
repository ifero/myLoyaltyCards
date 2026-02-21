# Story 11-2: Build on main only if app code changes

**Epic:** 11 (CI/CD & Quality Gates)

## Description

The build workflow is triggered only if files are modified in the following folders:

- app/
- core/
- features/
- shared/
- android/
- ios/

Excluded folders:

- docs/
- config/
- test/
- assets/
- .github/
- scripts/

Changes in android/ and ios/ MUST trigger the build.

## Acceptance Criteria

- Build on main only if files change in app/core/features/shared/android/ios
- No build on docs/config/test/assets/scripts/.github changes
- Documentation of included/excluded paths
- Native code changes trigger the build
- Path filters are documented and easily updatable

## Main Tasks

1. Define path filters in the GitHub Actions workflow.
2. Update documentation for path filters.
3. Test the trigger with commits in included/excluded folders.
4. Validate that the build does not start on excluded changes.
5. Update docs/cicd.md with instructions on how to modify path filters.

## Notes

- Documentation must be clear and easily accessible.
- Path filters should be simple to update for future changes.
- Native changes (android/ios) are critical and must always trigger the build.

## Technical Details & Examples

### Bundler Setup (Ruby dependencies)

**Best practices:**

- Keep Gemfile and Gemfile.lock versioned.
- Use `bundle install --path vendor/bundle` for local installs and CI.
- Cache `vendor/bundle` in GitHub Actions for faster builds.
- Always run `bundle install` before Fastlane or Ruby scripts.

**GitHub Actions Example:**

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

### Fastlane Setup (Native build & deploy)

**Best practices:**

- Place Fastfile and Matchfile in ios/ and android/.
- Use lanes for build, test, beta, release.
- Store secrets in GitHub Actions (not in repo).
- Use `fastlane match` for certificate management.
- Always run `npx expo prebuild` before Fastlane for native sync.

**Fastfile Example (ios/):**

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

**GitHub Actions Example:**

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

### Troubleshooting & Updating

- Update Gemfile for new Ruby dependencies, then run `bundle install`.
- Update Fastfile for new lanes or build steps.
- Add new secrets in GitHub Actions settings.
- If build fails, check logs for Bundler or Fastlane errors.
- For path filter changes, update workflow triggers and document in docs/cicd.md.

### Bundler & Fastlane in CI/CD

- Bundler manages Ruby dependencies for Fastlane and other scripts.
- Fastlane automates native build, certificate management, and deploy.
- Both are integrated in GitHub Actions for reproducible builds.

**For more details, see docs/cicd.md and Fastlane documentation.**

## Acceptance Checklist

- [x] Path filters defined and working
- [x] Documentation updated
- [x] Build triggered only on included changes
- [x] Build NOT triggered on excluded changes
- [x] Instructions for updating path filters

## Implementation Summary

- Path filters are defined in `.github/workflows/android-release.yml` and `.github/workflows/ios-release.yml` for main branch builds (adhoc lane).
- Tag-based release builds (beta lane) are defined in `.github/workflows/ios-testflight.yml`.
- docs/cicd.md documents included/excluded paths, how to update filters, and lane usage.
- All requirements and documentation are complete and validated.
