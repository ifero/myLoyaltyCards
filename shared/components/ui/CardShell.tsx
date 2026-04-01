import React from 'react';
import { Text, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/shared/theme';
import { LAYOUT } from '@/shared/theme/spacing';

type CardShellProps = {
  type: 'catalogue' | 'custom';
  brandColor?: string;
  size: 'grid' | 'hero';
  cardName?: string;
  logo?: React.ReactNode;
  testID?: string;
};

export const CardShell = ({ type, brandColor, size, cardName, logo, testID }: CardShellProps) => {
  const { theme, isDark } = useTheme();
  const resolvedColor = brandColor ?? theme.surfaceElevated;
  const isBlackBrand = resolvedColor.toUpperCase() === '#000000';

  const containerStyle: ViewStyle = {
    borderRadius: 16,
    backgroundColor: resolvedColor,
    aspectRatio: size === 'grid' ? LAYOUT.cardAspectRatio : 1.86,
    padding: size === 'grid' ? 12 : 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: isDark && isBlackBrand ? 1 : 0,
    borderColor: isDark && isBlackBrand ? theme.borderStrong : 'transparent'
  };

  const fallbackText = cardName?.trim().charAt(0).toUpperCase() ?? 'C';
  const foregroundColor = isBlackBrand ? '#FFFFFF' : '#0F172A';

  return (
    <View testID={testID} style={containerStyle}>
      {type === 'catalogue' ? (
        <View
          testID={`${testID}-logo-slot`}
          style={{
            width: size === 'grid' ? 64 : 96,
            height: size === 'grid' ? 64 : 96,
            borderRadius: 12,
            backgroundColor: 'rgba(255,255,255,0.16)',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          {logo}
        </View>
      ) : (
        <View
          testID={`${testID}-avatar`}
          style={{
            width: size === 'grid' ? 48 : 72,
            height: size === 'grid' ? 48 : 72,
            borderRadius: 999,
            backgroundColor: 'rgba(255,255,255,0.28)',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Text
            style={{
              color: foregroundColor,
              fontSize: size === 'grid' ? 18 : 26,
              fontWeight: '700'
            }}
          >
            {fallbackText}
          </Text>
        </View>
      )}
    </View>
  );
};
