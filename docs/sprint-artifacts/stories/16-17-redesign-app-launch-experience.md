---
baseline_commit: e9d841d403881867215df74ac162e9ac8e9a8fa6
---

# Story 16.17: Redesign the app launch experience — one continuous, branded, theme-aware surface

Status: done

Epic: 16 — Platform & Tech Debt

> **Run all gates from the main checkout, never a `.claude` worktree** — a worktree has no `node_modules` and `yarn test` finds zero tests there.
>
> **This change cannot ship as an OTA.** `runtimeVersion: { policy: 'appVersion' }` (`app.json:87-89`) plus a new native module means a new native build is required. And per Expo's docs the splash does **not** render faithfully in Expo Go or a dev build — see AC13.
>
> **The five Open Decisions at the end are binding defaults, not questions.** Implement them as written; do not pause to ask.

## Story

As a user opening the app in a checkout queue,
I want the launch to be a single calm branded surface instead of a stack of flashing placeholder screens,
so that the app reads as instantly ready — and as _ours_ — rather than as something still assembling itself.

## Context

### The defect: four surfaces, three background jumps, every cold start

| #   | Surface         | Background                 | Foreground                                | Source                                           |
| --- | --------------- | -------------------------- | ----------------------------------------- | ------------------------------------------------ |
| 1   | Native splash   | `#ffffff`, no dark variant | a **full-screen-width pale green square** | `app.json:11-15`                                 |
| 2   | JS boot gate    | `#171717`                  | blue `ActivityIndicator`                  | `app/_layout.tsx:486-492`, `:512`                |
| 3   | `CardList` load | `theme.background`         | a **second** `ActivityIndicator`          | `features/cards/components/CardList.tsx:110-117` |
| 4   | Content         | `theme.background`         | card grid or `EmptyState`                 | —                                                |

In dark mode: white → near-black → true black.

### Root cause of the green square

`assets/splash-icon.png` is **1×1 px**, decoded from its IDAT as **`#00FF00` at alpha `127`** (70 bytes total). `"resizeMode": "contain"` (`app.json:13`) scales the image to _fit_ the screen preserving aspect ratio, so a 1:1 source becomes a square the full width of the display, composited over white to read as pale green.

`git log -L 11,15:app.json` returns exactly one commit — `a0e47f3`, _"Configure Expo project with Expo Router and TypeScript"_, **2025-11-28**. Original scaffolding, never revisited by Epic 12 (design) or Epic 13 (restyle), because **no story has ever owned the launch surface**: there is no FR, NFR, AC, or UX-spec line anywhere in `docs/` that specifies the splash. This story creates that specification.

### Two blockers in the current config

1. **The key is deprecated.** SDK 55 `config/app`: _"The `splash` configuration … is deprecated. Use the `expo-splash-screen` config plugin instead."_
2. **`expo-splash-screen` is not installed** — zero hits in `package.json`, `yarn.lock`, and `node_modules`. So nothing holds the native layer; it lifts the instant the JS bundle mounts. Confirmed by Story 16.10's own note (`16-10-fix-offline-cold-start-hang.md:17`): _"There is no `expo-splash-screen` gating; this spinner **is** the 'loading screen'."_

### Why this cannot be a 300 ms flourish

`isReady = isInitialized && isAuthReady` (`app/_layout.tsx:475`) sits behind `UPDATE_CHECK_TIMEOUT_MS = 5000` (`:283`) and `UPDATE_FETCH_TIMEOUT_MS = 30000` (`:295`) — bounds Stories 16.10/16.12 added so boot can never hang. **Worst case the surface lives ~35 s.** The fast path is much shorter, but note the honest caveat: offline cold-start latency has **never been measured** — Story 16.10 explicitly deferred quantifying it (`16-10-fix-offline-cold-start-hang.md:126`) and `epic-16-retro-2026-07-11.md:66` still lists it as open device debt. Treat "fast path" as _local SQLite + one synchronous SecureStore read_, not as a number.

### The brand constraint this story honours rather than violates

- `docs/ux-design-specification.md:105-107` — _"Performance is Politeness"_ / _"Predictability over Novelty"_ / _"**Silent Reliability:** The app should never 'beg' for attention; it should just be there when needed."_
- `docs/ux-design-specification.md:99` — _"Confidence through Performance: Eliminating 'Loading...' states to prevent user anxiety."_
- `docs/prd.md:38` — _"No loading screens, no waiting for server responses."_

**So this story adds no spectacle.** The defect is _discontinuity_; the fix is _continuity_. Motion appears only as the exit transition, plus a restrained liveness signal on the slow path where NFR-U5 requires one.

### The brand has never rendered in this app

Eight brand SVGs live in `assets/images/` — `app-icon-master.svg`, `app-icon-foreground.svg`, **five** `app-icon-variant-*.svg` (`-aurora`, `-aurora-ios-opaque`, `-aurora-transparent`, `-forest`, `-sunset`), and `android-store-banner.svg` — referenced by **zero lines of application code** (verified: no app code imports any `assets/images/*.svg` outside `brands/`). Today's "brand" is `MaterialIcons name="credit-card"` (`BrandedIcon.tsx:20`) in a 10 %-tinted circle (`:34`, `withAlpha(theme.primary, '1A')`, rendered `:38-44`) — and auth uses a **different** glyph, `card-account-details-outline` (`AppIconHeader.tsx:18`). Three marks, one product.

There is no existing splash/launch/boot component anywhere in `app/`, `shared/`, or `features/` — nothing to extend, no reinvention risk.

---

## AD-16-17-01: adopt the `expo-splash-screen` plugin, hold the native layer, and never let it strand

**Decision.** Install `expo-splash-screen`, delete the legacy `expo.splash` block, and configure the plugin:

**REVISED 2026-07-28** — the snippet below is the shipped shape. It originally read
`"imageWidth": 200`, `"backgroundColor": "#FFFFFF"` and a `"dark"` variant; all three were changed
when AD-16-17-02/03/05 were superseded. Note `app.json` is strict JSON, so the `//` comments here
are illustrative only and must not be copied into it.

```jsonc
[
  "expo-splash-screen",
  {
    "image": "./assets/splash-icon.png", // generated by `yarn splash:build`
    "imageWidth": 260, // MUST equal SPLASH_LOGO_WIDTH
    "backgroundColor": "#1A73E8" // MUST equal LAUNCH_FIELD_COLOR (= PRIMARY_COLORS[500])
    // NO `dark` variant — deliberately. A per-scheme native background is baked at
    // build time and cannot track the user's runtime preference; that mismatch is
    // what produced a ~1.75 s white→black launch inversion on device.
  }
]
```

Append to the `plugins` array, which closes at `app.json:76` (`:75` is the Sentry entry's `]`).

At **module scope** in `app/_layout.tsx` (the docs require this — inside a component it may run after the splash already hid):

```ts
SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ duration: 250, fade: true });
```

**Hide early, not late.** `hideAsync()` fires when the launch surface has _painted_ (its root `onLayout`), **not** when `isReady` flips. The native layer cannot animate, so holding it to readiness would leave nowhere to show the liveness signal AD-16-17-04 requires. Hiding early moves the wait onto a surface we control, and because that surface is pixel-identical (AD-16-17-02) the transfer is invisible.

**Both calls must be unable to strand the splash (non-negotiable).** `preventAutoHideAsync()` and `hideAsync()` both return rejectable promises, and `onLayout` never fires for a zero-size layout. Any of those would leave the native splash up **forever** — a permanent white/black screen, strictly worse than today's flash and a direct regression of the "boot never hangs" guarantee AC10 claims to preserve. Therefore:

- `.catch(() => {})` on both calls — adding a launch surface must not be able to create a new boot failure (same reasoning as `logger.notify`'s guard in Story 16.14).
- A belt-and-braces `setTimeout` (`SPLASH_HIDE_FALLBACK_MS`) that calls `hideAsync()` unconditionally, so a missing `onLayout` cannot strand it. Cleared on unmount.

**`resizeMode` is deliberately not carried over** — `contain` is precisely what stretched the 1×1 pixel. `imageWidth` is the correct mechanism and makes that failure mode structurally impossible.

**Rejected — swap the asset and keep the legacy key.** Fixes the green square only: still a deprecated path, still no dark variant (a white flash on every dark launch), still no `preventAutoHideAsync`, so surfaces 1→2 keep hard-cutting. It addresses one of the four surfaces ifero described.

---

## AD-16-17-02: the mark is the aurora **foreground**, generated from the SVG

> **REVISED 2026-07-28 after device verification** (ifero approved; see
> `docs/sprint-change-proposal-2026-07-28.md`). This AD originally specified the boxed app icon reused
> as a byte-identical copy. That shipped a hard-edged blue square onto the launch field. The paragraphs
> below have been rewritten; the aurora-vs-master comparison and the shared-width-constant reasoning
> are unchanged and were always correct.

**Decision.** The launch mark is **`assets/images/app-icon-variant-aurora-transparent.svg`** — the
aurora artwork with its rounded blue container removed — and `assets/splash-icon.png` is **generated
from it** by `yarn splash:build` (`scripts/build-splash-icon.mjs`), verified in CI by
`yarn splash:check`.

**Why not a copy of the shipped icon raster (the original decision, and why it failed).**
`assets/icon.png` is PNG colour-type **2 — RGB with no alpha** — and its corner pixels are solid
`#1A73E8`. That is correct for an app _icon_: iOS and Android apply the rounded-squircle mask
**themselves** at the icon layer, so the source must paint into the corners. A _splash_ image gets no
such treatment, so the raw icon renders as an unmasked square that reads as a broken placeholder.

Byte-identity was a cheap invariant standing in for the real requirement, which was **visual**
identity — and it silently broke even that: the JS surface renders the SVG, whose root
`<rect rx="230">` _does_ round, so native (square) and JS (rounded) never matched. The handoff would
have popped, worst on Android where `setOptions({ fade })` is a documented no-op.

Masking the icon to a rounded rect fixed the corners but left an icon-in-a-box floating on a page. On a
brand field (AD-16-17-03, revised) the icon's own container would be a box inside a box, so the mark
must be the foreground — which is exactly what the transparent variant exists for.

**On the removed rasterization step.** The original AD counted "no rasterization step" as a benefit,
noting there was no script in `scripts/` and no documented pipeline. That gap is now closed rather than
avoided: `scripts/build-splash-icon.mjs` is a dependency-free signed-distance-field renderer (~1 s for
1024²) for the seven primitives this one SVG uses, with analytic antialiasing and a guard that fails
loudly if the artwork's transcribed geometry changes. It is deliberately **not** a general SVG
renderer. Dependency-free because the repo has no image library and no rasteriser — `sharp`,
`rsvg-convert`, ImageMagick and pyobjc are all absent, and Chrome is not installed for Playwright.

**Why aurora and not `app-icon-master.svg`.** The shipped app icon is aurora — `assets/icon.png` is byte-identical to `assets/app-icons/variants/aurora/expo/icon-1024.png` (both `sha256 3301a40b…`, 180 505 bytes). Master is a **different drawing**:

| Property        | `app-icon-master.svg`         | `app-icon-variant-aurora.svg`             |
| --------------- | ----------------------------- | ----------------------------------------- |
| bg gradient     | 2 stops `#1A73E8`→`#0D47A1`   | **3 stops** `#1A73E8`→`#1765D2`→`#0E4AA8` |
| squircle radius | `rx="228"`                    | `rx="230"`                                |
| wallet rect     | `246,300 532×392 rx94`        | `244,304 536×396 rx96`                    |
| wallet gradient | `#FFFFFF`@.98 → `#E9F1FF`@.95 | opaque `#FFFFFF` → `#EAF2FF`              |
| stroke          | `#C9DCFF`                     | `#C7DBFF`                                 |

Using master would give the splash a different gradient ramp, corner radius and highlight placement than the icon the user just tapped — in a story whose entire thesis is visual continuity. Aurora remains the mark; only which _layer_ of it is used changed (foreground rather than the full boxed icon).

**Why one shared width constant is load-bearing, not tidy.** `SplashScreenOptions.fade` is documented **iOS-only**; `duration` is cross-platform. So on Android the native layer disappears in a **hard cut** with no cross-fade to forgive misalignment. Pixel-identity between the native PNG and the JS-rendered SVG is therefore **the only mechanism concealing the handoff on Android** — a few points of drift converts an invisible transition into a visible flicker, i.e. worse than today. Hence:

```ts
// shared/components/launch/constants.ts
/** Logo edge length in points, square. MUST equal app.json's expo-splash-screen `imageWidth`. */
export const SPLASH_LOGO_WIDTH = 260;
```

Both surfaces: centred on both axes, **`width` AND `height` both set to `SPLASH_LOGO_WIDTH`** (the source `viewBox` is `0 0 1024 1024`, square — setting width alone invites a flex-driven height and breaks the identity this AD calls load-bearing), on the single brand field per AD-16-17-03.

260 rather than Expo's 200 default because the foreground occupies less of its own frame than the boxed
icon did.

**The field is the brand colour, not the theme background — REVERSED 2026-07-28.** The original text
here read: _"a blue field would reintroduce the flash this story deletes, merely a tasteful one."_ On
device the opposite proved true. A theme-aware field produced a measured **white→black inversion of
~1.75 s** on every cold start for a user whose persisted preference differs from their system scheme,
and that is unfixable while the field is theme-aware at all — the native background is baked at build
time from `userInterfaceStyle: "automatic"` and can never read a runtime preference. The brand colour
is the only scheme-independent field that is neither white nor black, so it removes the mismatch by
construction. The one remaining luminance step, brand → content, happens inside the designed 250 ms
cross-fade. See AD-16-17-05 (superseded) for the full analysis.

**Filter-fidelity risk, scoped precisely.** Aurora uses `<filter id="shadow">` + `feDropShadow` (`:12-14`) applied via `<g filter="url(#shadow)">` (`:21`). `react-native-svg@15.15.3` does ship `FeDropShadow`, but its native rendering need not match whatever rasterized the PNG. **This risk does not touch the handoff**, because the filter region (`x=190 y=190 w=650 h=620`) is entirely _interior_ to the squircle, while the silhouette — the `<rect rx="230">` at `:17` whose edge alignment actually governs the transition — carries **no filter**. So a shadow mismatch would be a subtle interior difference, not an edge flicker. Verify on device; if visibly different, flatten the shadow out of the JS mark so both agree.

---

## AD-16-17-03: retire the hardcoded `#171717` — and make the launch **field** scheme-independent

> **REVISED 2026-07-28.** The `'#171717'` retirement and the Unistyles-is-engine-level reasoning below
> are unchanged and still load-bearing — they are what let the **`dbError` branch** read theme tokens
> before `ThemeProvider` mounts. What changed is the _launch field_: it is no longer theme-derived.

**Decision.** `'#171717'` is deleted from source. The `dbError` branch derives its colours from theme
tokens. The **launch field** is one scheme-independent brand colour, `LAUNCH_FIELD_COLOR`
(= `PRIMARY_COLORS[500]`), identical in the native and JS layers — so `AppLaunchScreen` reads no colour
scheme at all.

**Why this works before `ThemeProvider` mounts.** Both the `dbError` and `!isReady` branches return before `ThemeProvider` (`app/_layout.tsx:494-498`), so `useTheme()` would throw (`ThemeProvider.tsx:112-118`, throw at `:115`) — hence today's hardcoded hex. But **Unistyles is engine-level, not context-level**: the side-effect import at `app/_layout.tsx:2` runs `StyleSheet.configure` at module-evaluation time (`shared/theme/unistyles.ts:110`). The existing pre-gate styles already prove it works there (`:501-523` _is_ a Unistyles `StyleSheet.create`) — they simply pass literals instead of reading `theme`. Themed styles work; only the React **context** is unavailable.

`'#171717'` appears in exactly one **source** file (`app/_layout.tsx:512`) and is not a design token — absent from `NEUTRAL_COLORS` and from both theme maps, and matching neither `#FFFFFF` nor `#000000`. Story 13.10 corrected the spinner's colour to a mode-independent token but left this background; it is unowned debt and this story closes it. (It also appears in two **documentation** files — `16-1-migrate-nativewind-to-unistyles.md:195` and this story's own tracker entry — which are historical records and explicitly out of scope. AC3 is scoped to source accordingly.)

**`styles.fullscreen` end state (it is shared by both branches — `:479` and `:488`).** `fullscreen` **survives**, owned by the `dbError` branch only, with `backgroundColor` moved to the theme background. `AppLaunchScreen` owns its own styles and does not reuse it. `errorTitle` (`:517`) and `errorBody` (`:521`) move to theme tokens.

**Do not touch the `{dbError}` binding.** `:481` renders the state variable `{dbError}`, set at `:413` to `t('common.errors.initializationFailed')`. "Cleaning this up" to a direct `t(...)` at the render site breaks `test/root-layout.initialization-error.test.tsx:112-118` (the Italian non-`Error` case), which depends on the value flowing through state.

---

## AD-16-17-05 — ⛔ SUPERSEDED 2026-07-28: the resolver split is real, but following the system scheme was the wrong resolution

> **This AD's ANALYSIS was correct and is kept verbatim below — it is the reason the shipped fix is
> shaped the way it is. Its DECISION was wrong and is not what ships.** Superseded by AD-16-17-02/03
> (revised): the launch field is one scheme-independent brand colour, so there is no resolver split left
> to arbitrate and `AppLaunchScreen` reads no colour scheme at all. See
> `docs/sprint-change-proposal-2026-07-28.md`.
>
> **Why the decision failed.** Making the JS surface follow the **system** scheme does remove the
> _native↔JS_ mismatch — but it creates a _launch↔app_ mismatch, and that one is far worse because it
> lasts the entire launch instead of one frame. Measured on iPhone 17 Pro / iOS 26.4 with
> `system = light` and the app's persisted preference `= dark`, sampling field luminance every 250 ms:
> `255, 255, 255, 255, 255, 255, 255 → 0`. That is **~1.75 s of white followed by black content, on
> every cold start**, and a 250 ms cross-fade does not rescue a full-screen inversion.
>
> **And no theme-aware field could have avoided it.** The native splash background is baked at build
> time from `userInterfaceStyle: "automatic"`, so it can never read a runtime preference. Any
> theme-aware launch field must therefore disagree with _either_ the native layer _or_ the app. The
> "Consequence for AC3, stated honestly" paragraph below named this trade explicitly and accepted it;
> that acceptance is what this supersession reverses.

**This was the subtlest correctness issue in the story.**

**The problem.** The two layers resolve their scheme from **different sources**:

- **Native splash** — `app.json:9` is `"userInterfaceStyle": "automatic"`, so the OS picks light/dark from the **system** appearance.
- **Unistyles** — `adaptiveThemes: false` (`unistyles.ts:115`) with `initialTheme: resolveInitialTheme` (`:116`), which reads the **user's persisted preference** via `getThemePreference()` → `Storage.getItemSync(KEYS.THEME_PREFERENCE)` (`core/settings/settings-repository.ts:75`), falling back to `Appearance.getColorScheme()` only when unset.

For any user who has **explicitly forced light mode on a dark-mode device** (or the reverse), the native layer paints `#000000` while a preference-driven JS surface would paint `#FFFFFF` — a **black→white hard cut on Android**, exactly the failure AD-16-17-02 says pixel-identity exists to prevent.

**Decision — ⛔ DO NOT IMPLEMENT; superseded, kept only as the record of what was tried.** The launch surface's background follows the **system** scheme, matching the native layer — not the persisted preference. Read it directly (`useColorScheme()` from `react-native`, or `Appearance.getColorScheme()`) and select `LIGHT_THEME_COLORS.background` / `DARK_THEME_COLORS.background`. The user's explicit override takes effect at the **cross-fade into content**, which is already a designed 250 ms transition and the correct place for a scheme change to become visible.

**Consequence for AC3, stated honestly — ⛔ this is the accepted trade that the supersession above REVERSES; AC3 no longer reads this way:** every frame from process start _through the cross-fade_ is backed by the **system** scheme's background. A forced-preference user sees their chosen scheme arrive with the cross-fade rather than at frame one. That is a deliberate trade: one soft, designed transition instead of one hard, undesigned cut.

---

## AD-16-17-04: progressive disclosure — silent on the fast path, breathing on the slow path

**Ratified by ifero (roundtable, 2026-07-28)**, chosen over a fully silent surface.

**The conflict.** The brand forbids loading screens (above), but **NFR-U5** (`docs/prd.md:1055`) requires _"Loading indicators must be present for all operations exceeding 500ms"_. A motionless logo held through a 30 s OTA fetch reads as a hung app.

**These are sequenced, not contradictory** — NFR-P2's ≤1 s cold-start budget governs the common case; NFR-U5 governs the tail.

**Decision.** Static mark until `BREATH_DELAY_MS`; then a **breathing opacity on the mark itself** fades in and loops until ready; then a cross-fade to content. `BREATH_DELAY_MS` is **600**, above NFR-U5's 500 floor, because 500 would flash the affordance on and off for users landing in the 500–700 ms band — a blink reads as a glitch, not information. Once revealed the breath **never stops before ready**, and it fades _in_ rather than popping.

**Why a breathing mark and not a third spinner.** Two `ActivityIndicator`s are already half of what ifero called "terrible". Animating the opacity of the **existing** mark adds no new element — the same single surface, alive. A spinner says _"I am busy"_; a slow breath says _"I'm here."_

**Why opacity on a wrapper, not on SVG props.** The Reanimated mock (`jest.setup.js:248-300`) provides `useSharedValue` (`:282`), `useAnimatedStyle` (`:283`, **returns `{}`**), `withTiming` (`:284`), `withDelay` (`:288`), `withRepeat` (`:289`), `withSpring` (`:290`), `cancelAnimation` (`:291`), `useReducedMotion` (`:292`), `runOnJS` (`:293`), `Easing` (`:294`), `FadeIn`/`FadeOut` (`:266-273`) — but **not** `interpolate`, `interpolateColor`, `withSequence`, or `Animated.createAnimatedComponent` (the last being what animating SVG attributes would need). Animating a wrapping `Animated.View`'s opacity needs **zero mock extensions**, so this design cannot silently rot as the mock drifts. It is also the house idiom — structurally `SyncIndicator.tsx:47-51`.

**Reduced motion is mandatory.** Per `docs/ux-designs/4-1-welcome-screen-design.md:223-226`: _"When reduced motion is on, all elements appear immediately without animation."_ With `useReducedMotion()` true: no breath (static mark, full opacity) **and** no cross-fade (instant swap). Guard shape from `SyncIndicator.tsx:21,40,45-56` — currently the codebase's **only** reduced-motion guard.

---

## Interaction & Motion Spec (satisfies DoR gate 3)

> Gate 3 requires that for animated screens _"interaction behavior is documented — not just the static visual."_ This section is that documentation, and **ifero approves it inline by approving this story.**
>
> **REVISED 2026-07-28** to match the shipped design after device verification reversed AD-16-17-02/03/05 (see `docs/sprint-change-proposal-2026-07-28.md`). The launch field is now ONE scheme-independent brand colour and the mark is the aurora **foreground**; nothing in the launch reads a colour scheme. A QA review caught these tables still describing the superseded design after the ADs and ACs had been amended — they are the compact reference a future reader reaches for first, so leaving them stale was the likeliest way to get the defect reintroduced on purpose.

### States

| State       | Trigger                                                  | Visual                                                                                                               | Motion                                                                                                                                                                                         |
| ----------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `native`    | process start                                            | foreground mark, centred, `SPLASH_LOGO_WIDTH` square, on `LAUNCH_FIELD_COLOR` — one brand colour, no scheme variants | none (OS layer)                                                                                                                                                                                |
| `handoff`   | launch surface painted (root `onLayout`) → `hideAsync()` | identical to `native`                                                                                                | **iOS:** 250 ms fade. **Android:** `duration` is honoured but `fade` is not, so the layer is removed without a cross-fade — concealed solely by identical size **and** identical field colour. |
| `quiet`     | 0 → `BREATH_DELAY_MS`                                    | static mark                                                                                                          | none                                                                                                                                                                                           |
| `breathing` | ≥ `BREATH_DELAY_MS` and `!isReady`                       | same mark, oscillating opacity                                                                                       | fade in `BREATH_FADE_IN_MS`, then `1.0 ⇄ BREATH_MIN_OPACITY`, `BREATH_DURATION_MS` per direction, `Easing.inOut(Easing.ease)`, reversing, until ready                                          |
| `error`     | `dbError` set                                            | themed title + body, `{dbError}` binding untouched                                                                   | none                                                                                                                                                                                           |
| `exit`      | `isReady`                                                | cross-fade to content                                                                                                | `EXIT_FADE_MS` (skipped under reduced motion)                                                                                                                                                  |

### Constants — **all eight live in `shared/components/launch/constants.ts`**

| Constant                  | Value                 | Rationale                                                                                                                                                                                                                                |
| ------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LAUNCH_FIELD_COLOR`      | `PRIMARY_COLORS[500]` | **Added 2026-07-28.** The whole launch field, scheme-independent by design — a theme-aware field cannot match the native splash, whose background is build-time. Token-derived, not hardcoded; must equal the plugin's `backgroundColor` |
| `SPLASH_LOGO_WIDTH`       | `260`                 | **Revised 2026-07-28 from 200** (Expo's `imageWidth` default): the foreground fills less of its own frame than the boxed icon did. Must equal the plugin value; applied to **both** width and height                                     |
| `BREATH_DELAY_MS`         | `600`                 | above NFR-U5's 500 floor; avoids blinking the 500–700 ms band                                                                                                                                                                            |
| `BREATH_FADE_IN_MS`       | `200`                 | appear gently, never pop                                                                                                                                                                                                                 |
| `BREATH_DURATION_MS`      | `900`                 | per direction; ~1.8 s cycle — calm, not urgent                                                                                                                                                                                           |
| `BREATH_MIN_OPACITY`      | `0.55`                | perceptible at a glance without reading as a flicker                                                                                                                                                                                     |
| `EXIT_FADE_MS`            | `250`                 | matches `setOptions.duration` for one consistent feel                                                                                                                                                                                    |
| `SPLASH_HIDE_FALLBACK_MS` | `2000`                | AD-16-17-01 safety net — `hideAsync()` fires even if `onLayout` never does                                                                                                                                                               |

### Edge cases (satisfies DoR gate 5)

| Case                                               | Behaviour                                                                                                                                                                                                                                                                                                                         |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dark system scheme**                             | Irrelevant to the launch by design: both layers paint `LAUNCH_FIELD_COLOR`. No white flash, and no `dark` plugin variant exists to get wrong.                                                                                                                                                                                     |
| **Light system scheme**                            | Identical to the dark case — one field colour, no scheme branch anywhere in the launch.                                                                                                                                                                                                                                           |
| **Forced preference ≠ system scheme**              | **The row that caused the reversal.** Originally: "launch surface follows **system** (AD-16-17-05)". On device that gave ~1.75 s of white then black content, every cold start. Now: the field is scheme-independent, so this case is indistinguishable from any other and the user's theme first appears in the exit cross-fade. |
| **Reduced motion**                                 | No breath, no cross-fade. Static mark; instant swap.                                                                                                                                                                                                                                                                              |
| **Offline cold start**                             | Typically `quiet` only — no breath (`Updates.isEnabled` false, or the check fails fast).                                                                                                                                                                                                                                          |
| **~35 s OTA worst case**                           | `breathing` from 600 ms to ready, uninterrupted.                                                                                                                                                                                                                                                                                  |
| **`hideAsync()` rejects / `onLayout` never fires** | `SPLASH_HIDE_FALLBACK_MS` timer hides it anyway. Boot never strands.                                                                                                                                                                                                                                                              |
| **`Updates.reloadAsync()` fires**                  | Runtime tears down; sequence restarts from `native`. Unchanged, acceptable.                                                                                                                                                                                                                                                       |
| **DB init failure**                                | `error` state — themed, same strings, raw error still suppressed.                                                                                                                                                                                                                                                                 |
| **Dynamic Type at accessibility sizes**            | The mark is a fixed-size image and the surface has no text; unaffected.                                                                                                                                                                                                                                                           |
| **Landscape / tablet**                             | `app.json:6` pins `"orientation": "portrait"`; with `supportsTablet: true` the mark stays centred and fixed-size.                                                                                                                                                                                                                 |
| **Screen reader**                                  | Mark is decorative: **both** `accessibilityElementsHidden` and `importantForAccessibility="no-hide-descendants"` (per `FannedCardIllustration.tsx:18-19`). The root carries one i18n `accessibilityLabel`.                                                                                                                        |

---

## Acceptance Criteria

1. **The stretched placeholder is gone.** `assets/splash-icon.png` is **generated** by `yarn splash:build` from `assets/images/app-icon-variant-aurora-transparent.svg` (1024² RGBA); no 1×1 asset remains referenced by any config. `yarn splash:check` fails if the raster drifts from the SVG, in pre-push and CI.
2. **Config migrated (AD-16-17-01).** The legacy `expo.splash` block is removed; `expo-splash-screen` is installed and configured as a plugin with `image`, `imageWidth`, and a brand `backgroundColor` — and **no `dark` variant**, which is the point rather than an omission (a per-scheme native background cannot track a runtime preference). Prebuild / `expo-doctor` report no splash warnings.
3. **No luminance change during launch (AD-16-17-03).** The launch field is one scheme-independent brand colour in **both** layers, so **no frame** from process start through the cross-fade changes background — including for a user whose persisted theme preference differs from their system scheme, which is the case that previously inverted white→black. `AppLaunchScreen` reads no colour scheme. The string `'#171717'` no longer appears in any source file under `app/`, `shared/`, `features/`, or `core/` (documentation and historical story records are out of scope).
4. **The handoff is invisible (AD-16-17-02).** Native and JS marks are the same artwork, both `SPLASH_LOGO_WIDTH` square, both centred, on the **same single field colour** — agreement no longer depends on two scheme resolvers reaching the same answer. `SPLASH_LOGO_WIDTH` is declared once and consumed by both the plugin config and the component; `app.json` is strict JSON and cannot carry the reciprocal comment, so `constants.test.ts` asserts the equality instead. **Explicitly verified on Android**, where no native fade exists.
5. **The splash cannot strand (AD-16-17-01).** `preventAutoHideAsync()` and `hideAsync()` both have `.catch()`; `hideAsync()` fires on the surface's `onLayout` **and** unconditionally via `SPLASH_HIDE_FALLBACK_MS`. A rejected promise or a missing `onLayout` cannot leave the native splash up. **Test-proven.**
6. **The mark is aurora, the shipped icon's artwork.** `assets/images/app-icon-variant-aurora-transparent.svg` — the aurora **foreground**, without the icon's own container — is imported as a React component via the existing `react-native-svg-transformer` pipeline: the app's first runtime render of its own logo.
7. **Progressive disclosure (AD-16-17-04).** No motion before `BREATH_DELAY_MS`. At/after it with `!isReady`, the breath fades in and loops until ready — never stopping early, never blinking.
8. **Splash artwork is a foreground, not the app icon.** `assets/splash-icon.png` carries an **alpha channel** (PNG colour-type 6) while `assets/icon.png` is opaque (colour-type 2) — asserted, because that split is what catches a `cp assets/icon.png assets/splash-icon.png` re-introducing the unmasked square. Byte-identity with the icon is now **deliberately false**: continuity comes from shared _artwork_ (both are aurora), enforced by `yarn splash:check` regenerating the raster from the SVG and comparing hashes.
9. **Reduced motion respected.** With `useReducedMotion()` true: no breath, no cross-fade, static mark at full opacity, instant swap.
10. **Boot semantics unchanged.** `isReady` composition untouched; both OTA budgets untouched; the `dbError` path still renders the error branch with the `{dbError}` state binding intact; Story 16.14's `logger.notify` sites and `otaFailureKind` tags untouched. **Stories 16.10, 16.12 and 16.14 keep their guarantees.**
11. **`testID="boot-loading"` preserved on the gating element.** All **nine** existing assertions in `test/root-layout.offline-boot.test.tsx` (lines 147, 158, 197, 206, 216, 247, 281, 309, 361) pass unmodified. Renaming it is forbidden — it would silently void the offline-boot regression suite.
12. **Tests + gates.** New unit tests for the launch surface (the brand field, **and the absence of any scheme dependency**; reduced motion both ways; breath delay under fake timers; the AC5 strand guards). `yarn lint`, `yarn typecheck`, `yarn test`, `yarn test:coverage` pass with the 80 % global gate held — the component lands in `shared/**`, which **is** coverage-measured.
13. **Release-build verification.** Because Expo's docs state the splash does not render faithfully in Expo Go or a dev build, AC1–AC5 are verified on a **release build**, iOS and Android, light and dark. Concretely: `npx expo prebuild --clean` then a release build via the existing Fastlane/EAS lanes used by `beta-releases.yml`. Evidence: four screenshots attached to the PR. **A green CI run does not satisfy this AC.**

## Tasks / Subtasks

- [x] (AC 2) `npx expo install expo-splash-screen`; append the plugin block to `app.json` `plugins` (closes at `:76`); delete the legacy `expo.splash` block (`:11-15`).
- [x] (AC 1, 8) `cp assets/app-icons/variants/aurora/expo/icon-1024.png assets/splash-icon.png`; confirm `shasum -a 256` matches `assets/icon.png`.
- [x] (AC 4, 7) Create `shared/components/launch/constants.ts` with all seven constants from the spec table, cross-referencing `app.json`'s `imageWidth`.
- [x] (AC 3, 6, 7, 9) Build `shared/components/launch/AppLaunchScreen.tsx`: background = `LAUNCH_FIELD_COLOR`, one brand colour with **no colour-scheme read at all** (revised 2026-07-28 — this line originally specified the **system** scheme per the now-superseded AD-16-17-05, and neither `useColorScheme` nor `resolveInitialTheme` is used); `app-icon-variant-aurora-transparent.svg` — the **foreground**, not the boxed icon — as a component at `width` **and** `height` `= SPLASH_LOGO_WIDTH`; breath after `BREATH_DELAY_MS` gated on `useReducedMotion()`; `cancelAnimation` on unmount; `accessibilityElementsHidden` + `importantForAccessibility="no-hide-descendants"` on the mark; i18n `accessibilityLabel` on the root; an `onLayout` callback prop for the hide signal.
- [x] (AC 5) In `app/_layout.tsx` module scope: `preventAutoHideAsync().catch(() => {})` and `setOptions({ duration: 250, fade: true })`. Wire `hideAsync().catch(() => {})` to the surface's `onLayout` **and** to a `SPLASH_HIDE_FALLBACK_MS` timer cleared on unmount.
- [x] (AC 3, 10, 11) Replace the `!isReady` branch body with `<AppLaunchScreen>` **keeping `testID="boot-loading"` on the outer element**. Restyle the `dbError` branch onto theme tokens, keeping `styles.fullscreen` for that branch only with a themed background; delete the `'#171717'` literal. **Do not alter the `{dbError}` binding at `:481`.**
- [x] (AC 7, 9) Add the cross-fade to content, skipped under reduced motion.
- [ ] (AC 6) Verify the aurora drop shadow (`<filter id="shadow">`, `:12-14`, `:21`) renders acceptably on both platforms. If it visibly differs from the PNG, flatten it from the JS mark so both agree. Note the silhouette (`<rect rx="230">`, `:17`) is filter-free, so handoff alignment is unaffected either way.
- [x] (AC 12) i18n — add to **both** locale files by hand (no key-parity test exists, so a missing key fails silently):
  - `en.ts` → `common.launch.accessibilityLabel: 'myLoyaltyCards, starting up'`
  - `it.ts` → `common.launch.accessibilityLabel: 'myLoyaltyCards, avvio in corso'`
- [x] (AC 12) `shared/components/launch/AppLaunchScreen.test.tsx` — see Test Plan. **Read the mock warning there before writing the reduced-motion test.**
- [x] (AC 10, 11) Run all three root-layout suites unmodified. If `AppLaunchScreen` is reached through `@/shared/theme`, the wholesale `@/shared/theme` mock must be extended in **all three** files (`root-layout.offline-boot.test.tsx:95-101`, `root-layout.initialization-error.test.tsx:76-89`, `root-layout.welcome-gate.test.tsx:84-95`) — **prefer importing from `@/shared/theme/colors` or `react-native` directly to avoid this entirely.**
- [x] (AC 12) `yarn lint` / `typecheck` / `test` / `test:coverage` from the **main checkout**.
- [ ] (AC 13) `npx expo prebuild --clean`; release build both platforms; capture four screenshots (iOS light/dark, Android light/dark); attach to the PR.

## Dev Notes

### References

- `app.json:6` orientation portrait · `:9` `userInterfaceStyle: automatic` (**the native scheme source — see AD-16-17-05**) · `:11-15` the legacy block to delete · `:13` the `contain` that stretched the pixel · `:76` where `plugins` closes · `:87-89` `runtimeVersion.policy: appVersion`.
- `app/_layout.tsx:2` the Unistyles side-effect import · `:42` `initSentry()` (module-scope precedent) · `:283`/`:295` OTA budgets · `:413` where `dbError` is set · `:475` `isReady` · `:479` `dbError` uses `styles.fullscreen` · `:481` the `{dbError}` binding · `:486-492` the branch to replace · `:488` the `boot-loading` testID · `:494-498` the `ThemeProvider` return · `:501-523` the Unistyles `StyleSheet.create` · `:512` the `'#171717'` · `:517`/`:521` error colours.
- `shared/theme/unistyles.ts:110` `StyleSheet.configure` · `:115` `adaptiveThemes: false` · `:116` `initialTheme` · `:102-108` `resolveInitialTheme` (preference-driven; **the launch surface reads no scheme at all** — neither this nor `useColorScheme`. It still governs the `dbError` branch's theme tokens).
- `core/settings/settings-repository.ts:75` `getThemePreference()` → `Storage.getItemSync` — the persisted preference AD-16-17-05 bypasses.
- `shared/theme/ThemeProvider.tsx:112-118` `useTheme()` throws outside the provider (throw at `:115`) — **do not call it here**. `:71` is the real `UnistylesRuntime.setTheme` call site.
- `shared/theme/tokens.generated.ts` — **generated, do not edit** (`yarn tokens:build`, guarded by `yarn tokens:check` in CI and pre-push). `LIGHT_THEME_COLORS.background = '#FFFFFF'`; `DARK_THEME_COLORS.background = '#000000'`; `PRIMARY_COLORS[500] = '#1A73E8'`.
- `shared/components/SyncIndicator.tsx:21,40,45-56` — the canonical `useReducedMotion()` + `withRepeat` + `cancelAnimation` idiom. Copy this shape.
- `features/add-card/components/ScannerOverlay.tsx:154` — the `Easing.inOut(Easing.ease)` precedent.
- `features/cards/utils/brandLogos.ts:5` + `svg.d.ts:5-10` — SVG-as-component import and its typing (`React.FC<SvgProps>`).
- `features/cards/components/EmptyState.tsx:26-50` — inline `react-native-svg` taking `primary` as a **prop** rather than via context: the pattern for theming vector art without `useTheme()`.
- `features/onboarding/components/FannedCardIllustration.tsx:18-19` — decorative-art a11y, both props.
- `jest.setup.js:248-300` — the Reanimated mock; present/absent inventory in AD-16-17-04.
- `jest.config.js:15` `\.svg$` → `__mocks__/svgMock.js`, which renders a `View` with `testID: props.testID || 'svg-mock'` (`svgMock.js:9-10`) — **the testID is overridable**, so pass your own to the mark.
- `eslint.config.mjs:89-92` — the `shared` → `['core','catalogue','shared']` boundary (why AD-16-17-04's scope argument holds). `:195-196` — `files: ['app/**/*.tsx']` with `ignores` exempting `app/**/_layout.tsx` **and** `**/*.test.tsx`/`**/*.spec.tsx`; the rule is `no-restricted-imports` on exactly four names (`useState`, `useEffect`, `useCallback`, `useMemo`) from `'react'` — so `_layout.tsx` may legitimately hold this logic. The component still belongs in `shared/` for the coverage reason below.
- `.gitignore:52-53` — `android/` then `ios/`; CNG regenerates them at prebuild, so no committed native edits.
- Expo SDK 55 — `config/app` (the `splash` deprecation), `sdk/splash-screen` (`preventAutoHideAsync` must be module-scope; `SplashScreenOptions.duration` default 400, cross-platform; **`fade` iOS-only**; plugin props; and the SDK 52+ warning that Expo Go and dev builds do not faithfully reproduce the splash).
- Prior boot stories whose guarantees must survive: `16-10-fix-offline-cold-start-hang.md` (`:17` no splash gating; `:126` cold-start latency deliberately unquantified), `16-12-bound-ota-update-download-boot.md`, `16-14-observe-ota-update-failures.md` (AC3 non-fatal).

### Coverage note

`jest.config.js:22-32` `collectCoverageFrom` lists `features/**` (`:23`), `core/**` (`:24`), `shared/**/*.{ts,tsx}` (`:25`); **`app/**`is absent by omission** — there is no`!app/**`negation to find. Threshold is 80 % global at`:33-40`, no per-path override. So `app/\_layout.tsx`edits are unmeasured while`shared/components/launch/**`**is** measured — budget real unit tests. Placing the component in`shared/` is a deliberate trade: measured coverage plus isolated testability, in exchange for having to earn it.

`shared/components/launch/` is outside Storybook's glob (`.storybook/main.ts:8` is `shared/components/ui/**` only). **Do not add a story** — not because it would break the count (`stories.test.tsx:76`'s `toHaveLength(7)` is fed by a hand-written map at `:38-46` from static imports at `:4-10`, with no filesystem scan, so a new file would not trip it) but because it is out of scope. Reviewer artifact is screenshots, per `docs/design/CONTRIBUTING-DESIGN.md:144-153`.

### Test Plan

- **Rendering:** paints `LAUNCH_FIELD_COLOR`, and does so with **no scheme dependency** — mock `useColorScheme`, drive it to both values, and assert it was never called (revised 2026-07-28: this bullet originally said "mounts in both system schemes", which was the strategy for the superseded scheme-aware design). Also: the field equals neither theme background; a11y props present on the mark and the mark unreachable from an a11y-respecting query; the i18n label on the root; `svgMock` renders with the testID you pass it.
- **Breath timing:** `jest.useFakeTimers()`. Advance 599 ms → no animation started; advance past 600 ms → started. Because the mock's `useAnimatedStyle` returns `{}`, assert on the **call** to `withRepeat`/`withTiming` (spy) or on rendered state — **never** on a computed opacity value.
- **⚠️ Reduced motion — there is no existing precedent, and the obvious approach is a trap.** `useReducedMotion` appears in only three places repo-wide: `jest.setup.js:292` (global `() => false`), `SyncIndicator.tsx:21` and `:40`. **No test in this repo overrides it to `true`.** The three existing local Reanimated overrides (`ScannerOverlay.test.tsx:44-68`, `BrandScannerScreen.test.tsx:55-80`, `MultiCodePickerSheet.test.tsx:35-56`) are **full module replacements**, not spreads over the global mock — copying one wholesale silently drops `useSharedValue`/`withTiming`/`cancelAnimation` and produces baffling failures. Either spread the real module and override only `useReducedMotion`, or replace it fully and include **every** member this component touches. Verify the guard is load-bearing by flipping it and watching the test fail.
- **Strand guards (AC5):** make `hideAsync` reject → no unhandled rejection, boot proceeds. Never fire `onLayout` → advance past `SPLASH_HIDE_FALLBACK_MS` → `hideAsync` still called.
- **Regression, unmodified:** all three root-layout suites. `offline-boot` runs on fake timers with `advanceTimersByTimeAsync` values **10000** (`:152`), **100** (`:181`), **29000** (`:204`), **2000** (`:214`), **100** (`:244`), **100** (`:273`), **100** (`:299`), **20000** (`:330`), **6000** (`:336`), **100** (`:355`). Note the five **100 ms** advances are _below_ `BREATH_DELAY_MS` and are the ones asserting `boot-loading` is gone — the breath must not interfere. `withRepeat: (value) => value` in the mock makes it inert, which is exactly why this design is mock-safe.
- **Manual, release build only (AC13):** iOS light/dark, Android light/dark. Watch specifically for a flicker at the native→JS handoff on **Android**, where there is no fade.

### Regressions to preserve

`isReady` composition and both OTA budgets unchanged; the `dbError` branch still renders `databaseErrorTitle` + `initializationFailed` through the `{dbError}` state binding and still hides the raw error (`root-layout.initialization-error.test.tsx:105-109`, Italian case `:112-118`); the welcome gate still never bounces a signed-in user; `logger.notify` + `otaFailureKind` untouched (16.14); `testID="boot-loading"` retained (AC11); `getAllCards` / watch-push sequencing unchanged; `yarn tokens:check` green (no token edits here).

### Project Structure Notes

**New:** `shared/components/launch/AppLaunchScreen.tsx`, `constants.ts`, `AppLaunchScreen.test.tsx`. **Modified:** `app.json`, `app/_layout.tsx`, `assets/splash-icon.png`, `shared/i18n/locales/en.ts`, `shared/i18n/locales/it.ts`, `package.json`, `yarn.lock`. Tests co-located beside the subject (no `__tests__` folders — CI-enforced); the root-layout suites stay in top-level `test/`. `shared/` may not import from `features/` (`eslint.config.mjs:89-92`); this component has no feature dependency.

### Definition of Ready — all 7 gates

- [x] **1 · Design Approved** — the Interaction & Motion Spec is in this story. The repo is canonical for design and Figma is ideation-only (`docs/design/CONTRIBUTING-DESIGN.md:14-26`); no splash frame exists in any tool, and Penpot (Story 16.6) is backlog and trigger-gated, so this story is deliberately **not** gated on it. **ifero approves inline** (chosen over the 14.5a and 6.17 design-story patterns at the 2026-07-28 roundtable).
- [x] **2 · Story Spec Final** — created via create-story with party-mode refinement; 13 numbered testable ACs.
- [x] **3 · Interaction Spec** — required because this screen animates. State table, named constants, and edge cases above.
- [x] **4 · Dependencies Clear** — none blocking. `expo-splash-screen` is a new dependency (AD-16-17-01).
- [x] **5 · Edge Cases Defined** — dark/light, forced-preference mismatch, reduced motion, offline, the 35 s OTA tail, splash-strand failure, DB-init failure, `reloadAsync`, Dynamic Type, landscape/tablet, screen reader.
- [x] **6 · Tech Notes** — `fade` iOS-only; native build not OTA; the two-resolver split (AD-16-17-05); Reanimated mock gaps and the reduced-motion mock trap; `useTheme()` throws pre-provider; `shared/**` is coverage-measured; release-build-only verification.
- [x] **7 · Testability** — `testID="boot-loading"` preserved with all nine assertion lines named; fake-timer approach with the `useAnimatedStyle: () => ({})` caveat; strand-guard tests; four named manual screenshots.

### Open decisions — **binding defaults; implement as written**

1. `BREATH_DELAY_MS = 600` (not NFR-U5's literal 500 — see AD-16-17-04).
2. **Mark only, no text.** The repo's sole tagline, _"All your loyalty cards, one wallet."_, exists only in `android-store-banner.svg:20-21`; adding it means new i18n keys and small-screen layout risk. (ifero chose mark-only at the roundtable.)
3. `SPLASH_LOGO_WIDTH = 260` (**revised 2026-07-28** from 200: the foreground fills less of its own frame than the boxed icon did). Changed in `constants.ts` **and** `app.json` together — never one alone.
4. `BREATH_MIN_OPACITY = 0.55`.
5. **Aurora is the mark** — **revised 2026-07-28** to `app-icon-variant-aurora-transparent.svg`, the aurora _foreground_, since the field is now the brand colour and the boxed variant would be a box inside a box. Still aurora, matching the shipped icon (AD-16-17-02); `forest` and `sunset` are not in play, and `app-icon-master.svg` is explicitly **not** the shipped artwork.

### Out of scope — accepted follow-ups

- **`CardList`'s stage-3 spinner remains.** `useCards.ts:37` initialises `isLoading = true`, flipped after a `getAllCards()` mount effect, so `CardList.tsx:110-117` shows a second spinner after the launch surface exits. Not fixed here because gating the launch surface on a feature module's loading state would couple boot to `features/cards`, which `eslint.config.mjs:89-92` forbids and which needs a dependency inversion — an architecture change in polish clothing. This story still improves it: the jump becomes theme-background → theme-background (a spinner appearing) rather than `#171717` → `#FFFFFF` (a jolt). **Own story.**
- **No motion tokens exist.** Every duration in the app is inline (`SyncIndicator` 1200, `ScannerOverlay` 2000, three banners at 300). This story uses file-local constants; `tokens/motion.json` would require editing `SOURCE_FILES` in `style-dictionary.config.mjs:21` (an explicit array, not a glob) plus `scripts/token-format.mjs`, guarded by `yarn tokens:check` in CI **and** pre-push. **Separate story.**
- **`docs/project-context.md` is stale and is loaded as ground truth by the story workflow.** It states Expo SDK 54, RN 0.81.5, React 19.1 and **NativeWind**; reality is Expo 55, RN 0.83.6, React 19.2, Zod 4 and **Unistyles 3** (Story 16.1). `docs/ux-design-specification.md:189` likewise still names "Accessible Sage" `#73A973` as the primary accent. Any agent trusting either will be wrong.
- **The app-icon variant system is undocumented** — `aurora`/`forest`/`sunset` arrived in one commit (`f170036`) with no script, doc, or story. Aurora is the shipped default.
- **Three marks represent the app** — `BrandedIcon`'s `credit-card`, `AppIconHeader`'s `card-account-details-outline`, and the real icon. Once this story proves the logo renders at runtime, unifying welcome and auth onto it is a natural follow-up.
- **`assets/images/empty-wallet.svg` has no consumer** — a Figma export superseded by hand-transcribed JSX in `EmptyState.tsx`. Dead asset.

## Dev Agent Record

### Agent Model Used

Claude Opus 5 (`claude-opus-5`) — implementation. Independent code review and QA review by
Claude Sonnet subagents (fresh context), looped to zero comments each.

### Debug Log References

Three findings that cost real time and are worth recording, because each is a trap the next
agent would otherwise re-discover:

1. **`@/`-aliased SVG imports never reached `__mocks__/svgMock.js`** — found here, then fixed
   in its own follow-up before this story landed, so the note below records history rather
   than a live constraint. Jest applies the FIRST matching `moduleNameMapper` entry, and
   `jest.config.js` listed `^@/(.*)$` before `\.svg$`. So `@/assets/foo.svg` resolved to the
   real file and the react-native preset's asset transformer returned a plain `{ testUri }`
   **object**, not a component — React cannot render it. Verified empirically with a throwaway
   probe test, which is what made the aurora mark import relatively at first. The follow-up
   reordered the two entries; `AppLaunchScreen.tsx` now uses the normal `@/` alias like every
   other SVG import in the repo, and `test/svg-module-resolution.test.tsx` pins the ordering.
2. **`expo-splash-screen` must be mocked in `jest.setup.js`, not merely transformed.** It
   ships untranspiled ESM, and the `expo` alternative in `transformIgnorePatterns` does not
   cover it (each alternative must be followed by `/`, so `expo/` never matches
   `expo-splash-screen/`). Adding it to the allowlist fixes the parse error but then its
   `import { isRunningInExpoGo } from 'expo'` drags in expo's side-effect chain
   (`expo-asset` → `expo-modules-core` `EventEmitter`), which does not survive this jsdom
   environment. A no-op mock is faithful anyway: on device the module wraps
   `requireOptionalNativeModule('ExpoSplashScreen')`, which returns null off-device, so every
   export already no-ops. **No source-level try/catch is needed around `setOptions`.**
3. **RNTL hides accessibility-hidden subtrees from queries.** With
   `includeHiddenElements` at its v13 default of `false`, the `accessibilityElementsHidden`
   mark is not queryable at all — the first version of the test suite failed _because the
   a11y hiding works_. Turned into a stronger assertion: the mark must be unreachable via a
   default query and reachable only with `{ includeHiddenElements: true }`.

### Completion Notes List

**Delivered — AC1, AC2, AC3, AC4, AC5, AC6, AC7, AC8, AC9, AC10, AC11, AC12 (12 of 13).**

- **AC1/AC8** — `assets/splash-icon.png` replaced with a byte-copy of
  `assets/app-icons/variants/aurora/expo/icon-1024.png`; `shasum -a 256` now matches
  `assets/icon.png` (`3301a40b…`, 180 505 bytes, up from the 70-byte 1×1 placeholder).
  Asserted in `constants.test.ts` so a future asset change cannot silently break continuity.
- **AC2** — `expo-splash-screen@55.0.23` installed via `npx expo install`; legacy
  `expo.splash` block deleted; plugin appended with `image`/`imageWidth`/`backgroundColor`.
  (This note originally recorded a `dark` variant; that was **removed** in the 2026-07-28
  revision below — a scheme-independent field is the fix, so there is no dark variant to
  configure.) `npx expo config --type introspect` resolves the plugin cleanly
  (`UILaunchStoryboardName: 'SplashScreen'`, `UIUserInterfaceStyle: 'Automatic'`).
  `npx expo-doctor`: **no splash warnings**. Its 3 failing checks are all pre-existing and
  unrelated — `newArchEnabled` + `ios.minimumOsVersion` schema complaints (both untouched
  lines) and 20 out-of-date package patch versions.
- **AC3** — `'#171717'` is gone from source; `grep -rn "171717" app shared features core`
  returns **no hits** (comments were reworded to avoid re-introducing the literal, so the
  AC's own grep is clean). `styles.fullscreen`/`errorTitle`/`errorBody` moved onto
  `theme.colors.*` via Unistyles' function form, which works pre-`ThemeProvider` because
  Unistyles is engine-level. The `{dbError}` binding at the render site is untouched.
- **AC4** — `SPLASH_LOGO_WIDTH` (200 at the time of this note; **260** after the 2026-07-28
  revision below) declared once, applied to **both** `width` and
  `height`. `app.json` is strict JSON so it cannot carry the reciprocal comment the story
  asked for; instead `constants.test.ts` reads `app.json` and **asserts** the equality — a
  CI-enforced link rather than a convention. See "Deviations" below.
- **AC5** — `preventAutoHideAsync()` and `hideAsync()` both `.catch()`-ed;
  `hideAsync` fires on the surface's `onLayout` and unconditionally via a
  `SPLASH_HIDE_FALLBACK_MS` timer cleared on unmount, guarded by a ref so it fires once.
  Nine tests in `test/root-layout.splash-handoff.test.tsx` pin it, including a suite-wide
  hostile condition: `preventAutoHideAsync` is mocked to **reject** for the whole file, so
  the module-scope catch is exercised on every test.
- **AC6** — first runtime render of the app's own logo: `app-icon-variant-aurora-transparent.svg`
  (the **foreground**; this note originally named the boxed `app-icon-variant-aurora.svg`, changed
  by the 2026-07-28 revision below) as a
  React component through `react-native-svg-transformer`.
- **AC7/AC9** — breath starts at `BREATH_DELAY_MS` (asserted silent at 599 ms, started at
  600 ms), fades in via a second shared value so it never pops, loops `-1` reversing.
  Reduced motion kills both the breath and the exit cross-fade; the guard is proven
  load-bearing by a test that flips it and asserts the breath _does_ start.
- **AC10/AC11** — all three pre-existing root-layout suites pass **unmodified** (14 tests);
  `testID="boot-loading"` retained on the gating element; `isReady`, both OTA budgets and
  Story 16.14's `logger.notify`/`otaFailureKind` sites untouched.
- **AC12** — `yarn lint`, `yarn typecheck`, `yarn tokens:check`, `yarn test`
  (**168 suites / 1818 tests**) and `yarn test:coverage` all pass from the main checkout.
  `shared/components/launch` is at **100 % statements/branches/functions/lines**; global
  93.28 % against the 80 % gate.

**NOT delivered — AC13 (release-build verification), AC4's "explicitly verified on Android"
clause, and the AC6 on-device drop-shadow check.**
Both are inherently human/device gates and neither can be produced in an agent session:
AC13 requires `npx expo prebuild --clean` (which would **delete** the developer's existing
local `ios/`+`android/` directories and force a fresh pod install), then a signed release
build on both platforms, then four screenshots attached to the PR by hand. The story itself
states a green CI run does not satisfy it. Their task checkboxes are deliberately left
unchecked. Everything AC13 gates is otherwise verified statically (config introspection, the
CI-enforced `imageWidth` equality, and `yarn splash:check` keeping the raster in sync with the
SVG — the "byte-identical assets" this note originally cited were retired by the 2026-07-28
revision below).

**Deviations from the story, both deliberate:**

1. **AC4's reciprocal comment in `app.json`.** Not possible — `app.json` is strict JSON and
   prettier/CI would reject comments. Replaced with a test asserting
   `plugin.imageWidth === SPLASH_LOGO_WIDTH`, plus a comment in `constants.ts` naming
   `app.json` and explaining that the test is the enforcement.
2. **The decorative-art a11y props sit on the mark's `Animated.View` wrapper, not on the
   `<AuroraMark>` element.** This matches the cited precedent exactly
   (`FannedCardIllustration.tsx:18-19` puts them on the wrapper, not on the art primitives)
   and is the semantically correct placement, since `no-hide-descendants` is about hiding a
   subtree. Verified by test: the mark is unreachable from an accessibility-respecting query.

**⚠️ DESIGN REVERSED AFTER DEVICE VERIFICATION (ifero approved, 2026-07-28) — this
supersedes AD-16-17-02, AD-16-17-03, AD-16-17-05 and open decisions #2/#5. A formal
correct-course entry is still owed for the ADs themselves, which dev-story may not edit.**

The story's design failed on the simulator twice, and the second failure exposed a flaw in
its reasoning rather than in its execution:

1. **The mark was a hard-edged blue square.** AD-16-17-02 reused `assets/icon.png` for
   byte-identity, but that file is deliberately opaque and full-bleed because iOS and
   Android mask app icons THEMSELVES at the icon layer. A splash image gets no such
   treatment. Byte-identity was the wrong invariant; visual identity was the goal.
2. **The launch inverted luminance on every cold start.** Measured on device with
   `system = light, app = dark` (a forced-preference user): field luminance across 12
   frames read `255,255,255,255,255,255,255 → 0`, i.e. ~1.75 s of white then black
   content. AD-16-17-05 knowingly accepted this as "one soft, designed transition instead
   of one hard, undesigned cut" — but a 250 ms fade does not rescue a full-screen
   inversion, and this is unfixable while the field is theme-aware at all: the NATIVE
   splash background is baked at build time from `userInterfaceStyle: "automatic"`, so it
   can never read a runtime preference.

**Revised design.** The launch field is ONE brand colour, `PRIMARY_COLORS[500]`, in both
layers, and the mark is the wallet FOREGROUND
(`app-icon-variant-aurora-transparent.svg`) rather than the boxed icon. Consequences:

- `app.json`'s plugin entry loses its `dark` variant entirely; `backgroundColor` is
  `#1A73E8`; `imageWidth` is 260 (the foreground fills less of its own frame than the
  boxed icon did).
- `AppLaunchScreen` no longer reads `useColorScheme` at all — AD-16-17-05's whole
  mechanism is deleted, not merely retuned. Native and JS now agree by construction
  because there is exactly one colour, so AC4's Android pixel-identity concern is
  satisfied without depending on scheme resolution matching.
- `LAUNCH_FIELD_COLOR` is derived from the design token, not hardcoded.
- New `scripts/build-splash-icon.mjs` rasterises the foreground SVG (dependency-free
  SDF renderer with analytic AA, ~1 s; the repo has no image library, no rasteriser, and
  no Chrome for Playwright). This closes the story's own "there is no rasterization
  script in `scripts/`" gap. `yarn splash:build` / `yarn splash:check`, wired into
  pre-push and CI beside `tokens:check`.
- AC8 as literally written ("byte-identical to `assets/icon.png`") is now **deliberately
  false**. Continuity comes from shared ARTWORK — both are aurora — enforced by
  `splash:check` regenerating the raster from the SVG and comparing hashes.

**Verified on the iOS simulator** (iPhone 17 Pro, iOS 26.4, Debug): launch reads
home → brand blue (7 consecutive frames) → content, with no white frame. Two dev-only
artifacts were ruled out along the way and are worth knowing: iOS replays a **cached
launch snapshot** that survives `simctl install` over the top (needs `simctl uninstall`,
or the snapshot is served from the previous build), and `npx expo prebuild` cannot run
incrementally in this project — `@bacons/apple-targets` throws
`Cannot read properties of undefined (reading 'removeFromProject')` when the `watch`
target already exists, so only `--clean` works.

**The `ios/` project was hand-patched to verify this, NOT prebuilt.** Because the
incremental prebuild crashes and `--clean` would have destroyed the developer's Pods, the
generated `SplashScreenLogo.imageset` PNGs, `SplashScreenBackground.colorset` and
`SplashScreen.storyboard` were regenerated by hand to match what the plugin emits.
`ios/` is gitignored, so the committed source of truth is `app.json` + the generated
asset, and a clean prebuild in CI/EAS will produce all of it properly. **AC13 still needs
a real `prebuild --clean` + release build.**

**Found by QA review and fixed here (a second flash location the story did not name).** The
exit `FadeIn` runs on a partially-transparent view, and by the time it runs the launch surface
has already unmounted — so `styles.contentRoot` having no `backgroundColor` would have let the
raw native window background composite through for 250 ms. That is a THIRD background
mid-launch: the exact defect this story removes from the entrance, reappearing in the exit.
`contentRoot` now carries `theme.colors.background`, which also makes it the place a
forced-preference user's scheme override lands smoothly (AD-16-17-05's intent). Pinned by
`test/root-layout.splash-handoff.test.tsx` and mutation-verified: deleting the colour fails
that test and nothing else.

**Two spec observations recorded rather than changed** (the edge-case table and ACs are
outside the sections dev-story may edit):

1. The "Landscape / tablet" edge-case row justifies itself with `app.json:6`'s
   `"orientation": "portrait"`, but the resolved iOS config sets
   `UISupportedInterfaceOrientations~ipad` to all four orientations, so an iPad **can** launch
   in landscape. Harmless here — the mark is fixed-size and centred on both axes, so it is
   correct in either orientation — but the row's stated reason is not quite the real one.
2. AC4's "Explicitly verified on Android" clause is a device gate like AC13's, but was not
   listed among the story's open items; it is now called out above.

**Found out of scope here, then fixed in a separate follow-up (ifero approved it immediately,
so it landed alongside rather than later):** `__mocks__/svgMock.js` was effectively dead code,
because every SVG in the repo is imported as `@/assets/...` and the `^@/(.*)$`
`moduleNameMapper` entry claimed those requests before `\.svg$` could. Nothing was red, but the
damage was quieter than "a future test will fail": `features/cards/components/BrandLogo.tsx`
branches on `typeof source === 'function'`, so with every SVG arriving as a `{ testUri }`
object that discriminator could never be satisfied from real catalogue data — tests rendered
the `<Image>` branch where the app renders `<SvgLogo>`. The two entries are now reordered,
`.png` still resolves to an asset object (correct — PNGs really are `<Image>` sources), and
`test/svg-module-resolution.test.tsx` pins all of it. See that follow-up's own notes.

### File List

**New**

- `shared/components/launch/constants.ts`
- `shared/components/launch/constants.test.ts`
- `shared/components/launch/AppLaunchScreen.tsx`
- `shared/components/launch/AppLaunchScreen.test.tsx`
- `test/root-layout.splash-handoff.test.tsx`

**Modified**

- `app.json`
- `app/_layout.tsx`
- `assets/splash-icon.png`
- `jest.setup.js`
- `package.json`
- `yarn.lock`
- `shared/i18n/locales/en.ts`
- `shared/i18n/locales/it.ts`
- `docs/sprint-artifacts/sprint-status.yaml`
- `docs/sprint-artifacts/stories/16-17-redesign-app-launch-experience.md`

### Change Log

| Date       | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Author       |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| 2026-07-28 | Drafted via create-story with party-mode refinement (John, Winston, Sally, Amelia, Murat; Caravaggio walk-on). Root cause: `splash-icon.png` is a 1×1 `#00FF00`@alpha-127 pixel stretched by `resizeMode: contain`, untouched since `a0e47f3` (2025-11-28). ifero ratified seamless handoff + progressive disclosure, spec folded in for inline approval, and the app icon as the mark. AD-16-17-01…05 recorded.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Amelia (Dev) |
| 2026-07-28 | Independent checklist validation (fresh context) corrected 13 citations and 8 gaps before hand-off. Material changes: **the mark is `app-icon-variant-aurora.svg`, not `app-icon-master.svg`** (the shipped `icon.png` is aurora — different gradient stops, radius and wallet geometry), and the native asset is now the already-rasterized aurora PNG, removing an unreproducible rasterization step; **new AD-16-17-05** for the native-vs-Unistyles scheme-resolver split that would have caused a black→white hard cut for forced-preference users; **AC5 added** so a rejected `hideAsync()` or missing `onLayout` cannot strand the native splash; AC3 scoped to source files; nine (not ten) `boot-loading` assertions; the reduced-motion mock "precedent" was fabricated and is now an explicit warning.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Amelia (Dev) |
| 2026-07-28 | _(Superseded by the revision row below — describes the first implementation, not the shipped design.)_ Implemented (dev-story). `expo-splash-screen@55.0.23` installed; legacy `expo.splash` deleted and the plugin configured with a `dark` variant; `assets/splash-icon.png` replaced by a byte-copy of the aurora raster (sha256 now matches `assets/icon.png`); new `shared/components/launch/{constants.ts,AppLaunchScreen.tsx}` rendering the aurora SVG at `SPLASH_LOGO_WIDTH` square on the SYSTEM scheme's background, breathing after 600 ms, reduced-motion-guarded; `app/_layout.tsx` holds the native splash at module scope and hands off on first paint with a `SPLASH_HIDE_FALLBACK_MS` net, `'#171717'` retired onto theme tokens, exit cross-fade added. 42 new tests across 3 files (18 + 12 + 12); all 3 pre-existing root-layout suites pass unmodified; `shared/components/launch` at 100 % coverage. AC13 + the on-device drop-shadow check remain open (release build + 4 screenshots — a human/device gate).                                                                                                                                                                                                                                                                                                                                                                                                                    | Amelia (Dev) |
| 2026-07-28 | **Design reversed after device verification, ifero approved.** The story's mark-on-theme-background design failed twice on the simulator: first as a hard-edged blue square (`assets/icon.png` is opaque and full-bleed because the OS masks app icons itself — byte-identity was the wrong invariant), then as a measured white→black luminance inversion of ~1.75 s on every cold start for forced-preference users (the native splash background is baked from `userInterfaceStyle: automatic` and cannot read a runtime preference, so no theme-aware field can ever match the app). Replaced with a single scheme-independent brand field (`PRIMARY_COLORS[500]`) plus the wallet FOREGROUND mark, which deletes `useColorScheme` from the launch entirely and retires AD-16-17-05's mechanism. Adds `scripts/build-splash-icon.mjs`, a dependency-free SDF rasteriser for the foreground SVG, gated by `yarn splash:check` in pre-push and CI. Supersedes AD-16-17-02/03/05 and open decisions #2/#5; a formal correct-course is still owed for the AD text. Verified on iPhone 17 Pro / iOS 26.4: home → blue → content, no white frame.                                                                                                                                                                                                                                                                                                          | Amelia (Dev) |
| 2026-07-28 | Review loops re-run over the REVISED design (the earlier zero-comment passes covered the pre-reversal build and were therefore stale). **Code review:** 4 findings → fixed → APPROVED, zero comments. The substantive one: `assertSvgMatches` hand-listed 5 fragments while the renderer hardcodes seven primitives, so a recoloured dot left `splash:check` green with a stale PNG — the guard now DERIVES its fragment list from the renderer's own constants, mutation-verified against three separate artwork edits. Also: a vacuous scheme test rewritten to mock `useColorScheme`, drive both values and assert it was never called; a stray unrelated `targets/watch/.../Contents.json` reverted; a CI step comment broadened. **QA review:** 1 High + 1 Low → fixed → APPROVED, zero comments. The High was mine: the correct-course amended the ADs, ACs, `epics.md` and `sprint-status.yaml` but left this story's own Interaction & Motion Spec (States/Constants/Edge-case tables), a task line and a Test-Plan bullet describing the superseded design unmarked — including a self-contradiction (Constants table `200` vs Open Decision #3 `260`). Sweeping for the pattern rather than the listed instances found two more the reviewer missed: AD-16-17-01's copy-pasteable `jsonc` config snippet, and the AC4/AC6 Completion Notes. All gates green throughout: 169 suites / 1825 tests, `shared/components/launch` at 100 % coverage. | Amelia (Dev) |
