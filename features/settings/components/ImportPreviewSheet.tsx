import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { BottomSheet, Button } from '@/shared/components/ui';
import { useTheme } from '@/shared/theme';

type ImportPreviewSheetProps = {
  visible: boolean;
  fileName: string;
  totalCards: number;
  newCardsCount: number;
  duplicateCount: number;
  invalidCount: number;
  isImporting: boolean;
  onImport: () => void;
  onClose: () => void;
};

export const ImportPreviewSheet = ({
  visible,
  fileName,
  totalCards,
  newCardsCount,
  duplicateCount,
  invalidCount,
  isImporting,
  onImport,
  onClose
}: ImportPreviewSheetProps) => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  return (
    <BottomSheet visible={visible} onClose={onClose} testID="import-preview-sheet">
      <View style={{ alignItems: 'center' }}>
        <MaterialIcons name="file-upload" size={40} color={theme.primary} />
        <Text
          style={{
            marginTop: 12,
            color: theme.textPrimary,
            fontSize: 20,
            fontWeight: '600',
            textAlign: 'center'
          }}
        >
          {t('settings.import.previewTitle')}
        </Text>
      </View>

      <View
        style={{
          marginTop: 14,
          borderRadius: 10,
          backgroundColor: theme.surfaceElevated,
          paddingHorizontal: 12,
          paddingVertical: 12,
          flexDirection: 'row',
          alignItems: 'center'
        }}
      >
        <MaterialIcons name="description" size={24} color={theme.textSecondary} />
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={{ color: theme.textPrimary, fontSize: 15, fontWeight: '500' }}>
            {fileName}
          </Text>
          <Text style={{ color: theme.textSecondary, fontSize: 13, marginTop: 2 }}>
            {t('settings.import.totalCardsFound', { count: totalCards })}
          </Text>
        </View>
      </View>

      <View style={{ marginTop: 16, gap: 2 }}>
        <Text style={{ color: theme.textSecondary, fontSize: 14, textAlign: 'center' }}>
          {t('settings.import.newCardsAdded', { count: newCardsCount })}
        </Text>
        <Text style={{ color: theme.textSecondary, fontSize: 14, textAlign: 'center' }}>
          {t('settings.import.duplicatesSkipped', { count: duplicateCount })}
        </Text>
        {invalidCount > 0 ? (
          <Text style={{ color: theme.textSecondary, fontSize: 14, textAlign: 'center' }}>
            {t('settings.import.invalidEntriesSkipped', { count: invalidCount })}
          </Text>
        ) : null}
      </View>

      <View style={{ marginTop: 18, gap: 10 }}>
        <Button
          testID="import-preview-confirm"
          variant="primary"
          onPress={onImport}
          loading={isImporting}
          disabled={newCardsCount === 0}
          size="large"
        >
          {t('common.actions.import')}
        </Button>
        <Button testID="import-preview-cancel" variant="tertiary" onPress={onClose}>
          {t('common.actions.cancel')}
        </Button>
      </View>
    </BottomSheet>
  );
};
