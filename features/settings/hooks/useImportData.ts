import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  analyzeImportPayload,
  importAnalyzedCards,
  type ImportPreview
} from '@/core/settings/importCards';

import { showToast } from '@/shared/toast';

type UseImportDataOptions = {
  isAuthenticated: boolean;
  onImportSuccess?: () => Promise<void> | void;
  onSyncRequested?: () => Promise<void>;
};

type ImportErrorState = {
  title: string;
  message: string;
  variant: 'invalid' | 'empty';
};

export const useImportData = ({
  isAuthenticated,
  onImportSuccess,
  onSyncRequested
}: UseImportDataOptions) => {
  const { t } = useTranslation();
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [errorState, setErrorState] = useState<ImportErrorState | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const closePreview = () => setPreview(null);
  const closeError = () => setErrorState(null);

  const getAnalysisMessage = (title: 'No Card Data' | 'Invalid File') => {
    return title === 'No Card Data'
      ? t('settings.import.noCardDataMessage')
      : t('settings.import.invalidFileMessage');
  };

  const pickImportFile = async () => {
    setIsPreparing(true);
    setErrorState(null);

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/json'],
        multiple: false,
        copyToCacheDirectory: true
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];
      if (!asset) {
        setErrorState({
          title: t('settings.import.invalidFileTitle'),
          message: t('settings.import.noFileSelected'),
          variant: 'invalid'
        });
        return;
      }

      const file = new File(asset.uri);
      const content = await file.text();
      const analysis = await analyzeImportPayload(content, asset.name);

      if (analysis.status === 'preview') {
        setPreview(analysis.preview);
        return;
      }

      setErrorState({
        title:
          analysis.title === 'No Card Data'
            ? t('settings.import.noCardDataTitle')
            : t('settings.import.invalidFileTitle'),
        message: getAnalysisMessage(analysis.title),
        variant: analysis.title === 'No Card Data' ? 'empty' : 'invalid'
      });
    } catch (error) {
      console.error('[useImportData] Failed to read import file', error);
      setErrorState({
        title: t('settings.import.invalidFileTitle'),
        message: t('settings.import.unreadableFile'),
        variant: 'invalid'
      });
    } finally {
      setIsPreparing(false);
    }
  };

  const confirmImport = async () => {
    if (!preview) {
      return;
    }

    setIsImporting(true);

    try {
      const result = await importAnalyzedCards(preview);

      if (typeof onImportSuccess === 'function') {
        await onImportSuccess();
      }

      setPreview(null);

      const messageParts: string[] = [];

      if (result.importedCount > 0) {
        messageParts.push(t('settings.import.toastImported', { count: result.importedCount }));
      } else {
        messageParts.push(t('settings.import.toastNoNewCards'));
      }

      if (result.duplicateCount > 0) {
        messageParts.push(
          t('settings.import.toastDuplicatesSkipped', { count: result.duplicateCount })
        );
      }

      if (result.invalidCount > 0) {
        messageParts.push(
          t('settings.import.toastInvalidEntriesSkipped', { count: result.invalidCount })
        );
      }

      await showToast({
        title:
          result.importedCount > 0
            ? t('settings.import.toastCompleteTitle')
            : t('settings.import.toastFinishedTitle'),
        message: messageParts.join(' • '),
        preset: 'done'
      });

      if (isAuthenticated && result.importedCount > 0 && onSyncRequested) {
        void onSyncRequested();
      }
    } catch (error) {
      console.error('[useImportData] Failed to import cards', error);
      setErrorState({
        title: t('settings.import.failedTitle'),
        message: t('settings.import.failedMessage'),
        variant: 'invalid'
      });
    } finally {
      setIsImporting(false);
    }
  };

  return {
    preview,
    errorState,
    isPreparing,
    isImporting,
    pickImportFile,
    confirmImport,
    closePreview,
    closeError
  };
};
