import type { ConfigContext } from 'expo/config';
import { IOSConfig } from 'expo/config-plugins';

import appConfig, {
  PRODUCTION_VERSION_CODE_OFFSET,
  resolveAndroidVersionCode,
  resolveAppName
} from './app.config';

/**
 * The real sanitiser `expo prebuild` applies to `expo.name` to derive
 * `ios/<name>.xcodeproj`, its source folder, the shared scheme, the Xcode target
 * and `PRODUCT_NAME`. Imported rather than re-implemented so these tests cannot
 * drift from the upstream behaviour they exist to pin.
 */
const { sanitizedName } = IOSConfig.XcodeUtils;

/**
 * Asserts that the resolver fell back to the Unix-timestamp path: a positive
 * integer captured within the window the call was made (deterministic, no flake).
 */
function expectTimestampFallback(env: Record<string, string | undefined>): void {
  const before = Math.floor(Date.now() / 1000);
  const code = resolveAndroidVersionCode(env);
  const after = Math.floor(Date.now() / 1000);
  expect(Number.isInteger(code)).toBe(true);
  expect(code).toBeGreaterThanOrEqual(before);
  expect(code).toBeLessThanOrEqual(after);
}

describe('resolveAndroidVersionCode', () => {
  it('uses ANDROID_VERSION_CODE when it is a positive integer', () => {
    expect(resolveAndroidVersionCode({ ANDROID_VERSION_CODE: '42' })).toBe(42);
  });

  it('accepts large run-number-derived values (production offset band)', () => {
    expect(resolveAndroidVersionCode({ ANDROID_VERSION_CODE: String(1_000_123) })).toBe(1_000_123);
  });

  it('falls back to a Unix timestamp when the env var is unset', () => {
    expectTimestampFallback({});
  });

  it('falls back when the value is an empty string', () => {
    // '' !== undefined, so this enters the parse branch (distinct from "unset")
    // yet must still fall back: Number('') === 0, which fails the > 0 guard.
    expectTimestampFallback({ ANDROID_VERSION_CODE: '' });
  });

  it('falls back when the value is not a number', () => {
    expectTimestampFallback({ ANDROID_VERSION_CODE: 'not-a-number' });
  });

  it('falls back when the value has trailing garbage', () => {
    expectTimestampFallback({ ANDROID_VERSION_CODE: '42abc' });
  });

  it('falls back when the value is zero or negative (invalid versionCode)', () => {
    expectTimestampFallback({ ANDROID_VERSION_CODE: '0' });
    expectTimestampFallback({ ANDROID_VERSION_CODE: '-3' });
  });

  it('falls back when the value is a non-integer', () => {
    expectTimestampFallback({ ANDROID_VERSION_CODE: '1.5' });
  });
});

describe('PRODUCTION_VERSION_CODE_OFFSET', () => {
  it('is the documented 1,000,000 band so prod never collides with beta', () => {
    expect(PRODUCTION_VERSION_CODE_OFFSET).toBe(1_000_000);
  });
});

describe('app.config default export', () => {
  const context = {
    config: {
      name: 'Cardì',
      slug: 'myloyaltycards',
      android: { package: 'com.iferoporefi.myloyaltycards' }
    }
  } as unknown as ConfigContext;

  afterEach(() => {
    delete process.env.ANDROID_VERSION_CODE;
  });

  it('sets android.versionCode from the resolver', () => {
    process.env.ANDROID_VERSION_CODE = '777';
    expect(appConfig(context).android?.versionCode).toBe(777);
  });

  it('preserves the existing android config (e.g. package)', () => {
    process.env.ANDROID_VERSION_CODE = '777';
    expect(appConfig(context).android?.package).toBe('com.iferoporefi.myloyaltycards');
  });

  it('preserves base identity fields from app.json', () => {
    const result = appConfig(context);
    // Canonically equal to the name in app.json, so the label a user sees is
    // unchanged; see resolveAppName for why the stored form is decomposed.
    expect(result.name.normalize('NFC')).toBe('Cardì');
    expect(result.slug).toBe('myloyaltycards');
  });

  it('yields an iOS project name of "Cardi", which the build references hardcode', () => {
    // fastlane/Fastfile, package.json's watch:build:ci and
    // scripts/lib/watch-xcodebuild.sh all name ios/Cardi.xcodeproj. If this
    // drifts, they break — and nothing user-visible changes to signal it.
    expect(sanitizedName(appConfig(context).name)).toBe('Cardi');
  });
});

describe('resolveAppName', () => {
  it('keeps the name canonically equal to the product name', () => {
    // NFC and NFD are canonically equivalent: the home screen reads `Cardì` either way.
    expect(resolveAppName('Cardì').normalize('NFC')).toBe('Cardì');
  });

  it('decomposes the name so Expo folds the accent instead of deleting the letter', () => {
    expect(sanitizedName(resolveAppName('Cardì'))).toBe('Cardi');
  });

  it('is not === the precomposed literal, which is the runtime trap to know about', () => {
    // `Constants.expoConfig?.name` holds exactly this at runtime. Nothing reads it
    // today, so this is a tripwire rather than a regression guard: a future `===`
    // against a precomposed 'Cardì', or a `.length`-based truncation, silently
    // misbehaves. Normalise before comparing.
    expect(resolveAppName('Cardì')).not.toBe('Cardì');
    expect(resolveAppName('Cardì')).toHaveLength('Cardì'.length + 1);
  });

  it('pins the upstream trap it exists to avoid', () => {
    // Precomposed U+00EC is `\W`, and sanitizedName strips `\W` BEFORE it
    // normalises to NFD — so the whole character goes, not just the accent.
    // Passing the raw name through would name the project ios/Card.xcodeproj.
    expect(sanitizedName('Cardì')).toBe('Card');
  });
});
