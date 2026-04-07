import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator } from 'react-native';
import { Pressable, Text, View } from 'react-native';

import { useTheme } from '@/shared/theme';
import { TOUCH_TARGET } from '@/shared/theme/spacing';

type ActionRowProps = {
  prefix?: React.ReactNode;
  label: string;
  subtitle?: string;
  onPress: () => void;
  variant?: 'outlined' | 'plain';
  value?: string;
  disabled?: boolean;
  destructive?: boolean;
  showChevron?: boolean;
  isLoading?: boolean;
  showBottomBorder?: boolean;
  accessibilityLabel?: string;
  testID?: string;
  noPaddingHorizontal?: boolean;
};

export const ActionRow = ({
  prefix,
  label,
  subtitle,
  onPress,
  variant = 'outlined',
  value,
  disabled = false,
  destructive = false,
  showChevron = true,
  isLoading = false,
  showBottomBorder,
  accessibilityLabel,
  noPaddingHorizontal = false,
  testID
}: ActionRowProps) => {
  const { theme } = useTheme();
  const [isPressed, setIsPressed] = React.useState(false);
  const rowTextColor = destructive ? theme.error : theme.textPrimary;
  const isOutlined = variant === 'outlined';
  const shouldShowBottomBorder = showBottomBorder ?? !isOutlined;
  const rowPaddingHorizontal = noPaddingHorizontal ? 0 : isOutlined ? 12 : 16;
  const hasSubtitle = typeof subtitle === 'string' && subtitle.length > 0;

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      style={{
        minHeight: TOUCH_TARGET.min,
        borderRadius: isOutlined ? 14 : 0,
        borderWidth: isOutlined ? 1 : 0,
        borderColor: isOutlined ? theme.border : 'transparent',
        backgroundColor: isPressed
          ? theme.surfaceElevated
          : isOutlined
            ? theme.surface
            : 'transparent',
        paddingHorizontal: rowPaddingHorizontal,
        paddingVertical: hasSubtitle ? 8 : 6,
        opacity: disabled ? 0.6 : 1
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {prefix ? (
          <View style={{ marginRight: 12 }}>
            {prefix}
            {shouldShowBottomBorder ? (
              <View
                style={{
                  height: 1,
                  backgroundColor: 'transparent'
                }}
              />
            ) : null}
          </View>
        ) : null}

        <View style={{ flex: 1, minWidth: 0 }}>
          <View
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={{ color: rowTextColor, fontSize: 16, flexShrink: 1 }}>
                {label}
              </Text>
              {hasSubtitle ? (
                <Text
                  numberOfLines={1}
                  style={{ color: theme.textSecondary, fontSize: 14, marginTop: 1 }}
                >
                  {subtitle}
                </Text>
              ) : null}
            </View>

            <View className="flex-row items-center gap-2" style={{ marginLeft: 12, flexShrink: 0 }}>
              {value ? (
                <Text numberOfLines={1} style={{ color: theme.textSecondary, fontSize: 14 }}>
                  {value}
                </Text>
              ) : null}
              {isLoading ? <ActivityIndicator size="small" color={theme.primary} /> : null}
              {showChevron ? (
                <MaterialIcons name="chevron-right" size={24} color={theme.textSecondary} />
              ) : null}
            </View>
          </View>

          {shouldShowBottomBorder ? (
            <View
              style={{ height: 1, backgroundColor: theme.border, marginTop: hasSubtitle ? 10 : 8 }}
            />
          ) : null}
        </View>
      </View>
    </Pressable>
  );
};
