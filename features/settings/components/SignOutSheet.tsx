import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { BottomSheet, Button } from '@/shared/components/ui';
import { useTheme } from '@/shared/theme';
import { TYPOGRAPHY } from '@/shared/theme/typography';

type SignOutSheetProps = {
  visible: boolean;
  isLoading: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
};

export const SignOutSheet = ({
  visible,
  isLoading,
  error,
  onConfirm,
  onClose
}: SignOutSheetProps) => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  return (
    <BottomSheet visible={visible} onClose={onClose} testID="signout-sheet">
      <View style={{ alignItems: 'center' }}>
        <MaterialIcons name="logout" size={40} color={theme.primary} />
        <Text style={{ ...TYPOGRAPHY.sheetTitle, marginTop: 12, color: theme.textPrimary }}>
          {t('settings.signOutSheet.title')}
        </Text>
        <Text
          style={{
            ...TYPOGRAPHY.bodyMd,
            marginTop: 8,
            color: theme.textSecondary,
            textAlign: 'center'
          }}
        >
          {t('settings.signOutSheet.body')}
        </Text>
      </View>
      <View style={{ marginTop: 16, gap: 10 }}>
        <Button testID="signout-cancel" variant="secondary" onPress={onClose}>
          {t('common.actions.cancel')}
        </Button>
        <Button
          testID="signout-confirm"
          variant="destructive"
          onPress={onConfirm}
          loading={isLoading}
        >
          {t('common.actions.signOut')}
        </Button>
        {error ? (
          <Text
            testID="signout-error"
            style={{ ...TYPOGRAPHY.captionMd, color: theme.error, textAlign: 'center' }}
          >
            {error}
          </Text>
        ) : null}
      </View>
    </BottomSheet>
  );
};
