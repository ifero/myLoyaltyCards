---
baseline_commit: 2ff3e23016a3ee6130e5e0c2b3651de62fa4ac5f
---

# Story 21.1: Rename the app to Cardì — one config field, and a copy audit four times wider than the epic says

Status: ready-for-dev

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

- [ ] **Task 1 — Prebuild spike (AC1).** Set `expo.name` locally, run `expo prebuild`, record the
      generated project/scheme name. Decide and document the consequence for the **18** build
      references across four files (12 in `fastlane/Fastfile`, plus `package.json:47`,
      `scripts/lib/watch-xcodebuild.sh:9,14,33` and `.github/workflows/watchos-tests.yml:69,73`). **Stop and report if the `ì` is mangled** — that may argue for a different
      `PRODUCT_NAME` override rather than a raw rename.
- [ ] **Task 2 — The config change (AC2).** One line: `app.json:3`.
- [ ] **Task 3 — Build references (AC1).** Only if Task 1 says they moved. Prove an iOS build and
      the watchOS test workflow green.
- [ ] **Task 4 — Phone copy (AC4).** i18n en + it (6 keys each, including the two spaced ones),
      `help-data.json`, `help-data.it.json`, `help-fallback.ts`, both privacy policies.
- [ ] **Task 5 — Watch copy (AC4, AC9).** Four `Localizable.strings`, `Info.plist:6`,
      `expo-target.config.js:4`, `WatchComplicationWidget.swift:87`, Wear `strings.xml:15`.
- [ ] **Task 6 — Supabase copy (AC10).** Two templates, two subject lines.
- [ ] **Task 7 — Tests (AC6).** Two launch-screen assertions, two `app.config.test.ts` fixture
      lines.
- [ ] **Task 8 — Audit (AC4, AC5).** Run the three greps, account for every hit, paste the result
      in the PR.
- [ ] **Task 9a — Rename the scheme (AC11), all FIVE sites in one commit.** `app.json:8`,
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

### Debug Log References

### Completion Notes List

### File List

### Change Log
