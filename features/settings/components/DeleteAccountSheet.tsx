import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TextInput, View } from 'react-native';

import { BottomSheet, Button } from '@/shared/components/ui';
import { useTheme } from '@/shared/theme';
import { TYPOGRAPHY, inputFont } from '@/shared/theme/typography';

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
  const { t } = useTranslation();
  const [step, setStep] = useState<1 | 2>(1);
  const [confirmationText, setConfirmationText] = useState('');

  useEffect(() => {
    if (!visible) {
      setStep(1);
      setConfirmationText('');
    }
  }, [visible]);

  const confirmKeyword = t('settings.deleteAccountSheet.confirmKeyword');
  const canDelete = confirmationText === confirmKeyword;

  return (
    <BottomSheet visible={visible} onClose={onClose} testID="delete-account-sheet">
      {step === 1 ? (
        <View>
          <View style={{ alignItems: 'center' }}>
            <MaterialIcons name="warning-amber" size={40} color={theme.error} />
            <Text style={{ ...TYPOGRAPHY.sheetTitle, marginTop: 12, color: theme.textPrimary }}>
              {t('settings.deleteAccountSheet.step1Title')}
            </Text>
            <Text
              style={{
                ...TYPOGRAPHY.bodyMd,
                marginTop: 8,
                color: theme.textSecondary,
                textAlign: 'center'
              }}
            >
              {t('settings.deleteAccountSheet.step1Body')}
            </Text>
          </View>
          <View style={{ marginTop: 16, gap: 10 }}>
            <Button testID="delete-cancel-step1" variant="secondary" onPress={onClose}>
              {t('common.actions.cancel')}
            </Button>
            <Button testID="delete-continue-step1" variant="destructive" onPress={() => setStep(2)}>
              {t('common.actions.continue')}
            </Button>
          </View>
        </View>
      ) : (
        <View>
          <Text style={{ ...TYPOGRAPHY.sheetTitle, color: theme.textPrimary }}>
            {t('settings.deleteAccountSheet.step2Title')}
          </Text>
          <Text style={{ ...TYPOGRAPHY.bodyMd, marginTop: 8, color: theme.textSecondary }}>
            {t('settings.deleteAccountSheet.step2Body')}
          </Text>
          <TextInput
            testID="delete-confirm-input"
            value={confirmationText}
            onChangeText={setConfirmationText}
            autoCapitalize="characters"
            accessibilityLabel={t('settings.deleteAccountSheet.confirmInputLabel')}
            accessibilityHint={t('settings.deleteAccountSheet.confirmInputHint')}
            editable={!isLoading}
            style={{
              ...inputFont(TYPOGRAPHY.bodyLg),
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
              {t('common.actions.cancel')}
            </Button>
            <Button
              testID="delete-confirm-step2"
              variant="destructive"
              onPress={onConfirmDelete}
              disabled={!canDelete || isLoading}
              loading={isLoading}
            >
              {t('common.actions.delete')}
            </Button>
            {error ? (
              <Text
                testID="delete-error"
                style={{ ...TYPOGRAPHY.captionMd, color: theme.error, textAlign: 'center' }}
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
