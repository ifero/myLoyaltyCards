/**
 * DataSummaryScreen
 * Story 6-11: Privacy & Consent
 *
 * Read-only informational screen showing what data the app collects.
 * Only accessible to authenticated users from Settings → Data & Privacy.
 * Redirects unauthenticated visitors to /sign-in.
 *
 * ⚠️ "Download My Data" is a placeholder — actual export lives in Epic 8.
 */

import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useAuthState } from '@/shared/supabase/useAuthState';
import { useTheme } from '@/shared/theme';

// ---------------------------------------------------------------------------
// Data table
// ---------------------------------------------------------------------------

type DataRow = {
  id: string;
  categoryKey: string;
  detailKey: string;
  collected: boolean;
};

const DATA_ROWS: DataRow[] = [
  {
    id: 'account',
    categoryKey: 'privacy.dataSummary.rows.account.category',
    detailKey: 'privacy.dataSummary.rows.account.detail',
    collected: true
  },
  {
    id: 'cards',
    categoryKey: 'privacy.dataSummary.rows.cards.category',
    detailKey: 'privacy.dataSummary.rows.cards.detail',
    collected: true
  },
  {
    id: 'app',
    categoryKey: 'privacy.dataSummary.rows.app.category',
    detailKey: 'privacy.dataSummary.rows.app.detail',
    collected: true
  },
  {
    id: 'location',
    categoryKey: 'privacy.dataSummary.rows.location.category',
    detailKey: 'privacy.dataSummary.rows.location.detail',
    collected: false
  },
  {
    id: 'contacts',
    categoryKey: 'privacy.dataSummary.rows.contacts.category',
    detailKey: 'privacy.dataSummary.rows.contacts.detail',
    collected: false
  },
  {
    id: 'deviceId',
    categoryKey: 'privacy.dataSummary.rows.deviceId.category',
    detailKey: 'privacy.dataSummary.rows.deviceId.detail',
    collected: false
  }
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const DataSummaryScreen = () => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { authState } = useAuthState();
  const router = useRouter();

  useEffect(() => {
    if (authState === 'guest') {
      router.replace('/sign-in');
    }
  }, [authState, router]);

  if (authState === 'loading' || authState === 'guest') {
    return (
      <View
        testID="data-summary-loading"
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.background
        }}
      >
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      testID="data-summary-screen"
      style={[styles.scroll, { backgroundColor: theme.background }]}
      contentContainerStyle={{ paddingBottom: 40 }}
      accessibilityLabel={t('privacy.dataSummary.title')}
    >
      {/* Title */}
      <Text
        testID="data-summary-title"
        accessibilityRole="header"
        style={[styles.title, { color: theme.textPrimary }]}
      >
        {t('privacy.dataSummary.title')}
      </Text>
      <Text style={[styles.description, { color: theme.textSecondary }]}>
        {t('privacy.dataSummary.description')}
      </Text>

      {/* Data table */}
      <View testID="data-summary-table" style={[styles.table, { backgroundColor: theme.surface }]}>
        {/* Header row */}
        <View style={[styles.headerRow, styles.borderBottom, { borderColor: theme.border }]}>
          <Text style={[styles.headerCategory, { color: theme.textPrimary }]}>
            {t('privacy.dataSummary.table.categoryHeader')}
          </Text>
          <Text style={[styles.headerData, { color: theme.textPrimary }]}>
            {t('privacy.dataSummary.table.dataCollectedHeader')}
          </Text>
        </View>

        {/* Data rows */}
        {DATA_ROWS.map((row, idx) => (
          <View
            key={row.id}
            testID={`data-row-${row.id.toLowerCase().replace(/\s/g, '-')}`}
            style={[
              styles.dataRow,
              idx < DATA_ROWS.length - 1 && styles.borderBottom,
              { borderColor: theme.border }
            ]}
          >
            <Text
              style={[
                styles.cellCategory,
                { color: row.collected ? theme.textPrimary : theme.textSecondary }
              ]}
            >
              {t(row.categoryKey)}
            </Text>
            <Text
              style={[
                styles.cellData,
                { color: row.collected ? theme.textPrimary : theme.textSecondary }
              ]}
            >
              {t(row.detailKey)}
            </Text>
          </View>
        ))}
      </View>

      {/* Download My Data placeholder */}
      <Pressable
        testID="download-data-placeholder"
        accessibilityRole="button"
        accessibilityLabel={t('privacy.dataSummary.downloadButtonA11yLabel')}
        accessibilityHint={t('privacy.dataSummary.downloadButtonA11yHint')}
        disabled
        style={[styles.downloadButton, { backgroundColor: theme.border }]}
      >
        <Text style={[styles.downloadLabel, { color: theme.textSecondary }]}>
          {t('privacy.dataSummary.downloadButton')}
        </Text>
      </Pressable>

      <Text style={[styles.footer, { color: theme.textSecondary }]}>
        {t('privacy.dataSummary.downloadFooter')}
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    paddingHorizontal: 48,
    paddingBottom: 64,
    paddingTop: 48
  },
  title: {
    marginBottom: 16,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '700'
  },
  description: {
    marginBottom: 48,
    fontSize: 14,
    lineHeight: 20
  },
  table: {
    marginBottom: 48,
    overflow: 'hidden',
    borderRadius: 12
  },
  headerRow: {
    flexDirection: 'row',
    paddingHorizontal: 32,
    paddingVertical: 24
  },
  borderBottom: {
    borderBottomWidth: 1
  },
  headerCategory: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600'
  },
  headerData: {
    flex: 2,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600'
  },
  dataRow: {
    flexDirection: 'row',
    paddingHorizontal: 32,
    paddingVertical: 24
  },
  cellCategory: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20
  },
  cellData: {
    flex: 2,
    fontSize: 14,
    lineHeight: 20
  },
  downloadButton: {
    marginBottom: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    height: 48,
    opacity: 0.5
  },
  downloadLabel: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600'
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 16
  }
});

export default DataSummaryScreen;
