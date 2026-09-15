---
baseline_commit: 2ff3e23016a3ee6130e5e0c2b3651de62fa4ac5f
---

# Story 21.7: The single rebrand release [Enabling] — and the "eight orphaned SVGs" that are seven, one of them load-bearing

Status: ready-for-dev

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

- [ ] **Task 1 — Confirm the seven stories are merged (AC1)**, 21.2a included.
- [ ] **Task 2 — Repoint the SVG test (AC4).** Two imports, two identifiers.
- [ ] **Task 3 — Delete the legacy assets (AC3, AC4).** 10 rasters + 7 SVGs, the last only after
      Task 2 is green.
- [ ] **Task 4 — Write the rollback position (AC5).**
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

### Debug Log References

### Completion Notes List

### File List

### Change Log
