import React from 'react';
import { View } from 'react-native';

import { useTheme } from '@/shared/theme';

type PaginationDotsProps = {
  total: number;
  current: number;
  testID?: string;
};

export const PaginationDots = ({ total, current, testID }: PaginationDotsProps) => {
  const { theme } = useTheme();

  return (
    <View
      testID={testID}
      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}
      accessibilityLabel={`Page ${current + 1} of ${total}`}
    >
      {Array.from({ length: total }).map((_, index) => {
        const active = index === current;
        return (
          <View
            key={`dot-${index}`}
            testID={`pagination-dot-${index}`}
            style={{
              width: active ? 10 : 8,
              height: active ? 10 : 8,
              borderRadius: active ? 5 : 4,
              backgroundColor: active ? theme.primary : theme.borderStrong
            }}
          />
        );
      })}
    </View>
  );
};
