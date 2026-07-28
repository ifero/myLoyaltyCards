/**
 * Tests for the logging wrapper (Story 16.2).
 *
 * `@sentry/react-native` is mocked globally in jest.setup.js, so
 * `Sentry.captureException` here is a jest mock we can assert against.
 */
import * as Sentry from '@sentry/react-native';

import { logger } from './logger';

const mockedCaptureException = jest.mocked(Sentry.captureException);
const mockedCaptureMessage = jest.mocked(Sentry.captureMessage);

// `__DEV__` defaults to true under the react-native Jest preset. Each block
// sets it explicitly and restores it so the prod/dev branches are exercised
// deterministically and never leak between tests.
declare const global: { __DEV__: boolean } & typeof globalThis;
const originalDev = global.__DEV__;

describe('logger', () => {
  let infoSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    infoSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
    global.__DEV__ = originalDev;
  });

  describe('in development (__DEV__ = true)', () => {
    beforeEach(() => {
      global.__DEV__ = true;
    });

    it('info logs to console.info', () => {
      logger.info('hello', 1);
      expect(infoSpy).toHaveBeenCalledWith('hello', 1);
    });

    it('warn logs to console.warn', () => {
      logger.warn('careful', { a: 1 });
      expect(warnSpy).toHaveBeenCalledWith('careful', { a: 1 });
    });

    it('error logs to console.error but does NOT call Sentry', () => {
      logger.error('boom');
      expect(errorSpy).toHaveBeenCalledWith('boom');
      expect(mockedCaptureException).not.toHaveBeenCalled();
    });

    it('notify logs to console.warn and does NOT transmit to Sentry (Story 16.14, AC5)', () => {
      const err = new Error('update stalled');
      logger.notify('Expo update check failed:', { context: [err] });

      expect(warnSpy).toHaveBeenCalledWith('Expo update check failed:', err);
      expect(mockedCaptureMessage).not.toHaveBeenCalled();
      expect(mockedCaptureException).not.toHaveBeenCalled();
    });

    it('notify logs the bare message when called with no options', () => {
      logger.notify('Expo update check failed:');
      expect(warnSpy).toHaveBeenCalledWith('Expo update check failed:');
    });

    it('notify logs tags with no context in dev (pins the spread when only one field is set)', () => {
      logger.notify('Expo update check failed:', { tags: { otaFailureKind: 'error' } });
      expect(warnSpy).toHaveBeenCalledWith('Expo update check failed:', {
        otaFailureKind: 'error'
      });
    });

    it('notify surfaces tags in the dev console too, so local runs show the classification', () => {
      const err = new Error('update stalled');
      logger.notify('Expo update check failed:', {
        tags: { otaFailureKind: 'timeout' },
        context: [err]
      });

      expect(warnSpy).toHaveBeenCalledWith('Expo update check failed:', err, {
        otaFailureKind: 'timeout'
      });
    });
  });

  describe('in production (__DEV__ = false)', () => {
    beforeEach(() => {
      global.__DEV__ = false;
    });

    it('info is suppressed (no console output)', () => {
      logger.info('hello');
      expect(infoSpy).not.toHaveBeenCalled();
    });

    it('warn is suppressed (no console output)', () => {
      logger.warn('careful');
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('error still logs to console.error', () => {
      logger.error('boom');
      expect(errorSpy).toHaveBeenCalledWith('boom');
    });

    it('error forwards the first Error argument to Sentry with a stack trace', () => {
      const err = new Error('kaboom');
      logger.error('context message', err);

      expect(mockedCaptureException).toHaveBeenCalledTimes(1);
      const [captured, hint] = mockedCaptureException.mock.calls[0]!;
      expect(captured).toBe(err);
      expect(hint).toEqual({ extra: { context: ['context message'] } });
    });

    it('error forwards a lone Error with no extra context (hint omitted)', () => {
      const err = new Error('lonely');
      logger.error(err);

      expect(mockedCaptureException).toHaveBeenCalledTimes(1);
      const [captured, hint] = mockedCaptureException.mock.calls[0]!;
      expect(captured).toBe(err);
      expect(hint).toBeUndefined();
    });

    it('error captures the first Error and intentionally drops additional Error args', () => {
      const first = new Error('first');
      const second = new Error('second');
      logger.error(first, second);

      expect(mockedCaptureException).toHaveBeenCalledTimes(1);
      const [captured, hint] = mockedCaptureException.mock.calls[0]!;
      // Documented behaviour: the first Error becomes the captured exception;
      // additional Errors are filtered out of context and not re-attached.
      expect(captured).toBe(first);
      expect(hint).toBeUndefined();
    });

    it('error synthesises an Error from string args when none is an Error', () => {
      logger.error('plain', 'message');

      expect(mockedCaptureException).toHaveBeenCalledTimes(1);
      const [captured, hint] = mockedCaptureException.mock.calls[0]!;
      expect(captured).toBeInstanceOf(Error);
      expect((captured as Error).message).toBe('plain message');
      expect(hint).toEqual({ extra: { context: ['plain', 'message'] } });
    });

    it('error synthesises a fallback Error when called with no args', () => {
      logger.error();

      expect(mockedCaptureException).toHaveBeenCalledTimes(1);
      const [captured, hint] = mockedCaptureException.mock.calls[0]!;
      expect(captured).toBeInstanceOf(Error);
      expect((captured as Error).message).toBe('Unknown error');
      expect(hint).toBeUndefined();
    });

    it('notify emits a warning-level Sentry message with the context attached (Story 16.14, AC1, AC2)', () => {
      const err = new Error('update stalled');
      logger.notify('Expo update check failed:', { context: [err] });

      expect(mockedCaptureMessage).toHaveBeenCalledTimes(1);
      expect(mockedCaptureMessage).toHaveBeenCalledWith('Expo update check failed:', {
        level: 'warning',
        extra: { context: [err] }
      });
    });

    it('notify forwards tags so a failure variant is searchable in Sentry (Story 16.14, AD-16-14-02)', () => {
      // Tags are the indexed field; the message is a fixed grouping key, so this
      // is the ONLY part of the payload a maintainer can filter or chart on.
      const err = new Error('Expo update download timed out');
      logger.notify('Expo update download/reload failed:', {
        tags: { otaFailureKind: 'timeout' },
        context: [err]
      });

      expect(mockedCaptureMessage).toHaveBeenCalledWith('Expo update download/reload failed:', {
        level: 'warning',
        extra: { context: [err] },
        tags: { otaFailureKind: 'timeout' }
      });
    });

    it('notify omits tags entirely when none are supplied', () => {
      logger.notify('Expo update check failed:', { context: [new Error('x')] });

      const [, captureContext] = mockedCaptureMessage.mock.calls[0]!;
      expect(captureContext).not.toHaveProperty('tags');
    });

    it('notify accepts tags with no context', () => {
      logger.notify('Expo update check failed:', { tags: { otaFailureKind: 'error' } });

      expect(mockedCaptureMessage).toHaveBeenCalledWith('Expo update check failed:', {
        level: 'warning',
        tags: { otaFailureKind: 'error' }
      });
    });

    it('notify is non-fatal: it never captures an exception (Story 16.14, AC3)', () => {
      logger.notify('Expo update download/reload failed:', {
        context: [new Error('timed out')]
      });

      expect(mockedCaptureException).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('notify omits extra entirely when called with no options at all', () => {
      logger.notify('Expo update check failed:');

      expect(mockedCaptureMessage).toHaveBeenCalledTimes(1);
      expect(mockedCaptureMessage).toHaveBeenCalledWith('Expo update check failed:', {
        level: 'warning'
      });
    });

    it('notify omits extra when context is present but empty', () => {
      logger.notify('Expo update check failed:', { context: [] });

      const [, captureContext] = mockedCaptureMessage.mock.calls[0]!;
      expect(captureContext).toEqual({ level: 'warning' });
    });

    it('notify omits tags when tags is present but empty (an empty object is truthy)', () => {
      logger.notify('Expo update check failed:', { tags: {}, context: [] });

      const [, captureContext] = mockedCaptureMessage.mock.calls[0]!;
      expect(captureContext).toEqual({ level: 'warning' });
    });

    it('notify preserves every context entry in order', () => {
      const err = new Error('boom');
      logger.notify('msg', { context: ['first', err, { attempt: 2 }] });

      const [, captureContext] = mockedCaptureMessage.mock.calls[0]!;
      expect(captureContext).toEqual({
        level: 'warning',
        extra: { context: ['first', err, { attempt: 2 }] }
      });
    });

    it('notify does not write to the console in production', () => {
      logger.notify('Expo update check failed:', { context: [new Error('x')] });
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('notify swallows a throwing Sentry SDK rather than escalating to the caller (Story 16.14, AC3)', () => {
      // AC3 says the signal MUST NOT crash or reach the boot-error screen. The
      // OTA catches that call notify sit inside initializeApp's outer try, so a
      // synchronous throw out of captureMessage would set dbError and render
      // that screen — a telemetry failure taking down boot.
      mockedCaptureMessage.mockImplementationOnce(() => {
        throw new Error('Sentry transport exploded');
      });

      expect(() =>
        logger.notify('Expo update check failed:', { context: [new Error('x')] })
      ).not.toThrow();
      // Silently dropped, not re-reported: escalating here would convert a lost
      // warning into a captured exception and could re-enter the failing SDK.
      expect(mockedCaptureException).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('notify rejects a non-literal message at compile time (Story 16.14, grouping-key guard)', () => {
      // The `FixedMessage` guard on `logger.notify` is a compile-time promise:
      // a message built from runtime data would shard one Sentry issue into
      // many. These two `@ts-expect-error` directives are the regression lock —
      // `yarn typecheck` reads this file, so if the guard is ever weakened the
      // directives become unused and the build FAILS. The calls still run, so
      // this doubles as proof the guard costs nothing at runtime.
      const runtimeDetail: string = 'network unreachable';

      // @ts-expect-error — interpolating a `string` widens the message type.
      logger.notify(`Expo update check failed: ${runtimeDetail}`);
      // @ts-expect-error — a `string`-typed variable widens the same way.
      logger.notify(runtimeDetail);

      expect(mockedCaptureMessage).toHaveBeenCalledTimes(2);
    });

    it('notify rejects a non-literal TAG VALUE at compile time (Story 16.14, PII guard)', () => {
      // Tags are the one field `scrubEvent` does NOT redact, so a runtime value
      // here would leave the device unprotected. The same FixedMessage guard is
      // therefore applied per tag value, and this is its regression lock: if the
      // constraint is ever loosened these directives go unused and `yarn
      // typecheck` FAILS. Literal unions (what a classifier returns) must keep
      // compiling, which the un-suppressed call below asserts.
      const userEmail: string = 'person@example.com';
      const classified: 'timeout' | 'error' = 'timeout';

      // @ts-expect-error — a `string`-typed tag value is the PII hazard; rejected.
      logger.notify('Expo update check failed:', { tags: { email: userEmail } });
      // A literal union still compiles — the guard must not block real callers.
      logger.notify('Expo update check failed:', { tags: { otaFailureKind: classified } });

      expect(mockedCaptureMessage).toHaveBeenCalledTimes(2);
    });
  });
});
