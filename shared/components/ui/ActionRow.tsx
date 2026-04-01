import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { useTheme } from '@/shared/theme';
import { TOUCH_TARGET } from '@/shared/theme/spacing';

type ActionRowProps = {
  icon: string;
  iconFamily: 'MI' | 'MCI';
  label: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
};

export const ActionRow = ({
  icon,
  iconFamily,
  label,
  onPress,
  disabled = false,
  testID
}: ActionRowProps) => {
  const { theme } = useTheme();
  const Icon = iconFamily === 'MI' ? MaterialIcons : MaterialCommunityIcons;

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => ({
        minHeight: TOUCH_TARGET.min,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: pressed ? theme.surfaceElevated : theme.surface,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        opacity: disabled ? 0.6 : 1
      })}
    >
      <View className="flex-row items-center gap-3">
        <Icon name={icon as never} size={24} color={theme.textPrimary} />
        <Text style={{ color: theme.textPrimary, fontSize: 16 }}>{label}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={24} color={theme.textSecondary} />
    </Pressable>
  );
};
