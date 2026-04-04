/**
 * SortFilterRow Component
 * Story 13.2: Restyle Home Screen — AC6 (Sort/Filter Controls)
 *
 * Displays card count label and sort dropdown.
 * Visible when card count >= 2.
 */

import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Modal, Pressable, Text, View, StyleSheet } from 'react-native';

import { useTheme } from '@/shared/theme';
import { TOUCH_TARGET } from '@/shared/theme/spacing';
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

export const SortFilterRow: React.FC<SortFilterRowProps> = ({
  cardCount,
  sortOption,
  onSortChange,
  sortLabel,
  sortLabels,
  testID = 'sort-filter-row'
}) => {
  const { theme, isDark } = useTheme();
  const [menuVisible, setMenuVisible] = useState(false);

  const handleSelect = (option: SortOption) => {
    onSortChange(option);
    setMenuVisible(false);
  };

  const cardCountText = cardCount === 1 ? '1 loyalty card' : `${cardCount} loyalty cards`;

  return (
    <View testID={testID} style={styles.container}>
      <Text
        testID={`${testID}-count`}
        style={[styles.countText, { color: theme.textPrimary }]}
        accessibilityLabel={cardCountText}
      >
        {cardCountText}
      </Text>

      <Pressable
        testID={`${testID}-sort-button`}
        onPress={() => setMenuVisible(true)}
        accessibilityRole="button"
        accessibilityLabel={`Sort by ${sortLabel}`}
        accessibilityHint="Opens sort options"
        style={styles.sortButton}
      >
        <Text style={[styles.sortText, { color: theme.primary }]}>{sortLabel}</Text>
        <MaterialIcons name="arrow-drop-down" size={20} color={theme.primary} />
      </Pressable>

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable
          testID={`${testID}-backdrop`}
          style={styles.backdrop}
          onPress={() => setMenuVisible(false)}
        >
          <View
            style={[
              styles.menu,
              {
                backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF',
                shadowColor: '#000'
              }
            ]}
          >
            {SORT_OPTIONS.map((option) => (
              <Pressable
                key={option}
                testID={`${testID}-option-${option}`}
                onPress={() => handleSelect(option)}
                accessibilityRole="menuitem"
                accessibilityState={{ selected: option === sortOption }}
                style={[
                  styles.menuItem,
                  option === sortOption && { backgroundColor: theme.primary + '14' }
                ]}
              >
                <Text
                  style={[
                    styles.menuItemText,
                    {
                      color: option === sortOption ? theme.primary : theme.textPrimary,
                      fontWeight: option === sortOption ? '600' : '400'
                    }
                  ]}
                >
                  {sortLabels[option]}
                </Text>
                {option === sortOption && (
                  <MaterialIcons name="check" size={18} color={theme.primary} />
                )}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8
  },
  countText: {
    fontSize: TYPOGRAPHY.body.fontSize,
    lineHeight: TYPOGRAPHY.body.lineHeight,
    fontWeight: TYPOGRAPHY.body.fontWeight
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: TOUCH_TARGET.min
  },
  sortText: {
    fontSize: TYPOGRAPHY.body.fontSize,
    fontWeight: '600'
  },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)'
  },
  menu: {
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 220,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: TOUCH_TARGET.min
  },
  menuItemText: {
    fontSize: TYPOGRAPHY.body.fontSize
  }
});
