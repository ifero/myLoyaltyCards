---
baseline_commit: e9d841d403881867215df74ac162e9ac8e9a8fa6
---

# Story 16.17: Redesign the app launch experience — one continuous, branded, theme-aware surface

Status: ready-for-dev

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

```jsonc
[
  "expo-splash-screen",
  {
    "image": "./assets/splash-icon.png",
    "imageWidth": 200, // MUST equal SPLASH_LOGO_WIDTH
    "backgroundColor": "#FFFFFF", // LIGHT_THEME_COLORS.background
    "dark": { "image": "./assets/splash-icon.png", "backgroundColor": "#000000" } // DARK_THEME_COLORS.background
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

## AD-16-17-02: the mark is **aurora**, and the native asset is the shipped icon itself

**Decision.** The launch mark is **`assets/images/app-icon-variant-aurora.svg`**, and `assets/splash-icon.png` is a **copy of `assets/app-icons/variants/aurora/expo/icon-1024.png`**. There is no rasterization step.

**Why aurora and not `app-icon-master.svg`.** The shipped app icon is aurora — `assets/icon.png` is byte-identical to `assets/app-icons/variants/aurora/expo/icon-1024.png` (both `sha256 3301a40b…`, 180 505 bytes). Master is a **different drawing**:

| Property        | `app-icon-master.svg`         | `app-icon-variant-aurora.svg`             |
| --------------- | ----------------------------- | ----------------------------------------- |
| bg gradient     | 2 stops `#1A73E8`→`#0D47A1`   | **3 stops** `#1A73E8`→`#1765D2`→`#0E4AA8` |
| squircle radius | `rx="228"`                    | `rx="230"`                                |
| wallet rect     | `246,300 532×392 rx94`        | `244,304 536×396 rx96`                    |
| wallet gradient | `#FFFFFF`@.98 → `#E9F1FF`@.95 | opaque `#FFFFFF` → `#EAF2FF`              |
| stroke          | `#C9DCFF`                     | `#C7DBFF`                                 |

Using master would give the splash a different gradient ramp, corner radius and highlight placement than the icon the user just tapped — in a story whose entire thesis is visual continuity. **Reusing the already-rasterized aurora PNG makes the native mark byte-identical to the app icon by construction**, removes an unreproducible rasterization step (there is no rasterization script in `scripts/` and no documented pipeline), and satisfies AC8 for free.

**Why one shared width constant is load-bearing, not tidy.** `SplashScreenOptions.fade` is documented **iOS-only**; `duration` is cross-platform. So on Android the native layer disappears in a **hard cut** with no cross-fade to forgive misalignment. Pixel-identity between the native PNG and the JS-rendered SVG is therefore **the only mechanism concealing the handoff on Android** — a few points of drift converts an invisible transition into a visible flicker, i.e. worse than today. Hence:

```ts
// shared/components/launch/constants.ts
/** Logo edge length in points, square. MUST equal app.json's expo-splash-screen `imageWidth`. */
export const SPLASH_LOGO_WIDTH = 200;
```

Both surfaces: centred on both axes, **`width` AND `height` both set to `SPLASH_LOGO_WIDTH`** (the source `viewBox` is `0 0 1024 1024`, square — setting width alone invites a flex-driven height and breaks the identity this AD calls load-bearing), on a flat background per AD-16-17-05.

**The field is the theme background, not the brand gradient.** The plugin supports only a solid `backgroundColor` (no gradient layer), the mark already carries its gradient internally, and the app the user lands on is `#FFFFFF`/`#000000` — a blue field would **reintroduce** the flash this story deletes, merely a tasteful one.

**Filter-fidelity risk, scoped precisely.** Aurora uses `<filter id="shadow">` + `feDropShadow` (`:12-14`) applied via `<g filter="url(#shadow)">` (`:21`). `react-native-svg@15.15.3` does ship `FeDropShadow`, but its native rendering need not match whatever rasterized the PNG. **This risk does not touch the handoff**, because the filter region (`x=190 y=190 w=650 h=620`) is entirely _interior_ to the squircle, while the silhouette — the `<rect rx="230">` at `:17` whose edge alignment actually governs the transition — carries **no filter**. So a shadow mismatch would be a subtle interior difference, not an edge flicker. Verify on device; if visibly different, flatten the shadow out of the JS mark so both agree.

---

## AD-16-17-03: the launch surface is theme-aware — retire the hardcoded `#171717`

**Decision.** The launch surface derives its colours from theme tokens. `'#171717'` is deleted from source.

**Why this works before `ThemeProvider` mounts.** Both the `dbError` and `!isReady` branches return before `ThemeProvider` (`app/_layout.tsx:494-498`), so `useTheme()` would throw (`ThemeProvider.tsx:112-118`, throw at `:115`) — hence today's hardcoded hex. But **Unistyles is engine-level, not context-level**: the side-effect import at `app/_layout.tsx:2` runs `StyleSheet.configure` at module-evaluation time (`shared/theme/unistyles.ts:110`). The existing pre-gate styles already prove it works there (`:501-523` _is_ a Unistyles `StyleSheet.create`) — they simply pass literals instead of reading `theme`. Themed styles work; only the React **context** is unavailable.

`'#171717'` appears in exactly one **source** file (`app/_layout.tsx:512`) and is not a design token — absent from `NEUTRAL_COLORS` and from both theme maps, and matching neither `#FFFFFF` nor `#000000`. Story 13.10 corrected the spinner's colour to a mode-independent token but left this background; it is unowned debt and this story closes it. (It also appears in two **documentation** files — `16-1-migrate-nativewind-to-unistyles.md:195` and this story's own tracker entry — which are historical records and explicitly out of scope. AC3 is scoped to source accordingly.)

**`styles.fullscreen` end state (it is shared by both branches — `:479` and `:488`).** `fullscreen` **survives**, owned by the `dbError` branch only, with `backgroundColor` moved to the theme background. `AppLaunchScreen` owns its own styles and does not reuse it. `errorTitle` (`:517`) and `errorBody` (`:521`) move to theme tokens.

**Do not touch the `{dbError}` binding.** `:481` renders the state variable `{dbError}`, set at `:413` to `t('common.errors.initializationFailed')`. "Cleaning this up" to a direct `t(...)` at the render site breaks `test/root-layout.initialization-error.test.tsx:112-118` (the Italian non-`Error` case), which depends on the value flowing through state.

---

## AD-16-17-05: the native and JS theme resolvers disagree — the launch surface follows the **system** scheme

**This is the subtlest correctness issue in the story. Read it before writing any styles.**

**The problem.** The two layers resolve their scheme from **different sources**:

- **Native splash** — `app.json:9` is `"userInterfaceStyle": "automatic"`, so the OS picks light/dark from the **system** appearance.
- **Unistyles** — `adaptiveThemes: false` (`unistyles.ts:115`) with `initialTheme: resolveInitialTheme` (`:116`), which reads the **user's persisted preference** via `getThemePreference()` → `Storage.getItemSync(KEYS.THEME_PREFERENCE)` (`core/settings/settings-repository.ts:75`), falling back to `Appearance.getColorScheme()` only when unset.

For any user who has **explicitly forced light mode on a dark-mode device** (or the reverse), the native layer paints `#000000` while a preference-driven JS surface would paint `#FFFFFF` — a **black→white hard cut on Android**, exactly the failure AD-16-17-02 says pixel-identity exists to prevent.

**Decision.** The launch surface's background follows the **system** scheme, matching the native layer — not the persisted preference. Read it directly (`useColorScheme()` from `react-native`, or `Appearance.getColorScheme()`) and select `LIGHT_THEME_COLORS.background` / `DARK_THEME_COLORS.background`. The user's explicit override takes effect at the **cross-fade into content**, which is already a designed 250 ms transition and the correct place for a scheme change to become visible.

**Consequence for AC3, stated honestly:** every frame from process start _through the cross-fade_ is backed by the **system** scheme's background. A forced-preference user sees their chosen scheme arrive with the cross-fade rather than at frame one. That is a deliberate trade: one soft, designed transition instead of one hard, undesigned cut.

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

### States

| State       | Trigger                                                  | Visual                                                                     | Motion                                                                                                                                                          |
| ----------- | -------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `native`    | process start                                            | mark, centred, `SPLASH_LOGO_WIDTH` square, on the system scheme background | none (OS layer)                                                                                                                                                 |
| `handoff`   | launch surface painted (root `onLayout`) → `hideAsync()` | identical to `native`                                                      | **iOS:** 250 ms fade. **Android:** `duration` is honoured but `fade` is not, so the layer is removed without a cross-fade — concealed solely by pixel-identity. |
| `quiet`     | 0 → `BREATH_DELAY_MS`                                    | static mark                                                                | none                                                                                                                                                            |
| `breathing` | ≥ `BREATH_DELAY_MS` and `!isReady`                       | same mark, oscillating opacity                                             | fade in `BREATH_FADE_IN_MS`, then `1.0 ⇄ BREATH_MIN_OPACITY`, `BREATH_DURATION_MS` per direction, `Easing.inOut(Easing.ease)`, reversing, until ready           |
| `error`     | `dbError` set                                            | themed title + body, `{dbError}` binding untouched                         | none                                                                                                                                                            |
| `exit`      | `isReady`                                                | cross-fade to content                                                      | `EXIT_FADE_MS` (skipped under reduced motion)                                                                                                                   |

### Constants — **all seven live in `shared/components/launch/constants.ts`**

| Constant                  | Value  | Rationale                                                                                                 |
| ------------------------- | ------ | --------------------------------------------------------------------------------------------------------- |
| `SPLASH_LOGO_WIDTH`       | `200`  | Expo's documented `imageWidth` default; must equal the plugin value; applied to **both** width and height |
| `BREATH_DELAY_MS`         | `600`  | above NFR-U5's 500 floor; avoids blinking the 500–700 ms band                                             |
| `BREATH_FADE_IN_MS`       | `200`  | appear gently, never pop                                                                                  |
| `BREATH_DURATION_MS`      | `900`  | per direction; ~1.8 s cycle — calm, not urgent                                                            |
| `BREATH_MIN_OPACITY`      | `0.55` | perceptible at a glance without reading as a flicker                                                      |
| `EXIT_FADE_MS`            | `250`  | matches `setOptions.duration` for one consistent feel                                                     |
| `SPLASH_HIDE_FALLBACK_MS` | `2000` | AD-16-17-01 safety net — `hideAsync()` fires even if `onLayout` never does                                |

### Edge cases (satisfies DoR gate 5)

| Case                                               | Behaviour                                                                                                                                                                                                  |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dark system scheme**                             | Native `dark.backgroundColor: #000000`; JS reads the system scheme and matches. No white flash.                                                                                                            |
| **Light system scheme**                            | Native `#FFFFFF`; JS matches.                                                                                                                                                                              |
| **Forced preference ≠ system scheme**              | Launch surface follows **system** (AD-16-17-05); the override arrives with the cross-fade. No hard cut.                                                                                                    |
| **Reduced motion**                                 | No breath, no cross-fade. Static mark; instant swap.                                                                                                                                                       |
| **Offline cold start**                             | Typically `quiet` only — no breath (`Updates.isEnabled` false, or the check fails fast).                                                                                                                   |
| **~35 s OTA worst case**                           | `breathing` from 600 ms to ready, uninterrupted.                                                                                                                                                           |
| **`hideAsync()` rejects / `onLayout` never fires** | `SPLASH_HIDE_FALLBACK_MS` timer hides it anyway. Boot never strands.                                                                                                                                       |
| **`Updates.reloadAsync()` fires**                  | Runtime tears down; sequence restarts from `native`. Unchanged, acceptable.                                                                                                                                |
| **DB init failure**                                | `error` state — themed, same strings, raw error still suppressed.                                                                                                                                          |
| **Dynamic Type at accessibility sizes**            | The mark is a fixed-size image and the surface has no text; unaffected.                                                                                                                                    |
| **Landscape / tablet**                             | `app.json:6` pins `"orientation": "portrait"`; with `supportsTablet: true` the mark stays centred and fixed-size.                                                                                          |
| **Screen reader**                                  | Mark is decorative: **both** `accessibilityElementsHidden` and `importantForAccessibility="no-hide-descendants"` (per `FannedCardIllustration.tsx:18-19`). The root carries one i18n `accessibilityLabel`. |

---

## Acceptance Criteria

1. **The stretched placeholder is gone.** `assets/splash-icon.png` is a copy of `assets/app-icons/variants/aurora/expo/icon-1024.png`; no 1×1 asset remains referenced by any config.
2. **Config migrated (AD-16-17-01).** The legacy `expo.splash` block is removed; `expo-splash-screen` is installed and configured as a plugin with `image`, `imageWidth`, `backgroundColor`, and a `dark` variant. Prebuild / `expo-doctor` report no splash warnings.
3. **No scheme flash (AD-16-17-03, AD-16-17-05).** The launch surface takes its background from the **system** scheme, matching the native layer, so no frame from process start through the cross-fade changes background. The string `'#171717'` no longer appears in any source file under `app/`, `shared/`, `features/`, or `core/` (documentation and historical story records are out of scope).
4. **The handoff is invisible (AD-16-17-02).** Native and JS marks are the same artwork, both `SPLASH_LOGO_WIDTH` square, both centred, on the same flat background. `SPLASH_LOGO_WIDTH` is declared once and consumed by both the plugin config and the component, each site naming the other in a comment. **Explicitly verified on Android**, where no native fade exists.
5. **The splash cannot strand (AD-16-17-01).** `preventAutoHideAsync()` and `hideAsync()` both have `.catch()`; `hideAsync()` fires on the surface's `onLayout` **and** unconditionally via `SPLASH_HIDE_FALLBACK_MS`. A rejected promise or a missing `onLayout` cannot leave the native splash up. **Test-proven.**
6. **The mark is aurora, the shipped icon's artwork.** `assets/images/app-icon-variant-aurora.svg` is imported as a React component via the existing `react-native-svg-transformer` pipeline — the app's first runtime render of its own logo.
7. **Progressive disclosure (AD-16-17-04).** No motion before `BREATH_DELAY_MS`. At/after it with `!isReady`, the breath fades in and loops until ready — never stopping early, never blinking.
8. **Splash artwork matches the app icon.** `assets/splash-icon.png` and `assets/icon.png` are byte-identical (`shasum -a 256` on both). Satisfied by construction under AC1; assert it so a future asset change cannot silently break continuity.
9. **Reduced motion respected.** With `useReducedMotion()` true: no breath, no cross-fade, static mark at full opacity, instant swap.
10. **Boot semantics unchanged.** `isReady` composition untouched; both OTA budgets untouched; the `dbError` path still renders the error branch with the `{dbError}` state binding intact; Story 16.14's `logger.notify` sites and `otaFailureKind` tags untouched. **Stories 16.10, 16.12 and 16.14 keep their guarantees.**
11. **`testID="boot-loading"` preserved on the gating element.** All **nine** existing assertions in `test/root-layout.offline-boot.test.tsx` (lines 147, 158, 197, 206, 216, 247, 281, 309, 361) pass unmodified. Renaming it is forbidden — it would silently void the offline-boot regression suite.
12. **Tests + gates.** New unit tests for the launch surface (both schemes; reduced motion both ways; breath delay under fake timers; the AC5 strand guards). `yarn lint`, `yarn typecheck`, `yarn test`, `yarn test:coverage` pass with the 80 % global gate held — the component lands in `shared/**`, which **is** coverage-measured.
13. **Release-build verification.** Because Expo's docs state the splash does not render faithfully in Expo Go or a dev build, AC1–AC5 are verified on a **release build**, iOS and Android, light and dark. Concretely: `npx expo prebuild --clean` then a release build via the existing Fastlane/EAS lanes used by `beta-releases.yml`. Evidence: four screenshots attached to the PR. **A green CI run does not satisfy this AC.**

## Tasks / Subtasks

- [ ] (AC 2) `npx expo install expo-splash-screen`; append the plugin block to `app.json` `plugins` (closes at `:76`); delete the legacy `expo.splash` block (`:11-15`).
- [ ] (AC 1, 8) `cp assets/app-icons/variants/aurora/expo/icon-1024.png assets/splash-icon.png`; confirm `shasum -a 256` matches `assets/icon.png`.
- [ ] (AC 4, 7) Create `shared/components/launch/constants.ts` with all seven constants from the spec table, cross-referencing `app.json`'s `imageWidth`.
- [ ] (AC 3, 6, 7, 9) Build `shared/components/launch/AppLaunchScreen.tsx`: background from the **system** scheme (AD-16-17-05 — **not** `resolveInitialTheme`); `app-icon-variant-aurora.svg` as a component at `width` **and** `height` `= SPLASH_LOGO_WIDTH`; breath after `BREATH_DELAY_MS` gated on `useReducedMotion()`; `cancelAnimation` on unmount; `accessibilityElementsHidden` + `importantForAccessibility="no-hide-descendants"` on the mark; i18n `accessibilityLabel` on the root; an `onLayout` callback prop for the hide signal.
- [ ] (AC 5) In `app/_layout.tsx` module scope: `preventAutoHideAsync().catch(() => {})` and `setOptions({ duration: 250, fade: true })`. Wire `hideAsync().catch(() => {})` to the surface's `onLayout` **and** to a `SPLASH_HIDE_FALLBACK_MS` timer cleared on unmount.
- [ ] (AC 3, 10, 11) Replace the `!isReady` branch body with `<AppLaunchScreen>` **keeping `testID="boot-loading"` on the outer element**. Restyle the `dbError` branch onto theme tokens, keeping `styles.fullscreen` for that branch only with a themed background; delete the `'#171717'` literal. **Do not alter the `{dbError}` binding at `:481`.**
- [ ] (AC 7, 9) Add the cross-fade to content, skipped under reduced motion.
- [ ] (AC 6) Verify the aurora drop shadow (`<filter id="shadow">`, `:12-14`, `:21`) renders acceptably on both platforms. If it visibly differs from the PNG, flatten it from the JS mark so both agree. Note the silhouette (`<rect rx="230">`, `:17`) is filter-free, so handoff alignment is unaffected either way.
- [ ] (AC 12) i18n — add to **both** locale files by hand (no key-parity test exists, so a missing key fails silently):
  - `en.ts` → `common.launch.accessibilityLabel: 'myLoyaltyCards, starting up'`
  - `it.ts` → `common.launch.accessibilityLabel: 'myLoyaltyCards, avvio in corso'`
- [ ] (AC 12) `shared/components/launch/AppLaunchScreen.test.tsx` — see Test Plan. **Read the mock warning there before writing the reduced-motion test.**
- [ ] (AC 10, 11) Run all three root-layout suites unmodified. If `AppLaunchScreen` is reached through `@/shared/theme`, the wholesale `@/shared/theme` mock must be extended in **all three** files (`root-layout.offline-boot.test.tsx:95-101`, `root-layout.initialization-error.test.tsx:76-89`, `root-layout.welcome-gate.test.tsx:84-95`) — **prefer importing from `@/shared/theme/colors` or `react-native` directly to avoid this entirely.**
- [ ] (AC 12) `yarn lint` / `typecheck` / `test` / `test:coverage` from the **main checkout**.
- [ ] (AC 13) `npx expo prebuild --clean`; release build both platforms; capture four screenshots (iOS light/dark, Android light/dark); attach to the PR.

## Dev Notes

### References

- `app.json:6` orientation portrait · `:9` `userInterfaceStyle: automatic` (**the native scheme source — see AD-16-17-05**) · `:11-15` the legacy block to delete · `:13` the `contain` that stretched the pixel · `:76` where `plugins` closes · `:87-89` `runtimeVersion.policy: appVersion`.
- `app/_layout.tsx:2` the Unistyles side-effect import · `:42` `initSentry()` (module-scope precedent) · `:283`/`:295` OTA budgets · `:413` where `dbError` is set · `:475` `isReady` · `:479` `dbError` uses `styles.fullscreen` · `:481` the `{dbError}` binding · `:486-492` the branch to replace · `:488` the `boot-loading` testID · `:494-498` the `ThemeProvider` return · `:501-523` the Unistyles `StyleSheet.create` · `:512` the `'#171717'` · `:517`/`:521` error colours.
- `shared/theme/unistyles.ts:110` `StyleSheet.configure` · `:115` `adaptiveThemes: false` · `:116` `initialTheme` · `:102-108` `resolveInitialTheme` (**preference-driven — deliberately NOT used by the launch surface**).
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

- **Rendering:** mounts in both system schemes (drive via the `react-native` `useColorScheme` / `Appearance` mock); a11y props present on the mark; the i18n label on the root; `svgMock` renders with the testID you pass it.
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
3. `SPLASH_LOGO_WIDTH = 200`. If it reads too small on device, change it in `constants.ts` **and** `app.json` together — never one alone.
4. `BREATH_MIN_OPACITY = 0.55`.
5. **Aurora is the mark** — `app-icon-variant-aurora.svg`, matching the shipped icon (AD-16-17-02). `forest` and `sunset` are not in play, and `app-icon-master.svg` is explicitly **not** the shipped artwork.

### Out of scope — accepted follow-ups

- **`CardList`'s stage-3 spinner remains.** `useCards.ts:37` initialises `isLoading = true`, flipped after a `getAllCards()` mount effect, so `CardList.tsx:110-117` shows a second spinner after the launch surface exits. Not fixed here because gating the launch surface on a feature module's loading state would couple boot to `features/cards`, which `eslint.config.mjs:89-92` forbids and which needs a dependency inversion — an architecture change in polish clothing. This story still improves it: the jump becomes theme-background → theme-background (a spinner appearing) rather than `#171717` → `#FFFFFF` (a jolt). **Own story.**
- **No motion tokens exist.** Every duration in the app is inline (`SyncIndicator` 1200, `ScannerOverlay` 2000, three banners at 300). This story uses file-local constants; `tokens/motion.json` would require editing `SOURCE_FILES` in `style-dictionary.config.mjs:21` (an explicit array, not a glob) plus `scripts/token-format.mjs`, guarded by `yarn tokens:check` in CI **and** pre-push. **Separate story.**
- **`docs/project-context.md` is stale and is loaded as ground truth by the story workflow.** It states Expo SDK 54, RN 0.81.5, React 19.1 and **NativeWind**; reality is Expo 55, RN 0.83.6, React 19.2, Zod 4 and **Unistyles 3** (Story 16.1). `docs/ux-design-specification.md:189` likewise still names "Accessible Sage" `#73A973` as the primary accent. Any agent trusting either will be wrong.
- **The app-icon variant system is undocumented** — `aurora`/`forest`/`sunset` arrived in one commit (`f170036`) with no script, doc, or story. Aurora is the shipped default.
- **Three marks represent the app** — `BrandedIcon`'s `credit-card`, `AppIconHeader`'s `card-account-details-outline`, and the real icon. Once this story proves the logo renders at runtime, unifying welcome and auth onto it is a natural follow-up.
- **`assets/images/empty-wallet.svg` has no consumer** — a Figma export superseded by hand-transcribed JSX in `EmptyState.tsx`. Dead asset.

## Dev Agent Record

### Agent Model Used

_TBD by dev-story._

### Debug Log References

### Completion Notes List

### File List

### Change Log

| Date       | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Author       |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------ |
| 2026-07-28 | Drafted via create-story with party-mode refinement (John, Winston, Sally, Amelia, Murat; Caravaggio walk-on). Root cause: `splash-icon.png` is a 1×1 `#00FF00`@alpha-127 pixel stretched by `resizeMode: contain`, untouched since `a0e47f3` (2025-11-28). ifero ratified seamless handoff + progressive disclosure, spec folded in for inline approval, and the app icon as the mark. AD-16-17-01…05 recorded.                                                                                                                                                                                                                                                                                                                                                                                                   | Amelia (Dev) |
| 2026-07-28 | Independent checklist validation (fresh context) corrected 13 citations and 8 gaps before hand-off. Material changes: **the mark is `app-icon-variant-aurora.svg`, not `app-icon-master.svg`** (the shipped `icon.png` is aurora — different gradient stops, radius and wallet geometry), and the native asset is now the already-rasterized aurora PNG, removing an unreproducible rasterization step; **new AD-16-17-05** for the native-vs-Unistyles scheme-resolver split that would have caused a black→white hard cut for forced-preference users; **AC5 added** so a rejected `hideAsync()` or missing `onLayout` cannot strand the native splash; AC3 scoped to source files; nine (not ten) `boot-loading` assertions; the reduced-motion mock "precedent" was fabricated and is now an explicit warning. | Amelia (Dev) |
