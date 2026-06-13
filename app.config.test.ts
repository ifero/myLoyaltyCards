import type { ConfigContext } from 'expo/config';

import appConfig, { PRODUCTION_VERSION_CODE_OFFSET, resolveAndroidVersionCode } from './app.config';

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
      name: 'myLoyaltyCards',
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
    expect(result.name).toBe('myLoyaltyCards');
    expect(result.slug).toBe('myloyaltycards');
  });
});
