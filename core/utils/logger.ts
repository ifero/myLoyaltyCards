import * as Sentry from '@sentry/react-native';

/**
 * Logging wrapper (Story 16.2).
 *
 * The single sanctioned logging sink for the app — direct `console.*` use is
 * banned by ESLint (`no-console`) everywhere except this module.
 *
 * Behaviour:
 * - `info` / `warn` are development-only (gated on `__DEV__`): they keep noise
 *   out of production and never transmit anything off-device.
 * - `error` ALWAYS logs to the console (so failures are never silently
 *   swallowed) and, in production builds (`!__DEV__`), routes the failure to
 *   Sentry via `captureException` so production error reporting actually fires.
 *
 * PII / card data must never reach Sentry — payload scrubbing is enforced
 * centrally by the `beforeSend` hook configured in `Sentry.init` (app/_layout).
 */

/**
 * Derive the exception passed to Sentry from the logger's variadic args.
 *
 * Prefers the first real `Error` so Sentry gets a proper stack trace; otherwise
 * synthesises an `Error` from the stringified arguments. Non-error args are
 * attached as `extra.context` for debugging (scrubbed by `beforeSend`).
 */
const captureError = (args: unknown[]): void => {
  const errorArg = args.find((arg): arg is Error => arg instanceof Error);
  const context = args.filter((arg) => !(arg instanceof Error));

  const exception =
    errorArg ?? new Error(context.map((arg) => String(arg)).join(' ') || 'Unknown error');

  Sentry.captureException(exception, context.length > 0 ? { extra: { context } } : undefined);
};

export const logger = {
  info: (...args: unknown[]) => {
    if (__DEV__) {
      console.info(...args);
    }
  },
  warn: (...args: unknown[]) => {
    if (__DEV__) {
      console.warn(...args);
    }
  },
  error: (...args: unknown[]) => {
    console.error(...args);
    if (!__DEV__) {
      captureError(args);
    }
  }
};
