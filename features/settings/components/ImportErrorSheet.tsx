import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { BottomSheet, Button } from '@/shared/components/ui';
import { useTheme } from '@/shared/theme';
import { TYPOGRAPHY } from '@/shared/theme/typography';

type ImportErrorSheetProps = {
  visible: boolean;
  title: string;
  message: string;
  variant: 'invalid' | 'empty';
  onClose: () => void;
};

export const ImportErrorSheet = ({
  visible,
  title,
  message,
  variant,
  onClose
}: ImportErrorSheetProps) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const isInvalid = variant === 'invalid';

  return (
    <BottomSheet visible={visible} onClose={onClose} testID="import-error-sheet">
      <View style={{ alignItems: 'center' }}>
        <MaterialIcons
          name={isInvalid ? 'error-outline' : 'info-outline'}
          size={40}
          color={isInvalid ? theme.warning : theme.info}
        />
        <Text
          style={{
            ...TYPOGRAPHY.sheetTitle,
            marginTop: 12,
            color: theme.textPrimary,
            textAlign: 'center'
          }}
        >
          {title}
        </Text>
      </View>

      <View
        style={{
          marginTop: 14,
          borderRadius: 10,
          // Each half takes its OWN role's wash. The info branch read
          // `theme.primary`, which was invisible while primary and info were the
          // same blue and became a beam-yellow wash behind cream "info" content
          // the moment Story 21.2's dark theme split them.
          backgroundColor: isInvalid ? theme.warning + '1A' : theme.info + '14',
          paddingHorizontal: 12,
          paddingVertical: 12,
          flexDirection: 'row',
          alignItems: 'center'
        }}
      >
        <MaterialIcons
          name={isInvalid ? 'warning-amber' : 'info-outline'}
          size={24}
          color={isInvalid ? theme.warning : theme.info}
        />
        <Text
          style={{
            marginLeft: 12,
            flex: 1,
            color: isInvalid ? theme.warning : theme.info,
            ...TYPOGRAPHY.bodyMd
          }}
        >
          {message}
        </Text>
      </View>

      <View style={{ marginTop: 18 }}>
        <Button testID="import-error-ok" variant="primary" onPress={onClose} size="large">
          {t('common.actions.ok')}
        </Button>
      </View>
    </BottomSheet>
  );
};
