import React from 'react';
import { View } from 'react-native';

import { useTheme } from '@/shared/theme';

const withAlpha = (hex: string, alpha: string) => `${hex}${alpha}`;

/**
 * The stack washes `textPrimary`, NOT `primary`, and the difference only shows
 * in dark mode.
 *
 * In light they are the same value (ink), so this is a no-op there. In dark
 * `primary` is beam, and beam under alpha over a black ground composites to
 * `#261E02` / `#725C05` / `#BD9909` at these three steps — hue 48°, saturation
 * 95%, i.e. olive through mustard, which the design system forbids by name
 * ("Never darken, desaturate or tint the beam... `#FCCC0C` appears at exactly
 * that value or not at all"). Washing the body-text colour gives the same
 * ascending depth read — ink over cream in light, cream over black in dark —
 * out of colours the system actually contains.
 */

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
          backgroundColor: withAlpha(theme.textPrimary, '26')
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
          backgroundColor: withAlpha(theme.textPrimary, '73')
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
          backgroundColor: withAlpha(theme.textPrimary, 'BF')
        }}
      />
    </View>
  );
};
