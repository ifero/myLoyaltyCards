/**
 * DetailRow Component
 * Story 2.6: View Card Details
 *
 * Reusable component for displaying labeled detail rows.
 * Used in the Card Details screen to show card information.
 */

import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ViewStyle } from 'react-native';

import { useTheme } from '@/shared/theme';
import { SPACING } from '@/shared/theme/spacing';
import { TYPOGRAPHY } from '@/shared/theme/typography';

interface DetailRowProps {
  /** Label text shown on the left */
  label: string;
  /** Value text shown on the right */
  value: string;
  /** Optional icon or element to show after the value */
  rightElement?: React.ReactNode;
  /** Whether the row is tappable */
  onPress?: () => void;
  /** Accessibility hint for screen readers */
  accessibilityHint?: string;
  /** Custom container styles */
  style?: ViewStyle;
  /** Test ID for E2E testing */
  testID?: string;
}

/**
 * DetailRow Component
 *
 * Displays a labeled value in a horizontal row:
 * - Label: `TYPOGRAPHY.bodyMd`, secondary text color, left-aligned
 * - Value: `TYPOGRAPHY.bodyMd`, primary text color, right-aligned
 * - 12px vertical padding
 * - Subtle divider line at bottom
 */
export const DetailRow: React.FC<DetailRowProps> = ({
  label,
  value,
  rightElement,
  onPress,
  accessibilityHint,
  style,
  testID
}) => {
  const { theme } = useTheme();
  // Explicit pressed state rather than a `style={({ pressed }) => …}` callback (AGENTS.md).
  const [isPressed, setIsPressed] = useState(false);

  const content = (
    <View style={[styles.container, { borderBottomColor: theme.border }, style]} testID={testID}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      <View style={styles.valueContainer}>
        <Text
          style={[styles.value, { color: theme.textPrimary }]}
          numberOfLines={1}
          ellipsizeMode="middle"
        >
          {value}
        </Text>
        {rightElement}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
        style={isPressed ? styles.pressed : undefined}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}`}
        accessibilityHint={accessibilityHint}
      >
        {content}
      </Pressable>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth
  },
  pressed: {
    opacity: 0.7
  },
  label: {
    ...TYPOGRAPHY.bodyMd,
    flex: 1
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 2,
    justifyContent: 'flex-end',
    gap: SPACING.xs
  },
  value: {
    ...TYPOGRAPHY.bodyMd,
    textAlign: 'right',
    flexShrink: 1
  }
});
