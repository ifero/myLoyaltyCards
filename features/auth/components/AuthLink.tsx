import React from 'react';
import { Pressable, Text } from 'react-native';

import { useTheme } from '@/shared/theme';
import { TYPOGRAPHY } from '@/shared/theme/typography';

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
  const { theme, touchTarget } = useTheme();

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
          ...TYPOGRAPHY.bodyMd,
          color: theme.textSecondary
        }}
      >
        {prefixText ? `${prefixText} ` : ''}
        <Text style={{ ...TYPOGRAPHY.bodyMdStrong, color: theme.link }}>{actionText}</Text>
      </Text>
    </Pressable>
  );
};
