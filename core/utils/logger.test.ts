/**
 * Tests for the logging wrapper (Story 16.2).
 *
 * `@sentry/react-native` is mocked globally in jest.setup.js, so
 * `Sentry.captureException` here is a jest mock we can assert against.
 */
import * as Sentry from '@sentry/react-native';

import { logger } from './logger';

const mockedCaptureException = jest.mocked(Sentry.captureException);

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
  });
});
