/**
 * Tests for Sentry PII scrubbing and initialisation (Story 16.2).
 *
 * `@sentry/react-native` is mocked globally in jest.setup.js.
 */
import * as Sentry from '@sentry/react-native';

import { initSentry, REDACTED, scrubEvent } from './sentry';

const mockedInit = jest.mocked(Sentry.init);

declare const global: { __DEV__: boolean } & typeof globalThis;
const originalDev = global.__DEV__;

afterEach(() => {
  global.__DEV__ = originalDev;
});

describe('scrubEvent', () => {
  it('drops user identifiers and the request payload', () => {
    const event = {
      user: { id: 'user-123', email: 'a@b.com' },
      request: { url: 'https://x', data: { foo: 'bar' } }
    } as unknown as Parameters<typeof scrubEvent>[0];

    const result = scrubEvent(event);

    expect(result.user).toBeUndefined();
    expect(result.request).toBeUndefined();
    // The caller's event must NOT be mutated (scrubEvent shallow-clones).
    expect(event.user).toBeDefined();
    expect(event.request).toBeDefined();
  });

  it('redacts sensitive keys (card data, tokens, email) inside extra', () => {
    const event = {
      extra: {
        cardNumber: '1234 5678 9012 3456',
        rawBarcodeValue: 'AZ-99887766',
        accessToken: 'secret-token',
        userEmail: 'person@example.com',
        storeName: 'Acme Rewards'
      }
    } as unknown as Parameters<typeof scrubEvent>[0];

    const { extra } = scrubEvent(event);

    expect(extra?.cardNumber).toBe(REDACTED);
    expect(extra?.rawBarcodeValue).toBe(REDACTED);
    expect(extra?.accessToken).toBe(REDACTED);
    expect(extra?.userEmail).toBe(REDACTED);
    // Non-sensitive keys are preserved for debugging.
    expect(extra?.storeName).toBe('Acme Rewards');
  });

  it('redacts sensitive keys nested deep inside arrays and objects', () => {
    const event = {
      extra: {
        context: [{ card: { barcode: 'TOPSECRET', label: 'Tesco' } }]
      }
    } as unknown as Parameters<typeof scrubEvent>[0];

    const { extra } = scrubEvent(event);
    const context = (extra as Record<string, unknown>).context as Array<{
      card: Record<string, unknown>;
    }>;

    expect(context[0]?.card.barcode).toBe(REDACTED);
    expect(context[0]?.card.label).toBe('Tesco');
  });

  it('scrubs contexts as well as extra', () => {
    const event = {
      contexts: { payment: { cardNumber: '4111111111111111' } }
    } as unknown as Parameters<typeof scrubEvent>[0];

    const { contexts } = scrubEvent(event);

    expect((contexts?.payment as Record<string, unknown>).cardNumber).toBe(REDACTED);
  });

  it('collapses cyclic references to REDACTED without corrupting sibling keys', () => {
    const cyclic: Record<string, unknown> = { label: 'loop' };
    cyclic.self = cyclic;
    const event = { extra: { cyclic } } as unknown as Parameters<typeof scrubEvent>[0];

    let result!: ReturnType<typeof scrubEvent>;
    expect(() => {
      result = scrubEvent(event);
    }).not.toThrow();

    const scrubbed = (result.extra as { cyclic: Record<string, unknown> }).cyclic;
    expect(scrubbed.self).toBe(REDACTED); // back-reference broken
    expect(scrubbed.label).toBe('loop'); // non-cyclic sibling preserved
  });

  it('leaves an event without extra/contexts untouched', () => {
    const event = {} as unknown as Parameters<typeof scrubEvent>[0];
    expect(scrubEvent(event)).toEqual({});
  });

  it('does NOT redact tags — documents a real gap, so callers never put PII there (Story 16.14, AD-16-14-02)', () => {
    // scrubEvent walks `extra` and `contexts` only. `tags` are passed straight
    // through, so the scrubber offers them NO protection. This is pinned rather
    // than fixed: extending redaction to tags would change a shared hook used by
    // every event. The contract instead lives on `NotifyOptions.tags` — tag
    // values must be caller-controlled literals (e.g. 'timeout' | 'error'),
    // never runtime data. If this test ever starts failing because tags DID get
    // redacted, that is an improvement — update the docs on NotifyOptions.tags.
    const event = {
      tags: { otaFailureKind: 'timeout', userEmail: 'person@example.com' }
    } as unknown as Parameters<typeof scrubEvent>[0];

    const { tags } = scrubEvent(event);

    expect(tags?.otaFailureKind).toBe('timeout');
    expect(tags?.userEmail).toBe('person@example.com'); // NOT redacted — by design of scrubEvent's scope
  });

  it('scrubs a captureMessage-shaped event, not just exceptions (Story 16.14, AC4)', () => {
    // `logger.notify` emits via `Sentry.captureMessage`. The SDK applies
    // `beforeSend` to every event whose `type` is undefined — message events
    // included — so the scrubber is the same single authority for both. This
    // pins that the notify payload shape (message + level + extra.context, with
    // Errors already flattened to plain objects by the SDK's normalize step)
    // survives scrubbing with its diagnostics intact and its PII gone.
    const event = {
      message: 'Expo update download/reload failed:',
      level: 'warning',
      user: { id: 'user-123' },
      extra: {
        context: [
          { name: 'Error', message: 'Expo update download timed out', stack: 'at initializeApp' },
          { cardNumber: '1234 5678 9012 3456', accessToken: 'tok', storeName: 'Acme Rewards' }
        ]
      }
    } as unknown as Parameters<typeof scrubEvent>[0];

    const scrubbed = scrubEvent(event);
    const context = (scrubbed.extra as { context: Array<Record<string, unknown>> }).context;

    // Identity of the user never leaves the device...
    expect(scrubbed.user).toBeUndefined();
    // ...nor does anything card-shaped or credential-shaped...
    expect(context[1]?.cardNumber).toBe(REDACTED);
    expect(context[1]?.accessToken).toBe(REDACTED);
    // ...while the diagnostics that make the signal actionable are preserved.
    expect(context[0]?.message).toBe('Expo update download timed out');
    expect(context[0]?.stack).toBe('at initializeApp');
    expect(context[1]?.storeName).toBe('Acme Rewards');
    expect(scrubbed.message).toBe('Expo update download/reload failed:');
    expect(scrubbed.level).toBe('warning');
  });
});

describe('initSentry', () => {
  const TEST_DSN = 'https://examplePublicKey@o0.ingest.sentry.io/0';
  const originalDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

  // Each case inspects mock.calls[0]; clear so the two runs stay isolated. The
  // DSN is read from env at init time, so set it here and restore afterwards.
  beforeEach(() => {
    mockedInit.mockClear();
    process.env.EXPO_PUBLIC_SENTRY_DSN = TEST_DSN;
  });

  afterEach(() => {
    process.env.EXPO_PUBLIC_SENTRY_DSN = originalDsn;
  });

  it('initialises with transmission disabled and dev environment in development', () => {
    global.__DEV__ = true;
    initSentry();

    expect(mockedInit).toHaveBeenCalledTimes(1);
    const options = mockedInit.mock.calls[0]![0];
    expect(options.enabled).toBe(false);
    expect(options.environment).toBe('development');
    expect(options.sendDefaultPii).toBe(false);
    expect(options.beforeSend).toBe(scrubEvent);
    expect(options.dsn).toBe(TEST_DSN);
  });

  it('passes through an undefined DSN when the env var is unset (graceful no-op)', () => {
    delete process.env.EXPO_PUBLIC_SENTRY_DSN;
    global.__DEV__ = false;
    initSentry();

    const options = mockedInit.mock.calls[0]![0];
    expect(options.dsn).toBeUndefined();
  });

  it('enables transmission with production environment in a release build', () => {
    global.__DEV__ = false;
    initSentry();

    const options = mockedInit.mock.calls[0]![0];
    expect(options.enabled).toBe(true);
    expect(options.environment).toBe('production');
    // PII guards must hold in the prod branch too — this is where it matters.
    expect(options.sendDefaultPii).toBe(false);
    expect(options.beforeSend).toBe(scrubEvent);
  });
});
