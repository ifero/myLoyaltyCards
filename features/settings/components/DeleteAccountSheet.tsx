import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { BottomSheet, Button } from '@/shared/components/ui';
import { useTheme } from '@/shared/theme';

type DeleteAccountSheetProps = {
  visible: boolean;
  isLoading: boolean;
  error: string | null;
  onConfirmDelete: () => Promise<void>;
  onClose: () => void;
};

export const DeleteAccountSheet = ({
  visible,
  isLoading,
  error,
  onConfirmDelete,
  onClose
}: DeleteAccountSheetProps) => {
  const { theme } = useTheme();
  const [step, setStep] = useState<1 | 2>(1);
  const [confirmationText, setConfirmationText] = useState('');

  useEffect(() => {
    if (!visible) {
      setStep(1);
      setConfirmationText('');
    }
  }, [visible]);

  const canDelete = confirmationText === 'DELETE';

  return (
    <BottomSheet visible={visible} onClose={onClose} testID="delete-account-sheet">
      {step === 1 ? (
        <View>
          <View style={{ alignItems: 'center' }}>
            <MaterialIcons name="warning-amber" size={40} color={theme.error} />
            <Text
              style={{ marginTop: 12, color: theme.textPrimary, fontSize: 30, fontWeight: '600' }}
            >
              Delete Account?
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
              This will permanently delete your account and all synced data. Cards stored locally on
              this device will remain.
            </Text>
          </View>
          <View style={{ marginTop: 16, gap: 10 }}>
            <Button testID="delete-cancel-step1" variant="secondary" onPress={onClose}>
              Cancel
            </Button>
            <Button testID="delete-continue-step1" variant="destructive" onPress={() => setStep(2)}>
              Continue
            </Button>
          </View>
        </View>
      ) : (
        <View>
          <Text style={{ color: theme.textPrimary, fontSize: 28, fontWeight: '600' }}>
            Confirm Account Deletion
          </Text>
          <Text style={{ marginTop: 8, color: theme.textSecondary, fontSize: 14, lineHeight: 20 }}>
            Type DELETE to confirm permanent account deletion.
          </Text>
          <TextInput
            testID="delete-confirm-input"
            value={confirmationText}
            onChangeText={setConfirmationText}
            autoCapitalize="characters"
            accessibilityLabel="Type DELETE to confirm"
            accessibilityHint="Type DELETE to enable account deletion"
            editable={!isLoading}
            style={{
              marginTop: 12,
              minHeight: 48,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.surfaceElevated,
              color: theme.textPrimary,
              paddingHorizontal: 12,
              paddingVertical: 10
            }}
          />
          <View style={{ marginTop: 14, gap: 10 }}>
            <Button testID="delete-cancel-step2" variant="secondary" onPress={onClose}>
              Cancel
            </Button>
            <Button
              testID="delete-confirm-step2"
              variant="destructive"
              onPress={onConfirmDelete}
              disabled={!canDelete || isLoading}
              loading={isLoading}
            >
              Delete
            </Button>
            {error ? (
              <Text
                testID="delete-error"
                style={{ color: theme.error, textAlign: 'center', fontSize: 13 }}
              >
                {error}
              </Text>
            ) : null}
          </View>
        </View>
      )}
    </BottomSheet>
  );
};
