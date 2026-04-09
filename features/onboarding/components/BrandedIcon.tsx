import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { View, type ViewStyle } from 'react-native';

import { useTheme } from '@/shared/theme';

type BrandedIconProps = {
  size?: number;
  icon?: React.ComponentProps<typeof MaterialIcons>['name'];
  communityIcon?: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  iconSize?: number;
  testID?: string;
  children?: React.ReactNode;
};

const withAlpha = (hex: string, alpha: string) => `${hex}${alpha}`;

export const BrandedIcon = ({
  size = 100,
  icon = 'credit-card',
  communityIcon,
  iconSize = 32,
  testID,
  children
}: BrandedIconProps) => {
  const { theme } = useTheme();

  const circleStyle: ViewStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withAlpha(theme.primary, '1A')
  };

  return (
    <View testID={testID} style={circleStyle} accessibilityElementsHidden>
      {children ??
        (communityIcon ? (
          <MaterialCommunityIcons name={communityIcon} size={iconSize} color={theme.primary} />
        ) : (
          <MaterialIcons name={icon} size={iconSize} color={theme.primary} />
        ))}
    </View>
  );
};
