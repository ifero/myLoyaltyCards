import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
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

  return (
    <BottomSheet visible={visible} onClose={onClose} testID="signout-sheet">
      <View style={{ alignItems: 'center' }}>
        <MaterialIcons name="logout" size={40} color={theme.primary} />
        <Text style={{ marginTop: 12, color: theme.textPrimary, fontSize: 30, fontWeight: '600' }}>
          Sign Out?
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
          You will return to guest mode. Your cards will remain on this device.
        </Text>
      </View>
      <View style={{ marginTop: 16, gap: 10 }}>
        <Button testID="signout-cancel" variant="secondary" onPress={onClose}>
          Cancel
        </Button>
        <Button
          testID="signout-confirm"
          variant="destructive"
          onPress={onConfirm}
          loading={isLoading}
        >
          Sign Out
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
