/**
 * The single seam every caller uses to sync with a wearable (Story 10-6, AC2).
 *
 * Two transports sit behind it and they are not interchangeable at the library level:
 *
 * - **iOS** → `core/watch-connectivity.ts`, wrapping `react-native-watch-connectivity`
 *   (WCSession). Inbound traffic arrives on two separate channels — `message` for control
 *   messages and `user-info` for the OS-queued usage events.
 * - **Android** → `core/wear-connectivity.ts`, wrapping the local `modules/wear-data-layer`
 *   Expo module (Wearable Data Layer). Inbound traffic arrives on one durable inbox.
 *
 * Callers should not have to learn either shape, so this module normalises both to one API and
 * one pair of handlers. The iOS branch is a pure re-export of behaviour that already shipped:
 * nothing here changes what `watch-connectivity` does, which is what keeps the Apple Watch —
 * shipped, working software — byte-for-byte unchanged (AC2, AC18) and lets its existing test
 * suite pass untouched.
 *
 * `Platform.OS` is the discriminator rather than "is the native module present" because the two
 * questions have different answers: on an Android device with no Play services the Wear module
 * exists but cannot reach a watch, and falling through to the iOS path there would be nonsense.
 * Availability is reported separately by {@link isWearableSyncAvailable}.
 */

import { Platform } from 'react-native';

import { logger } from '@/core/utils/logger';

import type { LoyaltyCard } from './schemas';
import {
  isWatchConnectivityAvailable,
  subscribeToWatchMessages,
  subscribeToWatchUserInfo,
  pushCardsToWatch,
  type WatchMessage,
  type WatchUsageEvent
} from './watch-connectivity';
import {
  isWearConnectivityAvailable,
  pushCardsToWear,
  subscribeToWearInbound,
  type WearInboundHandlers
} from './wear-connectivity';

type Unsubscribe = () => void;

/**
 * Handlers for watch → phone traffic, in the shape both transports normalise to.
 *
 * `onUsageEvents` receives **raw** envelopes, not validated ones: validation is
 * `parseWatchUsageEvent`'s job and belongs to the caller, so both platforms go through exactly
 * one validator with exactly one set of rules (AC11).
 */
export type WearableInboundHandlers = WearInboundHandlers;

/** Whether this platform's wearable transport is present in the build. */
export function isWearableSyncAvailable(): boolean {
  return Platform.OS === 'android' ? isWearConnectivityAvailable() : isWatchConnectivityAvailable();
}

/**
 * Publish the full card list to the paired wearable.
 *
 * The snapshot is always the **complete** list on both platforms. That is what allows the
 * receiver to apply it as a replace and so propagate deletions (AC7) — Story 16-11 shipped the
 * opposite on the phone's cloud sync and deleted cards came back.
 */
export function pushCardsToWearable(cards: LoyaltyCard[]): Promise<boolean> {
  return Platform.OS === 'android' ? pushCardsToWear(cards) : pushCardsToWatch(cards);
}

/**
 * Register `subscribe` and return its unsubscribe, or a no-op if registration threw.
 *
 * Each WCSession channel is registered independently, which preserves the fault isolation the
 * pre-seam code had: `app/_layout.tsx` wrapped its two `subscribeToWatch*` calls in **separate**
 * try/catch blocks, so a native binding that threw while attaching one listener never prevented
 * the other from being attached. Registering both under a single guard would mean a failure on
 * the `message` channel silently costs the app every `CARD_USED` event for the rest of the
 * session — and would orphan an already-created listener, since the caller would never receive an
 * unsubscribe for it.
 */
function subscribeSafely(subscribe: () => Unsubscribe): Unsubscribe {
  try {
    return subscribe();
  } catch (error) {
    logger.warn('[wearable-sync] failed to attach a watch listener:', error);
    return () => {};
  }
}

/**
 * Subscribe to watch → phone traffic on whichever transport this platform uses.
 *
 * On Android this is one subscription over the durable inbox. On iOS it is the two existing
 * WCSession channels, fanned into the same handlers — `message` carries control messages and
 * `user-info` carries the OS-queued `CARD_USED` batch.
 *
 * **Handler rejections are contained here, on iOS only, and that asymmetry is the point.**
 * WCSession invokes its callbacks synchronously and discards the returned promise, so it has no
 * redelivery to offer: an error that escapes would become a global unhandled rejection and the
 * event would be gone either way, so it is caught and logged exactly as the pre-seam code did.
 * The Android path deliberately does **not** catch — an unacknowledged message stays in the
 * native durable inbox and is retried on the next nudge, so the rejection is what *drives* the
 * retry. Callers therefore let their handlers throw, and each transport does the right thing
 * with it.
 */
export function subscribeToWearableInbound(handlers: WearableInboundHandlers): Unsubscribe {
  if (Platform.OS === 'android') {
    return subscribeToWearInbound(handlers);
  }

  const offMessages = subscribeSafely(() =>
    subscribeToWatchMessages((message: WatchMessage) => {
      void Promise.resolve(handlers.onMessage(message)).catch((error: unknown) => {
        logger.warn('Wearable message handler error:', error);
      });
    })
  );

  const offUserInfo = subscribeSafely(() =>
    subscribeToWatchUserInfo((events: unknown[]) => {
      void Promise.resolve(handlers.onUsageEvents(events)).catch((error: unknown) => {
        logger.warn('Watch usage event handler error:', error);
      });
    })
  );

  return () => {
    offMessages();
    offUserInfo();
  };
}

/**
 * The dependencies {@link createWearableInboundHandlers} needs, injected rather than imported.
 *
 * Injection is not ceremony here — it is the only option. `getAllCards` and `applyWatchUsageEvents`
 * live in `core/database/card-repository`, which already imports *this* module (for
 * `pushCardsToWearable`); importing it back would be a require cycle. `pushCardsToWearable` is not
 * a dependency because it lives in this same file.
 */
export interface WearableInboundDeps {
  getAllCards: () => Promise<LoyaltyCard[]>;
  parseWatchUsageEvent: (raw: unknown) => WatchUsageEvent | null;
  applyWatchUsageEvents: (events: WatchUsageEvent[]) => Promise<unknown>;
}

/**
 * Build the watch → phone handlers the app wires into {@link subscribeToWearableInbound}.
 *
 * This is the actual application glue for **AC5** (a `requestCards` ping is answered by
 * republishing the snapshot) and **AC10** (a `CARD_USED` batch is validated and applied through
 * the phone's *existing* commutative handler). It used to live inline in `app/_layout.tsx`, which
 * is excluded from the coverage gate — so this logic was invisible to it on two axes at once, and
 * a broken `'requestCards'` literal or a dropped `await` would not have failed any test. Moving it
 * into `core/` is exactly the "put testable logic in shared/features/core, not in app/" rule from
 * `docs/project-context.md`.
 *
 * Neither handler catches its own errors, and that is deliberate (see {@link
 * subscribeToWearableInbound}): on Android a thrown handler leaves the message unacknowledged so it
 * is retried; on iOS the seam catches and logs. The behaviour is identical to the inline version
 * this replaces — a pure extraction, no functional change.
 */
export function createWearableInboundHandlers(deps: WearableInboundDeps): WearableInboundHandlers {
  return {
    onMessage: async (message: WatchMessage) => {
      if (message?.type === 'requestCards') {
        const cards = await deps.getAllCards();
        await pushCardsToWearable(cards);
      }
    },
    onUsageEvents: async (events: unknown[]) => {
      const usageEvents = events
        .map(deps.parseWatchUsageEvent)
        .filter((event): event is WatchUsageEvent => event !== null);
      if (usageEvents.length > 0) {
        await deps.applyWatchUsageEvents(usageEvents);
      }
    }
  };
}

export default {
  isWearableSyncAvailable,
  pushCardsToWearable,
  subscribeToWearableInbound,
  createWearableInboundHandlers
};
