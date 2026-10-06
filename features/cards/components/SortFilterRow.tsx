/**
 * SortFilterRow Component
 * Story 13.2: Restyle Home Screen — AC6 (Sort/Filter Controls)
 * Story 22.2: The wallet frames' sort row, and the shared sheet as its option list
 *
 * Visible when card count >= 2. A count and a control, not a toolbar: the number of cards on the
 * left, and on the right a text button naming the current sort that opens the three sorts as an
 * option list in the shared `BottomSheet`.
 */

import Check from 'lucide-react-native/icons/check';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View, StyleSheet } from 'react-native';

import { BottomSheet } from '@/shared/components/ui/BottomSheet';
import { useTheme } from '@/shared/theme';
import { LAYOUT, SPACING, TOUCH_TARGET } from '@/shared/theme/spacing';
import { TYPOGRAPHY } from '@/shared/theme/typography';

import { type SortOption } from '../hooks/useCardSort';

interface SortFilterRowProps {
  /** Number of cards to display */
  cardCount: number;
  /** Current sort option */
  sortOption: SortOption;
  /** Callback when sort option changes */
  onSortChange: (option: SortOption) => void;
  /** Human-readable label for the current sort option */
  sortLabel: string;
  /** All sort labels */
  sortLabels: Record<SortOption, string>;
  /** Test ID */
  testID?: string;
}

const SORT_OPTIONS: SortOption[] = ['frequent', 'recent', 'az'];

/** The frame's chevron after the sort label: 14pt, at its own 2 stroke. */
const CHEVRON_SIZE = 14;
const CHEVRON_STROKE_WIDTH = 2;

/** The design system's icon: 24pt at a 1.5 stroke (§ _Icons_). */
const CHECK_SIZE = 24;
const CHECK_STROKE_WIDTH = 1.5;

export const SortFilterRow: React.FC<SortFilterRowProps> = ({
  cardCount,
  sortOption,
  onSortChange,
  sortLabel,
  sortLabels,
  testID = 'sort-filter-row'
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [isSheetVisible, setIsSheetVisible] = useState(false);

  const closeSheet = () => setIsSheetVisible(false);

  const handleSelect = (option: SortOption) => {
    onSortChange(option);
    closeSheet();
  };

  const cardCountText = t('cards.sort.count', { count: cardCount });

  return (
    <View testID={testID} style={styles.container}>
      <Text
        testID={`${testID}-count`}
        style={[styles.label, { color: theme.textPrimary }]}
        accessibilityLabel={cardCountText}
      >
        {cardCountText}
      </Text>

      <Pressable
        testID={`${testID}-sort-button`}
        onPress={() => setIsSheetVisible(true)}
        accessibilityRole="button"
        accessibilityLabel={t('cards.sort.buttonAccessibilityLabel', { label: sortLabel })}
        accessibilityHint={t('cards.sort.buttonHint')}
        style={styles.sortButton}
      >
        <Text style={[styles.label, { color: theme.textPrimary }]}>{sortLabel}</Text>
        <ChevronDown
          testID={`${testID}-chevron`}
          size={CHEVRON_SIZE}
          strokeWidth={CHEVRON_STROKE_WIDTH}
          color={theme.textPrimary}
        />
      </Pressable>

      <BottomSheet
        visible={isSheetVisible}
        onClose={closeSheet}
        title={t('cards.sort.sheetTitle')}
        testID={`${testID}-sheet`}
      >
        {/* An option list: choosing IS the action, so there are no buttons. */}
        <View>
          {SORT_OPTIONS.map((option) => {
            const isSelected = option === sortOption;

            return (
              <Pressable
                key={option}
                testID={`${testID}-option-${option}`}
                onPress={() => handleSelect(option)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                style={[styles.option, { borderTopColor: theme.border }]}
              >
                <Text style={[styles.optionLabel, { color: theme.textPrimary }]}>
                  {sortLabels[option]}
                </Text>
                {isSelected ? (
                  <Check
                    testID={`${testID}-option-${option}-check`}
                    size={CHECK_SIZE}
                    strokeWidth={CHECK_STROKE_WIDTH}
                    color={theme.primary}
                  />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  // The row is the touch target tall, with no padding of its own, so its text sits about 16pt
  // from the field above it and from the grid below.
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  label: {
    ...TYPOGRAPHY.labelBold
  },
  // A short label — "A-Z" — would leave the button under the touch target, so it takes the
  // target's width too, and keeps the label against the row's right edge.
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: SPACING.xs,
    minHeight: TOUCH_TARGET.min,
    minWidth: TOUCH_TARGET.min
  },
  // Edge to edge: each rule spans the sheet, and the label sits on the sheet's own margin, in
  // line with its title (`cardi-design-system.md` § _Sheets_).
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: TOUCH_TARGET.min,
    marginHorizontal: -LAYOUT.screenHorizontalMargin,
    paddingHorizontal: LAYOUT.screenHorizontalMargin,
    paddingVertical: SPACING.smMd,
    borderTopWidth: 1
  },
  optionLabel: {
    ...TYPOGRAPHY.bodyLg,
    flex: 1
  }
});
