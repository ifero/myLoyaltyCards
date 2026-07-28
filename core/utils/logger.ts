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
 * - `notify` is the "worth knowing about in production, but not an error"
 *   channel (Story 16.14): a dev console warning, and in production a
 *   NON-FATAL, warning-level Sentry message. It never captures an exception,
 *   so it neither reads as a crash nor triggers error alerting.
 * - `error` ALWAYS logs to the console (so failures are never silently
 *   swallowed) and, in production builds (`!__DEV__`), routes the failure to
 *   Sentry via `captureException` so production error reporting actually fires.
 *
 * PII / card data must never reach Sentry — payload scrubbing is enforced
 * centrally by the `beforeSend` hook configured in `Sentry.init` (app/_layout).
 * That hook covers messages as well as exceptions: the SDK applies `beforeSend`
 * to every event whose `type` is undefined, which includes `captureMessage`.
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

/**
 * Compile-time guard that admits only a fixed string literal.
 *
 * Sentry groups message events by their text, so a message built from
 * runtime-varying data would shard a single failure mode across many issues.
 * A literal (or `as const`) argument keeps its narrow type and passes; anything
 * that widens to `string` — a `string`-typed variable, or a template
 * interpolating one — resolves to `never` and fails to compile. That makes the
 * grouping key un-pollutable by construction rather than by comment discipline.
 */
type FixedMessage<M extends string> = string extends M ? never : M;

/**
 * Structured payload for {@link logger.notify}.
 *
 * `notify` takes a named object rather than the variadic `...args` of
 * `info`/`warn`/`error`, and the divergence is deliberate: those three are
 * console pass-throughs where every argument has the same destiny, whereas
 * `notify` builds a Sentry event in which each field lands somewhere different
 * and behaves differently. Naming them keeps the indexed field distinct from
 * the non-indexed one at every call site.
 */
type NotifyOptions<T extends Record<string, string>> = {
  /**
   * Indexed, searchable, LOW-cardinality key/values. Sentry can filter and
   * chart on tags, so this — not `context` — is how a failure *mode* becomes
   * countable independently of the grouping message.
   *
   * ⚠️ Tags are NOT scrubbed. `scrubEvent` (the `beforeSend` hook) redacts
   * `extra` and `contexts` only — it never walks `tags`. So unlike `context`,
   * nothing here is protected from leaving the device.
   *
   * Because that makes tags the one unguarded egress on this method, values are
   * constrained to string LITERALS the same way `message` is: each is passed
   * through {@link FixedMessage}, so a literal (or literal union, e.g. the
   * `'timeout' | 'error'` a classifier returns) compiles, while anything that
   * widens to `string` — a user's email, a card number, any runtime value —
   * resolves to `never` and fails to compile. That also keeps tag cardinality
   * bounded by construction. Runtime detail belongs in `context`, which IS
   * scrubbed.
   */
  tags?: T & { [K in keyof T]: FixedMessage<T[K]> };
  /**
   * Free-form diagnostic detail, attached as `extra.context` and scrubbed by
   * `beforeSend`. Invaluable when reading one event, but NOT indexed — so never
   * put the thing you need to aggregate on in here (use `tags`).
   */
  context?: unknown[];
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
  /**
   * Report a non-fatal condition that must stay visible in production.
   *
   * Unlike {@link logger.warn} (a `__DEV__`-only no-op in release builds), this
   * emits a standalone, countable Sentry event so the failure rate is
   * measurable in the field — the motivating case being boot-time OTA update
   * failures, which were previously invisible in production (Story 16.14).
   *
   * `message` must be a fixed string literal — {@link FixedMessage} enforces
   * that at compile time, because Sentry groups message events by their text.
   * Because the message is therefore constant per call site, the way to make a
   * *variant* of a failure countable is `options.tags` (indexed); free-form
   * detail goes in `options.context` (not indexed). See {@link NotifyOptions}.
   *
   * A breadcrumb was deliberately NOT used: breadcrumbs only transmit when a
   * later event is captured in the same session, and a boot-time update stall
   * usually has no follow-up error — the frequency would be undercounted.
   */
  notify: <M extends string, T extends Record<string, string>>(
    message: M & FixedMessage<M>,
    options?: NotifyOptions<T>
  ) => {
    const { tags, context } = options ?? {};
    // Both fields are omitted when they carry nothing, so an event never ships
    // an empty `extra`/`tags` shell. Symmetry matters: `{}` is truthy, so a bare
    // truthiness check on `tags` would leak `tags: {}` where `context: []` is
    // correctly suppressed.
    const hasContext = context !== undefined && context.length > 0;
    const hasTags = tags !== undefined && Object.keys(tags).length > 0;

    if (__DEV__) {
      console.warn(message, ...(hasContext ? context : []), ...(hasTags ? [tags] : []));
      return;
    }
    try {
      Sentry.captureMessage(message, {
        level: 'warning',
        ...(hasContext ? { extra: { context } } : {}),
        ...(hasTags ? { tags } : {})
      });
    } catch {
      // Reporting must never break the caller. `notify`'s first caller is the
      // boot path, where an escalating throw would surface the boot-error
      // screen — precisely what this signal is required NOT to do. Losing the
      // event is strictly better than that, and matches the pre-notify status
      // quo (these sites emitted nothing in production at all). Deliberately
      // silent: logger.error here would turn a dropped warning into a reported
      // exception, and could re-enter the same failing SDK.
    }
  },
  error: (...args: unknown[]) => {
    console.error(...args);
    if (!__DEV__) {
      captureError(args);
    }
  }
};
