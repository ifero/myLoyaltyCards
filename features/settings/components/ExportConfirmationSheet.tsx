import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';

import { BottomSheet, Button } from '@/shared/components/ui';
import { useTheme } from '@/shared/theme';

type ExportConfirmationSheetProps = {
  visible: boolean;
  cardCount: number;
  isExporting: boolean;
  exportError: string | null;
  onExport: () => void;
  onClose: () => void;
};

export const ExportConfirmationSheet = ({
  visible,
  cardCount,
  isExporting,
  exportError,
  onExport,
  onClose
}: ExportConfirmationSheetProps) => {
  const { theme } = useTheme();

  return (
    <BottomSheet visible={visible} onClose={onClose} testID="export-confirmation-sheet">
      <View style={{ alignItems: 'center' }}>
        <MaterialIcons name="file-download" size={40} color={theme.primary} />
        <Text style={{ marginTop: 12, color: theme.textPrimary, fontSize: 30, fontWeight: '600' }}>
          Export Your Cards
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
          {`All ${cardCount} cards will be exported as a JSON file that you can save or share.`}
        </Text>
      </View>
      <View style={{ marginTop: 16, gap: 10 }}>
        <Button
          testID="export-confirm-button"
          variant="primary"
          onPress={onExport}
          loading={isExporting}
        >
          Export
        </Button>
        <Button testID="export-cancel-button" variant="tertiary" onPress={onClose}>
          Cancel
        </Button>
        {exportError ? (
          <Text
            testID="export-error-text"
            style={{ color: theme.error, textAlign: 'center', fontSize: 13 }}
          >
            {exportError}
          </Text>
        ) : null}
      </View>
    </BottomSheet>
  );
};
