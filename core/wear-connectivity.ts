/**
 * Phone-side Wear OS sync over the Wearable Data Layer (Story 10-6).
 *
 * The Android counterpart of `core/watch-connectivity.ts`. That module wraps
 * `react-native-watch-connectivity`, which is **iOS-only** — the installed package ships an
 * `ios/` directory and no `android/` — so Wear OS needs a different transport entirely. The
 * native side is the local Expo module in `modules/wear-data-layer`; everything that knows what
 * a loyalty card is lives here, inside the repository's 80 % coverage gate.
 *
 * ### How the transports differ
 *
 * | Purpose              | watchOS                  | Wear OS                                    |
 * | -------------------- | ------------------------ | ------------------------------------------ |
 * | Latest card snapshot | `updateApplicationContext` | `DataClient` DataItem at a fixed path    |
 * | "Send me the cards"  | `sendMessage`            | `MessageClient`                            |
 * | Usage events         | `transferUserInfo` (OS FIFO) | no equivalent — the watch owns an outbox |
 *
 * One consequence is worth stating because it removes machinery rather than adding it: a
 * DataItem is **persisted locally and synced when a node connects**, whereas
 * `updateApplicationContext` needs an activated session and silently drops pushes issued before
 * activation. So this module has no "cache the snapshot and re-flush on reachability" logic —
 * `putDataItem` is already durable. It publishes unconditionally and lets the Data Layer deliver.
 *
 * Failures route through `logger.notify`, not `logger.warn`: `warn` is `__DEV__`-only and a
 * no-op in release (Story 16-14), and Sentry has effectively no Android telemetry for this app
 * (~10 events / 90 days, 100 % iOS), so a Wear sync that silently stops working would otherwise
 * produce no signal at all.
 */

import { logger } from '@/core/utils/logger';

import type { WearDataLayerNativeModule } from '@/modules/wear-data-layer';

import type { LoyaltyCard } from './schemas';
import {
  sanitizeWatchTransportObject,
  toBaseWatchCardPayload,
  utf8ByteLength,
  type WatchCardPayload,
  type WatchMessage
} from './watch-connectivity';

type Unsubscribe = () => void;

// ---------------------------------------------------------------------------
// Wire contract — mirrors `WearDataLayerContract.kt` (phone module) and
// `WearSyncContract.kt` (Wear OS APK). The three are duplicated because the JS bundle, the
// phone's native module and the Wear APK share no build system; the tests in
// `core/wear-connectivity.test.ts` pin these literals so a rename cannot land on one side only.
// ---------------------------------------------------------------------------

/** DataItem path carrying the full card snapshot. */
export const WEAR_SNAPSHOT_PATH = '/myloyaltycards/cards';

/** `MessageClient` path for watch → phone control and usage messages. */
export const WEAR_MESSAGE_PATH = '/myloyaltycards/msg';

/** Envelope version. Matches the phone's existing versioned `WatchMessage`s. */
export const WEAR_PROTOCOL_VERSION = 1;

/**
 * Budget for the JSON snapshot body, in UTF-8 bytes.
 *
 * The Data Layer caps a DataItem at 100 KB. 80 000 leaves ~20 KB of headroom for the `DataMap`
 * envelope and its own encoding overhead. It is deliberately *larger* than the WCSession path's
 * `WATCH_SNAPSHOT_MAX_BYTES` (48 000) because the two transports have different limits — and
 * because dropping `barcodeImageBase64` on this path (AC13) removes almost all of the pressure:
 * an image-free card serialises to roughly 200 bytes, so this budget holds several hundred.
 */
export const WEAR_SNAPSHOT_MAX_BYTES = 80_000;

/**
 * The only message types the watch is permitted to send.
 *
 * ADR-2026-06-09-001 makes the watch read-only for card data, with `CARD_USED` as the single
 * ratified exception. That is enforced on the watch (it emits nothing else) — but the phone
 * must not *depend* on the watch being well-behaved: `WatchMessage` includes
 * `{ type: 'syncCard', payload: { id, cardData } }`, so without this allowlist a buggy or
 * tampered watch build could push card content into the phone through the same channel.
 * Anything not listed here is dropped before a handler ever sees it (AC8).
 */
const ALLOWED_INBOUND_TYPES: ReadonlySet<string> = new Set(['CARD_USED', 'requestCards']);

// ---------------------------------------------------------------------------
// Native module access
// ---------------------------------------------------------------------------

/**
 * The slice of `modules/wear-data-layer` this module uses.
 *
 * Derived with `Pick` from the module's own exported type rather than re-declared, so a rename or
 * a signature change in the native module's TypeScript surface is a compile error here instead of
 * a runtime surprise. `import type` erases completely, so this costs nothing at runtime and does
 * not disturb the lazy `require` below — that indirection exists to keep the *value* off the
 * module-evaluation path, which a type import never touches.
 */
type WearDataLayerNative = Pick<
  WearDataLayerNativeModule,
  | 'isSupported'
  | 'getConnectedNodeCount'
  | 'publishSnapshot'
  | 'sendMessage'
  | 'readInboundMessages'
  | 'acknowledgeInboundMessages'
  | 'addListener'
>;

let cachedNative: WearDataLayerNative | null | undefined;

/**
 * Resolve the native module lazily, exactly as `core/watch-connectivity.ts` does. Lazy `require`
 * keeps the import off the module-evaluation path, so importing this file on iOS — or in a Jest
 * environment with no Expo native runtime — is inert rather than throwing.
 */
function getNativeModule(): WearDataLayerNative | null {
  if (cachedNative !== undefined) return cachedNative;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@/modules/wear-data-layer') as { default?: WearDataLayerNative | null };
    cachedNative = mod?.default ?? null;
  } catch {
    cachedNative = null;
  }
  return cachedNative;
}

/** Whether the Wear OS Data Layer transport is present in this build. */
export function isWearConnectivityAvailable(): boolean {
  return getNativeModule() !== null;
}

// ---------------------------------------------------------------------------
// Snapshot building
// ---------------------------------------------------------------------------

/** What `selectWearSnapshotCards` decided to send, and what it had to leave out. */
export interface WearSnapshotSelection {
  /** The cards that fit, in the order the caller supplied them. */
  payload: WatchCardPayload[];
  /** How many cards did not fit. Zero in every realistic library. */
  droppedCount: number;
}

/**
 * Rank cards by how much a user would miss them if they were the ones dropped.
 *
 * Only consulted when a library exceeds {@link WEAR_SNAPSHOT_MAX_BYTES}. The comparator is a
 * **total order** — it falls through to `id`, which is unique — so the same library always
 * yields the same selection. That matters more than the ranking itself: a non-deterministic
 * choice would make the DataItem's contents flap between pushes, and the Data Layer is
 * content-addressed, so every flap would wake the watch for nothing.
 *
 * Ranking rather than truncating the caller's order is deliberate: `getAllCards()` returns
 * `ORDER BY name ASC`, so dropping the tail would silently and permanently disenfranchise
 * whoever shops at the end of the alphabet.
 */
function compareBySyncPriority(a: LoyaltyCard, b: LoyaltyCard): number {
  if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
  if (a.usageCount !== b.usageCount) return b.usageCount - a.usageCount;

  // ISO-8601 UTC strings sort lexicographically in chronological order, so no parsing is
  // needed. A never-used card (`null`) ranks last.
  const aLastUsed = a.lastUsedAt ?? '';
  const bLastUsed = b.lastUsedAt ?? '';
  if (aLastUsed !== bLastUsed) return aLastUsed < bLastUsed ? 1 : -1;

  if (a.name !== b.name) return a.name < b.name ? -1 : 1;
  return a.id < b.id ? -1 : 1;
}

function snapshotBodySize(payload: WatchCardPayload[]): number {
  return utf8ByteLength(JSON.stringify(buildSnapshotEnvelope(payload)));
}

function buildSnapshotEnvelope(payload: WatchCardPayload[]): Record<string, unknown> {
  return sanitizeWatchTransportObject({
    version: WEAR_PROTOCOL_VERSION,
    type: 'cards',
    payload
  });
}

/**
 * Choose the largest set of cards that fits the Data Layer budget (AC14).
 *
 * Cards are admitted in priority order and admission **stops at the first card that does not
 * fit**, rather than skipping it and trying smaller ones. Stopping is the more predictable rule:
 * the result is always "the top N by priority", never an arbitrary subset that a user could not
 * reason about. With `barcodeImageBase64` stripped, cards are near-uniform in size anyway, so
 * the two policies would rarely differ.
 */
export function selectWearSnapshotCards(cards: LoyaltyCard[]): WearSnapshotSelection {
  const full = cards.map(toBaseWatchCardPayload);
  if (snapshotBodySize(full) <= WEAR_SNAPSHOT_MAX_BYTES) {
    return { payload: full, droppedCount: 0 };
  }

  const ranked = [...cards].sort(compareBySyncPriority);
  const admitted = new Set<string>();
  const accumulated: WatchCardPayload[] = [];

  // Re-measuring the whole envelope per candidate is O(n²), which is fine: this branch only
  // runs for a library that already blew the budget, and the alternative — tracking incremental
  // JSON sizes by hand — would drift from the real serialisation the moment a field changes.
  for (const card of ranked) {
    const entry = toBaseWatchCardPayload(card);
    if (snapshotBodySize([...accumulated, entry]) > WEAR_SNAPSHOT_MAX_BYTES) break;
    accumulated.push(entry);
    admitted.add(card.id);
  }

  // Emit in the caller's original order so the wire bytes stay stable when the set is unchanged.
  const payload = full.filter((entry) => admitted.has(entry.id));
  return { payload, droppedCount: cards.length - payload.length };
}

// ---------------------------------------------------------------------------
// Outbound
// ---------------------------------------------------------------------------

/**
 * Publish the full card list as the snapshot DataItem.
 *
 * Always publishes, connected or not: a DataItem is stored on this node and synced when a watch
 * appears, so gating on connectivity would only lose updates. The snapshot is the **complete**
 * list, which is what lets the watch apply it as a full replace and so propagate deletions
 * (AC7).
 *
 * `barcodeImageBase64` is never included — `toBaseWatchCardPayload` does not produce it, and the
 * Android path never layers it on (AC13). Wear OS renders all six formats locally with ZXing.
 */
export async function pushCardsToWear(cards: LoyaltyCard[]): Promise<boolean> {
  const native = getNativeModule();
  if (!native) return false;

  const { payload, droppedCount } = selectWearSnapshotCards(cards);

  if (droppedCount > 0) {
    logger.notify('Wear OS card snapshot exceeded the Data Layer budget', {
      tags: { surface: 'wear-sync', outcome: 'snapshot-truncated' },
      context: [{ droppedCount, totalCards: cards.length, sentCards: payload.length }]
    });
  }

  try {
    return await native.publishSnapshot(
      WEAR_SNAPSHOT_PATH,
      JSON.stringify(buildSnapshotEnvelope(payload))
    );
  } catch (error) {
    logger.notify('Wear OS card snapshot publish failed', {
      tags: { surface: 'wear-sync', outcome: 'publish-error' },
      context: [{ error: String(error) }]
    });
    return false;
  }
}

/**
 * Send a one-shot message to every connected wearable node. Resolves to `true` if at least one
 * node accepted it. Not used for the snapshot — that goes through {@link pushCardsToWear}.
 */
export async function sendMessageToWear(message: WatchMessage): Promise<boolean> {
  const native = getNativeModule();
  if (!native) return false;

  try {
    const delivered = await native.sendMessage(
      WEAR_MESSAGE_PATH,
      JSON.stringify(sanitizeWatchTransportObject(message))
    );
    return delivered > 0;
  } catch (error) {
    logger.notify('Wear OS message send failed', {
      tags: { surface: 'wear-sync', outcome: 'send-error' },
      context: [{ error: String(error) }]
    });
    return false;
  }
}

/** Number of currently connected wearable nodes; `0` when the transport is unavailable. */
export async function getConnectedWearNodeCount(): Promise<number> {
  const native = getNativeModule();
  if (!native) return 0;
  try {
    return await native.getConnectedNodeCount();
  } catch {
    return 0;
  }
}

/** Whether Google Play services is present and usable, so Data Layer calls will not throw. */
export async function isWearTransportSupported(): Promise<boolean> {
  const native = getNativeModule();
  if (!native) return false;
  try {
    return await native.isSupported();
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Inbound
// ---------------------------------------------------------------------------

/**
 * Handlers for the two kinds of watch → phone traffic. Both may be async; a batch is
 * acknowledged (and so dropped from the native durable inbox) only after the corresponding
 * handler has resolved.
 */
export interface WearInboundHandlers {
  /** A control message — in practice only `requestCards`. */
  onMessage: (message: WatchMessage) => Promise<void> | void;
  /** Raw `CARD_USED` envelopes, still to be validated by `parseWatchUsageEvent`. */
  onUsageEvents: (rawEvents: unknown[]) => Promise<void> | void;
}

interface InboundEntry {
  id: string;
  path: string;
  data: string;
}

/**
 * Decode one inbox entry, or `null` if it is not a message this phone will act on.
 *
 * Returns `null` for unparseable JSON, a non-object body, a missing/blank `type`, and — the
 * security-relevant case — any `type` outside {@link ALLOWED_INBOUND_TYPES}. All four are
 * dropped rather than retried (AC11: ignored gracefully, never half-applied).
 */
function parseInboundMessage(raw: string): WatchMessage | null {
  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof decoded !== 'object' || decoded === null || Array.isArray(decoded)) {
    return null;
  }

  const { type } = decoded as { type?: unknown };
  if (typeof type !== 'string' || !ALLOWED_INBOUND_TYPES.has(type)) {
    return null;
  }

  return decoded as WatchMessage;
}

/**
 * Apply one batch and report which entry ids may be dropped from the durable inbox.
 *
 * The split between "acknowledge" and "leave for later" is the whole correctness argument:
 *
 * - a **malformed or disallowed** message is acknowledged, because retrying it would wedge the
 *   inbox behind a message that can never succeed;
 * - a **handler failure** (a database error, say) is *not* acknowledged, so the message is
 *   retried on the next nudge.
 *
 * Redelivery is safe: `applyWatchUsageEvents` dedups on `"<cardId>:<usedAt>"`, and republishing
 * a snapshot is idempotent.
 */
async function applyInboundBatch(
  entries: InboundEntry[],
  handlers: WearInboundHandlers
): Promise<string[]> {
  const acknowledged: string[] = [];
  const usageEvents: unknown[] = [];
  const usageEventIds: string[] = [];
  const controlMessages: { id: string; message: WatchMessage }[] = [];

  for (const entry of entries) {
    const message = parseInboundMessage(entry.data);
    if (message === null) {
      acknowledged.push(entry.id);
      continue;
    }
    if (message.type === 'CARD_USED') {
      usageEvents.push(message);
      usageEventIds.push(entry.id);
    } else {
      controlMessages.push({ id: entry.id, message });
    }
  }

  if (usageEvents.length > 0) {
    try {
      await handlers.onUsageEvents(usageEvents);
      acknowledged.push(...usageEventIds);
    } catch (error) {
      logger.notify('Wear OS usage events could not be applied', {
        tags: { surface: 'wear-sync', outcome: 'usage-apply-error' },
        context: [{ error: String(error), eventCount: usageEvents.length }]
      });
    }
  }

  for (const { id, message } of controlMessages) {
    try {
      await handlers.onMessage(message);
      acknowledged.push(id);
    } catch (error) {
      logger.notify('Wear OS control message could not be handled', {
        tags: { surface: 'wear-sync', outcome: 'message-handler-error' },
        context: [{ error: String(error), messageType: message.type }]
      });
    }
  }

  return acknowledged;
}

/**
 * Subscribe to watch → phone traffic.
 *
 * Reads the native durable inbox **immediately on subscription**, before waiting for any event.
 * That initial read is not an optimisation: the listener service persists messages that arrived
 * while JavaScript was not running, and nothing will re-announce them. It is the inbound mirror
 * of the watch's mandatory start-up DataItem read (AC4) — both exist because a transport that
 * only reports *changes* strands whatever happened while you were away.
 */
export function subscribeToWearInbound(handlers: WearInboundHandlers): Unsubscribe {
  const native = getNativeModule();
  if (!native) return () => {};

  let cancelled = false;
  let draining = false;
  let drainAgain = false;

  const drain = async (): Promise<void> => {
    if (draining) {
      // A nudge landed mid-drain; the entry it refers to may not have been in the batch we
      // already read, so schedule exactly one more pass rather than starting a second drain.
      drainAgain = true;
      return;
    }
    draining = true;
    try {
      do {
        drainAgain = false;
        if (cancelled) return;

        // Caught per iteration, not around the whole loop. A failure here acknowledges nothing,
        // so the batch is still in the native inbox — but `drainAgain` would be discarded by an
        // exception thrown past the `while`, silently dropping a nudge that arrived mid-read.
        // Returning instead is deliberate: retrying immediately after an instantly-failing read
        // would spin, so the next nudge (or the next app start) picks the batch up. Nothing is
        // lost either way, because nothing was acknowledged.
        let entries: InboundEntry[];
        try {
          entries = await native.readInboundMessages();
        } catch (error) {
          logger.notify('Wear OS inbound message drain failed', {
            tags: { surface: 'wear-sync', outcome: 'drain-error' },
            context: [{ error: String(error) }]
          });
          return;
        }

        if (entries.length === 0) continue;

        const acknowledged = await applyInboundBatch(entries, handlers);
        if (acknowledged.length > 0) {
          await native.acknowledgeInboundMessages(acknowledged);
        }
      } while (drainAgain);
    } catch (error) {
      // Only an acknowledge failure reaches here: `applyInboundBatch` contains its own handler
      // errors. The messages stay in the inbox and are redelivered, which is safe — the phone
      // dedups usage events on "<cardId>:<usedAt>".
      logger.notify('Wear OS inbound message drain failed', {
        tags: { surface: 'wear-sync', outcome: 'acknowledge-error' },
        context: [{ error: String(error) }]
      });
    } finally {
      draining = false;
    }
  };

  const subscription = native.addListener('onInboundMessage', () => {
    void drain();
  });

  void drain();

  return () => {
    cancelled = true;
    subscription.remove();
  };
}

export default {
  isWearConnectivityAvailable,
  isWearTransportSupported,
  getConnectedWearNodeCount,
  pushCardsToWear,
  sendMessageToWear,
  subscribeToWearInbound,
  selectWearSnapshotCards
};
