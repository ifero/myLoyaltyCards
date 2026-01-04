import '../global.css';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, Text } from 'react-native';

import { ThemeProvider, useTheme } from '@/shared/theme';

/**
 * Header Right component with Settings button
 */
const HeaderRight = () => {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push('/settings')}
      accessibilityLabel="Go to settings"
      accessibilityRole="button"
      className="w-11 h-11 items-center justify-center"
    >
      <Text className="text-xl">⚙️</Text>
    </Pressable>
  );
};

/**
 * Header Left component with Add Card button
 */
const HeaderLeft = () => {
  const router = useRouter();
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={() => router.push('/add-card')}
      accessibilityLabel="Add new card"
      accessibilityRole="button"
      className="w-11 h-11 items-center justify-center"
    >
      <Text className="text-2xl font-semibold" style={{ color: theme.primary }}>
        +
      </Text>
    </Pressable>
  );
};

const RootLayoutContent = () => {
  const { isDark, theme } = useTheme();

  return (
    <>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.surface,
          },
          headerTintColor: theme.textPrimary,
          contentStyle: {
            backgroundColor: theme.background,
          },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: 'myLoyaltyCards',
            headerLeft: () => <HeaderLeft />,
            headerRight: () => <HeaderRight />,
          }}
        />
        <Stack.Screen
          name="add-card"
          options={{
            title: 'Add Card',
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            title: 'Settings',
          }}
        />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
};

const RootLayout = () => {
  return (
    <ThemeProvider>
      <RootLayoutContent />
    </ThemeProvider>
  );
};

export default RootLayout;
