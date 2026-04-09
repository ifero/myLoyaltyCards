import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { useTheme } from '@/shared/theme';
import { NEUTRAL_COLORS } from '@/shared/theme/colors';
import { TOUCH_TARGET } from '@/shared/theme/spacing';

type ModeOptionCardProps = {
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  title: string;
  subtitle: string;
  eyebrow?: string;
  recommended?: boolean;
  onPress: () => void;
  testID?: string;
};

const withAlpha = (hex: string, alpha: string) => `${hex}${alpha}`;

export const ModeOptionCard = ({
  icon,
  title,
  subtitle,
  eyebrow,
  recommended = false,
  onPress,
  testID
}: ModeOptionCardProps) => {
  const { theme } = useTheme();
  const [pressed, setPressed] = React.useState(false);

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}${recommended ? '. Recommended option.' : ''}`}
      accessibilityHint="Double tap to select this storage option"
      style={{
        minHeight: TOUCH_TARGET.min,
        borderRadius: 16,
        borderWidth: recommended ? 2 : 1,
        borderColor: recommended ? theme.primary : theme.border,
        backgroundColor: recommended ? withAlpha(theme.primary, '0D') : theme.surface,
        paddingVertical: 20,
        paddingHorizontal: 18,
        opacity: pressed ? 0.92 : 1
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 16,
            backgroundColor: withAlpha(theme.primary, '1A')
          }}
        >
          <MaterialIcons name={icon} size={24} color={theme.primary} />
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: theme.textPrimary, fontSize: 17, fontWeight: '600' }}>{title}</Text>
          <Text style={{ marginTop: 4, color: theme.textSecondary, fontSize: 14, lineHeight: 20 }}>
            {subtitle}
          </Text>
          {eyebrow ? (
            <Text style={{ marginTop: 8, color: theme.primary, fontSize: 12, fontWeight: '500' }}>
              {eyebrow}
            </Text>
          ) : null}
        </View>
      </View>

      {recommended ? (
        <View style={{ alignItems: 'flex-end', marginTop: 10 }}>
          <View
            style={{
              borderRadius: 14,
              paddingVertical: 6,
              paddingHorizontal: 14,
              backgroundColor: theme.primary
            }}
          >
            <Text style={{ color: NEUTRAL_COLORS.white, fontSize: 12, fontWeight: '500' }}>
              Recommended
            </Text>
          </View>
        </View>
      ) : null}
    </Pressable>
  );
};
