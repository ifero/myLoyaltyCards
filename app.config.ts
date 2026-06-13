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

// `config` is the resolved static config from `app.json`, supplied by Expo.
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  android: {
    ...config.android,
    versionCode: resolveAndroidVersionCode()
  }
});
