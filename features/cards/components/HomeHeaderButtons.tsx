/**
 * The Home header's two buttons
 * Story 22.2: Wallet — the four Cardì wallet frames
 *
 * `+` on the left opens Add Card and the gear on the right opens Settings — the only navigation
 * Home has (`cardi-design-system.md` § _Navigation_). Each is a 48 × 48 target holding a 24pt
 * outline icon at a 1.5 stroke in `textPrimary`: ink in light, cream in dark.
 *
 * These render inside the NATIVE header, so this file deliberately imports nothing from
 * `react-native-unistyles` and lives outside `app/`. Either would make the Unistyles Babel plugin
 * swap React Native's `Pressable` for its own, which re-binds the native view on every press — a
 * visible flicker inside the header bar. The platform's own button treatment (on iOS 26, the
 * system's glass) is left exactly as the OS draws it.
 */

import { useRouter } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import Plus from 'lucide-react-native/icons/plus';
import Settings from 'lucide-react-native/icons/settings';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';

import { useTheme } from '@/shared/theme';
import { TOUCH_TARGET } from '@/shared/theme/spacing';

/** The design system's icon: 24pt, drawn at a 1.5 stroke (§ _Icons_). */
const ICON_SIZE = 24;
const ICON_STROKE_WIDTH = 1.5;

/** Tap feedback — the design system's 0.98× scale, never a shadow bloom (§ _Elevation_). */
const PRESSED_SCALE = 0.98;

type HeaderIconButtonProps = {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  testID: string;
};

const HeaderIconButton = ({ icon: Icon, label, onPress, testID }: HeaderIconButtonProps) => {
  const { theme } = useTheme();
  const [isPressed, setIsPressed] = useState(false);

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.button, isPressed ? styles.pressed : null]}
    >
      <Icon
        testID={`${testID}-icon`}
        size={ICON_SIZE}
        strokeWidth={ICON_STROKE_WIDTH}
        color={theme.textPrimary}
      />
    </Pressable>
  );
};

/** `+`, at the left of the Home header: opens Add Card. */
export const HomeAddButton = () => {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <HeaderIconButton
      icon={Plus}
      label={t('navigation.addCard')}
      onPress={() => router.push('/add-card')}
      testID="home-add-button"
    />
  );
};

/** The gear, at the right of the Home header: opens Settings. */
export const HomeSettingsButton = () => {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <HeaderIconButton
      icon={Settings}
      label={t('navigation.settings')}
      onPress={() => router.push('/settings')}
      testID="home-settings-button"
    />
  );
};

const styles = StyleSheet.create({
  button: {
    width: TOUCH_TARGET.min,
    height: TOUCH_TARGET.min,
    alignItems: 'center',
    justifyContent: 'center'
  },
  pressed: {
    transform: [{ scale: PRESSED_SCALE }]
  }
});
