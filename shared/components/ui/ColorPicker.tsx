import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { CARD_COLOR_KEYS } from '@/core/schemas';

import { CARD_COLORS, useTheme } from '@/shared/theme';
import { TOUCH_TARGET } from '@/shared/theme/spacing';

type ColorKey = keyof typeof CARD_COLORS;

type ColorPickerProps = {
  value: ColorKey;
  onChange: (nextValue: ColorKey) => void;
  testID?: string;
};

/**
 * Story 21.2a: this was a hand-written third copy of the key list. The five keys
 * are a frozen contract (see CARD_COLOR_KEYS), so the copy could not drift in
 * VALUE — but it could silently drift in ORDER or COUNT from the canonical list
 * and from `features/cards/components/ColorPicker.tsx`, which already iterates
 * CARD_COLOR_KEYS. One source, two pickers.
 */
const palette: ColorKey[] = [...CARD_COLOR_KEYS];

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
