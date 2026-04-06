/**
 * OtherCardRow Component
 * Story 13.4: Restyle Add Card Flow (AC1)
 *
 * Special row for "Other card" option in Card Type Selection.
 * Figma: grey circle with "+" icon, "Other card" title + "Add a custom loyalty card" subtitle.
 */

import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

import { useTheme } from '@/shared/theme';
import { TOUCH_TARGET } from '@/shared/theme/spacing';

interface OtherCardRowProps {
  onPress: () => void;
  testID?: string;
}

const CIRCLE_SIZE = 40;

export const OtherCardRow: React.FC<OtherCardRowProps> = ({
  onPress,
  testID = 'other-card-row'
}) => {
  const { theme } = useTheme();
  const [isPressed, setIsPressed] = useState(false);

  return (
    <View>
      <Pressable
        testID={testID}
        onPress={onPress}
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
        accessibilityRole="button"
        accessibilityLabel="Other card. Add a custom loyalty card"
        style={[styles.row, { backgroundColor: isPressed ? theme.surfaceElevated : 'transparent' }]}
      >
        <View style={styles.rowContent}>
          {/* Circle with "+" */}
          <View style={[styles.circle, { backgroundColor: theme.border }]}>
            <MaterialIcons name="add" size={22} color={theme.textSecondary} />
          </View>

          {/* Text content */}
          <View style={styles.textContainer}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>Other card</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Add a custom loyalty card
            </Text>
          </View>

          {/* Chevron */}
          <MaterialIcons name="chevron-right" size={24} color={theme.textTertiary} />
        </View>
      </Pressable>

      {/* Full-width separator */}
      <View style={[styles.separator, { backgroundColor: theme.border }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    minHeight: TOUCH_TARGET.min + 12,
    justifyContent: 'center'
  },
  rowContent: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center'
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  textContainer: {
    flex: 1
  },
  title: {
    fontSize: 17,
    fontWeight: '500'
  },
  subtitle: {
    fontSize: 14,
    marginTop: 1
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 76,
    marginRight: 24
  }
});
