/**
 * MigrationBanner
 * Story 6.14: Upgrade Guest to Account
 *
 * Inline, non-blocking banner shown during guest → account card migration.
 * Displays progress, success confirmation, or error with retry.
 *
 * Cards remain visible and usable beneath this banner at all times.
 */

import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useTheme } from '@/shared/theme';

import { MigrationStatus } from './useGuestMigration';

// ---------------------------------------------------------------------------
const THEME_OPACITY_SUFFIX = '1A'; // 10% alpha for success background tint

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type MigrationBannerProps = {
  status: MigrationStatus;
  message: string | null;
  onRetry: () => void;
  onDismiss: () => void;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const MigrationBanner = ({ status, message, onRetry, onDismiss }: MigrationBannerProps) => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  if (status === 'idle' || !message) return null;

  const isError = status === 'error';
  const isMigrating = status === 'migrating';

  const backgroundColor = isError
    ? `${theme.error}${THEME_OPACITY_SUFFIX}`
    : theme.primary + THEME_OPACITY_SUFFIX;
  const borderColor = isError ? theme.error : theme.primary;
  const textColor = isError ? theme.error : theme.textPrimary;

  return (
    <View
      testID="migration-banner"
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.banner, { backgroundColor, borderColor }]}
    >
      {isMigrating && (
        <ActivityIndicator
          testID="migration-spinner"
          size="small"
          color={theme.primary}
          style={{ marginRight: 8 }}
        />
      )}

      <Text
        testID="migration-message"
        style={[styles.message, { color: textColor }]}
        numberOfLines={2}
      >
        {message}
      </Text>

      {isError && (
        <Pressable
          testID="migration-retry-button"
          onPress={onRetry}
          accessibilityLabel={t('auth.migrationBanner.retryA11yLabel')}
          accessibilityRole="button"
          style={[styles.retryButton, { backgroundColor: theme.error }]}
        >
          <Text style={styles.retryLabel}>{t('common.actions.retry')}</Text>
        </Pressable>
      )}

      {!isMigrating && (
        <Pressable
          testID="migration-dismiss-button"
          onPress={onDismiss}
          accessibilityLabel={t('auth.migrationBanner.dismissA11yLabel')}
          accessibilityRole="button"
          style={styles.dismissButton}
        >
          <MaterialIcons name="close" size={18} color={textColor} />
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: 32,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 32,
    paddingVertical: 24
  },
  message: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20
  },
  retryButton: {
    marginLeft: 16,
    borderRadius: 6,
    paddingHorizontal: 24,
    paddingVertical: 8
  },
  retryLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  dismissButton: {
    marginLeft: 16,
    paddingHorizontal: 8
  }
});

export default MigrationBanner;
