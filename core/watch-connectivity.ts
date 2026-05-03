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
  lastPushAt = null;
  lastErrorMessage = null;
  lastReachability = null;
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

// ---------------------------------------------------------------------------
// State + diagnostics
// ---------------------------------------------------------------------------

let latestSnapshot: WatchCardPayload[] | null = null;
let diagnosticsRegistered = false;
const diagnosticsUnsubscribers: Unsubscribe[] = [];

// Live diagnostics — read by `getWatchDiagnostics()` for the in-app debug
// screen. They carry no functional weight; treat them as a sliding window of
// "what happened most recently."
let lastPushAt: number | null = null;
let lastErrorMessage: string | null = null;
let lastReachability: boolean | null = null;

function describeError(payload: unknown): string {
  if (payload instanceof Error) return payload.message;
  if (typeof payload === 'string') return payload;
  if (payload && typeof payload === 'object') {
    const maybeMsg = (payload as { message?: unknown }).message;
    if (typeof maybeMsg === 'string') return maybeMsg;
    try {
      return JSON.stringify(payload);
    } catch {
      return String(payload);
    }
  }
  return String(payload);
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
      lastErrorMessage = `${ev}: ${describeError(payload)}`;
    });
    if (off) diagnosticsUnsubscribers.push(off);
  }

  // State transitions — re-flush the latest snapshot whenever the watch
  // becomes reachable / paired / installed, since the previous flush may
  // have been dropped by the OS.
  for (const ev of ['reachability', 'paired', 'installed']) {
    const off = subscribe(native, ev, (value) => {
      console.info(`[watch-connectivity] ${ev}:`, value);
      if (ev === 'reachability' && typeof value === 'boolean') {
        lastReachability = value;
      }
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
  if (typeof native.sendMessage === 'function') {
    try {
      native.sendMessage(message, undefined, (err) => {
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
      native.updateApplicationContext(message);
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
      if (paired === false) {
        lastErrorMessage = 'gated: watch not paired';
        return false;
      }
    }
    if (typeof native.getIsWatchAppInstalled === 'function') {
      const installed = await native.getIsWatchAppInstalled();
      if (installed === false) {
        lastErrorMessage = 'gated: watch app not installed';
        return false;
      }
    }
  } catch {
    /* If the gate-check API throws, fall through and try anyway. */
  }

  const message = { type: 'cards', payload: latestSnapshot };

  if (typeof native.updateApplicationContext === 'function') {
    try {
      native.updateApplicationContext(message);
      lastPushAt = Date.now();
      return true;
    } catch (err) {
      console.warn('[watch-connectivity] updateApplicationContext threw:', err);
      lastErrorMessage = `updateApplicationContext threw: ${describeError(err)}`;
    }
  }
  // Defensive fallback: queued user info. Not snapshot semantics, but at
  // least the watch will eventually see something. Only used if the library
  // doesn't expose `updateApplicationContext` (shouldn't happen on v1.x).
  if (typeof native.transferUserInfo === 'function') {
    try {
      native.transferUserInfo(message);
      lastPushAt = Date.now();
      return true;
    } catch (err) {
      console.warn('[watch-connectivity] transferUserInfo threw:', err);
      lastErrorMessage = `transferUserInfo threw: ${describeError(err)}`;
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

// ---------------------------------------------------------------------------
// Diagnostics — read-only view of the wrapper's state for the debug screen.
// ---------------------------------------------------------------------------

export interface WatchDiagnostics {
  /** Whether `react-native-watch-connectivity` is loaded at all. */
  available: boolean;
  /** `null` when the API isn't exposed by the library or the call threw. */
  paired: boolean | null;
  /** `null` when the API isn't exposed by the library or the call threw. */
  installed: boolean | null;
  /**
   * Most recent reachability value — either freshly fetched via
   * `getReachability()` or the last value seen on the `reachability` event
   * channel. `null` if never observed.
   */
  reachable: boolean | null;
  /** epoch-ms timestamp of the last successful native push, or `null`. */
  lastPushAt: number | null;
  /** Most recent error or "gated: ..." reason; cleared on successful push. */
  lastErrorMessage: string | null;
  /** Number of cards in the cached snapshot pending re-flush, or 0. */
  snapshotSize: number;
}

async function safeBoolCall(fn?: () => Promise<boolean>): Promise<boolean | null> {
  if (typeof fn !== 'function') return null;
  try {
    const v = await fn();
    return typeof v === 'boolean' ? v : null;
  } catch {
    return null;
  }
}

/**
 * Snapshot the current state of the watch-connectivity wrapper. Used by the
 * `/watch-diagnostics` debug screen. Safe to call from anywhere; never
 * throws.
 */
export async function getWatchDiagnostics(): Promise<WatchDiagnostics> {
  const native = getNativeModule();
  // `available` mirrors `isWatchConnectivityAvailable()` so the diagnostics
  // screen and any feature-gating use the same definition.
  const available =
    !!native &&
    (typeof native.sendMessage === 'function' ||
      typeof native.updateApplicationContext === 'function');
  if (!available) {
    return {
      available: false,
      paired: null,
      installed: null,
      reachable: lastReachability,
      lastPushAt,
      lastErrorMessage,
      snapshotSize: latestSnapshot?.length ?? 0
    };
  }
  ensureDiagnostics(native!);
  const [paired, installed, reachable] = await Promise.all([
    safeBoolCall(native!.getIsPaired),
    safeBoolCall(native!.getIsWatchAppInstalled),
    safeBoolCall(native!.getReachability)
  ]);
  return {
    available: true,
    paired,
    installed,
    reachable: reachable ?? lastReachability,
    lastPushAt,
    lastErrorMessage,
    snapshotSize: latestSnapshot?.length ?? 0
  };
}

/**
 * Re-push the cached snapshot, ignoring whether reachability changed. Useful
 * from the debug screen when the user wants to manually retry after
 * reconnecting. No-op if no snapshot has been pushed yet this session.
 */
export async function forceResyncWatch(): Promise<boolean> {
  return flushSnapshot();
}

export default {
  isWatchConnectivityAvailable,
  sendMessageToWatch,
  subscribeToWatchMessages,
  requestCardsFromPhone,
  syncCardToWatch,
  pushCardsToWatch,
  getWatchDiagnostics,
  forceResyncWatch,
  __resetWatchConnectivityForTests
};
