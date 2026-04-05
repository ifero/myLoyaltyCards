/**
 * BrandSearchBar Component
 * Story 13.4: Restyle Add Card Flow (AC1, AC2)
 *
 * Search input for filtering catalogue brands by name.
 * Figma: 361w x 44h, #F5F5F5 light / #2C2C2E dark, 12pt corner radius.
 * MI: search icon left, MI: close icon right (when text present).
 */

import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { TextInput, View, Pressable, StyleSheet } from 'react-native';

import { useTheme } from '@/shared/theme';
import { TOUCH_TARGET } from '@/shared/theme/spacing';

interface BrandSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
  testID?: string;
}

export const BrandSearchBar: React.FC<BrandSearchBarProps> = ({
  value,
  onChangeText,
  onClear,
  testID = 'brand-search-bar'
}) => {
  const { theme } = useTheme();
  const hasText = value.length > 0;

  return (
    <View
      testID={testID}
      style={[
        styles.container,
        {
          backgroundColor: theme.surfaceElevated,
          borderColor: theme.border
        }
      ]}
    >
      <MaterialIcons name="search" size={20} color={theme.textTertiary} style={styles.searchIcon} />
      <TextInput
        testID={`${testID}-input`}
        value={value}
        onChangeText={onChangeText}
        placeholder="Search by name"
        placeholderTextColor={theme.textTertiary}
        style={[styles.input, { color: theme.textPrimary }]}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        accessibilityRole="search"
        accessibilityLabel="Search brands by name"
      />
      {hasText && (
        <Pressable
          testID={`${testID}-clear`}
          onPress={onClear}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          style={styles.clearButton}
        >
          <MaterialIcons name="close" size={20} color={theme.textSecondary} />
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: TOUCH_TARGET.min,
    borderRadius: 12,
    paddingHorizontal: 12
  },
  searchIcon: {
    marginRight: 8
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: '100%',
    paddingVertical: 0
  },
  clearButton: {
    width: TOUCH_TARGET.min,
    height: TOUCH_TARGET.min,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -12
  }
});
