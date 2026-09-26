import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { ActionRow } from '@/shared/components/ui';
import { useTheme } from '@/shared/theme';
import { MONOGRAM_TEXT_PROPS, TYPOGRAPHY, monogram } from '@/shared/theme/typography';

type AccountSectionProps = {
  email: string;
  onSignOut: () => void;
  onChangePassword: () => void;
  onDeleteAccount: () => void;
  isChangingPassword?: boolean;
};

export const AccountSection = ({
  email,
  onSignOut,
  onChangePassword,
  onDeleteAccount,
  isChangingPassword = false
}: AccountSectionProps) => {
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
          <Text {...MONOGRAM_TEXT_PROPS} style={{ ...monogram(24), color: theme.onPrimary }}>
            {email.trim().charAt(0).toUpperCase() || 'U'}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ ...TYPOGRAPHY.bodyLg, color: theme.textPrimary }}>
            {email}
          </Text>
          <View style={{ marginTop: 2, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Text style={{ ...TYPOGRAPHY.captionMd, color: theme.textSecondary }}>
              {t('settings.account.signedIn')}
            </Text>
            <MaterialIcons name="circle" size={8} color={theme.success} />
            <Text style={{ ...TYPOGRAPHY.captionMd, color: theme.success }}>
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
        testID="settings-change-password-row"
        variant="plain"
        prefix={<MaterialIcons name="lock-outline" size={24} color={theme.primary} />}
        label={t('settings.account.changePassword')}
        accessibilityLabel={t('settings.account.changePasswordA11y')}
        onPress={onChangePassword}
        isLoading={isChangingPassword}
        disabled={isChangingPassword}
        showChevron={!isChangingPassword}
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
