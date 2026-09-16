import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Dynamic Expo config (Story 16.7).
 *
 * `app.json` is the static base, but it cannot compute a value. The Android
 * `versionCode` must be authoritative and survive `expo prebuild` — which
 * regenerates the gitignored `android/app/build.gradle` (with `versionCode 1`)
 * on every run. So this config extends `app.json` and injects a computed
 * `android.versionCode` that prebuild bakes into the generated project.
 */

/**
 * Production uploads run in a separate workflow (`store-upload.yml`) from the
 * alpha/beta workflow (`beta-releases.yml`), each with its own independent
 * GitHub Actions run-number counter. Production offsets into a distinct band so
 * the two counters can never collide in Play's single shared versionCode space.
 */
export const PRODUCTION_VERSION_CODE_OFFSET = 1_000_000;

/**
 * Resolve the Android `versionCode` baked into the build at prebuild time.
 *
 * CI sets `ANDROID_VERSION_CODE` from `GITHUB_RUN_NUMBER` (production adds
 * {@link PRODUCTION_VERSION_CODE_OFFSET}; see the release workflows). Local
 * builds, where the env var is absent or invalid, fall back to the current Unix
 * timestamp so the generated native project always has a valid, ever-increasing
 * positive integer.
 */
export function resolveAndroidVersionCode(
  env: Record<string, string | undefined> = process.env
): number {
  const raw = env.ANDROID_VERSION_CODE;
  if (raw !== undefined) {
    const parsed = Number(raw);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return Math.floor(Date.now() / 1000);
}

/**
 * Fold the display name into the Unicode form Expo's iOS project namer can
 * sanitise correctly (Story 21.1).
 *
 * `expo.name` feeds two consumers that want very different things from it:
 *
 * 1. The **user-visible label** — iOS `CFBundleDisplayName`, Android `app_name`
 *    — which takes the string verbatim, accent and all.
 * 2. The **iOS build namespace** — `ios/<name>.xcodeproj`, its source folder,
 *    the shared scheme, the Xcode target and `PRODUCT_NAME` — which takes
 *    `IOSConfig.XcodeUtils.sanitizedName()`:
 *
 *      name.replace(/[\W_]+/g, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
 *
 * That pipeline is *designed* to fold an accented letter down to its base
 * letter — the `NFD` decomposition plus the combining-mark strip exist for no
 * other reason. But it strips `\W` **first**, and a precomposed `ì` (U+00EC) is
 * `\W`, so the whole character is deleted before the fold ever sees it:
 * `'Cardì'` sanitises to `'Card'`, losing the letter and not just the accent.
 * Verified against @expo/config-plugins 55.0.8.
 *
 * Supplying the name already decomposed (`i` + U+0300 COMBINING GRAVE ACCENT)
 * puts the base letter outside `\W`, so the strip removes only the combining
 * mark and the fold lands where it was always meant to: `'Cardi'`.
 *
 * The label is unaffected. NFC and NFD are canonically equivalent and render
 * identically, so the home screen still reads `Cardì` on both platforms.
 *
 * ⚠️ **Delete this and the iOS project silently becomes `ios/Card.xcodeproj`**,
 * breaking every `ios/Cardi.xcodeproj` reference in `fastlane/Fastfile`,
 * `package.json` and `scripts/lib/watch-xcodebuild.sh` — and nothing else goes
 * red, because the name a user sees is identical either way. `app.config.test.ts`
 * guards both halves against the real upstream sanitiser.
 *
 * This is also why the user-visible iOS strings are literals rather than
 * `$(PRODUCT_NAME)`: `PRODUCT_NAME` is the *sanitised* name, so a permission
 * prompt built from it would read "Allow Cardi to…", without the accent.
 *
 * ⚠️ **This is the whole resolved config, so `Constants.expoConfig?.name` is NFD at
 * runtime** — six UTF-16 units, not the five of the precomposed `'Cardì'` literal used
 * everywhere else in this codebase. Nothing reads it today (only `.version`, in
 * `SettingsScreen` and `useExportData`), and `shared/components/launch/constants.ts`
 * reads `app.json` directly rather than the resolved config. If that changes, never
 * compare it with `===` or measure it with `.length` against a precomposed literal;
 * `.normalize('NFC')` first. `app.config.test.ts` pins that shape.
 */
export function resolveAppName(name: string): string {
  return name.normalize('NFD');
}

// `config` is the resolved static config from `app.json`, supplied by Expo.
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  name: resolveAppName((config as ExpoConfig).name),
  android: {
    ...config.android,
    versionCode: resolveAndroidVersionCode()
  }
});
