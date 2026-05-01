/**
 * Lightweight wrapper for phone <-> watch messaging.
 *
 * - Tolerant: if `react-native-watch-connectivity` isn't available the
 *   functions are no-ops so the app remains runnable in tests / Android.
 * - Snapshot sync: `pushCardsToWatch` publishes the full card list as the
 *   single replaceable `applicationContext` so the watch always converges
 *   on the latest state, even if it was asleep when the change happened.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-require-imports */

import type { LoyaltyCard } from './schemas';

type Unsubscribe = () => void;

function getNativeModule(): any | null {
  try {
    const pkg = require('react-native-watch-connectivity');
    return pkg;
  } catch {
    return null;
  }
}

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

export const isWatchConnectivityAvailable = (): boolean => {
  const native = getNativeModule();
  return (
    !!native &&
    (typeof native.sendMessage === 'function' ||
      typeof native.updateApplicationContext === 'function')
  );
};

export async function sendMessageToWatch(message: WatchMessage): Promise<boolean> {
  const native = getNativeModule();
  if (!native) return false;
  try {
    if (typeof native.sendMessage === 'function') {
      await native.sendMessage(message).catch(() => {});
      return true;
    }
    if (typeof native.updateApplicationContext === 'function') {
      await native.updateApplicationContext(message).catch(() => {});
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function subscribeToWatchMessages(handler: (msg: WatchMessage) => void): Unsubscribe {
  const native = getNativeModule();
  if (!native) return () => {};

  const unsubscribers: Unsubscribe[] = [];

  if (typeof native.addListener === 'function') {
    const subscription = native.addListener('message', handler);
    unsubscribers.push(() => {
      if (subscription && typeof subscription.remove === 'function') subscription.remove();
    });
  } else if (typeof native.onMessage === 'function') {
    native.onMessage(handler);
    unsubscribers.push(() => {
      if (typeof native.removeMessageListener === 'function') native.removeMessageListener(handler);
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
        // ignore
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
 * Publish the full card list as the watch's applicationContext snapshot.
 * Replaces any previous snapshot — last-write-wins semantics. Falls back to
 * `transferUserInfo` (queued) and finally `sendMessage` if needed.
 */
export async function pushCardsToWatch(cards: LoyaltyCard[]): Promise<boolean> {
  const native = getNativeModule();
  if (!native) return false;

  const payload: WatchCardPayload[] = cards.map(toWatchCardPayload);
  const message = { type: 'cards', payload };

  try {
    if (typeof native.updateApplicationContext === 'function') {
      await native.updateApplicationContext(message).catch(() => {});
      return true;
    }
    if (typeof native.transferUserInfo === 'function') {
      await native.transferUserInfo(message).catch(() => {});
      return true;
    }
    if (typeof native.sendMessage === 'function') {
      await native.sendMessage(message).catch(() => {});
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export default {
  isWatchConnectivityAvailable,
  sendMessageToWatch,
  subscribeToWatchMessages,
  requestCardsFromPhone,
  syncCardToWatch,
  pushCardsToWatch
};
