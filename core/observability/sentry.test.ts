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
