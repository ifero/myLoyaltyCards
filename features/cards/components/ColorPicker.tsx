/**
 * Color Picker Component
 * Story 2.2: Add Card Manually - AC6
 *
 * A 5-color horizontal picker for card colors.
 * Shows visual selection with checkmark overlay.
 */

import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, View, Text } from 'react-native';

import { CardColor, CARD_COLOR_KEYS } from '@/core/schemas';

import { CARD_COLORS } from '@/shared/theme';

interface ColorPickerProps {
  value: CardColor;
  onChange: (color: CardColor) => void;
  testID?: string;
}

/**
 * ColorPicker - 5-color selection component
 *
 * Per AC6:
 * - 5 color options displayed as circles: Blue, Red, Green, Orange, Grey (default)
 * - Selected color shows checkmark overlay
 * - Touch target: 44px diameter
 */
export function ColorPicker({ value, onChange, testID }: ColorPickerProps) {
  const { t } = useTranslation();
  const colorNames: Record<CardColor, string> = {
    blue: t('cards.colors.blue'),
    red: t('cards.colors.red'),
    green: t('cards.colors.green'),
    orange: t('cards.colors.orange'),
    grey: t('cards.colors.grey')
  };

  return (
    <View testID={testID}>
      <Text className="mb-2 text-xs text-gray-500">{t('addCard.setup.colorLabel')}</Text>
      <View className="flex-row gap-2">
        {CARD_COLOR_KEYS.map((color) => {
          const isSelected = value === color;
          const colorHex = CARD_COLORS[color];

          return (
            <Pressable
              key={color}
              onPress={() => onChange(color)}
              accessibilityRole="button"
              accessibilityLabel={t('cards.colors.accessibilityLabel', {
                color: colorNames[color],
                selected: isSelected ? t('cards.colors.selectedSuffix') : ''
              })}
              accessibilityState={{ selected: isSelected }}
              testID={`color-option-${color}`}
              className="h-11 w-11 items-center justify-center rounded-full"
              style={{
                backgroundColor: colorHex,
                borderWidth: isSelected ? 2 : 0,
                borderColor: 'white'
              }}
            >
              {isSelected && <MaterialIcons name="check" size={18} color="#FFFFFF" />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
