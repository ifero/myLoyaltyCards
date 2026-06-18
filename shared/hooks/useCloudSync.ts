import { useEffect, useSyncExternalStore } from 'react';

import { batchUpsertCards } from '@/core/database/card-repository';
import {
  downloadCloudCards,
  forceSyncLocalCards,
  retryWithBackoff,
  uploadLocalCards
} from '@/core/sync';
import { logger } from '@/core/utils/logger';

import { useNetworkStatus } from '@/shared/hooks/useNetworkStatus';
import { getSession } from '@/shared/supabase/auth';
import { fetchCards, upsertCards } from '@/shared/supabase/cards';
import { useAuthState } from '@/shared/supabase/useAuthState';

export type UseCloudSyncResult = {
  isSyncing: boolean;
  syncError: string | null;
  downloadedCount: number;
  triggerSync: () => Promise<void>;
  forceSync: () => Promise<void>;
  clearSyncError: () => void;
};

const GENERIC_SYNC_ERROR = 'Cloud sync failed. Pull to retry.';
const DOWNLOAD_ERROR_MESSAGE =
  "Couldn't load your cloud cards. They'll sync when connectivity is restored.";
const AUTO_SYNC_MAX_RETRIES = 3;
const AUTO_SYNC_BASE_DELAY_MS = 1000;

// Marker for failures we recognize and have a user-facing message for —
// distinguishes structured sync errors from unexpected throws.
class KnownSyncError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'KnownSyncError';
  }
}

// Marker for "skip this run" signals (sync already running, not authenticated yet).
// retryWithBackoff treats these as retry-eligible; the manual path silently no-ops.
// This prevents a no-op return from being mistaken for a successful sync and
// flipping the auto-trigger latch (see Story 16.8 review finding #1).
class SyncBusyError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = 'SyncBusyError';
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Module-level sync store (Story 16.8 efficiency pass)
//
// useCloudSync is mounted by several components at once — HomeScreen and its
// child CardList co-exist on the home screen, plus the settings sync trigger.
// When each instance owned its own latch + state, every mount fired its own
// cold-open auto-sync, so the same download→merge→upload ran 2–3× in parallel
// (only the core/sync cooldown throttle accidentally absorbed the duplicates).
//
// Hoisting the sync into one module-level store fixes that at the source:
//   • The work runs ONCE regardless of how many components mount the hook
//     (autoSyncInFlight + isRunning are shared guards, not per-instance refs).
//   • All consumers read ONE consistent snapshot — whichever component triggers
//     the sync, every status strip reflects it. No "winner owns the UI" race.
//   • The store outlives any single component, so there is no state-update-after-
//     unmount hazard — the mountedRef / per-effect cancelled flags the previous
//     version needed are gone entirely.
//   • Actions (triggerSync/forceSync/clearSyncError) are stable module constants,
//     so consumers' downstream useCallback/memo no longer churn on auth changes.
// ───────────────────────────────────────────────────────────────────────────

type CloudSyncSnapshot = {
  isSyncing: boolean;
  syncError: string | null;
  downloadedCount: number;
};

let snapshot: CloudSyncSnapshot = {
  isSyncing: false,
  syncError: null,
  downloadedCount: 0
};

const listeners = new Set<() => void>();

// Mirror of the latest auth flag, pushed in from the hook (auth lives in a React
// hook, so the module store can't read it directly). performSync gates on this
// to keep its "not authenticated yet" short-circuit without a network round-trip.
let latestIsAuthenticated = false;

// Auto-trigger latch — flips to true ONLY after a successful auto-sync, so a
// failed cold open stays un-latched and the next auth/network event re-fires.
let autoTriggered = false;
// Guards a single sync run against overlapping calls (manual + auto).
let isRunning = false;
// Dedupes the auto path itself: many instances/renders call maybeAutoSync before
// the latch flips on success, so we must reject re-entry while one is in flight.
let autoSyncInFlight = false;

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = (): CloudSyncSnapshot => snapshot;

// Commit a partial state change. Bails when nothing actually changed so the
// snapshot reference stays stable — useSyncExternalStore compares by identity,
// so a no-op write (e.g. setIsSyncing(false) when already false) costs zero
// re-renders across all subscribers.
const setSnapshot = (patch: Partial<CloudSyncSnapshot>): void => {
  const next = { ...snapshot, ...patch };
  if (
    next.isSyncing === snapshot.isSyncing &&
    next.syncError === snapshot.syncError &&
    next.downloadedCount === snapshot.downloadedCount
  ) {
    return;
  }
  snapshot = next;
  for (const listener of listeners) {
    listener();
  }
};

// Core sync routine. Throws SyncBusyError for transient skips (already running /
// not authenticated yet) so retryWithBackoff can retry naturally and the auto-
// trigger latch never flips on a no-op. Throws KnownSyncError for structured
// failures; lets unexpected errors bubble.
const performSync = async (force: boolean): Promise<void> => {
  if (isRunning) {
    throw new SyncBusyError('sync already in flight');
  }
  if (!latestIsAuthenticated) {
    throw new SyncBusyError('not authenticated');
  }

  isRunning = true;
  setSnapshot({ isSyncing: true, downloadedCount: 0 });

  try {
    const sessionResult = await getSession();
    if (!sessionResult.success) {
      throw new KnownSyncError(sessionResult.error.message);
    }
    if (!sessionResult.data) {
      throw new KnownSyncError(GENERIC_SYNC_ERROR);
    }

    const userId = sessionResult.data.user.id;

    const downloadResult = force
      ? await downloadCloudCards(userId, fetchCards, { forceSync: true })
      : await downloadCloudCards(userId, fetchCards);

    if (!downloadResult.success) {
      const firstError = downloadResult.errors[0]?.message ?? DOWNLOAD_ERROR_MESSAGE;
      throw new KnownSyncError(firstError);
    }

    if (downloadResult.throttled) {
      // Cooldown window active — download and upload share the same throttle
      // (see core/sync `_CLOUD_SYNC_COOLDOWN_MS`). Treating as success so the
      // auto-trigger latch engages and we don't thrash the network during the
      // cooldown. Pre-existing behaviour; reconsider if cooldown semantics change.
      return;
    }

    if (downloadResult.mergeResult) {
      setSnapshot({
        downloadedCount: downloadResult.mergeResult.added + downloadResult.mergeResult.updated
      });
      await batchUpsertCards(downloadResult.mergeResult.merged);
    }

    const uploadResult = force
      ? await forceSyncLocalCards(userId, upsertCards)
      : await uploadLocalCards(userId, upsertCards);

    if (!uploadResult.success) {
      const firstError = uploadResult.errors[0]?.message ?? GENERIC_SYNC_ERROR;
      throw new KnownSyncError(firstError);
    }
  } finally {
    isRunning = false;
    setSnapshot({ isSyncing: false });
  }
};

// Manual sync path (triggerSync / forceSync) — single attempt, surfaces the
// underlying error message verbatim. SyncBusyError silently no-ops: another
// sync is in flight and will complete on its own.
const runManualSync = async (force: boolean): Promise<void> => {
  setSnapshot({ syncError: null });
  try {
    await performSync(force);
  } catch (e) {
    if (e instanceof SyncBusyError) {
      return;
    }
    if (e instanceof KnownSyncError) {
      setSnapshot({ syncError: e.message });
    } else {
      logger.error('[useCloudSync] Sync failed unexpectedly', e);
      setSnapshot({ syncError: GENERIC_SYNC_ERROR });
    }
  }
};

// Cold-open auto-sync. Two protections against the "fails every cold open" bug
// (Story 16.8): retryWithBackoff absorbs single-fire transient failures, and the
// latch flips ONLY on success so a failure leaves the next event free to re-fire.
const runAutoSync = async (): Promise<void> => {
  setSnapshot({ syncError: null });
  // Set when a concurrent sync (a manual pull-to-refresh, typically) already
  // owns the in-flight guard. The shared store means manual + auto contend for
  // one guard, so without this the auto path would throw SyncBusyError through
  // every retry, burn ~7s of backoff, and surface a spurious banner even though
  // the in-flight sync is about to succeed. We bail cleanly instead and leave
  // the latch unset so a later auth/network event can re-fire.
  let superseded = false;
  try {
    await retryWithBackoff(
      async () => {
        if (isRunning) {
          superseded = true;
          return;
        }
        await performSync(false);
      },
      {
        maxRetries: AUTO_SYNC_MAX_RETRIES,
        baseDelay: AUTO_SYNC_BASE_DELAY_MS
      }
    );
    if (!superseded) {
      autoTriggered = true;
    }
  } catch (e) {
    logger.error('[useCloudSync] Auto-sync failed after retries', e);
    setSnapshot({ syncError: GENERIC_SYNC_ERROR });
  }
};

// Called from every mounted instance's effect. The latch + in-flight guards make
// this idempotent: the first eligible call starts the sync, all others no-op.
const maybeAutoSync = (gate: { authenticated: boolean; networkReady: boolean }): void => {
  if (autoTriggered || autoSyncInFlight) {
    return;
  }
  if (!gate.authenticated || !gate.networkReady) {
    return;
  }
  autoSyncInFlight = true;
  void runAutoSync().finally(() => {
    autoSyncInFlight = false;
  });
};

// Stable module-level actions — identical reference for every consumer, forever.
const triggerSync = (): Promise<void> => runManualSync(false);
const forceSync = (): Promise<void> => runManualSync(true);
const clearSyncError = (): void => setSnapshot({ syncError: null });

export const useCloudSync = (): UseCloudSyncResult => {
  const { authState, isAuthenticated } = useAuthState();
  const { isConnected, isInternetReachable, isReady: isNetworkReady } = useNetworkStatus();

  // getServerSnapshot (3rd arg) reuses getSnapshot: React Native has no SSR /
  // hydration step, so there is no server-vs-client snapshot to reconcile. If a
  // server-rendered target is ever added, this must return a deterministic
  // initial snapshot instead of the live mutable store.
  const { isSyncing, syncError, downloadedCount } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot
  );

  // Keep the store's auth mirror current so the module-level sync routines can
  // gate on it (manual triggerSync has no other access to React auth state).
  useEffect(() => {
    latestIsAuthenticated = isAuthenticated;
  }, [isAuthenticated]);

  // Reset the latch on sign-out so a subsequent sign-in re-triggers auto-sync.
  useEffect(() => {
    if (authState === 'guest') {
      autoTriggered = false;
    }
  }, [authState]);

  // Auto-trigger on cold open once auth is settled AND network is confirmed
  // reachable. Re-runs on every relevant change; maybeAutoSync dedupes globally.
  useEffect(() => {
    maybeAutoSync({
      authenticated: authState === 'authenticated',
      networkReady: isNetworkReady && isConnected && isInternetReachable
    });
  }, [authState, isNetworkReady, isConnected, isInternetReachable]);

  return {
    isSyncing,
    syncError,
    downloadedCount,
    triggerSync,
    forceSync,
    clearSyncError
  };
};

// Test-only: reset the module-level store between cases. Production code never
// calls this — the store is a process-lifetime singleton by design.
export const __resetCloudSyncStoreForTests = (): void => {
  snapshot = { isSyncing: false, syncError: null, downloadedCount: 0 };
  listeners.clear();
  latestIsAuthenticated = false;
  autoTriggered = false;
  isRunning = false;
  autoSyncInFlight = false;
};
