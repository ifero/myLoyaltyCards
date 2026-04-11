# Story 11-5: Document CI/CD Pipeline

**Epic:** 11 — CI/CD & Quality Gates
**Status:** drafted
**Sprint:** 12
**Priority:** Medium — follows 11-6 (watchOS pipeline)
**Depends on:** 11-6 (watchOS pipeline must be implemented first so docs reflect reality)

## Story

As a developer or project maintainer,
I want complete, accurate CI/CD documentation,
so that anyone can understand how builds, tests, and deploys work, and can ship to TestFlight or production without tribal knowledge.

## Context

The existing `docs/cicd.md` was created during stories 11-1 and 11-2. It covers quality gates, path filters, Fastlane lanes, secrets, and bundler setup. However, it has several inaccuracies and gaps:

**Inaccurate:**

- Claims Slack notifications exist (story 11-3 was cancelled — GitHub status checks are sufficient)
- Claims rollback strategy exists (story 11-4 was cancelled — not applicable to mobile app store binaries)
- Claims email notifications to dev lead exist (not implemented)

**Missing:**

- watchOS CI/CD (tests exist, build+upload pipeline coming from 11-6)
- Release runbook: step-by-step "how do I ship to TestFlight?" and "how do I release to production?"
- Pipeline architecture overview / diagram
- Provisioning/match setup guide for new bundle IDs
- Local dev build instructions
- Troubleshooting guide for common CI failures

**Reference:** Current doc at `docs/cicd.md` (183 lines).

**Figma:** N/A (documentation story)
**Design reference:** N/A

## Acceptance Criteria

### AC1: Remove Inaccurate Claims

- [ ] Remove or correct the Notifications section — only GitHub status checks exist, no Slack or email notifications
- [ ] Remove the Rollback Strategy section entirely — not applicable to mobile apps
- [ ] Ensure every claim in the document is accurate and reflects what's actually implemented

### AC2: Pipeline Architecture Overview

- [ ] Add a Mermaid diagram showing the full CI/CD architecture:
  - PR opened → `ci-quality-gates.yml` (lint, typecheck, test, coverage)
  - PR touches `watch-ios/` → `watchos-tests.yml` (xcodebuild tests)
  - Push to main (app paths) → `ios-release.yml` (adhoc) + `android-release.yml` (adhoc)
  - RC tag (`v*-rc.*`) → `beta-releases.yml` (iOS TestFlight + Android beta + watchOS TestFlight)
  - Release tag (`v*.*.*`) → `store-upload.yml` (iOS App Store + Android Play Store + watchOS App Store)
- [ ] Diagram is clear enough that a new contributor understands the full pipeline in 30 seconds

### AC3: Release Runbook

- [ ] Step-by-step guide: **"How to ship to TestFlight"**
  1. Ensure main is green (CI passes)
  2. Determine version number
  3. Create and push RC tag: `git tag v1.0.0-rc.1 && git push --tags`
  4. Monitor `beta-releases.yml` workflow in GitHub Actions
  5. Verify builds appear in App Store Connect → TestFlight (iOS, watchOS)
  6. Distribute to testers
- [ ] Step-by-step guide: **"How to release to production"**
  1. Validate TestFlight build
  2. Create and push release tag: `git tag v1.0.0 && git push --tags`
  3. Monitor `store-upload.yml` workflow
  4. Submit for App Store / Play Store review
- [ ] Step-by-step guide: **"How to do a manual/ad-hoc build"**
  - Trigger via `workflow_dispatch` from GitHub Actions UI
  - Or run locally: `bundle exec fastlane ios adhoc`

### AC4: watchOS CI/CD Section

- [ ] Document watchOS test CI (`watchos-tests.yml` — triggers, what it tests)
- [ ] Document watchOS build+upload pipeline (from 11-6):
  - Fastlane lanes: `watch_beta`, `watch_upload_release`
  - GHA workflow jobs
  - Note: NO `expo prebuild` for watchOS (pure SwiftUI)
- [ ] Document provisioning prerequisites:
  - App ID registration
  - App Store Connect app creation
  - match profile generation
  - Reference the prerequisite steps from story 11-6

### AC5: Provisioning & Certificates Guide

- [ ] Document how `fastlane match` works in this project:
  - Certificates repo location
  - How to add a new bundle ID
  - How to regenerate expired profiles
  - Readonly mode on CI vs. read-write locally
- [ ] Document the temporary keychain setup (`setup_ci`) used on CI runners

### AC6: Troubleshooting Section

- [ ] Common failure: Fastlane fails immediately (~1s) → check secrets
- [ ] Common failure: Code signing error → match profile mismatch or missing profile
- [ ] Common failure: Build number conflict → TestFlight already has this build number
- [ ] Common failure: `expo prebuild` changes signing settings → `update_code_signing_settings` in lane
- [ ] Common failure: watchOS build uses wrong destination → verify scheme targets watchOS

### AC7: Structure & Maintainability

- [ ] Document has clear table of contents with anchor links
- [ ] Each section is self-contained (can be read independently)
- [ ] "Last updated" date at top of document
- [ ] References to workflow files are relative links (clickable from GitHub)
- [ ] No duplication — single source of truth for each concept

## Tasks / Subtasks

### T1: Audit & Clean Existing Content (AC1)

- [ ] Read current `docs/cicd.md` line by line
- [ ] Remove Slack/email notification claims
- [ ] Remove rollback strategy section
- [ ] Verify every remaining statement is accurate
- [ ] Fix any outdated lane descriptions or secret names

### T2: Add Pipeline Architecture Diagram (AC2)

- [ ] Create Mermaid flowchart showing all workflows, triggers, and outcomes
- [ ] Include all platforms: iOS, Android, watchOS
- [ ] Show the quality gates → build → deploy flow

### T3: Write Release Runbooks (AC3)

- [ ] TestFlight release runbook (tag → workflow → verify)
- [ ] Production release runbook (tag → workflow → submit)
- [ ] Manual/ad-hoc build runbook (workflow_dispatch or local)
- [ ] Include expected timings (e.g., "iOS build typically takes 15–20 min on macos-15")

### T4: Add watchOS CI/CD Section (AC4)

- [ ] Document test CI
- [ ] Document build+upload pipeline
- [ ] Cross-reference 11-6 story for provisioning prerequisites

### T5: Add Provisioning Guide (AC5)

- [ ] Document match setup and usage
- [ ] Document how to add new app identifiers
- [ ] Document CI keychain setup

### T6: Add Troubleshooting Section (AC6)

- [ ] Compile common failures and resolutions
- [ ] Add quick-fix commands where applicable

### T7: Structure & Polish (AC7)

- [ ] Add table of contents
- [ ] Add "last updated" header
- [ ] Convert workflow file references to relative links
- [ ] Review for readability and conciseness

## Tech Notes

- **Single doc**: Keep everything in `docs/cicd.md` — no splitting into multiple files. This is the one place to look.
- **Mermaid**: Use Mermaid diagrams (rendered natively by GitHub Markdown) — no external tools needed.
- **Accuracy over completeness**: Every statement must be verifiable. Don't document aspirational features.
- **Audience**: Developer joining the project for the first time. They should be able to ship a TestFlight build by reading only this document.

## Definition of Ready Checklist

| #   | Gate               | Status                                             |
| --- | ------------------ | -------------------------------------------------- |
| 1   | Design Approved    | N/A (documentation story)                          |
| 2   | Story Spec Final   | ✅ This document                                   |
| 3   | Interaction Spec   | N/A (documentation story)                          |
| 4   | Dependencies Clear | ⏳ Depends on 11-6 being done first                |
| 5   | Edge Cases Defined | ✅ Inaccuracies and gaps explicitly listed         |
| 6   | Tech Notes         | ✅ See above                                       |
| 7   | Testability        | ✅ Each AC is verifiable by reading the output doc |
