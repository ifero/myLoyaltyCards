/**
 * DetailRow Component
 * Story 2.6: View Card Details
 * Story 22.3: Card Detail — the frame row
 *
 * One labelled value in card detail's details card, which is a divided `Surface`: the surface draws
 * the hairline rules between rows, so a row draws none of its own.
 */

import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/shared/theme';
import { SPACING, TOUCH_TARGET } from '@/shared/theme/spacing';
import { TYPOGRAPHY } from '@/shared/theme/typography';

interface DetailRowProps {
  /** Label text shown on the left */
  label: string;
  /** Value text shown on the right */
  value: string;
  /** Sets the value in `monoCode` — a card number, so its digits align while read aloud. */
  mono?: boolean;
  /** Whether the row is tappable */
  onPress?: () => void;
  /** Accessibility hint for screen readers */
  accessibilityHint?: string;
  /** Test ID for E2E testing */
  testID?: string;
}

/**
 * The frame's row: at least 48pt tall, padded 12 / 16, the label and the value 12 apart. The label
 * is `bodyMd` in `textSecondary`; the value is `bodyMd` in `textPrimary` — or `monoCode` — set
 * right on one line, cut in the middle when it is too long, so both of its ends stay readable.
 * A tappable row is one button whose name is the label and the value, and it takes
 * `surfaceElevated` while held, as `ActionRow` does.
 */
export const DetailRow: React.FC<DetailRowProps> = ({
  label,
  value,
  mono = false,
  onPress,
  accessibilityHint,
  testID
}) => {
  const { theme } = useTheme();
  // Explicit pressed state rather than a `style={({ pressed }) => …}` callback (AGENTS.md).
  const [isPressed, setIsPressed] = useState(false);

  const content = (
    <>
      <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      <Text
        style={[mono ? styles.monoValue : styles.value, { color: theme.textPrimary }]}
        numberOfLines={1}
        ellipsizeMode="middle"
      >
        {value}
      </Text>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        testID={testID}
        onPress={onPress}
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}`}
        accessibilityHint={accessibilityHint}
        style={[styles.row, { backgroundColor: isPressed ? theme.surfaceElevated : 'transparent' }]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View testID={testID} style={styles.row}>
      {content}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: TOUCH_TARGET.min,
    paddingVertical: SPACING.smMd,
    paddingHorizontal: SPACING.md,
    gap: SPACING.smMd
  },
  label: {
    ...TYPOGRAPHY.bodyMd
  },
  value: {
    ...TYPOGRAPHY.bodyMd,
    flex: 1,
    textAlign: 'right'
  },
  monoValue: {
    ...TYPOGRAPHY.monoCode,
    flex: 1,
    textAlign: 'right'
  }
});
