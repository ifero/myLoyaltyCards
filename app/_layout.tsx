import 'react-native-get-random-values'; // Must be imported before uuid
import '../global.css';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Updates from 'expo-updates';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { initializeDatabase } from '@/core/database';

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
      className="h-11 w-11 items-center justify-center"
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
      className="h-11 w-11 items-center justify-center"
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
            backgroundColor: theme.surface
          },
          headerTintColor: theme.textPrimary,
          contentStyle: {
            backgroundColor: theme.background
          },
          animation: 'slide_from_right'
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: 'myLoyaltyCards',
            headerLeft: () => <HeaderLeft />,
            headerRight: () => <HeaderRight />
          }}
        />
        <Stack.Screen
          name="add-card"
          options={{
            title: 'Add Card'
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            title: 'Settings'
          }}
        />
        <Stack.Screen
          name="scan"
          options={{
            title: 'Scan Barcode',
            presentation: 'fullScreenModal',
            headerShown: false
          }}
        />
        <Stack.Screen
          name="barcode/[id]"
          options={{
            title: 'Barcode',
            presentation: 'fullScreenModal',
            headerShown: false,
            animation: 'fade'
          }}
        />
        <Stack.Screen
          name="card/[id]"
          options={{
            title: 'Card Details'
          }}
        />
        <Stack.Screen
          name="card/[id]/edit"
          options={{
            title: 'Edit Card'
          }}
        />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
};

const RootLayout = () => {
  const [isDbReady, setIsDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Check for updates first, before showing UI
        if (Updates.isEnabled) {
          try {
            const update = await Updates.checkForUpdateAsync();
            if (update.isAvailable) {
              await Updates.fetchUpdateAsync();
              // Reload immediately during startup, before UI is shown
              await Updates.reloadAsync();
            }
          } catch (error) {
            console.warn('Expo update check failed:', error);
            // Continue with app initialization even if update check fails
          }
        }

        // Initialize database after update check completes
        await initializeDatabase();
        setIsDbReady(true);
      } catch (error) {
        console.error('Database initialization failed:', error);
        setDbError(error instanceof Error ? error.message : 'Database init failed');
      }
    };

    initializeApp();
  }, []);

  if (dbError) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-900">
        <Text className="text-lg text-red-500">Database Error</Text>
        <Text className="mt-2 text-neutral-400">{dbError}</Text>
      </View>
    );
  }

  if (!isDbReady) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-900">
        <ActivityIndicator size="large" color="#73A973" />
      </View>
    );
  }

  return (
    <ThemeProvider>
      <RootLayoutContent />
    </ThemeProvider>
  );
};

export default RootLayout;
