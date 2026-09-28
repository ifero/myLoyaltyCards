import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/shared/theme';
import { LAYOUT, SPACING } from '@/shared/theme/spacing';

type PrimaryActionFooterProps = {
  /** The action — a primary `Button size="large"`, or a short stack of them. */
  children: React.ReactNode;
  /**
   * `screen` is the 24pt margin every single-column screen uses. `grid` is the card grid's 16pt,
   * for the one footer drawn on the wallet (its empty state), where 24 would break the column.
   */
  margin?: 'screen' | 'grid';
  /**
   * Adds the bottom safe-area inset below the actions. Pass `false` when the screen already pads
   * its bottom edge — the `CardSetupScreen` shape, a `SafeAreaView` with the bottom edge OUTSIDE the
   * `KeyboardAvoidingView`, which also keeps the button flush against the keyboard when it opens.
   */
  insetBottom?: boolean;
  testID?: string;
};

/**
 * The anchored primary-action footer (`cardi-design-system.md` § _The primary-action footer_).
 *
 * The last REGION of the page, in flow: a 1pt hairline rule spanning the full width, then the
 * action, padded by the screen margin. Place it AFTER the scroll area, inside the
 * `KeyboardAvoidingView`, so it never scrolls away and never fights the keyboard. It is never
 * `position: absolute` — an absolute footer either hides beneath the keyboard or rides above it,
 * stealing height from the field being typed into.
 *
 * The space above the rule on a short form is composition, not absence; do not let the button rise
 * to meet the last field. And the action it holds is always enabled — pressing it on an incomplete
 * form reveals the field errors — with busy rendered as a spinner, never as a disabled grey. Both
 * of those are the `Button`'s job; this component only makes the position predictable.
 */
export const PrimaryActionFooter = ({
  children,
  margin = 'screen',
  insetBottom = true,
  testID
}: PrimaryActionFooterProps) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const padding = margin === 'grid' ? SPACING.md : LAYOUT.screenHorizontalMargin;

  return (
    <View testID={testID} style={styles.container}>
      <View
        testID={testID ? `${testID}-rule` : undefined}
        style={[styles.rule, { backgroundColor: theme.border }]}
      />
      <View
        style={[
          styles.actions,
          { padding, paddingBottom: padding + (insetBottom ? insets.bottom : 0) }
        ]}
      >
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexShrink: 0
  },
  rule: {
    height: 1
  },
  actions: {
    gap: SPACING.sm
  }
});
