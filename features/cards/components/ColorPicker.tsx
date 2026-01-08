/**
 * Color Picker Component
 * Story 2.2: Add Card Manually - AC6
 *
 * A 5-color horizontal picker for card colors.
 * Shows visual selection with checkmark overlay.
 */

import { Pressable, View, Text } from 'react-native';

import { CardColor, CARD_COLOR_KEYS } from '@/core/schemas';

import { CARD_COLORS } from '@/shared/theme';

interface ColorPickerProps {
  value: CardColor;
  onChange: (color: CardColor) => void;
  testID?: string;
}

/**
 * Color display names for accessibility
 */
const COLOR_NAMES: Record<CardColor, string> = {
  blue: 'Blue',
  red: 'Red',
  green: 'Green',
  orange: 'Orange',
  grey: 'Grey',
};

/**
 * ColorPicker - 5-color selection component
 *
 * Per AC6:
 * - 5 color options displayed as circles: Blue, Red, Green, Orange, Grey (default)
 * - Selected color shows checkmark overlay
 * - Touch target: 44px diameter
 */
export function ColorPicker({ value, onChange, testID }: ColorPickerProps) {
  return (
    <View testID={testID}>
      <Text className="text-xs mb-2 text-gray-500">Card Color</Text>
      <View className="flex-row gap-2">
        {CARD_COLOR_KEYS.map((color) => {
          const isSelected = value === color;
          const colorHex = CARD_COLORS[color];

          return (
            <Pressable
              key={color}
              onPress={() => onChange(color)}
              accessibilityRole="button"
              accessibilityLabel={`${COLOR_NAMES[color]} color${isSelected ? ', selected' : ''}`}
              accessibilityState={{ selected: isSelected }}
              testID={`color-option-${color}`}
              className="w-11 h-11 rounded-full items-center justify-center"
              style={{
                backgroundColor: colorHex,
                borderWidth: isSelected ? 2 : 0,
                borderColor: 'white',
              }}
            >
              {isSelected && (
                <Text className="text-white text-lg font-bold">✓</Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
