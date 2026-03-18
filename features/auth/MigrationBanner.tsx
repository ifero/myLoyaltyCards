/**
 * MigrationBanner
 * Story 6.14: Upgrade Guest to Account
 *
 * Inline, non-blocking banner shown during guest → account card migration.
 * Displays progress, success confirmation, or error with retry.
 *
 * Cards remain visible and usable beneath this banner at all times.
 */

import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { useTheme } from '@/shared/theme';
import { SEMANTIC_COLORS } from '@/shared/theme/colors';

import { MigrationStatus } from './useGuestMigration';

// ---------------------------------------------------------------------------
// Banner color constants (error palette)
// TODO: Move ERROR_BG and ERROR_TEXT into SEMANTIC_COLORS once the theme
//       supports extended error tokens (see follow-up story).
// ---------------------------------------------------------------------------

const ERROR_BG = '#FEF2F2';
const ERROR_TEXT = '#991B1B';
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

  if (status === 'idle' || !message) return null;

  const isError = status === 'error';
  const isMigrating = status === 'migrating';

  const backgroundColor = isError ? ERROR_BG : theme.primary + THEME_OPACITY_SUFFIX;
  const borderColor = isError ? SEMANTIC_COLORS.error : theme.primary;
  const textColor = isError ? ERROR_TEXT : theme.textPrimary;

  return (
    <View
      testID="migration-banner"
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      className="mx-4 mt-2 flex-row items-center rounded-lg border px-4 py-3"
      style={{ backgroundColor, borderColor }}
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
        className="flex-1 text-sm"
        style={{ color: textColor }}
        numberOfLines={2}
      >
        {message}
      </Text>

      {isError && (
        <Pressable
          testID="migration-retry-button"
          onPress={onRetry}
          accessibilityLabel="Retry card backup"
          accessibilityRole="button"
          className="ml-2 rounded-md px-3 py-1"
          style={{ backgroundColor: SEMANTIC_COLORS.error }}
        >
          <Text className="text-xs font-semibold text-white">Retry</Text>
        </Pressable>
      )}

      {!isMigrating && (
        <Pressable
          testID="migration-dismiss-button"
          onPress={onDismiss}
          accessibilityLabel="Dismiss"
          accessibilityRole="button"
          className="ml-2 px-1"
        >
          <Text style={{ color: textColor, fontSize: 16 }}>✕</Text>
        </Pressable>
      )}
    </View>
  );
};

export default MigrationBanner;
