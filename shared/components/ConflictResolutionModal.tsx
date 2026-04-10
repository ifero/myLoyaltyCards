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
  tintColor
}: {
  testID: string;
  onPress: () => void;
  tintColor: string;
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
        accessibilityLabel="Keep both versions"
        accessibilityHint="Creates a copy so both versions are saved"
        className="items-center justify-center rounded-xl"
        style={{
          minHeight: TOUCH_TARGET.min,
          opacity: pressed ? 0.7 : 1
        }}
      >
        <Text style={{ color: tintColor, fontWeight: '600', fontSize: 16 }}>Keep both</Text>
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
          accessibilityLabel="Resolve sync conflict"
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
              Resolve sync conflict
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
              This card was modified on both this device and the cloud.
              {'\n'}Choose which version to keep.
            </Text>

            {/* Comparison cards — side by side */}
            <View className="mb-5 flex-row" style={{ gap: 10 }}>
              <ConflictComparisonCard
                testID="conflict-local-card"
                label="This device"
                icon="smartphone"
                data={localCard}
              />
              <ConflictComparisonCard
                testID="conflict-cloud-card"
                label="Cloud"
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
                accessibilityLabel="Keep local version"
                accessibilityHint="Replaces cloud version with local data"
              >
                Keep local
              </Button>

              <Button
                testID="conflict-keep-cloud-button"
                variant="secondary"
                onPress={onKeepCloud}
                accessibilityLabel="Keep cloud version"
                accessibilityHint="Replaces local data with cloud version"
              >
                Keep cloud
              </Button>

              <KeepBothButton
                testID="conflict-keep-both-button"
                onPress={onKeepBoth}
                tintColor={successTint}
              />
            </View>

            {/* Decide later link */}
            <Pressable
              testID="conflict-decide-later"
              onPress={onDecideLater}
              onPressIn={() => setPressedDecideLater(true)}
              onPressOut={() => setPressedDecideLater(false)}
              accessibilityRole="button"
              accessibilityLabel="Decide later"
              accessibilityHint="Closes the dialog without resolving the conflict"
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
                Decide later
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
