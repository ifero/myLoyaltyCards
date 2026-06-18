/**
 * Sentry initialisation and PII scrubbing (Story 16.2).
 *
 * Sentry is configured per environment and MUST never receive PII or loyalty
 * card data (GDPR). All transmitted events pass through {@link scrubEvent} via
 * the `beforeSend` hook, which drops user identifiers and redacts any
 * sensitive-looking keys (card numbers, barcodes, tokens, emails, …) anywhere
 * in the event payload before it leaves the device.
 *
 * The actual error routing lives in `core/utils/logger.ts` (`logger.error`),
 * which calls `Sentry.captureException` only in production builds.
 */
import * as Sentry from '@sentry/react-native';
import type { ErrorEvent } from '@sentry/react-native';

/** Placeholder substituted for any redacted (sensitive) value. */
export const REDACTED = '[Redacted]';

/**
 * Keys whose values are considered sensitive and must be redacted before an
 * event is sent. Matched case-insensitively as a substring of the key, so e.g.
 * `cardNumber`, `card_number`, `rawBarcodeValue` and `accessToken` all match.
 *
 * Personal names are matched via their qualified forms (`firstName`,
 * `displayName`, `nickName`, …). A BARE `name` key is deliberately NOT matched:
 * in this loyalty-card domain `name` is overwhelmingly a store / card name
 * (e.g. "Tesco"), not PII, and redacting it would gut error diagnostics.
 */
const SENSITIVE_KEY_PATTERN =
  /barcode|card.?number|raw.?value|password|secret|token|email|api.?key|authorization|cookie|phone|first.?name|last.?name|full.?name|display.?name|user.?name|nick.?name/i;

/** Guard against pathological / cyclic payloads when walking the event tree. */
const MAX_REDACT_DEPTH = 10;

/**
 * Recursively redact sensitive values by key. Returns a new structure (objects
 * and arrays are cloned) so the original event object is never mutated in place
 * beyond the top-level reassignments in {@link scrubEvent}. Cycles and
 * excessive depth collapse to `REDACTED` rather than recursing forever.
 */
const redactValue = (value: unknown, depth: number, seen: WeakSet<object>): unknown => {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (depth >= MAX_REDACT_DEPTH || seen.has(value)) {
    return REDACTED;
  }
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, depth + 1, seen));
  }

  const result: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value)) {
    result[key] = SENSITIVE_KEY_PATTERN.test(key) ? REDACTED : redactValue(nested, depth + 1, seen);
  }
  return result;
};

/**
 * `beforeSend` scrubber: strip user identifiers and request payloads, then
 * redact sensitive keys throughout `extra` and `contexts`. Exported for tests.
 */
export const scrubEvent = (event: ErrorEvent): ErrorEvent => {
  // Work on a shallow clone so the caller's event object is never mutated (and
  // we don't `delete` on a potentially frozen SDK-owned object).
  const scrubbed: ErrorEvent = { ...event };

  // Never attach who the user is.
  delete scrubbed.user;
  delete scrubbed.request;

  if (scrubbed.extra) {
    scrubbed.extra = redactValue(scrubbed.extra, 0, new WeakSet()) as ErrorEvent['extra'];
  }
  if (scrubbed.contexts) {
    scrubbed.contexts = redactValue(scrubbed.contexts, 0, new WeakSet()) as ErrorEvent['contexts'];
  }

  return scrubbed;
};

/**
 * Initialise the Sentry SDK. Transmission is disabled in development
 * (`enabled: !__DEV__`) so only production builds report; the environment tag
 * still distinguishes the two for any locally-forced sends.
 */
export const initSentry = (): void => {
  Sentry.init({
    // Public client DSN, supplied via env (EXPO_PUBLIC_SENTRY_DSN) so builds can
    // target different projects without code changes. When absent, Sentry.init
    // disables transmission (no-op) rather than crashing — graceful degradation.
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    enabled: !__DEV__,
    environment: __DEV__ ? 'development' : 'production',
    // Do not let integrations attach PII (IP address, device name, …).
    sendDefaultPii: false,
    // Conservative tracing in production; full sampling while developing.
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    beforeSend: scrubEvent
  });
};
