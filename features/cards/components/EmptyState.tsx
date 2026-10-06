/**
 * EmptyState Component
 * Story 13.2: Restyle Home Screen — AC4 (Empty State)
 * Story 22.2: Frame B of the wallet frames
 *
 * The wallet with no cards. Type only — a title and a subtitle, centred between the header and
 * the footer — because the system's illustrations are a commissioned set that does not exist yet,
 * and inventing one per screen is what it forbids. The add-card action is the last region of the
 * page: the shared primary-action footer, a hairline over a full-width button, in flow below the
 * scroll area and never positioned over it. There is no search and no sort: they appear only at
 * two or more cards.
 */

import { useRouter } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View, type RefreshControlProps } from 'react-native';

import { Button } from '@/shared/components/ui/Button';
import { PrimaryActionFooter } from '@/shared/components/ui/PrimaryActionFooter';
import { useTheme } from '@/shared/theme';
import { SPACING } from '@/shared/theme/spacing';
import { TYPOGRAPHY } from '@/shared/theme/typography';

interface EmptyStateProps {
  /** The wallet's pull-to-refresh, so an empty wallet still syncs. */
  refreshControl?: React.ReactElement<RefreshControlProps>;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ refreshControl }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <View testID="empty-state" style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        testID="empty-state-scroll"
        contentContainerStyle={styles.content}
        refreshControl={refreshControl}
        showsVerticalScrollIndicator={false}
      >
        <Text accessibilityRole="header" style={[styles.title, { color: theme.textPrimary }]}>
          {t('cards.home.emptyStateTitle')}
        </Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {t('cards.home.emptyStateSubtitle')}
        </Text>
      </ScrollView>

      <PrimaryActionFooter margin="grid" testID="empty-state-footer">
        <Button
          variant="primary"
          size="large"
          onPress={() => router.push('/add-card')}
          testID="empty-state-cta"
        >
          {t('cards.home.emptyStateCta')}
        </Button>
      </PrimaryActionFooter>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  // Grows to the space above the footer, so the two lines centre between it and the header.
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md
  },
  title: {
    ...TYPOGRAPHY.headlineMd,
    textAlign: 'center'
  },
  subtitle: {
    ...TYPOGRAPHY.bodyMd,
    textAlign: 'center'
  }
});
