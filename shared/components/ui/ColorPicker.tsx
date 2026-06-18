import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { CARD_COLORS, useTheme } from '@/shared/theme';
import { TOUCH_TARGET } from '@/shared/theme/spacing';

type ColorKey = keyof typeof CARD_COLORS;

type ColorPickerProps = {
  value: ColorKey;
  onChange: (nextValue: ColorKey) => void;
  testID?: string;
};

const palette: ColorKey[] = ['blue', 'red', 'green', 'orange', 'grey'];

export const ColorPicker = ({ value, onChange, testID }: ColorPickerProps) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const colorNames: Record<ColorKey, string> = {
    blue: t('cards.colors.blue'),
    red: t('cards.colors.red'),
    green: t('cards.colors.green'),
    orange: t('cards.colors.orange'),
    grey: t('cards.colors.grey')
  };

  return (
    <View testID={testID} style={styles.row}>
      {palette.map((color) => {
        const selected = color === value;

        return (
          <Pressable
            key={color}
            testID={`${testID}-${color}`}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={t('cards.colors.accessibilityLabel', {
              color: colorNames[color],
              selected: selected ? t('cards.colors.selectedSuffix') : ''
            })}
            onPress={() => onChange(color)}
            style={{
              width: TOUCH_TARGET.min,
              height: TOUCH_TARGET.min,
              borderRadius: 999,
              borderWidth: selected ? 3 : 1,
              borderColor: selected ? theme.primary : theme.border,
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <View
              style={{
                width: 30,
                height: 30,
                borderRadius: 999,
                backgroundColor: CARD_COLORS[color]
              }}
            />
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24
  }
});
