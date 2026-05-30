/**
 * ConflictResolutionModal — calm multi-choice conflict resolution dialog
 * Story 13.8: Restyle Sync & Status Indicators (AC5, AC7, AC8)
 *
 * Presents local vs cloud data side-by-side with three resolution actions
 * plus a "Decide later" option. Uses neutral/primary visual treatment —
 * no error/warning colors (DEC-12.8-004).
 * Matches Figma: "Conflict — Light" / "Conflict — Dark".
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { Button } from '@/shared/components/ui/Button';
import { useTheme } from '@/shared/theme';
import { TOUCH_TARGET } from '@/shared/theme/spacing';
import { SYNC_TOKENS } from '@/shared/theme/sync-tokens';
import type { ConflictCardData } from '@/shared/types/sync-ui';

import { ConflictComparisonCard } from './ConflictComparisonCard';

/** Custom "Keep both" button — avoids nesting <Text> inside Button's own <Text> */
const KeepBothButton = ({
  testID,
  onPress,
  tintColor,
  label,
  accessibilityLabel,
  accessibilityHint
}: {
  testID: string;
  onPress: () => void;
  tintColor: string;
  label: string;
  accessibilityLabel: string;
  accessibilityHint: string;
}) => {
  const [pressed, setPressed] = useState(false);

  return (
    <View className="rounded-xl px-3 py-0.5" style={{ backgroundColor: `${tintColor}18` }}>
      <Pressable
        testID={testID}
        onPress={onPress}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        className="items-center justify-center rounded-xl"
        style={{
          minHeight: TOUCH_TARGET.min,
          opacity: pressed ? 0.7 : 1
        }}
      >
        <Text style={{ color: tintColor, fontWeight: '600', fontSize: 16 }}>{label}</Text>
      </Pressable>
    </View>
  );
};

type ConflictResolutionModalProps = {
  visible: boolean;
  localCard: ConflictCardData;
  cloudCard: ConflictCardData;
  onKeepLocal: () => void;
  onKeepCloud: () => void;
  onKeepBoth: () => void;
  onDecideLater: () => void;
};

export const ConflictResolutionModal = ({
  visible,
  localCard,
  cloudCard,
  onKeepLocal,
  onKeepCloud,
  onKeepBoth,
  onDecideLater
}: ConflictResolutionModalProps) => {
  const { t } = useTranslation();
  const { theme, isDark } = useTheme();
  const [pressedDecideLater, setPressedDecideLater] = useState(false);

  const mode = isDark ? 'dark' : 'light';
  const overlayBg = SYNC_TOKENS.modalOverlay;
  const modalBg = SYNC_TOKENS.modalBg[mode];
  const titleColor = theme.textPrimary;
  const subtitleColor = theme.textSecondary;
  const decideLaterColor = theme.primary;
  const successTint = SYNC_TOKENS.keepBothTint[mode];

  return (
    <Modal
      testID="conflict-modal"
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDecideLater}
    >
      <View
        testID="conflict-modal-overlay"
        className="flex-1 justify-end"
        style={{ backgroundColor: overlayBg }}
      >
        <View
          testID="conflict-modal-content"
          accessibilityViewIsModal
          accessibilityLabel={t('syncUi.conflict.modal.accessibilityLabel')}
          className="mx-4 mb-8 rounded-2xl px-5 pb-5 pt-6"
          style={{ backgroundColor: modalBg, maxHeight: '85%' }}
        >
          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            {/* Title */}
            <Text
              testID="conflict-modal-title"
              style={{
                color: titleColor,
                fontSize: 20,
                fontWeight: '700',
                marginBottom: 4,
                textAlign: 'center'
              }}
            >
              {t('syncUi.conflict.modal.title')}
            </Text>

            {/* Subtitle */}
            <Text
              testID="conflict-modal-subtitle"
              style={{
                color: subtitleColor,
                fontSize: 13,
                textAlign: 'center',
                marginBottom: 20,
                lineHeight: 18
              }}
            >
              {t('syncUi.conflict.modal.subtitle')}
            </Text>

            {/* Comparison cards — side by side */}
            <View className="mb-5 flex-row" style={{ gap: 10 }}>
              <ConflictComparisonCard
                testID="conflict-local-card"
                label={t('syncUi.conflict.modal.localLabel')}
                icon="smartphone"
                data={localCard}
              />
              <ConflictComparisonCard
                testID="conflict-cloud-card"
                label={t('syncUi.conflict.modal.cloudLabel')}
                icon="cloud"
                data={cloudCard}
              />
            </View>

            {/* Action buttons */}
            <View style={{ gap: 10 }}>
              <Button
                testID="conflict-keep-local-button"
                variant="primary"
                onPress={onKeepLocal}
                accessibilityLabel={t('syncUi.conflict.modal.keepLocalA11yLabel')}
                accessibilityHint={t('syncUi.conflict.modal.keepLocalA11yHint')}
              >
                {t('syncUi.conflict.modal.keepLocal')}
              </Button>

              <Button
                testID="conflict-keep-cloud-button"
                variant="secondary"
                onPress={onKeepCloud}
                accessibilityLabel={t('syncUi.conflict.modal.keepCloudA11yLabel')}
                accessibilityHint={t('syncUi.conflict.modal.keepCloudA11yHint')}
              >
                {t('syncUi.conflict.modal.keepCloud')}
              </Button>

              <KeepBothButton
                testID="conflict-keep-both-button"
                onPress={onKeepBoth}
                tintColor={successTint}
                label={t('syncUi.conflict.modal.keepBoth')}
                accessibilityLabel={t('syncUi.conflict.modal.keepBothA11yLabel')}
                accessibilityHint={t('syncUi.conflict.modal.keepBothA11yHint')}
              />
            </View>

            {/* Decide later link */}
            <Pressable
              testID="conflict-decide-later"
              onPress={onDecideLater}
              onPressIn={() => setPressedDecideLater(true)}
              onPressOut={() => setPressedDecideLater(false)}
              accessibilityRole="button"
              accessibilityLabel={t('syncUi.conflict.modal.decideLaterA11yLabel')}
              accessibilityHint={t('syncUi.conflict.modal.decideLaterA11yHint')}
              className="mt-4 items-center justify-center self-center"
              style={{
                minHeight: TOUCH_TARGET.min,
                opacity: pressedDecideLater ? 0.6 : 1
              }}
            >
              <Text
                testID="conflict-decide-later-text"
                style={{
                  color: decideLaterColor,
                  fontSize: 14,
                  fontWeight: '500'
                }}
              >
                {t('syncUi.conflict.modal.decideLater')}
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
