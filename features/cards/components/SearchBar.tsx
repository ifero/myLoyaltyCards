/**
 * SearchBar Component
 * Story 13.2: Restyle Home Screen — AC3 (Search Bar)
 *
 * Theme-aware search input with clear button and MI icons.
 * Visible when card count >= 2.
 */

import { MaterialIcons } from '@expo/vector-icons';
import React, { useRef } from 'react';
import {
  TextInput,
  View,
  Pressable,
  StyleSheet,
  type TextInput as TextInputType
} from 'react-native';

import { useTheme } from '@/shared/theme';
import { TOUCH_TARGET } from '@/shared/theme/spacing';

interface SearchBarProps {
  /** Current search text */
  value: string;
  /** Called when search text changes */
  onChangeText: (text: string) => void;
  /** Called when clear button is pressed */
  onClear: () => void;
  /** Test ID for testing */
  testID?: string;
}

const SEARCH_BAR_HEIGHT = 40;
const SEARCH_BAR_RADIUS = 12;
const LIGHT_BG = '#EFEFF1';
const DARK_BG = '#2C2C2E';

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  onClear,
  testID = 'search-bar'
}) => {
  const { theme, isDark } = useTheme();
  const inputRef = useRef<TextInputType>(null);
  const hasValue = value.length > 0;

  const handleClear = () => {
    onClear();
    inputRef.current?.focus();
  };

  return (
    <View
      testID={testID}
      style={[
        styles.container,
        {
          backgroundColor: isDark ? DARK_BG : LIGHT_BG,
          borderWidth: 1,
          borderColor: hasValue ? theme.primary : 'transparent'
        }
      ]}
    >
      <MaterialIcons
        name="search"
        size={20}
        color={theme.textSecondary}
        style={styles.searchIcon}
      />
      <TextInput
        ref={inputRef}
        testID={`${testID}-input`}
        value={value}
        onChangeText={onChangeText}
        placeholder="Search loyalty cards"
        placeholderTextColor={theme.textTertiary}
        style={[styles.input, { color: theme.textPrimary }]}
        accessibilityLabel="Search loyalty cards"
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
      />
      {hasValue && (
        <Pressable
          testID={`${testID}-clear`}
          onPress={handleClear}
          accessibilityLabel="Clear search"
          accessibilityRole="button"
          hitSlop={8}
          style={styles.clearButton}
        >
          <MaterialIcons name="close" size={18} color={theme.textSecondary} />
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: SEARCH_BAR_HEIGHT,
    borderRadius: SEARCH_BAR_RADIUS,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12
  },
  searchIcon: {
    marginRight: 8
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0
  },
  clearButton: {
    minWidth: TOUCH_TARGET.min,
    minHeight: TOUCH_TARGET.min,
    alignItems: 'center',
    justifyContent: 'center'
  }
});
