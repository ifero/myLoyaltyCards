/**
 * Phone-side wrapper around `react-native-watch-connectivity` for syncing the
 * loyalty-card list to a paired Apple Watch.
 *
 * Architecture (per Apple's WatchConnectivity guidance):
 *   - The phone publishes the *latest* card list as a `WCSession`
 *     `applicationContext` snapshot. Apple keeps only the most recent value
 *     and delivers it to the watch the next time the watch becomes reachable
 *     (even if the watch app isn't running).
 *   - The watch persists the snapshot into its own SwiftData store, so the
 *     watch app stays usable when the phone is off / out of range.
 *
 * Important quirks of the underlying library (`react-native-watch-connectivity`
 * v1.x) that this wrapper papers over:
 *   - `updateApplicationContext`, `transferUserInfo`, and `sendMessage` are
 *     all *synchronous* and return `void`. Awaiting them as Promises is a
 *     no-op and silently masks errors. We catch errors via the
 *     `application-context-error` / `activation-error` event channels
 *     instead.
 *   - The native iOS module auto-activates `WCSession` on first import, but
 *     the activation is async — pushes issued before activation completes
 *     can be dropped by the OS. We therefore cache the latest snapshot in
 *     memory and re-flush whenever the library reports a state transition
 *     (`paired`, `installed`, `reachability`).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-require-imports */

import type { LoyaltyCard } from './schemas';

type Unsubscribe = () => void;

interface NativeModule {
  updateApplicationContext?: (ctx: any) => void;
  transferUserInfo?: (info: any) => void;
  sendMessage?: (msg: any, replyCb?: (reply: any) => void, errCb?: (err: Error) => void) => void;
  getIsPaired?: () => Promise<boolean>;
  getIsWatchAppInstalled?: () => Promise<boolean>;
  getReachability?: () => Promise<boolean>;
  getApplicationContext?: () => Promise<any | null>;
  watchEvents?: {
    addListener: (event: string, cb: (payload: any) => void) => Unsubscribe;
  };
  // Older shapes used as fallback for tests / partial mocks
  addListener?: (event: string, cb: (payload: any) => void) => any;
  onMessage?: (cb: (msg: any) => void) => void;
  removeMessageListener?: (cb: (msg: any) => void) => void;
  subscribeToApplicationContext?: (cb: (msg: any) => void) => Unsubscribe;
}

let cachedNative: NativeModule | null | undefined;

function getNativeModule(): NativeModule | null {
  if (cachedNative !== undefined) return cachedNative;
  try {
    const pkg = require('react-native-watch-connectivity');
    // The package exports both named functions and a `watchEvents` default;
    // normalise into a single shape. Some test mocks pass a flat object.
    cachedNative = {
      updateApplicationContext: pkg.updateApplicationContext,
      transferUserInfo: pkg.transferUserInfo,
      sendMessage: pkg.sendMessage,
      getIsPaired: pkg.getIsPaired,
      getIsWatchAppInstalled: pkg.getIsWatchAppInstalled,
      getReachability: pkg.getReachability,
      getApplicationContext: pkg.getApplicationContext,
      watchEvents: pkg.watchEvents,
      addListener: pkg.addListener,
      onMessage: pkg.onMessage,
      removeMessageListener: pkg.removeMessageListener,
      subscribeToApplicationContext: pkg.subscribeToApplicationContext
    };
  } catch {
    cachedNative = null;
  }
  return cachedNative;
}

/** Test-only hook: drop the cached native module so a fresh `require` runs. */
export function __resetWatchConnectivityForTests(): void {
  cachedNative = undefined;
  latestSnapshot = null;
  diagnosticsRegistered = false;
  for (const off of diagnosticsUnsubscribers) {
    try {
      off();
    } catch {
      /* ignore */
    }
  }
  diagnosticsUnsubscribers.length = 0;
}

// Message schema used for phone <-> watch communication.
export type WatchMessage =
  | { type: 'requestCards' }
  | { type: 'cards'; payload: WatchCardPayload[] }
  | { type: 'syncCard'; payload: { id: string; cardData: any } }
  | { type: 'ack'; payload?: { id?: string } }
  | { type: string; payload?: any };

/**
 * Shape sent over the wire to the watch. Field names match the watch-side
 * `WatchCard` Codable struct in `targets/watch/CardListView.swift`.
 */
export interface WatchCardPayload {
  id: string;
  name: string;
  brandId: string | null;
  colorHex: string;
  barcodeValue: string;
  barcodeFormat: string;
  usageCount: number;
  lastUsedAt: string | null;
  createdAt: string;
}

type WatchTransportValue =
  | string
  | number
  | boolean
  | WatchTransportValue[]
  | { [key: string]: WatchTransportValue };

// ---------------------------------------------------------------------------
// State + diagnostics
// ---------------------------------------------------------------------------

let latestSnapshot: WatchCardPayload[] | null = null;
let diagnosticsRegistered = false;
const diagnosticsUnsubscribers: Unsubscribe[] = [];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function sanitizeWatchTransportValue(value: unknown): WatchTransportValue | undefined {
  if (value === null || value === undefined) return undefined;

  if (typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    const result: WatchTransportValue[] = [];
    for (const item of value) {
      const sanitized = sanitizeWatchTransportValue(item);
      if (sanitized !== undefined) {
        result.push(sanitized);
      }
    }
    return result;
  }

  if (isPlainObject(value)) {
    const result: Record<string, WatchTransportValue> = {};
    for (const [key, nestedValue] of Object.entries(value)) {
      const sanitized = sanitizeWatchTransportValue(nestedValue);
      if (sanitized !== undefined) {
        result[key] = sanitized;
      }
    }
    return result;
  }

  return undefined;
}

function sanitizeWatchTransportObject(
  value: Record<string, unknown>
): Record<string, WatchTransportValue> {
  const sanitized = sanitizeWatchTransportValue(value);
  if (!sanitized || Array.isArray(sanitized)) {
    return {};
  }
  return sanitized;
}

function subscribe(
  native: NativeModule,
  event: string,
  cb: (payload: any) => void
): Unsubscribe | null {
  const we = native.watchEvents;
  if (we && typeof we.addListener === 'function') {
    return we.addListener(event, cb);
  }
  if (typeof native.addListener === 'function') {
    const sub = native.addListener(event, cb);
    return () => {
      if (sub && typeof sub.remove === 'function') sub.remove();
    };
  }
  return null;
}

function ensureDiagnostics(native: NativeModule): void {
  if (diagnosticsRegistered) return;
  diagnosticsRegistered = true;

  // Errors — these are the signals we were missing entirely before.
  for (const ev of [
    'activation-error',
    'application-context-error',
    'application-context-received-error',
    'user-info-error',
    'file-received-error'
  ]) {
    const off = subscribe(native, ev, (payload) => {
      console.warn(`[watch-connectivity] ${ev}:`, payload);
    });
    if (off) diagnosticsUnsubscribers.push(off);
  }

  // State transitions — re-flush the latest snapshot whenever the watch
  // becomes reachable / paired / installed, since the previous flush may
  // have been dropped by the OS.
  for (const ev of ['reachability', 'paired', 'installed']) {
    const off = subscribe(native, ev, (value) => {
      console.info(`[watch-connectivity] ${ev}:`, value);
      if (value === true && latestSnapshot) {
        // best-effort re-push; flushSnapshot() re-checks paired+installed
        void flushSnapshot();
      }
    });
    if (off) diagnosticsUnsubscribers.push(off);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const isWatchConnectivityAvailable = (): boolean => {
  const native = getNativeModule();
  return (
    !!native &&
    (typeof native.sendMessage === 'function' ||
      typeof native.updateApplicationContext === 'function')
  );
};

/**
 * Send a one-shot message. Used for `requestCards` from watch and similar
 * interactive pings — NOT used for the snapshot push (that goes through
 * `pushCardsToWatch` -> `updateApplicationContext`).
 *
 * The library's `sendMessage` is synchronous (void). We model it as a
 * Promise<boolean> for ergonomics: resolves `true` if the call was issued,
 * `false` if no native module is available. Errors are surfaced via the
 * provided `errCb` and through the diagnostics channel.
 */
export async function sendMessageToWatch(message: WatchMessage): Promise<boolean> {
  const native = getNativeModule();
  if (!native) return false;
  ensureDiagnostics(native);
  const sanitizedMessage = sanitizeWatchTransportObject(message);

  if (typeof native.sendMessage === 'function') {
    try {
      native.sendMessage(sanitizedMessage, undefined, (err) => {
        console.warn('[watch-connectivity] sendMessage error:', err);
      });
      return true;
    } catch (err) {
      console.warn('[watch-connectivity] sendMessage threw:', err);
      return false;
    }
  }
  if (typeof native.updateApplicationContext === 'function') {
    try {
      native.updateApplicationContext(sanitizedMessage);
      return true;
    } catch (err) {
      console.warn('[watch-connectivity] updateApplicationContext threw:', err);
      return false;
    }
  }
  return false;
}

/**
 * Subscribe to messages sent from the watch (e.g. `requestCards`) and to
 * `applicationContext` updates if the library exposes them.
 */
export function subscribeToWatchMessages(handler: (msg: WatchMessage) => void): Unsubscribe {
  const native = getNativeModule();
  if (!native) return () => {};
  ensureDiagnostics(native);

  const unsubscribers: Unsubscribe[] = [];

  // Modern API: watchEvents.addListener('message', cb)
  const we = native.watchEvents;
  if (we && typeof we.addListener === 'function') {
    const off = we.addListener('message', handler);
    if (typeof off === 'function') unsubscribers.push(off);
    const ctxOff = we.addListener('application-context', handler);
    if (typeof ctxOff === 'function') unsubscribers.push(ctxOff);
  } else if (typeof native.addListener === 'function') {
    // Older / mocked API: addListener('message', cb)
    const sub = native.addListener('message', handler);
    unsubscribers.push(() => {
      if (sub && typeof sub.remove === 'function') sub.remove();
    });
  } else if (typeof native.onMessage === 'function') {
    native.onMessage(handler);
    unsubscribers.push(() => {
      if (typeof native.removeMessageListener === 'function') {
        native.removeMessageListener(handler);
      }
    });
  }

  if (typeof native.subscribeToApplicationContext === 'function') {
    const off = native.subscribeToApplicationContext(handler);
    if (typeof off === 'function') unsubscribers.push(off);
  }

  return () => {
    for (const off of unsubscribers) {
      try {
        off();
      } catch {
        /* ignore */
      }
    }
  };
}

export function requestCardsFromPhone(): Promise<boolean> {
  return sendMessageToWatch({ type: 'requestCards' });
}

export function syncCardToWatch(id: string, cardData: any): Promise<boolean> {
  return sendMessageToWatch({ type: 'syncCard', payload: { id, cardData } });
}

function toWatchCardPayload(card: LoyaltyCard): WatchCardPayload {
  return {
    id: card.id,
    name: card.name,
    brandId: card.brandId,
    colorHex: card.color,
    barcodeValue: card.barcode,
    barcodeFormat: card.barcodeFormat,
    usageCount: card.usageCount ?? 0,
    lastUsedAt: card.lastUsedAt ?? null,
    createdAt: card.createdAt
  };
}

/**
 * Internal: try to push the cached `latestSnapshot` to the watch. Gates the
 * push on `getIsPaired() && getIsWatchAppInstalled()` so we don't waste
 * cycles when there's no watch listening. When either check is unavailable
 * we proceed optimistically (the pre-libary check is best-effort).
 */
async function flushSnapshot(): Promise<boolean> {
  const native = getNativeModule();
  if (!native || !latestSnapshot) return false;

  // Gating: skip when the device says no watch is paired / app not installed.
  try {
    if (typeof native.getIsPaired === 'function') {
      const paired = await native.getIsPaired();
      if (paired === false) return false;
    }
    if (typeof native.getIsWatchAppInstalled === 'function') {
      const installed = await native.getIsWatchAppInstalled();
      if (installed === false) return false;
    }
  } catch {
    /* If the gate-check API throws, fall through and try anyway. */
  }

  const message = sanitizeWatchTransportObject({ type: 'cards', payload: latestSnapshot });

  if (typeof native.updateApplicationContext === 'function') {
    try {
      native.updateApplicationContext(message);
      return true;
    } catch (err) {
      console.warn('[watch-connectivity] updateApplicationContext threw:', err);
    }
  }
  // Defensive fallback: queued user info. Not snapshot semantics, but at
  // least the watch will eventually see something. Only used if the library
  // doesn't expose `updateApplicationContext` (shouldn't happen on v1.x).
  if (typeof native.transferUserInfo === 'function') {
    try {
      native.transferUserInfo(message);
      return true;
    } catch (err) {
      console.warn('[watch-connectivity] transferUserInfo threw:', err);
    }
  }
  return false;
}

/**
 * Publish the full card list to the paired watch as a snapshot. Replaces
 * any prior snapshot — last-write-wins per Apple's `applicationContext`
 * contract. Best-effort; if the watch is unavailable now, the snapshot is
 * cached and re-flushed when the library next reports `reachability`,
 * `paired`, or `installed`.
 */
export async function pushCardsToWatch(cards: LoyaltyCard[]): Promise<boolean> {
  latestSnapshot = cards.map(toWatchCardPayload);
  const native = getNativeModule();
  if (!native) return false;
  ensureDiagnostics(native);
  return flushSnapshot();
}

export default {
  isWatchConnectivityAvailable,
  sendMessageToWatch,
  subscribeToWatchMessages,
  requestCardsFromPhone,
  syncCardToWatch,
  pushCardsToWatch,
  __resetWatchConnectivityForTests
};
