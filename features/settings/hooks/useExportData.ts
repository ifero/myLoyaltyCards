import Burnt from 'burnt';
import Constants from 'expo-constants';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useEffect, useState } from 'react';

import { getAllCards, getCardCount } from '@/core/database/card-repository';

import type { ExportCardRecord, ExportPayload } from '../types';

const EXPORT_VERSION = '1.0';

const toExportCards = async (): Promise<ExportCardRecord[]> => {
  const cards = await getAllCards();

  return cards.map((card) => ({
    storeName: card.name,
    cardNumber: card.barcode,
    barcodeFormat: card.barcodeFormat,
    color: card.color,
    createdAt: card.createdAt
  }));
};

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
      const cards = await toExportCards();
      const payload: ExportPayload = {
        version: EXPORT_VERSION,
        appVersion: Constants.expoConfig?.version ?? '1.0.0',
        exportDate: new Date().toISOString(),
        cardCount: cards.length,
        cards
      };

      const file = new File(Paths.cache, `myloyaltycards-export-${Date.now()}.json`);
      file.create();
      file.write(JSON.stringify(payload, null, 2));

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        throw new Error('Sharing is not available on this device');
      }

      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/json',
        dialogTitle: 'Export cards'
      });

      Burnt.toast({
        title: 'Export complete',
        preset: 'done'
      });

      await refreshCardCount();
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Export failed';
      setExportError(message);
      Burnt.toast({
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
