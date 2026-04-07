import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { BottomSheet } from '@/shared/components/ui';
import { useTheme } from '@/shared/theme';

import type { LanguageOption } from '../types';

type LanguagePickerSheetProps = {
  visible: boolean;
  currentCode: string;
  options: LanguageOption[];
  onSelect: (code: string) => void;
  onClose: () => void;
};

export const LanguagePickerSheet = ({
  visible,
  currentCode,
  options,
  onSelect,
  onClose
}: LanguagePickerSheetProps) => {
  const { theme } = useTheme();

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Language"
      testID="language-picker-sheet"
      accessibilityLabel="Language Picker"
    >
      <View>
        {options.map((option, index) => {
          const isSelected = option.code === currentCode;

          return (
            <Pressable
              key={option.code}
              testID={`language-option-${option.code}`}
              onPress={() => onSelect(option.code)}
              accessibilityRole="button"
              accessibilityLabel={`${option.name} language`}
              style={{
                minHeight: 48,
                borderBottomWidth: index === options.length - 1 ? 0 : 1,
                borderBottomColor: theme.border,
                justifyContent: 'center'
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <Text style={{ color: theme.textPrimary, fontSize: 16 }}>{option.name}</Text>
                {isSelected ? <MaterialIcons name="check" size={24} color={theme.primary} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </BottomSheet>
  );
};
