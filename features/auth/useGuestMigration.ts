/**
 * useGuestMigration Hook
 * Story 6.14: Upgrade Guest to Account
 *
 * React hook that manages the guest-to-account card migration lifecycle.
 * Exposes migration state for the UI banner and a retry callback.
 *
 * Usage: call `trigger(userId)` after the first successful authentication.
 * The hook checks the `guestMigrationCompleted` flag before running.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { isMigrationCompleted, migrateGuestCardsToCloud } from '@/core/auth/guest-migration';
import type { MigrationResult } from '@/core/auth/guest-migration';
import { CloudCardRow } from '@/core/sync';

import { getSession } from '@/shared/supabase/auth';
import { getSupabaseClient } from '@/shared/supabase/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MigrationStatus = 'idle' | 'migrating' | 'success' | 'error';

export type UseGuestMigrationReturn = {
  /** Current migration lifecycle state */
  status: MigrationStatus;
  /** Human-readable message for the UI banner */
  message: string | null;
  /** Number of cards migrated so far (useful for partial-failure retry) */
  migratedCount: number;
  /** Trigger migration for the given authenticated userId */
  trigger: (userId: string) => Promise<void>;
  /** Retry a failed migration */
  retry: () => Promise<void>;
  /** Dismiss the banner (success or error) */
  dismiss: () => void;
};

// ---------------------------------------------------------------------------
// Auto-dismiss delay (ms)
// ---------------------------------------------------------------------------

export const SUCCESS_BANNER_DELAY = 3000;

// ---------------------------------------------------------------------------
// Supabase upsert wrapper (injected into core/ migration service)
// ---------------------------------------------------------------------------

const supabaseUpsert = async (rows: CloudCardRow[]): Promise<{ error: string | null }> => {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('loyalty_cards').upsert(rows, { onConflict: 'id' });
  return { error: error?.message ?? null };
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export const useGuestMigration = (): UseGuestMigrationReturn => {
  const [status, setStatus] = useState<MigrationStatus>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [migratedCount, setMigratedCount] = useState(0);
  const lastUserIdRef = useRef<string | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasTriggeredRef = useRef(false);
  const isRunningRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  const dismiss = useCallback(() => {
    clearTimer();
    setStatus('idle');
    setMessage(null);
  }, [clearTimer]);

  const runMigration = useCallback(
    async (userId: string) => {
      // Prevent concurrent migrations
      if (isRunningRef.current) return;
      isRunningRef.current = true;

      try {
        // Skip if already completed
        const alreadyDone = await isMigrationCompleted();
        if (alreadyDone) {
          return;
        }

        setStatus('migrating');
        setMessage('Your cards are being backed up…');

        const result: MigrationResult = await migrateGuestCardsToCloud(userId, supabaseUpsert);

        if (result.success) {
          setMigratedCount(result.migratedCount);
          setStatus('success');
          setMessage('Your cards are safe — backed up to the cloud ✓');

          // Auto-dismiss after 3s
          clearTimer();
          dismissTimerRef.current = setTimeout(() => {
            setStatus('idle');
            setMessage(null);
          }, SUCCESS_BANNER_DELAY);
        } else {
          setMigratedCount(result.migratedCount);
          setStatus('error');
          setMessage("Some cards couldn't be backed up. Tap to retry.");
        }
      } finally {
        isRunningRef.current = false;
      }
    },
    [clearTimer]
  );

  const trigger = useCallback(
    async (userId: string) => {
      lastUserIdRef.current = userId;
      await runMigration(userId);
    },
    [runMigration]
  );

  const retry = useCallback(async () => {
    if (lastUserIdRef.current) {
      await runMigration(lastUserIdRef.current);
    }
  }, [runMigration]);

  // Auto-trigger on mount: check if user is authenticated and migration needed
  useEffect(() => {
    if (hasTriggeredRef.current) return;

    const checkAndTrigger = async () => {
      const sessionResult = await getSession();
      if (!sessionResult.success || !sessionResult.data) return;

      const userId = sessionResult.data.user.id;
      hasTriggeredRef.current = true;
      lastUserIdRef.current = userId;
      await runMigration(userId);
    };

    checkAndTrigger();
  }, [runMigration]);

  return { status, message, migratedCount, trigger, retry, dismiss };
};
