import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';

import { BottomSheet, Button } from '@/shared/components/ui';
import { useTheme } from '@/shared/theme';

type ImportErrorSheetProps = {
  visible: boolean;
  title: string;
  message: string;
  variant: 'invalid' | 'empty';
  onClose: () => void;
};

export const ImportErrorSheet = ({
  visible,
  title,
  message,
  variant,
  onClose
}: ImportErrorSheetProps) => {
  const { theme } = useTheme();
  const isInvalid = variant === 'invalid';

  return (
    <BottomSheet visible={visible} onClose={onClose} testID="import-error-sheet">
      <View style={{ alignItems: 'center' }}>
        <MaterialIcons
          name={isInvalid ? 'error-outline' : 'info-outline'}
          size={40}
          color={isInvalid ? theme.warning : theme.info}
        />
        <Text
          style={{
            marginTop: 12,
            color: theme.textPrimary,
            fontSize: 20,
            fontWeight: '600',
            textAlign: 'center'
          }}
        >
          {title}
        </Text>
      </View>

      <View
        style={{
          marginTop: 14,
          borderRadius: 10,
          backgroundColor: isInvalid ? theme.warning + '1A' : theme.primary + '14',
          paddingHorizontal: 12,
          paddingVertical: 12,
          flexDirection: 'row',
          alignItems: 'center'
        }}
      >
        <MaterialIcons
          name={isInvalid ? 'warning-amber' : 'info-outline'}
          size={24}
          color={isInvalid ? theme.warning : theme.info}
        />
        <Text
          style={{
            marginLeft: 12,
            flex: 1,
            color: isInvalid ? theme.warning : theme.info,
            fontSize: 13,
            fontWeight: '500'
          }}
        >
          {message}
        </Text>
      </View>

      <View style={{ marginTop: 18 }}>
        <Button testID="import-error-ok" variant="primary" onPress={onClose} size="large">
          OK
        </Button>
      </View>
    </BottomSheet>
  );
};
