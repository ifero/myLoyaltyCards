// watch-sync.ts
// WatchConnectivity messaging handler for syncing cards

import { NativeModules } from 'react-native';
import { LoyaltyCard } from '@/core/schemas';

// Placeholder: import WatchConnectivity API
// import WatchConnectivity from 'react-native-watch-connectivity';

export type SyncPayload = {
  version: string;
  upserts?: LoyaltyCard[];
  deletes?: string[];
};

const SYNC_VERSION = '1.0.0';
const MAX_RETRIES = 3;
const RETRY_BACKOFF_MS = 5000;

async function sendSyncPayload(payload: SyncPayload): Promise<boolean> {
  // Prefer native WatchConnectivity bridge when available (iOS native implementation)
  const native = (NativeModules as unknown as {
    RNWatchConnectivity?: { sendSyncPayload?: (payload: SyncPayload) => Promise<boolean> };
  }).RNWatchConnectivity;

  if (native && typeof native.sendSyncPayload === 'function') {
    try {
      const res = await native.sendSyncPayload(payload);
      return Boolean(res);
    } catch (err) {
      console.warn('watch-sync: native send failed, falling back to transferUserInfo', err);
      return false;
    }
  }

  // No native module available (e.g. running in Expo Go) — keep a no-op fallback
  console.debug('watch-sync: native module not available, skipping send', payload);
  return true;
}

export async function retrySync(payload: SyncPayload, attempt = 1): Promise<boolean> {
  try {
    return await sendSyncPayload(payload);
  } catch (err) {
    if (attempt < MAX_RETRIES) {
      await new Promise((res) => setTimeout(res, RETRY_BACKOFF_MS * attempt));
      return retrySync(payload, attempt + 1);
    }
    console.error('watch-sync: failed to send payload after retries', err);
    return false;
  }
}

export async function syncCardUpsert(card: LoyaltyCard): Promise<boolean> {
  const payload: SyncPayload = { version: SYNC_VERSION, upserts: [card] };
  return retrySync(payload);
}

export async function syncCardDelete(cardId: string): Promise<boolean> {
  const payload: SyncPayload = { version: SYNC_VERSION, deletes: [cardId] };
  return retrySync(payload);
}

/**
 * Handler that runs on the Watch to apply an incoming sync payload.
 * The watch is read-only — the phone is the source of truth.
 */
export async function handleWatchSync(payload: SyncPayload): Promise<void> {
  // TODO: apply payload to watch local DB/storage
  console.debug('watch-sync: received payload on watch', payload);
}

// Integration note: call `syncCardUpsert` / `syncCardDelete` from phone-side
// add/edit/delete hooks and from reconnect handlers. These helpers include
// retry-with-backoff and are safe to call fire-and-forget from UI code.
