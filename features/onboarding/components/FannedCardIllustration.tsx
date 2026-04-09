import React from 'react';
import { View } from 'react-native';

import { useTheme } from '@/shared/theme';

const withAlpha = (hex: string, alpha: string) => `${hex}${alpha}`;

type FannedCardIllustrationProps = {
  testID?: string;
};

export const FannedCardIllustration = ({ testID }: FannedCardIllustrationProps) => {
  const { theme } = useTheme();

  return (
    <View
      testID={testID}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: 200, height: 80, alignItems: 'center', justifyContent: 'center' }}
    >
      <View
        style={{
          position: 'absolute',
          left: 30,
          top: 0,
          width: 80,
          height: 50,
          borderRadius: 8,
          backgroundColor: withAlpha(theme.primary, '26')
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: 60,
          top: 8,
          width: 80,
          height: 50,
          borderRadius: 8,
          backgroundColor: withAlpha(theme.primary, '73')
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: 90,
          top: 16,
          width: 80,
          height: 50,
          borderRadius: 8,
          backgroundColor: withAlpha(theme.primary, 'BF')
        }}
      />
    </View>
  );
};
