import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/shared/theme';

type SurfaceProps = {
  children: React.ReactNode;
  /**
   * Rules a full-width 1pt hairline between consecutive children — the settings list and the
   * card-detail MANAGE block. Empty children (`null`, `false`) get neither a slot nor a rule.
   */
  divided?: boolean;
  testID?: string;
};

/**
 * The hairline-outlined surface (`cardi-design-system.md` § _Elevation_): a card-radius container
 * that sits on the ground as a tonal layer — white on cream, ink on black — bounded by a 1pt
 * hairline instead of a shadow. It adds no padding, because what it holds (rows, an account block)
 * pads itself, and it clips to its radius so a pressed row's background cannot square the corners.
 */
export const Surface = ({ children, divided = false, testID }: SurfaceProps) => {
  const { theme } = useTheme();
  const rows = divided ? React.Children.toArray(children) : null;

  return (
    <View
      testID={testID}
      style={[styles.surface, { backgroundColor: theme.surface, borderColor: theme.border }]}
    >
      {rows
        ? rows.map((row, index) => (
            // `toArray` keys every element; only a primitive child (which a View rejects) has none.
            <React.Fragment key={React.isValidElement(row) ? row.key : index}>
              {index > 0 ? (
                <View
                  testID={testID ? `${testID}-divider` : undefined}
                  style={[styles.divider, { backgroundColor: theme.border }]}
                />
              ) : null}
              {row}
            </React.Fragment>
          ))
        : children}
    </View>
  );
};

const styles = StyleSheet.create({
  surface: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden'
  },
  divider: {
    height: 1
  }
});
