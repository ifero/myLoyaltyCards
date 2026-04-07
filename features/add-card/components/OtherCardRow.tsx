/**
 * OtherCardRow Component
 * Story 13.4: Restyle Add Card Flow (AC1)
 *
 * Special row for "Other card" option in Card Type Selection.
 * Figma: grey circle with "+" icon, "Other card" title + "Add a custom loyalty card" subtitle.
 */

import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { View, StyleSheet } from 'react-native';

import { ActionRow } from '@/shared/components/ui';
import { useTheme } from '@/shared/theme';

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

  const leading = (
    <View style={[styles.circle, { backgroundColor: theme.border }]}>
      <MaterialIcons name="add" size={22} color={theme.textSecondary} />
    </View>
  );

  return (
    <View>
      <View style={[styles.separator, { backgroundColor: theme.border }]} />
      <ActionRow
        testID={testID}
        variant="plain"
        prefix={leading}
        label="Other card"
        subtitle="Add a custom loyalty card"
        onPress={onPress}
        showBottomBorder={false}
        accessibilityLabel="Other card. Add a custom loyalty card"
      />
      <View style={[styles.separator, { backgroundColor: theme.border }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  separator: {
    height: 1,
    marginLeft: 16,
    marginRight: 16
  }
});
