/**
 * EmptyState Component
 * Story 13.2: Restyle Home Screen — AC4 (Empty State)
 *
 * Displays wallet illustration (SVG from Figma), "No cards yet" title,
 * encouraging subtitle, and primary CTA button with glow shadow.
 * Dark mode compatible.
 */

import { useRouter } from 'expo-router';
import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Svg, { Rect, Circle, G } from 'react-native-svg';

import { Button } from '@/shared/components/ui/Button';
import { useTheme } from '@/shared/theme';
import { TYPOGRAPHY } from '@/shared/theme/typography';

/**
 * Wallet illustration matching Figma (node 52:64).
 * Uses primary color with varying opacities + accent dots.
 */
const WalletIllustration: React.FC<{ primary: string }> = ({ primary }) => (
  <Svg width={160} height={120} viewBox="0 0 160 120" fill="none">
    <G>
      {/* Wallet body */}
      <Rect x={20} y={20} width={120} height={80} rx={16} fill={primary} fillOpacity={0.12} />
      <Rect
        x={21}
        y={21}
        width={118}
        height={78}
        rx={15}
        stroke={primary}
        strokeOpacity={0.3}
        strokeWidth={2}
        strokeDasharray="6 4"
      />
      {/* Flap */}
      <Rect x={30} y={8} width={100} height={20} rx={8} fill={primary} fillOpacity={0.2} />
      {/* Accent dots */}
      <Circle cx={4} cy={44} r={4} fill="#FFCC00" />
      <Circle cx={153} cy={28} r={3} fill={primary} fillOpacity={0.5} />
      <Circle cx={12.5} cy={12.5} r={2.5} fill="#E2231A" fillOpacity={0.4} />
    </G>
  </Svg>
);

/**
 * EmptyState Component
 *
 * Vertically centered layout with:
 * - Wallet SVG illustration (dashed outline + sparkle dots) from Figma
 * - Title: "No cards yet" (22pt SemiBold)
 * - Subtitle: encouraging multi-line copy
 * - CTA: "+ Add Your First Card" with primary glow shadow
 */
export const EmptyState: React.FC = () => {
  const { theme, isDark } = useTheme();
  const router = useRouter();

  const handleAddCard = () => {
    router.push('/add-card');
  };

  return (
    <View style={styles.container} accessibilityRole="none">
      {/* Wallet illustration */}
      <View style={styles.illustrationContainer} accessibilityLabel="Wallet illustration">
        <WalletIllustration primary={theme.primary} />
      </View>

      {/* Title */}
      <Text style={[styles.title, { color: theme.textPrimary }]} accessibilityRole="header">
        No cards yet
      </Text>

      {/* Subtitle */}
      <Text style={[styles.subtitle, { color: theme.textTertiary }]}>
        {'Add your first loyalty card and\nnever miss rewards at checkout'}
      </Text>

      {/* CTA Button with glow */}
      <View
        style={[
          styles.ctaWrapper,
          !isDark && {
            ...Platform.select({
              ios: {
                shadowColor: theme.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 12
              },
              android: { elevation: 6 }
            })
          }
        ]}
      >
        <Button variant="primary" onPress={handleAddCard} testID="empty-state-cta">
          + Add Your First Card
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    minHeight: 400
  },
  illustrationContainer: {
    width: 160,
    height: 120,
    marginBottom: 24
  },
  title: {
    fontSize: TYPOGRAPHY.title2.fontSize,
    lineHeight: TYPOGRAPHY.title2.lineHeight,
    fontWeight: TYPOGRAPHY.title2.fontWeight,
    textAlign: 'center',
    marginBottom: 8
  },
  subtitle: {
    fontSize: TYPOGRAPHY.subheadline.fontSize,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 32
  },
  ctaWrapper: {
    width: 240,
    height: 50
  }
});
