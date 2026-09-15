---
baseline_commit: 2ff3e23016a3ee6130e5e0c2b3651de62fa4ac5f
---

# Story 21.6: Bundle and adopt the brand typefaces — and the ten consumers that never say `TYPOGRAPHY`

Status: ready-for-dev

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

- [ ] **Task 1 — Acquire and bundle the faces (AC1, AC2).** Measure the bundle delta.
- [ ] **Task 2 — Widen the type, add `fontFamily` (AC4).**
- [ ] **Task 3 — Derive the scale and the tracking (AC5, AC6).** Write the mapping table down.
- [ ] **Task 4 — Boot-path loading (AC3).** `useFonts` beside `useBootAuthGate` (line 355); compose
      into `isReady` (line 523). Do not touch `hideSplashScreen`.
- [ ] **Task 5 — Migrate consumers, both paths (AC7).**
- [ ] **Task 6 — Monospace consolidation (AC8).**
- [ ] **Task 7 — `GuestModeBanner` fallbacks (AC9).**
- [ ] **Task 8 — Decisions recorded (AC4, AC10, AC12), and the scaling-cap call (AC11).**
- [ ] **Task 9 — Device verification (AC3, AC11).**

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

### Debug Log References

### Completion Notes List

### File List

### Change Log
