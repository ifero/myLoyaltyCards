import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { useState } from 'react';

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
  title: 'Invalid File' | 'No Card Data' | 'Import Failed';
  message: string;
};

export const useImportData = ({
  isAuthenticated,
  onImportSuccess,
  onSyncRequested
}: UseImportDataOptions) => {
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [errorState, setErrorState] = useState<ImportErrorState | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const closePreview = () => setPreview(null);
  const closeError = () => setErrorState(null);

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
        setErrorState({ title: 'Invalid File', message: 'No file was selected.' });
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
        title: analysis.title,
        message: analysis.message
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to read the selected file.';
      setErrorState({ title: 'Invalid File', message });
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
        messageParts.push(
          `${result.importedCount} card${result.importedCount === 1 ? '' : 's'} imported successfully`
        );
      } else {
        messageParts.push('No new cards were imported');
      }

      if (result.duplicateCount > 0) {
        messageParts.push(
          `${result.duplicateCount} duplicate${result.duplicateCount === 1 ? '' : 's'} skipped`
        );
      }

      if (result.invalidCount > 0) {
        messageParts.push(
          `${result.invalidCount} invalid entr${result.invalidCount === 1 ? 'y' : 'ies'} skipped`
        );
      }

      await showToast({
        title: result.importedCount > 0 ? 'Import complete' : 'Import finished',
        message: messageParts.join(' • '),
        preset: 'done'
      });

      if (isAuthenticated && result.importedCount > 0 && onSyncRequested) {
        void onSyncRequested();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Import failed';
      setErrorState({ title: 'Import Failed', message });
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
