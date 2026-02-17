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

type Unsubscribe = () => void;

export const isWatchConnectivityAvailable = (): boolean => {
  try {
    // dynamic require so the app doesn't crash if the native module isn't installed yet
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pkg = require('react-native-watch-connectivity');
    return !!pkg && (typeof pkg.sendMessage === 'function' || typeof pkg.updateApplicationContext === 'function');
  } catch (_err) {
    return false;
  }
};

export async function sendMessageToWatch(payload: any): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pkg = require('react-native-watch-connectivity');
    if (typeof pkg.sendMessage === 'function') {
      await pkg.sendMessage(payload);
      return true;
    }
    if (typeof pkg.updateApplicationContext === 'function') {
      await pkg.updateApplicationContext(payload);
      return true;
    }
    return false;
  } catch (_err) {
    // native module not present (or runtime error) — treat as noop for now
    return false;
  }
}

export function subscribeToWatchMessages(handler: (msg: any) => void): Unsubscribe {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pkg = require('react-native-watch-connectivity');

    // Common RN native API shapes vary; attempt to wire common hooks.
    if (typeof pkg.addListener === 'function') {
      const subscription = pkg.addListener('message', handler);
      return () => { if (subscription && typeof subscription.remove === 'function') subscription.remove(); };
    }

    if (typeof pkg.onMessage === 'function') {
      pkg.onMessage(handler);
      return () => { if (typeof pkg.removeMessageListener === 'function') pkg.removeMessageListener(handler); };
    }

    // Last-resort: no-op unsubscribe
    return () => {};
  } catch (_err) {
    return () => {};
  }
}

export default {
  isWatchConnectivityAvailable,
  sendMessageToWatch,
  subscribeToWatchMessages,
};
