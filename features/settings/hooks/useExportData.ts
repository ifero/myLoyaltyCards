import Constants from 'expo-constants';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useEffect, useState } from 'react';

import { getAllCards, getCardCount } from '@/core/database/card-repository';
import { createExportPayload } from '@/core/settings/importCards';

import { showToast } from '@/shared/toast';

export const useExportData = () => {
  const [cardCount, setCardCount] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const refreshCardCount = async () => {
    const count = await getCardCount();
    setCardCount(count);
  };

  useEffect(() => {
    refreshCardCount();
  }, []);

  const exportCards = async (): Promise<boolean> => {
    setIsExporting(true);
    setExportError(null);

    try {
      const cards = await getAllCards();
      const payload = createExportPayload(cards, Constants.expoConfig?.version ?? '1.0.0');

      const file = new File(Paths.document, `myloyaltycards-export-${Date.now()}.json`);
      file.create({ overwrite: true });
      file.write(JSON.stringify(payload, null, 2));

      let shareFailed = false;

      try {
        const canShare = await Sharing.isAvailableAsync();
        if (!canShare) {
          shareFailed = true;
        } else {
          await Sharing.shareAsync(file.uri, {
            mimeType: 'application/json',
            dialogTitle: 'Export cards'
          });
        }
      } catch (error) {
        shareFailed = true;
        console.warn('[useExportData] Sharing failed, keeping exported file locally', error);
      }

      await showToast({
        title: 'Export complete',
        message: shareFailed
          ? 'Backup saved locally in Files. Sharing is unavailable in this environment.'
          : undefined,
        preset: 'done'
      });

      await refreshCardCount();
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Export failed';
      setExportError(message);
      await showToast({
        title: 'Export failed',
        message,
        preset: 'error'
      });
      return false;
    } finally {
      setIsExporting(false);
    }
  };

  return {
    cardCount,
    hasCards: cardCount > 0,
    isExporting,
    exportError,
    refreshCardCount,
    exportCards
  };
};
