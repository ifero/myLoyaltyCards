/**
 * EmptyState Component
 * Story 13.2: Restyle Home Screen — AC4 (Empty State)
 *
 * Displays wallet illustration, "No cards yet" title, encouraging subtitle,
 * and primary CTA button with glow shadow. Dark mode compatible.
 */

import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

import { Button } from '@/shared/components/ui/Button';
import { useTheme } from '@/shared/theme';
import { TYPOGRAPHY } from '@/shared/theme/typography';

/**
 * EmptyState Component
 *
 * Vertically centered layout with:
 * - Wallet vector icon with dashed outline + sparkle accent (MI icons)
 * - Title: "No cards yet" (22pt Bold, Title 2)
 * - Subtitle: encouraging copy
 * - CTA: "Add Your First Card" (shared Button, variant="primary") with glow
 */
export const EmptyState: React.FC = () => {
  const { theme, isDark } = useTheme();
  const router = useRouter();

  const handleAddCard = () => {
    router.push('/add-card');
  };

  return (
    <View style={styles.container} accessibilityRole="none">
      {/* Wallet illustration with dashed outline */}
      <View
        style={[
          styles.illustrationContainer,
          {
            borderColor: isDark ? theme.textTertiary : theme.border
          }
        ]}
        accessibilityLabel="Wallet illustration"
      >
        <MaterialIcons name="account-balance-wallet" size={48} color={theme.primary} />
        {/* Sparkle accent */}
        <View style={styles.sparkle}>
          <MaterialIcons name="auto-awesome" size={16} color={theme.primary} />
        </View>
      </View>

      {/* Title */}
      <Text style={[styles.title, { color: theme.textPrimary }]} accessibilityRole="header">
        No cards yet
      </Text>

      {/* Subtitle */}
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        Add your first loyalty card to get started
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
          Add Your First Card
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
    paddingHorizontal: 32
  },
  illustrationContainer: {
    width: 96,
    height: 96,
    borderRadius: 24,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24
  },
  sparkle: {
    position: 'absolute',
    top: -4,
    right: -4
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
    lineHeight: TYPOGRAPHY.subheadline.lineHeight,
    textAlign: 'center',
    marginBottom: 32
  },
  ctaWrapper: {
    width: '100%',
    maxWidth: 280
  }
});
