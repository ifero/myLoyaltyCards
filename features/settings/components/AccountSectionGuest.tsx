import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/shared/components/ui';
import { useTheme } from '@/shared/theme';

type AccountSectionGuestProps = {
  onCreateAccount: () => void;
  onSignIn: () => void;
};

export const AccountSectionGuest = ({ onCreateAccount, onSignIn }: AccountSectionGuestProps) => {
  const { theme } = useTheme();

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
          Not signed in yet
        </Text>
      </View>
      <Text style={{ color: theme.textSecondary, fontSize: 14, marginTop: 10, lineHeight: 20 }}>
        Sign in or create an account to back up your cards and sync across devices.
      </Text>
      <View style={{ marginTop: 12, flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button
            testID="settings-create-account-button"
            variant="primary"
            onPress={onCreateAccount}
          >
            Create Account
          </Button>
        </View>
        <View style={{ width: 115 }}>
          <Button testID="settings-sign-in-button" variant="secondary" onPress={onSignIn}>
            Sign In
          </Button>
        </View>
      </View>
    </View>
  );
};
