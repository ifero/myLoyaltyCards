import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getLastSyncAt } from '@/core/sync/sync-timestamp';
import { formatRelativeTime } from '@/core/utils/relative-time';

import { useCloudSync } from '@/shared/hooks/useCloudSync';

export const useSyncTrigger = () => {
  const { i18n } = useTranslation();
  const { triggerSync, isSyncing } = useCloudSync();
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const locale = i18n.resolvedLanguage?.startsWith('it') ? 'it-IT' : 'en-US';
  const [syncLabel, setSyncLabel] = useState(() => formatRelativeTime(null, locale));

  useEffect(() => {
    const load = async () => {
      const value = await getLastSyncAt();
      setLastSyncAt(value);
      setSyncLabel(formatRelativeTime(value, locale));
    };

    load();
  }, [locale]);

  useEffect(() => {
    const interval = setInterval(() => {
      setSyncLabel(formatRelativeTime(lastSyncAt, locale));
    }, 30_000);

    return () => clearInterval(interval);
  }, [lastSyncAt, locale]);

  const runSync = async () => {
    await triggerSync();
    const next = await getLastSyncAt();
    setLastSyncAt(next);
    setSyncLabel(formatRelativeTime(next, locale));
  };

  return {
    isSyncing,
    syncLabel,
    triggerSync: runSync
  };
};
