/**
 * NoCodeFoundBanner
 * Story 2.9: Scan Cards from Image or Screenshot (AC6)
 *
 * Inline error banner shown when no barcode is detected in the selected image.
 * Auto-dismisses after 5 seconds. Positioned inside the scanner overlay.
 */

import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

import { useTheme } from '@/shared/theme';
import { SPACING, TOUCH_TARGET } from '@/shared/theme/spacing';
import { TYPOGRAPHY } from '@/shared/theme/typography';

const AUTO_DISMISS_MS = 5000;

interface NoCodeFoundBannerProps {
  onDismiss: () => void;
  onRetry: () => void;
  onManualEntry: () => void;
  testID?: string;
}

export const NoCodeFoundBanner: React.FC<NoCodeFoundBannerProps> = ({
  onDismiss,
  onRetry,
  onManualEntry,
  testID = 'no-code-found-banner'
}) => {
  const { theme } = useTheme();

  useEffect(() => {
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <View
      testID={testID}
      accessibilityLiveRegion="polite"
      accessibilityLabel="No barcode found in this image"
      style={styles.container}
    >
      {/* Header row: icon + message + close */}
      <View style={styles.headerRow}>
        <MaterialIcons name="warning-amber" size={20} color={theme.warning} />
        <Text style={styles.message}>No barcode found in this image</Text>
        <Pressable
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="Dismiss error message"
          testID="banner-close"
          hitSlop={8}
        >
          <MaterialIcons name="close" size={18} color="rgba(255,255,255,0.6)" />
        </Pressable>
      </View>

      {/* Action links */}
      <View style={styles.actionsRow}>
        <Pressable
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Try scanning a different image"
          testID="banner-retry-image"
          style={styles.actionLink}
        >
          <Text style={[styles.actionText, { color: theme.primary }]}>Try another image</Text>
        </Pressable>
        <Pressable
          onPress={onManualEntry}
          accessibilityRole="button"
          accessibilityLabel="Enter the card number manually"
          testID="banner-manual-entry"
          style={styles.actionLink}
        >
          <Text style={[styles.actionText, { color: theme.primary }]}>Enter manually</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: SPACING.md,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.80)',
    padding: SPACING.md
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  message: {
    flex: 1,
    color: '#FFFFFF',
    ...TYPOGRAPHY.subheadline
  },
  actionsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.sm,
    minHeight: TOUCH_TARGET.min / 2
  },
  actionLink: {
    paddingVertical: 4
  },
  actionText: {
    ...TYPOGRAPHY.footnote
  }
});
