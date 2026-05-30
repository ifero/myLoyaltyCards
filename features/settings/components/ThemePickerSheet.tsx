import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { BottomSheet } from '@/shared/components/ui';
import { useTheme } from '@/shared/theme';
import { DARK_THEME, LIGHT_THEME } from '@/shared/theme/colors';

import type { ThemePreference } from '../types';

type ThemePickerSheetProps = {
  visible: boolean;
  selectedTheme: ThemePreference;
  onSelect: (theme: ThemePreference) => void;
  onClose: () => void;
};

export const ThemePickerSheet = ({
  visible,
  selectedTheme,
  onSelect,
  onClose
}: ThemePickerSheetProps) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const options: Array<{ key: ThemePreference; label: string }> = [
    { key: 'light', label: t('common.theme.light') },
    { key: 'dark', label: t('common.theme.dark') },
    { key: 'system', label: t('common.theme.system') }
  ];

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t('settings.theme.pickerTitle')}
      testID="theme-picker-sheet"
      accessibilityLabel={t('settings.theme.pickerAccessibilityLabel')}
    >
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {options.map((option) => {
          const isSelected = option.key === selectedTheme;

          return (
            <Pressable
              key={option.key}
              testID={`theme-option-${option.key}`}
              onPress={() => onSelect(option.key)}
              accessibilityRole="button"
              accessibilityLabel={t('settings.theme.optionAccessibilityLabel', {
                name: option.label
              })}
              style={{ width: 101 }}
            >
              <View
                style={{
                  height: 120,
                  borderRadius: 12,
                  borderWidth: isSelected ? 2 : 1,
                  borderColor: isSelected ? theme.primary : theme.border,
                  overflow: 'hidden'
                }}
              >
                <View
                  style={{
                    height: 60,
                    backgroundColor:
                      option.key === 'dark' ? DARK_THEME.surface : LIGHT_THEME.surface
                  }}
                />
                <View
                  style={{
                    height: 60,
                    backgroundColor:
                      option.key === 'light' ? LIGHT_THEME.surfaceElevated : DARK_THEME.background
                  }}
                />
                {isSelected ? (
                  <MaterialIcons
                    name="check-circle"
                    size={20}
                    color={theme.primary}
                    style={{ position: 'absolute', right: 4, top: 4 }}
                  />
                ) : null}
              </View>
              <Text
                style={{
                  marginTop: 8,
                  textAlign: 'center',
                  fontSize: 14,
                  color: isSelected ? theme.primary : theme.textPrimary,
                  fontWeight: isSelected ? '600' : '400'
                }}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={{ marginTop: 10, color: theme.textSecondary, fontSize: 13 }}>
        {t('settings.theme.systemDescription')}
      </Text>
    </BottomSheet>
  );
};
