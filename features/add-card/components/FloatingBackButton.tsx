/**
 * FloatingBackButton Component
 * Story 13.4: Restyle Add Card Flow (AC4)
 *
 * Floating back button for the immersive camera scanner.
 * Figma: 40pt dark circle (#000000 80% opacity) + MI: chevron-left white arrow.
 * Positioned top-left with safe area inset.
 */

import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';

import { TOUCH_TARGET } from '@/shared/theme/spacing';

interface FloatingBackButtonProps {
  onPress: () => void;
  style?: ViewStyle;
  testID?: string;
}

const BUTTON_SIZE = TOUCH_TARGET.min;

export const FloatingBackButton: React.FC<FloatingBackButtonProps> = ({
  onPress,
  style,
  testID = 'floating-back-button'
}) => {
  const [isPressed, setIsPressed] = useState(false);

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      style={[styles.button, style, { opacity: isPressed ? 0.7 : 1 }]}
      hitSlop={8}
    >
      <MaterialIcons name="chevron-left" size={28} color="#FFFFFF" />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10
  }
});
