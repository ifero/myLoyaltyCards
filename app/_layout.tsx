import 'react-native-get-random-values'; // Must be imported before uuid
import '../global.css';
import '@/shared/i18n';
import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Updates from 'expo-updates';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { getOrCreateGuestSessionId } from '@/core/auth/guest-session-repository';
import { initializeDatabase } from '@/core/database';
import { getAllCards } from '@/core/database/card-repository';
import {
  pushCardsToWatch,
  subscribeToWatchMessages,
  WatchMessage
} from '@/core/watch-connectivity';

import { getSupabaseClient } from '@/shared/supabase/client';
import { ThemeProvider, useTheme } from '@/shared/theme';
import { PRIMARY_COLORS } from '@/shared/theme/colors';

import { isFirstLaunch } from '@/features/settings';

export const unstable_settings = {
  initialRouteName: 'index'
};

// Eagerly validate Supabase env vars so misconfigurations surface early.
// Wrapped in try/catch to prevent a fatal crash when env vars are absent
// (e.g. CI build missing EXPO_PUBLIC_SUPABASE_* secrets).
try {
  getSupabaseClient();
} catch (error) {
  console.error(
    'Supabase client initialisation failed — check EXPO_PUBLIC_SUPABASE_* env vars:',
    error
  );
}

/**
 * Header Right component with Settings button
 * Story 13.2: MI "settings" icon (26pt), primary color, 44pt touch target
 */
const HeaderRight = () => {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();

  return (
    <Pressable
      onPress={() => router.push('/settings')}
      accessibilityLabel={t('navigation.settings')}
      accessibilityRole="button"
      className="h-11 w-11 items-center justify-center"
    >
      <MaterialIcons name="settings" size={26} color={theme.primary} />
    </Pressable>
  );
};

/**
 * Header Left component with Add Card button
 * Story 13.2: MI "add" icon (28pt), primary color, 44pt touch target
 */
const HeaderLeft = () => {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();

  return (
    <Pressable
      onPress={() => router.push('/add-card')}
      accessibilityLabel={t('navigation.addCard')}
      accessibilityRole="button"
      className="h-11 w-11 items-center justify-center"
    >
      <MaterialIcons name="add" size={28} color={theme.primary} />
    </Pressable>
  );
};

const RootLayoutContent = () => {
  const { isDark, theme } = useTheme();
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    if (isFirstLaunch()) {
      router.replace('/welcome');
    }
  }, [router]);

  return (
    <>
      {/* Offline indicator is now rendered by SyncStatusContainer in index.tsx */}
      <Stack
        screenOptions={{
          headerLeft: ({ canGoBack }: { canGoBack?: boolean }) =>
            canGoBack ? (
              <Pressable
                onPress={() => router.back()}
                accessibilityLabel={t('addCard.selection.backAccessibilityLabel')}
                accessibilityRole="button"
                className="h-11 w-11 items-center justify-center"
              >
                <MaterialIcons name="chevron-left" size={28} color={theme.textPrimary} />
              </Pressable>
            ) : undefined,
          headerStyle: {
            backgroundColor: theme.surface
          },
          headerTintColor: theme.textPrimary,
          contentStyle: {
            backgroundColor: theme.background
          },
          animation: 'slide_from_right',
          headerBackTitle: ''
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: t('navigation.home'),
            headerLeft: () => <HeaderLeft />,
            headerRight: () => <HeaderRight />
          }}
        />
        <Stack.Screen
          name="welcome"
          options={{
            title: t('navigation.welcome'),
            headerShown: false,
            animation: 'fade'
          }}
        />
        <Stack.Screen
          name="onboarding/mode-selection"
          options={{
            title: t('navigation.getStarted'),
            headerShown: false
          }}
        />
        <Stack.Screen
          name="onboarding/highlights"
          options={{
            title: t('navigation.highlights'),
            headerShown: false
          }}
        />
        <Stack.Screen
          name="add-card"
          options={{
            title: t('navigation.addCard'),
            headerShown: false
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            title: t('navigation.settings')
          }}
        />
        <Stack.Screen
          name="scan"
          options={{
            title: t('navigation.scanBarcode'),
            presentation: 'fullScreenModal',
            headerShown: false
          }}
        />
        <Stack.Screen
          name="barcode/[id]"
          options={{
            title: t('navigation.barcode'),
            presentation: 'fullScreenModal',
            headerShown: false,
            animation: 'fade'
          }}
        />
        <Stack.Screen
          name="card/[id]"
          options={{
            title: t('navigation.cardDetails')
          }}
        />
        <Stack.Screen
          name="card/[id]/edit"
          options={{
            title: t('navigation.editCard')
          }}
        />
        <Stack.Screen
          name="create-account"
          options={{
            title: t('navigation.createAccount')
          }}
        />
        <Stack.Screen
          name="verify-email"
          options={{
            title: t('navigation.verifyEmail')
          }}
        />
        <Stack.Screen
          name="sign-in"
          options={{
            title: t('navigation.signIn')
          }}
        />
        <Stack.Screen
          name="forgot-password"
          options={{
            title: t('navigation.forgotPassword')
          }}
        />
        <Stack.Screen
          name="reset-password"
          options={{
            title: t('navigation.resetPassword')
          }}
        />
        <Stack.Screen
          name="data-summary"
          options={{
            title: t('navigation.whatWeCollect')
          }}
        />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
};

const RootLayout = () => {
  const { t } = useTranslation();
  const [isReady, setIsReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Check for updates first (if enabled) to ensure reload happens during splash
        if (Updates.isEnabled) {
          try {
            const update = await Updates.checkForUpdateAsync();
            if (update.isAvailable) {
              await Updates.fetchUpdateAsync();
              // Reload will happen here, before UI is shown
              await Updates.reloadAsync();
            }
          } catch (error) {
            console.warn('Expo update check failed:', error);
            // Continue with app initialization even if update check fails
          }
        }

        // Initialize database after update check completes
        await initializeDatabase();

        // Ensure a persistent guest session ID exists on this device (best-effort)
        try {
          await getOrCreateGuestSessionId();
        } catch (error) {
          console.warn(
            'Guest session initialization failed (continuing without persistent guest ID):',
            error
          );
        }

        setIsReady(true);
      } catch (error) {
        console.error('App initialization failed:', error);
        setDbError(t('common.errors.initializationFailed'));
      }
    };

    let unsubscribe: (() => void) | undefined;

    initializeApp().then(() => {
      // Push an initial snapshot so the watch converges on launch, even if no
      // mutation happens this session. CRUD paths in card-repository keep it
      // in sync afterwards.
      getAllCards()
        .then((cards) => pushCardsToWatch(cards))
        .catch(() => {});

      try {
        unsubscribe = subscribeToWatchMessages(async (msg: WatchMessage) => {
          try {
            if (msg?.type === 'requestCards') {
              const cards = await getAllCards();
              await pushCardsToWatch(cards);
            }
          } catch (e) {
            console.warn('Watch message handler error:', e);
          }
        });
      } catch {
        // ignore if native module missing
      }
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  if (dbError) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-900">
        <Text className="text-lg text-red-500">{t('common.errors.databaseErrorTitle')}</Text>
        <Text className="mt-2 text-neutral-400">{dbError}</Text>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-900">
        <ActivityIndicator size="large" color={PRIMARY_COLORS[500]} />
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
