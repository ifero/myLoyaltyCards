import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { BottomSheet, Button } from '@/shared/components/ui';
import { useTheme } from '@/shared/theme';
import { TYPOGRAPHY } from '@/shared/theme/typography';

type ExportConfirmationSheetProps = {
  visible: boolean;
  cardCount: number;
  isExporting: boolean;
  exportError: string | null;
  onExport: () => void;
  onClose: () => void;
};

export const ExportConfirmationSheet = ({
  visible,
  cardCount,
  isExporting,
  exportError,
  onExport,
  onClose
}: ExportConfirmationSheetProps) => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  return (
    <BottomSheet visible={visible} onClose={onClose} testID="export-confirmation-sheet">
      <View style={{ alignItems: 'center' }}>
        <MaterialIcons name="file-download" size={40} color={theme.primary} />
        <Text style={{ ...TYPOGRAPHY.sheetTitle, marginTop: 12, color: theme.textPrimary }}>
          {t('settings.export.confirmTitle')}
        </Text>
        <Text
          style={{
            ...TYPOGRAPHY.bodyMd,
            marginTop: 8,
            color: theme.textSecondary,
            textAlign: 'center'
          }}
        >
          {t('settings.export.confirmBody', { count: cardCount })}
        </Text>
      </View>
      <View style={{ marginTop: 16, gap: 10 }}>
        <Button
          testID="export-confirm-button"
          variant="primary"
          onPress={onExport}
          loading={isExporting}
        >
          {t('common.actions.export')}
        </Button>
        <Button testID="export-cancel-button" variant="tertiary" onPress={onClose}>
          {t('common.actions.cancel')}
        </Button>
        {exportError ? (
          <Text
            testID="export-error-text"
            style={{ ...TYPOGRAPHY.captionMd, color: theme.error, textAlign: 'center' }}
          >
            {exportError}
          </Text>
        ) : null}
      </View>
    </BottomSheet>
  );
};
