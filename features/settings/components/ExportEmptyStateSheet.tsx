import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { BottomSheet, Button } from '@/shared/components/ui';
import { useTheme } from '@/shared/theme';

type ExportEmptyStateSheetProps = {
  visible: boolean;
  onClose: () => void;
};

export const ExportEmptyStateSheet = ({ visible, onClose }: ExportEmptyStateSheetProps) => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  return (
    <BottomSheet visible={visible} onClose={onClose} testID="export-empty-sheet">
      <View style={{ alignItems: 'center' }}>
        <MaterialIcons name="file-download" size={40} color={theme.primary} />
        <Text style={{ marginTop: 12, color: theme.textPrimary, fontSize: 30, fontWeight: '600' }}>
          {t('settings.export.emptyTitle')}
        </Text>
        <Text
          style={{
            marginTop: 8,
            color: theme.textSecondary,
            fontSize: 14,
            textAlign: 'center',
            lineHeight: 20
          }}
        >
          {t('settings.export.emptyBody')}
        </Text>
      </View>
      <View style={{ marginTop: 16 }}>
        <Button testID="export-empty-close" variant="primary" onPress={onClose}>
          {t('common.actions.ok')}
        </Button>
      </View>
    </BottomSheet>
  );
};
