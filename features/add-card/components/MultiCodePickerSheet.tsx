/**
 * MultiCodePickerSheet
 * Story 2.9: Scan Cards from Image or Screenshot (AC5)
 * Story 22.1: Drawn by the shared BottomSheet (AC8)
 *
 * Bottom sheet shown when multiple barcodes are detected in a single image.
 * Displays up to 6 CodeRow items. One tap resolves and routes to setup.
 * Cancel, the scrim or the platform dismiss closes it without action.
 *
 * It used to be the one hand-rolled sheet in the app — its own Modal, scrim, 220 ms slide and
 * handle. The shared sheet now does all four, and took this sheet's slide as its own (the scrim
 * fades, the sheet slides) along with its 36 × 4 handle, which was the spec size all along.
 */

import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, Pressable, FlatList, StyleSheet } from 'react-native';

import { BottomSheet } from '@/shared/components/ui/BottomSheet';
import { useTheme } from '@/shared/theme';
import { LAYOUT, SPACING, TOUCH_TARGET } from '@/shared/theme/spacing';
import { TYPOGRAPHY } from '@/shared/theme/typography';

import { DetectedCode } from '../hooks/useImageScan';

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
  const formatDisplayNames: Record<string, string> = {
    CODE128: t('addCard.multiCode.formats.CODE128'),
    EAN13: t('addCard.multiCode.formats.EAN13'),
    EAN8: t('addCard.multiCode.formats.EAN8'),
    QR: t('addCard.multiCode.formats.QR'),
    CODE39: t('addCard.multiCode.formats.CODE39'),
    UPCA: t('addCard.multiCode.formats.UPCA')
    // No DATAMATRIX entry: `barcodeFormatSchema` has no such member, so
    // `DetectedCode.format` could never take that value and the lookup was
    // unreachable. Removed with its locale key in Story 16.23 (AC5), which also
    // records why the symbology set deliberately stays at six.
  };

  // The caller empties `codes` in the same render that closes the sheet, so the sheet keeps the
  // last list it showed: it slides out with its rows, rather than vanishing or collapsing first.
  const [shownCodes, setShownCodes] = React.useState(codes);
  if (codes.length > 0 && codes !== shownCodes) {
    setShownCodes(codes);
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={onDismiss}
      title={t('addCard.multiCode.title')}
      description={t('addCard.multiCode.subtitle')}
      testID={testID}
    >
      {/* Code list — scrolls past four rows, inside the sheet's height cap */}
      <FlatList
        data={shownCodes}
        keyExtractor={(_, i) => String(i)}
        scrollEnabled={shownCodes.length > 4}
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
      />

      {/* Cancel */}
      <Pressable
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel={t('addCard.multiCode.cancelAccessibilityLabel')}
        testID="multi-code-cancel"
        style={styles.cancelButton}
      >
        <Text style={[styles.cancelText, { color: theme.error }]}>
          {t('common.actions.cancel')}
        </Text>
      </Pressable>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  // Edge to edge: the rules span the sheet, and the content sits on the sheet's own margin,
  // in line with the title.
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    marginHorizontal: -LAYOUT.screenHorizontalMargin,
    paddingHorizontal: LAYOUT.screenHorizontalMargin,
    borderBottomWidth: StyleSheet.hairlineWidth
  },
  codeRowIcon: {
    marginRight: SPACING.sm
  },
  codeRowLabels: {
    flex: 1
  },
  codeFormat: {
    ...TYPOGRAPHY.captionMd
  },
  // The decoded value is a card number, so it takes the one mono token (Story 21.6 AC8).
  codeValue: {
    ...TYPOGRAPHY.monoCode
  },
  cancelButton: {
    alignItems: 'center',
    paddingTop: SPACING.md,
    minHeight: TOUCH_TARGET.min
  },
  cancelText: {
    ...TYPOGRAPHY.bodyLg
  }
});
