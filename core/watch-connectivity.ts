/**
 * Lightweight wrapper for phone <-> watch messaging.
 *
 * - Intentionally tolerant: if `react-native-watch-connectivity` isn't
 *   installed the functions are no-ops so the app remains runnable.
 * - When the native module is added the wrapper will preferentially call
 *   `sendMessage` then `updateApplicationContext` if available.
 *
 * Story: 5.6 — initial scaffold. Implementation TODO: install and wire
 * `react-native-watch-connectivity` then replace the fallbacks.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-require-imports */

type Unsubscribe = () => void;

function getNativeModule(): any | null {
  try {
    // runtime require to avoid import-time native checks during Jest

    const pkg = require('react-native-watch-connectivity');
    return pkg;
  } catch {
    return null;
  }
}

// Message schema used for phone <-> watch communication in story 5.6
export type WatchMessage =
  | { type: 'requestCards' }
  | { type: 'syncCard'; payload: { id: string; cardData: any } }
  | { type: 'ack'; payload?: { id?: string } }
  | { type: string; payload?: any };

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

  // Common shapes: `addListener('message', cb)` or `onMessage(cb)`
  if (typeof native.addListener === 'function') {
    const subscription = native.addListener('message', handler);
    return () => {
      if (subscription && typeof subscription.remove === 'function') subscription.remove();
    };
  }

  if (typeof native.onMessage === 'function') {
    native.onMessage(handler);
    return () => {
      if (typeof native.removeMessageListener === 'function') native.removeMessageListener(handler);
    };
  }

  return () => {};
}

export function requestCardsFromPhone(): Promise<boolean> {
  return sendMessageToWatch({ type: 'requestCards' });
}

export function syncCardToWatch(id: string, cardData: any): Promise<boolean> {
  return sendMessageToWatch({ type: 'syncCard', payload: { id, cardData } });
}

export default {
  isWatchConnectivityAvailable,
  sendMessageToWatch,
  subscribeToWatchMessages,
  requestCardsFromPhone,
  syncCardToWatch
};
