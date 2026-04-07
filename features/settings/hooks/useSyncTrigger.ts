import { useEffect, useState } from 'react';

import { getLastSyncAt } from '@/core/sync/sync-timestamp';
import { formatRelativeTime } from '@/core/utils/relative-time';

import { useCloudSync } from '@/shared/hooks/useCloudSync';

export const useSyncTrigger = () => {
  const { triggerSync, isSyncing } = useCloudSync();
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [syncLabel, setSyncLabel] = useState('Never');

  useEffect(() => {
    const load = async () => {
      const value = await getLastSyncAt();
      setLastSyncAt(value);
      setSyncLabel(formatRelativeTime(value));
    };

    load();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setSyncLabel(formatRelativeTime(lastSyncAt));
    }, 30_000);

    return () => clearInterval(interval);
  }, [lastSyncAt]);

  const runSync = async () => {
    await triggerSync();
    const next = await getLastSyncAt();
    setLastSyncAt(next);
    setSyncLabel(formatRelativeTime(next));
  };

  return {
    isSyncing,
    syncLabel,
    triggerSync: runSync
  };
};
