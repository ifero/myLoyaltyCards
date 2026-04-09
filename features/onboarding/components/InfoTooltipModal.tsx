import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { AccessibilityInfo, findNodeHandle, Modal, Pressable, Text, View } from 'react-native';

import { Button } from '@/shared/components/ui/Button';
import { useTheme } from '@/shared/theme';

type InfoTooltipModalProps = {
  visible: boolean;
  onClose: () => void;
  triggerRef?: React.RefObject<React.ElementRef<typeof Pressable> | null>;
  testID?: string;
};

const STOP_PROPAGATION = (event: { stopPropagation: () => void }) => {
  event.stopPropagation();
};

export const InfoTooltipModal = ({
  visible,
  onClose,
  triggerRef,
  testID
}: InfoTooltipModalProps) => {
  const { theme } = useTheme();
  const closeButtonRef = React.useRef<React.ElementRef<typeof Pressable>>(null);

  const handleClose = React.useCallback(() => {
    onClose();

    if (triggerRef?.current) {
      setTimeout(() => {
        const handle = findNodeHandle(triggerRef.current);
        if (handle) {
          AccessibilityInfo.setAccessibilityFocus?.(handle);
        }
      }, 50);
    }
  }, [onClose, triggerRef]);

  React.useEffect(() => {
    if (visible) {
      AccessibilityInfo.announceForAccessibility?.('Storage options info opened');

      setTimeout(() => {
        const handle = findNodeHandle(closeButtonRef.current);
        if (handle) {
          AccessibilityInfo.setAccessibilityFocus?.(handle);
        }
      }, 50);
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      testID={testID}
      accessibilityViewIsModal
      onAccessibilityEscape={handleClose}
    >
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
        <Pressable
          testID={testID ? `${testID}-scrim` : 'info-tooltip-scrim'}
          onPress={handleClose}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.4)'
          }}
        />
        <Pressable
          testID={testID ? `${testID}-content` : 'info-tooltip-content'}
          onPress={STOP_PROPAGATION}
          accessibilityViewIsModal
          accessibilityLabel="Storage options information"
          importantForAccessibility="yes"
          style={{
            borderRadius: 20,
            backgroundColor: theme.surface,
            paddingVertical: 16,
            paddingHorizontal: 20
          }}
        >
          <View style={{ alignItems: 'flex-end' }}>
            <Pressable
              ref={closeButtonRef}
              testID="info-tooltip-close"
              onPress={handleClose}
              accessibilityRole="button"
              accessibilityLabel="Close information"
              style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
            >
              <MaterialIcons name="close" size={20} color={theme.textSecondary} />
            </Pressable>
          </View>

          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              alignSelf: 'center',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: `${theme.primary}1A`
            }}
          >
            <Text style={{ color: theme.primary, fontSize: 24, fontWeight: '600' }}>i</Text>
          </View>

          <Text
            accessibilityRole="header"
            style={{
              marginTop: 12,
              textAlign: 'center',
              color: theme.textPrimary,
              fontSize: 22,
              fontWeight: '600'
            }}
          >
            What&apos;s the difference?
          </Text>

          <Text style={{ marginTop: 10, color: theme.textSecondary, fontSize: 14, lineHeight: 20 }}>
            Keep cards on this device stores your loyalty cards only on this phone. It&apos;s fast,
            private, and works offline. Sync across all devices creates a free account so your cards
            are backed up and available on any device you sign in to. You can switch anytime from
            Settings.
          </Text>

          <View style={{ marginTop: 18 }}>
            <Button variant="primary" onPress={handleClose} testID="info-tooltip-got-it">
              Got it
            </Button>
          </View>
        </Pressable>
      </View>
    </Modal>
  );
};
