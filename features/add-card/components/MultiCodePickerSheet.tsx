/**
 * MultiCodePickerSheet
 * Story 2.9: Scan Cards from Image or Screenshot (AC5)
 *
 * Bottom sheet shown when multiple barcodes are detected in a single image.
 * Displays up to 6 CodeRow items. One tap resolves and routes to setup.
 * Swipe/cancel dismisses without action.
 */

import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, Pressable, FlatList, StyleSheet, Modal } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/shared/theme';
import { SPACING, TOUCH_TARGET } from '@/shared/theme/spacing';
import { TYPOGRAPHY } from '@/shared/theme/typography';

import { DetectedCode } from '../hooks/useImageScan';

const SHEET_ANIM_MS = 220;

interface MultiCodePickerSheetProps {
  visible: boolean;
  codes: DetectedCode[];
  onSelect: (code: DetectedCode) => void;
  onDismiss: () => void;
  testID?: string;
}

interface CodeRowProps {
  code: DetectedCode;
  index: number;
  onPress: () => void;
  accessibilityLabel: string;
  displayFormat: string;
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
  themePrimary: string;
  textTertiary: string;
  backgroundSubtle: string;
}

const CodeRow: React.FC<CodeRowProps> = ({
  code,
  index,
  onPress,
  accessibilityLabel,
  displayFormat,
  borderColor,
  textPrimary,
  textSecondary,
  themePrimary,
  textTertiary,
  backgroundSubtle
}) => {
  const [pressed, setPressed] = React.useState(false);
  const isQR = code.format === 'QR';
  const truncatedValue = code.value.length > 28 ? `${code.value.slice(0, 28)}…` : code.value;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      testID={`code-row-${index}`}
      style={[
        styles.codeRow,
        { borderBottomColor: borderColor },
        pressed && { backgroundColor: backgroundSubtle }
      ]}
    >
      <MaterialIcons
        name={isQR ? 'qr-code-2' : 'view-week'}
        size={28}
        color={themePrimary}
        style={styles.codeRowIcon}
      />
      <View style={styles.codeRowLabels}>
        <Text style={[styles.codeFormat, { color: textSecondary }]}>{displayFormat}</Text>
        <Text style={[styles.codeValue, { color: textPrimary }]}>{truncatedValue}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={20} color={textTertiary} />
    </Pressable>
  );
};

export const MultiCodePickerSheet: React.FC<MultiCodePickerSheetProps> = ({
  visible,
  codes,
  onSelect,
  onDismiss,
  testID = 'multi-code-picker-sheet'
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const formatDisplayNames: Record<string, string> = {
    CODE128: t('addCard.multiCode.formats.CODE128'),
    EAN13: t('addCard.multiCode.formats.EAN13'),
    EAN8: t('addCard.multiCode.formats.EAN8'),
    QR: t('addCard.multiCode.formats.QR'),
    CODE39: t('addCard.multiCode.formats.CODE39'),
    UPCA: t('addCard.multiCode.formats.UPCA'),
    DATAMATRIX: t('addCard.multiCode.formats.DATAMATRIX')
  };

  const translateY = useSharedValue(400);

  useEffect(() => {
    translateY.value = withTiming(visible ? 0 : 400, {
      duration: SHEET_ANIM_MS,
      easing: Easing.out(Easing.ease)
    });
  }, [visible, translateY]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }]
  }));

  if (!visible && codes.length === 0) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      testID={testID}
    >
      {/* Scrim */}
      <Pressable
        onPress={onDismiss}
        testID="multi-code-scrim"
        accessibilityLabel={t('addCard.multiCode.dismissAccessibilityLabel')}
        style={styles.scrim}
      />

      {/* Sheet */}
      <Animated.View
        style={[styles.sheet, { backgroundColor: theme.surface }, sheetStyle]}
        accessibilityViewIsModal
      >
        {/* Drag handle */}
        <View style={styles.dragHandleContainer}>
          <View
            testID="multi-code-drag-handle"
            accessibilityRole="adjustable"
            accessibilityLabel={t('addCard.multiCode.dragDismissAccessibilityLabel')}
            accessibilityHint={t('addCard.multiCode.dragDismissHint')}
            style={[styles.dragHandle, { backgroundColor: theme.border }]}
          />
        </View>

        {/* Title + subtitle */}
        <Text accessibilityRole="header" style={[styles.sheetTitle, { color: theme.textPrimary }]}>
          {t('addCard.multiCode.title')}
        </Text>
        <Text style={[styles.sheetSubtitle, { color: theme.textSecondary }]}>
          {t('addCard.multiCode.subtitle')}
        </Text>

        {/* Code list */}
        <FlatList
          data={codes}
          keyExtractor={(_, i) => String(i)}
          scrollEnabled={codes.length > 4}
          renderItem={({ item, index }) => (
            <CodeRow
              code={item}
              index={index}
              onPress={() => onSelect(item)}
              accessibilityLabel={`${formatDisplayNames[item.format] ?? 'Barcode'}, code ${item.value}`}
              displayFormat={formatDisplayNames[item.format] ?? 'Barcode'}
              borderColor={theme.border}
              textPrimary={theme.textPrimary}
              textSecondary={theme.textSecondary}
              themePrimary={theme.primary}
              textTertiary={theme.textTertiary}
              backgroundSubtle={theme.backgroundSubtle}
            />
          )}
          style={styles.codeList}
        />

        {/* Cancel */}
        <Pressable
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel={t('addCard.multiCode.cancelAccessibilityLabel')}
          testID="multi-code-cancel"
          style={[styles.cancelButton, { paddingBottom: Math.max(insets.bottom, SPACING.md) }]}
        >
          <Text style={[styles.cancelText, { color: theme.error }]}>
            {t('common.actions.cancel')}
          </Text>
        </Pressable>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%'
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2
  },
  sheetTitle: {
    paddingHorizontal: SPACING.md,
    ...TYPOGRAPHY.headline
  },
  sheetSubtitle: {
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.xs,
    ...TYPOGRAPHY.footnote
  },
  codeList: {
    marginTop: SPACING.md
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth
  },
  codeRowIcon: {
    marginRight: SPACING.sm
  },
  codeRowLabels: {
    flex: 1
  },
  codeFormat: {
    ...TYPOGRAPHY.footnote
  },
  codeValue: {
    ...TYPOGRAPHY.subheadline
  },
  cancelButton: {
    alignItems: 'center',
    paddingTop: SPACING.md,
    minHeight: TOUCH_TARGET.min
  },
  cancelText: {
    ...TYPOGRAPHY.callout
  }
});
