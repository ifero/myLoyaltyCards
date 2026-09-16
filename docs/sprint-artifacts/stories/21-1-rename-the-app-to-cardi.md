---
baseline_commit: 2ff3e23016a3ee6130e5e0c2b3651de62fa4ac5f
---

# Story 21.1: Rename the app to Cardì — one config field, and a copy audit four times wider than the epic says

Status: done

Epic: 21 — Cardì Rebrand — Native Identity

> **⛔ READ THE PREBUILD RISK BEFORE TOUCHING `app.json`.** `expo prebuild` derives the generated
> Xcode project and scheme name from `expo.name`. Renaming it regenerates `ios/Cardì.xcodeproj`
> (or some sanitised form of it) and **breaks 18 hardcoded `ios/myLoyaltyCards.xcodeproj` /
> `scheme: "myLoyaltyCards"` references** in `fastlane/Fastfile`, `package.json:47`,
> `scripts/lib/watch-xcodebuild.sh` and `.github/workflows/watchos-tests.yml`. Expo's exact
> sanitisation of the non-ASCII `ì` is **NOT KNOWN** — nobody has run it. **Task 1 is a spike that
> resolves this**, and its answer may change the rest of the story. Do not start the copy sweep
> first and discover the build is broken at the end.
>
> **⚠️ THE EPIC UNDER-SCOPES THIS STORY.** `docs/epics.md` lists the copy audit as "i18n strings,
> the Help screen, the privacy policy, legal documents and store metadata". The real inventory
> also includes **both watch apps, the watch widget, the Wear OS launcher label and the Supabase
> transactional emails** — 44 user-visible sites across 18 files, on four surfaces. The full table
> is below; it was built by grep, not by reading the epic.
>
> **⚠️ A PLAIN GREP FOR `myLoyaltyCards` MISSES FOUR USER-VISIBLE STRINGS.** The spaced variant
> **"My Loyalty Cards"** is the onboarding welcome title and the create-account subtitle, in both
> locales. Grep for the spaced form too.
>
> **✅ THE DEEP-LINK SCHEME IS IN SCOPE — decided by ifero 2026-09-14.** No user-facing deep link
> has shipped (Epic 18's share links are `backlog`), so `expo.scheme` becomes `cardi` in this
> story. That reverses the epic's own AC, and the epic's stated reason for freezing it is **wrong**:
> it claims the scheme is _"referenced by the Supabase redirect allowlist and every OAuth
> callback"_. It is not. `shared/supabase/auth.ts:316` documents that password reset is called
> **without a `redirectTo`**, using a `{{ .Token }}` OTP flow, and the repo contains no
> `makeRedirectUri`, no `createURL` and no deep-link callback at all — every `Linking` call is
> `openSettings()` or an external help URL. See "Renaming the scheme" for the three files that
> must move together.
>
> **`expo.slug` still does NOT change**, and neither do the bundle identifier or package name.
> The list of things that must not move — and what breaks if they do — is in "The identifiers that
> must not change". Two of them silently destroy user data.

## Story

As a user,
I want the app to be called what its icon already says it is,
so that the name on my home screen, in my app switcher, on my watch and in the emails it sends me
all agree with the mark I tapped.

## Context

Story 20.4 shipped the Cardì mark as every icon the app has — `assets/icon.png`,
`adaptive-icon.png`, the Android 13 themed layer, the favicon and the splash mark, all generated
from one geometry definition and gated by `yarn icons:check`. The icon is Cardì. The name under it
is still `myLoyaltyCards` (`app.json:3`).

That is the whole of this story's premise: **the identity is already half-shipped, and this is the
half that is visible in plain language.**

### What the config actually looks like

`app.config.ts` spreads the resolved `app.json` and replaces **only** `android.versionCode`
(lines 44–50). It does not touch `name`, `slug`, `scheme`, `bundleIdentifier` or `package`, so a
change to `app.json:3` propagates through unmodified. There is exactly one field to edit.

One pleasant consequence: the iOS permission strings at `app.json:17`, `:37` and `:47` are written
as `$(PRODUCT_NAME)`, not as a literal. `PRODUCT_NAME` is derived from `expo.name` at prebuild, so
the camera and photo-library prompts start reading "Allow Cardì to access…" **with no edit at
all**. Verify it rather than assume it, but do not go looking for literals to change there.

### The user-visible copy, in full

**44 sites across 18 files** — counted from this table, which is the authority. Grouped by
surface, because the surfaces ship differently.

**Phone — i18n (`shared/i18n/locales/`)**

| key                               | en                                          | it                                                  |
| --------------------------------- | ------------------------------------------- | --------------------------------------------------- |
| `common.launch.accessibilityLab`  | L35 `'myLoyaltyCards, starting up'`         | L35 `'myLoyaltyCards, avvio in corso'`              |
| `navigation.home`                 | L39 `'myLoyaltyCards'`                      | L39 `'myLoyaltyCards'`                              |
| `onboarding.welcome.screenLabel`  | L59 `'Welcome to myLoyaltyCards'`           | L59 `'Benvenuto in myLoyaltyCards'`                 |
| `onboarding.welcome.title`        | L60 **`'My Loyalty Cards'`** ← spaced       | L60 **`'My Loyalty Cards'`** ← spaced, untranslated |
| `privacy.dataSummary.description` | L235–236                                    | L236–237                                            |
| `auth.createAccount.subtitle`     | L393 **`'Join My Loyalty Cards'`** ← spaced | L395 **`'Unisciti a My Loyalty Cards'`** ← spaced   |

**Phone — help and legal**

- `features/help/help-data.json` — L26, L48, L60, L74
- `features/help/help-data.it.json` — L30, L55, L67, L81
- `features/help/help-fallback.ts` — L21, L52
- `assets/legal/privacy-policy.ts` — L39, L41, L45, L99
- `assets/legal/privacy-policy.it.ts` — L15, L17, L21, L75

**watchOS** (ships in the same store build, but as separate targets)

- `targets/watch/en.lproj/Localizable.strings:1` and `it.lproj/Localizable.strings:1` —
  `"watch.app.name"`
- `targets/watch/Info.plist:6` — the display name (lines 11 and 14 are the bundle id and the
  scheme registration — **line 11 stays; line 14 IS the scheme and DOES change, see below**)
- `targets/watch/expo-target.config.js:4` — `displayName: 'MyLoyaltyCards'`
- `targets/watch-widget/en.lproj/Localizable.strings` L2, L9 and the `it.lproj` equivalents
- `targets/watch-widget/WatchComplicationWidget.swift:87` — `.configurationDisplayName(…)`

**Wear OS** (a separate APK, released on its own track)

- `watch-android/app/src/main/res/values/strings.xml:15` —
  `<string name="app_name" translatable="false">myLoyaltyCards</string>`

**Server-sent email** (not in any app build — changing it is a Supabase deploy)

- `supabase/templates/confirmation.html:10` and `recovery.html:10` — the wordmark in the header
- `supabase/config.toml:231` and `:243` — the two bilingual subject lines

### Renaming the scheme

`expo.scheme` becomes `cardi`. It is live in **five places**, all on the watch, and they must move
in the same commit or the complication silently stops opening the app:

1. **`targets/watch/Info.plist:14`** — the `CFBundleURLSchemes` entry. **This is the registration
   that makes the scheme resolvable at all**: the widget can emit whatever it likes, but without
   this the app never receives it. (`Info.plist:11` is the `CFBundleURLName`, an identifier — that
   one stays.)
2. `targets/watch-widget/WatchComplicationWidget.swift:58` —
   `.widgetURL(URL(string: "myloyaltycards://watch"))`. **Shipped and working**: it is what a tap
   on the complication does.
3. `targets/watch/CardListView.swift:430` — `static let scheme = "myloyaltycards"` in
   `WatchComplicationDeepLink`, with `.onOpenURL` routing for `myloyaltycards://watch-card?id=…`.
   The per-card half is **dormant** — `targets/watch/README.md:143` records that nothing anywhere
   constructs that URL — but the parser still gates the shipped `://watch` route.
4. `targets/watch/__tests__/watch-complication-contract.test.ts:117` — asserts the literal
   `'.widgetURL(URL(string: "myloyaltycards://watch"))'`.
5. `targets/watch/__tests__/watch-complication-contract.test.ts:31` — asserts
   `'<string>myloyaltycards</string>'` in the Info.plist. **It goes red the moment site 1 is
   correctly updated**, which is the signal that site 1 was not forgotten.

Two things that make this cheap **now** and dear later: Epic 18 (share links) is `backlog`, so no
public URL carries the scheme yet; and there is no OAuth redirect to re-register. If the scheme is
going to change at all, this release is the moment — it is native, and it is already a store build.

**Verify the complication end-to-end on a device** (AC11). A scheme mismatch between the widget
extension and the app is silent: the URL simply does not resolve, and nothing logs.

### The identifiers that must not change

Each of these contains the name and **must be left exactly as it is**. Two of them destroy user
data if moved:

- **`core/database/migrations.ts:20` — `DB_NAME = 'myloyaltycards.db'`.** Renaming it orphans
  every existing user's entire card database behind an unopened file. There is no migration.
- **`features/cards/hooks/useCardSort.ts:17` — `'@myLoyaltyCards/sortPreference'`.** Renaming it
  silently resets every user's sort preference to the default.
- **`expo.slug` (`app.json:4`)** — binds the EAS project (`app.json:82`, `:89`).
- **`ios.bundleIdentifier` / `android.package`** (`app.json:13`, `:29`) — the listing keeps its
  reviews, ratings and install base only if these are untouched. Also in `fastlane/Appfile`,
  `watch-android/app/build.gradle.kts:178`, the app group and the entitlements.
- **The Wear data-layer paths** `/myloyaltycards` (`core/wear-connectivity.ts:53,56` and the
  Kotlin contract) — the phone↔watch wire protocol.
- **`package.json:2`**, the Supabase `project_id`, the Gradle `rootProject.name`, the Kotlin
  package path (~110 files), the Match certs repo, and the keystore DN
  (`CN=myLoyaltyCards Upload`).

`myloyaltycards.app` — the support mailbox (`features/help/HelpScreen.tsx:152`), the feedback URL
(`:164`) and the privacy contact — is user-visible but is a **live domain**. It is a product
decision, not a mechanical rename. **Out of scope here; raise it rather than change it.**

## Acceptance Criteria

- **AC1 — The prebuild question is answered first, in writing.** Before any copy changes, run
  `expo prebuild` with `expo.name` set to `Cardì` and record: the generated Xcode project name,
  the scheme name, and whether the `ì` survives, is transliterated, or is stripped. The answer
  goes in the PR description. If the generated name differs from `myLoyaltyCards`, every reference
  in `fastlane/Fastfile` (12 lines), `package.json:47` (1), `scripts/lib/watch-xcodebuild.sh:9,14,33` (3)
  and `.github/workflows/watchos-tests.yml:69,73` is updated in **this** story, and an iOS build
  is proven green before merge. ⚠️ **Prebuild output is NOT entirely gitignored**: `ios/` and
  `android/` are, but `targets/watch/Assets.xcassets/AppIcon.appiconset/Contents.json` is
  **tracked**, and `expo prebuild` rewrites it (`.prettierignore` documents exactly this). Check
  `git status` after the spike and restore it — those bytes belong to Story 21.3.
- **AC2 — `expo.name` is `Cardì`** in `app.json:3`. Nothing else in `app.json` changes **except
  `expo.scheme` (AC11)** — so a reviewer auditing the diff sees two intended `app.json` edits, not
  one plus a surprise.
- **AC3 — The name renders with its grave accent** on both platforms' home screens, in the app
  switcher and in Settings. It is a **grave** (`ì`, descending left to right), never an acute
  (`í`) — the accent direction has been drawn wrong before, fifty times, and prose naming it did
  not prevent that (Story 20.3).
- **AC4 — All 44 user-visible copy sites in the table above are updated**, including the four
  **spaced** `"My Loyalty Cards"` strings that a `myLoyaltyCards` grep does not find. ⚠️ **The
  audit grep MUST be case-insensitive.** A third casing — `MyLoyaltyCards` — is used at nine sites
  (`help-data.json` ×4, `help-data.it.json` ×3, `help-fallback.ts:21`,
  `targets/watch/expo-target.config.js:4`), and a case-sensitive search reports `help-data.json` as
  **clean** while all four of its sites still read the old name. The PR reports
  `grep -rni "loyaltycards\|loyalty cards" --exclude-dir=node_modules` and accounts for **every**
  remaining hit as a deliberate identifier.
- **AC5 — No identifier in "The identifiers that must not change" is modified.** The PR states
  explicitly that `DB_NAME` and the `useCardSort` AsyncStorage key were left alone, because those
  two lose user data silently and a reviewer cannot see that from the diff.
- **AC6 — The two tests that assert display copy are updated:**
  `shared/components/launch/AppLaunchScreen.test.tsx:186` and `:316`. The fixture in
  `app.config.test.ts:64` and `:86` is also updated to `'Cardì'` — that test builds a fake
  `ConfigContext` and never reads `app.json`, so it will **not** fail on its own; leaving it says
  the old name is still correct.
- **AC7 — The iOS permission prompts are verified to read "Cardì" on device** without any literal
  having been edited, confirming `$(PRODUCT_NAME)` resolved as expected. If it did not, the
  prompts are fixed here.
- **AC8 — Android launcher label truncation is checked** at the narrowest supported density, and
  the accent is verified to render on a device with a non-Latin keyboard locale set.
- **AC9 — The watch surfaces show the new name**: the watchOS app name and complication
  `configurationDisplayName`, and the Wear OS launcher label. Both are verified on a device or
  emulator, not only in the diff.
- **AC11 — `expo.scheme` becomes `cardi`, and all FIVE of its sites move with it**: `app.json:8`,
  **`targets/watch/Info.plist:14` (the `CFBundleURLSchemes` registration — without it the scheme
  does not resolve at all)**, `WatchComplicationWidget.swift:58`, `CardListView.swift:430`, and
  **both** contract-test assertions (`watch-complication-contract.test.ts:117` and `:31`).
  `Info.plist:11` (`CFBundleURLName`) stays. **The complication is verified on a device** to still
  open the app — a scheme mismatch fails silently, with nothing logged. `expo.slug`,
  `ios.bundleIdentifier` and `android.package` are still unchanged.
- **AC10 — The Supabase change is called out as a separate deploy.** The two templates and the two
  `config.toml` subjects are updated in this PR, and the PR says plainly that they do not reach
  users until Supabase config is deployed — they are not part of the store build.

## Tasks / Subtasks

- [x] **Task 1 — Prebuild spike (AC1).** Set `expo.name` locally, run `expo prebuild`, record the
      generated project/scheme name. Decide and document the consequence for the **18** build
      references across four files (12 in `fastlane/Fastfile`, plus `package.json:47`,
      `scripts/lib/watch-xcodebuild.sh:9,14,33` and `.github/workflows/watchos-tests.yml:69,73`). **Stop and report if the `ì` is mangled** — that may argue for a different
      `PRODUCT_NAME` override rather than a raw rename.
- [x] **Task 2 — The config change (AC2).** One line: `app.json:3`.
- [x] **Task 3 — Build references (AC1).** Only if Task 1 says they moved. Prove an iOS build and
      the watchOS test workflow green.
- [x] **Task 4 — Phone copy (AC4).** i18n en + it (6 keys each, including the two spaced ones),
      `help-data.json`, `help-data.it.json`, `help-fallback.ts`, both privacy policies.
- [x] **Task 5 — Watch copy (AC4, AC9).** Four `Localizable.strings`, `Info.plist:6`,
      `expo-target.config.js:4`, `WatchComplicationWidget.swift:87`, Wear `strings.xml:15`.
- [x] **Task 6 — Supabase copy (AC10).** Two templates, two subject lines.
- [x] **Task 7 — Tests (AC6).** Two launch-screen assertions, two `app.config.test.ts` fixture
      lines.
- [x] **Task 8 — Audit (AC4, AC5).** Run the three greps, account for every hit, paste the result
      in the PR.
- [x] **Task 9a — Rename the scheme (AC11), all FIVE sites in one commit.** `app.json:8`,
      **`targets/watch/Info.plist:14` (the `CFBundleURLSchemes` registration — miss this and the
      widget emits `cardi://watch` at an app that still registers only `myloyaltycards`)**,
      `WatchComplicationWidget.swift:58`, `CardListView.swift:430`, and **both** contract-test
      assertions (`watch-complication-contract.test.ts:117` and `:31`).
- [ ] **Task 9 — Device verification (AC3, AC7, AC8, AC9, AC11).** Home screen, app switcher, Settings,
      permission prompt, launcher truncation, non-Latin locale, watch app, **and the complication
      opening the app over the new scheme**.

## Dev Notes

### Files to touch

Config: `app.json` (2 lines — `name` and `scheme`). Copy: 18 files listed above. Tests: 2 files. Build references:
4 files, **conditional on Task 1**.

### Guardrails

- **Do not rename `expo.slug`.** It binds the EAS project. The **scheme** is a different matter and
  IS in scope — see "Renaming the scheme".
- **Do not touch `assets/images/android-store-banner.svg`**, which renders the wordmark at L20.
  That is Story 21.5's file, and splitting it across two stories guarantees a conflict.
- **Do not "fix" `myloyaltycards.app`.** Live domain, product decision, out of scope.
- This story ships in the **single rebrand release** gated by Story 21.7. It is native
  (`runtimeVersion.policy` is `appVersion`, `app.json:85`), so it cannot go out as an OTA update
  and must not be released alone.

### Testing

`yarn test` for the two assertion updates. There is no test that can prove the rename landed on a
home screen — AC3, AC7, AC8 and AC9 are device work, and the Epic 10 retrospective closed with
on-device validation not performed and the risk accepted (DEC-E10-RETRO-001). Do not repeat that
here by default; if a check is skipped, say so knowingly.

### Previous story intelligence

- **Story 20.4** delivered every icon from one generator and left `IDENTITY_COLORS` wired into
  `tokens/color.json` **additively**, so the icon could land without recolouring the app. That is
  why the app is currently Cardì-iconed and Blue-themed; Story 21.2 closes the other half.
- **Story 20.3** records that all 50 drawn accents came out as **acutes** because SVG's y-axis
  points down and a negative rotation lifts the right end. The design system said "grave" the
  whole time and the drawings still disagreed. Treat AC3 as a real check, not a formality.
- **Story 16.17** owns the launch surface; `common.launch.accessibilityLabel` is its string, and
  `shared/components/launch/constants.test.ts` guards the splash invariants — it imports
  `app.json` but does **not** assert on `name`, so it should stay green.

### References

- [Source: docs/epics.md#Story 21.1: Rename the App to Cardì]
- [Source: docs/design/cardi/cardi-design-system.md] — the mark, the accent, Ink & Beam
- [Source: docs/sprint-artifacts/stories/20-3-the-mark-35-grave-contained.md] — grave vs acute
- [Source: docs/sprint-artifacts/stories/20-4-one-generator-every-icon.md] — what already shipped

## Dev Agent Record

### Agent Model Used

claude-opus-5 (Claude Code, `bmad-dev-story`)

### Debug Log References

**AC1 — the prebuild spike, answered empirically.** `expo.name` set to `Cardì`, `npx expo prebuild`
run on a clean tree (Expo SDK 55.0.19, `@expo/config-plugins` 55.0.8).

**The `ì` is STRIPPED, and it takes the whole character with it — `Cardì` sanitises to `Card`,
not `Cardi`.** `IOSConfig.XcodeUtils.sanitizedName` is:

```js
name
  .replace(/[\W_]+/g, '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');
```

The `NFD` + combining-mark strip exists precisely to fold an accented letter to its base letter,
but the `\W` strip runs **first**, and precomposed `ì` (U+00EC) is `\W` — so the character is
deleted before the fold can see it. First spike run produced exactly that:

| artefact                                      | before                         | `name: "Cardì"` (NFC)             |
| --------------------------------------------- | ------------------------------ | --------------------------------- |
| Xcode project                                 | `ios/myLoyaltyCards.xcodeproj` | `ios/Card.xcodeproj`              |
| source dir / scheme / target / `PRODUCT_NAME` | `myLoyaltyCards`               | `Card`                            |
| `CFBundleDisplayName`                         | `myLoyaltyCards`               | `Cardì` ✅ accent survives        |
| `CFBundleName`                                | `$(PRODUCT_NAME)`              | → `Card` ⛔                       |
| `NSCameraUsageDescription`                    | `Allow $(PRODUCT_NAME) to…`    | → "Allow **Card** to access…" ⛔  |
| Android `app_name` / `rootProject.name`       | `myLoyaltyCards`               | `Cardì` ✅ no sanitisation at all |

**Resolution (ifero, mid-story): the file names should read `Cardi`.** Feeding the name in **NFD**
(`i` + U+0300) puts the base letter outside `\W`, so the strip removes only the combining mark and
the fold lands where upstream always intended. That is done in `app.config.ts` (`resolveAppName`),
not in `app.json` — the JSON keeps the readable, greppable NFC `Cardì`, and the transformation is
explicit, commented and tested. A config plugin **cannot** do this: the project directory is named
by `sanitizedName(exp.name)` at tarball-extraction time (`@expo/cli/.../npm.js:171`), before any
mod runs.

Second clean prebuild, verified byte-for-byte:

| artefact                                                      | result            | form                   |
| ------------------------------------------------------------- | ----------------- | ---------------------- |
| Xcode project / source dir / scheme / target / `PRODUCT_NAME` | **`Cardi`**       | ASCII                  |
| `CFBundleDisplayName`                                         | `Cardì`           | NFD                    |
| `CFBundleName`                                                | `Cardì`           | NFC (explicit literal) |
| `NSCameraUsageDescription` / `NSPhotoLibraryUsageDescription` | "Allow Cardì to…" | NFC                    |
| `CFBundleURLSchemes` (app)                                    | `cardi`           | ASCII                  |
| Android `app_name` / `rootProject.name`                       | `Cardì`           | NFD                    |

All canonically equivalent; every user-visible surface renders `Cardì`.

**AC1's tracked-file warning: checked, and clean.** After two full `expo prebuild` runs,
`git status` showed only the files edited by this story —
`targets/watch/Assets.xcassets/AppIcon.appiconset/Contents.json` was **not** rewritten, so nothing
of Story 21.3's belonged to restore.

**AC1's build proof.** `yarn watch:build:ci` against the renamed project: **BUILD SUCCEEDED** (27s),
exercising `ios/Cardi.xcodeproj`, the `watch` target and the embedded `watchwidget`.

**The built `watch.app`, not just the source, was inspected** (`ios/build/Debug-watchsimulator/`):
`CFBundleDisplayName` = `Cardì`, `CFBundleURLSchemes` = `[cardi]` with `CFBundleURLName`
unchanged, and the compiled `Localizable.strings` return `Cardì` for `watch.app.name` in **both**
`en.lproj` and `it.lproj`.

**A watch-target convention was knowingly departed from.** Story 9.5 records that both watchOS
`.strings` bundles are "deliberately accent-free" (`"Piu usate"`, `"Carta fedelta"`), unlike the
Wear OS `values-it/` which uses proper accents. That convention governs _translated words_; the
brand name is not translated, and AC3 makes the grave load-bearing. `Cardì` therefore carries its
accent in both `.lproj` bundles. Checked rather than assumed that the convention was stylistic
and not an encoding workaround — the files are UTF-8 and the compiled strings above read back
correctly. The surrounding Italian words are left accent-free; retro-fitting them is out of scope.

**Task 9 (device verification) is PARTLY done, and the rest is honestly outstanding.** The story
warns against repeating DEC-E10-RETRO-001 by default, so it was attempted rather than waved
through, and this is exactly how far it got.

Done on a simulator:

- The **full iOS app builds** through `ios/Cardi.xcworkspace` / scheme `Cardi`: **BUILD SUCCEEDED**,
  producing `Cardi.app` with `watch.app` embedded. That is AC1's build proof for the whole app, not
  just the watch target.
- `Cardi.app` **installs** on an iPhone 16 Pro simulator, and `simctl listapps` reports
  `CFBundleIdentifier = com.iferoporefi.myloyaltycards` (**unchanged**, so the listing keeps its
  reviews and install base) with `CFBundleName = "Card\U00ec"`.
- The installed bundle's `CFBundleDisplayName`, both permission strings and the `cardi` URL-scheme
  registration all read correctly, as does the compiled `watch.app` (plist **and** both `.lproj`).

Not done, and **not** to be recorded as passing:

- **AC3's home screen, app switcher and Settings.** SpringBoard placed the freshly installed app on
  a later home page, and reaching it needs a swipe. Simulator input injection requires a device-access
  grant that was not given (`ifero` away from the keyboard), and the live-app route was blocked too:
  Metro could not bind port 8081, which a concurrent Story 21-2 session was holding, and killing
  another branch's dev server is not a trade worth making.
- **AC7's permission prompt on screen**, **AC8's Android launcher truncation and non-Latin locale**
  (no AVD or system image on this machine — needs a real device), **AC9's watch app and Wear OS
  launcher on device**, and **AC11's complication actually opening the app** — which the story is
  explicit fails _silently_, so the plist evidence above is necessary but not sufficient.

The one design risk this leaves open is narrow and worth naming: `Cardì` reaches the iOS home screen
and the Android launcher **decomposed** (NFD). NFC and NFD are canonically equivalent and both
platforms compose combining marks, and the accent was confirmed rendering as a correct **grave** in
the Supabase email template and the public site. It has **not** been confirmed on a springboard.

**A non-ASCII app name breaks Ruby tooling wherever the locale is unset — found by running it.**
`pod install` failed with `ArgumentError - invalid byte sequence in US-ASCII`, thrown from
`xcodeproj-1.27.0/lib/xcodeproj/plist.rb:91` while opening the project. Root cause: Ruby's
`Encoding.default_external` follows the locale, an unset `LANG` makes it US-ASCII, and the
generated `project.pbxproj` is **no longer pure ASCII** — `@bacons/apple-targets` writes the watch
target's display name as `INFOPLIST_KEY_CFBundleDisplayName = "Cardì"` (twice). That is
unavoidable: the watch target sets both `INFOPLIST_FILE` and `GENERATE_INFOPLIST_FILE`, and the
`displayName` in `expo-target.config.js` is one of this story's required copy sites.

It is **not** only a CocoaPods problem — fastlane's `increment_build_number` and
`update_code_signing_settings` open the same project through the same gem, so the release lanes
carry the same exposure. Re-running with `LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8` succeeded and
produced `ios/Cardi.xcworkspace`, matching the Fastfile's updated `workspace:` reference. The five
macOS jobs that open the Xcode project now set the locale explicitly (a no-op on a runner that
already has one). The repo had already met this class of bug once — `fastlane/Fastfile.test.rb:69`
carries the same warning about reading UTF-8 explicitly.

**The Android side was checked and needs nothing** — the scope of the locale fix is a measured
boundary, not a guess. The generated `android/settings.gradle` also carries the non-ASCII name
(`rootProject.name = 'Cardì'`) and the generated `android/gradle.properties`, unlike
`watch-android/`, does **not** set `-Dfile.encoding=UTF-8`. Ran `./gradlew projects` there with
`LANG`/`LC_ALL` explicitly unset: exit 0, `Root project 'Cardì'`. Gradle decodes build scripts as
UTF-8 independently of the platform locale, and the generated `strings.xml` has no XML declaration,
so XML's own UTF-8 default applies. Only the Ruby toolchain is locale-sensitive, so only the five
macOS jobs were touched.

**Gates.** `yarn test` 184 suites / **2312 tests** pass · watch contract Jest (as
`watchos-tests.yml` runs it) 7 suites / **134 tests** pass · `yarn test:fastlane` 21 runs /
**67 assertions** pass · typecheck, lint, format:check, tokens/icons/frames/wear-catalogue checks,
build-path-filters, no-tests-folders and story-catalogue-sync all green.

### Completion Notes List

- **AC1** — spike run, recorded above; the generated name **did** move, so every build reference was
  updated in this story and an Xcode build proven green before merge.
- **AC2** — `expo.name` is `Cardì`. `app.json` carries **four** intended edits rather than the two
  the AC anticipated: `name`, `scheme` (AC11), and two that exist _because_ of the spike result —
  the three `$(PRODUCT_NAME)` permission strings became literals (AC7, see below) and
  `CFBundleName` was pinned. Called out here so the diff holds no surprise.
- **AC3** — `CFBundleDisplayName` = `Cardì` and Android `app_name` = `Cardì`, both verified in the
  generated projects. The accent is a **grave** throughout (U+00EC / `i`+U+0300, never U+00ED).
  Home screen, app switcher and Settings are device work — see Task 9.
- **AC4** — all sites updated, including the four **spaced** `"My Loyalty Cards"` strings and the
  nine `MyLoyaltyCards`-cased ones a case-sensitive grep reports as clean. Audit table below.
- **AC5** — **no identifier was modified.** Explicitly left alone: `DB_NAME =
'myloyaltycards.db'` (`core/database/migrations.ts:20`) and `'@myLoyaltyCards/sortPreference'`
  (`features/cards/hooks/useCardSort.ts:17`) — the two that lose user data silently and that a
  reviewer cannot see from the diff; plus `expo.slug`, `ios.bundleIdentifier`, `android.package`,
  the `/myloyaltycards` Wear data-layer paths, `package.json:2`, the Supabase `project_id`, the
  Match certs repo, the keystore DN and the app-group suite name.
- **AC6** — both `AppLaunchScreen.test.tsx` assertions and the `app.config.test.ts` fixture updated.
  Four new tests were added there; see "Beyond the ACs" below.
- **AC7** — **the AC's premise was wrong, and the spike is why.** `$(PRODUCT_NAME)` resolves to the
  _sanitised_ name, so the prompts would have read "Allow **Card** to access your camera". The AC
  anticipates this ("If it did not, the prompts are fixed here"): all three strings are now
  literals. Verified in the generated `Info.plist`.
- **AC8** — Android launcher label is `Cardì`; truncation at the narrowest density and rendering
  under a non-Latin keyboard locale are device work — see Task 9.
- **AC9** — watchOS app name, complication `configurationDisplayName` and the Wear OS launcher
  label all updated; the watch target builds. On-device confirmation is Task 9.
- **AC10** — the two templates and the two `config.toml` subjects are in this PR. **They do not
  reach users until Supabase config is deployed** — they are not part of the store build, and
  `config.toml` alone does not change the hosted project (the same manual dashboard step already
  tracked for 6.18/6.19).
- **AC11** — `expo.scheme` is `cardi` and all five sites moved together:
  `targets/watch/Info.plist:14` (the `CFBundleURLSchemes` registration), the complication's
  `widgetURL`, `CardListView.swift`'s parser constant, and **both** contract-test assertions.
  `Info.plist:11` (`CFBundleURLName`) is unchanged. The generated app plist registers `cardi`.
  End-to-end complication verification is device work — see Task 9.

**Beyond the ACs — found during the work, decided with ifero:**

1. **`CFBundleName` leaked the sanitised name.** Expo registers `withDisplayName` and
   `withProductName` but **not** `withName`, so `CFBundleName` keeps the template's
   `$(PRODUCT_NAME)`. Pinned to `Cardì` in `app.json`.
2. **`docs/` is a fifth user-visible surface** — it is the public GitHub Pages site. `docs/help.json`
   was _forced_: `HelpScreen.test.tsx` drift-gates it against the bundled copy and went red.
   `docs/privacy-policy.html` (16 sites) and `docs/index.html` (6 sites) were updated on ifero's
   call — without it the **published** privacy policy would contradict the in-app one, with no
   drift gate to catch it. The two GitHub URLs in `index.html` derive from the **repo** name and
   were deliberately left.
3. **Export filename** `myloyaltycards-export-*.json` → `cardi-export-*.json`. Verified safe:
   `importCards.ts` only passes `fileName` through for reporting, never parses it, so existing
   backups still import.
4. **Email wordmark** de-uppercased at ifero's call, and the `0.14em` tracking dropped with it —
   that tracking is an uppercase-eyebrow idiom that renders lowercase as `C a r d ì`. Size, weight
   and the `#6366f1` indigo are untouched; the colour belongs to Story 21.2.
5. **CI artifact labels** renamed in `ios-release.yml` / `android-release.yml`. Verified nothing
   consumes them by name.
6. **Four new tests in `app.config.test.ts`**, importing the **real** upstream
   `IOSConfig.XcodeUtils.sanitizedName` rather than re-implementing it. One of them pins the
   upstream trap itself (`sanitizedName('Cardì') === 'Card'`): if Expo ever reorders that pipeline
   the test goes red and says the NFD workaround can be retired.

7. **`LANG`/`LC_ALL` pinned on the five macOS CI jobs** that open the Xcode project
   (`watchos-tests`, `ios-adhoc`, `ios-testflight-beta`, `upload-ios-release`, nightly `ios`).
   Not a preference — without it the rename can red the entire iOS pipeline, for a reason no test
   in the repository would surface. The Android/Linux jobs are deliberately untouched.
   ⚠️ **A developer whose shell has no `LANG` will hit the same failure locally**; most
   interactive macOS shells set one, so this is flagged rather than guarded.

8. **A display-name invariant test was added** at `test/app-display-name.test.ts`. Nothing
   previously tied the seven surfaces together, so a _partial_ rename left no trace — the phone
   could say one thing and a watch face another with the suite still green. It asserts every
   surface against `app.json`, that the accent is a **grave** and never an acute, and that no
   surface still carries the old name as copy (with the reverse-DNS identifier root excluded,
   since that deliberately did not move). It lives in `test/` rather than
   `targets/watch/__tests__/` on purpose: the watch contract tests are excluded from `yarn test`
   and run only in the path-filtered watchOS workflow, so a PR touching only `watch-android/`
   would never trigger them — the same reasoning that keeps `yarn wear:catalogue:check` in the
   always-on job. Proven to fail: reverting only the Wear label turns exactly two of its
   assertions red.

**Store listing metadata — not dropped, and not unowned.** The epic's original wording lists
"store metadata" in this story's audit, and this story's table does not. That is deliberate and
**Story 21.5 owns it**: its AC7 is "The listing TEXT is handled as a console task, explicitly",
and its banner records that no `fastlane/metadata/` directory or `eas.json` exists anywhere in the
repository — the listing text is maintained by hand in App Store Connect and Play Console, so
there is nothing in-tree this story could have changed. Named here because the omission was
previously silent, unlike the two other out-of-repo carve-outs (`myloyaltycards.app` and the
Supabase deploy) which the story states outright.

9. **The public site's brand badge now carries the real mark** — a scope addition ifero folded
   into this PR rather than taking as the follow-up it was first filed as. `docs/index.html` and
   `docs/privacy-policy.html` showed `<span class="brand-mark">MLC</span>`, the pre-rebrand
   initials, directly beside the new name.
   - The glyph is **generated, not hand-copied**: `scripts/build-brand-icons.mjs` gained a
     `docs/assets/cardi-mark-inline.svg` output, so `yarn icons:check` now gates 9 assets rather
     than 8. A copy has to live inside `docs/` because GitHub Pages serves `main:/docs` only, and
     a hand-copied one would drift from the geometry silently and _only on the public site_.
   - The field is **flat ink** (`--color-brand-ink: #181824`), replacing a
     `linear-gradient(135deg, …)` plus `box-shadow`. That is not a palette decision trespassing on
     Story 21.2: the design system bans both outright ("warm, flat and structural. Paper, not
     glass. No gradients, no drop shadows"), and the mark's own spec puts the beam on ink —
     measured in the generator at **11.53:1 on ink, 1.52:1 on white, 1.33:1 on cream**. The token
     is deliberately _not_ redefined in the dark block; the mark's field does not follow the theme.
   - The glyph's size is **derived from the shipped app icon**, not chosen: on `cardi-icon.svg`'s
     1024 canvas the artwork measures 489.04 × 600.06, so it takes `0.586` of the badge.
     ⚠️ Expressed as `calc()` off a shared `--badge-size`, because writing it as
     `height: 58.6%` **rendered at 71.9%** — a percentage height on a grid item in an auto-sized
     row is indefinite, so the browser falls back to intrinsic sizing and resolves the figure
     against the width. Caught by measuring the rendered box, not by looking at it.
   - Verified in a real browser against a local server (a `file://` snapshot does not load the
     stylesheet): both pages, light and dark, at 375×812 — no gradient, no shadow, no horizontal
     overflow, and the footer's `github.com/ifero/myLoyaltyCards` link still intact.

**Deliberately NOT changed, and why:**

- `ComplicationProvider.swift:56` / `WatchComplicationWidget.swift:81` —
  `"MyLoyaltyCardsWatchComplication"` is the **WidgetKit `kind`**, the identity that ties an
  already-configured complication on a watch face to its provider. Renaming it blanks every
  existing user's complication. Not listed in the story's identifier table; adding it here.
- Swift type names (`MyLoyaltyCardsWatchApp`, `MyLoyaltyCardsWatchComplicationWidget`/`Bundle`) and
  the `watch-ios/MyLoyaltyCardsWatch` test module — internal symbols, no user surface.
- `myloyaltycards.app` (support mailbox, feedback URL, privacy contact) — live domain, product
  decision, explicitly out of scope.
- `assets/images/android-store-banner.svg` — Story 21.5's file.
- ~~The `MLC` brand mark on the public site~~ — **RESOLVED IN THIS PR, see "Beyond the ACs" #9
  above.** It was first left here and filed as a follow-up, on the reasoning that the Cardì mark is
  the **ì** and the design system is explicit that it "has to be constructed, not typeset", so a
  text `ì` would be wrong and the constructed SVG belonged to Story 21.3/21.5. ifero folded it in
  instead, and the generated mark now ships here — so **21.3/21.5 no longer own it**, which is the
  part of this note worth keeping.

**Audit (AC4/AC5).** `git ls-files | xargs grep -Eni "loyaltycards|loyalty cards"` — every
remaining hit falls into one of: the generic noun "loyalty cards"; the domain type
`loyaltyCardSchema`/`LoyaltyCard`; a bundle id / app group / package path
(`com.iferoporefi.myloyaltycards`, `com/iferoporefi/myloyaltycards/…`); the Wear wire paths
`/myloyaltycards`; `myloyaltycards.db`; `@myLoyaltyCards/sortPreference`; the live domain
`myloyaltycards.app`; the repo/Pages/certs URLs; `package.json`'s npm name; Supabase `project_id`;
Gradle `rootProject.name = "myLoyaltyCardsWear"`; the keystore DN `CN=myLoyaltyCards Upload`; the
WidgetKit `kind`; internal Swift symbols; `assets/images/android-store-banner.svg` (Story 21.5);
BMAD `project_name`; the legacy `assets/images/app-icon-*.svg` files, where the live generator
already emits `cardi-*.svg` with `aria-label="Cardì"` — **six** of those seven are genuinely orphaned,
but the seventh (`app-icon-variant-aurora.svg`) is **not** dead weight: `test/svg-module-resolution.test.tsx`
imports it twice, aliased and relative, as the jest `moduleNameMapper` ordering invariant, and
Story 21.7's AC4 repoints that test before removing the file; or planning documents under `docs/`
that record history. `AGENTS.md` was the one hit that fitted none of those categories, and it is
now updated — it names the product and records that the repository, the npm package and the BMAD
`project_name` each keep their pre-rebrand name.

**One more category, named here because claiming otherwise would be false.** An earlier draft of
this paragraph said `AGENTS.md` was the _only_ hit fitting none of the categories above. It was
not. `README.md`, `CONTRIBUTING.md`, `.github/PULL_REQUEST_TEMPLATE.md`, the three
`.github/ISSUE_TEMPLATE/*.yml` files and `.agents/skills/native-watchos/SKILL.md` all use
`myLoyaltyCards` as the product name in **contributor-facing prose** — a different audience and a
different mechanism from the four user-visible surfaces this story's table governs, and entangled
with the repository name, which deliberately is not moving. They are left deliberately and
**flagged for a follow-up sweep**; `AGENTS.md` was updated only because it is the file agents read
first for project identity.

### File List

- `app.json`
- `app.config.ts`
- `app.config.test.ts`
- `shared/i18n/locales/en.ts`
- `shared/i18n/locales/it.ts`
- `shared/components/launch/AppLaunchScreen.test.tsx`
- `features/help/help-data.json`
- `features/help/help-data.it.json`
- `features/help/help-fallback.ts`
- `features/settings/hooks/useExportData.ts`
- `assets/legal/privacy-policy.ts`
- `assets/legal/privacy-policy.it.ts`
- `targets/watch/Info.plist`
- `targets/watch/CardListView.swift`
- `targets/watch/expo-target.config.js`
- `targets/watch/en.lproj/Localizable.strings`
- `targets/watch/it.lproj/Localizable.strings`
- `targets/watch/__tests__/watch-complication-contract.test.ts`
- `targets/watch-widget/WatchComplicationWidget.swift`
- `targets/watch-widget/en.lproj/Localizable.strings`
- `targets/watch-widget/it.lproj/Localizable.strings`
- `watch-android/app/src/main/res/values/strings.xml`
- `supabase/config.toml`
- `supabase/templates/confirmation.html`
- `supabase/templates/recovery.html`
- `fastlane/Fastfile`
- `package.json`
- `scripts/lib/watch-xcodebuild.sh`
- `.github/workflows/watchos-tests.yml`
- `.github/workflows/ios-release.yml`
- `.github/workflows/android-release.yml`
- `.github/workflows/beta-releases.yml`
- `.github/workflows/store-upload.yml`
- `.github/workflows/nightly-builds.yml`
- `docs/help.json`
- `docs/index.html`
- `docs/privacy-policy.html`
- `AGENTS.md`
- `test/app-display-name.test.ts` (new)
- `scripts/build-brand-icons.mjs`
- `docs/style.css`
- `docs/assets/cardi-mark-inline.svg` (new, generated)
- `targets/watch/README.md`
- `docs/architecture.md`
- `docs/sprint-artifacts/sprint-status.yaml`
- `docs/sprint-artifacts/stories/21-1-rename-the-app-to-cardi.md`

### Change Log

| Date       | Change                                                                                                                                                                                                                                                                                                                                                                |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-16 | AC1 prebuild spike run; `ì` found to be stripped entirely (`Cardì` → `Card`).                                                                                                                                                                                                                                                                                         |
| 2026-09-16 | `resolveAppName` added to `app.config.ts` so the iOS build namespace resolves to `Cardi` (ifero's call), with four guard tests against the real upstream sanitiser.                                                                                                                                                                                                   |
| 2026-09-16 | `expo.name` → `Cardì`, `expo.scheme` → `cardi`; three permission strings de-`$(PRODUCT_NAME)`-ed and `CFBundleName` pinned.                                                                                                                                                                                                                                           |
| 2026-09-16 | Build references retargeted to `ios/Cardi.xcodeproj` / scheme `Cardi` across `fastlane/Fastfile`, `package.json`, `scripts/lib/watch-xcodebuild.sh` and `watchos-tests.yml`; watch build proven green.                                                                                                                                                                |
| 2026-09-16 | Copy renamed across phone (i18n, help, legal), watchOS, the watch widget, Wear OS and the Supabase emails.                                                                                                                                                                                                                                                            |
| 2026-09-16 | Public-site brand badge replaced: the `MLC` initials gave way to the generated Cardì mark on a flat ink field, with the glyph's size derived from the shipped app icon. Folded into this PR at ifero's direction rather than shipped as the follow-up it was filed as.                                                                                                |
| 2026-09-16 | QA gate round 1 (5 findings, all addressed): added `test/app-display-name.test.ts` pinning all seven name surfaces against `app.json`; recorded Story 21.5's ownership of store listing text; fixed two stale build instructions (`targets/watch/README.md`, `docs/architecture.md`); corrected a false exhaustiveness claim in the audit; corrected the gate counts. |
| 2026-09-16 | Code review round 1 (6 findings, all fixed): a **broken GitHub link** the `docs/privacy-policy.html` sweep introduced, stale `cardi://` docs in `targets/watch/README.md`, `AGENTS.md`'s project name, a runtime-NFD warning + tripwire test on `resolveAppName`, the superseded icon SVGs accounted for, and the two CI artifact labels normalised to ASCII `Cardi`. |
| 2026-09-16 | `LANG`/`LC_ALL` pinned on the five macOS CI jobs that open the Xcode project — the non-ASCII name makes `pod install` and the fastlane xcodeproj actions fail under an unset locale.                                                                                                                                                                                  |
| 2026-09-16 | Public GitHub Pages site (`docs/help.json`, `docs/privacy-policy.html`, `docs/index.html`), export filename and CI artifact labels renamed — scope additions agreed with ifero.                                                                                                                                                                                       |
