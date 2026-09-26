---
baseline_commit: 2ff3e23016a3ee6130e5e0c2b3651de62fa4ac5f
---

# Story 21.6: Bundle and adopt the brand typefaces — and the ten consumers that never say `TYPOGRAPHY`

Status: review

Epic: 21 — Cardì Rebrand — Native Identity

> **⚠️ THE BLAST RADIUS IS LARGER THAN THE EPIC STATES. Measured at the baseline.**
> The epic says _"All 13 `TYPOGRAPHY` consumers are migrated"_. **10 production files carry an
> `import { TYPOGRAPHY }`** — 8 feature components plus `unistyles.ts` and `ThemeProvider.tsx` —
> and a **second consumption path the identifier does not appear in at all**: ten more production
> files read `useTheme().typography` (`features/auth/` ×8, `features/onboarding/` ×2). Real blast
> radius is **20 distinct production files** (10 + 10, disjoint) **and ~16 test files**, and a grep for `TYPOGRAPHY` finds barely
> half of it.
>
> **⚠️ `fontWeight: '800'` IS NOT REPRESENTABLE TODAY.** `TypographyToken`'s union is
> `'400' | '500' | '600' | '700'`. The design system's `display-lg` is **800**. The type must widen
> before the scale can land. (`'500'` is in the union and used by no token; `mono-code` will be its
> first user.)
>
> **⚠️ THE TRACKING UNITS ARE DIFFERENT KINDS OF NUMBER.** The design system specifies `em`
> (`−0.03em`, `−0.01em`, `+0.02em`); React Native's `letterSpacing` is in **points**. Each value is
> `em × fontSize`, resolved per token. Copying the numbers across produces tracking ~30× too tight.
>
> **⚠️ THIS IS THE BOOT PATH.** Fonts must load before first paint, and story 16.17 spent its whole
> budget making the native→JS handoff seamless. Read "The boot path, precisely" before touching
> `app/_layout.tsx` — the splash hide is **deliberately decoupled** from readiness and must stay so.
>
> **Cannot ship as an OTA.** New native font assets + `runtimeVersion.policy: appVersion` ⇒ new
> native build, the same constraint 16.17 documented.

## Story

As a user,
I want the app set in the brand's own typefaces,
so that it reads as Cardì rather than as a default.

## Story context

The app ships **no custom font at all**. Verified: zero `.ttf`/`.otf`/`.woff` files in the repo,
no `useFonts`, no `Font.loadAsync`, no `fontsLoaded` gate anywhere. `shared/theme/typography.ts` is
**hand-authored** (not generated — `tokens/` holds only `color.json` and `spacing.json`) and its
eleven tokens are **verbatim Apple's HIG iOS text-style scale**: the sizes, line heights and
tracking all match Apple's values. Every frame in `docs/design/cardi/frames/` is drawn in a
typeface the app has never rendered.

`expo-font` is **installed at 55.0.6 but undeclared** — it arrives transitively via `expo@55.0.19`
(and is what `@expo/vector-icons` already uses across 52 files). Adding it to `dependencies` is
real, if small, work: today it is unowned and unpinned.

### The mapping, and what it costs

Eleven app tokens onto seven design-system tokens. The design system's own names share **nothing**
with the code's:

|          | app today (HIG)                     | design system                                           |
| -------- | ----------------------------------- | ------------------------------------------------------- |
| display  | `largeTitle` 34/41 · w700 · +0.37pt | `display-lg` 34/40 · **w800** · −0.03em · Space Grotesk |
| headline | `title2` 22/28 · w700 · +0.35pt     | `headline-md` 24/32 · w700 · −0.01em · Space Grotesk    |
| body     | `body` 17/22 · w400 · −0.41pt       | `body-lg` 17/24 · w400 · Inter                          |
| label    | `footnote` 13/18 · w400 · −0.08pt   | `label-bold` 13/18 · **w600** · +0.02em · Inter         |

⚠️ **`subheadline` 15 is NOT a loss** — it maps directly onto `body-md` (Inter 15px/22), which the
table above omits along with `headline-sm` and `mono-code`; three of the seven targets never
appear. The genuine below-floor set is **`footnote` 13, `caption1` 12 and `caption2` 11** against a
stated **15px minimum body size** — but see AC5 for the floor's real scope: 13 is **not** confined
to `label-bold`. Those losses must be named, not absorbed.

### Two drifts already in the code

- **`features/auth/components/GuestModeBanner.tsx:25-28`** optional-chains the scale with hardcoded
  fallbacks: `typography?.subheadline?.fontSize ?? 16`. `subheadline.fontSize` is **15**. The
  fallback is already wrong and will mask a broken token read.
- **The four monospace sites are four different treatments**, not one repeated: `Menlo` ×3 and
  `Courier` ×1, sizes 18/16/16/12, `letterSpacing` 2/2/1/none, and two different platform APIs
  (`Platform.OS === 'ios' ? …` vs `Platform.select`). They are at `FullscreenBarcode.tsx:180`,
  `CardDetails.tsx:421`, `BarcodeFlash.tsx:228`, `ConflictComparisonCard.tsx:113`.

### The boot path, precisely

`app/_layout.tsx` at module scope: `SplashScreen.preventAutoHideAsync()` (line 52) and
`setOptions({ duration: EXIT_FADE_MS, fade: true })` (line 57) — **deliberately at module scope**,
because Expo's docs are explicit that calling them inside a component can run too late. Both are
`.catch()`-ed because an unhandled rejection there is a permanent blank screen.

`hideSplashScreen` (lines 372-382) is idempotent and fires from **`AppLaunchScreen`'s `onLayout`**
(line 538) — first paint — with a `SPLASH_HIDE_FALLBACK_MS = 2000` backstop. The comment at
360-371 states it is _"deliberately NOT"_ tied to `isReady`.

`isReady = isInitialized && isAuthReady` (line 523) already AND-composes two independent readiness
signals, so a third fits its existing shape. **`AppLaunchScreen` renders no text at all** (only a
`StatusBar` and the `CardiMark` SVG), so it is safe to paint before fonts resolve — but that is a
property to preserve, not to rely on blindly.

## Acceptance Criteria

- **AC1 — Space Grotesk, Inter and JetBrains Mono are bundled at the weights actually used, and no
  others.** Licences confirmed and recorded (all three are OFL). **Bundle-size cost is measured,
  not assumed**, and reported in the PR.
- **AC2 — `expo-font` is added to `dependencies`** at a version consistent with Expo SDK 55. It is
  currently transitive and unpinned.
- **AC3 — Fonts load before first paint, and the launch surface shows NO reflow on a cold start.**
  The font gate composes into `isReady` (line 523); it must **not** delay `hideSplashScreen`, which
  fires on the launch surface's `onLayout` and is deliberately decoupled. If a font gate would push
  past `SPLASH_HIDE_FALLBACK_MS`, the fallback wins and the app still boots — verify that path.
- **AC4 — `TypographyToken` gains `fontFamily`, and its `fontWeight` union widens to include
  `'800'`.** A decision is recorded on whether typography joins the Style Dictionary pipeline —
  today `tokens/` holds only colour and spacing, `SOURCE_FILES` in `style-dictionary.config.mjs:21`
  is a hardcoded two-element array, and `docs/design/CONTRIBUTING-DESIGN.md:46-49` explicitly
  **defers** typography generation to a follow-up. Either honour that deferral or overturn it in
  writing.
- **AC5 — The scale is RE-DERIVED, not re-labelled.** Eleven tokens map onto seven; the mapping is
  decided explicitly and **the losses are named**. ⚠️ `subheadline` 15 is **not** a loss — it maps
  1:1 onto `body-md` (Inter 15/22). The genuine below-floor set is `footnote` 13, `caption1` 12 and
  `caption2` 11. ⚠️ **THE 15px FLOOR BOUNDS _BODY COPY_, NOT ALL TEXT — do not sweep against it blindly.** The
  design system says "Minimum body size is 15px", and the drawn frames ship a **sentence-case
  caption/chrome tier below it** across six of the nine patterns: "Tap to enlarge" Inter **13**
  (`stitch-prompts-card-detail.txt`), "Tap anywhere to close" Inter **14**
  (`stitch-prompts-barcode.txt`), **field error messages** Inter **13**
  (`stitch-prompts-form-states.txt` — the exemplar all eight form screens derive from), sheet helper
  text Inter **13** (`stitch-prompts-settings.txt:190`), document meta and footnote Inter **12**
  (`stitch-prompts-document.txt`), and tile card names Inter **13** semibold
  (`stitch-prompts-wallet.txt:103`). The scale must carry that tier, or the sweep raises text the
  frames deliberately set at 12, 13 and 14.
- ⚠️ **AC5b — Rule on `headline-sm`'s typeface.** The system sets it to **Inter** 20/700, but six
  prompt sites specify sheet and dialog titles as **Space Grotesk 20 bold**
  (`stitch-prompts-settings.txt:156,184,208,231,252`, `stitch-prompts-capture.txt:372`). The app's
  `title3` is 20px, so an 11→7 mapping resolves it to Inter and silently reskins every sheet title.
  ⛔ **Resolve it with an EIGHTH token (Space Grotesk 20/700 for sheet and dialog titles) and leave
  `headline-sm` as Inter.** Flipping `headline-sm` is NOT available: the same 20px tier has four
  **Inter** sites, and one is an explicit prohibition — `stitch-prompts-barcode.txt:51`, "THE STORE
  NAME DOES NOT WEAR OUR DISPLAY FACE. It is set in Inter 20/700, not Space Grotesk… it is
  ratified, not changed" (also `:121`, `:152`, and `capture.txt:310`). Flipping the token would
  silently reskin the hero screen's store name. Story 22.1's AC11 transcribes this decision.
- **AC6 — Tracking is CONVERTED, not copied.** Design-system `em` → RN points, resolved against each
  token's own size. A test asserts at least one conversion (e.g. `display-lg` −0.03em at 34px →
  −1.02pt), so a future copy-paste regression fails loudly.
- **AC7 — All consumers are migrated, by BOTH paths.** The **10** files that `import { TYPOGRAPHY }` **and**
  the 10 files reading `useTheme().typography`. The PR reports both greps.
- **AC8 — The four hardcoded monospace sites become JetBrains Mono** through one shared token, not
  four near-copies. `Platform.select` vs ternary, `Menlo` vs `Courier`, and the three sizes are all
  collapsed.
- ⛔ **AC8b — THIS STORY PERFORMS THE SUB-15px EDIT.** Story 21.2 takes the policy decision; the
  edit lands here, because this is the story that re-derives the scale and the only one touching
  the 25 indirect reads through `TYPOGRAPHY.footnote` / `caption1` / `caption2`. Scope: 80 literal
  instances across 40 files, plus those 25. ⚠️ Ownership was previously left "to settle at
  refinement" in both stories — refinement is closed and it is settled here. Sprint 21's Story 22.8
  depends on the answer existing, so an unowned decision becomes a cross-sprint block.
  ⚠️ **Carve out the section header explicitly.** Its literal `fontSize: 12` sits at four sites
  inside this sweep — but the four copies are NOT four literal 12s, and Story 22.1's table has the
  correct set: **two literal 12s** (`SettingsSection.tsx:21`, `BrandList.tsx:165`), **one literal
  11** (`ConflictComparisonCard.tsx:148`), and **one INDIRECT read at 13** via
  `TYPOGRAPHY.footnote` (`CardDetails.tsx:465`), which falls in the 25-indirect sweep rather than
  the 80-literal one — and Story 22.1's AC11 canonises that header into the design
  system. This story lands first, so decide the header's size here and 22.1 transcribes it
  (`stitch-prompts-settings.txt:120`).
  ⚠️ **One rendered font size is invisible to BOTH sweeps and sits in a file three stories fence
  off.** `features/cards/utils/gridLayout.ts:262` is `const MIN_FALLBACK_TEXT_SIZE = 11`, returned
  as a `fontSize` by `getFallbackChildMetrics` and applied at `CardTile.tsx:205,215` — a real glyph
  size, documented at `:246-248` as mirroring `TYPOGRAPHY.caption2`. A `fontSize:` grep cannot see a
  named constant and it is not a token read, so it is in neither the 80 nor the 25. Raise it with
  `caption2` (updating `gridLayout.test.ts:580,582`, which pin 11 so nothing else goes red), or
  except it in writing and correct the comment. The geometry fence in 21.2 AC9 and 22.1 AC12 is
  scoped to badge and tile dimensions, not to this constant.
- **AC9 — `GuestModeBanner.tsx:25-28`'s hardcoded fallbacks are removed or corrected.** `?? 16` for
  a 15px token is a bug today and will hide a broken read tomorrow.
- **AC10 — The two watch apps are covered or EXPLICITLY deferred to Epic 23.** They carry their own
  type stacks (`.system(...)` on watchOS, `MaterialTheme.typography` on Wear) and inherit nothing
  from this change. Deferral is the expected answer; silence is not.
- **AC11 — Verified on device in both schemes, at the largest and smallest Dynamic Type settings**,
  and the contrast suite still passes. ⚠️ Note the app sets **no `allowFontScaling` and no
  `maxFontSizeMultiplier` anywhere** — text scales freely and uncapped, and a bundled face has
  different metrics (cap height, x-height, line gap) from the system face. Whether a cap is now
  needed is a decision this story must take, not discover in the field.
- **AC12 — `theme.typography` (the Unistyles path) gets a decision.** It is registered and fully
  typed but **read by zero components**. Make it canonical or drop it; do not migrate dead plumbing.

## Tasks / Subtasks

- [x] **Task 1 — Acquire and bundle the faces (AC1, AC2).** Measure the bundle delta.
- [x] **Task 2 — Widen the type, add `fontFamily` (AC4).**
- [x] **Task 3 — Derive the scale and the tracking (AC5, AC6).** Write the mapping table down.
- [x] **Task 4 — Boot-path loading (AC3).** `useFonts` beside `useBootAuthGate` (line 355); compose
      into `isReady` (line 523). Do not touch `hideSplashScreen`.
- [x] **Task 5 — Migrate consumers, both paths (AC7).**
- [x] **Task 6 — Monospace consolidation (AC8).**
- [x] **Task 7 — `GuestModeBanner` fallbacks (AC9).**
- [x] **Task 8 — Decisions recorded (AC4, AC10, AC12), and the scaling-cap call (AC11).**
- [x] **Task 9 — Device verification (AC3, AC11).**

## Dev Notes

### Guardrails

- **Two spread styles exist and behave differently.** `...TYPOGRAPHY.x` carries all four fields, so
  a new `fontFamily` flows automatically. Field-picking sites (`fontSize:`/`lineHeight:` only, e.g.
  `CardList.tsx:258-259`, `EmptyState.tsx:129-131`, `SortFilterRow.tsx:141-143`) **silently drop it**.
  Those are the sites that will render in the system face and look almost right.
- **Four boot-path tests mock `@/shared/theme` wholesale** (`test/root-layout.*.test.tsx`) — a new
  font hook will need mocking in all four. None currently asserts anything about fonts.
- **`~16 test files stub a `typography:` object** in a `useTheme` mock; renaming tokens breaks them.
- **Metro needs no change** — `metro.config.js` only _removes_ `svg` from `assetExts`; `.ttf`/`.otf`
  stay in Expo's defaults. Verify rather than assume.
- 16.17's AC12 records an **80% global coverage gate**, and `shared/**` is coverage-measured.
- **Sequenced after 21.2** — they share `shared/theme/index.ts`, `CardTile.tsx` and
  `NoCodeFoundBanner.tsx`. See the settled split below.

### The split with 21.2 — SETTLED, do not re-open

Story 21.2's ACs absorb _"the 70 instances of sub-15px body text across 40 files"_ (actually **80**
across 40, plus 25 indirect through `footnote`/`caption1`/`caption2`). **21.2 takes the policy
decision; THIS story performs the edit** — see AC8b. The argument is that the indirect 25 are token
reads, which only this story touches. Both stories now state the same split, and Sprint 21's Story
22.8 depends on the answer existing, so do not hand it back to refinement.

### Testing

`yarn test` (expect wide churn), `yarn tokens:check` — which becomes a live gate for typography
only if AC4 adds `tokens/typography.json`. AC3 and AC11 are device work.

### References

- [Source: docs/epics.md#Story 21.6: Bundle and Adopt the Brand Typefaces]
- [Source: docs/design/cardi/cardi-design-system.md#Typography] — the 7-token scale, 15px floor,
  uppercase field labels
- [Source: docs/sprint-artifacts/stories/16-17-redesign-app-launch-experience.md] — the boot path
- [Source: docs/design/CONTRIBUTING-DESIGN.md#46-49] — the deferral this story may overturn

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (`claude-opus-5-5`), via the BMAD dev-story workflow, 2026-09-26.

### Debug Log References

- Everything below was read from the **installed** sources, not recalled: `expo-font@55.0.6`
  (`plugin/build/withFontsAndroid.js`, `withFontsIos.js`, `android/…/FontLoaderModule.kt`,
  `ios/FontLoaderModule.swift`), React Native 0.83.6 (`React/Views/RCTFont.mm`,
  `ReactAndroid/…/ReactFontManager.kt`, `…/CustomLineHeightSpan.kt`,
  `ReactCommon/…/RCTAttributedTextUtils.mm`), `@react-navigation/native-stack@7.14.12`
  (`useHeaderConfigProps.tsx`) and `react-native-screens@4.23.0` (`RNSScreenStackHeaderConfig.mm`,
  `ScreenStackHeaderConfig.kt`). The hosted "latest" Expo fonts page describes SDK 58+ behaviour
  (variable fonts, RN 0.88 `fontVariationSettings`) and was **not** relied on.
- Font metadata read with `fontTools` 4.66.0 (scratchpad venv) and cross-checked with a stdlib
  parser; family grouping verified with **CoreText** directly (`CTFontManagerRegisterFontsForURL`
  - family-matching descriptors), the engine iOS resolves `fontFamily` with.
- The frames' type was measured, not paraphrased: every `font-*` rule in the nine app-screen
  `docs/design/cardi/frames/cardi-*-frames.html` files was extracted and tabulated. That table
  settled three things the prompts alone did not (sheet titles carry **no** tracking; the
  wallet's 13px semibold chrome is `label-bold` with its +0.02em; the auth code field is
  JetBrains Mono 22 / +8px).
- `yarn lint` with the new guard (in its first, selector form) was the sweep's worklist: **250
  violations in 63 files** before, **0** after. `tsc` supplied the other half: **54 reads of
  retired token names in 20 files** (including every `useTheme().typography` read a grep for
  `TYPOGRAPHY` misses), 0 after.
- **A `--stdin` probe cannot test the lint guard.** With `parserOptions.project`, piping text in
  under the path of a file that is already in the TypeScript program reported that file's
  problems from disk rather than the input's: an `import/order` hit on line 10 of a two-line
  input, and no `no-debugger` for its `debugger;`. The rule was proved on a real temporary file
  instead, which it flagged at both literals.

### Completion Notes List

#### Decisions taken with ifero (2026-09-26, before any code)

1. **Faces from the official upstream releases**, vendored under `assets/fonts/` — not the
   `@expo-google-fonts/*` packages. No new npm dependency beyond `expo-font`.
2. **Embedded at build time by the `expo-font` config plugin, NOT `useFonts` (a deviation from
   Task 4's wording, approved).** Expo's docs call embedding the recommended method, and it
   satisfies AC3 _by construction_: the OS registers the faces before any JavaScript runs, so there
   is no font gate to compose into `isReady`, nothing that can delay `hideSplashScreen`, and no
   path on which a gate outruns `SPLASH_HIDE_FALLBACK_MS`. It is also the only mechanism under
   which `fontFamily` + `fontWeight` works on Android: verified in `FontLoaderModule.kt`, runtime
   loading registers each file **only in the NORMAL slot**, so any `fontWeight >= 700` on a
   runtime-loaded family falls through to a _system_ bold (Roboto) — tokens would have needed a
   per-weight family name and no weight on Android.
3. **Every text style in the phone app, not just the 60 enumerated files** — 11 more set literal
   sizes (`Button`, `BarcodeScreen`, `ScannerOverlay`, `HighlightSlide`, `SearchBar`, …) and would
   have stayed in SF Pro / Roboto, because React Native has no font inheritance. **Plus a lint
   guard** so no future style regresses to the system face.
4. **`display-lg` ships at 700.** Space Grotesk's `wght` axis runs 300–700 (Google Fonts'
   `METADATA.pb`), so the design system's 800 is unrenderable, and no frame requests it — every
   frame renders 700. The union still admits `'800'` (AC4).

#### AC1 / AC2 — the faces, their licences and their cost

Five static faces — **Inter 400/600/700, Space Grotesk 700, JetBrains Mono 500** — exactly the
(family, weight) pairs the tokens name. **Inter Medium is deliberately not bundled**: no
design-system token uses 500, and the only 500 in any frame is the scanner's camera-feed text,
which moves up to semibold. All three are SIL OFL 1.1 (licence text beside each family;
bundling in a program is FAQ 1.4/1.20, and FAQ 1.10 exempts bundled fonts from shipping the full
text inside the app); files are unmodified, so no Reserved Font Name question arises (FAQ 2.6).
Provenance with pinned refs and SHA-256 in `assets/fonts/README.md`.

**Cost, measured:** **1,641,728 bytes** (1.57 MiB) per installed app — iOS stores bundle resources
uncompressed — and about **790 KB** compressed as the download-delta proxy (`zip -9` deflates the
five files to 789,741 bytes of payload; the archive's own size varies with its file paths).

**AC2:** `expo-font` declared at **`~55.0.6`**. ⚠️ `npx expo install expo-font` (the AGENTS.md
path) asked Expo's _online_ versions API and wrote **`~55.0.8`**, which added a second
`yarn.lock` entry and installed **two copies of a native module** (55.0.8 hoisted, 55.0.6 nested
under `expo`, `@expo/router-server` and `@expo/vector-icons`) — exactly the re-resolution the
tracker warned about. Corrected to `~55.0.6`, the value the installed `expo@55.0.19` itself
depends on and SDK 55's local `bundledNativeModules.json` pins: one hoisted copy, `yarn.lock`
byte-identical to `main`. `npx expo install --check` now lists expo-font as "expected ~55.0.8"
alongside **21 other packages** (`expo` itself 55.0.19 vs 55.0.31, `react-native` 0.83.6 vs
0.83.10) — the whole SDK patch train is behind, which is separate work.

#### AC3 — boot path

Untouched, deliberately: `app/_layout.tsx` gains no hook, `isReady` is still
`isInitialized && isAuthReady`, `hideSplashScreen` and `SPLASH_HIDE_FALLBACK_MS` are unchanged,
and `AppLaunchScreen` still renders no text. The four `test/root-layout.*` boot suites pass
**unmodified** — there is no font hook to mock.

**Device evidence (iOS 26.5 simulator, iPhone 16, Debug build of this branch).** The built `.app`
carries all five faces **byte-identical** to `assets/fonts/` and lists exactly them in
`UIAppFonts`; `expo prebuild` generates the three Android XML families and the three
`ReactFontManager.addCustomFont` calls in `MainApplication.onCreate`. **No reflow on a cold start,
measured:** 45 screenshots at ≈265ms intervals across a terminate → launch. Every frame is the
native splash or the (pixel-identical) JS launch surface until content appears; the first frame
that contains any text (the exit cross-fade, text at ~32% opacity) already has the settled title's
ink box to the pixel and a darkness correlation of **1.0000** with it, and the title's pixel region
is SHA-1-identical in every frame from then to the end of the run (7s). The face itself is
measured too: "Cardì" renders **77.3pt** wide against **78.0pt** predicted from Space Grotesk
Bold's own advance widths with the −1.02pt tracking (82.1pt untracked). The "gate outruns
`SPLASH_HIDE_FALLBACK_MS`" path cannot occur — there is no gate — and the fallback timer itself
stays covered by `test/root-layout.splash-handoff.test.tsx`.

#### AC4 — the type, and the pipeline decision

`TypographyToken` gains `fontFamily: FontFamily` (one of the three `FONT_FAMILY` strings, each
spelled as the faces' own name tables spell it) and `fontWeight` widens to
`'400' | '500' | '600' | '700' | '800'`. **Style Dictionary: the deferral is HONOURED, in
writing** — `docs/design/CONTRIBUTING-DESIGN.md#typography-is-not-a-dtcg-token`: values are
derived (em → pt) rather than declared, every token is bound to files and native config that a
test already holds together, and there is no second consumer. It names the trigger to revisit.

#### AC5 / AC5b / AC6 — the scale, re-derived

Fifteen tokens plus `monogram(size)`, every one traced to the design system or a measured frame
rule:

| token          | face           | size/lh | wt  | tracking          | role                                   | evidence                                   |
| -------------- | -------------- | ------- | --- | ----------------- | -------------------------------------- | ------------------------------------------ |
| `displayLg`    | Space Grotesk  | 34/40   | 700 | −0.03em = −1.02pt | onboarding hero ("Cardì")              | DS `display-lg`; onboarding `.pitch-title` |
| `headlineMd`   | Space Grotesk  | 24/32   | 700 | −0.01em = −0.24pt | screen, card and document titles       | DS `headline-md`; 14 frame rules           |
| `sheetTitle`   | Space Grotesk  | 20/28   | 700 | 0                 | sheet, dialog, panel titles (**AC5b**) | capture/settings `.sheet-title`            |
| `headlineSm`   | Inter          | 20/28   | 700 | 0                 | store name, in-screen titles           | DS `headline-sm`; barcode `.bc-name`       |
| `bodyLg`       | Inter          | 17/24   | 400 | 0                 | rows, values, inputs                   | DS `body-lg`                               |
| `bodyLgStrong` | Inter          | 17/24   | 600 | 0                 | buttons, row titles, key messages      | 14 `btn-*` frame rules                     |
| `bodyMd`       | Inter          | 15/22   | 400 | 0                 | body copy — the 15px floor             | DS `body-md`                               |
| `bodyMdStrong` | Inter          | 15/22   | 600 | 0                 | links in prose, emphasis               | auth/document link rules                   |
| `captionLg`    | Inter          | 14/20   | 400 | 0                 | dismiss hints                          | barcode `.bc-hint`                         |
| `labelBold`    | Inter          | 13/18   | 600 | +0.02em = 0.26pt  | field labels; tile names, sort, badges | DS `label-bold`; 6 frame rules             |
| `captionMd`    | Inter          | 13/18   | 400 | 0                 | field errors, helper, format names     | form `.error-text`, settings `.helper`     |
| `overline`     | Inter          | 12/16   | 600 | +0.05em = 0.6pt   | uppercase section and table heads      | `settings.txt:120`; 5 frame rules          |
| `captionSm`    | Inter          | 12/16   | 400 | 0                 | document meta and footnotes            | document `.doc-meta`                       |
| `monoCode`     | JetBrains Mono | 16/24   | 500 | 0                 | every displayed card number (AC8)      | DS `mono-code`                             |
| `monoCodeLg`   | JetBrains Mono | 22/32   | 500 | 8px/22 = 8pt      | the one-field verification code        | auth `.field.code .val`                    |

`monogram(size)` — Space Grotesk 700 at a container-derived size and **no** line height (its
line-box midpoint sits 0.004em from its cap-height midpoint, measured) — for avatar and
logo-less-tile initials, which are marks, not text on the scale. `NAVIGATION_TITLE_FONT` carries
`bodyLgStrong`'s face into native header titles **without** a size (see below).

**Tracking is converted (AC6):** `emToPoints(em, fontSize)` resolves each value against its own
token's size; `typography.test.ts` asserts `display-lg −0.03em @ 34 → −1.02pt` and four more, and
Storybook renders the field label with `letter-spacing: 0.26px` (measured in the browser).

**The eleven retired HIG tokens, and what was lost:**

| retired                          | now                                                  | named loss / change                                       |
| -------------------------------- | ---------------------------------------------------- | --------------------------------------------------------- |
| `largeTitle` 34/41 · 700 · +0.37 | `displayLg`                                          | face; tracking inverts (had no reader)                    |
| `title1` 28/34 · 700             | `headlineMd` (auth), `displayLg` (welcome)           | **LOSS — the 28 tier**                                    |
| `title2` 22/28 · 700             | `headlineMd`                                         | +2px, as the frames draw it                               |
| `title3` 20/25 · 600             | `headlineSm` or `sheetTitle`, by role (AC5b)         | 600 → 700                                                 |
| `headline` 17/22 · 600           | `bodyLgStrong`                                       | lh 22 → 24                                                |
| `body` 17/22                     | `bodyLg`                                             | lh 22 → 24                                                |
| `callout` 16/21                  | `bodyLg` (17) or `bodyMd` (15), by role              | **LOSS — the 16 tier**                                    |
| `subheadline` 15/20              | `bodyMd`                                             | 1:1, **not** a loss (lh 20 → 22)                          |
| `footnote` 13/18                 | `captionMd` as chrome, `bodyMd` as body              | raised where it was body copy                             |
| `caption1` 12/16                 | `captionSm`/`overline` chrome, `captionMd`, `bodyMd` | by function                                               |
| `caption2` 11/13                 | —                                                    | **LOSS — the 11 tier**; nothing in any frame is set at 11 |

Every HIG tracking value (tuned for SF Pro) is gone; tracking now exists only where the design
system specifies it. Other named deviations from individual frames: the capture frame's
permission title is 20/**600** → `headlineSm` 700; its two Inter-**500** rules (camera-feed text)
→ the Strong tokens (600, not down to 400, keeping the weight the frame gave text over the feed);
the frames' four **16px** rules (a text link, two document headings, FAQ questions) → 17 or 15 by
role; the barcode frame's +1px on the number → dropped, because AC8 collapses the four sites into
one token; the onboarding "What's the difference?" sheet draws its title at SG **24**, against
AC5b's SG 20 for every other sheet — the rule wins, flagged for Story 22.10.

#### AC7 — both consumption paths

All 10 `import { TYPOGRAPHY }` files and all 10 `useTheme().typography` readers migrated. The
context path is then **removed**: `typography` is gone from `ThemeContextType`, so TypeScript now
enforces zero readers. The PR's two greps: `import { TYPOGRAPHY }` → **69 production files**
(from 8 feature files + 2 theme files; 3 more import only `monogram`); `useTheme().typography` →
**0** (from 10). The 14 dead
`typography:` stubs in `useTheme` mocks were removed — `GuestModeBanner.test.tsx`'s stubbed
`subheadline.fontSize: 16`, **encoding the very drift AC9 names**, which is how it stayed
invisible.

**Guardrail satisfied — field-picking sites.** `CardList`, `EmptyState`, `SortFilterRow`,
`CardTile` and the auth files picked `fontSize`/`lineHeight` off tokens and silently dropped the
family; all now spread whole tokens.

**Beyond both greps — found by a static audit** (every `<Text>`/`<TextInput>` whose style
resolves to no token, nested `<Text>` treated as inheriting): `CardForm`'s two `TextInput`s had
**no text properties at all** (RN's 14pt system default), as did its read-only format value,
`LanguageListScreen`, the camera-permission "checking" line, `CardList`'s error, and the
"Forgot password?" link. All fixed; the audit ends at its four known false positives (two
comments, two `useRef<TextInput>` generics). **Native header titles** — a surface no `fontSize`
grep can find — take `NAVIGATION_TITLE_FONT`: family and weight only, because iOS draws a
sizeless title at 17pt (the token's size) and Android keeps its toolbar's own; resizing headers is
Epic 22's. Verified in native-stack's source that a style with no `color` key keeps
`headerTintColor`. `CardDetailScreen`'s `fontSize: isHeaderCondensed ? 17 : 0` was removed: its
title string is already `''` until the header condenses.

**The lint guard** (`eslint.config.mjs`): a local rule, `local/no-literal-font`, over `app/`,
`features/` and `shared/` (typography.ts, tests, specs, `__tests__` and stories exempt). It rejects
a literal `fontSize`, `fontWeight` or `fontFamily` — in an object or a class field — wherever the
value can come out as one: directly, in any branch of a conditional, on either side of
`??`/`||`/`&&`, behind `as const`/`satisfies`/`!`/`<Type>`, as an entry of a `Platform.select`
(spread-in entries included; known by its platform keys, so a renamed import is still seen), as a
template with no substitutions or as arithmetic on literals — however deeply those nest. It began
as `no-restricted-syntax` selectors; QA found `?? 16` (the very shape AC9 removed) and
`'700' as const` passing them, and a selector can only spell out a fixed path to a literal, so it
became a rule that walks the value. Whatever computes a value stays legal — a call, a getter, a
field read off another value (`fallback.fontSize`), arithmetic on a name (`size * 0.4`) — and a
name is not followed to its value. Nor is a binding's default a style: `({ fontSize = 18 })` may
size a monogram, and `monogram(size)` takes a number by design. `test/typography-lint-guard.test.ts`
runs the rule through ESLint itself against 26 shapes it must flag (one per `Platform.select` key
among them), 14 it must allow and the configuration of 9 files; each of 23 mutations to the rule
or its wiring fails the case written for it.

#### AC8 — one mono token

`FullscreenBarcode` (Menlo 18, +2), `CardDetails` (Menlo 16, +2), `BarcodeFlash` (Menlo 16, +1) and
`ConflictComparisonCard` (Courier 12, `Platform.select`) → `TYPOGRAPHY.monoCode`; sizes, faces,
tracking and both platform APIs collapsed. Two sites the story did not list also take mono because
their frames draw it: `MultiCodePickerSheet`'s decoded value (`capture` `.code-row .digits`) →
`monoCode`, and the verification-code field → `monoCodeLg` (tracked only once digits exist, so the
placeholder still reads as a phrase). **Card-number INPUTS stay Inter** in both flows: the frames
want mono there, but the add flow uses the shared `TextField`, which has no text-style
passthrough; a mono variant is new component API on a primitive Story 22.1 rewrites, and doing it
in the edit flow alone would make add and edit disagree. `ConflictComparisonCard`'s field rows
now wrap: its content box is ~71pt, which holds the 16pt tail (7 × 9.6pt) alone but not beside
its label. Its changed-field cue is one rule for every field — regular when unchanged, semibold +
accent when changed — so no change is signalled by colour alone; only the mono tail is
colour-only, because JetBrains Mono ships one weight.

#### AC8b — the sub-15px edit, performed

Classified by **function** per Story 21.2 AC14, never by size: sentences a user reads moved to the
15px floor (`bodyMd`); labels, counts and annotations took the chrome tier (`captionLg`,
`labelBold`, `captionMd`, `overline`, `captionSm`). `typography.test.ts` asserts that nothing on
the scale is below 15 except exactly those five tokens. Two layout consequences, both named:
`SyncErrorBanner` and `MigrationBanner` put their message beside inline Retry/dismiss controls in
~110pt, where even today's 12px/2-line cap cut real messages off ("Session expired. Changes will
sync after sign-in." — 49 chars); at the floor the cap rises to **4 lines**, still bounded.

- ⛔ **The section header, decided here for Story 22.1 AC11 to transcribe:** `overline` —
  **Inter 12/16, 600, +0.05em (0.6pt), uppercase** — as `stitch-prompts-settings.txt:120` specs
  it, and as three more frames draw it. It is chrome (it labels the rows beneath it), not body. All
  four copies converge: `SettingsSection` (12), `BrandList` (12), `ConflictComparisonCard`
  (11 → 12) and `CardDetails` (13 via `footnote` → 12); their casing and colours are untouched
  (the colour split stays 22.1's). The same token takes the data-summary table heads. The other
  uppercase idiom stays separate: a label for a **single field** is `labelBold` (13/+0.02em).
- **The invisible glyph size** — `gridLayout.ts` `MIN_FALLBACK_TEXT_SIZE` rises **11 → 12**, the
  new smallest size on the scale; the module stays dependency-free, and `gridLayout.test.ts` now
  derives its expectation from `TYPOGRAPHY`, so the mirror is a checked contract, not a comment.
- **The code screen's resend row** rises 13 → 15 and now follows its two jobs. Counting down it is
  text, not a control — `stitch-prompts-auth.txt:389` sets "Resend in 0:42" in "Inter 15px muted",
  drawn with the frame's `.auth-sub` (no weight, so 400) — so it takes `bodyMd`. Once it can be
  pressed it is a link, at the weight the frame draws its links (`.link-row b`, "Go back": Inter
  15px, 600): `bodyMdStrong`. `main` set it semibold in both states. `VerifyEmailScreen.test.tsx` pins each
  state's face, size, weight and colour.

#### AC9 — GuestModeBanner

The four typography fallbacks (`?? 16` against a 15px token, `?? 20`, `?? 13`, `?? 18`) are
**removed**, not corrected: the component imports the scale statically, and a static import cannot
be missing. Title → `bodyMdStrong`, body (a sentence) → `bodyMd`.

#### AC10 — the watches

**Deferred to Epic 23, and already answered there:** `cardi-watch-grammar.md` §5.2 (Story 23.1)
ships no custom typeface to either watch — boot-path cost, optical sizing, no brand payoff.
`typography.ts` says so in its header. No watch file is touched.

#### AC12 — `theme.typography`

**Dropped.** It was registered in the Unistyles theme, fully typed, and read by zero components;
the scale is identical in both schemes, so a per-scheme lookup adds nothing. `unistyles.test.ts`
asserts its absence.

#### AC11 — Dynamic Type: verified at both extremes, in both schemes, against `main`

Seeded the simulator's own database with three test cards and drove it through Welcome, Mode
Selection, the wallet, card detail, the fullscreen barcode, settings and a sheet, at the default
size in light and dark, at `extra-small` (the smallest) in light and at
`accessibility-extra-extra-extra-large` (the largest, ≈3.6× in React Native) in both schemes. For a
like-for-like baseline, **`main`'s JavaScript was served into the same binary** from a detached
checkout of the base commit, so the only variable was this story.

**Decision: no global cap.** Text keeps scaling freely, as it does today. At the largest size the
brand faces behave like the system face — the same truncation, wrapping and overflow as `main` —
and capping body text would trade away the setting's whole purpose. Three targeted fixes instead,
each found by that comparison:

1. **A regression this story introduced, fixed:** single-line `TextInput`s had been given their
   token's line height, and at the largest size the wallet search placeholder **vanished** (it is
   visible on `main`). `inputFont(token)` now gives the seven single-line fields every metric but
   the line height; the placeholder is back at AX5, and at the default size it sits 0.7pt from
   centre where it sat 1.3pt low before.
2. **Monograms no longer take Dynamic Type** (`MONOGRAM_TEXT_PROPS`, on all ten): they are marks
   sized to a container that does not grow, so scaling only overflowed the plate (on `main` too);
   the card name beside each one still scales.
3. **Welcome and Mode Selection now scroll** (approved by ifero): they were the only first-run
   screens that could not, and at the largest size "Get Started" went fully below the fold —
   on `main` its top edge only just peeked in. `alwaysBounceVertical={false}` keeps them still
   whenever everything fits; Welcome is **pixel-identical** at the default size.

Also found, and pre-existing on `main` rather than caused here: a content-size change **while the
app is running** redraws text at the new scale before re-measuring it, so text clips to slivers
until the screen re-lays out (a React Native Fabric behaviour; `main` shows the identical pattern);
at the largest size the wallet's sort row overflows its line; a wrapped `Button` label left-aligns.
The contrast suite passes (it runs in `yarn test`).

#### Storybook

The app's faces reach native binaries only, so the Storybook (web) surface registers the same
files with `@font-face` in `.storybook/brand-fonts.css`, or every Chromatic baseline would record
a fallback face. Measured in the browser: sheet title Space Grotesk 700 20/28, description Inter
400 15/22, button Inter 600 17/24, field label Inter 600 13/18 with `letter-spacing: 0.26px`, all
with `document.fonts.check() === true`.

#### Tests

`yarn test:coverage`: **197 suites / 2,636 tests**, coverage 93.99% statements / 87.56% branches /
89.57% functions / 94.61% lines; `typography.ts` 100%. New: `shared/theme/typography.test.ts`
(the scale token by token, AC6 conversions, the floor, `monogram`, `inputFont`, the header font),
`test/brand-fonts.test.ts` (tokens ↔ `app.json` ↔ Storybook ↔ each committed file's own `name`
and `OS/2` tables: every used face registered on both platforms and no other, family names as
iOS resolves them, PostScript suffixes as RCTFont infers weight, static faces only, no
unregistered file, OFL beside each family — its Storybook check was mutation-tested) and
`test/typography-lint-guard.test.ts` (the lint rule and its wiring, through ESLint). All other
gates pass: typecheck, lint, format, tokens, icons, frames, wear catalogue, build-path filters,
native patches/strings, test layout, story-catalogue sync.

#### Additions beyond the approved scope — each offered for removal

`fontWeight` in the lint guard (approved: size and family); the Storybook `@font-face` sheet and
its test; `NAVIGATION_TITLE_FONT`; the two banners' 2 → 4 line caps; the conflict card's
`flexWrap` and its one changed-field rule; removing `CardDetailScreen`'s `fontSize: 0`; the code
field's conditional tracking; the resend row's weight following its state; `inputFont` and
`MONOGRAM_TEXT_PROPS` (AC11's device findings).
Required rather than optional, so not offered: `DetailRow`'s `style={({ pressed }) => …}` refactored
to explicit press state (AGENTS.md: a file this change touches must not keep that callback), and
the onboarding `ScrollView`s (approved by ifero).

#### Found, not fixed — flagged as follow-ups

Tracked as GitHub issue [#248](https://github.com/ifero/myLoyaltyCards/issues/248), numbered to match.

1. **The SDK 55 patch train is behind** — 22 packages per `expo install --check`.
2. **Three components have no production consumer:** `VirtualLogo`, `FormatPicker`,
   `CatalogueGrid` (migrated anyway, so the guard holds).
3. `GuestModeBanner`'s **spacing/touch-target** optional-chain fallbacks — the same masking pattern
   as AC9, but not typography, and their values match the tokens today.
4. **Hard-coded English** in `useAutoSync` ("Session expired…") and `useGuestMigration` ("Your
   cards are being backed up…") — never passed through i18n.
5. `CONTRIBUTING-DESIGN.md`'s tokens note still names `SEMANTIC_COLORS`, which Story 21.2 deleted.
6. For **Story 22.1 AC11**: the design system's frontmatter still says `display-lg` weight `'800'`
   (should be `'700'`), and card-number inputs need a mono field variant.
7. For **Story 22.10**: the onboarding sheet's SG 24 title vs AC5b.
8. The OFL FAQ calls an **About-box credit** "good practice" (1.20); the app has no licences screen.
9. **Android API 24–27** renders the 600 tokens at 400: below API 28 React Native collapses a
   custom family's weights to regular/bold (`TypefaceStyle.apply`). Accepted: minSdk is Expo's 24.
10. **At the largest Dynamic Type size, on `main` as well:** the wallet sort row overflows its
    line (count and sort label collide or run off the edge), and a `Button` whose label wraps
    left-aligns it — both for the wallet and component redesigns (Epic 22).
11. **Changing the text size while the app runs** clips text to slivers until the screen re-lays
    out — React Native Fabric redraws at the new scale before re-measuring; `main` is identical.
12. **Android was not run on a device**: this host has no phone system image. What is verified
    there is the generated project (XML families, `addCustomFont`) and the source of
    `ReactFontManager`/`CustomLineHeightSpan`; a device pass belongs to Story 21.7's release gate.
13. **`VerifyEmailScreen.test.tsx` depends on its order.** A fake-timer test that runs first
    makes the five later tests that await a resolved promise time out: moving `main`'s own
    "starts a fresh 60s cooldown" test to the top reproduces it. A real-timer warm-up render
    cures it and importing `scheduler` early does not, so whatever keeps the fake timers is set
    up by the first render. Latent — Jest runs the file in order and its first test uses real
    timers — and the resend-row tests added here use none.
14. **The resend row reads "Resend in 0:00" while a request is in flight.** Its text keys off
    `resendDisabled`, which includes `loading`, so once the cooldown is over any verify or resend
    shows a zero countdown until it settles. On `main` too; the row's style follows the same
    condition, so the two stay consistent.

### File List

**New**

- `assets/fonts/README.md`
- `assets/fonts/inter/Inter-Regular.ttf`
- `assets/fonts/inter/Inter-SemiBold.ttf`
- `assets/fonts/inter/Inter-Bold.ttf`
- `assets/fonts/inter/LICENSE.txt`
- `assets/fonts/space-grotesk/SpaceGrotesk-Bold.ttf`
- `assets/fonts/space-grotesk/OFL.txt`
- `assets/fonts/jetbrains-mono/JetBrainsMono-Medium.ttf`
- `assets/fonts/jetbrains-mono/OFL.txt`
- `.storybook/brand-fonts.css`
- `shared/theme/typography.test.ts`
- `test/brand-fonts.test.ts`
- `test/typography-lint-guard.test.ts`

**Modified — foundation**

- `package.json` (`expo-font` declared)
- `app.json` (`expo-font` plugin entry)
- `eslint.config.mjs` (typography guard: the `local/no-literal-font` rule)
- `shared/theme/typography.ts`, `shared/theme/index.ts`, `shared/theme/ThemeProvider.tsx`,
  `shared/theme/unistyles.ts`, `shared/theme/unistyles.test.ts`
- `.storybook/preview.tsx`
- `docs/design/CONTRIBUTING-DESIGN.md`
- `docs/sprint-artifacts/sprint-status.yaml`,
  `docs/sprint-artifacts/stories/21-6-bundle-and-adopt-brand-typefaces.md`

**Modified — consumers (production)**

- `app/_layout.tsx`
- `shared/components/`: `ConflictComparisonCard.tsx`, `ConflictResolutionModal.tsx`,
  `ConsentCheckbox.tsx`, `OfflineIndicator.tsx`, `SyncErrorBanner.tsx`, `SyncIndicator.tsx`
- `shared/components/ui/`: `ActionRow.tsx`, `BottomSheet.tsx`, `Button.tsx`, `CardShell.tsx`,
  `TextField.tsx`, `ToggleSwitch.tsx`
- `features/add-card/components/`: `BrandList.tsx`, `BrandPill.tsx`, `BrandRow.tsx`,
  `BrandSearchBar.tsx`, `MultiCodePickerSheet.tsx`, `NoCodeFoundBanner.tsx`, `ScannerOverlay.tsx`
- `features/add-card/screens/`: `CardSetupScreen.tsx`, `CardTypeSelectionScreen.tsx`
- `features/auth/`: `CreateAccountScreen.tsx`, `MigrationBanner.tsx`, `NewPasswordScreen.tsx`,
  `SignInScreen.tsx`, `VerifyEmailScreen.tsx`
- `features/auth/components/`: `AuthLink.tsx`, `AuthScreenLayout.tsx`, `ErrorBanner.tsx`,
  `GuestModeBanner.tsx`, `PasswordStrengthIndicator.tsx`
- `features/cards/components/`: `BarcodeFlash.tsx`, `BarcodeScanner.tsx`, `BrandHero.tsx`,
  `CardDetails.tsx`, `CardForm.tsx`, `CardList.tsx`, `CardTile.tsx`, `CatalogueGrid.tsx`,
  `ColorPicker.tsx`, `DetailRow.tsx`, `EmptyState.tsx`, `FormatPicker.tsx`,
  `FullscreenBarcode.tsx`, `SearchBar.tsx`, `SortFilterRow.tsx`, `VirtualLogo.tsx`
- `features/cards/screens/`: `BarcodeScreen.tsx`, `CardDetailScreen.tsx`, `CardEditScreen.tsx`
- `features/cards/utils/gridLayout.ts`
- `features/help/HelpScreen.tsx`
- `features/onboarding/components/`: `HighlightSlide.tsx`, `InfoTooltipModal.tsx`,
  `ModeOptionCard.tsx`
- `features/onboarding/screens/`: `FeatureHighlightsScreen.tsx`, `ModeSelectionScreen.tsx`,
  `WelcomeScreen.tsx`
- `features/privacy/`: `DataSummaryScreen.tsx`, `PrivacyPolicyScreen.tsx`
- `features/settings/components/`: `AccountSection.tsx`, `AccountSectionGuest.tsx`,
  `DeleteAccountSheet.tsx`, `ExportConfirmationSheet.tsx`, `ExportEmptyStateSheet.tsx`,
  `ImportErrorSheet.tsx`, `ImportPreviewSheet.tsx`, `LanguagePickerSheet.tsx`,
  `SettingsSection.tsx`, `SignOutSheet.tsx`, `ThemePickerSheet.tsx`
- `features/settings/screens/LanguageListScreen.tsx`

**Modified — tests**

- `shared/components/ConflictComparisonCard.test.tsx`
- `features/cards/components/DetailRow.test.tsx`
- `features/cards/utils/gridLayout.test.ts`
- `features/auth/`: `CreateAccountScreen.test.tsx`, `ForgotPasswordScreen.test.tsx`,
  `NewPasswordScreen.test.tsx`, `RecoveryOtpScreen.test.tsx`, `SignInScreen.test.tsx`,
  `VerifyEmailScreen.test.tsx`
- `features/auth/components/`: `ErrorBanner.test.tsx`, `GuestModeBanner.test.tsx`,
  `PasswordStrengthIndicator.test.tsx`
- `features/onboarding/`: `onboarding.integration.test.tsx`,
  `components/HighlightSlide.test.tsx`, `screens/FeatureHighlightsScreen.test.tsx`,
  `screens/ModeSelectionScreen.test.tsx`, `screens/WelcomeScreen.test.tsx`

### Change Log

| date       | change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-09-26 | Picked up; four scope decisions taken with ifero (upstream faces, config-plugin embedding, full sweep + lint guard, `display-lg` at 700).                                                                                                                                                                                                                                                                                                                                                                                            |
| 2026-09-26 | Bundled Inter 400/600/700, Space Grotesk 700, JetBrains Mono 500; declared `expo-font` `~55.0.6`; re-derived the scale (15 tokens); migrated every text style in the phone app; dropped `theme.typography` and the context path; recorded the Style Dictionary decision.                                                                                                                                                                                                                                                             |
| 2026-09-26 | Code review round 1 (5 findings) addressed: `DetailRow` press-state refactor, the conflict card's changed-name cue, a stale JSDoc, `Platform.select` guarded for all three properties. Device pass: cold-start reflow measured (none); Dynamic Type verified at both extremes against `main`; fixed single-line input line height (`inputFont`), monogram scaling (`MONOGRAM_TEXT_PROPS`) and made Welcome and Mode Selection scroll (approved by ifero).                                                                            |
| 2026-09-26 | Code review round 2: approved, zero findings. QA review round 1 (2 findings) addressed: the lint guard became a local rule, `local/no-literal-font`, that walks a value through every node that passes one on — it catches `?? 16` and `as const`, which the selectors missed — held to 29 cases by a test that runs it through ESLint; the resend row's state-dependent weight is cited to its frame and tested in both states. The compressed font cost is restated independently of archive paths. Two follow-ups added (13, 14). |
| 2026-09-26 | QA review round 2: approved, zero findings. Code review round 3 (5 findings: 3 minor, 2 nits) addressed: the harness's spawn has its own timeout, since a synchronous spawn blocks Jest's; a `Platform.select` is known by its platform keys, so a renamed import no longer hides it; class fields are checked; the `<Type>` assertion and literal-first arithmetic have cases of their own; the rule states what it does not read into (calls, getters, names). 34 cases; each of 16 mutations fails its case.                      |
| 2026-09-26 | Code review round 4 (5 findings: 2 minor, 3 nits) and QA round 3 (3 findings: 2 minor, 1 nit) addressed: a `Platform.select`'s spread-in entries are read; every platform key, the `select` name and the any-key-marks-it choice each have a case of their own; getters and a binding's default are pinned as outside the rule, and the rule's comment says why; specs and `__tests__` are exempt like the sibling blocks; the record no longer calls a field read arithmetic. 48 cases; each of 22 mutations fails its case.        |
| 2026-09-26 | QA round 4: approved, zero findings. Code review round 5 (1 finding, minor) addressed: the rule exempts `*.stories.ts` as well as `.tsx`, as the sibling Storybook block and Storybook's own story glob in `.storybook/main.ts` do, with a wiring case. 49 cases; each of 23 mutations fails its case.                                                                                                                                                                                                                               |
| 2026-09-26 | Code review round 6 and QA round 5 (one finding, the same, minor): the previous row quoted Storybook's story glob, which contains a pipe, inside a code span. GFM splits table cells on every unescaped pipe, code spans included, so the row gained a phantom cell and Prettier widened the delimiter row under a two-cell header. Reworded to name `.storybook/main.ts`, and all 8 tables in the three touched docs re-checked. QA round 6: approved, zero findings. Code review round 7 (1 nit): the log was missing this row.    |
| 2026-09-26 | Code review round 8 and QA round 7: approved, zero findings. Status set to review.                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 2026-09-26 | Follow-ups 1 to 14 filed as GitHub issue #248, as ifero asked, so they are tracked rather than only recorded.                                                                                                                                                                                                                                                                                                                                                                                                                        |
