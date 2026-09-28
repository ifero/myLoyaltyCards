import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { useTheme } from '@/shared/theme';
import { TYPOGRAPHY } from '@/shared/theme/typography';

type SectionHeaderProps = {
  /** Sentence case — the style uppercases it, so assistive technology reads the words. */
  title: string;
  testID?: string;
};

/**
 * The uppercase label above a group of rows (`cardi-design-system.md` § _Section header_):
 * `overline` — Inter 12/16 semibold, +0.05em — in muted `textSecondary`, sitting 8pt above its
 * rows. The 8pt is the PARENT's gap, not a margin here, because the header sits in three layouts
 * (a stacked section, a list's section header, an icon row) that each space it themselves.
 *
 * The colour is not a prop. The four hand-written copies this replaced disagreed — `textTertiary`
 * in Settings, `textSecondary` everywhere else, injected at each call site — and the spec names
 * one value, so the primitive owns it.
 */
export const SectionHeader = ({ title, testID }: SectionHeaderProps) => {
  const { theme } = useTheme();

  return (
    <Text
      testID={testID}
      accessibilityRole="header"
      style={[styles.title, { color: theme.textSecondary }]}
    >
      {title}
    </Text>
  );
};

const styles = StyleSheet.create({
  title: {
    ...TYPOGRAPHY.overline,
    textTransform: 'uppercase'
  }
});
