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
import { StyleSheet } from 'react-native-unistyles';

import { CardColor, CARD_COLOR_KEYS } from '@/core/schemas';

import { CARD_COLORS } from '@/shared/theme';
import { getContrastForeground } from '@/shared/theme/luminance';

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
      <Text style={styles.label}>{t('addCard.setup.colorLabel')}</Text>
      <View style={styles.row}>
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
              style={[
                styles.swatch,
                {
                  backgroundColor: colorHex,
                  borderWidth: isSelected ? 2 : 0,
                  // Derived, not hard-coded white (Story 21.2a). The selection ring and
                  // the checkmark are the ONLY signal for "this is the colour you picked",
                  // and a fixed white gave 1.52:1 on the beam yellow this story makes
                  // pickable — the worst contrast anywhere in the app, on the brand's own
                  // signature hue. It was already failing on the retired orange (2.15:1),
                  // so this repaint made a live defect worse rather than creating one.
                  // `getContrastForeground` clears the 3:1 non-text floor on all five.
                  borderColor: getContrastForeground(colorHex)
                }
              ]}
            >
              {isSelected && (
                <MaterialIcons name="check" size={18} color={getContrastForeground(colorHex)} />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    marginBottom: 16,
    fontSize: 12,
    lineHeight: 16,
    color: '#6B7280'
  },
  row: {
    flexDirection: 'row',
    gap: 16
  },
  swatch: {
    height: 44,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9999
  }
});
