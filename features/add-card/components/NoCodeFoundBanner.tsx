/**
 * NoCodeFoundBanner
 * Story 2.9: Scan Cards from Image or Screenshot (AC6)
 * Story 16.23: says WHICH failure occurred instead of one message for all of them
 *
 * Inline error banner shown when an image scan does not yield a usable barcode.
 * Auto-dismisses after 5 seconds. Positioned inside the scanner overlay.
 */

import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, Pressable, StyleSheet } from 'react-native';

import { useTheme } from '@/shared/theme';
import { SPACING, TOUCH_TARGET } from '@/shared/theme/spacing';
import { TYPOGRAPHY } from '@/shared/theme/typography';

import type { ImageScanErrorReason } from '../hooks/useImageScan';

const AUTO_DISMISS_MS = 5000;

/**
 * Message key per failure reason (Story 16.23).
 *
 * A `Record` over the reason union rather than a conditional, so adding a reason
 * is a compile error here until a key is named for it.
 *
 * ⚠️ That is all it guarantees. It does NOT prove the copy exists in either
 * locale: this repo has no `i18next` module augmentation, so `t()`'s argument is
 * an unchecked `string` and a key naming a missing translation compiles happily.
 * Locale parity is still manual discipline — see `project-context.md`, "no parity
 * test exists".
 */
const MESSAGE_KEY: Record<ImageScanErrorReason, string> = {
  notFound: 'addCard.noCodeFound.notFoundMessage',
  scanFailed: 'addCard.noCodeFound.scanFailedMessage',
  pickerFailed: 'addCard.noCodeFound.pickerFailedMessage'
};

/**
 * Retry-label override per reason.
 *
 * The shared label is "Try another image", which presumes a first image — false
 * for `pickerFailed`, where the picker never opened and nothing was selected. The
 * button's behaviour is identical in every case (it re-invokes the picker); only
 * the wording needs to stop claiming something that did not happen.
 */
const RETRY_KEY: Partial<Record<ImageScanErrorReason, string>> = {
  pickerFailed: 'addCard.noCodeFound.pickerFailedRetry'
};

interface NoCodeFoundBannerProps {
  /**
   * Which failure to describe. Defaults to `notFound` — the overwhelmingly
   * common case, and the one this banner was originally written for.
   */
  reason?: ImageScanErrorReason;
  onDismiss: () => void;
  onRetry: () => void;
  onManualEntry: () => void;
  testID?: string;
}

export const NoCodeFoundBanner: React.FC<NoCodeFoundBannerProps> = ({
  reason = 'notFound',
  onDismiss,
  onRetry,
  onManualEntry,
  testID = 'no-code-found-banner'
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const message = t(MESSAGE_KEY[reason]);
  const retryLabel = t(RETRY_KEY[reason] ?? 'addCard.noCodeFound.retry');

  useEffect(() => {
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <View
      testID={testID}
      accessibilityLiveRegion="polite"
      accessibilityLabel={message}
      style={styles.container}
    >
      {/* Header row: icon + message + close */}
      <View style={styles.headerRow}>
        <MaterialIcons name="warning-amber" size={20} color={theme.warning} />
        <Text style={styles.message}>{message}</Text>
        <Pressable
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel={t('addCard.noCodeFound.dismissAccessibilityLabel')}
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
          accessibilityLabel={t('addCard.noCodeFound.retryAccessibilityLabel')}
          testID="banner-retry-image"
          style={styles.actionLink}
        >
          <Text style={[styles.actionText, { color: theme.primary }]}>{retryLabel}</Text>
        </Pressable>
        <Pressable
          onPress={onManualEntry}
          accessibilityRole="button"
          accessibilityLabel={t('addCard.noCodeFound.manualEntryAccessibilityLabel')}
          testID="banner-manual-entry"
          style={styles.actionLink}
        >
          <Text style={[styles.actionText, { color: theme.primary }]}>
            {t('addCard.noCodeFound.manualEntry')}
          </Text>
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
