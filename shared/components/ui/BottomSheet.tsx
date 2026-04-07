import React from 'react';
import {
  AccessibilityInfo,
  Modal,
  Pressable,
  Text,
  View,
  type AccessibilityProps,
  type GestureResponderEvent
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/shared/theme';

type BottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  testID?: string;
  accessibilityLabel?: string;
};

export const BottomSheet = ({
  visible,
  onClose,
  title,
  description,
  children,
  testID,
  accessibilityLabel
}: BottomSheetProps) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const previousVisibleRef = React.useRef<boolean | null>(null);

  React.useEffect(() => {
    const label = accessibilityLabel ?? title ?? 'Bottom sheet';
    const previousVisible = previousVisibleRef.current;

    if (previousVisible === null) {
      previousVisibleRef.current = visible;
      if (visible) {
        AccessibilityInfo.announceForAccessibility?.(`${label} opened`);
      }
      return;
    }

    if (previousVisible !== visible) {
      AccessibilityInfo.announceForAccessibility?.(visible ? `${label} opened` : `${label} closed`);
      previousVisibleRef.current = visible;
    }
  }, [accessibilityLabel, title, visible]);

  const stopPropagation = (event: GestureResponderEvent) => {
    event.stopPropagation();
  };

  const accessibilityProps: AccessibilityProps = {
    accessibilityViewIsModal: true,
    accessibilityLabel: accessibilityLabel ?? title
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      testID={testID}
      accessibilityElementsHidden={!visible}
    >
      <Pressable
        testID={testID ? `${testID}-scrim` : undefined}
        className="flex-1 justify-end"
        style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
        onPress={onClose}
      >
        <Pressable
          {...accessibilityProps}
          testID={testID ? `${testID}-content` : undefined}
          onPress={stopPropagation}
          style={{
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            backgroundColor: theme.surface,
            paddingTop: 10,
            paddingHorizontal: 24,
            paddingBottom: Math.max(20, insets.bottom + 8)
          }}
        >
          <View
            className="self-center"
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: theme.textSecondary,
              opacity: 0.4,
              marginBottom: 14
            }}
          />
          {title ? (
            <Text
              style={{
                color: theme.textPrimary,
                fontSize: 28,
                fontWeight: '600'
              }}
            >
              {title}
            </Text>
          ) : null}
          {description ? (
            <Text
              style={{ color: theme.textSecondary, marginTop: 6, fontSize: 14, lineHeight: 20 }}
            >
              {description}
            </Text>
          ) : null}
          <View style={{ marginTop: title || description ? 16 : 0 }}>{children}</View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};
