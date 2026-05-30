import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { Button } from '@/shared/components/ui';
import { useTheme } from '@/shared/theme';

type AccountSectionGuestProps = {
  onCreateAccount: () => void;
  onSignIn: () => void;
};

export const AccountSectionGuest = ({ onCreateAccount, onSignIn }: AccountSectionGuestProps) => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  return (
    <View
      testID="settings-guest-card"
      style={{
        borderRadius: 12,
        backgroundColor: theme.surfaceElevated,
        paddingHorizontal: 16,
        paddingVertical: 16
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <MaterialIcons name="verified-user" size={36} color={theme.primary} />
        <Text style={{ color: theme.textPrimary, fontSize: 16, fontWeight: '500', flex: 1 }}>
          {t('settings.account.guestTitle')}
        </Text>
      </View>
      <Text style={{ color: theme.textSecondary, fontSize: 14, marginTop: 10, lineHeight: 20 }}>
        {t('settings.account.guestBody')}
      </Text>
      <View style={{ marginTop: 12, flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button
            testID="settings-create-account-button"
            variant="primary"
            onPress={onCreateAccount}
          >
            {t('common.actions.createAccount')}
          </Button>
        </View>
        <View style={{ width: 115 }}>
          <Button testID="settings-sign-in-button" variant="secondary" onPress={onSignIn}>
            {t('common.actions.signIn')}
          </Button>
        </View>
      </View>
    </View>
  );
};
