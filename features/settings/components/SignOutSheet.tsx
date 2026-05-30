import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { BottomSheet, Button } from '@/shared/components/ui';
import { useTheme } from '@/shared/theme';

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
        <Text style={{ marginTop: 12, color: theme.textPrimary, fontSize: 30, fontWeight: '600' }}>
          {t('settings.signOutSheet.title')}
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
            style={{ color: theme.error, textAlign: 'center', fontSize: 13 }}
          >
            {error}
          </Text>
        ) : null}
      </View>
    </BottomSheet>
  );
};
