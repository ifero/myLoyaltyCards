import React from 'react';
import { Pressable, View } from 'react-native';

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

  return (
    <View testID={testID} className="flex-row items-center gap-3">
      {palette.map((color) => {
        const selected = color === value;

        return (
          <Pressable
            key={color}
            testID={`${testID}-${color}`}
            accessibilityRole="button"
            accessibilityState={{ selected }}
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
