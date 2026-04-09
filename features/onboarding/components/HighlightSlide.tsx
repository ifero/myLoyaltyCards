import React from 'react';
import { Text, View } from 'react-native';

import { useTheme } from '@/shared/theme';

type HighlightSlideProps = {
  title: string;
  description: string;
  illustration: React.ReactNode;
  testID?: string;
};

export const HighlightSlide = ({
  title,
  description,
  illustration,
  testID
}: HighlightSlideProps) => {
  const { theme } = useTheme();

  return (
    <View testID={testID} style={{ width: '100%', flex: 1, paddingHorizontal: 24 }}>
      <View style={{ alignItems: 'center', paddingTop: 58 }}>{illustration}</View>

      <Text
        style={{
          marginTop: 60,
          color: theme.textPrimary,
          textAlign: 'center',
          fontSize: 24,
          lineHeight: 31,
          fontWeight: '700'
        }}
      >
        {title}
      </Text>

      <Text
        style={{
          marginTop: 14,
          color: theme.textSecondary,
          textAlign: 'center',
          fontSize: 16,
          lineHeight: 23,
          marginHorizontal: 16
        }}
      >
        {description}
      </Text>

      <View style={{ flex: 1 }} />
    </View>
  );
};
