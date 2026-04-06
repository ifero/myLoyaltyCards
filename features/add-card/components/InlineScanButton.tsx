/**
 * InlineScanButton Component
 * Story 13.4: Restyle Add Card Flow (AC6)
 *
 * Compact barcode viewfinder icon button, displayed inline with the card number field.
 * Tapping opens scanner to capture a barcode and return the value.
 */

import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { useTheme } from '@/shared/theme';
import { TOUCH_TARGET } from '@/shared/theme/spacing';

interface InlineScanButtonProps {
  onPress: () => void;
  testID?: string;
}

export const InlineScanButton: React.FC<InlineScanButtonProps> = ({
  onPress,
  testID = 'inline-scan-button'
}) => {
  const { theme } = useTheme();
  const [isPressed, setIsPressed] = useState(false);

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      style={[styles.button, { opacity: isPressed ? 0.6 : 1 }]}
      accessibilityRole="button"
      accessibilityLabel="Scan barcode with camera"
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <MaterialCommunityIcons name="barcode-scan" size={24} color={theme.primary} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    width: TOUCH_TARGET.min,
    height: TOUCH_TARGET.min,
    justifyContent: 'center',
    alignItems: 'center'
  }
});
