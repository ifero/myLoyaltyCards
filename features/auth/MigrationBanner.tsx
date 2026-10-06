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
import { SPACING } from '@/shared/theme/spacing';
import { TYPOGRAPHY } from '@/shared/theme/typography';

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

      {/* Four lines, not two (Story 21.6): at the 15pt body floor the error message wraps to
          four beside Retry and dismiss, and two lines cut it off mid-sentence. */}
      <Text
        testID="migration-message"
        style={[styles.message, { color: textColor }]}
        numberOfLines={4}
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
          <Text
            testID="migration-retry-label"
            style={[styles.retryLabel, { color: theme.onError }]}
          >
            {t('common.actions.retry')}
          </Text>
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
    // On the card grid's 16pt margin, in line with the tiles below (Story 22.2).
    marginHorizontal: SPACING.md,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 32,
    paddingVertical: 24
  },
  message: {
    ...TYPOGRAPHY.bodyMd,
    flex: 1
  },
  retryButton: {
    marginLeft: 16,
    borderRadius: 6,
    paddingHorizontal: 24,
    paddingVertical: 8
  },
  retryLabel: {
    ...TYPOGRAPHY.labelBold
    // Colour supplied at the call site from `theme.onError` — this label sits on
    // a `theme.error` fill, against which white fails AA in dark mode.
  },
  dismissButton: {
    marginLeft: 16,
    paddingHorizontal: 8
  }
});

export default MigrationBanner;
