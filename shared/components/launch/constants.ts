/**
 * Launch-surface constants — Story 16.17 (AD-16-17-01, AD-16-17-02, AD-16-17-04).
 *
 * The launch surface replaces a four-surface cold start (native splash → JS boot
 * gate → CardList spinner → content) with one continuous branded field. Every
 * timing and dimension it depends on lives here rather than inline, because two
 * of them are shared across a module boundary the compiler cannot police:
 * `SPLASH_LOGO_WIDTH` must equal `app.json`'s plugin `imageWidth`, and
 * `EXIT_FADE_MS` mirrors the `SplashScreen.setOptions({ duration })` passed in
 * `app/_layout.tsx`.
 *
 * No motion tokens exist in this project — every duration in the app is inline
 * (`SyncIndicator` 1200 ms, `ScannerOverlay` 2000 ms, three banners at 300 ms) —
 * so these stay file-local by design. Promoting them to `tokens/motion.json`
 * would mean editing `SOURCE_FILES` in `style-dictionary.config.mjs` plus
 * `scripts/token-format.mjs`, both guarded by `yarn tokens:check`; that is a
 * separate story.
 */
import { PRIMARY_COLORS } from '@/shared/theme/colors';

/**
 * The launch field — a single brand colour, identical in both schemes.
 *
 * Scheme-independent ON PURPOSE, and this is the most important line in the file.
 * The NATIVE splash background is baked at build time from `app.json`'s
 * `userInterfaceStyle: "automatic"`, so it can never read the user's runtime theme
 * preference. Any theme-aware launch field therefore disagrees with the app for
 * every user who has overridden the system scheme — measured on device as ~1.75 s
 * of white followed by black content, on every cold start. Painting one brand
 * colour in both layers removes that class of bug by construction instead of
 * mitigating it, and it is the only field that is neither white nor black.
 *
 * Derived from the design token rather than hardcoded, so it tracks
 * `tokens/*.json`. The same value is duplicated as `backgroundColor` in
 * `app.json`'s `expo-splash-screen` entry — strict JSON cannot hold a comment
 * pointing here, so `constants.test.ts` asserts the two agree.
 */
export const LAUNCH_FIELD_COLOR = PRIMARY_COLORS[500];

/**
 * Logo edge length in points, square.
 *
 * MUST equal the `imageWidth` of the `expo-splash-screen` plugin entry in
 * `app.json` — the value is duplicated there because `app.json` is strict JSON
 * and cannot carry a comment pointing back here. `constants.test.ts` reads
 * `app.json` and asserts the two agree, so the link is enforced by CI rather
 * than by convention.
 *
 * Why the equality is load-bearing rather than tidy: `SplashScreenOptions.fade`
 * is documented iOS-only. On Android the native layer is removed in a hard cut
 * with no cross-fade to forgive misalignment, so pixel-identity between the
 * native PNG and the JS-rendered SVG is the ONLY thing concealing the handoff
 * there. A few points of drift turns an invisible transition into a flicker.
 *
 * Applied to BOTH `width` and `height`: the aurora `viewBox` is `0 0 1024 1024`
 * (square), and setting width alone invites a flex-driven height that breaks the
 * identity above. Larger than Expo's 200 default because the mark is now the
 * wallet FOREGROUND rather than the boxed icon — without the container around it,
 * the artwork occupies less of its own frame.
 */
export const SPLASH_LOGO_WIDTH = 260;

/**
 * How long the mark stays completely static before the liveness signal appears.
 *
 * 600 ms, not NFR-U5's literal 500 ms floor (`docs/prd.md:1055`): at exactly 500
 * the affordance would flash on and immediately off again for every user landing
 * in the 500–700 ms band, and a blink reads as a glitch rather than information.
 * 600 clears the requirement while keeping the common (fast) path silent, which
 * is what "Silent Reliability" asks for.
 */
export const BREATH_DELAY_MS = 600;

/** Fade-in for the breath once revealed — it appears gently, it never pops. */
export const BREATH_FADE_IN_MS = 200;

/**
 * Duration of one breath direction, so a full cycle is ~1.8 s. Calm enough to
 * read as "I'm here", slow enough not to read as "I am busy" (that is a
 * spinner's job, and two spinners are what this story deletes).
 */
export const BREATH_DURATION_MS = 900;

/** Trough opacity of the breath — perceptible at a glance, never a flicker. */
export const BREATH_MIN_OPACITY = 0.55;

/**
 * Cross-fade from the launch surface to content. Matches the `duration` passed
 * to `SplashScreen.setOptions` in `app/_layout.tsx` so the native→JS handoff and
 * the JS→content exit share one consistent feel.
 */
export const EXIT_FADE_MS = 250;

/**
 * Belt-and-braces deadline for hiding the native splash (AD-16-17-01).
 *
 * `hideAsync()` is normally driven by the launch surface's root `onLayout`, but
 * `onLayout` never fires for a zero-size layout and both `preventAutoHideAsync`
 * and `hideAsync` return rejectable promises. Any of those would strand the
 * native splash up FOREVER — a permanent white/black screen, strictly worse than
 * the flash this story removes and a direct regression of the "boot never hangs"
 * guarantee from Stories 16.10/16.12. This timer fires `hideAsync()`
 * unconditionally so that cannot happen.
 */
export const SPLASH_HIDE_FALLBACK_MS = 2000;
