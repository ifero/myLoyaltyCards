import 'react-native-get-random-values'; // Must be imported before uuid
import '@/shared/theme/unistyles'; // Registers Unistyles themes (StyleSheet.configure)
import '@/shared/i18n';
import { MaterialIcons } from '@expo/vector-icons';
import * as Sentry from '@sentry/react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Updates from 'expo-updates';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { getOrCreateGuestSessionId } from '@/core/auth/guest-session-repository';
import { initializeDatabase } from '@/core/database';
import { applyWatchUsageEvents, getAllCards } from '@/core/database/card-repository';
import { initSentry } from '@/core/observability/sentry';
import { logger } from '@/core/utils/logger';
import { withTimeout } from '@/core/utils/with-timeout';
import {
  parseWatchUsageEvent,
  pushCardsToWatch,
  subscribeToWatchMessages,
  subscribeToWatchUserInfo,
  WatchMessage,
  WatchUsageEvent
} from '@/core/watch-connectivity';

import { getSupabaseClient } from '@/shared/supabase/client';
import { useBootAuthGate } from '@/shared/supabase/useBootAuthGate';
import { ThemeProvider, useTheme } from '@/shared/theme';
import { PRIMARY_COLORS } from '@/shared/theme/colors';

import { completeFirstLaunch, isFirstLaunch } from '@/features/settings';

export const unstable_settings = {
  initialRouteName: 'index'
};

// Initialise Sentry as early as possible so errors during module evaluation and
// app startup are captured (no-op transmit in development; see initSentry).
initSentry();

// Eagerly validate Supabase env vars so misconfigurations surface early.
// Wrapped in try/catch to prevent a fatal crash when env vars are absent
// (e.g. CI build missing EXPO_PUBLIC_SUPABASE_* secrets).
try {
  getSupabaseClient();
} catch (error) {
  logger.error(
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
      style={styles.headerButton}
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
      style={styles.headerButton}
    >
      <MaterialIcons name="add" size={28} color={theme.primary} />
    </Pressable>
  );
};

const RootLayoutContent = ({ isAuthenticated }: { isAuthenticated: boolean }) => {
  const { isDark, theme } = useTheme();
  const router = useRouter();
  const { t } = useTranslation();

  // Onboarding/welcome gate.
  //
  // The welcome screen must only appear for genuinely new, signed-out users.
  // A signed-in user must NEVER be bounced here — including one whose session
  // was silently restored from the Keychain after a reinstall (the first-launch
  // flag lives in expo-sqlite/kv-store, which a reinstall wipes, while the
  // Supabase session survives in SecureStore). For those users we also clear
  // the flag so later cold starts skip the gate too.
  //
  // Regression guard (testers stuck in a welcome loop): the routed-onboarding
  // refactor only cleared `first_launch` on the local-mode highlights path, so
  // account-creation / sign-in users never cleared it and got redirected here
  // on every launch. Gating on auth state fixes every path at once instead of
  // relying on each completion screen to remember to call completeFirstLaunch.
  useEffect(() => {
    if (isAuthenticated) {
      if (isFirstLaunch()) {
        completeFirstLaunch();
      }
      return;
    }

    if (isFirstLaunch()) {
      router.replace('/welcome');
    }
  }, [router, isAuthenticated]);

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
                style={styles.headerButton}
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
          name="recovery-otp"
          options={{
            title: t('navigation.recoveryOtp')
          }}
        />
        <Stack.Screen
          name="new-password"
          options={{
            title: t('navigation.newPassword')
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

/**
 * Max time to wait for the Expo update manifest check before proceeding with
 * boot. `checkForUpdateAsync()` has no built-in JS timeout, so on a flaky
 * (connected-but-no-internet) network it can otherwise stall the loading
 * screen. Boot must never hang (Story 16.10, AC1).
 */
const UPDATE_CHECK_TIMEOUT_MS = 5000;

/**
 * Max time to wait for the Expo update bundle download before proceeding with
 * boot. Like the manifest check, `fetchUpdateAsync()` has no built-in JS
 * timeout, so a connection that serves the manifest then stalls mid-download
 * would otherwise hang the loading screen indefinitely. The budget is far more
 * generous than the manifest check because a bundle is much larger than a
 * manifest; `withTimeout` never aborts the native download, so a slow download
 * that exceeds the budget is not lost — it simply applies on a later cold start
 * (Story 16.12, AC1).
 */
const UPDATE_FETCH_TIMEOUT_MS = 30000;

const RootLayout = () => {
  const { t } = useTranslation();
  // Infra readiness (local, offline-safe): DB init + guest-session bootstrap.
  const [isInitialized, setIsInitialized] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  // Auth readiness resolved offline-safe by useBootAuthGate (a SecureStore
  // session probe + reactive onAuthStateChange + safety timeout) — replaces the
  // blocking getSession() that hung offline on an expired-token refresh.
  const { isReady: isAuthReady, isAuthenticated } = useBootAuthGate();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Check for updates first (if enabled) so any reload happens during the
        // loading screen. Neither checkForUpdateAsync (manifest) nor
        // fetchUpdateAsync (bundle download) has a reliable JS-level timeout, so
        // both are bounded with withTimeout — a flaky network (a manifest that
        // fetches, then stalls mid-download) must never stall the spinner. On
        // either timeout, boot proceeds on the CURRENT bundle and any staged
        // update applies on a later cold start (Story 16.10 AC1; Story 16.12
        // AC1). These calls run only with connectivity, so they don't affect the
        // pure-offline cold-start fixed in 16.10.
        if (Updates.isEnabled) {
          try {
            const update = await withTimeout(
              Updates.checkForUpdateAsync(),
              UPDATE_CHECK_TIMEOUT_MS
            );
            if (update.isAvailable) {
              // Dedicated try/catch so a stalled or failed download — or a rare
              // reload failure — degrades gracefully: log and boot the current
              // bundle. reloadAsync runs only if the bounded fetch resolves.
              try {
                await withTimeout(
                  Updates.fetchUpdateAsync(),
                  UPDATE_FETCH_TIMEOUT_MS,
                  'Expo update download timed out'
                );
                // reloadAsync is intentionally NOT wrapped in withTimeout: it
                // does no network I/O (the download already completed) and a JS
                // timeout cannot cancel a native runtime teardown. It is reached
                // only after the bounded fetch (Story 16.12, AC4).
                await Updates.reloadAsync();
              } catch (error) {
                logger.warn('Expo update download/reload failed:', error);
                // Boot the current bundle; the update applies on a later launch.
              }
            }
          } catch (error) {
            logger.warn('Expo update check failed:', error);
            // Continue with app initialization even if update check fails
          }
        }

        // Initialize database after update check completes
        await initializeDatabase();

        // Ensure a persistent guest session ID exists on this device (best-effort)
        try {
          await getOrCreateGuestSessionId();
        } catch (error) {
          logger.warn(
            'Guest session initialization failed (continuing without persistent guest ID):',
            error
          );
        }

        // Auth state is resolved separately by useBootAuthGate (an offline-safe
        // SecureStore probe + reactive onAuthStateChange), so boot no longer
        // blocks on a getSession() token refresh that never settled offline.
        // See Story 16.10 / AD-16-10-01.
        setIsInitialized(true);
      } catch (error) {
        logger.error('App initialization failed:', error);
        setDbError(t('common.errors.initializationFailed'));
      }
    };

    let unsubscribe: (() => void) | undefined;
    let unsubscribeUserInfo: (() => void) | undefined;

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
            logger.warn('Watch message handler error:', e);
          }
        });
      } catch {
        // ignore if native module missing
      }

      try {
        // Watch CARD_USED usage events (Story 9.6, ADR-2026-06-09-001).
        // Subscribed after initializeApp so the DB is ready even for the
        // batch of events the OS queued while the app wasn't running.
        // applyWatchUsageEvents dedups and re-syncs the snapshot itself.
        unsubscribeUserInfo = subscribeToWatchUserInfo(async (events) => {
          try {
            const usageEvents = events
              .map(parseWatchUsageEvent)
              .filter((event): event is WatchUsageEvent => event !== null);
            if (usageEvents.length > 0) {
              await applyWatchUsageEvents(usageEvents);
            }
          } catch (e) {
            logger.warn('Watch usage event handler error:', e);
          }
        });
      } catch {
        // ignore if native module missing
      }
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
      if (typeof unsubscribeUserInfo === 'function') unsubscribeUserInfo();
    };
  }, []);

  // Gate the UI on BOTH local infra AND resolved auth state. Both are
  // offline-safe (local DB init + the SecureStore session probe in
  // useBootAuthGate), so this flips fast with no connectivity — and only once
  // auth is known, preserving the no-flash welcome gate (a signed-in user is
  // never bounced to /welcome).
  const isReady = isInitialized && isAuthReady;

  if (dbError) {
    return (
      <View style={styles.fullscreen}>
        <Text style={styles.errorTitle}>{t('common.errors.databaseErrorTitle')}</Text>
        <Text style={styles.errorBody}>{dbError}</Text>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View style={styles.fullscreen} testID="boot-loading">
        <ActivityIndicator size="large" color={PRIMARY_COLORS[500]} />
      </View>
    );
  }

  return (
    <ThemeProvider>
      <RootLayoutContent isAuthenticated={isAuthenticated} />
    </ThemeProvider>
  );
};

const styles = StyleSheet.create({
  headerButton: {
    height: 44,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center'
  },
  fullscreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#171717'
  },
  errorTitle: {
    fontSize: 18,
    lineHeight: 28,
    color: '#EF4444'
  },
  errorBody: {
    marginTop: 16,
    color: '#A3A3A3'
  }
});

// Wrap the root component so Sentry can capture rendering errors and attach
// navigation/touch context (Story 16.2).
export default Sentry.wrap(RootLayout);
