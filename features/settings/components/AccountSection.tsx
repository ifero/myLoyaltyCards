import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { ActionRow } from '@/shared/components/ui';
import { useTheme } from '@/shared/theme';

type AccountSectionProps = {
  email: string;
  onSignOut: () => void;
  onDeleteAccount: () => void;
};

export const AccountSection = ({ email, onSignOut, onDeleteAccount }: AccountSectionProps) => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  return (
    <View style={{ gap: 16 }}>
      <View
        testID="settings-account-card"
        style={{
          borderRadius: 12,
          backgroundColor: theme.surfaceElevated,
          paddingHorizontal: 16,
          paddingVertical: 20,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14
        }}
      >
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 999,
            backgroundColor: theme.primary,
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 24 }}>
            {email.trim().charAt(0).toUpperCase() || 'U'}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text
            numberOfLines={1}
            style={{ color: theme.textPrimary, fontSize: 16, fontWeight: '500' }}
          >
            {email}
          </Text>
          <View style={{ marginTop: 2, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
              {t('settings.account.signedIn')}
            </Text>
            <MaterialIcons name="circle" size={8} color={theme.success} />
            <Text style={{ color: theme.success, fontSize: 13 }}>
              {t('settings.account.synced')}
            </Text>
          </View>
        </View>
      </View>

      <ActionRow
        testID="settings-signout-row"
        variant="plain"
        prefix={<MaterialIcons name="logout" size={24} color={theme.primary} />}
        label={t('common.actions.signOut')}
        accessibilityLabel={t('settings.account.signOutA11y')}
        onPress={onSignOut}
      />
      <ActionRow
        testID="settings-delete-row"
        variant="plain"
        prefix={<MaterialIcons name="delete-outline" size={24} color={theme.error} />}
        label={t('settings.account.deleteAccount')}
        onPress={onDeleteAccount}
        destructive
        accessibilityLabel={t('settings.account.deleteAccountA11y')}
      />
    </View>
  );
};
