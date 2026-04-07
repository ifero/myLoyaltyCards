import React from 'react';
import { Pressable, Text } from 'react-native';

import { useTheme } from '@/shared/theme';

type AuthLinkProps = {
  prefixText?: string;
  actionText: string;
  onPress: () => void;
  testID: string;
  accessibilityLabel: string;
  accessibilityHint?: string;
};

export const AuthLink = ({
  prefixText,
  actionText,
  onPress,
  testID,
  accessibilityLabel,
  accessibilityHint
}: AuthLinkProps) => {
  const { theme, typography, touchTarget } = useTheme();

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={{ minHeight: touchTarget.min, justifyContent: 'center', alignItems: 'center' }}
    >
      <Text
        style={{
          color: theme.textSecondary,
          fontSize: typography.footnote.fontSize,
          lineHeight: typography.footnote.lineHeight
        }}
      >
        {prefixText ? `${prefixText} ` : ''}
        <Text style={{ color: theme.link, fontWeight: '700' }}>{actionText}</Text>
      </Text>
    </Pressable>
  );
};
