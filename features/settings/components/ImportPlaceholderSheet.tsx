import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';

import { BottomSheet, Button } from '@/shared/components/ui';
import { useTheme } from '@/shared/theme';

type ImportPlaceholderSheetProps = {
  visible: boolean;
  onClose: () => void;
};

export const ImportPlaceholderSheet = ({ visible, onClose }: ImportPlaceholderSheetProps) => {
  const { theme } = useTheme();

  return (
    <BottomSheet visible={visible} onClose={onClose} testID="import-placeholder-sheet">
      <View style={{ alignItems: 'center' }}>
        <MaterialIcons name="file-upload" size={40} color={theme.primary} />
        <Text style={{ marginTop: 12, color: theme.textPrimary, fontSize: 30, fontWeight: '600' }}>
          Import Cards
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
          Import from JSON is coming soon in the next update.
        </Text>
      </View>
      <View style={{ marginTop: 16 }}>
        <Button testID="import-placeholder-close" variant="primary" onPress={onClose}>
          Done
        </Button>
      </View>
    </BottomSheet>
  );
};
