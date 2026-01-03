import { View, Text, Pressable } from 'react-native';

import { useTheme, CARD_COLORS, CARD_COLOR_KEYS } from '@/shared/theme';

const HomeScreen = () => {
  const { theme, isDark } = useTheme();

  return (
    <View
      className="flex-1 items-center justify-center p-4"
      style={{ backgroundColor: theme.background }}
    >
      <Text
        className="text-2xl font-bold mb-2"
        style={{ color: theme.textPrimary }}
      >
        Welcome to myLoyaltyCards!
      </Text>
      <Text className="text-base mb-6" style={{ color: theme.textSecondary }}>
        Your app for managing loyalty cards
      </Text>

      {/* Card color palette demo */}
      <Text
        className="text-lg font-semibold mb-3"
        style={{ color: theme.textPrimary }}
      >
        Card Color Palette
      </Text>
      <View className="flex-row gap-3 mb-6">
        {CARD_COLOR_KEYS.map((colorKey) => (
          <Pressable
            key={colorKey}
            // Minimum touch target: 44x44px (min-w-touch min-h-touch)
            className="w-5.5 h-5.5 rounded-lg items-center justify-center"
            style={{ backgroundColor: CARD_COLORS[colorKey] }}
            accessibilityLabel={`${colorKey} card color`}
            accessibilityRole="button"
          >
            <Text className="text-white text-xs font-bold uppercase">
              {colorKey.charAt(0)}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Theme indicator */}
      <View
        className="px-4 py-2 rounded-full"
        style={{ backgroundColor: theme.primary }}
      >
        <Text className="text-white font-semibold">
          {isDark ? '🌙 Dark Mode' : '☀️ Light Mode'}
        </Text>
      </View>
    </View>
  );
};

export default HomeScreen;
